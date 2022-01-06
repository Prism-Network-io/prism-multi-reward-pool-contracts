// SPDX-License-Identifier: Unlicense

pragma solidity 0.6.12;

interface IERC20MintSnapshot {
    function getPriorMints(address account, uint256 blockNumber) external view returns (uint224);
}