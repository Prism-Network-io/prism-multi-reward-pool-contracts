//SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "../libraries/ERC20.sol";

contract MockStaking is ERC20 {
    constructor(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        uint8 decimals
    ) ERC20(name, symbol) {
        _setupDecimals(decimals);
        _mint(msg.sender, totalSupply * (10**uint256(decimals)));
    }
}
