pragma solidity ^0.4.24;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import 'zeppelin-solidity/contracts/token/ERC20/SafeERC20.sol';


/**
 * @title ERC20 LTO Network token
 * @dev see https://github.com/legalthings/tokensale
 */
contract LTOTokenSale is Ownable {

  using SafeMath for uint256;
  using SafeERC20 for ERC20;

  ERC20 public token;
  address public receiverAddr;
  uint256 public totalSaleAmount;
  uint256 public totalWannaBuyAmount;
  uint256 public startTime;
  uint256 public bonusEndTime;
  uint256 public bonusPercentage;
  uint256 public bonusDecreaseRate;
  uint256 public endTime;
  uint256 public userWithdrawalStartTime;
  uint256 public clearStartTime;
  uint256 public withdrawn;
  uint256 public proportion = 1 ether;
  uint256 public globalAmount;
  uint256 public rate;
  uint256 public nrOfTransactions = 0;

  struct PurchaserInfo {
    bool withdrew;
    bool recorded;
    uint256 amount;
    uint256 bonus;
  }
  mapping(address => PurchaserInfo) public purchaserMapping;
  address[] public purchaserList;

  modifier onlyOpenTime {
    require(isStarted());
    require(!isEnded());
    _;
  }

  modifier onlyAutoWithdrawalTime {
    require(isEnded());
    _;
  }

  modifier onlyUserWithdrawalTime {
    require(isUserWithdrawalTime());
    _;
  }

  modifier purchasersAllWithdrawn {
    require(withdrawn==purchaserList.length);
    _;
  }

  modifier onlyClearTime {
    require(isClearTime());
    _;
  }

  constructor(address _receiverAddr, ERC20 _token, uint256 _totalSaleAmount) public {
    require(_receiverAddr != address(0));
    require(_token != address(0));
    require(_totalSaleAmount > 0);

    receiverAddr = _receiverAddr;
    token = _token;
    totalSaleAmount = _totalSaleAmount;
  }

  function isStarted() public view returns(bool) {
    return 0 < startTime && startTime <= now && endTime != 0;
  }

  function isEnded() public view returns(bool) {
    return now > endTime;
  }

  function isUserWithdrawalTime() public view returns(bool) {
    return now > userWithdrawalStartTime;
  }

  function isClearTime() public view returns(bool) {
    return now > clearStartTime;
  }

  function isBonusPeriod() public view returns(bool) {
    return now >= startTime && now <= bonusEndTime;
  }

  function startSale(uint256 _startTime, uint256 _rate, uint256 duration,
    uint256 bonusDuration, uint256 _bonusPercentage, uint256 _bonusDecreaseRate,
    uint256 userWithdrawalDelaySec, uint256 clearDelaySec) public onlyOwner {
    require(endTime == 0);
    require(_startTime > 0);
    require(_rate > 0);
    require(duration > 0);

    rate = _rate;
    bonusPercentage = _bonusPercentage;
    bonusDecreaseRate = _bonusDecreaseRate;
    startTime = _startTime;
    bonusEndTime = startTime.add(bonusDuration);
    endTime = startTime.add(duration);
    userWithdrawalStartTime = endTime.add(userWithdrawalDelaySec);
    clearStartTime = endTime.add(clearDelaySec);
  }

  function getPurchaserCount() public view returns(uint256) {
    return purchaserList.length;
  }


  function _calcProportion() internal {
    if (totalWannaBuyAmount == 0 || totalSaleAmount >= totalWannaBuyAmount) {
      proportion = 1 ether;
      return;
    }
    proportion = totalSaleAmount.mul(1 ether).div(totalWannaBuyAmount);
  }

  function getSaleInfo(address purchaser) public view returns (uint256, uint256, uint256) {
    PurchaserInfo storage pi = purchaserMapping[purchaser];
    uint256 sendEther = pi.amount;
    uint256 usedEther = sendEther.mul(proportion).div(1 ether);
    uint256 getToken = sendEther.add(pi.bonus).mul(proportion).div(1 ether).mul(rate).div(10**10);
    return (sendEther, usedEther, getToken);
  }

  function () payable public {
    buy();
  }

  function buy() payable public onlyOpenTime {
    require(msg.value >= 0.1 ether);

    uint256 amount = msg.value;
    PurchaserInfo storage pi = purchaserMapping[msg.sender];
    if (!pi.recorded) {
      pi.recorded = true;
      purchaserList.push(msg.sender);
    }
    pi.amount = pi.amount.add(amount);
    globalAmount = globalAmount.add(amount);
    if (isBonusPeriod()) {
      uint256 percentage = bonusPercentage.sub(bonusDecreaseRate.mul(nrOfTransactions));
      uint256 bonus = amount.div(10000).mul(percentage);
      pi.bonus = pi.bonus.add(bonus);
      amount = amount.add(bonus);
    }

    totalWannaBuyAmount = totalWannaBuyAmount.add(amount.mul(rate).div(10**10));
    _calcProportion();
    nrOfTransactions = nrOfTransactions.add(1);
  }

  function _withdrawal(address purchaser) internal {
    require(purchaser != 0x0);
    PurchaserInfo storage pi = purchaserMapping[purchaser];
    if (pi.withdrew || !pi.recorded) {
      return;
    }
    pi.withdrew = true;
    withdrawn = withdrawn.add(1);
    (uint256 sendEther, uint256 usedEther, uint256 getToken) = getSaleInfo(purchaser);
    if (usedEther > 0 && getToken > 0) {
      receiverAddr.transfer(usedEther);
      token.transfer(purchaser, getToken);
      if (sendEther.sub(usedEther) > 0) {
        purchaser.transfer(sendEther.sub(usedEther));
      }
    } else {
      purchaser.transfer(sendEther);
    }
    return;
  }

  function withdrawal() payable public onlyUserWithdrawalTime {
    _withdrawal(msg.sender);
  }

  function withdrawalFor(uint256 index, uint256 stop) payable public onlyAutoWithdrawalTime onlyOwner {
    for (; index < stop; index++) {
      _withdrawal(purchaserList[index]);
    }
  }

  function clear(uint256 tokenAmount, uint256 etherAmount) payable public purchasersAllWithdrawn onlyClearTime onlyOwner {
    if (tokenAmount > 0) {
      token.transfer(receiverAddr, tokenAmount);
    }
    if (etherAmount > 0) {
      receiverAddr.transfer(etherAmount);
    }
  }
}
