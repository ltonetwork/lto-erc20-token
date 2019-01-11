pragma solidity ^0.4.24;

import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';
import "./LTOTokenSale.sol";

contract FakeWallet is Ownable {

  function buyTokens(address tokenSale, uint256 amount) public {
    tokenSale.call.value(amount)();
  }

  function () payable public {
    if (!isOwner()) {
      revert();
    }
  }

  function withdrawFailed(LTOTokenSale tokenSale, address alternativeAddress) public {
    tokenSale.withdrawFailed(alternativeAddress);
  }
}
