import ether from './helpers/ether';
import EVMRevert from './helpers/EVMRevert';

const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const Crowdsale = artifacts.require('DeneumCrowdsale');
const SimpleToken = artifacts.require('DeneumToken');
const PriceOracle = artifacts.require('PriceOracleMock');

contract('Crowdsale Phase Editor', function (accounts) {
  const wallet = accounts[1];
  const owner = accounts[0];
  const unprivileged = accounts[9];
  const value = ether(1);

  beforeEach(async function () {
    this.oracle = await PriceOracle.new(121233);
    this.token = await SimpleToken.new();
    this.crowdsale = await Crowdsale.new(wallet, this.token.address, this.oracle.address);
    this.crowdsale.addPhase(1520000000, 1520001000, 9999999999999999999999, 999999999);
    this.crowdsale.addPhase(1520001001, 1520002000, 8999999999999999999999, 999999999);
    this.crowdsale.addPhase(1520002001, 1520003000, 7999999999999999999999, 999999999);
    this.crowdsale.addPhase(1520009001, 1520009999, 8999999999999999999999, 999999999);
    this.crowdsale.addPhase(1530000001, 1539999999, 899999999999999999999999, 999999999);
  });

  describe('phase modification functions', function () {
    it('unable to add phase by unprivileged account', async function () {
      await this.crowdsale.addPhase(1522000000, 1530000000, 1238876, 999999, { from: unprivileged }).should.be.rejectedWith(EVMRevert);
    });
    it('unable to del phase by unprivileged account', async function () {
      await this.crowdsale.delPhase(0, { from: unprivileged }).should.be.rejectedWith(EVMRevert);
    });
    describe('after we add unprivileged account as admin', function () {
      beforeEach(async function () {
        this.crowdsale.adminAddRole(unprivileged, 'admin');
      });
      it('able to add phase', async function () {
        await this.crowdsale.addPhase(1522000000, 1530000000, 1238876, 999999, { from: unprivileged }).should.be.fulfilled;
      });
      it('able to del phase', async function () {
        await this.crowdsale.delPhase(0, { from: unprivileged }).should.be.fulfilled;
      });
      describe('check phase validation', function () {
        it('totally overlapped phase (inside existing period) is invalid', async function () {
          const result = await this.crowdsale.validatePhaseDates(1520000001, 1520000010).should.be.fulfilled;
          result.should.be.equal(false);
          await this.crowdsale.addPhase(1520000001, 1520000010, 1238876, 999999, { from: unprivileged }).should.be.rejectedWith(EVMRevert);
        });
        it('phase started in one an finishing in another period is invalid', async function () {
          const result = await this.crowdsale.validatePhaseDates(1520001002, 1520002002).should.be.fulfilled;
          result.should.be.equal(false);
          await this.crowdsale.addPhase(1520001002, 1520002002, 1238876, 999999, { from: unprivileged }).should.be.rejectedWith(EVMRevert);
        });
        it('phase started in one period and finished at non-overlapping time', async function () {
          const result = await this.crowdsale.validatePhaseDates(1520001002, 1540000001).should.be.fulfilled;
          result.should.be.equal(false);
          await this.crowdsale.addPhase(1520001002, 1540000001, 1238876, 999999, { from: unprivileged }).should.be.rejectedWith(EVMRevert);
        });
        it('phase started in non-overlapping period and finished at the existing phase', async function () {
          const result = await this.crowdsale.validatePhaseDates(1510000000, 1520001002).should.be.fulfilled;
          result.should.be.equal(false);
          await this.crowdsale.addPhase(1510000000, 1520001002, 1238876, 999999, { from: unprivileged }).should.be.rejectedWith(EVMRevert);
        });
        it('phase end time less than start time', async function () {
          const result = await this.crowdsale.validatePhaseDates(1510000001, 1510000000).should.be.fulfilled;
          result.should.be.equal(false);
          await this.crowdsale.addPhase(1510000001, 1510000000, 1238876, 999999, { from: unprivileged }).should.be.rejectedWith(EVMRevert);
        });
        it('phase end time and start time are equal', async function () {
          const result = await this.crowdsale.validatePhaseDates(1510000999, 1510000999).should.be.fulfilled;
          result.should.be.equal(false);
          await this.crowdsale.addPhase(1510000999, 1510000999, 1238876, 999999, { from: unprivileged }).should.be.rejectedWith(EVMRevert);
        });
        it('correct phase', async function () {
          const result = await this.crowdsale.validatePhaseDates(1510000000, 1510000001).should.be.fulfilled;
          result.should.be.equal(true);
          const { logs } = await this.crowdsale.addPhase(1510000000, 1510000001, 1238876, 999999, { from: unprivileged }).should.be.fulfilled;
          assert.equal(logs.length, 1);
          assert.equal(logs[0].event, 'PhaseAdded');
          assert.equal(logs[0].args.sender, unprivileged);
          assert.equal(logs[0].args.startDate, 1510000000);
          assert.equal(logs[0].args.endDate, 1510000001);
          assert.equal(logs[0].args.priceUSDcDNM, 1238876);
          assert.equal(logs[0].args.cap, 999999);
        });
      });
      it('delete phase 1 with pre- and post- checks', async function () {
        const resultBefore = await this.crowdsale.validatePhaseDates(1520001101, 1520001102).should.be.fulfilled;
        resultBefore.should.be.equal(false);
        const { logs } = await this.crowdsale.delPhase(1, { from: unprivileged }).should.be.fulfilled;
        assert.equal(logs.length, 1);
        assert.equal(logs[0].event, 'PhaseDeleted');
        assert.equal(logs[0].args.sender, unprivileged);
        assert.equal(logs[0].args.index, 1);
        const resultAfter = await this.crowdsale.validatePhaseDates(1520001101, 1520001102).should.be.fulfilled;
        resultAfter.should.be.equal(false);
      });
      describe('then revoke admin privileges', function () {
        beforeEach(async function () {
          this.crowdsale.adminRemoveRole(unprivileged, 'admin');
        });
        it('unable to add phase by unprivileged account', async function () {
          await this.crowdsale.addPhase(1522000000, 1530000000, 1238876, 999999, { from: unprivileged }).should.be.rejectedWith(EVMRevert);
        });
        it('unable to del phase by unprivileged account', async function () {
          await this.crowdsale.delPhase(0, { from: unprivileged }).should.be.rejectedWith(EVMRevert);
        });
      });
    });
  });

  describe('at the time when no active phase', function () {
    it('unable to see current DNM price in USD cents', async function () {
      await this.crowdsale.getCurentPhase().should.be.rejectedWith(EVMRevert);
    });
  });

  describe('at the time when active phase exists', function () {
    beforeEach(async function () {
      this.crowdsale.addPhase(1520010000, 1530000000, 295, 45000000);
    });
    it('able to see current DNM price in USD cents', async function () {
      const price = await this.crowdsale.getCurentPhase().should.be.fulfilled;
      price[0].should.be.bignumber.equal(295);
      price[1].should.be.bignumber.equal(45000000);
    });
  });

  /*
  describe('owner account', function () {
    beforeEach(async function () {
      this.newOracle = await PriceOracle.new(356715);
      await this.token.addMinter(this.crowdsale.address);
    });

    it('able to change oracle', async function () {
      await this.crowdsale.setOracle(this.newOracle.address, {from: owner }).should.be.fulfilled;
      const price = await this.crowdsale.getPriceUSDcETH();
      price.should.be.bignumber.equal(356715);
    });
  });

  describe('accepting payments', function () {
    it('should accept payments', async function () {
      await this.crowdsale.send(value).should.be.fulfilled;
      //await this.crowdsale.buyTokens(investor, { value: value, from: purchaser }).should.be.fulfilled;
    });
  });

  /*
  describe('high-level purchase', function () {
    it('should log purchase', async function () {
      //const { logs } = await this.crowdsale.sendTransaction({ value: value, from: investor });
      //const event = logs.find(e => e.event === 'TokenPurchase');
      should.exist(event);
      event.args.purchaser.should.equal(investor);
      event.args.beneficiary.should.equal(investor);
      event.args.value.should.be.bignumber.equal(value);
      event.args.amount.should.be.bignumber.equal(expectedTokenAmount);
    });

    it('should assign tokens to sender', async function () {
      //await this.crowdsale.sendTransaction({ value: value, from: investor });
      let balance = await this.token.balanceOf(investor);
      balance.should.be.bignumber.equal(expectedTokenAmount);
    });

    it('should forward funds to wallet', async function () {
      const pre = web3.eth.getBalance(wallet);
      //await this.crowdsale.sendTransaction({ value, from: investor });
      const post = web3.eth.getBalance(wallet);
      post.minus(pre).should.be.bignumber.equal(value);
    });
  });

  describe('low-level purchase', function () {
    it('should log purchase', async function () {
      const { logs } = await this.crowdsale.buyTokens(investor, { value: value, from: purchaser });
      const event = logs.find(e => e.event === 'TokenPurchase');
      should.exist(event);
      event.args.purchaser.should.equal(purchaser);
      event.args.beneficiary.should.equal(investor);
      event.args.value.should.be.bignumber.equal(value);
      event.args.amount.should.be.bignumber.equal(expectedTokenAmount);
    });

    it('should assign tokens to beneficiary', async function () {
      await this.crowdsale.buyTokens(investor, { value, from: purchaser });
      const balance = await this.token.balanceOf(investor);
      balance.should.be.bignumber.equal(expectedTokenAmount);
    });

    it('should forward funds to wallet', async function () {
      const pre = web3.eth.getBalance(wallet);
      await this.crowdsale.buyTokens(investor, { value, from: purchaser });
      const post = web3.eth.getBalance(wallet);
      post.minus(pre).should.be.bignumber.equal(value);
    });
  });
  */
});
