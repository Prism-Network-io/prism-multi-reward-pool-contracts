# Deflector Boosted Staking Pools

This project is meant to implement a boost-able staking token pool that provides a percentage increase on deposits that consequently boost the rewards a user takes. Multiple seperate reward pools can be added to distribute tokens proportionally to stakers over a set time period so that a single staked token can be used to farm multiple tokens at once.

A library coded in JS is not necessary as the functions of the contracts are straightforward and should be easily interface-able via a common Ethereum library like `web3` or `ethers`, however, if you need assistance please reach out. The tests also exist that should give a good idea of how the contracts are meant to be used.

## Deflector.sol

The contract contains the necessary information to calculate the boosts of a particular pool. It should be constructed by passing in the `PRISM` token address whose historical mints will be utilized to calculate the global boost of the system.

### Active Functions

#### addPool(address pool)

This function should be invoked by the owner of the contract when linking the Deflector contract to a deployed DeflectPool contract

- `pool`: The address of the deployed DeflectPool contract

#### addLocalBoost(address \_pool, address \_token, uint256[] costs, uint256[] percentages)

This function is meant to add a new set of local boosts to a pool. The first argument is the pool to add the boosts to, the second argument is the token that will be used for the boosts and the latter two arguments are dynamic arrays defining the new levels in cost of tokens and percentage boost respectively.

The costs should be specified in the units of the token i.e. if a token has 6 decimals and 2 units are meant for a level, the array should contain `2 * 10**6`. The percentages should be specified assuming a denominator of `1000` i.e. 5% is `50` as `50 / 1000 = 0.05 = 5%`.

If levels already exist for the pool, the new boosts are appended and added as new levels to the pool. Otherwise, they are created from scratch. In either case, each new cost per level **must** be greater than the last one. As was the original implementation, the costs denote the **total units necessary** to achieve it rather than the **per level cost** i.e. for costs `[100, 110]` the first level will require `100` units in total and the second level will require `110` units in total meaning that to go from level 1 to level 2 one would require to deposit only `10` units.

#### updateLevel(address \_user, address \_token, uint256 \_nextLevel, uint256 \_balance)

This function updates the boost to a level specified by the nextLevel parameter.

### View Functions

#### calculateBoostedBalance(address \_user, uint256 \_balance)

Determines the boosted balance for a user, utilising their balance and applying any boosts to produce their effective staking balance.

#### calculateCost(address \_user, address \_token, uint256 \_nextLevel)

Determines the cost for a user to level up their boost to a level specified by the nextLevel parameter.

#### getUserBoostLevel(address \_stakingPool, adddress \_user, address \_boostToken)

Retrieves the users current boost level for a staking pool.

## DeflectPool.sol

Contains all the data of a particular pool. This should be used to calculate the various front-end information necessary as the explicit view functions are meant to be called directly by the pools.

The contract contains the gradual reward pool implementation that is based on time. Reward is proportionately awarded to the users based on their total balance as well as boosted balance.

The arguments in sequence are:

- `_stakingToken`: The token required for staking
- `_deflector`: The `Deflector` address
- `_treasury`: The address to send the treasury portion of a purchased local boost
- `_devFund`: The dev address to receive the purchased boost at
- `_devFee`: The percentage of fees that should be imposed when withdrawing, denoted assuming a denominator of `1000` as is with `Deflector`
- `_burnFee`: Used to account for tokens that have burn on transfers or similar mechanisms. Modifies users balance to match what they have staked after transfer fees
- `_prism`: The address of the Prism token for deployed network

Only the new / important functions will be detailed below, other functions such as `rewardPerToken` function equivalently to how other such implementations work.

### Active Functions

#### stake(uint256 amount)

Invoked by users who wish to stake a set amount of the `_stakingToken`. They must have approved the contract before invoking this, otherwise the call will fail.

#### withdraw(uint256 amount)

The amount of funds to withdraw from the contract when already staking. The user must have already staked this amount or greater to be able to withdraw it.

#### exit()

Acquires any pending rewards and withdraws the full balance of the user.

#### getReward()

Allows a user to claim any pending reward tokens they have.

#### getRewardCompound()

Allows a user to claim any pending reward tokens they have. If any of the reward tokens are the same as the staking token, then instead of claiming the rewards the user's stake is instead increased.

#### purchase(address _token, uint256 _newLevel)

A function enabling the purchase of a local boost for the pool by paying in the `_token`. The local boost must exist in `Deflector` otherwise this call will fail.

Additionally, the user must have approved the `_token` amount of tokens necessary for the level they want to achieve to the contract.

#### sync()

A function enabling a user to update their boosted balance in case they have minted more PRISM. Should only be invoked in such a case.

#### addRewardPool(IERC20Metadata _rewardToken, uint256 _duration)

Invoked by the owner of the contract to add a new reward pool.

- `_rewardToken`: The token to be paid out
- `_duration`: The duration of the reward pool in seconds

#### notifyRewardAmount(uint256 _pid, uint256 _reward)

Should be invoked by the deployer of the pool once they have supplied the sufficient amount of reward tokens to the contract. Starts the emission period.

- `_pid`: The id of the pool
- `reward`: The amount of reward tokens to start the pool with

#### eject(uint256 _pid)

An administrative function enabling the owner to withdraw any remainder from the contract once it has finished. This exists because calculations cannot be 100% accurate and some dust will remain in the contract. Can only be used after the reward pool duration has finished.

#### ejectAll()

Same as eject, for all reward pools.

#### removeRewardPool(uint256 _pid)

Removes a specific reward pool as defined by the `_pid`.

#### removeAllRewardPools()

Removes all of the added reward pools.

#### kill(uint256 _pid)

Immediately ends the entered reward pool. Should be used with caution as it prevents future rewards from being distributed.

#### emergencyWithdraw()

A function permitting users to withdraw their funds in case of an emergency. This can happen if `kill` is used maliciously for example.

#### setNewTreasury(address _treasury)

Enables the deployer of the contract to set a new treasury address.

### View Functions

#### earned(address account, uint256 _pid)

Returns the amount of tokens availiable for the user to claim in the input reward pool.

#### getUserMultiplier()

Gets the current multiplier the user has on the contract.

#### getLevelCost(address _token, address _level)

Returns the amount of `_token` tokens that need to be approved to the contract to achieve the desired `_level` via `purchase`.

## LPTokenWrapper.sol

Used for the core features of DeflectPool.sol such as stake & withdraw. Also implements the reduction on the withdrawal fee (devfee) from holding PRISM tokens. The initial fee reductions of devfee are in three tiers that are defined in the constructor but can be edited afterwards through the editFeeReduceVariables function.

- `unstakeFeeReduceLvl#Amount`: Defines the amount of PRISM tokens required for the user to hold to get that # Discount Level.
- `unstakeFeeReduceLvl#Discount`: Defines the discount to be applied to the withdraw fee for that # Discount Level.