const Token = artifacts.require('./LegalToken');
const Sale = artifacts.require('./LegalCrowdsale');
const config = require('../config.json');
const moment = require('moment');
const assert = require('assert');

function bign(number) {
  return web3.toBigNumber(10).pow(config.token.decimals).mul(number);
}

contract('Initial test', (accounts) => {
  describe('Token', () => {
    it('should have been deployed', async () => {
      const token = await Token.deployed();
      assert.notEqual(token, null);
    });

    it('should have correct params', async () => {
      const token = await Token.deployed();
      assert.equal(await token.name(), config.token.name);
      assert.equal(await token.symbol(), config.token.symbol);
      assert.equal(await token.decimals(), config.token.decimals);
      assert.deepEqual(await token.totalSupply(), bign(config.token.total_supply));
    });
  });

  describe('Sale', () => {
    const defaultAddr = accounts[0];
    const receiverAddr = config.sale.receiver_address || defaultAddr;
    const totalSaleAmount = bign(config.sale.total_sale_amount);
    const totalSupply = bign(config.token.total_supply);
    const keepAmount = totalSupply.sub(totalSaleAmount);

    it('should have been deployed', async () => {
      const sale = await Sale.deployed();
      assert.notEqual(sale, null);
    });

    it('should have correct params', async () => {
      const sale = await Sale.deployed();
      assert.equal(await sale.rate(), config.sale.rate);
      assert.equal(await sale.wallet(), receiverAddr);
      assert.equal(await sale.token(), Token.address);

      const latestBlock = await web3.eth.getBlock('latest');
      const expectedStartTime = config.sale.start_time || moment.unix(latestBlock.timestamp).add(7, 'd').unix();
      const expectedEndTime = config.sale.end_time || moment.unix(latestBlock.timestamp).add(14, 'd').unix();
      const actualStartTime = Number((await sale.openingTime()).toString());
      const actualEndTime = Number((await sale.closingTime()).toString());
      const deltaStartTime = expectedStartTime - actualStartTime;
      const deltaEndTime = expectedEndTime - actualEndTime;

      // the current block time may not be equal to the configured sale time, so we give it a margin
      assert(deltaStartTime >= 0 && deltaStartTime < 10);
      assert(deltaEndTime >= 0 && deltaEndTime < 10);
    });


    it("should have correct token balance", async () => {
      const token = await Token.deployed();
      const sale = await Sale.deployed();

      let total = web3.toBigNumber(0);
      const rcvBalance = await token.balanceOf(receiverAddr);
      assert.deepEqual(rcvBalance, keepAmount);
      total = total.add(keepAmount);

      const saleBalance = await token.balanceOf(sale.address)
      assert.deepEqual(saleBalance, totalSaleAmount);
      total = total.add(totalSaleAmount);
      assert.deepEqual(total, totalSupply);
    });
  });
});