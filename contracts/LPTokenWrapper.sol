//SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

abstract contract LPTokenWrapper is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IERC20 public immutable prism;
    IERC20 public immutable stakingToken;
    uint256 public immutable devFee;

    // Returns the total staked tokens within the contract
    uint256 public totalSupply;
    uint256 public boostedTotalSupply;
    uint256 public startTime;
    uint256 public burnFee;

    // Variables for determing the reduction of unstaking fees based on holding PRISM
    uint256 public unstakeFeeReduceLvl1Amount;
    uint256 public unstakeFeeReduceLvl2Amount;
    uint256 public unstakeFeeReduceLvl3Amount;
    uint256 public unstakeFeeReduceLvl1Discount;
    uint256 public unstakeFeeReduceLvl2Discount;
    uint256 public unstakeFeeReduceLvl3Discount;
    
    struct Balance {
        uint256 balance;
        uint256 boostedBalance;
    }

    address public treasury;

    mapping(address => Balance) internal _balances;

    constructor(
        uint256 _devFee,
        address _stakingToken,
        address _treasury,
        uint256 _burnFee,
        address _prism
    ) public {
        devFee = _devFee;
        stakingToken = IERC20(_stakingToken);
        treasury = _treasury;
        burnFee = _burnFee;
        prism = IERC20(_prism);

        unstakeFeeReduceLvl1Amount = 25000000000000000000;
        unstakeFeeReduceLvl2Amount = 50000000000000000000;
        unstakeFeeReduceLvl3Amount = 100000000000000000000;
        unstakeFeeReduceLvl1Discount = 25;
        unstakeFeeReduceLvl2Discount = 50;
        unstakeFeeReduceLvl3Discount = 100;
    }

    // Returns staking balance of the account
    function balanceOf(address account) public view returns (uint256) {
        return _balances[account].balance;
    }

    // Returns boosted balance of the account
    function boostedBalanceOf(address account) public view returns (uint256) {
        return _balances[account].boostedBalance;
    }

    // Stake funds into the pool
    function stake(uint256 amount) public virtual {
        
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        if (burnFee > 0 ) {
            uint tokenBurnBalance = amount.mul(burnFee).div(10000);
            uint stakedBalance = amount.sub(tokenBurnBalance);
            _balances[msg.sender].balance = _balances[msg.sender].balance.add(
            stakedBalance
           );
            totalSupply = totalSupply.add(stakedBalance);
            return;
        }
         // Increment sender's balances and total supply
        _balances[msg.sender].balance = _balances[msg.sender].balance.add(
            amount
        );
        totalSupply = totalSupply.add(amount);
    }

    // Subtract balances withdrawn from the user
    function withdraw(uint256 amount, address user) public virtual {
        totalSupply = totalSupply.sub(amount);
        _balances[msg.sender].balance = _balances[msg.sender].balance.sub(
            amount
        );

        // Calculate the withdraw tax (it's 1.5% of the amount)
        uint256 tax = amount.mul(devFee).div(1000);

        // Apply any Fee Reduction from holding PRISM
        uint256 userFeeReduceLvlDiscount;
        uint256 prismBalance = prism.balanceOf(user);

        if (prismBalance < unstakeFeeReduceLvl1Amount) {
            userFeeReduceLvlDiscount = 0;
        } else if (prismBalance >= unstakeFeeReduceLvl1Amount && prismBalance < unstakeFeeReduceLvl2Amount) {
            userFeeReduceLvlDiscount = unstakeFeeReduceLvl1Discount;
        } else if (prismBalance >= unstakeFeeReduceLvl2Amount && prismBalance < unstakeFeeReduceLvl3Amount) {
            userFeeReduceLvlDiscount = unstakeFeeReduceLvl2Discount;
        } else if (prismBalance >= unstakeFeeReduceLvl3Amount) {
            userFeeReduceLvlDiscount = unstakeFeeReduceLvl3Discount;
        }
        

        // Calculate fee reductions if applicable for users holding PRISM
        uint256 userDiscount = 100.sub(userFeeReduceLvlDiscount);
        uint256 feeReducedTax = tax.div(100).mul(userDiscount);

        // Transfer the tokens to user
        stakingToken.safeTransfer(msg.sender, amount.sub(feeReducedTax));
        // Tax to treasury
        stakingToken.safeTransfer(treasury, feeReducedTax);
    }

    // Edits the values for the Fee Reduction on unstaking for holding PRISM
    function editFeeReduceVariables(uint256 _unstakeFeeReduceLvl1Amount, uint256 _unstakeFeeReduceLvl2Amount,
    uint256 _unstakeFeeReduceLvl3Amount, uint256 _unstakeFeeReduceLvl1Discount,
    uint256 _unstakeFeeReduceLvl2Discount, uint256 _unstakeFeeReduceLvl3Discount
    ) external onlyOwner() {

        require(
            _unstakeFeeReduceLvl1Amount > 0 &&
            _unstakeFeeReduceLvl2Amount > 0 &&
            _unstakeFeeReduceLvl3Amount > 0 &&
            _unstakeFeeReduceLvl1Discount > 0 &&
            _unstakeFeeReduceLvl2Discount > 0 &&
            _unstakeFeeReduceLvl3Discount > 0, "Value must be greater than 0"
        );

        unstakeFeeReduceLvl1Amount = _unstakeFeeReduceLvl1Amount;
        unstakeFeeReduceLvl2Amount = _unstakeFeeReduceLvl2Amount;
        unstakeFeeReduceLvl3Amount = _unstakeFeeReduceLvl3Amount;
        unstakeFeeReduceLvl1Discount = _unstakeFeeReduceLvl1Discount;
        unstakeFeeReduceLvl2Discount = _unstakeFeeReduceLvl2Discount;
        unstakeFeeReduceLvl3Discount = _unstakeFeeReduceLvl3Discount;
    }
}
