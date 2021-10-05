// SPDX-License-Identifier: Unlicense

pragma solidity >=0.6.0 <0.8.0;

import "./ERC20MintSnapshot.sol";

// Code Based on Compound's Comp.sol: https://github.com/compound-finance/compound-protocol/blob/master/contracts/Governance/Comp.sol

contract MockPRISM is ERC20MintSnapshot {
    constructor() ERC20MintSnapshot("PRISM Token Test", "PRISM") public {
    }

    function mint(uint256 amount) external {
        _mint(msg.sender, amount);
    }
}