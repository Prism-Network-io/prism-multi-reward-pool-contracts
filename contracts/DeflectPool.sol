//SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

/*
    ▓█████▄ ▓█████   ████ ▒██▓    ▓█████  ▄████▄  ▄▄▄█████▓   ██▓███   ▒█████   ▒█████   ██▓
    ▒██▀ ██▌▓█   ▀  ▓██   ▒▓██▒    ▓█   ▀ ▒██▀ ▀█  ▓  ██▒ ▓▒   ▓██░  ██▒▒██▒  ██▒▒██▒  ██▒ ▓██▒
    ░██   █▌▒███    ▒████ ░▒██░    ▒███   ▒▓█    ▄    ██░ ▒    ▓██░ ██▓▒▒██   ██▒▒██░  ██▒ ▒██░
    ░▓█▄   ▌▒▓█  ▄ ░ ▓█▒  ░▒██░    ▒▓█  ▄ ▒▓▓▄ ▄██▒░  ██ ░    ▒██▄█▓▒ ▒▒██   ██░▒██   ██░ ▒██░
    ░▒████▓ ░▒████▒░ ▒█░   ░██████▒░▒████▒▒ ▓███▀ ░  ▒██▒     ▒██▒ ░  ░░ ████▓▒░░ ████▓▒░░██████▒
     ▒▒▓  ▒ ░░ ▒░ ░ ▒ ░   ░ ▒░▓  ░░░ ▒░ ░░ ░▒ ▒  ░  ▒ ░░        ▒▓▒░ ░  ░░ ▒░▒░▒░ ░ ▒░▒░▒░ ░ ▒░▓  ░
     ░ ▒  ▒  ░ ░  ░ ░     ░ ░ ▒  ░ ░ ░  ░  ░  ▒       ░          ░▒ ░       ░ ▒ ▒░   ░ ▒ ▒░ ░ ░ ▒  ░
     ░ ░  ░    ░    ░ ░     ░ ░      ░   ░             ░             ░░         ░ ░ ░ ▒  ░ ░ ░ ▒
*/

import "@openzeppelin/contracts/math/Math.sol";
import "./LPTokenWrapper.sol";
import "./interfaces/IDeflector.sol";
import "./interfaces/IERC20Metadata.sol";

/**
 * @title DeflectPool
 * @author DEFLECT PROTOCOL
 * @dev This contract is a time-based yield farming pool with effective-staking multiplier mechanics.
 *
 * * * NOTE: A withdrawal fee of 1.5% is included which is sent to the treasury address. Fee is reduced by holding PRISM * * *
 */

