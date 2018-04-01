pragma solidity ^0.4.18;

import "../zeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "../zeppelin-solidity/contracts/math/SafeMath.sol";
import "../zeppelin-solidity/contracts/ownership/rbac/RBAC.sol";
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

contract DeneumCrowdsale is RBAC {
    using SafeMath for uint256;

    struct Phase {
        uint256 startDate;
        uint256 endDate;
        uint256 priceUSDcDNM;
        uint256 cap; // the maximum amount of tokens allowed to be sold on the phase
    }
    Phase[] public phases;

    mapping (address => bool) owners;

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
    event PhaseAdded(address indexed sender, uint256 index, uint256 startDate, uint256 endDate, uint256 priceUSDcDNM, uint256 cap);
    event PhaseDeleted(address indexed sender, uint256 index);


    /**
     * @param _wallet Address where collected funds will be forwarded to
     * @param _token Address of the token being sold
     */
    function DeneumCrowdsale(address _wallet, DeneumToken _token, PriceOracle _oracle) RBAC() public {
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
        uint256 priceUSDcETH = oracle.priceUSDcETH();
        uint256 weiAmount = msg.value;
        address beneficiary = msg.sender;
        require(priceUSDcETH > 0);
        require(beneficiary != address(0));
        require(weiAmount != 0);
        uint256 tokens = weiAmount.mul(priceUSDcETH);
        weiRaised = weiRaised.add(weiAmount);
        token.mint(beneficiary, tokens);
        TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);
        wallet.transfer(msg.value);
    }

    function getPriceUSDcETH() public view returns(uint256) {
        return oracle.priceUSDcETH();
    }

    function setOracle(PriceOracle _oracle) public onlyAdmin {
        require(oracle.priceUSDcETH() > 0);
        oracle = _oracle;
    }

    function validatePhaseDates(uint256 _startDate, uint256 _endDate) view public returns (bool) {
        if (_endDate <= _startDate) {
            return false;
        }
        for (uint i = 0; i < phases.length; i++) {
            if (_startDate >= phases[i].startDate && _startDate <= phases[i].endDate) {
                return false;
            }
            if (_endDate >= phases[i].startDate && _endDate <= phases[i].endDate) {
                return false;
            }
        }
        return true;
    }

    function addPhase (uint256 _startDate, uint256 _endDate, uint256 _priceUSDcDNM, uint256 _cap) public onlyAdmin {
        require(validatePhaseDates(_startDate, _endDate));
        require(_priceUSDcDNM > 0);
        require(_cap > 0);
        phases.push(Phase(_startDate, _endDate, _priceUSDcDNM, _cap));
        uint256 index = phases.length - 1;
        PhaseAdded(msg.sender, index, _startDate, _endDate, _priceUSDcDNM, _cap);
    }

    function delPhase(uint256 index) public onlyAdmin {
        if (index >= phases.length) return;

        for (uint i = index; i<phases.length-1; i++){
            phases[i] = phases[i+1];
        }
        phases.length--;
        PhaseDeleted(msg.sender, index);
    }

    // Return current phase cap and price (in USDcents per DNM)
    function getCurentPhase() view public returns (uint256, uint256) {
        for (uint i = 0; i < phases.length; i++) {
            if (phases[i].startDate <= now && now <= phases[i].endDate) {
                require (phases[i].priceUSDcDNM > 0);
                return (phases[i].priceUSDcDNM, phases[i].cap);
            }
        }
        revert();
    }

}
