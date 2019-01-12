const Token = artifacts.require("./LTOToken.sol");
const TokenSale = artifacts.require("./LTOTokenSale.sol");
const config = require('../config');
const tokenConfig = config.token;

const addresses = require('./addresses');

module.exports = async (done) => {
  try {
    const token = Token.at(addresses.token);
    const tokenSale = TokenSale.at(addresses.tokenSale);

    const totalSupply = (await token.totalSupply()).div(10**8);
    const keepAmount = (await token.balanceOf(addresses.owner)).div(10**8);
    const bridgeAmount = (await token.bridgeBalance()).div(10**8);

    console.log('Total Supply: ', totalSupply.toString());
    console.log('Keep amount: ', keepAmount.toString());
    console.log('Bridge Balance: ', bridgeAmount.toString());
    console.log('');

    const nrOfPurchasers = await tokenSale.getPurchaserCount();
    const nrOfTransactions = await tokenSale.nrOfTransactions();
    const currentBonus = await tokenSale.currentBonus();
    const startTime = await tokenSale.startTime();
    const endTime = await tokenSale.endTime();
    const bonusEndTime = await tokenSale.bonusEndTime();
    const userWithdrawalStartTime = await tokenSale.userWithdrawalStartTime();
    const clearStartTime = await tokenSale.clearStartTime();

    const globalAmount = (await tokenSale.globalAmount()).div(10**18);
    const totalSaleAmount = (await tokenSale.totalSaleAmount()).div(10**8);
    const totalWannaBuy = (await tokenSale.totalWannaBuyAmount()).div(10**8);

    console.log('StartTime: ', (new Date(startTime.toNumber() * 1000)).toUTCString());
    console.log('EndTime: ', (new Date(endTime.toNumber() * 1000)).toUTCString());
    console.log('BonusEndTime: ', (new Date(bonusEndTime.toNumber() * 1000)).toUTCString());
    console.log('UserWithDrawStartTime: ', (new Date(userWithdrawalStartTime.toNumber() * 1000)).toUTCString());
    console.log('ClearStartTime: ', (new Date(clearStartTime.toNumber() * 1000)).toUTCString());
    console.log('');

    console.log('Nr of purchasers: ', nrOfPurchasers.toString());
    console.log('Nr of Transactions: ', nrOfTransactions.toString());
    console.log('CurrentBonus: ', currentBonus.toString());
    console.log('');

    console.log('Received Eth: ', globalAmount.toString());
    console.log('Total Wanna Buy: ', totalWannaBuy.toString());
    console.log('Total Sale Amount: ', totalSaleAmount.toString());
    done(null);
  } catch(err) {
    done(err);
  }
};