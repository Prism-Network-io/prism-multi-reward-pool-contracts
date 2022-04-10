1. GLOBAL-01 | Centralization Related Risks: We were about used ChainLink Oracle services for that, but now we dont use, so removed.
2. CKP-01 | Incompatibility With Deflationary Tokens: its not correct issue, we have burnFee variable, when token is Deflationary Tokens, we will check that token contract and set burnFee variable to make sure staked balance, totalSupply is correct.
3. DCK-01 | Incremental Check Of Parameters: Fixed
4. DCK-02 | Missing Pool Existence Validation: Fixed
5. DPC-02 | Missing Pool Existence Validation: Fixed
6. DPC-03 | Missing Depositing Reward Validation: Fixed by using safeTransferFrom to make sure reward always added when notify
