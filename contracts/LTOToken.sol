pragma solidity ^0.4.24;

import 'openzeppelin-solidity/contracts/token/ERC20/ERC20.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol';
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Pausable.sol";
import "./ERC20PreMint.sol";

contract LTOToken is ERC20, ERC20Detailed, ERC20Burnable, ERC20Pausable, ERC20PreMint {

  uint8 constant PENDING_BRIDGE = 1;
  uint8 constant PENDING_CONFIRM = 2;

  address public bridgeAddress;
  uint256 public bridgeBalance;
  mapping (address => uint8) public intermediatePending;
  mapping (address => bool) public intermediateAddresses;

  constructor(address _bridgeAddress, uint256 _bridgeSupply)
      ERC20Detailed("LTO Network Token", "LTO", 8) public {
    require(_bridgeAddress != 0);

    bridgeAddress = _bridgeAddress;
    bridgeBalance = _bridgeSupply;
  }

  modifier onlyBridge() {
    require(msg.sender == bridgeAddress);
    _;
  }

  function addIntermediateAddress(address _intermediate) public onlyBridge {
    require(_intermediate != address(0));

    if (intermediatePending[_intermediate] == PENDING_BRIDGE) {
      _addIntermediate(_intermediate);
    } else {
      intermediatePending[_intermediate] = PENDING_CONFIRM;
    }
  }

  function confirmIntermediateAddress() public {
    require(msg.sender != address(0));

    if (intermediatePending[msg.sender] == PENDING_CONFIRM) {
      _addIntermediate(msg.sender);
    } else {
      intermediatePending[msg.sender] = PENDING_BRIDGE;
    }
  }

  function _addIntermediate(address _intermediate) internal {
    intermediateAddresses[_intermediate] = true;
    delete intermediatePending[_intermediate];

    uint256 balance = balanceOf(_intermediate);
    if (balance > 0) {
      bridgeBalance = bridgeBalance.add(balance);
      _burn(_intermediate, balance);
    }
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
}
