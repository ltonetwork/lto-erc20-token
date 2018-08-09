const Token = artifacts.require("./LegalToken");
const Sale = artifacts.require("./LegalCrowdsale");
const config = require("../config.json");
const moment = require("moment");

function convertDecimals(number) {
  return web3.toBigNumber(10).pow(config.token.decimals).mul(number);
}

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {
    const defaultAddr = accounts[0];
    const receiverAddr = config.sale.receiver_address || defaultAddr;
    const totalSaleAmount = convertDecimals(config.sale.total_sale_amount);
    const totalSupply = convertDecimals(config.token.total_supply);
    const latestBlock = await web3.eth.getBlock('latest');
    const startTime = web3.toBigNumber(config.sale.start_time || moment.unix(latestBlock.timestamp).add(7, 'd').unix());
    const endTime = web3.toBigNumber(config.sale.end_time || moment.unix(latestBlock.timestamp).add(14, 'd').unix());
    const rate = web3.toBigNumber(config.sale.rate);
    const keepAmount = totalSupply.sub(totalSaleAmount);

    console.log('deploying token contract');
    await deployer.deploy(Token, totalSupply, config.token.name, config.token.symbol, config.token.decimals);

    console.log('deploying sale contract');
    await deployer.deploy(Sale, startTime, endTime, rate, receiverAddr, Token.address);

    const token = await Token.deployed();
    console.log(`done deploying token contract: ${token.address}`);

    const sale = await Sale.deployed();
    console.log(`done deploying sale contract: ${sale.address}`);

    console.log(`transfering totalSaleAmount: ${totalSaleAmount} to ${sale.address}`);
    await token.transfer(sale.address, totalSaleAmount);

    if (defaultAddr != receiverAddr) {
      console.log(`transfering keepAmount: ${keepAmount} to ${receiverAddr}`);
      await token.transfer(receiverAddr, keepAmount);
    }

    console.log('deployment successful');
  });
};
