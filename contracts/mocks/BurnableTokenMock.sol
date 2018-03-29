pragma solidity ^0.4.18;

import "../DeneumToken.sol";


contract BurnableTokenMock is DeneumToken {

  function BurnableTokenMock(address initialAccount, uint initialBalance) public {
    balances[initialAccount] = initialBalance;
    totalSupply_ = initialBalance;
  }

}
