//SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./LPTokenWrapper.sol";
import "./interfaces/IERC20Metadata.sol";

/**
 * @title MultiRewardPool
 * @author Empire Capital
 * @dev Stake token to earn multiple different reward tokens

 Credit to Synthetix for original StakingReward contract
 */
contract MultiRewardPool is LPTokenWrapper, ReentrancyGuard {
    using SafeERC20 for IERC20Metadata;
    uint256 public immutable stakingTokenMultiplier;

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

    PoolInfo[] public poolInfo;

    mapping(address => bool) public addedRewardTokens;
    mapping(uint256 => mapping(address => UserRewardInfo)) public rewardsInPool;

    event Withdrawn(address indexed user, uint256 amount);
    event Staked(address indexed user, uint256 amount);
    event RewardPaid(
        address indexed user,
        address rewardToken,
        uint256 rewardAmount
    );
    event RewardPoolAdded(
        uint256 rewardPoolID,
        address rewardTokenAddress
    );
    event RewardPoolStarted(
        uint256 rewardPoolID,
        address rewardTokenAddress,
        uint256 rewardAmount,
        uint256 rewardDuration,
        uint256 rewardPeriodFinish
    );
    event RewardPoolExtended(
        uint256 rewardPoolID,
        address rewardTokenAddress,
        uint256 oldRewardAmount,
        uint256 newRewardAmount,
        uint256 totalRewardAmount,
        uint256 rewardDuration,
        uint256 rewardPeriodFinish
    );

    constructor(
        address _stakingToken,
        address _treasury,
        uint256 _devFee,
        uint256 _tokenFee
    )
        public
        LPTokenWrapper(_devFee, _stakingToken, _treasury, _tokenFee)
    {
        require(
            _stakingToken != address(0) &&
                _treasury != address(0),
            "!constructor"
        );
        stakingTokenMultiplier =
            10**uint256(IERC20Metadata(_stakingToken).decimals());
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
                rewardsInPool[i][account].userRewardPerTokenPaid = pool.rewardPerTokenStored;
            }
        }
    }

    /* Updates the amount of rewards to distribute in a pool per staked token */
    function updateRewardPerTokenStored(uint256 _pid) internal {
        PoolInfo storage pool = poolInfo[_pid];

        pool.rewardPerTokenStored = rewardPerToken(_pid);
        pool.lastUpdateTime = lastTimeRewardsActive(_pid);
    }

    /* @dev Updates the last time the calculations were done for pool rewards */
    function lastTimeRewardsActive(uint256 _pid) public view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];
        return Math.min(block.timestamp, pool.periodFinish);
    }

    /* @dev Returns the time that a specified pool will end */
    function endDate(uint256 _pid) public view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];

        return pool.periodFinish;
    }

    function poolLength() public view returns (uint256) {
        return poolInfo.length;
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
        uint256 rewardPerTokenPaid = rewardsInPool[_pid][msg.sender].userRewardPerTokenPaid;

        return
            _balances[account]
                .balance
                .mul(rewardPerToken(_pid)
                .sub(rewardPerTokenPaid))
                .div(stakingTokenMultiplier)
                .add(reward);
    }

    /** @dev Staking function which updates the user balances in the parent contract */
    function stake(uint256 amount) public override nonReentrant {
        require(amount > 0, "Cannot stake 0");
        updateReward(msg.sender);
        super.stake(amount);
        emit Staked(msg.sender, amount);
    }

    /** @dev Withdraw function, this pool contains a tax which is defined in the constructor */
    function withdraw(uint256 amount) public override nonReentrant {
        require(amount > 0, "Cannot withdraw 0");
        updateReward(msg.sender);
        super.withdraw(amount);
        emit Withdrawn(msg.sender, amount);
    }

    /** @dev Ease-of-access function for user to remove assets from the pool */
    function exit() external nonReentrant {
        getReward();
        withdraw(balanceOf(msg.sender));
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

    /** @dev Adds a new reward pool */
    function addRewardPool(IERC20Metadata _rewardToken)
        public
        onlyOwner
    {
        require(address(_rewardToken) != address(0), "Cannot add burn address");
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
                duration: 0,
                periodFinish: 0,
                startTime: 0,
                lastUpdateTime: 0,
                rewardRate: 0,
                rewardPerTokenStored: 0
            })
        );

        addedRewardTokens[address(_rewardToken)] = true;

        emit RewardPoolAdded(_rewardTokenID, address(_rewardToken));
    }

    /** @dev Called to add more reward tokens to an existing pool */
    function extendRewardPool(uint256 _pid, uint256 _reward, uint256 _duration)
        external
        onlyOwner
    {
        require(_reward > 0, "Can not add zero balance");
        require(_duration > 0, "Must define valid duration length");

        PoolInfo storage pool = poolInfo[_pid];
        uint256 timeNow = block.timestamp;
        uint256 rewardsRemaining;
        uint256 totalRewards;

        // Transfer reward token from caller to contract
        pool.rewardTokenAddress.safeTransferFrom(
            msg.sender,
            address(this),
            _reward
        );

        // Update reward per token stored value + last updated value
        updateRewardPerTokenStored(_pid);

        // Update duration of pool
        pool.duration = _duration;

        // Update reward rate
        // if pool has already finished
        if (timeNow > pool.periodFinish) {
            pool.rewardRate = _reward.div(_duration);
            totalRewards = _reward;
        } else {
            // if pool has not finished yet
            // Remaining time for the pool
            uint256 remainingTime = pool.periodFinish.sub(timeNow);
            // And the rewards
            rewardsRemaining = remainingTime.mul(pool.rewardRate);
            // Find new amount of rewards in pool
            totalRewards = rewardsRemaining.add(_reward);
            // Set the current rate
            pool.rewardRate = totalRewards.div(pool.duration);            
        }

        // Set the last updated time
        pool.lastUpdateTime = timeNow;

        // Add the period to be equal to duration set
        pool.periodFinish = timeNow.add(pool.duration);

        emit RewardPoolExtended(
            _pid,
            address(pool.rewardTokenAddress),
            rewardsRemaining,
            _reward,
            totalRewards,
            pool.duration,
            pool.periodFinish
        );
    }

    /** @dev Called to start the pool. Reward amount + duration is defined in the input. */
    function startRewardPool(uint256 _pid, uint256 _reward, uint256 _duration)
        external
        onlyOwner
    {
        require(_reward > 0, "Can not add zero balance");
        require(_duration > 0, "Must define valid duration length");

        PoolInfo storage pool = poolInfo[_pid];
        uint256 timeNow = block.timestamp;

        // Transfer reward token from caller to contract
        pool.rewardTokenAddress.safeTransferFrom(
            msg.sender,
            address(this),
            _reward
        );

        // Set reward values
        updateRewardPerTokenStored(_pid);

        // Set duration of pool
        pool.duration = _duration;

        // Set the current rate
        pool.rewardRate = _reward.div(pool.duration);

        // Set the last updated time
        pool.lastUpdateTime = timeNow;

        // Set the initial start time
        pool.startTime = timeNow;

        // Add the period to be equal to duration set
        pool.periodFinish = timeNow.add(pool.duration);
        emit RewardPoolStarted(
            _pid,
            address(pool.rewardTokenAddress),
            _reward,
            pool.duration,
            pool.periodFinish
        );
    }

    /** @dev Ejects any remaining tokens from the reward pool specified.
             Callable only after the pool has started and the pools reward distribution period has finished.
     */
    function eject(uint256 _pid) public onlyOwner {
        PoolInfo storage pool = poolInfo[_pid];

        require(
            block.timestamp >= pool.periodFinish.add(12 hours),
            "Cannot eject before period finishes or pool has started"
        );
        uint256 currBalance = pool.rewardTokenAddress.balanceOf(address(this));

        // If Staking Token = Reward Token of Pool, do not withdraw the users staked tokens
        if (address(stakingToken) == address(pool.rewardTokenAddress)) {
            currBalance = currBalance.sub(totalSupply);
        }

        pool.rewardTokenAddress.safeTransfer(msg.sender, currBalance);
    }

    /** @dev Ejects any remaining tokens from all reward pool */
    function ejectAll() public onlyOwner {
        // loop through all reward pools to eject all
        for (uint256 i = 0; i < poolInfo.length; i++) {
            PoolInfo storage pool = poolInfo[i];

            if (address(pool.rewardTokenAddress) == address(0)) {
                continue;
            } else {
                eject(i);
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

    /** @dev Added to support recovering tokens that are stuck on the contract */
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