/*
Any Config
*/



var Token = artifacts.require("./LTOToken.sol");
var TokenSale = artifacts.require("./LTOTokenSale.sol");
var config = require("../config.json");
var tokenConfig = config.token;
var tokenSaleConfig = config.tokenSale;
var etherDecimals = 18;

function convertDecimals(number, ether) {
    let decimals = tokenConfig.decimals;
    if (ether) {
      decimals = etherDecimals;
    }
    return web3.toBigNumber(10).pow(decimals).mul(number);
}

function getReceiverAddr(defaultAddr) {
    if(tokenSaleConfig.receiverAddr) {
        return tokenSaleConfig.receiverAddr;
    }
    return defaultAddr;
}


contract('Initial test', function(accounts) {

  var defaultAddr = accounts[0];
  var receiverAddr = getReceiverAddr(defaultAddr);
  var totalSaleAmount = convertDecimals(tokenSaleConfig.totalSaleAmount);
  var totalSupply = convertDecimals(tokenConfig.totalSupply);
  var bridgeSupply = convertDecimals(tokenConfig.bridgeSupply);
  var startTime = web3.toBigNumber(tokenSaleConfig.startTime);
  var keepAmount = (totalSupply.sub(totalSaleAmount)).sub(bridgeSupply);
  var tokenInstance = null;
  var toknSaleInstance = null;

  it("Contract Token will deployed", async () => {
    const instance = await Token.deployed();
    console.log('Token address: ', Token.address);
    tokenInstance = instance;
    assert.notEqual(tokenInstance, null);
  });

  it("Contract TokenSale will deployed", async() => {
    const instance = await TokenSale.deployed();
    console.log('TokenSale address: ', Token.address);
    toknSaleInstance = instance;
    assert.notEqual(toknSaleInstance, null);
  });

  it("Token Info will correct", async () => {
    const name = await tokenInstance.name();
    console.log('name:', name);
    assert.equal(name, tokenConfig.name);

    const symbol = await tokenInstance.symbol();
    console.log('symbol:', symbol);
    assert.equal(symbol, tokenConfig.symbol);

    const decimals = await tokenInstance.decimals();
    console.log('decimals:', decimals);
    assert(decimals.equals(tokenConfig.decimals));

    const totalSupply = await tokenInstance.totalSupply();
    console.log('totalSupply:', totalSupply);
    assert(totalSupply.equals(totalSupply));
  });

  it("Sale Info will correct", async () => {
    const address = await toknSaleInstance.token();

    console.log('Token Address:', address);
    assert.equal(address, tokenInstance.address);


    const receiverAddress = await toknSaleInstance.receiverAddr();
    console.log('Receiver Address:', receiverAddress);
    assert.equal(receiverAddress.toLowerCase(), receiverAddr.toLowerCase());


    const Amount = await toknSaleInstance.totalSaleAmount();
    console.log('Total Sale Amount:', Amount);
    assert(Amount.equals(totalSaleAmount));


    const time = await toknSaleInstance.startTime();
    console.log('Start Time:', time.toNumber());
    assert(time.equals(startTime));


    var promises = [];
    promises.push(toknSaleInstance.endTime());
    promises.push(toknSaleInstance.userWithdrawalStartTime());
    promises.push(toknSaleInstance.clearStartTime());
    const times = await Promise.all(promises);

    console.log('End Time:', times[0]);
    console.log('UserWithdrawalStartTime:', times[1]);
    console.log('ClearStartTime:', times[2]);
    endTime = web3.toBigNumber(startTime.toNumber());
    endTime = endTime.plus(tokenSaleConfig.duration);

    assert(times[0].equals(endTime));
    assert(times[1].equals(endTime.plus(tokenSaleConfig.userWithdrawalDelaySec)));
    assert(times[2].equals(endTime.plus(tokenSaleConfig.clearDelaySec)));

    const globalAmount = await toknSaleInstance.globalAmount();
    assert((await toknSaleInstance.rate()).equals(tokenSaleConfig.rate));
    const count = await toknSaleInstance.getPurchaserCount();

    assert(count.equals(0));
  });

  it("Token Balance will correct", async () => {
    let total = web3.toBigNumber(0);
    const balance = await tokenInstance.balanceOf(receiverAddr);
    assert(balance.equals(keepAmount));
    total = total.add(keepAmount);
    total = total.add(bridgeSupply);

    const newBalance = await tokenInstance.balanceOf(toknSaleInstance.address);
    assert(newBalance.equals(totalSaleAmount));
    total = total.add(totalSaleAmount);
    assert(total.equals(totalSupply));
  });
});