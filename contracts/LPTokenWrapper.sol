//SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.4;

import "./libraries/Ownable.sol";
import "./libraries/SafeERC20.sol";

abstract contract LPTokenWrapper is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable stakingToken;
    uint256 public immutable devFee;  // 10 = 1%
    uint256 public totalSupply;       // Returns the total staked tokens on the contract
    uint256 public tokenFee;          // 100 = 1%

    address public treasury;    // The address to receive devFee

    mapping(address => uint256) internal _balances;

    constructor(
        uint256 _devFee,
        address _stakingToken,
        address _treasury,
        uint256 _tokenFee
    ) {
        devFee = _devFee;
        stakingToken = IERC20(_stakingToken);
        treasury = _treasury;
        tokenFee = _tokenFee;
    }

    /// @dev Returns staking balance of an account
    /// @param account The account to check
    /// @return The amount of stakingTokens staked by `account`
    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    /// @notice Stakes `amount` of stakingToken onto the contract
    /// @dev Stakes a users tokens to start earning rewards
    /// @param amount The amount of tokens to stake
    function stake(uint256 amount) public virtual {
        // Transfer staking token from caller to contract
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        // Increment sender's balances and total supply
        if (tokenFee > 0) {
            uint256 tokenFeeBalance = amount * tokenFee / 10000;
            uint256 stakedBalance = amount - tokenFeeBalance;
            _balances[msg.sender] += stakedBalance;
            totalSupply += stakedBalance;
            return;
        } else {
            _balances[msg.sender] += amount;
            totalSupply += amount;
            return;
        }

    }

    /// @notice Withdraws `amount` of stakingToken from the contract
    /// @dev Withdrawing incurs a fee specified as devFee
    /// @param amount The amount of tokens to withdraw
    function withdraw(uint256 amount) public virtual {
        // Reduce sender's balances and total supply
        totalSupply -= amount;
        _balances[msg.sender] -= amount;

        // Calculate the withdraw tax
        uint256 tax = amount * devFee / 1000;

        // Transfer the tokens to user
        stakingToken.safeTransfer(msg.sender, amount - tax);
        // Tax to treasury
        stakingToken.safeTransfer(treasury, tax);
    }
}
