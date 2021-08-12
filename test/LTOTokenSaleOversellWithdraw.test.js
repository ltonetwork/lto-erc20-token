const LTOToken = artifacts.require("./LTOToken.sol");
const LTOTokenSale = artifacts.require("./LTOTokenSale.sol");
const FakeWallet = artifacts.require("./FakeWallet.sol");
const config = require("../config.json");
const tokenConfig = config.token;

const { ethSendTransaction, ethGetBalance } = require('openzeppelin-solidity/test/helpers/web3');
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

contract('LTOTokenSale', ([owner, bridge, user1, user2, user3]) => {
  let startTime;
  const rate = 400;
  const maxSupply = convertDecimals(15000);
  const tokenSupply = convertDecimals(10000);
  const totalSaleAmount = convertDecimals(1000);

  const userWithdrawalDelaySec = 60;
  const clearDelaySec = 60;
  const duration = 60;

  before(async () => {
    startTime = (await latest()) + 5;

    this.token = await LTOToken.new(bridge, maxSupply);
    await this.token.mint(owner, tokenSupply);
    await this.token.unpause();

    this.tokenSale = await LTOTokenSale.new(owner, this.token.address, totalSaleAmount, owner);
    await this.token.transfer(this.tokenSale.address, totalSaleAmount);

    const bonusDuration = 0;
    const bonusPercentage = 0;
    const bonusDecreaseRate = 0;
    await this.tokenSale.startSale(startTime, rate, duration, bonusDuration, bonusPercentage, bonusDecreaseRate, userWithdrawalDelaySec, clearDelaySec);
  });

  describe('when total sold amount is more then the sale amount', () => {
    it('should accept payment from a smart contract', async () => {
      const time = await this.tokenSale.startTime();
      //wating for starting
      await increaseTo(time.plus(2));

      this.wallet = await FakeWallet.new({from: user1});
      let hash = await ethSendTransaction({
        from: user1,
        to: this.wallet.address,
        value: convertDecimals(1, true),
        gas: gas
      });

      try {
        const tx = await this.wallet.buyTokens(this.tokenSale.address, convertDecimals(1, true), {from: user1});
      } catch (err) {
        console.log(err);
      }
      purchaser = await this.tokenSale.purchaserList((await this.tokenSale.getPurchaserCount()).toNumber() - 1);
      assert.equal(purchaser, this.wallet.address);

      assert((await this.tokenSale.totalWannaBuyAmount()).equals(convertDecimals(rate)));

      let [sendEther, usedEther, getToken] = await this.tokenSale.getPublicSaleInfo(this.wallet.address);
      assert(sendEther.equals(convertDecimals(1, true)));
      assert(usedEther.equals(convertDecimals(1, true)));
      assert(getToken.equals(convertDecimals(rate)));
    });

    it('should result in every buyer receiving a fraction of the rate', async () => {

      await ethSendTransaction({
        from: user1,
        to: this.tokenSale.address,
        value: convertDecimals(1, true),
        gas: gas
      });
      assert((await this.tokenSale.totalWannaBuyAmount()).equals(convertDecimals(2 * rate)));

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

      assert((await this.tokenSale.totalWannaBuyAmount()).equals(convertDecimals(3 * rate)));

      await ethSendTransaction({
        from: user3,
        to: this.tokenSale.address,
        value: convertDecimals(1, true),
        gas: gas
      });

      assert((await this.tokenSale.totalWannaBuyAmount()).equals(convertDecimals(4 * rate)));

      [sendEther, usedEther, getToken] = await this.tokenSale.getPublicSaleInfo(user1);
      assert(sendEther.equals(convertDecimals(1, true)));
      assert(getToken.equals(totalSaleAmount.div(4).round(0)));

      const count = await this.tokenSale.getPurchaserCount();
      assert.equal(count.toNumber(), 4);
    });

    describe('when the sale is ended', () => {
      it('should be possible to withdraw all tokens', async () => {
        const time = await this.tokenSale.endTime();
        //wating for starting
        await increaseTo(time.plus(2));

        const count = (await this.tokenSale.getPurchaserCount()).toNumber();
        const expectedTokens = totalSaleAmount.div(4).round(0);

        try {
          const tx = await this.tokenSale.withdrawalFor(0, count);
          assert.equal(tx.receipt.status, '0x1', "Will Success");

          const balance = await this.token.balanceOf(user1);
          assert(balance.equals(expectedTokens));

          [withdrew, recorded, received, accounted, unreceived] = await this.tokenSale.purchaserMapping(this.wallet.address);
          assert(unreceived.equals(convertDecimals(0.375, true)));
        } catch (e) {
          console.log(e);
        }
      });

      describe('when clear time has started', () => {
        it('should be possible to clear the contract', async () => {
          const remainingTokens = await this.token.balanceOf(this.tokenSale.address);
          const remainingEth = await ethGetBalance(this.tokenSale.address);

          assert(remainingTokens.equals(web3.toBigNumber(0)));
          assert(remainingEth.equals(convertDecimals(0.375, true)));

          const time = await this.tokenSale.clearStartTime();
          //waiting for clearStart
          await increaseTo(time.plus(2));

          try {
            const tx = await this.wallet.withdrawFailed(this.tokenSale.address, user1, {from: user1});
          } catch (err) {
            console.log(err);
          }

          [withdrew, recorded, received, accounted, unreceived] = await this.tokenSale.purchaserMapping(this.wallet.address);
          assert(unreceived.equals(web3.toBigNumber(0)));

          const finalRemainingEth = await ethGetBalance(this.tokenSale.address);
          assert(finalRemainingEth.equals(web3.toBigNumber(0)));
        });
      })
    })
  });
});
