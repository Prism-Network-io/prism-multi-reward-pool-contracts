//SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;
import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./LPTokenWrapper.sol";
import "./interfaces/IERC20Metadata.sol";

/**
 * @title EccMultiRewardPool
 * @author Empire Capital
 * @dev Stake ECC token to earn multi rewards
 */

contract EccMultiRewardPool is LPTokenWrapper, ReentrancyGuard {
    using SafeERC20 for IERC20Metadata;
    uint256 public immutable stakingTokenMultiplier;
    uint256 public immutable deployedTime;
    address public immutable devFund;

    struct PoolInfo {
        IERC20Metadata rewardTokenAddress;
        uint256 rewardPoolID;
        uint256 duration;
        uint256 periodFinish;
        uint256 startTime;
        uint256 lastUpdateTime;
        uint256 rewardRate;
        uint256 rewardPerTokenStored;
    }

    struct UserRewardInfo {
        uint256 rewards;
        uint256 userRewardPerTokenPaid;
    }

    struct LockedStake {
        uint256 amount;
        uint256 unlockTime;
        bool isClaimed;
    }

    uint256 public lockPeriod;
    PoolInfo[] public poolInfo;

    mapping(address => bool) public addedRewardTokens; // Used for preventing LP tokens from being added twice in add().
    mapping(uint256 => mapping(address => UserRewardInfo)) public rewardsInPool;
    mapping(address => LockedStake[]) public userLockedStake;

    event Withdrawn(address indexed user, uint256 amount);
    event Staked(address indexed user, uint256 amount);
    event RewardPaid(
        address indexed user,
        address rewardToken,
        uint256 rewardAmount
    );
    event RewardPoolAdded(
        uint256 rewardPoolID,
        address rewardTokenAddress,
        uint256 rewardDuration
    );
    event RewardPoolStarted(
        uint256 rewardPoolID,
        address rewardTokenAddress,
        uint256 rewardAmount,
        uint256 rewardPeriodFinish
    );

    // Set the staking token, addresses, various fee variables and the prism fee reduction level amounts
    constructor(
        address _stakingToken,
        address _treasury,
        address _devFund,
        uint256 _devFee,
        uint256 _burnFee,
        uint256 _lockPeriod
    ) public LPTokenWrapper(_devFee, _stakingToken, _treasury, _burnFee) {
        require(
            _stakingToken != address(0) &&
                _treasury != address(0) &&
                _devFund != address(0),
            "!constructor"
        );
        stakingTokenMultiplier =
            10**uint256(IERC20Metadata(_stakingToken).decimals());
        deployedTime = block.timestamp;
        devFund = _devFund;
        lockPeriod = _lockPeriod;
    }

    /* @dev Updates the rewards a user has earned */
    function updateReward(address account) internal {
        // loop through all reward pools for user
        for (uint256 i = 0; i < poolInfo.length; i++) {
            PoolInfo storage pool = poolInfo[i];

            if (address(pool.rewardTokenAddress) == address(0)) {
                continue;
            } else {
                updateRewardPerTokenStored(i);
                rewardsInPool[i][account].rewards = earned(account, i);
                rewardsInPool[i][account].userRewardPerTokenPaid = pool
                    .rewardPerTokenStored;
            }
        }
    }

    function updateRewardPerTokenStored(uint256 _pid) internal {
        PoolInfo storage pool = poolInfo[_pid];

        pool.rewardPerTokenStored = rewardPerToken(_pid);
        pool.lastUpdateTime = lastTimeRewardsActive(_pid);
    }

    function lastTimeRewardsActive(uint256 _pid) public view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];
        return Math.min(block.timestamp, pool.periodFinish);
    }

    /* @dev Returns the current rate of rewards per token */
    function endDate(uint256 _pid) public view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];

        return pool.periodFinish;
    }

    /* @dev Returns the current rate of rewards per token */
    function rewardPerToken(uint256 _pid) public view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];

        // Do not distribute rewards before startTime.
        if (block.timestamp < pool.startTime) {
            return 0;
        }

        if (totalSupply == 0) {
            return pool.rewardPerTokenStored;
        }

        // The returrn value is time-based on last time the contract had rewards active multipliede by the reward-rate.
        // It's evened out with a division of bonus effective supply.
        return
            pool.rewardPerTokenStored.add(
                lastTimeRewardsActive(_pid)
                    .sub(pool.lastUpdateTime)
                    .mul(pool.rewardRate)
                    .mul(stakingTokenMultiplier)
                    .div(totalSupply)
            );
    }

    /** @dev Returns the claimable tokens for user.*/
    function earned(address account, uint256 _pid)
        public
        view
        returns (uint256)
    {
        uint256 reward = rewardsInPool[_pid][msg.sender].rewards;
        uint256 rewardPerTokenPaid = rewardsInPool[_pid][msg.sender]
            .userRewardPerTokenPaid;

        return
            _balances[account]
                .balance
                .mul(rewardPerToken(_pid).sub(rewardPerTokenPaid))
                .div(stakingTokenMultiplier)
                .add(reward);
    }

    /** @dev Staking function which updates the user balances in the parent contract */
    function stake(uint256 amount) public override nonReentrant {
        require(amount > 0, "Cannot stake 0");
        require(lockPeriod > 0, "Lock time can not be 0");
        updateReward(msg.sender);
        super.stake(amount);

        LockedStake memory newLock;
        newLock.amount = amount;
        newLock.unlockTime = block.timestamp + lockPeriod;
        userLockedStake[msg.sender].push(newLock);
        emit Staked(msg.sender, amount);
    }

    function getLockedStakeInfo(address user)
        external
        view
        returns (LockedStake[] memory)
    {
        uint256 totalStakedTime = userLockedStake[user].length;
        LockedStake[] memory lockArray = new LockedStake[](totalStakedTime);
        for (uint256 i = 0; i < totalStakedTime; i++) {
            lockArray[i] = userLockedStake[user][i];
        }
        return lockArray;
    }

    /** @dev Withdraw function, this pool contains a tax which is defined in the constructor */
    function withdraw(uint256 id) public nonReentrant {
        LockedStake memory lockInfo = userLockedStake[msg.sender][id];
        require(
            lockInfo.amount > 0 && !lockInfo.isClaimed,
            "Invalid id or already claimed"
        );
        require(lockInfo.unlockTime < block.timestamp, "Can not withdraw yet");
        updateReward(msg.sender);
        super.withdraw(lockInfo.amount, msg.sender);
        emit Withdrawn(msg.sender, lockInfo.amount);
    }

    /** @dev Ease-of-access function for user to remove assets from the pool */
    function exit() external nonReentrant {
        //check (amount < balance - lockStakedTokensTotal(msg.sender) >= 0)

        getReward();
        withdraw(balanceOf(msg.sender), msg.sender);
    }

    /** @dev Sends out the reward tokens to the user */
    function getReward() public nonReentrant {
        updateReward(msg.sender);
        uint256 arraysize = poolInfo.length;

        // loop through all the reward pools for a user
        for (uint256 i = 0; i < arraysize; i++) {
            PoolInfo storage pool = poolInfo[i];
            uint256 reward = rewardsInPool[i][msg.sender].rewards;

            if (address(pool.rewardTokenAddress) == address(0) || reward == 0) {
                continue;
            } else {
                rewardsInPool[i][msg.sender].rewards = 0;
                pool.rewardTokenAddress.safeTransfer(msg.sender, reward);
                emit RewardPaid(
                    msg.sender,
                    address(pool.rewardTokenAddress),
                    reward
                );
            }
        }
    }

    /** @dev Sends out the reward tokens to the user, while also re-staking reward tokens if it is the same as the staking tokens */
    function getRewardCompound() public nonReentrant {
        updateReward(msg.sender);

        // loop through all the reward pools for a user
        for (uint256 i = 0; i < poolInfo.length; i++) {
            PoolInfo storage pool = poolInfo[i];
            uint256 reward = rewardsInPool[i][msg.sender].rewards;

            if (address(pool.rewardTokenAddress) == address(0) || reward == 0) {
                continue;
            } else {
                rewardsInPool[i][msg.sender].rewards = 0;

                if (address(pool.rewardTokenAddress) == address(stakingToken)) {
                    stake(reward);
                } else {
                    pool.rewardTokenAddress.safeTransfer(msg.sender, reward);
                    emit RewardPaid(
                        msg.sender,
                        address(pool.rewardTokenAddress),
                        reward
                    );
                }
            }
        }
    }

    /** @dev Adds a new reward pool with specified duration */
    function addRewardPool(IERC20Metadata _rewardToken, uint256 _duration)
        public
        onlyOwner
    {
        require(address(_rewardToken) != address(0), "Cannot add burn address");
        require(_duration != 0, "Must define valid duration length");
        require(
            !addedRewardTokens[address(_rewardToken)],
            "Token already added"
        );
        // calculate info relevant for storing in the pool array
        uint256 totalPools = poolInfo.length;
        uint256 _rewardTokenID = totalPools++;

        poolInfo.push(
            PoolInfo({
                rewardTokenAddress: _rewardToken,
                rewardPoolID: _rewardTokenID,
                duration: _duration,
                periodFinish: 0,
                startTime: 0,
                lastUpdateTime: 0,
                rewardRate: 0,
                rewardPerTokenStored: 0
            })
        );

        addedRewardTokens[address(_rewardToken)] = true;

        emit RewardPoolAdded(_rewardTokenID, address(_rewardToken), _duration);
    }

    /** @dev Called to start the pool. Owner must have already sent rewards to the contract. Reward amount is defined in the input. */
    function notifyRewardAmount(uint256 _pid, uint256 _reward)
        external
        onlyOwner
    {
        require(_reward > 0, "Can not add zero balance");

        PoolInfo storage pool = poolInfo[_pid];
        pool.rewardTokenAddress.safeTransferFrom(
            msg.sender,
            address(this),
            _reward
        );
        // Update reward values
        updateRewardPerTokenStored(_pid);

        // Rewardrate must stay at a constant since it's used by end-users claiming rewards after the reward period has finished.
        if (block.timestamp >= pool.periodFinish) {
            pool.rewardRate = _reward.div(pool.duration);
        } else {
            // Remaining time for the pool
            uint256 remainingTime = pool.periodFinish.sub(block.timestamp);
            // And the rewards
            uint256 rewardsRemaining = remainingTime.mul(pool.rewardRate);
            // Set the current rate
            pool.rewardRate = _reward.add(rewardsRemaining).div(pool.duration);
        }

        // Set the last updated time
        pool.lastUpdateTime = block.timestamp;
        pool.startTime = block.timestamp;

        // Add the period to be equal to duration set
        pool.periodFinish = block.timestamp.add(pool.duration);
        emit RewardPoolStarted(
            _pid,
            address(pool.rewardTokenAddress),
            _reward,
            pool.periodFinish
        );
    }

    /** @dev Ejects any remaining tokens from the reward pool specified. Callable only after the pool has started and the pools reward distribution period has finished. */
    function eject(uint256 _pid) public onlyOwner {
        PoolInfo storage pool = poolInfo[_pid];

        require(
            block.timestamp >= pool.periodFinish.add(12 hours),
            "Cannot eject before period finishes or pool has started"
        );
        uint256 currBalance = pool.rewardTokenAddress.balanceOf(address(this));
        pool.rewardTokenAddress.safeTransfer(msg.sender, currBalance);
    }

    /** @dev Ejects any remaining tokens from all reward pools */
    function ejectAll() public onlyOwner {
        // loop through all reward pools to eject all
        for (uint256 i = 0; i < poolInfo.length; i++) {
            PoolInfo storage pool = poolInfo[i];

            if (address(pool.rewardTokenAddress) == address(0)) {
                continue;
            } else {
                require(
                    block.timestamp >= pool.periodFinish.add(12 hours),
                    "Cannot eject before period finishes or pool has started, check all reward pool durations"
                );
                uint256 currBalance = pool.rewardTokenAddress.balanceOf(
                    address(this)
                );
                pool.rewardTokenAddress.safeTransfer(msg.sender, currBalance);
            }
        }
    }

    /** @dev Removes a specific pool in the array, leaving the pid slot empty */
    function removeRewardPool(uint256 _pid) external onlyOwner {
        PoolInfo storage pool = poolInfo[_pid];
        addedRewardTokens[address(pool.rewardTokenAddress)] = false;
        eject(_pid);
        delete poolInfo[_pid];
    }

    /** @dev Removes all reward pools */
    function removeAllRewardPools() external onlyOwner {
        for (uint256 i = 0; i < poolInfo.length; i++) {
            PoolInfo storage pool = poolInfo[i];
            addedRewardTokens[address(pool.rewardTokenAddress)] = false;
        }
        ejectAll();
        delete poolInfo;
    }

    /** @dev Forcefully retire a pool. Only sets the period finish to 0. Will prevent more rewards from being distributed */
    function kill(uint256 _pid) external onlyOwner {
        PoolInfo storage pool = poolInfo[_pid];

        pool.periodFinish = block.timestamp;
    }

    /** @dev Added to support recovering LP Rewards from other systems such as BAL to be distributed to holders */
    function emergencyWithdraw(address tokenAddress, uint256 tokenAmount)
        external
        onlyOwner
    {
        require(
            tokenAddress != address(stakingToken),
            "Cannot withdraw staking token"
        );
        require(
            addedRewardTokens[tokenAddress] == false,
            "Cannot withdraw reward token"
        );
        IERC20(tokenAddress).safeTransfer(msg.sender, tokenAmount);
    }

    /** @dev Sets a new treasury address */
    function setNewTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }
}
