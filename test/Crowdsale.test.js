import ether from './helpers/ether';

const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const Crowdsale = artifacts.require('DeneumCrowdsale');
const SimpleToken = artifacts.require('DeneumToken');
const PriceOracle = artifacts.require('PriceOracleMock');

contract('Crowdsale', function (accounts) {
  const wallet = accounts[0];
  const value = ether(1);

  beforeEach(async function () {
    this.oracle = await PriceOracle.new(121233);
    this.token = await SimpleToken.new();
    this.crowdsale = await Crowdsale.new(wallet, this.token.address, this.oracle.address);
    await this.token.addMinter(this.crowdsale.address);
  });

  describe('interop with oracle service', function () {
    it('should return ETH/USD price', async function () {
      const price = await this.crowdsale.getPriceUSDcETH();
      price.should.be.bignumber.equal(121233);
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
