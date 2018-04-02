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

### Crowdsale schedule

| Phase | Ph.Name  | Start date (UTC)    | Start Unix | End date (UTC)      | End Unix   | Price, USD |  Cap, DNM  |  Cap, USD  | 
| ----- | -------- | ------------------- | ---------- | ------------------- | ---------- | ---------- | ---------- | ---------- |
| 0     | Private  | 0000-00-00 00:00:00 | 0000000000 | 0000-00-00 00:00:00 | 0000000000 |    2.95    |    450,000 |  1,327,500 |
| 1     | Pre-ICO  | 0000-00-00 00:00:00 | 0000000000 | 0000-00-00 00:00:00 | 0000000000 |    5.65    |    900,000 |  5,085,000 |
| 2     | ICO      | 0000-00-00 00:00:00 | 0000000000 | 0000-00-00 00:00:00 | 0000000000 |    8.90    | 10,000,000 | 89,000,000 |

### Crowdsale schedule modification

The internal phases schedule can be changed at any time by the owner with the following methods:
```
setTotalPhases(uint value)
setPhase(uint index, uint256 _startTime, uint256 _endTime, uint256 _discountPercent)
delPhase(uint index)
```
## Price oracle
**TBD: to use external price source**
In-contract ETH price is kept up to date by external entity Oracle polling the exchanges. Oracle runs as an external off-chain script
under the low-privileged 'Bot' account. A list of such oracle bots can be changed by the owner with the methods:
```
addBot(address _address)
delBot(address _address)
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
To be sure in code quality and compatibility we use BOTH framoworks for testing our code:
* truffle - popular JS-based DApps framework. Uses solc-js compiler and mocha;
* populus - python-based ethereum framework. Uses solc compiler and pytest.

#### Run truffle tests
- Install [truffle framework](http://truffleframework.com) on your host. It will install solc-js compiler automatically.
- Run ```truffle develop``` in one console, its command prompt > will appear. Leave it open.
- Start the new console and type ```truffle deploy --reset```.
- After migration run ```truffle test --reset``` and see the progress.

#### Run populus tests
- Install latest python3 (in this example we use python3.6).
- Create python virtual environment, activate and install requirements
```
virtualenv --python=python3.6 .
source bin/activate
pip install -r requirements.txt
```
- There is annoying solc option 'allow_paths' denying access to project sources. Patch solc wrapper to mute it.
```
./solc_wrapper_patch.sh
```
- run tests and enjoy
```
py.test test/
```
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
- Set mint tap to reasonable initial amount of tokens per second
```
Token.setMintTap(10000) //100 tokens/s
```
- Deploy **Crowdsale** contract, use the **Token** address and current ETH price in USD cents as arguments
```
deploy(Crowdsale, Token.address, 12345)
```
- By default Crowdsale contract has a single wallet receiving collected ethers - the address who deployed the contract.
You can add/delete receiving wallets manually.
```
Crowdsale.getWalletsCount()
Crowdsale.wallets(0)
Crowdsale.addWallet(walletAddress)
Crowdsale.wallets(1)
Crowdsale.delWallet(0)
```
- Add Oracle bot account to do regular price updates
```
Crowdsale.addBot(botAddress)
```
- Add Cashier account for non-Ethereum payments
```
Crowdsale.addCashier(cashierAddress)
```
- Add Phases
```
Crowdsale.setTotalPhases(5)
// Args are: index, startDate, stopDate, discount%
Crowdsale.setPhase(0, 1522195200, 1523750399, 40)
Crowdsale.setPhase(1, 1523750400, 1525132799, 30)
Crowdsale.setPhase(2, 1525132800, 1527811199, 25)
Crowdsale.setPhase(3, 1527811200, 1529539199, 20)
Crowdsale.setPhase(4, 1530403200, 1533081599, 0)
```
- Add Crowdsale contract to the minters list of the token
```
Token.addMinter(Crowdsale.address)
```
### Post-Deploy steps
- Good practice is to verify Source Code on the etherscan. Do it for both Crowdsale and Token.
- Publish your Crowdsale contract for investors. Make a notice on dates, discounts and minimal contributon.

### Crowdsale housekeeping
- keep contract ETH price up do date (the external Oracle script does it perfectly!). Only account in bots list allowed to do this.
```
Crowdsale.setRate(12345) // ETH price in USD cents
```
- receive non-Ethereum deposits and mint corresponding amount of tokens. Only cashier account.
```
// receive 100 USD and issue 14000.00 tokens
Crowdsale.offChainPurchase(beneficiaryAccount, 1400000, 10000) 
```
### After crowdsale end
After the last phase ends you can disconnect Crowdsale from the token (remove minting privileges given before).
```
Token.delMinter(Crowdsale.address)
```

### Post-ICO state
* the token is still mintable. To continue minting you should add new minter.

## Authors
* OnGrid Systems: [Site](https://ongrid.pro), [GitHub](https://github.com/OnGridSystems/)