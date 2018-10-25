/*

Used config

MNEMONIC
edit avoid behind drop fit mouse fly enable mandate world return circle



// 需要修改stages 里面的duration 以便快速测试
// 需要修改startTime 大概比当前时间晚2-3分钟 以便测试 未开始的流程
// 拷贝下列Config 到 config.json

{
    "token":{
        "totalSupply" : 57344000,
        "name" : "Fusion Token",
        "symbol" : "FSN",
        "decimals" : 18
    },
    "tokenSale":{
        "receiverAddr" : "0x48132E8f6f253B7Bab9E3BcFE7234209a0FB57A3",
        "totalSaleAmount" : 204800,        
        "stages" : [
            {"rate": 420, "duration":120},
            {"rate": 400, "duration":120}
        ],
        "startTime" : 大概比当前时间晚 2-3分钟 的 unix时间戳,
        "userWithdrawalDelaySec" : 60,
        "clearDelaySec" : 60
    }
}




*/

var Token = artifacts.require("./LTOToken.sol");
var TokenSale = artifacts.require("./LTOTokenSale.sol");
var config = require("../config.json");
var tokenConfig = config.token;
var tokenSaleConfig = config.tokenSale;
const { ethSendTransaction, ethGetBalance } = require('./helpers/web3');

var sleep = require('sleep-promise');

var gas = 2000000;
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

function getUnixTime(){
    return Math.round(new Date().getTime()/1000);
}

function sleepSec(sec){
    if(sec < 0){
        sec = 0;
    }
    console.log("Sleep :" + sec + " Sec");
    return sleep(sec * 1000); // sleep use ms
}

