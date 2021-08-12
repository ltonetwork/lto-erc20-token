var Token = artifacts.require("./LTOToken.sol");
var BalanceCopier = artifacts.require("./BalanceCopier.sol");
var config = require("../config.json");
var tokenConfig = config.token;
var balanceCopyConfig = config.balanceCopy;

function convertDecimals(number, decimals) {
  if (!decimals) {
    decimals = tokenConfig.decimals;
  }
  return web3.toBigNumber(10).pow(decimals).mul(number);
}

module.exports = function(deployer, network, accounts) {
  if (!balanceCopyConfig) return;

  const oldToken = balanceCopyConfig.oldToken;
  const maxSupply = convertDecimals(tokenConfig.maxSupply);
  var tokenInstance = null;
  var balanceCopierInstance = null;

  return deployer.deploy(Token, tokenConfig.bridgeAddr, maxSupply)
      .then(() => {
        return deployer.deploy(BalanceCopier, oldToken, Token.address);
      })
      .then(() => {
        return Token.deployed();
      })
      .then(instance => {
        tokenInstance = instance;
        return BalanceCopier.deployed();
      })
      .then(instance => {
        balanceCopierInstance = instance;
      })
      .then(_ => tokenInstance.addPauser(BalanceCopier.address))
      .then(_ => {
        console.log(`Token: ${Token.address}`, `BalanceCopier: ${BalanceCopier.address}`);
      });
};
