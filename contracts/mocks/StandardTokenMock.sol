pragma solidity ^0.4.18;

import "../DeneumToken.sol";

// mock class using StandardToken
contract StandardTokenMock is DeneumToken {

  function StandardTokenMock(address initialAccount, uint256 initialBalance) public {
    balances[initialAccount] = initialBalance;
    totalSupply_ = initialBalance;
  }

}
