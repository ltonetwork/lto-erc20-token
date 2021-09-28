const Token = artifacts.require("./LTOToken.sol");
const BalanceCopier = artifacts.require("./BalanceCopier.sol");
const config = require("../config.json");
const BigNumber = require("bignumber.js");
const tokenConfig = config.token;
const balanceCopyConfig = config.balanceCopy;

function convertDecimals(number, decimals) {
  if (!decimals) {
    decimals = tokenConfig.decimals;
  }
  return new BigNumber(10).pow(decimals).multipliedBy(number);
}

module.exports = function(deployer, network, accounts) {
  if (!balanceCopyConfig || (process.env.LTO_DEPLOY || '').toLowerCase() === 'tokensale') return;

  const oldToken = balanceCopyConfig.oldToken;
  const exclude = balanceCopyConfig.exclude;
  const maxSupply = convertDecimals(tokenConfig.maxSupply);
  var tokenInstance = null;
  var balanceCopierInstance = null;

  return deployer.deploy(Token, tokenConfig.bridgeAddr, maxSupply)
      .then(() => {
        return deployer.deploy(BalanceCopier, oldToken, Token.address, exclude);
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
