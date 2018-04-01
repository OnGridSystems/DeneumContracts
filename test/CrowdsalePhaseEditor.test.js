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
    this.oracle = await PriceOracle.new(39000);
    this.token = await SimpleToken.new();
    this.crowdsale = await Crowdsale.new(wallet, this.token.address, this.oracle.address);
    await this.crowdsale.addPhase(1520000000, 1520001000, 9999999999999999999999, 999999999);
    await this.crowdsale.addPhase(1520001001, 1520002000, 8999999999999999999999, 999999999);
    await this.crowdsale.addPhase(1520002001, 1520003000, 7999999999999999999999, 999999999);
    await this.crowdsale.addPhase(1520009001, 1520009999, 8999999999999999999999, 999999999);
    await this.crowdsale.addPhase(1530000001, 1539999999, 899999999999999999999999, 999999999);
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
        await this.crowdsale.adminAddRole(unprivileged, 'admin');
      });
      it('able to add phase', async function () {
        await this.crowdsale.addPhase(1522000000, 1530000000, 1238876, 999999, { from: unprivileged }).should.be.fulfilled;
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
          assert.equal(logs[0].args.tokensCap, 999999);
        });
      });
      it('delete phase 1 with pre- and post- checks', async function () {
        const resultBefore = await this.crowdsale.validatePhaseDates(1520009001, 1520009002).should.be.fulfilled;
        resultBefore.should.be.equal(false);
        const { logs } = await this.crowdsale.delPhase(3, { from: unprivileged }).should.be.fulfilled;
        assert.equal(logs.length, 1);
        assert.equal(logs[0].event, 'PhaseDeleted');
        assert.equal(logs[0].args.sender, unprivileged);
        assert.equal(logs[0].args.index, 3);
        //ToDo
        const resultAfter = await this.crowdsale.validatePhaseDates(1520009001, 1520009002).should.be.fulfilled;
        resultAfter.should.be.equal(true);
      });
      describe('then revoke admin privileges', function () {
        beforeEach(async function () {
          await this.crowdsale.adminRemoveRole(unprivileged, 'admin');
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
      await this.crowdsale.getCurrentPhaseIndex().should.be.rejectedWith(EVMRevert);
    });
  });

  describe('at the time when active phase exists', function () {
    beforeEach(async function () {
      await this.crowdsale.addPhase(1520010000, 1530000000, 295, 45000000);
    });
    it('able to see current DNM price in USD cents', async function () {
      const index = await this.crowdsale.getCurrentPhaseIndex().should.be.fulfilled;
      index.should.be.bignumber.equal(5);
    });
  });
});
