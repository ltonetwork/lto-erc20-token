const LTOToken = artifacts.require("./LTOToken.sol");
const LTOTokenSale = artifacts.require("./LTOTokenSale.sol");
const config = require("../config.json");
const tokenConfig = config.token;
const tokenSaleConfig = config.tokenSale;
const { ethSendTransaction } = require('openzeppelin-solidity/test/helpers/web3');
const { increaseTo, latest } = require('openzeppelin-solidity/test/helpers/time.js');
const BigNumber = web3.BigNumber;
const gas = 2000000;

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

contract('LTOTokenSale', ([owner, bridge, user1, user2, user3, user4]) => {
  let startTime;
  const rate = 400;
  const maxSupply = convertDecimals(15000);
  const tokenSupply = convertDecimals(10000);
  const totalSaleAmount = convertDecimals(1000);

  const userWithdrawalDelaySec = new BigNumber(2);
  const clearDelaySec = new BigNumber(5);
  const duration = 10;

  beforeEach(async () => {
    startTime = (await latest()) + 5;

    this.token = await LTOToken.new(bridge, maxSupply);
    await this.token.mint(owner, tokenSupply);
    await this.token.unpause();

    this.tokenSale = await LTOTokenSale.new(owner, this.token.address, totalSaleAmount, owner);
    await this.token.transfer(this.tokenSale.address, totalSaleAmount);
  });

  describe('without bonus period', () => {
    const bonusDuration = 0;
    const bonusPercentage = 0;
    const bonusDecreaseRate = 0;

    beforeEach(async () => {
      await this.tokenSale.startSale(startTime, rate, duration, bonusDuration, bonusPercentage, bonusDecreaseRate, userWithdrawalDelaySec, clearDelaySec);
    });

    describe('when total sale is more then the supply', () => {
      it('should result in every buyer receiving a fraction of the rate', async () => {
        const time = await this.tokenSale.startTime();
        //wating for starting
        await increaseTo(time.plus(2))

        await ethSendTransaction({
          from: user1,
          to: this.tokenSale.address,
          value: convertDecimals(1, true),
          gas: gas
        });
        assert((await this.tokenSale.totalWannaBuyAmount()).equals(convertDecimals(rate)));

        let [sendEther, usedEther, getToken] = await this.tokenSale.getPublicSaleInfo(user1);
        assert(sendEther.equals(convertDecimals(1, true)));
        assert(usedEther.equals(convertDecimals(1, true)));
        assert(getToken.equals(convertDecimals(rate)));

        await ethSendTransaction({
          from: user2,
          to: this.tokenSale.address,
          value: convertDecimals(1, true),
          gas: gas
        });

        assert((await this.tokenSale.totalWannaBuyAmount()).equals(convertDecimals(2 * rate)));

        await ethSendTransaction({
          from: user3,
          to: this.tokenSale.address,
          value: convertDecimals(1, true),
          gas: gas
        });

        assert((await this.tokenSale.totalWannaBuyAmount()).equals(convertDecimals(3 * rate)));

        [sendEther, usedEther, getToken] = await this.tokenSale.getPublicSaleInfo(user1);
        assert(sendEther.equals(convertDecimals(1, true)));
        assert(getToken.equals(totalSaleAmount.div(3).round(0)));

        const count = await this.tokenSale.getPurchaserCount();
        assert.equal(count.toNumber(), 3);

        const purchaser = await this.tokenSale.purchaserList(1);
        assert.equal(purchaser, user2);
      });
    });
  });

  describe('with bonus period and no decrease rate', () => {
    const bonusDuration = 5;
    const bonusPercentage = 700;
    const bonusDecreaseRate = 0;

    beforeEach(async () => {
      await this.tokenSale.startSale(startTime, rate, duration, bonusDuration, bonusPercentage, bonusDecreaseRate, userWithdrawalDelaySec, clearDelaySec);
    });

    describe('when total sale is less then the supply', () => {
      it('should result in every buyer receiving the rate plus bonus', async () => {
        let bonus = bonusPercentage;
        const time = await this.tokenSale.startTime();
        //wating for starting
        await increaseTo(time.plus(2));

        await ethSendTransaction({
          from: user1,
          to: this.tokenSale.address,
          value: convertDecimals(1, true),
          gas: gas
        });
        let bought = convertDecimals(rate).add(convertDecimals(rate).div(10000).mul(bonus));

        let [sendEther, usedEther, getToken] = await this.tokenSale.getPublicSaleInfo(user1);
        assert(sendEther.equals(convertDecimals(1, true)));
        assert(usedEther.equals(convertDecimals(1, true)));
        assert(getToken.equals(bought));
        let totalBought = bought;
        assert((await this.tokenSale.totalWannaBuyAmount()).equals(totalBought));

        bonus -= bonusDecreaseRate;

        await ethSendTransaction({
          from: user2,
          to: this.tokenSale.address,
          value: convertDecimals(1, true),
          gas: gas
        });

        bought = convertDecimals(rate).add(convertDecimals(rate).div(10000).mul(bonus));

        [sendEther, usedEther, getToken] = await this.tokenSale.getPublicSaleInfo(user1);
        assert(sendEther.equals(convertDecimals(1, true)));
        assert(getToken.equals(bought));
        totalBought = totalBought.add(bought);

        assert((await this.tokenSale.totalWannaBuyAmount()).equals(totalBought));

        const count = await this.tokenSale.getPurchaserCount();
        assert.equal(count.toNumber(), 2);

        const purchaser = await this.tokenSale.purchaserList(1);
        assert.equal(purchaser, user2);
      });
    });

    describe('when total sale is more then the supply', () => {
      it('should result in every buyer receiving a fraction of the rate', async () => {
        const time = await this.tokenSale.startTime();
        //wating for starting
        await increaseTo(time.plus(2));

        await ethSendTransaction({
          from: user1,
          to: this.tokenSale.address,
          value: convertDecimals(1, true),
          gas: gas
        });
        assert((await this.tokenSale.totalWannaBuyAmount()).equals(convertDecimals(rate).add(convertDecimals(rate).div(10000).mul(bonusPercentage))));

        let [sendEther, usedEther, getToken] = await this.tokenSale.getPublicSaleInfo(user1);
        assert(sendEther.equals(convertDecimals(1, true)));
        assert(usedEther.equals(convertDecimals(1, true)));
        assert(getToken.equals(convertDecimals(rate).add(convertDecimals(rate).div(10000).mul(bonusPercentage))));

        await ethSendTransaction({
          from: user2,
          to: this.tokenSale.address,
          value: convertDecimals(1, true),
          gas: gas
        });

        assert((await this.tokenSale.totalWannaBuyAmount()).equals(convertDecimals(2 * rate).add(convertDecimals(2 * rate).div(10000).mul(bonusPercentage))));

        await ethSendTransaction({
          from: user3,
          to: this.tokenSale.address,
          value: convertDecimals(1, true),
          gas: gas
        });

        assert((await this.tokenSale.totalWannaBuyAmount()).equals(convertDecimals(3 * rate).add(convertDecimals(3 * rate).div(10000).mul(bonusPercentage))));

        [sendEther, usedEther, getToken] = await this.tokenSale.getPublicSaleInfo(user1);
        assert(sendEther.equals(convertDecimals(1, true)));
        assert(getToken.equals(totalSaleAmount.div(3).round(0)));

        const count = await this.tokenSale.getPurchaserCount();
        assert.equal(count.toNumber(), 3);

        const purchaser = await this.tokenSale.purchaserList(1);
        assert.equal(purchaser, user2);
      });
    });
  });

  describe('with bonus period and decrease rate', () => {
    const bonusDuration = 5;
    const bonusPercentage = 700;
    const bonusDecreaseRate = 5;

    beforeEach(async () => {
      await this.tokenSale.startSale(startTime, rate, duration, bonusDuration, bonusPercentage, bonusDecreaseRate, userWithdrawalDelaySec, clearDelaySec);
    });

    describe('when total sale is less then the supply', () => {
      it('should result in every buyer receiving the rate plus bonus which is decreasing per transaction', async () => {
        let bonus = bonusPercentage;
        const time = await this.tokenSale.startTime();
        //wating for starting
        await increaseTo(time.plus(2));

        await ethSendTransaction({
          from: user1,
          to: this.tokenSale.address,
          value: convertDecimals(1, true),
          gas: gas
        });
        let bought = convertDecimals(rate).add(convertDecimals(rate).div(10000).mul(bonus));

        let [sendEther, usedEther, getToken] = await this.tokenSale.getPublicSaleInfo(user1);
        assert(sendEther.equals(convertDecimals(1, true)));
        assert(usedEther.equals(convertDecimals(1, true)));
        assert(getToken.equals(bought));
        let totalBought = bought;
        assert((await this.tokenSale.totalWannaBuyAmount()).equals(totalBought));

        bonus -= bonusDecreaseRate;

        await ethSendTransaction({
          from: user2,
          to: this.tokenSale.address,
          value: convertDecimals(1, true),
          gas: gas
        });

        bought = convertDecimals(rate).add(convertDecimals(rate).div(10000).mul(bonus));

        [sendEther, usedEther, getToken] = await this.tokenSale.getPublicSaleInfo(user2);
        assert(sendEther.equals(convertDecimals(1, true)));

        assert(getToken.equals(bought));
        totalBought = totalBought.add(bought);

        assert((await this.tokenSale.totalWannaBuyAmount()).equals(totalBought));
      });
    });

    describe('when total sale is more then the supply', () => {
      it('should result in every buyer receiving the rate plus bonus', async () => {
        let bonus = bonusPercentage;
        const time = await this.tokenSale.startTime();
        //wating for starting
        await increaseTo(time.plus(2));

        await ethSendTransaction({
          from: user1,
          to: this.tokenSale.address,
          value: convertDecimals(1, true),
          gas: gas
        });

        let bought = convertDecimals(rate).add(convertDecimals(rate).div(10000).mul(bonus));
        const boughtUser1 = bought;

        let [sendEther, usedEther, getToken] = await this.tokenSale.getPublicSaleInfo(user1);
        assert(sendEther.equals(convertDecimals(1, true)));
        assert(usedEther.equals(convertDecimals(1, true)));
        assert(getToken.equals(bought));
        let totalBought = bought;
        assert((await this.tokenSale.totalWannaBuyAmount()).equals(totalBought));

        bonus -= bonusDecreaseRate;

        await ethSendTransaction({
          from: user2,
          to: this.tokenSale.address,
          value: convertDecimals(1, true),
          gas: gas
        });

        bought = convertDecimals(rate).add(convertDecimals(rate).div(10000).mul(bonus));

        totalBought = totalBought.add(bought);
        assert((await this.tokenSale.totalWannaBuyAmount()).equals(totalBought));

        bonus -= bonusDecreaseRate;

        await ethSendTransaction({
          from: user3,
          to: this.tokenSale.address,
          value: convertDecimals(1, true),
          gas: gas
        });

        bought = convertDecimals(rate).add(convertDecimals(rate).div(10000).mul(bonus));

        totalBought = totalBought.add(bought);
        assert((await this.tokenSale.totalWannaBuyAmount()).equals(totalBought));

        bonus -= bonusDecreaseRate;

        await ethSendTransaction({
          from: user4,
          to: this.tokenSale.address,
          value: convertDecimals(1, true),
          gas: gas
        });

        bought = convertDecimals(rate).add(convertDecimals(rate).div(10000).mul(bonus));

        totalBought = totalBought.add(bought);
        assert((await this.tokenSale.totalWannaBuyAmount()).equals(totalBought));

        const proportion = totalSaleAmount.div(totalBought);

        [sendEther, usedEther, getToken] = await this.tokenSale.getPublicSaleInfo(user4);
        assert(getToken.equals(proportion.mul(bought).round(0)));

        [sendEther, usedEther, getToken] = await this.tokenSale.getPublicSaleInfo(user1);
        assert(getToken.equals(proportion.mul(boughtUser1).round(0)));
      });
    });
  });
});
