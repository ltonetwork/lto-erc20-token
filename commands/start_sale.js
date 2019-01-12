const Token = artifacts.require("./LTOToken.sol");
const TokenSale = artifacts.require("./LTOTokenSale.sol");
const config = require('../config');
const tokenSaleConfig = config.tokenSale;

const addresses = require('./addresses');

module.exports = async (done) => {
  try {

    const tokenSale = TokenSale.at(addresses.tokenSale);
    const startTime = await tokenSale.startTime();
    if (startTime.toNumber() == 0) {

      console.log('Gonna start sale');
      const startTime = web3.toBigNumber(tokenSaleConfig.startTime);
      const userWithdrawalDelaySec = web3.toBigNumber(tokenSaleConfig.userWithdrawalDelaySec);
      const clearDelaySec = web3.toBigNumber(tokenSaleConfig.clearDelaySec);

      const tx = await tokenSale.startSale(startTime, tokenSaleConfig.rate, tokenSaleConfig.duration, tokenSaleConfig.bonusDuration, tokenSaleConfig.bonusPercentage, tokenSaleConfig.bonusDecreaseRate, userWithdrawalDelaySec, clearDelaySec);
      console.log(tx);

    } else {
      console.log('StartTime sale is already set')
    }

    done(null);
  } catch(err) {
    done(err);
  }
};