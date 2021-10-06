const Token = artifacts.require("./LTOToken.sol");
const BalanceCopier = artifacts.require("./BalanceCopier.sol");
const config = require("../config.json");
const BigNumber = require("bignumber.js");
const tokenConfig = config.token;

function convertDecimals(number, decimals) {
  if (!decimals) {
    decimals = tokenConfig.decimals;
  }
  return new BigNumber(10).pow(decimals).multipliedBy(number);
}

module.exports = async function(deployer, network, accounts) {

  const oldTokenAddr = tokenConfig.oldToken;
  const maxSupply = convertDecimals(tokenConfig.maxSupply);

  await deployer.deploy(Token, tokenConfig.bridgeAddr, maxSupply, oldTokenAddr);
  await Token.deployed();
};
