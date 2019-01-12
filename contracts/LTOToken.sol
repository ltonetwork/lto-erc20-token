pragma solidity ^0.4.24;

import 'openzeppelin-solidity/contracts/token/ERC20/ERC20.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol';
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Pausable.sol";


contract LTOToken is ERC20, ERC20Detailed, ERC20Burnable, ERC20Pausable {

  address public bridgeAddress;
  uint256 public bridgeBalance;
  mapping (address => bool) public intermediateAddresses;

  constructor(uint256 _initialSupply, address _bridgeAddress, uint256 _bridgeSupply)
    ERC20Detailed("LTO Network Token", "LTO", 8) public {
    _mint(msg.sender, _initialSupply);
    bridgeAddress = _bridgeAddress;
    bridgeBalance = _bridgeSupply;
  }

  modifier onlyBridge() {
    require(msg.sender == bridgeAddress);
    _;
  }

  function addIntermediateAddress(address _intermediate) public onlyBridge {
    require(_intermediate != address(0));
    require(balanceOf(_intermediate) == 0, "Intermediate balance should be 0");

    intermediateAddresses[_intermediate] = true;
  }

  function _transfer(address from, address to, uint256 value) internal {
    require(to != bridgeAddress);

    if (from == bridgeAddress) {
      require(!intermediateAddresses[to], "Bridge can't transfer to intermediate");
      require(value <= bridgeBalance);

      bridgeBalance = bridgeBalance.sub(value);
      _mint(from, value);
      super._transfer(from, to, value);
      return;
    }

    if (intermediateAddresses[to]) {
      bridgeBalance = bridgeBalance.add(value);
      super._transfer(from, to, value);
      _burn(to, value);
      return;
    }

    super._transfer(from, to, value);
  }

  function balanceOf(address owner) public view returns (uint256) {
    return super.balanceOf(owner);
  }
}