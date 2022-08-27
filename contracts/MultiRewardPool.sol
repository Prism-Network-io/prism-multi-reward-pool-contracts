//SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./LPTokenWrapper.sol";
import "./interfaces/IERC20Metadata.sol";

/**
 * @title MultiRewardPool
 * @author Empire Capital
 * @dev Stake token to earn multiple different reward tokens
 *
 * Credit to Synthetix for original StakingReward contract
 */
contract MultiRewardPool is LPTokenWrapper, ReentrancyGuard {
    using SafeERC20 for IERC20Metadata;
    uint256 public immutable stakingTokenMultiplier;

    struct PoolInfo {
        IERC20Metadata rewardToken;
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

    /*//////////////////////////////////////////////////////////////
                            POOL LOGIC
    //////////////////////////////////////////////////////////////*/

    /// @notice Updates the rewards a user has earned
    /// @dev Loops through all reward pools
    /// @param account The address of the account to update rewards for
    function updateReward(address account) internal {
        // loop through all reward pools for user
        for (uint256 i = 0; i < poolInfo.length; i++) {
            PoolInfo storage pool = poolInfo[i];

            if (address(pool.rewardToken) == address(0)) {
                continue;
            } else {
                updateRewardPerTokenStored(i);
                rewardsInPool[i][account].rewards = earned(account, i);
                rewardsInPool[i][account].userRewardPerTokenPaid = pool.rewardPerTokenStored;
            }
        }
    }

    /// @notice Updates the amount of rewards to distribute in a reward pool
    /// @param _pid The pool ID of the reward pool to update
    function updateRewardPerTokenStored(uint256 _pid) internal {
        PoolInfo storage pool = poolInfo[_pid];

        pool.rewardPerTokenStored = rewardPerToken(_pid);
        pool.lastUpdateTime = lastTimeRewardsActive(_pid);
    }

    /// @notice Updates the last time the calculations were done for pool rewards of a reward pool
    /// @dev If pool has finished, return that time instead
    /// @param _pid The pool ID of the reward pool to get lastUpdateTime
    function lastTimeRewardsActive(uint256 _pid) public view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];
        return Math.min(block.timestamp, pool.periodFinish);
    }

    /// @notice Returns the time that a specified reward pool will end
    /// @param _pid The pool ID of the reward pools end time
    function endTime(uint256 _pid) public view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];

        return pool.periodFinish;
    }

    /// @notice Returns the amount of reward pools created
    function poolLength() public view returns (uint256) {
        return poolInfo.length;
    }

    /// @notice Returns the current rate of rewards per token stored for a reward pool
    /// @param _pid The pool ID of the reward pool to get rewardPerTokenStored 
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

    /// @notice Returns the amount of reward tokens claimable by the user at specified reward pool
    /// @param account The address of the user to check
    /// @param _pid The pool ID of the reward pool to check rewards
    function earned(address account, uint256 _pid)
        public
        view
        returns (uint256)
    {
        uint256 reward = rewardsInPool[_pid][msg.sender].rewards;
        uint256 rewardPerTokenPaid = rewardsInPool[_pid][msg.sender].userRewardPerTokenPaid;

        return
            _balances[account]
                .mul(rewardPerToken(_pid)
                .sub(rewardPerTokenPaid))
                .div(stakingTokenMultiplier)
                .add(reward);
    }

    /*//////////////////////////////////////////////////////////////
                            USER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Stakes a users tokens to start earning rewards
    /// @param amount The amount of tokens to stake
    function stake(uint256 amount) public override nonReentrant {
        require(amount > 0, "Cannot stake 0");
        updateReward(msg.sender);
        super.stake(amount);
        emit Staked(msg.sender, amount);
    }

    /// @notice Withdraws a users staked tokens
    /// @dev Withdrawing incurs a fee specified as devFee
    /// @param amount The amount of tokens to withdraw
    function withdraw(uint256 amount) public override nonReentrant {
        require(amount > 0, "Cannot withdraw 0");
        updateReward(msg.sender);
        super.withdraw(amount);
        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Gets reward tokens and withdraws user stake
    function exit() external nonReentrant {
        getReward();
        withdraw(balanceOf(msg.sender));
    }

    /// @notice Gets reward tokens from all reward pools
    function getReward() public nonReentrant {
        updateReward(msg.sender);
        uint256 arraysize = poolInfo.length;

        // loop through all the reward pools for a user
        for (uint256 i = 0; i < arraysize; i++) {
            PoolInfo storage pool = poolInfo[i];
            uint256 reward = rewardsInPool[i][msg.sender].rewards;

            if (address(pool.rewardToken) == address(0) || reward == 0) {
                continue;
            } else {
                rewardsInPool[i][msg.sender].rewards = 0;
                pool.rewardToken.safeTransfer(msg.sender, reward);
                emit RewardPaid(
                    msg.sender,
                    address(pool.rewardToken),
                    reward
                );
            }
        }
    }

    /// @notice Gets reward tokens and re-stakes rewards if rewardToken = stakingToken
    function getRewardCompound() public nonReentrant {
        updateReward(msg.sender);

        // loop through all the reward pools for a user
        for (uint256 i = 0; i < poolInfo.length; i++) {
            PoolInfo storage pool = poolInfo[i];
            uint256 reward = rewardsInPool[i][msg.sender].rewards;

            if (address(pool.rewardToken) == address(0) || reward == 0) {
                continue;
            } else {
                rewardsInPool[i][msg.sender].rewards = 0;

                if (address(pool.rewardToken) == address(stakingToken)) {
                    stake(reward);
                } else {
                    pool.rewardToken.safeTransfer(msg.sender, reward);
                    emit RewardPaid(
                        msg.sender,
                        address(pool.rewardToken),
                        reward
                    );
                }
            }
        }
    }

    /*//////////////////////////////////////////////////////////////
                            ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Sets up a new reward pool
    /// @dev Logic for setting up a reward pool + starting reward pool are seperated to allow prestaking
    /// @param _rewardToken The address of the reward token that will be added as a reward pool
    function addRewardPool(IERC20Metadata _rewardToken) public onlyOwner {
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
                rewardToken: _rewardToken,
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

    /// @notice Called to change the details of a reward pool
    /// @param _pid The pool ID of the reward pool to change details
    /// @param _reward The amount of new reward tokens to be added to the pool
    /// @param _duration The duration of the pool from the current time
    function extendRewardPool(uint256 _pid, uint256 _reward, uint256 _duration) external onlyOwner {
        require(_reward > 0, "Can not add zero balance");
        require(_duration > 0, "Must define valid duration length");

        PoolInfo storage pool = poolInfo[_pid];
        uint256 timeNow = block.timestamp;
        uint256 rewardsRemaining;
        uint256 totalRewards;

        // Transfer reward token from caller to contract
        pool.rewardToken.safeTransferFrom(
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
            address(pool.rewardToken),
            rewardsRemaining,
            _reward,
            totalRewards,
            pool.duration,
            pool.periodFinish
        );
    }

    /// @notice Called to start the emissions on a reward pool
    /// @param _pid The pool ID of the reward pool to start
    /// @param _reward The amount of reward tokens to be distributed
    /// @param _duration The duration of the reward pool in seconds
    function startRewardPool(uint256 _pid, uint256 _reward, uint256 _duration) external onlyOwner {
        require(_reward > 0, "Can not add zero balance");
        require(_duration > 0, "Must define valid duration length");

        PoolInfo storage pool = poolInfo[_pid];
        uint256 timeNow = block.timestamp;

        // Transfer reward token from caller to contract
        pool.rewardToken.safeTransferFrom(
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
            address(pool.rewardToken),
            _reward,
            pool.duration,
            pool.periodFinish
        );
    }

    /// @notice Ejects any remaining reward tokens from the reward pool specified
    /// @dev Callable only after the pool has ended + 7 days
    /// @param _pid The pool ID of the reward pool having reward tokens ejected
    function eject(uint256 _pid) public onlyOwner {
        PoolInfo storage pool = poolInfo[_pid];

        require(block.timestamp >= pool.periodFinish.add(7 days),
            "Can only eject 7 days after pool has finished"
        );
        uint256 currBalance = pool.rewardToken.balanceOf(address(this));

        // If Staking Token = Reward Token of Pool, do not withdraw the users staked tokens
        if (address(stakingToken) == address(pool.rewardToken)) {
            currBalance = currBalance.sub(totalSupply);
        }

        pool.rewardToken.safeTransfer(msg.sender, currBalance);
    }

    /// @notice Ejects any remaining reward tokens from all reward pools
    function ejectAll() public onlyOwner {
        // loop through all reward pools to eject all
        for (uint256 i = 0; i < poolInfo.length; i++) {
            PoolInfo storage pool = poolInfo[i];

            if (address(pool.rewardToken) == address(0)) {
                continue;
            } else {
                eject(i);
            }
        }
    }

    /// @notice Forcefully retire a pool, preventing more rewards from being distributed
    /// @dev Only sets the period finish to 0
    /// @param _pid The pool ID of the reward pool to be retired
    function kill(uint256 _pid) external onlyOwner {
        PoolInfo storage pool = poolInfo[_pid];

        pool.periodFinish = block.timestamp;
    }

    /// @notice Recovers tokens that are stuck on the contract
    /// @param tokenAddress The address of the stuck token
    /// @param tokenAmount The amount of tokens stuck on the contract
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

    /// @notice Sets a new treasury address
    /// @param _treasury The new treasury address
    function setNewTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }
    
}