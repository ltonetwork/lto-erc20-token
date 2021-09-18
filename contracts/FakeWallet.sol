pragma solidity ^0.4.24;

import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';
import "./LTOTokenSale.sol";

contract FakeWallet is Ownable {

  function buyTokens(address tokenSale, uint256 amount) public {
    bool success = tokenSale.call.value(amount)();
    require(success, "Failed to buy tokens, aborting.");
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