contract('Flow test', function(accounts) {
    var tokenInstance = null;
    var toknSaleInstance = null;
    var web;

    it("Contract Token will deployed", async () => {
        const instance = await Token.deployed();
        tokenInstance = instance;
        assert.notEqual(tokenInstance, null);
    });

    it("Contract TokenSale will deployed", async () => {
      var defaultAddr = accounts[0];
      var rates = [];
      var durations = [];
      var receiverAddr = getReceiverAddr(defaultAddr);
      var totalSaleAmount = convertDecimals(1000);
      var startTime = web3.toBigNumber(getUnixTime() + 2);
      var userWithdrawalDelaySec = web3.toBigNumber(2);
      var clearDelaySec = web3.toBigNumber(5);
      var rate = 400;
      var duration = 5;

      const tokenSale = await TokenSale.new(receiverAddr, Token.address, totalSaleAmount, startTime);

      tokenInstance.transfer(tokenSale.address, totalSaleAmount);

      const res = await tokenSale.startSale(rate, duration, userWithdrawalDelaySec, clearDelaySec);
      toknSaleInstance = tokenSale;
      assert.notEqual(toknSaleInstance, null);
    });

    it("Contract TokenSale Not Started Can't Buy", async () => {
        const time = await toknSaleInstance.startTime();
        assert(time > getUnixTime(), "The Start Time will after now for this Test");
        const transaction = {from: accounts[0], to: toknSaleInstance.address, value: convertDecimals(1, true), gas: gas};

        const hash = await ethSendTransaction(transaction);
        var receipt = web3.eth.getTransactionReceipt(hash);
        assert.equal(receipt.status, '0x0', "The Transaction will failure before starTime");
    });

    it("Contract TokenSale Started Can Buy", async () => {
        const time = await toknSaleInstance.startTime();
        console.log("StartTime:", time.toNumber());
        //wating for starting
        await sleepSec(time.plus(2).sub(getUnixTime()).toNumber());

        console.log("Now:", getUnixTime());
        const transaction = {from: accounts[0], to: toknSaleInstance.address, value: convertDecimals(1, true), gas: gas};
        var hash  = await ethSendTransaction(transaction);
        var receipt = web3.eth.getTransactionReceipt(hash);
        assert.equal(receipt.status, '0x1', "The Transaction will success after startTime");
        let count = await toknSaleInstance.getPurchaserCount();
        assert.equal(count.toNumber(), 1);
        hash  = await ethSendTransaction({from: accounts[1], to: toknSaleInstance.address, value: convertDecimals(1, true), gas: gas});
        receipt = web3.eth.getTransactionReceipt(hash);
        assert.equal(receipt.status, '0x1', "The Transaction will success after startTime");

        hash  = await ethSendTransaction({from: accounts[2], to: toknSaleInstance.address, value: convertDecimals(1, true), gas: gas});
        receipt = web3.eth.getTransactionReceipt(hash);
        assert.equal(receipt.status, '0x1', "The Transaction will success after startTime");
    });


    it("When Opening Time Can't withdrawal", async () => {
        const count = await toknSaleInstance.getPurchaserCount();
        assert.equal(count.toNumber(), 3);
        try {
          const tx = await toknSaleInstance.withdrawalFor(1, 2);
        } catch (e) {
          assert.equal(e.receipt.status, '0x0', "Will failure");
        }
    });

    it("Ended Can withdrawal", async () => {
        const time = await toknSaleInstance.endTime();
        console.log("EndTime:", time.toNumber());
        let balance = await tokenInstance.balanceOf(accounts[1]);
        console.log("Balance account one before: ", balance.toNumber());
        //wating for End
        await sleepSec(time.plus(2).sub(getUnixTime()).toNumber());
        const tx = await toknSaleInstance.withdrawalFor(1, 2);
        assert.equal(tx.receipt.status, '0x1', "Will Success");
        balance = await tokenInstance.balanceOf(accounts[1]);
        console.log("Balance account one: ", balance.toNumber());
        // assert.equal(balance.toNumber(), 1);
    });

    it("Ended Can't buy", async () => {
        var hash  = await ethSendTransaction({from: accounts[0], to: toknSaleInstance.address, value: convertDecimals(1, true), gas: gas});
        var receipt = web3.eth.getTransactionReceipt(hash);
        assert.equal(receipt.status, '0x0', "The Transaction will failure after Ended");
    });

    it("Contract UserWithdrawal Not Started User Can't Withdrawal", async () => {
      try {
        const tx = await toknSaleInstance.withdrawal();
      } catch(e) {
        assert.equal(e.receipt.status, '0x0', "Will failure");
      }
    });

    it("Contract UserWithdrawal Started User Can Withdrawal", async () => {
        const time = await toknSaleInstance.userWithdrawalStartTime();
        console.log("UserWithdrawalStartTime:", time.toNumber());
        await sleepSec(time.plus(2).sub(getUnixTime()).toNumber());

        let balance = await tokenInstance.balanceOf(accounts[0]);
        console.log("Balance account two before: ", balance.toNumber());

        console.log("Now:", getUnixTime());
        const tx = await toknSaleInstance.withdrawal();

        assert.equal(tx.receipt.status, '0x1', "Will Success");

        balance = await tokenInstance.balanceOf(accounts[0]);
        console.log("Balance account two: ", balance.toNumber());

        const tx2 = await toknSaleInstance.withdrawalFor(2, 3);
        assert.equal(tx2.receipt.status, '0x1', "Will Success");

        balance = await tokenInstance.balanceOf(accounts[2]);
        console.log("Balance account two: ", balance.toNumber());
    });

    it("Contract Clear Not Started Admin Can't Clear", async () => {
        try {
          const tx = await toknSaleInstance.clear(0, 0);
        } catch(ex) {
          assert.equal(ex.receipt.status, '0x0', "Will failure");
        }
    });

    it("Contract Clear Started Admin Can Clear", async () => {
        const time = await toknSaleInstance.clearStartTime();
        console.log("ClearStartTime:", time.toNumber());
        //wating for clearStart
        await sleepSec(time.plus(2).sub(getUnixTime()).toNumber());
        console.log("Now:", getUnixTime());
        const tx = await toknSaleInstance.clear(0, 0);
        assert.equal(tx.receipt.status, '0x1', "Will Success");
    });
});

