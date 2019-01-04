pragma solidity ^0.4.24;

import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';

contract FakeWallet is Ownable {

  function buyTokens(address tokenSale, uint256 amount) public {
    tokenSale.call.value(amount)();
  }

  function () payable public {
    if (!isOwner()) {
      revert();
    }
  }
}
