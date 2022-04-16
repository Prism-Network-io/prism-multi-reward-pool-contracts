1. GLOBAL-01 | Centralization Related Risks: We were about used ChainLink Oracle services for that, but now we dont use, so removed.
2. CKP-01 | Incompatibility With Deflationary Tokens: its not correct issue, we have burnFee variable, when token is Deflationary Tokens, we will check that token contract and set burnFee variable to make sure staked balance, totalSupply is correct.
3. DCK-01 | Incremental Check Of Parameters: Fixed
4. DCK-02 | Missing Pool Existence Validation: Fixed
5. DPC-02 | Missing Pool Existence Validation: Fixed
6. DPC-03 | Missing Depositing Reward Validation: Fixed by using safeTransferFrom to make sure reward always added when notify
7. DPC-04 | Confusing emergencyWithdraw: Fixed by changed that function to allow owner can withdraw token from contract but not stake and reward token
8.DPC-05 | Updating Reward Mistakenly : Fixed
9. DPC-06 | Wrong Way To Compound: I dont think its issue, when user stake, we update reward then increase user amount and total staked amount (FYI: https://github.com/curvefi/multi-rewards/blob/master/contracts/MultiRewards.sol#L465)
10.DPC-07 | Potential Reentrancy Attack: fixed.
11. LPT-01 | Divide Before Multiply: fixed.
12. LPT-02 | Not Burnt: Its not correct, burnFee here reppresent for token that has burn amount when transfer, for example transfer 10 burn 1, so staked balance is only 9. That burn based on token code, not staking contract code.
12. LPT-03 | Potential Failure Of Transferring Amount Zero: Fixed
13. LPT-04 | Incremental Check Of Parameters and LPT-05 | Check Effect Interaction Pattern Violated: We leave it as it 