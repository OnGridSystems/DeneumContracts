pragma solidity ^0.4.18;

import "../zeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "../zeppelin-solidity/contracts/math/SafeMath.sol";
import "./DeneumToken.sol";
import "./PriceOracleInterface.sol";

/**
 * @title Crowdsale
 * @dev Crowdsale is a base contract for managing a token crowdsale,
 * allowing investors to purchase tokens with ether. This contract implements
 * such functionality in its most fundamental form and can be extended to provide additional
 * functionality and/or custom behavior.
 * The external interface represents the basic interface for purchasing tokens, and conform
 * the base architecture for crowdsales. They are *not* intended to be modified / overriden.
 * The internal interface conforms the extensible and modifiable surface of crowdsales. Override 
 * the methods to add functionality. Consider using 'super' where appropiate to concatenate
 * behavior.
 */

contract DeneumCrowdsale {
  using SafeMath for uint256;

  // The token being sold
  DeneumToken public token;

  // ETH/USD price source
  PriceOracle public oracle;

  // Address where funds are collected
  address public wallet;

  // Amount of wei raised
  uint256 public weiRaised;

  /**
   * Event for token purchase logging
   * @param purchaser who paid for the tokens
   * @param beneficiary who got the tokens
   * @param value weis paid for purchase
   * @param amount amount of tokens purchased
   */
  event TokenPurchase(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);

  /**
   * @param _wallet Address where collected funds will be forwarded to
   * @param _token Address of the token being sold
   */
  function DeneumCrowdsale(address _wallet, DeneumToken _token, PriceOracle _oracle) public {
    require(_wallet != address(0));
    require(_token != address(0));
    wallet = _wallet;
    token = _token;
    oracle = _oracle;
  }

  /**
   * @dev fallback function ***DO NOT OVERRIDE***
   */
  function () external payable {
    uint256 rate = 1;
    uint256 weiAmount = msg.value;
    address beneficiary = msg.sender;
    require(rate > 0);
    require(beneficiary != address(0));
    require(weiAmount != 0);
    uint256 tokens = weiAmount.mul(rate);
    weiRaised = weiRaised.add(weiAmount);
    token.mint(beneficiary, tokens);
    TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);
    wallet.transfer(msg.value);
  }

  function getPriceUSDcETH() public view returns(uint256) {
    return oracle.priceUSDcETH();
  }
}
