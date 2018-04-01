import ether from './helpers/ether';
import EVMRevert from './helpers/EVMRevert';
import EVMThrow from './helpers/EVMThrow';

const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const Crowdsale = artifacts.require('DeneumCrowdsale');
const SimpleToken = artifacts.require('DeneumToken');
const PriceOracle = artifacts.require('PriceOracleMock');

contract('Crowdsale', function (accounts) {
  const wallet = accounts[1];
  const owner = accounts[0];
  const unprivileged = accounts[9];
  const value = ether(1);

  beforeEach(async function () {
    this.oracle = await PriceOracle.new(39000);
    this.token = await SimpleToken.new();
    this.crowdsale = await Crowdsale.new(wallet, this.token.address, this.oracle.address);
    await this.token.addMinter(this.crowdsale.address);
    await this.crowdsale.addPhase(1520000000, 1520001000, 9999999999999999999999, 999999999);
    await this.crowdsale.addPhase(1520001001, 1520002000, 8999999999999999999999, 999999999);
    await this.crowdsale.addPhase(1520002001, 1520003000, 7999999999999999999999, 999999999);
    await this.crowdsale.addPhase(1520009001, 1520009999, 8999999999999999999999, 999999999);
    await this.crowdsale.addPhase(1530000001, 1539999999, 899999999999999999999999, 999999999);
  });

  describe('check getters', function () {
    it('should return token', async function () {
      const tkn = await this.crowdsale.token();
      tkn.should.be.equal(this.token.address);
    });
    it('should return wallet', async function () {
      const wlt = await this.crowdsale.wallet();
      wlt.should.be.equal(wallet);
    });
    describe('read oracle service getter', function () {
      it('should return oracle', async function () {
        const ocl = await this.crowdsale.oracle();
        ocl.should.be.equal(this.oracle.address);
      });
      it('should return ETH/USD price', async function () {
        const price = await this.crowdsale.getPriceUSDcETH();
        price.should.be.bignumber.equal(39000);
      });
    });
    describe('read phase getter', function () {
      it('should return phase values by existing phase', async function () {
        const phase = await this.crowdsale.phases(4).should.be.fulfilled;
        phase[0].should.be.bignumber.equal(1530000001);
        phase[1].should.be.bignumber.equal(1539999999);
      });
      it('should throw on incorrect phase value', async function () {
        const phase = await this.crowdsale.phases(5).should.be.rejectedWith(EVMThrow);
      });
    });
  });

  describe('Check privileges', function () {
    it('unprivileged account unable to change oracle', async function () {
      await this.crowdsale.setOracle(this.oracle.address, { from: unprivileged }).should.be.rejectedWith(EVMRevert);
      const price = await this.crowdsale.getPriceUSDcETH();
      price.should.be.bignumber.equal(39000);
    });
    it('unprivileged account unable to set wallet', async function () {
      await this.crowdsale.setWallet(unprivileged, { from: unprivileged }).should.be.rejectedWith(EVMRevert);
      const retVal = await this.crowdsale.wallet();
      retVal.should.be.bignumber.equal(wallet);
    });
    it('owner able to change oracle', async function () {
      const newOracle = await PriceOracle.new(678);
      await this.crowdsale.setOracle(newOracle.address).should.be.fulfilled;
      const price = await this.crowdsale.getPriceUSDcETH();
      price.should.be.bignumber.equal(678);
    });
    it('owner able to set wallet', async function () {
      await this.crowdsale.setWallet(accounts[6]).should.be.fulfilled;
      const retVal = await this.crowdsale.wallet();
      retVal.should.be.equal(accounts[6]);
    });
    describe('after adding admin privileges', function () {
      beforeEach(async function () {
        await this.crowdsale.adminAddRole(unprivileged, 'admin');
      });
      it('unprivileged account able to change oracle', async function () {
        const newOracle = await PriceOracle.new(987);
        const { logs } = await this.crowdsale.setOracle(newOracle.address, { from: unprivileged }).should.be.fulfilled;
        assert.equal(logs.length, 1);
        assert.equal(logs[0].event, 'OracleChanged');
        assert.equal(logs[0].args.newOracle, newOracle.address);
        const price = await this.crowdsale.getPriceUSDcETH();
        price.should.be.bignumber.equal(987);
      });
      it('unprivileged account able to set wallet', async function () {
        const { logs } = await this.crowdsale.setWallet(unprivileged, { from: unprivileged }).should.be.fulfilled;
        assert.equal(logs.length, 1);
        assert.equal(logs[0].event, 'WalletChanged');
        assert.equal(logs[0].args.newWallet, unprivileged);
        const retVal = await this.crowdsale.wallet();
        retVal.should.be.equal(unprivileged);
      });
    });
  });

  describe('when running crowdsale', function () {
    beforeEach(async function () {
      await this.crowdsale.addPhase(1520030000, 1530000000, 295, 45000000);
    });
    it('should return phase values by current phase 5', async function () {
      const phase = await this.crowdsale.phases(5).should.be.fulfilled;
      phase[0].should.be.bignumber.equal(1520030000);
      phase[1].should.be.bignumber.equal(1530000000);
      phase[2].should.be.bignumber.equal(295);
      phase[4].should.be.bignumber.equal(45000000);
    });
    it('token should be never minted', async function () {
      const tkn = await this.token.totalSupply();
      tkn.should.be.bignumber.equal(0);
    });
    describe('send ethers to the crowdsale', function () {
      it('receiving wallet increased and log is ok', async function () {
        var pre = await web3.eth.getBalance(wallet);
        const { logs } = await this.crowdsale.send(ether(1)).should.be.fulfilled;
        assert.equal(logs.length, 1);
        assert.equal(logs[0].event, 'TokenPurchase');
        assert.equal(logs[0].args.purchaser, owner);
        assert.equal(logs[0].args.beneficiary, owner);
        assert.equal(logs[0].args.value, 1000000000000000000);
        assert.equal(logs[0].args.amount, 13220);
        var post = await web3.eth.getBalance(wallet);
        (post - pre).should.be.bignumber.equal(ether(1));
      });
      it('purchase changes token\'s totalSupply', async function () {
        const pre = await this.token.totalSupply().should.be.fulfilled;
        await this.crowdsale.send(ether(1)).should.be.fulfilled;
        const post = await this.token.totalSupply().should.be.fulfilled;
        (post - pre).should.be.bignumber.equal(13220);
      });
      it('purchase changes purchaser\'s token balance', async function () {
        const pre = await this.token.balanceOf(accounts[8]).should.be.fulfilled;
        await this.crowdsale.sendTransaction({ value: ether(1), from: accounts[8] }).should.be.fulfilled;
        const post = await this.token.balanceOf(accounts[8]).should.be.fulfilled;
        (post - pre).should.be.bignumber.equal(13220);
      });
      it('purchase changes crowdsale tokensIssued counter', async function () {
        const pre = await this.crowdsale.tokensIssued().should.be.fulfilled;
        await this.crowdsale.sendTransaction({ value: ether(1), from: accounts[4] }).should.be.fulfilled;
        const post = await this.crowdsale.tokensIssued().should.be.fulfilled;
        (post - pre).should.be.bignumber.equal(13220);
      });
      it('purchase changes phase tokensIssued counter', async function () {
        const curPhaseIndex = await this.crowdsale.getCurrentPhaseIndex().should.be.fulfilled;
        const pre = await this.crowdsale.phases(curPhaseIndex).should.be.fulfilled;
        await this.crowdsale.sendTransaction({ value: ether(1), from: accounts[4] }).should.be.fulfilled;
        const post = await this.crowdsale.phases(curPhaseIndex).should.be.fulfilled;
        (post[3] - pre[3]).should.be.bignumber.equal(13220);
      });
      it('purchase changes weiRaised counter', async function () {
        const pre = await this.crowdsale.weiRaised().should.be.fulfilled;
        await this.crowdsale.sendTransaction({ value: ether(1), from: accounts[4] }).should.be.fulfilled;
        const post = await this.crowdsale.weiRaised().should.be.fulfilled;
        (post - pre).should.be.bignumber.equal(ether(1));
      });
    });
  });
  describe('decrease phaseCap', function () {
    beforeEach(async function () {
      await this.crowdsale.addPhase(1520030000, 1530000000, 295, 13000);
    });
    it('tx should revert if over phaseCap', async function () {
      var pre = await web3.eth.getBalance(wallet);
      await this.crowdsale.send(ether(1)).should.be.rejectedWith(EVMRevert);
      var post = await web3.eth.getBalance(wallet);
      (post - pre).should.be.bignumber.equal(0);
    });
  });
});
