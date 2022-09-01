//SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "../libraries/ERC20.sol";

// 10% burn fee on transfer
contract MockStakingFee is ERC20 {
    constructor(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        uint8 decimals
    ) ERC20(name, symbol) {
        _setupDecimals(decimals);
        _mint(msg.sender, totalSupply * (10**uint256(decimals)));
    }

    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        address owner = _msgSender();
        uint256 burnPercent = 10;
        uint256 burnAmount = amount * burnPercent / 100;
        uint256 transferAmount = amount - burnAmount;
        _transfer(owner, to, transferAmount);
        _burn(msg.sender, burnAmount);
        return true;
    }
}