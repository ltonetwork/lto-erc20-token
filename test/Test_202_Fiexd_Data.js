var Token = artifacts.require("./LEGALToken");
var TokenSale = artifacts.require("./ShareTokenSale");
var config = require("../config.json");
var tokenConfig = config.token;
var tokenSaleConfig = config.tokenSale;

var sleep = require('sleep-promise');

var gas = 2000000;

function convertDecimals(number) {    
    return web3.toBigNumber(10).pow(tokenConfig.decimals).mul(number);
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

contract('Fiexd Data test', function(accounts) {
    var tokenInstance = null;
    var toknSaleInstance = null;

    it("Contract Token will deployed", () => {
        return Token.deployed()
        .then(instance => {
            tokenInstance = instance;
            assert.notEqual(tokenInstance, null);
        });
    });

    it("Contract TokenSale will deployed", () => {
        return TokenSale.deployed()
        .then(instance => {
            toknSaleInstance = instance;
            assert.notEqual(toknSaleInstance, null);
        });
    });

    it("Contract TokenSale Fiexd Data Will be correct", () => {
        return toknSaleInstance.startTime().then(time => {            
            console.log("StartTime:", time.toNumber());
            //wating for starting
            return sleepSec(time.plus(2).sub(getUnixTime()).toNumber());
        })        
        .then(() => {
            var hash  = web3.eth.sendTransaction({from: accounts[0], to: toknSaleInstance.address, value: convertDecimals(90), gas: gas});            
            var receipt = web3.eth.getTransactionReceipt(hash);            
            assert.equal(receipt.status, '0x01', "The Transaction will success");


            hash  = web3.eth.sendTransaction({from: accounts[1], to: toknSaleInstance.address, value: convertDecimals(92), gas: gas});
            receipt = web3.eth.getTransactionReceipt(hash); 
            assert.equal(receipt.status, '0x01', "The Transaction will success");

            hash  = web3.eth.sendTransaction({from: accounts[2], to: toknSaleInstance.address, value: convertDecimals(95), gas: gas});
            receipt = web3.eth.getTransactionReceipt(hash); 
            assert.equal(receipt.status, '0x01', "The Transaction will success");

            hash  = web3.eth.sendTransaction({from: accounts[3], to: toknSaleInstance.address, value: convertDecimals(99), gas: gas});
            receipt = web3.eth.getTransactionReceipt(hash); 
            assert.equal(receipt.status, '0x01', "The Transaction will success");

            hash  = web3.eth.sendTransaction({from: accounts[4], to: toknSaleInstance.address, value: convertDecimals(94), gas: gas});
            receipt = web3.eth.getTransactionReceipt(hash); 
            assert.equal(receipt.status, '0x01', "The Transaction will success");

            hash  = web3.eth.sendTransaction({from: accounts[5], to: toknSaleInstance.address, value: convertDecimals(93), gas: gas});
            receipt = web3.eth.getTransactionReceipt(hash); 
            assert.equal(receipt.status, '0x01', "The Transaction will success");


            return toknSaleInstance.stages(0);
        })
        .then(stage => {            
             //wating for early bird to end
             return sleepSec(stage[1].plus(stage[2]).plus(2).sub(getUnixTime()).toNumber());
        })
        .then(() => {
            var hash  = web3.eth.sendTransaction({from: accounts[6], to: toknSaleInstance.address, value: convertDecimals(78), gas: gas});            
            var receipt = web3.eth.getTransactionReceipt(hash);            
            assert.equal(receipt.status, '0x01', "The Transaction will success");

            hash  = web3.eth.sendTransaction({from: accounts[7], to: toknSaleInstance.address, value: convertDecimals(87), gas: gas});
            receipt = web3.eth.getTransactionReceipt(hash); 
            assert.equal(receipt.status, '0x01', "The Transaction will success");

            hash  = web3.eth.sendTransaction({from: accounts[8], to: toknSaleInstance.address, value: convertDecimals(34), gas: gas});
            receipt = web3.eth.getTransactionReceipt(hash); 
            assert.equal(receipt.status, '0x01', "The Transaction will success");

            hash  = web3.eth.sendTransaction({from: accounts[9], to: toknSaleInstance.address, value: convertDecimals(56), gas: gas});
            receipt = web3.eth.getTransactionReceipt(hash); 
            assert.equal(receipt.status, '0x01', "The Transaction will success");

            return toknSaleInstance.endTime();
        })
        .then(time => {            
            console.log("EndTime:", time.toNumber());
            //wating for to end
            return sleepSec(time.plus(2).sub(getUnixTime()).toNumber());
        })
        .then((tx) => {            
            return toknSaleInstance.proportion();
        })
        .then(p => {
            console.log(p);
            var promises = [];
            for(var i = 0; i < accounts.length; i++){
                promises.push(toknSaleInstance.getSaleInfo(accounts[i]));
            }
            return Promise.all(promises);
        })
        .then(infos => {
            for(var i = 0; i < infos.length; i++){
                console.log(infos[i]);
            }
            return toknSaleInstance.withdrawalFor(0,10);
        })
        .then((tx) => {            
            assert.equal(tx.receipt.status, '0x01', "Will success");
            var promises = [];
            for(var i = 0; i < accounts.length; i++){
                promises.push(tokenInstance.balanceOf(accounts[i]));
            }
            return Promise.all(promises);
        })
        .then(balances => {
            for(var i = 0; i < accounts.length; i++){
                console.log(balances[i]);
                console.log(web3.eth.getBalance(accounts[i]))
            }            
        });

        // 人工检查，随机数据请用 Random
    })
});

