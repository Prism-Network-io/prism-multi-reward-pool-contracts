//SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

abstract contract LPTokenWrapper is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IERC20 public immutable stakingToken;
    uint256 public immutable devFee;

    // Returns the total staked tokens within the contract
    uint256 public totalSupply;
    uint256 public tokenFee;

    struct Balance {
        uint256 balance;
    }

    address public treasury;    // The address to receive devFee

    mapping(address => Balance) internal _balances;

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

    // Returns staking balance of the account
    function balanceOf(address account) public view returns (uint256) {
        return _balances[account].balance;
    }

    // Stake funds into the pool
    function stake(uint256 amount) public virtual {
        // Transfer staking token from caller to contract
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        // Increment sender's balances and total supply
        if (tokenFee > 0) {
            uint256 tokenFeeBalance = amount.mul(tokenFee).div(10000);
            uint256 stakedBalance = amount.sub(tokenFeeBalance);
            _balances[msg.sender].balance = _balances[msg.sender].balance.add(
                stakedBalance
            );
            totalSupply = totalSupply.add(stakedBalance);
            return;
        } else {
        _balances[msg.sender].balance = _balances[msg.sender].balance.add(
            amount
        );
        }

    }

    // Subtract balances withdrawn from the user
    function withdraw(uint256 amount) public virtual {
        // Reduce sender's balances and total supply
        totalSupply = totalSupply.sub(amount);
        _balances[msg.sender].balance = _balances[msg.sender].balance.sub(
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
