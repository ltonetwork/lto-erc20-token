const LTOToken = artifacts.require("./LTOToken.sol");
const LTOTokenSale = artifacts.require("./LTOTokenSale.sol");
const config = require("../config.json");
const tokenConfig = config.token;
const tokenSaleConfig = config.tokenSale;
const { ethSendTransaction } = require('openzeppelin-solidity/test/helpers/web3');
const Mock = require('mockjs');
const Random = Mock.Random;
const { increaseTo, latest } = require('openzeppelin-solidity/test/helpers/time.js');
const BigNumber = web3.BigNumber;
const gas = 2000000;
const sentData = [];
const MAX_RANDOM_VALUE = 1000;

const bonusPercentage = tokenSaleConfig.bonusPercentage;
const bonusDecreaseRate = tokenSaleConfig.bonusDecreaseRate;
let bonus = bonusPercentage / 10000;
const decrease = bonusDecreaseRate / 10000;

// let capFreeAccount;
const capFreeAccounts = [];

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

async function randomSent(accounts, address, tokenSale) {

  const account = accounts[Random.integer(0,accounts.length - 1)];
  if (capFreeAccounts.length < 3 && Random.bool()) {
    capFreeAccounts.push(account);
    await tokenSale.addCapFreeAddress(account);
  }
  let maxValue = web3.fromWei(web3.eth.getBalance(account));
  if (maxValue > MAX_RANDOM_VALUE) {
    maxValue = MAX_RANDOM_VALUE;
  }
  const minValue = 3;

  if(maxValue < minValue){
    return;
  }

  let value = Random.integer(minValue, maxValue);
  let calcValue = value;
  if (!sentData[account]) {
    sentData[account] = {sent: 0, accounted: 0};
  }

  if (capFreeAccounts.indexOf(account) == -1 && sentData[account].sent + value > 150) {
    calcValue = value - ((sentData[account].sent + value) - 150);
  }
  let total = 0;
  if (calcValue >= 0) {
    const bonusEth = calcValue * bonus;
    total = calcValue + bonusEth;
    sentData[account].sent += calcValue;
    sentData[account].accounted += total;
  }

  // console.log('Account: ', account, ' sends: ', value, ' with calcValue: ', calcValue, ' bonus: ', bonus);

  let hash = await ethSendTransaction({from: account, to: address, value: convertDecimals(value, true), gas: gas});
  let receipt = web3.eth.getTransactionReceipt(hash);
  if (calcValue == 0) {
    assert.equal(receipt.status, '0x0', "The Transaction will fail after sending more then 150 eth");
  } else {
    assert.equal(receipt.status, '0x1', "The Transaction will success after startTime");
    if (bonus > 0) {
      bonus -= decrease;
    }
  }
  return total;
}

contract('LTOTokenSale', ([owner, bridge, ...accounts]) => {
  let id;
  const rate = tokenSaleConfig.rate;
  const tokenSupply = convertDecimals(tokenConfig.totalSupply);
  const totalSaleAmount = convertDecimals(tokenSaleConfig.totalSaleAmount);
  const bridgeSupply = convertDecimals(tokenConfig.bridgeSupply);
  const userWithdrawalDelaySec = new BigNumber(tokenSaleConfig.userWithdrawalDelaySec);
  const clearDelaySec = new BigNumber(tokenSaleConfig.clearDelaySec);
  const bonusDuration = tokenSaleConfig.bonusDuration;
  const duration = tokenSaleConfig.duration;

  before(async () => {
    const startTime = (await latest()) + 2;
    this.token = await LTOToken.new(tokenSupply, bridge, bridgeSupply);
    this.tokenSale = await LTOTokenSale.new(owner, this.token.address, totalSaleAmount, owner);
    await this.token.transfer(this.tokenSale.address, totalSaleAmount);
    await this.tokenSale.startSale(startTime, rate, duration, bonusDuration, bonusPercentage, bonusDecreaseRate, userWithdrawalDelaySec, clearDelaySec);
  });

  describe('Randomly buy random amounts of ether', () => {

    it('should randomly send a random amounts of ether during the bonus period', async () => {
      let time = await this.tokenSale.startTime();
      //wating for starting
      await increaseTo(time.plus(2));

      let totalWannaBuy = await this.tokenSale.totalWannaBuyAmount();
      assert(totalWannaBuy.equals(0));

      const times = Random.integer(5, 15);
      let total = 0;
      for(let i = 0; i < times; i++) {
        total += await randomSent(accounts, this.tokenSale.address, this.tokenSale);
      }

      totalWannaBuy = await this.tokenSale.totalWannaBuyAmount();

      time = await this.tokenSale.bonusEndTime();
      await increaseTo(time.plus(2));

      bonus = 0;

      const times2 = Random.integer(5, 15);
      for(let i = 0; i < times2; i++) {
        total += await randomSent(accounts, this.tokenSale.address, this.tokenSale);
      }

      total = total * rate;
      totalWannaBuy = await this.tokenSale.totalWannaBuyAmount();
      assert(totalWannaBuy.equals(convertDecimals(total.toFixed(8))));

      const proportion = totalSaleAmount.div(totalWannaBuy);

      for(var account in sentData) {
        let tokens = convertDecimals((sentData[account].accounted * rate).toFixed(8));
        if (totalSaleAmount.lessThan(totalWannaBuy)) {
          tokens = proportion.mul(tokens).round(0);
          console.log('Tested with proportion');
        }
        [sendEther, usedEther, getToken] = await this.tokenSale.getPublicSaleInfo(account);
        assert(tokens.equals(getToken));
      }
    })
  })
});

