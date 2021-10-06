pragma solidity ^0.4.0;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";

contract ERC20Swap is ERC20 {
    using SafeERC20 for IERC20;
    using ERC20Burnable for IERC20;

    IERC20 public swapToken;

    constructor(IERC20[] _swapToken) public {
        swapToken = _swapToken;
    }

    function swap() public {
        address holder = address(msg.sender);
        uint256 amount = swapToken.allowance(amount, address(this));

        require(amount > 0, "No allowance");

        swapToken.burnFrom(holder, amount);
        _mint(holder, amount);
    }
}
