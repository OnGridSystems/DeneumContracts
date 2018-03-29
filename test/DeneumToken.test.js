import decodeLogs from './helpers/decodeLogs';
const SimpleToken = artifacts.require('DeneumToken');

contract('DeniumToken', accounts => {
  let token;
  const creator = accounts[0];

  beforeEach(async function () {
    token = await SimpleToken.new({ from: creator });
  });

  it('has a name', async function () {
    const name = await token.name();
    assert.equal(name, 'Deneum');
  });

  it('has a symbol', async function () {
    const symbol = await token.symbol();
    assert.equal(symbol, 'DNM');
  });

  it('has 2 decimals', async function () {
    const decimals = await token.decimals();
    assert(decimals.eq(2));
  });

});
