const Token = artifacts.require("./LTOToken.sol");
const TokenSale = artifacts.require("./LTOTokenSale.sol");
const config = require("../config.json");
const BigNumber = require("bignumber.js");
const tokenConfig = config.token;
const tokenSaleConfig = config.tokenSale;

function convertDecimals(number, decimals) {
  if (!decimals) {
    decimals = tokenConfig.decimals;
  }
  return new BigNumber(10).pow(decimals).mul(number);
}

function getReceiverAddr(defaultAddr) {
  if(tokenSaleConfig.receiverAddr) {
    return tokenSaleConfig.receiverAddr;
  }
  return defaultAddr;
}

module.exports = function(deployer, network, accounts) {
  if (!tokenSaleConfig || (process.env.LTO_DEPLOY || '').toLowerCase() === 'balancecopy') return;

  var defaultAddr = accounts[0];
  var receiverAddr = getReceiverAddr(defaultAddr);
  var capListAddr = tokenSaleConfig.capListAddr || accounts[0];
  const maxSupply = convertDecimals(tokenConfig.maxSupply);
  var totalSaleAmount = convertDecimals(tokenSaleConfig.totalSaleAmount);
  var totalSupply = convertDecimals(tokenConfig.totalSupply);
  var startTime = new BigNumber(tokenSaleConfig.startTime);
  var userWithdrawalDelaySec = new BigNumber(tokenSaleConfig.userWithdrawalDelaySec);
  var clearDelaySec = new BigNumber(tokenSaleConfig.clearDelaySec);
  var keepAmount = totalSupply.sub(totalSaleAmount);
  var tokenInstance = null;
  var tokenSaleInstance = null;

  var bonusPercentage = tokenSaleConfig.bonusPercentage;
  var bonusDecreaseRate = tokenSaleConfig.bonusDecreaseRate;

  return deployer.deploy(Token, tokenConfig.bridgeAddr, maxSupply)
      .then(function () {
        return deployer.deploy(TokenSale, receiverAddr, Token.address, totalSaleAmount, capListAddr);
      })
      .then(() => {
        return Token.deployed();
      })
      .then(instance => {
        tokenInstance = instance;
        return TokenSale.deployed();
      })
      .then(instance => {
        tokenSaleInstance = instance;
      })
      .then(_ => tokenInstance.mint(defaultAddr, totalSupply))
      .then(_ => tokenInstance.unpause())
      .then(_ => tokenInstance.transfer(tokenSaleInstance.address, totalSaleAmount))
      .then(_ => {
        return tokenSaleInstance.startSale(startTime, tokenSaleConfig.rate, tokenSaleConfig.duration, tokenSaleConfig.bonusDuration, bonusPercentage, bonusDecreaseRate, userWithdrawalDelaySec, clearDelaySec);
      })
      .then(_ => {
        if (defaultAddr != receiverAddr) {
          return tokenInstance.transfer(receiverAddr, keepAmount);
        }
      })
      .then(_ => {
        console.log(`Token: ${Token.address}`, `TokenSale: ${TokenSale.address}`);
      });
};
