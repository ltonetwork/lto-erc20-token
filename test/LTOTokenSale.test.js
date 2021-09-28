const LTOToken = artifacts.require("./LTOToken.sol");
const LTOTokenSale = artifacts.require("./LTOTokenSale.sol");
const FakeWallet = artifacts.require("./FakeWallet.sol");
const config = require("../config.json");
const tokenConfig = config.token;
const tokenSaleConfig = config.tokenSale;
const { ethSendTransaction, ethGetBalance } = require('openzeppelin-solidity/test/helpers/web3');
const constants = require('./helpers/constants');
const { increaseTo, latest } = require('openzeppelin-solidity/test/helpers/time.js');
const BigNumber = require("bignumber.js");
const gas = 2000000;

function convertDecimals(number, ether) {
  const etherDecimals = 18;
  let decimals = tokenConfig.decimals;
  if (ether) {
    decimals = etherDecimals;
  }
  return new BigNumber(10).pow(decimals).mul(number);
}

function deconvertDecimals(number, decimals) {
  if (!decimals) {
    decimals = tokenConfig.decimals;
  }
  return number.div(new BigNumber(10).pow(decimals));
}

function getReceiverAddr(defaultAddr) {
  if(tokenSaleConfig.receiverAddr) {
    return tokenSaleConfig.receiverAddr;
  }
  return defaultAddr;
}

