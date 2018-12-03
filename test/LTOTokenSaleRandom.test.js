const LTOToken = artifacts.require("./LTOToken.sol");
const LTOTokenSale = artifacts.require("./LTOTokenSale.sol");
const config = require("../config.json");
const tokenConfig = config.token;
const tokenSaleConfig = config.tokenSale;
const { ethSendTransaction } = require('./helpers/web3');
const Mock = require('mockjs');
const Random = Mock.Random;
const { increaseTimeTo } = require('zeppelin-solidity/test/helpers/increaseTime.js');
const { latestTime } = require('zeppelin-solidity/test/helpers/latestTime.js');
const BigNumber = web3.BigNumber;
const gas = 2000000;
const sentData = [];

function convertDecimals(number, ether) {
  const etherDecimals = 18;
  let decimals = tokenConfig.decimals;
  if (ether) {
    decimals = etherDecimals;
  }
  return web3.toBigNumber(10).pow(decimals).mul(number);
}

function deconvertDecimals(number, decimals) {
  if (!decimals) {
    decimals = tokenConfig.decimals;
  }
  return number.div(web3.toBigNumber(10).pow(decimals));
}

function getReceiverAddr(defaultAddr) {
  if(tokenSaleConfig.receiverAddr) {
    return tokenSaleConfig.receiverAddr;
  }
  return defaultAddr;
}

async function randomSent(accounts, address, bonus) {

  const account = accounts[Random.integer(0,accounts.length - 1)];
  let maxValue = web3.fromWei(web3.eth.getBalance(account)).div(2);
  if (maxValue > 100) {
    maxValue = Random.integer(3, 100);
  }
  const minValue = 3;


  if(maxValue < minValue){
    return;
  }

  let value = Random.integer(minValue, maxValue);
  if (!sentData[account]) {
    sentData[account] = 0;
  }
  const bonusEth = value * bonus;
  const total = value + bonusEth;
  sentData[account] += total;
  value = convertDecimals(value, true);

  let hash = await ethSendTransaction({from: account, to: address, value: value, gas: gas});
  // let receipt = web3.eth.getTransactionReceipt(hash);
  // assert.equal(receipt.status, '0x1', "The Transactiogit n will success after startTime");
  return total;
}

contract('LTOTokenSale', ([owner, bridge, ...accounts]) => {
  let id;
  const rate = 400;
  const tokenSupply = convertDecimals(1000000);
  const totalSaleAmount = convertDecimals(100000);
  const userWithdrawalDelaySec = new BigNumber(2);
  const clearDelaySec = new BigNumber(5);
  const bonusDuration = 10;
  const duration = 20;

  const bonusPercentage = 700;
  const bonusDecreaseRate = 5;

  before(async () => {
    const startTime = (await latestTime()) + 2;
    this.token = await LTOToken.new(tokenSupply, bridge, 50);
    this.tokenSale = await LTOTokenSale.new(owner, this.token.address, totalSaleAmount);
    await this.token.transfer(this.tokenSale.address, totalSaleAmount);
    await this.tokenSale.startSale(startTime, rate, duration, bonusDuration, bonusPercentage, bonusDecreaseRate, userWithdrawalDelaySec, clearDelaySec);
  });

  describe('Randomly buy random amounts of ether', () => {

    it('should randomly send a random amounts of ether during the bonus period', async () => {
      let time = await this.tokenSale.startTime();
      //wating for starting
      await increaseTimeTo(time.plus(2));

      let totalWannaBuy = await this.tokenSale.totalWannaBuyAmount();
      assert(totalWannaBuy.equals(0));

      const times = Random.integer(5, 10);
      let bonus = 0.07;
      const decrease = 0.0005;
      let total = 0;
      for(let i = 0; i < times; i++) {
        total += await randomSent(accounts, this.tokenSale.address, bonus);
        bonus -= decrease;
      }

      totalWannaBuy = await this.tokenSale.totalWannaBuyAmount();

      time = await this.tokenSale.bonusEndTime();
      await increaseTimeTo(time.plus(2));

      const times2 = Random.integer(5, 10);
      for(let i = 0; i < times2; i++) {
        total += await randomSent(accounts, this.tokenSale.address, 0);
      }

      total = total * rate;
      totalWannaBuy = await this.tokenSale.totalWannaBuyAmount();
      assert(totalWannaBuy.equals(convertDecimals(total.toFixed(8))));

      const proportion = totalSaleAmount.div(totalWannaBuy);

      for(var account in sentData) {
        const totalTokens = convertDecimals((sentData[account] * rate).toFixed(8));
        const tokens = proportion.mul(totalTokens).round(0);
        [sendEther, usedEther, getToken] = await this.tokenSale.getPublicSaleInfo(account);
        assert(tokens.equals(getToken));
      }
    })
  })
});

