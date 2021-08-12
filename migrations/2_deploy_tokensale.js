var Token = artifacts.require("./LTOToken.sol");
var TokenSale = artifacts.require("./LTOTokenSale.sol");
var config = require("../config.json");
var tokenConfig = config.token;
var tokenSaleConfig = config.tokenSale;

function convertDecimals(number, decimals) {
  if (!decimals) {
    decimals = tokenConfig.decimals;
  }
  return web3.toBigNumber(10).pow(decimals).mul(number);
}

function getReceiverAddr(defaultAddr) {
  if(tokenSaleConfig.receiverAddr) {
    return tokenSaleConfig.receiverAddr;
  }
  return defaultAddr;
}

module.exports = function(deployer, network, accounts) {
  if (!tokenSaleConfig) return;

  var defaultAddr = accounts[0];
  var receiverAddr = getReceiverAddr(defaultAddr);
  var capListAddr = tokenSaleConfig.capListAddr || accounts[0];
  const maxSupply = convertDecimals(tokenConfig.maxSupply);
  var totalSaleAmount = convertDecimals(tokenSaleConfig.totalSaleAmount);
  var totalSupply = convertDecimals(tokenConfig.totalSupply);
  var startTime = web3.toBigNumber(tokenSaleConfig.startTime);
  var userWithdrawalDelaySec = web3.toBigNumber(tokenSaleConfig.userWithdrawalDelaySec);
  var clearDelaySec = web3.toBigNumber(tokenSaleConfig.clearDelaySec);
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
