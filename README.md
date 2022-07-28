# Multi Reward Staking Pools

The Multi Reward Staking Pool contract allows for a user to deposit a single asset (`stakingToken`) and receive multiple different types of reward tokens. Pools are filled up from transferring in reward tokens and distributed amongst stakers over time until the rewards run out. 

APY is therefore variable, based on:

- The price of the reward token
- The `duration` of the reward pool
- The amount of `stakingToken` the user has staked
- The amount of `stakingToken` all other users have staked

## MultiRewardPool.sol

Contains all the data for associated reward pools. Each reward token is designated its own pool (`poolInfo.rewardPoolID`).

The arguments in sequence are:

- `_stakingToken`: The token required for staking
- `_treasury`: The address to send fees from withdrawing (`devFee`)
- `_devFee`: The percentage of fees that should be imposed when withdrawing, denoted assuming a denominator of `1000` so that an input of `10` = 1%
- `_tokenFee`: Used to account for tokens that have burn on transfers or similar mechanisms. Modifies users balance to match what they have staked after transfer fees. Denoted using a denominator of `10000` so that an input of `10` = 0.1% fee on transfer.

### Active Functions

#### stake(uint256 amount)

Invoked by users who wish to stake a set amount of the `_stakingToken`. They must have approved the contract before invoking this, otherwise the call will fail.

#### withdraw(uint256 amount)

The amount of funds to withdraw from the contract when already staking. The user must have already staked this amount or greater to be able to withdraw it.
#### exit()

Acquires any pending rewards and withdraws the full balance of the user.

#### getReward()

Allows a user to claim any pending reward tokens they have on all reward pools.

#### getRewardCompound()

Allows a user to claim any pending reward tokens they have. If any of the reward tokens are the same as the staking token, then instead of claiming the rewards the user's stake is instead increased.

#### addRewardPool(IERC20Metadata _rewardToken)

Creates a new reward pool for the input reward token.

- `_rewardToken`: The token to be paid out

#### extendRewardPool(uint256 _pid, uint256 _reward, uint256 _duration)

Adds more reward tokens to an existing reward pool and sets a new duration.

 - `_pid`: The reward pool to extend
 - `_reward`: The amount of new reward tokens to be added.
 - `_duration`: The new duration of the pool in seconds, starting from time called.
#### startRewardPool(uint256 _pid, uint256 _reward, uint256 _duration)

Starts a reward pool's emissions.

- `_pid`: The id of the pool
- `_reward`: The amount of reward tokens to distribute.
- `_duration`: The duration of the pool to distibute tokens over.

#### eject(uint256 _pid)

An administrative function enabling the owner to withdraw any remainder from the contract once it has finished. This exists because calculations cannot be 100% accurate and some dust will remain in the contract. Can only be used after the reward pool duration has finished.

- `_pid`: The pool to eject tokens from.

#### ejectAll()

Same as eject, for all reward pools.

#### removeRewardPool(uint256 _pid)

Removes a specific reward pool.

- `_pid` The reward pool to remove.

#### removeAllRewardPools()

Removes all of the added reward pools.

#### kill(uint256 _pid)

Immediately ends the entered reward pool. Should be used with caution as it prevents future rewards from being distributed.

- `_pid`: The reward pool to end prematurely. 

#### emergencyWithdraw(address tokenAddress, uint256 tokenAmount)

A function to remove any tokens that are stuck on the contract and transfer to caller.

- `tokenAddress`: The address of the token to remove from the contract.
- `tokenAmount`: The amount of tokens to remove from the contract.

#### setNewTreasury(address _treasury)

Enables the deployer of the contract to set a new treasury address.

### View Functions

### endDate(uint256 _pid)

Returns the end date of the specified reward pool.

### rewardPerToken(uint256 _pid)

Returns the current rate of reward per token for a specified reward pool.
#### earned(address account, uint256 _pid)

Returns the amount of tokens availiable for the user to claim for the specified reward pool.

## LPTokenWrapper.sol

Used for the core features of DeflectPool.sol such as `stake()` & `withdraw()`. 
