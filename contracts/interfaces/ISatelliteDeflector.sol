//SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

interface ISatelliteDeflector {
  function syncPriorMints(address[] memory _users, uint256[] memory _values, uint256 _lastSync) external;
  function lastSync() external view returns (uint256);
}
