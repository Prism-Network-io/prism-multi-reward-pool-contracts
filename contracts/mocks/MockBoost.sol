//SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockBoost is ERC20 {
    constructor(string memory name, string memory symbol, uint256 totalSupply, uint8 decimals) public ERC20(name, symbol) {
        _setupDecimals(decimals);
        _mint(msg.sender, totalSupply * (10 ** uint256(decimals)));
    }
}
