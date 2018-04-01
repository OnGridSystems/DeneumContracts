pragma solidity ^0.4.18;

import "../zeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "../zeppelin-solidity/contracts/math/SafeMath.sol";
import "../zeppelin-solidity/contracts/ownership/rbac/RBAC.sol";
import "./DeneumToken.sol";
import "./PriceOracleInterface.sol";

/**
 * @title Crowdsale Contract
 * @author Kirill Varlamov (@ongrid), OnGrid systems
 * @dev Crowdsale is a contract for managing a token crowdsale,
 * allowing investors to purchase tokens with ether.
 */
contract DeneumCrowdsale is RBAC {
    using SafeMath for uint256;

    struct Phase {
        uint256 startDate;
        uint256 endDate;
        uint256 priceUSDcDNM;
        uint256 tokensIssued;
        uint256 tokensCap; // the maximum amount of tokens allowed to be sold on the phase
    }
    Phase[] public phases;

    // The token being sold
    DeneumToken public token;

    // ETH/USD price source
    PriceOracle public oracle;

    // Address where funds get collected
    address public wallet;

    // Amount of ETH raised in wei. 1 wei is 10e-18 ETH
    uint256 public weiRaised;

    // Amount of tokens issued by this contract
    uint256 public tokensIssued;

    /**
     * Event for token purchase logging
     * @param purchaser who paid for the tokens
     * @param beneficiary who got the tokens
     * @param value weis paid for purchase
     * @param amount amount of tokens purchased
     */
    event TokenPurchase(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);

    /**
     * @dev Events for contract states changes
     */
    event PhaseAdded(address indexed sender, uint256 index, uint256 startDate, uint256 endDate, uint256 priceUSDcDNM, uint256 tokensCap);
    event PhaseDeleted(address indexed sender, uint256 index);
    event WalletChanged(address newWallet);
    event OracleChanged(address newOracle);

    /**
     * @param _wallet Address where collected funds will be forwarded to
     * @param _token  Address of the token being sold
     * @param _oracle ETH price oracle where we get actual exchange rate
     */
    function DeneumCrowdsale(address _wallet, DeneumToken _token, PriceOracle _oracle) RBAC() public {
        require(_wallet != address(0));
        require(_token != address(0));
        wallet = _wallet;
        token = _token;
        oracle = _oracle;
    }

    /**
     * @dev fallback function receiving investor's ethers
     *      It calculates deposit USD value and corresponding token amount,
     *      runs some checks (if phase cap not exceeded, value and addresses are not null),
     *      then mints corresponding amount of tokens, increments state variables.
     *      After tokens issued Ethers get transferred to the wallet.
     */
    function () external payable {
        uint256 priceUSDcETH = getPriceUSDcETH();
        uint256 weiAmount = msg.value;
        address beneficiary = msg.sender;
        uint256 currentPhaseIndex = getCurrentPhaseIndex();
        uint256 valueUSDc = weiAmount.mul(priceUSDcETH).div(1 ether);
        uint256 tokens = valueUSDc.mul(100).div(phases[currentPhaseIndex].priceUSDcDNM);
        require(beneficiary != address(0));
        require(weiAmount != 0);
        require(phases[currentPhaseIndex].tokensIssued.add(tokens) < phases[currentPhaseIndex].tokensCap);
        weiRaised = weiRaised.add(weiAmount);
        phases[currentPhaseIndex].tokensIssued = phases[currentPhaseIndex].tokensIssued.add(tokens);
        tokensIssued = tokensIssued.add(tokens);
        token.mint(beneficiary, tokens);
        wallet.transfer(msg.value);
        TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);
    }

    /**
     * @dev Proxies current ETH balance request to the Oracle contract
     * @return ETH price in USD cents
     */
    function getPriceUSDcETH() public view returns(uint256) {
        require(oracle.priceUSDcETH() > 0);
        return oracle.priceUSDcETH();
    }

    /**
     * @dev Allows to change Oracle address (source of ETH price)
     * @param _oracle ETH price oracle where we get actual exchange rate
     */
    function setOracle(PriceOracle _oracle) public onlyAdmin {
        require(oracle.priceUSDcETH() > 0);
        oracle = _oracle;
        OracleChanged(oracle);
    }

    /**
     * @dev Checks if dates overlap with existing phases of the contract.
     * @param _startDate  Start date of the phase
     * @param _endDate    End date of the phase
     * @return true if provided dates valid
     */
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

    /**
     * @dev Adds a new phase
     * @param _startDate  Start date of the phase
     * @param _endDate    End date of the phase
     * @param _priceUSDcDNM  Price USD cents per token
     * @param _tokensCap     Maximum allowed emission at the phase
     */
    function addPhase(uint256 _startDate, uint256 _endDate, uint256 _priceUSDcDNM, uint256 _tokensCap) public onlyAdmin {
        require(validatePhaseDates(_startDate, _endDate));
        require(_priceUSDcDNM > 0);
        require(_tokensCap > 0);
        phases.push(Phase(_startDate, _endDate, _priceUSDcDNM, 0, _tokensCap));
        uint256 index = phases.length - 1;
        PhaseAdded(msg.sender, index, _startDate, _endDate, _priceUSDcDNM, _tokensCap);
    }

    /**
     * @dev Delete phase by its index
     * @param index Index of the phase
     */
    function delPhase(uint256 index) public onlyAdmin {
        if (index >= phases.length) return;

        for (uint i = index; i<phases.length-1; i++){
            phases[i] = phases[i+1];
        }
        phases.length--;
        PhaseDeleted(msg.sender, index);
    }

    /**
     * @dev Return current phase index
     * @return current phase id
     */
    function getCurrentPhaseIndex() view public returns (uint256) {
        for (uint i = 0; i < phases.length; i++) {
            if (phases[i].startDate <= now && now <= phases[i].endDate) {
                return i;
            }
        }
        revert();
    }

    /**
     * @dev Set new wallet to collect ethers
     * @param _newWallet EOA or the contract adderess of the new receiver
     */
    function setWallet(address _newWallet) onlyAdmin public {
        require(_newWallet != address(0));
        wallet = _newWallet;
        WalletChanged(_newWallet);
    }
}
