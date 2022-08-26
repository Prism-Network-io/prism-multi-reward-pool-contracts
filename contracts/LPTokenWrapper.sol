//SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

abstract contract LPTokenWrapper is Ownable {
    using SafeMath for uint256;
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
    ) public {
        devFee = _devFee;
        stakingToken = IERC20(_stakingToken);
        treasury = _treasury;
        tokenFee = _tokenFee;
    }

    /// @notice Returns staking balance of an account
    /// @param account The account to check
    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    /// @notice Stakes a users tokens to start earning rewards
    /// @param amount The amount of tokens to stake
    function stake(uint256 amount) public virtual {
        // Transfer staking token from caller to contract
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        // Increment sender's balances and total supply
        if (tokenFee > 0) {
            uint256 tokenFeeBalance = amount.mul(tokenFee).div(10000);
            uint256 stakedBalance = amount.sub(tokenFeeBalance);
            _balances[msg.sender] = _balances[msg.sender].add(stakedBalance);
            totalSupply = totalSupply.add(stakedBalance);
            return;
        } else {
            _balances[msg.sender] = _balances[msg.sender].add(amount);
            totalSupply = totalSupply.add(amount);
            return;
        }

    }

    /// @notice Withdraws a users staked tokens
    /// @dev Withdrawing incurs a fee specified as devFee
    /// @param amount The amount of tokens to withdraw
    function withdraw(uint256 amount) public virtual {
        // Reduce sender's balances and total supply
        totalSupply = totalSupply.sub(amount);
        _balances[msg.sender] = _balances[msg.sender].sub(
            amount
        );

        // Calculate the withdraw tax
        uint256 tax = amount.mul(devFee).div(1000);

        // Transfer the tokens to user
        stakingToken.safeTransfer(msg.sender, amount - tax);
        // Tax to treasury
        stakingToken.safeTransfer(treasury, tax);
    }
}
