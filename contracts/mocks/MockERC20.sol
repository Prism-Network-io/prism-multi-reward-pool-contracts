//SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(uint256 totalSupply, uint8 decimals)
        public
        ERC20("STK", "Some Token")
    {
        _setupDecimals(decimals);
        _mint(msg.sender, totalSupply * (10**uint256(decimals)));
    }
}
