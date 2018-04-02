# Deneum Token and Crowdsale (ICO) contracts
[![Build Status](https://travis-ci.org/OnGridSystems/DeneumContracts.svg?branch=master)](https://travis-ci.org/OnGridSystems/DeneumContracts)

Denim Ethereum contracts suite consists of
* Deneum token (DNM) - the coin supposed to be the main digital asset in Deneum application;
* Crowdsale contract - emits DNMs to investors during Private sale, pre-ICO and ICO phases. 

## Token contract
DNM is [ERC-20](https://github.com/ethereum/EIPs/issues/20) standard token with the following paramaters:

- Name: **Deneum**
- Symbol: **DNM**
- Decimals: **2**
- Mintable: **Yes**, Special role for minting, Finalizeable
- Burnable: **Yes**, owner can burn its tokens 
- RBAC: **Yes**, Minters (mint), Owners (add minters)
- Source Code: **[DeneumToken.sol](contracts/DeneumToken.sol)**
- Mainnet address: **[0x2896A4BBd70712bb3aAd89eb65B5F6393768707C](https://etherscan.io/address/0x2896a4bbd70712bb3aad89eb65b5f6393768707c)**

## Crowdsale contract

- Source code: **[DeneumCrowdsale.sol](contracts/LongevityCrowdsale.sol)**
- Mainnet address: **[0x28ed4e3751e12dc10aae6c4e40be1a3dad989483](https://etherscan.io/address/0x28ed4e3751e12dc10aae6c4e40be1a3dad989483)**

Contract-crowdsale for Deneum project. It receives ethers and sends back corresponding amount of DNM tokens. 
Token price depends on the current phase (see the schedule).
The crowdsale contract contains a list of phases, each phase has a start time, end time and token price in USD cents.  
**minPurchaseUSDc** is the minimal amount of purchase in USD cents. 
If current time doesn't match any phase or transferred value less than minPurchaseUSDc the operation is thrown (reverted).

### Crowdsale schedule (preliminary)

| Phase | Ph.Name  | Start date (UTC)    | Start Unix | End date (UTC)      | End Unix   | Price, USD |  Cap, DNM  |  Cap, USD  | 
| ----- | -------- | ------------------- | ---------- | ------------------- | ---------- | ---------- | ---------- | ---------- |
| 0     | Private  | 2018-04-02 07:30:15 | 1522654215 | 2018-05-25 14:00:00 | 1527256800 |    2.95    |    450,000 |  1,327,500 |
| 1     | Pre-ICO  | not configured yet  | not config | not configured yet  | not config |    5.65    |    900,000 |  5,085,000 |
| 2     | ICO      | not configured yet  | not config | not configured yet  | not config |    8.90    | 10,000,000 | 89,000,000 |

### Crowdsale schedule modification

The internal phases schedule can be changed at any time by the owner with the following methods:
```
addPhase(_startDate, _endDate, _priceUSDcDNM, _tokensCap)
delPhase(index)
```
## Price oracle
**TBD: to use external price source**
In-contract ETH price is kept up to date by external Oracle contract containing current ETH price. 
Contract owner can change price source at any time with
```
setOracle(oracle)
```

## Wallets

All the funds received from the investors are forwarded to securely stored wallet (Externally Owned Account) 
to avoid any on-chain risks. Wallet can be changed at any point of time by the owner. 
```
Crowdsale.wallet()
Crowdsale.setWallet(address)
```

## Getting started
### Get the source code
Clone the contracts repository with submodules (we use zeppelin-solidity libraries)
```
git clone --recurse-submodules git@github.com:OnGridSystems/DeneumContracts.git
```

### Test it
To be sure in code quality and compatibility we use truffle framowork for testing our code:

#### Run truffle tests
- Install [truffle framework](http://truffleframework.com) on your host. It will install solc-js compiler automatically.
- Run ```testrpc``` in one console and leave it open.
- Start the new console and type ```truffle test```.

### Deploy on the net

- Flatten your solidity code
The simplest way to move your code to the IDE and other tools is to make it flat (opposed to hierarchically organized files)
Install truffle-flattener via npm
```npm install -g truffle-flattener```
and flatten your crowdsale contract to a single code snippet, copy it
```truffle-flattener contracts/LongevityCrowdsale.sol```
You can use [Remix IDE](http://remix.ethereum.org) for deployment on the net. 

- Deploy **Token** contract, you should get an address of deployed contract (*Token*)
```
deploy(Token)
```
- As Tx get mined go to the etherscan and do **Token**'s source code verification
- Deploy **Crowdsale** contract
```
deploy Crowdsale(wallet, Token, oracle)
```
where wallet is external address to receive depisited ethers, token is the token contract deployed on previous step
and oracle is external oracle service.

- Add/Del Phases
```
addPhase(_startDate, _endDate, _priceUSDcDNM, _tokensCap)
delPhase(index)
```
- Add Crowdsale contract to the minters of the token
```
Token.addMinter(Crowdsale.address)
```
### Post-Deploy steps
- Good practice is to verify Source Code on the etherscan. Do it for both Crowdsale and Token.
- Publish your Crowdsale contract for investors. 

### After crowdsale end
After the last phase ends you can disconnect Crowdsale from the token (remove minting privileges given before).
```
Token.delMinter(Crowdsale.address)
```

### Post-ICO state
* the token is still mintable. To continue minting you should add new minter.

## Authors
* OnGrid Systems: [Site](https://ongrid.pro), [GitHub](https://github.com/OnGridSystems/)