//SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ISatelliteDeflector.sol";

contract AnswerCollector is Ownable {

  ISatelliteDeflector public deflector;

  mapping(address => bool) public allowedOperator;

  event DeflectorSet(address indexed deflector);
  event OperatorSet(address indexed operator, bool access);
  event SyncPriorMints(address[] users, uint256[] values, uint256 lastSync);

  constructor(
      ISatelliteDeflector _deflector
  )
      public
      Ownable()
  {
      setDeflector(_deflector);
  }

  function setDeflector(
      ISatelliteDeflector _deflector
  )
      public
      onlyOwner()
  {
      require(address(_deflector) != address(0), "Invalid deflector");
      deflector = _deflector;
      emit DeflectorSet(address(_deflector));
  }

  function setOperator(
      address _operator,
      bool _access
  )
      external
      onlyOwner()
  {
      allowedOperator[_operator] = _access;
      emit OperatorSet(_operator, _access);
  }

  function write(
      address[] memory _users,
      uint256[] memory _values,
      uint256 _lastSync
  )
      external
      onlyOperator()
  {
      if (_lastSync > deflector.lastSync()) {
          deflector.syncPriorMints(_users, _values, _lastSync);
          emit SyncPriorMints(_users, _values, _lastSync);
      }
  }

  modifier onlyOperator() {
      require(allowedOperator[msg.sender], "Not allowed operator");
      _;
  }
}