contract DeflectPool is LPTokenWrapper {
    using SafeERC20 for IERC20Metadata;

    IDeflector public immutable deflector;
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

    PoolInfo[] public poolInfo;

    mapping(address => bool) public addedRewardTokens; // Used for preventing LP tokens from being added twice in add().
    mapping(uint256 => mapping(address => UserRewardInfo)) public rewardsInPool;

    event Withdrawn(address indexed user, uint256 amount);
    event Staked(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, address rewardToken, uint256 rewardAmount);
    event Boost(address _token, uint256 level);
    event RewardPoolAdded(uint256 rewardPoolID, address rewardTokenAddress, uint256 rewardDuration);
    event RewardPoolStarted(uint256 rewardPoolID, address rewardTokenAddress, uint256 rewardAmount, uint256 rewardPeriodFinish);

    // Set the staking token, addresses, various fee variables and the prism fee reduction level amounts
    constructor(
        address _stakingToken,
        address _deflector,
        address _treasury,
        address _devFund,
        uint256 _devFee,
        uint256 _burnFee,
        address _prism
    ) public LPTokenWrapper(_devFee, _stakingToken, _treasury, _burnFee, _prism) {
        require(_stakingToken != address(0) && _deflector != address(0) && _treasury != address(0) && _devFund != address(0), "!constructor");
        deflector = IDeflector(_deflector);
        stakingTokenMultiplier = 10**uint256(IERC20Metadata(_stakingToken).decimals());
        deployedTime = block.timestamp;
        devFund = _devFund;
    }

    /* @dev Updates the rewards a user has earned */
    function updateReward(address account) internal {
        // loop through all reward pools for user
        for (uint i = 0; i < poolInfo.length; i++) {
            PoolInfo storage pool = poolInfo[i];
            
            if (address(pool.rewardTokenAddress) == address(0)) {
                continue;
            }   else {
                    rewardsInPool[i][account].rewards = earned(account, i);
                    rewardsInPool[i][account].userRewardPerTokenPaid = pool.rewardPerTokenStored;
                    updateRewardPerTokenStored(i);                    
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
    function rewardPerToken(uint256 _pid) public view returns (uint256) {

        PoolInfo storage pool = poolInfo[_pid];

        // Do not distribute rewards before startTime.
        if (block.timestamp < pool.startTime) {
            return 0;
        }

        if (totalSupply == 0) {
            return pool.rewardPerTokenStored;
        }

        // Effective total supply takes into account all the multipliers bought by userbase.
        uint256 effectiveTotalSupply = totalSupply.add(boostedTotalSupply);
        // The returrn value is time-based on last time the contract had rewards active multipliede by the reward-rate.
        // It's evened out with a division of bonus effective supply.
        return pool.rewardPerTokenStored
        .add(
            lastTimeRewardsActive(_pid)
            .sub(pool.lastUpdateTime)
            .mul(pool.rewardRate)
            .mul(stakingTokenMultiplier)
            .div(effectiveTotalSupply)
        );
    }

    /** @dev Returns the claimable tokens for user.*/
    function earned(address account, uint256 _pid) public view returns (uint256) {
     
        uint256 effectiveBalance = _balances[account].balance.add(_balances[account].boostedBalance);
        uint256 reward = rewardsInPool[_pid][msg.sender].rewards;
        uint256 rewardPerTokenPaid = rewardsInPool[_pid][msg.sender].userRewardPerTokenPaid;

        return effectiveBalance.mul(rewardPerToken(_pid).sub(rewardPerTokenPaid)).div(stakingTokenMultiplier).add(reward);
    }

    /** @dev Staking function which updates the user balances in the parent contract */
    function stake(uint256 amount) public override {
        require(amount > 0, "Cannot stake 0");

        updateReward(msg.sender);

        // Call the parent to adjust the balances.
        super.stake(amount);

        // Adjust the bonus effective stake according to the multiplier.
        uint256 boostedBalance = deflector.calculateBoostedBalance(msg.sender, _balances[msg.sender].balance);
        adjustBoostedBalance(boostedBalance);
        emit Staked(msg.sender, amount);
    }

    /** @dev Withdraw function, this pool contains a tax which is defined in the constructor */
    function withdraw(uint256 amount, address) public override {
        require(amount > 0, "Cannot withdraw 0");
        updateReward(msg.sender);

        // Adjust regular balances
        super.withdraw(amount, msg.sender);

        // And the bonus balances
        uint256 boostedBalance = deflector.calculateBoostedBalance(msg.sender, _balances[msg.sender].balance);
        adjustBoostedBalance(boostedBalance);
        emit Withdrawn(msg.sender, amount);
    }

    /** @dev Adjust the bonus effective stakee for user and whole userbase */
    function adjustBoostedBalance(uint256 _boostedBalance) private {
        Balance storage balances = _balances[msg.sender];
        uint256 previousBoostedBalance = balances.boostedBalance;
        if (_boostedBalance < previousBoostedBalance) {
            uint256 diffBalancesAccounting = previousBoostedBalance.sub(_boostedBalance);
            boostedTotalSupply = boostedTotalSupply.sub(diffBalancesAccounting);
        } else if (_boostedBalance > previousBoostedBalance) {
            uint256 diffBalancesAccounting = _boostedBalance.sub(previousBoostedBalance);
            boostedTotalSupply = boostedTotalSupply.add(diffBalancesAccounting);
        }
        balances.boostedBalance = _boostedBalance;
    }

    /** @dev Ease-of-access function for user to remove assets from the pool */
    function exit() external {
        getReward();
        withdraw(balanceOf(msg.sender), msg.sender);
    }

    /** @dev Sends out the reward tokens to the user */
    function getReward() public {
        updateReward(msg.sender);
        
        // loop through all the reward pools for a user
        for (uint i = 0; i < poolInfo.length; i++) {
            PoolInfo storage pool = poolInfo[i];
            uint256 reward = rewardsInPool[i][msg.sender].rewards;

            if (address(pool.rewardTokenAddress) == address(0) || reward == 0) {
                continue;
            }   else {
                    rewardsInPool[i][msg.sender].rewards = 0;
                    pool.rewardTokenAddress.safeTransfer(msg.sender, reward);
                    emit RewardPaid(msg.sender, address(pool.rewardTokenAddress), reward);
                }
        }
    }

    /** @dev Sends out the reward tokens to the user, while also re-staking reward tokens if it is the same as the staking tokens */
    function getRewardCompound() public {
        updateReward(msg.sender);
        
        // loop through all the reward pools for a user
        for (uint i = 0; i < poolInfo.length; i++) {
            PoolInfo storage pool = poolInfo[i];
            uint256 reward = rewardsInPool[i][msg.sender].rewards;

            if (address(pool.rewardTokenAddress) == address(0) || reward == 0) {
                continue;
            }   else {
                    rewardsInPool[i][msg.sender].rewards = 0;

                    if (address(pool.rewardTokenAddress) == address(stakingToken)) {
                        stake(reward);
                    } else {
                        pool.rewardTokenAddress.safeTransfer(msg.sender, reward);
                        emit RewardPaid(msg.sender, address(pool.rewardTokenAddress), reward);
                    }
                }
        }
    }

    /** @dev Purchase a multiplier level, same level cannot be purchased twice */
    function purchase(address _token, uint256 _newLevel) external {

        updateReward(msg.sender);
        
        // Calculates cost, ensures it is a new level too
        uint256 cost = deflector.calculateCost(msg.sender, _token, _newLevel);
        require(cost > 0, "cost cannot be 0");

        // Update level in multiplier contract
        uint256 newBoostedBalance = deflector.updateLevel(msg.sender, _token, _newLevel, _balances[msg.sender].balance);

        // Adjust new level
        adjustBoostedBalance(newBoostedBalance);

        emit Boost(_token, _newLevel);

        uint256 devPortion = cost.mul(25) / 100;

        // Transfer the bonus cost into the treasury and dev fund.
        IERC20Metadata(_token).safeTransferFrom(msg.sender, devFund, devPortion);
        IERC20Metadata(_token).safeTransferFrom(msg.sender, treasury, cost - devPortion);
    }

    /** @dev Sync after minting more prism */
    function sync() external {
        updateReward(msg.sender);

        uint256 boostedBalance = deflector.calculateBoostedBalance(msg.sender, _balances[msg.sender].balance);
        require(boostedBalance > _balances[msg.sender].boostedBalance, "DeflectPool::sync: Invalid sync invocation");
        // Adjust new level
        adjustBoostedBalance(boostedBalance);
    }

    /** @dev Returns the multiplier for user */
    function getUserMultiplier() external view returns (uint256) {
         // And the bonus balances
        uint256 boostedBalance = deflector.calculateBoostedBalance(msg.sender, _balances[msg.sender].balance);
        
        if (boostedBalance == 0) return 0;

        return boostedBalance * 100 / _balances[msg.sender].balance;
    }

    /** @dev Returns the amount of tokens needed to purchase the boost level input */
    function getLevelCost(address _token, uint256 _level) external view returns (uint256) {
        return deflector.calculateCost(msg.sender, _token, _level);
    }

    /** @dev Adds a new reward pool with specified duration */
    function addRewardPool(IERC20Metadata _rewardToken, uint256 _duration) public onlyOwner {
        require(address(_rewardToken) != address(0), "Cannot add burn address");
        require(_duration != 0, "Must define valid duration length");

        // calculate info relevant for storing in the pool array
        uint256 totalPools = poolInfo.length;
        uint256 _rewardTokenID = totalPools++;

        poolInfo.push(PoolInfo({
            rewardTokenAddress: _rewardToken,
            rewardPoolID: _rewardTokenID,
            duration: _duration,
            periodFinish: 0,
            startTime: 0,
            lastUpdateTime: 0,
            rewardRate: 0,
            rewardPerTokenStored: 0
        }));

        addedRewardTokens[address(_rewardToken)] = true;

        emit RewardPoolAdded(_rewardTokenID, address(_rewardToken), _duration);
    }

    /** @dev Called to start the pool. Owner must have already sent rewards to the contract. Reward amount is defined in the input. */
    function notifyRewardAmount(uint256 _pid, uint256 _reward) external onlyOwner() {
        require(_reward > 0, "!reward added");

        PoolInfo storage pool = poolInfo[_pid];
        
        // Sets the pools finish time to end after duration length
        pool.periodFinish = block.timestamp + pool.duration;

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
        emit RewardPoolStarted(_pid, address(pool.rewardTokenAddress), _reward, pool.periodFinish);
    }

    /** @dev Ejects any remaining tokens from the reward pool specified. Callable only after the pool has started and the pools reward distribution period has finished. */
    function eject(uint256 _pid) public onlyOwner() {
        PoolInfo storage pool = poolInfo[_pid];

        require(block.timestamp >= pool.periodFinish + 12 hours, "Cannot eject before period finishes or pool has started");
        uint256 currBalance = pool.rewardTokenAddress.balanceOf(address(this));
        pool.rewardTokenAddress.safeTransfer(msg.sender, currBalance);
    }

    /** @dev Ejects any remaining tokens from all reward pools */
    function ejectAll() public onlyOwner() {
        // loop through all reward pools to eject all
        for (uint i = 0; i < poolInfo.length; i++) {
            PoolInfo storage pool = poolInfo[i];
            
            if (address(pool.rewardTokenAddress) == address(0)) {
                continue;
            }   else {
                    require(block.timestamp >= pool.periodFinish + 12 hours, "Cannot eject before period finishes or pool has started, check all reward pool durations");
                    uint256 currBalance = pool.rewardTokenAddress.balanceOf(address(this));
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
        for (uint i = 0; i < poolInfo.length; i++) {
            PoolInfo storage pool = poolInfo[i];
            addedRewardTokens[address(pool.rewardTokenAddress)] = false;
        }
        ejectAll();
        delete poolInfo;
    }

    /** @dev Forcefully retire a pool. Only sets the period finish to 0. Will prevent more rewards from being distributed */
    function kill(uint256 _pid) external onlyOwner() {
        PoolInfo storage pool = poolInfo[_pid];

        pool.periodFinish = block.timestamp;
    }

    /** @dev Callable only after the pool has started and the pools reward distribution period has finished */
    function emergencyWithdraw(uint256 _pid) external {
        PoolInfo storage pool = poolInfo[_pid];
        require(block.timestamp >= pool.periodFinish + 12 hours, "DeflectPool::emergencyWithdraw: Cannot emergency withdraw before period finishes or pool has started");
        uint256 fullWithdrawal = pool.rewardTokenAddress.balanceOf(msg.sender);
        require(fullWithdrawal > 0, "DeflectPool::emergencyWithdraw: Cannot withdraw 0");
        super.withdraw(fullWithdrawal, msg.sender);
        emit Withdrawn(msg.sender, fullWithdrawal);
    }

    /** @dev Sets a new treasury address */ 
    function setNewTreasury(address _treasury) external onlyOwner() {
        treasury = _treasury;
    }
}