contract('LTOTokenSale', ([owner, bridge, user1, user2, user3, user4, user5, user6]) => {
  const rate = tokenSaleConfig.rate;
  const maxSupply = convertDecimals(tokenConfig.maxSupply);
  const tokenSupply = convertDecimals(tokenConfig.totalSupply);
  const totalSaleAmount = convertDecimals(tokenSaleConfig.totalSaleAmount);
  const keepAmount = tokenSupply.sub(totalSaleAmount);

  it('requires a token', () => {
    try {
      const sale = LTOTokenSale.new(owner, constants.ZERO_ADDRESS, tokenSupply, owner);
    } catch (ex) {
      assert.equal(ex.receipt.status, '0x0', 'Will failure');
    }
  });


  contract('with token', () => {
    before(async () => {
      this.token = await LTOToken.new(bridge, maxSupply);

      await this.token.mint(owner, tokenSupply);
      await this.token.unpause();
    });

    it('requires a token supply', () => {
      try {
        const sale = LTOTokenSale.new(owner, this.token, 0, owner);
      } catch (ex) {
        assert.equal(ex.receipt.status, '0x0', 'Will failure');
      }
    });

    it('requires a receiver address', () => {
      try {
        const sale = LTOTokenSale.new(constants.ZERO_ADDRESS, this.token, totalSaleAmount, owner);
      } catch (ex) {
        assert.equal(ex.receipt.status, '0x0', 'Will failure');
      }
    });

    context('once deployed (sold out token sale)', async () => {
      let startTime;  // for some weird reason using async statements here breaks `before` setup
      const userWithdrawalDelaySec = new BigNumber(tokenSaleConfig.userWithdrawalDelaySec);
      const clearDelaySec = new BigNumber(tokenSaleConfig.clearDelaySec);
      const bonusDuration = 0;
      const duration = tokenSaleConfig.duration;

      const bonusPercentage = 0;
      const bonusDecreaseRate = 0;

      before(async () => {
        startTime = (await latest()) + 5;
        this.tokenSale = await LTOTokenSale.new(owner, this.token.address, totalSaleAmount, owner);
      });

      describe('when the token sale is deployed', () => {

        it('should not start the sale if the sale did not receive the tokens yet', async () => {
          try {
            await this.tokenSale.startSale(startTime, rate, duration, bonusDuration, bonusPercentage, bonusDecreaseRate, userWithdrawalDelaySec, clearDelaySec);
          } catch (ex) {
            assert.equal(ex.receipt.status, '0x0', 'Will failure');
          }
        });

        it('should have correct initial info before start', async () => {
          const address = await this.tokenSale.token();
          assert.equal(address, this.token.address);

          const receiverAddress = await this.tokenSale.receiverAddr();
          assert.equal(receiverAddress.toLowerCase(), owner);

          const amount = await this.tokenSale.totalSaleAmount();
          assert(amount.equals(totalSaleAmount));

          const actualAmount = await this.token.balanceOf(this.tokenSale.address);
          assert(actualAmount.equals(new BigNumber(0)));

          assert.isFalse(await this.tokenSale.isStarted());
          assert.isFalse(await this.tokenSale.isEnded());
          assert.isFalse(await this.tokenSale.isUserWithdrawalTime());
          assert.isFalse(await this.tokenSale.isClearTime());
        });

        describe('when the token sale start date is set', () => {

          before(async () => {
            await this.token.transfer(this.tokenSale.address, totalSaleAmount);
            await this.tokenSale.startSale(startTime, rate, duration, bonusDuration, bonusPercentage, bonusDecreaseRate, userWithdrawalDelaySec, clearDelaySec);
          });

          it('should have the correct info', async () => {
            const address = await this.tokenSale.token();
            assert.equal(address, this.token.address);

            const receiverAddress = await this.tokenSale.receiverAddr();
            assert.equal(receiverAddress.toLowerCase(), owner);

            const amount = await this.tokenSale.totalSaleAmount();
            assert(totalSaleAmount.equals(amount));

            const actualAmount = await this.token.balanceOf(this.tokenSale.address);
            assert(totalSaleAmount.equals(actualAmount));

            assert.isFalse(await this.tokenSale.isStarted());
            assert.isFalse(await this.tokenSale.isEnded());
            assert.isFalse(await this.tokenSale.isUserWithdrawalTime());
            assert.isFalse(await this.tokenSale.isClearTime());

            const time = await this.tokenSale.startTime();
            assert(time.equals(startTime));

            const promises = [];
            promises.push(this.tokenSale.endTime());
            promises.push(this.tokenSale.userWithdrawalStartTime());
            promises.push(this.tokenSale.clearStartTime());
            const times = await Promise.all(promises);

            endTime = new BigNumber(startTime);
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
            assert(time > (await latest()), "The Start Time will after now for this Test");
            const transaction = {from: owner, to: this.tokenSale.address, value: convertDecimals(1, true)};

            const hash = await ethSendTransaction(transaction);
            const receipt = web3.eth.getTransactionReceipt(hash);
            assert.equal(receipt.status, '0x0', "The Transaction will failure before starTime");
          });

          describe('When token sale has started', () => {
            it('should accept payments up to 40 ether', async () => {
              const time = await this.tokenSale.startTime();
              //wating for starting
              await increaseTo(time.plus(2));

              let hash = await ethSendTransaction({
                from: user1,
                to: this.tokenSale.address,
                value: convertDecimals(1, true),
                gas: gas
              });
              let receipt = web3.eth.getTransactionReceipt(hash);
              assert.equal(receipt.status, '0x1', "The Transaction will success after startTime");
              assert((await this.tokenSale.totalWannaBuyAmount()).equals(convertDecimals(rate)));

              assert((await ethGetBalance(this.tokenSale.address)).equals(convertDecimals(1, true)));

              let [sendEther, usedEther, getToken] = await this.tokenSale.getPublicSaleInfo(user1);
              assert(sendEther.equals(convertDecimals(1, true)));
              assert(usedEther.equals(convertDecimals(1, true)));
              assert(getToken.equals(convertDecimals(rate)));

              let purchaser = await this.tokenSale.purchaserList(0);
              assert.equal(purchaser, user1);

              hash = await ethSendTransaction({
                from: user2,
                to: this.tokenSale.address,
                value: convertDecimals(1, true),
                gas: gas
              });
              receipt = web3.eth.getTransactionReceipt(hash);
              assert.equal(receipt.status, '0x1', "The Transaction will success after startTime");

              assert((await this.tokenSale.totalWannaBuyAmount()).equals(convertDecimals(2 * rate)));

              purchaser = await this.tokenSale.purchaserList(1);
              assert.equal(purchaser, user2);

              hash = await ethSendTransaction({
                from: user3,
                to: this.tokenSale.address,
                value: convertDecimals(1, true),
                gas: gas
              });
              receipt = web3.eth.getTransactionReceipt(hash);
              assert.equal(receipt.status, '0x1', "The Transaction will success after startTime");

              assert((await this.tokenSale.totalWannaBuyAmount()).equals(convertDecimals(3 * rate)));

              purchaser = await this.tokenSale.purchaserList(2);
              assert.equal(purchaser, user3);

              const count = await this.tokenSale.getPurchaserCount();
              assert.equal(count.toNumber(), 3);

              hash = await ethSendTransaction({
                from: user4,
                to: this.tokenSale.address,
                value: convertDecimals(175, true),
                gas: gas
              });
              receipt = web3.eth.getTransactionReceipt(hash);
              assert.equal(receipt.status, '0x1', "The Transaction will success after startTime");

              assert((await this.tokenSale.totalWannaBuyAmount()).equals(convertDecimals(43 * rate)));

              purchaser = await this.tokenSale.purchaserList(3);
              assert.equal(purchaser, user4);

              [sendEther, usedEther, getToken] = await this.tokenSale.getPublicSaleInfo(user4);
              assert(sendEther.equals(convertDecimals(40, true)));
              assert(usedEther.equals(convertDecimals(40, true)));
              assert(getToken.equals(convertDecimals(40 * rate)));

              hash = await ethSendTransaction({
                from: user4,
                to: this.tokenSale.address,
                value: convertDecimals(1, true),
                gas: gas
              });
              receipt = web3.eth.getTransactionReceipt(hash);
              assert.equal(receipt.status, '0x0', "The Transaction will success after startTime");

              hash = await ethSendTransaction({
                from: user3,
                to: this.tokenSale.address,
                value: convertDecimals(200, true),
                gas
              });
              receipt = web3.eth.getTransactionReceipt(hash);
              assert.equal(receipt.status, '0x1', "The Transaction will success after startTime");

              assert((await this.tokenSale.totalWannaBuyAmount()).equals(convertDecimals(82 * rate)));

              [sendEther, usedEther, getToken] = await this.tokenSale.getPublicSaleInfo(user3);
              assert(sendEther.equals(convertDecimals(40, true)));
            });

            it('should accept payment from a smart contract', async () => {
              this.wallet = await FakeWallet.new({from: user6});
              let hash = await ethSendTransaction({
                from: user6,
                to: this.wallet.address,
                value: convertDecimals(1, true),
                gas: gas
              });

              try {
                const tx = await this.wallet.buyTokens(this.tokenSale.address, convertDecimals(1, true), {from: user6});
              } catch (err) {
                console.log(err);
              }
              purchaser = await this.tokenSale.purchaserList((await this.tokenSale.getPurchaserCount()).toNumber() - 1);
              assert.equal(purchaser, this.wallet.address);
            });

            it('should not be possible to add cap free users other then the assigned address', async () => {
              try {
                const tx = await this.tokenSale.addCapFreeAddress(user5, {from: user1});
              } catch (e) {
                assert.equal(e.receipt.status, '0x0', "Will failure");
              }
            });

            it('should be possible to add cap free users from the assigned address', async () => {
              try {
                const tx = await this.tokenSale.addCapFreeAddress(user5);
                assert.equal(tx.receipt.status, '0x1', "Will success");
              } catch (e) {
                console.log(e);
              }
            });

            it('should accept payments larger then 40 eth from cap free users', async () => {
              hash = await ethSendTransaction({
                from: user5,
                to: this.tokenSale.address,
                value: convertDecimals(175, true),
                gas: gas
              });
              receipt = web3.eth.getTransactionReceipt(hash);
              assert.equal(receipt.status, '0x1', "The Transaction will success after startTime");

              assert((await this.tokenSale.totalWannaBuyAmount()).equals(convertDecimals(258 * rate)));

              purchaser = await this.tokenSale.purchaserList((await this.tokenSale.getPurchaserCount()).toNumber() - 1);
              assert.equal(purchaser, user5);

              [sendEther, usedEther, getToken] = await this.tokenSale.getPublicSaleInfo(user5);
              assert(sendEther.equals(convertDecimals(175, true)));
              assert(usedEther.equals(convertDecimals(175, true)));
              assert(getToken.equals(convertDecimals(175 * rate)));
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
              } catch (e) {
                assert.equal(e.receipt.status, '0x0', "Will failure");
              }
            });

            describe('when sale has ended', () => {
              it('should allow admin withdrawals', async () => {
                const time = await this.tokenSale.endTime();
                let balance = await this.token.balanceOf(user1);
                assert(balance.equals(0));

                const tokenSaleBalance = await this.token.balanceOf(this.tokenSale.address);
                assert(totalSaleAmount.equals(tokenSaleBalance));
                //wating for End
                await increaseTo(time.plus(2));

                try {
                  const tx = await this.tokenSale.withdrawalFor(0, 1);
                  assert.equal(tx.receipt.status, '0x1', "Will Success");

                  const balance = await this.token.balanceOf(user1);
                  assert(balance.equals(convertDecimals(rate)));

                  const tokenSaleBalance = await this.token.balanceOf(this.tokenSale.address);
                  const expectedBalance = totalSaleAmount.sub(convertDecimals(rate));
                  assert(expectedBalance.equals(tokenSaleBalance));
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
                  await increaseTo(time.plus(2));

                  const tx = await this.tokenSale.withdrawal({from: user2});

                  assert.equal(tx.receipt.status, '0x1', "Will Success");

                  const tx2 = await this.tokenSale.withdrawal({from: user3});
                  assert.equal(tx2.receipt.status, '0x1', "Will Success");

                  const tx3 = await this.tokenSale.withdrawal({from: user4});
                  assert.equal(tx3.receipt.status, '0x1', "Will Success");

                  const tx4 = await this.tokenSale.withdrawal({from: user5});
                  assert.equal(tx4.receipt.status, '0x1', "Will Success");
                });

                it('should be possible to withdraw the remaining purchasers', async () => {
                  const remainingCount = (await this.tokenSale.getPurchaserCount()).toNumber();
                  const tx5 = await this.tokenSale.withdrawalFor(0, remainingCount);
                  assert.equal(tx5.receipt.status, '0x1', "Will Success");
                });

                it('should not be possible to clear the token sale', async () => {
                  try {
                    const tx = await this.tokenSale.clear(0, 0);
                  } catch (ex) {
                    assert.equal(ex.receipt.status, '0x0', "Will failure");
                  }
                });

                describe('when clear wait time has ended', () => {
                  it('should be possible to clear the token', async () => {
                    const time = await this.tokenSale.clearStartTime();
                    //wating for clearStart
                    await increaseTo(time.plus(2));

                    // Verify if token sale has the expected remaing tokens
                    const remainingTokens = totalSaleAmount.sub(convertDecimals(258 * rate));
                    assert((await this.token.balanceOf(this.tokenSale.address)).equals(remainingTokens));

                    // Verify if the token sale has the expected ether
                    const etherBalance = await ethGetBalance(this.tokenSale.address);
                    assert(etherBalance.equals(0));

                    const tx = await this.tokenSale.clear(remainingTokens, 0);
                    assert.equal(tx.receipt.status, '0x1', "Will Success");

                    const remainingSupply = await this.token.totalSupply();
                    assert(remainingSupply.equals(convertDecimals(258 * rate)));
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});
