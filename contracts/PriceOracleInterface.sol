pragma solidity ^0.4.18;

import "../zeppelin-solidity/contracts/math/SafeMath.sol";

/**
 * @title PriceOracle interface
 * @dev Price oracle is a contract representing actual average ETH/USD price in the
 * Ethereum blockchain fo use by other contracts.
 */
contract PriceOracle {
    // USD cents per ETH exchange price
    uint256 public priceUSDcETH;
}