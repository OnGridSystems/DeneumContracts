pragma solidity ^0.4.18;

import "../PriceOracleInterface.sol";

/**
 * @title PriceOracleInterface Mock
 */
contract PriceOracleMock is PriceOracle {
    function PriceOracleMock(uint256 _price) public {
        priceUSDcETH = _price;
    }
}