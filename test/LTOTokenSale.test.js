const LTOToken = artifacts.require("./LTOToken.sol");
const LTOTokenSale = artifacts.require("./LTOTokenSale.sol");
const config = require("../config.json");
const tokenConfig = config.token;
const tokenSaleConfig = config.tokenSale;
const { ethSendTransaction } = require('./helpers/web3');
const constants = require('./helpers/constants');

const sleep = require('sleep-promise');
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

function getUnixTime(){
  return Math.round(new Date().getTime()/1000);
}

function sleepSec(sec){
  if(sec < 0){
    sec = 0;
  }
  return sleep(sec * 1000); // sleep use ms
}

const saveState = async () => {
  return await web3.currentProvider.send({
    jsonrpc: "2.0",
    method: "evm_snapshot",
    id: 0
  })
};

const revertState = async (id) => {
  await web3.currentProvider.send({
    jsonrpc: "2.0",
    method: "evm_revert",
    params: [id],
    id: 0
  })
};

contract('LTOTokenSale', ([owner, bridge, user1, user2, user3]) => {
  let id;
  const rate = 400;
  const tokenSupply = convertDecimals(10000);
  const totalSaleAmount = convertDecimals(1000);
  const keepAmount = tokenSupply.sub(totalSaleAmount);

  it('requires a token', () => {
    try {
      const sale = LTOTokenSale.new(owner, constants.ZERO_ADDRESS, tokenSupply);
    } catch (ex) {
      assert.equal(ex.receipt.status, '0x0', 'Will failure');
    }
  });


  contract('with token', () => {
    before(async () => {
      id = await saveState();
      this.token = await LTOToken.new(tokenSupply, bridge, 50);
    });

    after(async() => {
      await revertState(id)
    });

    it('requires a token supply', () => {
      try {
        const sale = LTOTokenSale.new(owner, this.token, 0);
      } catch (ex) {
        assert.equal(ex.receipt.status, '0x0', 'Will failure');
      }
    });

    it('requires a receiver address', () => {
      try {
        const sale = LTOTokenSale.new(constants.ZERO_ADDRESS, this.token, totalSaleAmount);
      } catch (ex) {
        assert.equal(ex.receipt.status, '0x0', 'Will failure');
      }
    });

    context('once deployed (sold out token sale)', async () => {
      const startTime = new BigNumber(getUnixTime() + 5);
      const userWithdrawalDelaySec = new BigNumber(2);
      const clearDelaySec = new BigNumber(5);
      const bonusDuration = 0;
      const duration = 5;

      const bonusPercentage = 0;
      const bonusDecreaseRate = 0;

      before(async () => {
        this.tokenSale = await LTOTokenSale.new(owner, this.token.address, totalSaleAmount);
        await this.token.transfer(this.tokenSale.address, totalSaleAmount);
        await this.tokenSale.startSale(startTime, rate, duration, bonusDuration, bonusPercentage, bonusDecreaseRate, userWithdrawalDelaySec, clearDelaySec);
      });

      describe('when the token sale start date is set', () => {
        it('should have the correct info', async () => {
          const address = await this.tokenSale.token();
          assert.equal(address, this.token.address);


          const receiverAddress = await this.tokenSale.receiverAddr();
          assert.equal(receiverAddress.toLowerCase(), owner);

          const amount = await this.tokenSale.totalSaleAmount();
          assert(totalSaleAmount.equals(amount));

          const time = await this.tokenSale.startTime();
          assert(time.equals(startTime));

          const promises = [];
          promises.push(this.tokenSale.endTime());
          promises.push(this.tokenSale.userWithdrawalStartTime());
          promises.push(this.tokenSale.clearStartTime());
          const times = await Promise.all(promises);

          endTime = new BigNumber(startTime.toNumber());
          const bonusEndTime = endTime.plus(duration);
          endTime = endTime.plus(duration);

          assert(times[0].equals(endTime));
          assert(times[1].equals(endTime.plus(userWithdrawalDelaySec)));
          assert(times[2].equals(endTime.plus(clearDelaySec)));

          const globalAmount = await this.tokenSale.globalAmount();
          assert(globalAmount.equals(0));

          assert((await this.tokenSale.rate()).equals(rate));

          const count = await this.tokenSale.getPurchaserCount();
          assert(count.equals(0));
        });

        it("should have the correct balances", async () => {
          let total = new BigNumber(0);
          const balance = await this.token.balanceOf(owner);
          assert(balance.equals(keepAmount));
          total = total.add(keepAmount);

          const newBalance = await this.token.balanceOf(this.tokenSale.address);
          assert(newBalance.equals(totalSaleAmount));
          total = total.add(totalSaleAmount);
          assert(total.equals(tokenSupply));
        });

        it('should not accept payments', async () => {
          const time = await this.tokenSale.startTime();
          assert(time > getUnixTime(), "The Start Time will after now for this Test");
          const transaction = {from: owner, to: this.tokenSale.address, value: convertDecimals(1, true)};

          const hash = await ethSendTransaction(transaction);
          const receipt = web3.eth.getTransactionReceipt(hash);
          assert.equal(receipt.status, '0x0', "The Transaction will failure before starTime");
        });

        describe('When token sale has started', () => {
          it('should accept payments', async () => {
            const time = await this.tokenSale.startTime();
            //wating for starting
            await sleepSec(time.plus(2).sub(getUnixTime()).toNumber());

            let hash = await ethSendTransaction({
              from: user1,
              to: this.tokenSale.address,
              value: convertDecimals(1, true),
              gas: gas
            });
            let receipt = web3.eth.getTransactionReceipt(hash);
            assert.equal(receipt.status, '0x1', "The Transaction will success after startTime");
            assert((await this.tokenSale.totalWannaBuyAmount()).equals(convertDecimals(rate)));

            let [sendEther, usedEther, getToken] = await this.tokenSale.getSaleInfo(user1);
            assert(sendEther.equals(convertDecimals(1, true)));
            assert(usedEther.equals(convertDecimals(1, true)));
            assert(getToken.equals(convertDecimals(rate)));

            hash = await ethSendTransaction({
              from: user2,
              to: this.tokenSale.address,
              value: convertDecimals(1, true),
              gas: gas
            });
            receipt = web3.eth.getTransactionReceipt(hash);
            assert.equal(receipt.status, '0x1', "The Transaction will success after startTime");

            assert((await this.tokenSale.totalWannaBuyAmount()).equals(convertDecimals(2 * rate)));

            hash = await ethSendTransaction({
              from: user3,
              to: this.tokenSale.address,
              value: convertDecimals(1, true),
              gas: gas
            });
            receipt = web3.eth.getTransactionReceipt(hash);
            assert.equal(receipt.status, '0x1', "The Transaction will success after startTime");

            assert((await this.tokenSale.totalWannaBuyAmount()).equals(convertDecimals(3 * rate)));

            [sendEther, usedEther, getToken] = await this.tokenSale.getSaleInfo(user1);
            assert(sendEther.equals(convertDecimals(1, true)));
            assert(getToken.equals(totalSaleAmount.div(3).round(0)));

            const count = await this.tokenSale.getPurchaserCount();
            assert.equal(count.toNumber(), 3);

            const purchaser = await this.tokenSale.purchaserList(1);
            assert.equal(purchaser, user2);
          });

          it('should not allow user withdrawals', async () => {
            try {
              const tx = await this.tokenSale.withdrawal({from: user1});
            } catch (e) {
              assert.equal(e.receipt.status, '0x0', "Will failure");
            }
          });

          it('should not allow owner withdrawals', async () => {
            try {
              const tx = await this.tokenSale.withdrawalFor(0, 1);
              assert.equal(tx.receipt.status, '0x0');
            } catch (e) {
              assert.equal(e.receipt.status, '0x0', "Will failure");
            }
          });

          describe('when sale has ended', () => {
            it('should allow admin withdrawals', async () => {
              const time = await this.tokenSale.endTime();
              let balance = await this.token.balanceOf(user1);
              assert(balance.equals(0));
              //wating for End
              await sleepSec(time.plus(2).sub(getUnixTime()).toNumber());

              try {
                const tx = await this.tokenSale.withdrawalFor(0, 1);
                assert.equal(tx.receipt.status, '0x1', "Will Success");

                const balance = await this.token.balanceOf(user1);
                assert(balance.equals(totalSaleAmount.div(3).round(0)));
              } catch (e) {
                console.log(e);
              }
            });

            it('should not accept payments', async () => {
              const hash = await ethSendTransaction({
                from: user1,
                to: this.tokenSale.address,
                value: convertDecimals(1, true),
                gas: gas
              });
              const receipt = web3.eth.getTransactionReceipt(hash);
              assert.equal(receipt.status, '0x0', "The Transaction will failure after Ended");
            });

            it('should not allow user withdrawals', async () => {
              try {
                const tx = await this.tokenSale.withdrawal({from: user2});
              } catch (e) {
                assert.equal(e.receipt.status, '0x0', "Will failure");
              }
            });

            describe('when withdrawal wait time has ended', () => {

              it('should be possible for a user the withdraw', async () => {
                const time = await this.tokenSale.userWithdrawalStartTime();
                await sleepSec(time.plus(2).sub(getUnixTime()).toNumber());

                const tx = await this.tokenSale.withdrawal({from: user2});

                assert.equal(tx.receipt.status, '0x1', "Will Success");

                const tx2 = await this.tokenSale.withdrawal({from: user3});
                assert.equal(tx2.receipt.status, '0x1', "Will Success");
              });

              it('should not be possible to clear the token sale', async () => {
                try {
                  const tx = await this.tokenSale.clear(0, 0);
                } catch(ex) {
                  assert.equal(ex.receipt.status, '0x0', "Will failure");
                }
              });

              describe('when clear wait time has ended', () => {
                it('should be possible to clear the token', async () => {
                  const time = await this.tokenSale.clearStartTime();
                  //wating for clearStart
                  await sleepSec(time.plus(2).sub(getUnixTime()).toNumber());

                  const tx = await this.tokenSale.clear(0, 0);
                  assert.equal(tx.receipt.status, '0x1', "Will Success");
                });
              });
            });
          });
        });
      });
    });
  });
});