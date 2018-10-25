pragma solidity ^0.4.24;

import 'zeppelin-solidity/contracts/token/ERC20/StandardToken.sol';

contract LTOToken is StandardToken {

  uint256 internal internalTotalSupply;

  string public name;
  string public symbol;
  uint8 public decimals;
  address public bridgeAddress;

  mapping (address => address) internal intermediateAddresses;

  constructor(
    uint256 _initialSupply,
    string _tokenName,
    string _tokenSymbol,
    uint8 _decimals,
    address _bridgeAddress,
    uint256 _bridgeSupply
  ) public {
    internalTotalSupply = _initialSupply;
    totalSupply_ = _initialSupply - _bridgeSupply;
    balances[msg.sender] = _initialSupply - _bridgeSupply;
    balances[_bridgeAddress] = _bridgeSupply;
    name = _tokenName;
    symbol = _tokenSymbol;
    decimals = _decimals;
    bridgeAddress = _bridgeAddress;
  }

  modifier onlyBridge() {
    require(msg.sender == bridgeAddress);
    _;
  }

  /**
    * @dev Transfer token for a specified address
    * @param _to The address to transfer to.
    * @param _value The amount to be transferred.
    */
  function transfer(address _to, uint256 _value) public returns (bool) {
    require(_value <= balances[msg.sender]);
    require(_to != address(0));

    // Check if the _to contains a intermediate address
    // if so transfer to the bridge instead
    if (intermediateAddresses[_to] == _to) {
      _to = bridgeAddress;
    }

    balances[msg.sender] = balances[msg.sender].sub(_value);
    balances[_to] = balances[_to].add(_value);
    emit Transfer(msg.sender, _to, _value);

    recalculateTotalSupply();

    return true;
  }

  function recalculateTotalSupply() internal {
    totalSupply_ = internalTotalSupply - balances[bridgeAddress];
  }


  function addIntermediateAddress(address _intermediate) public onlyBridge {
    require(_intermediate != address(0));

    intermediateAddresses[_intermediate] = _intermediate;
  }
}