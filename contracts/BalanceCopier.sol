pragma solidity ^0.4.24;

import 'openzeppelin-solidity/contracts/token/ERC20/ERC20.sol';
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Pausable.sol";
import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';
import './ERC20PreMint.sol';

/**
 * @title Get the balance of an ERC20 contract to mint tokens for a pre-mintable ERC20 contract
 **/
contract BalanceCopier is Ownable {
    ERC20Pausable oldToken;
    ERC20PreMint newToken;

    mapping (address => bool) copied;

    constructor(ERC20Pausable _oldToken, ERC20PreMint _newToken) public {
        oldToken = _oldToken;
        newToken = _newToken;
    }

    modifier whenBothPaused() {
        require(oldToken.paused(), "Old ERC20 contract is not paused");
        require(!newToken.minted(), "New ERC20 token is already pre-minted");
        _;
    }

    function copy(address _holder) public whenBothPaused {
        require(!copied[_holder], 'Already copied balance of this account');
        _copyBalance(_holder);
    }

    function copyAll(address[] _holders) public whenBothPaused {
        uint length = _holders.length;

        for (uint i=0; i < length; i++) if (!copied[_holders[i]]) {
            _copyBalance(_holders[i]);
        }
    }

    function done() public onlyOwner {
        newToken.unpause();
        newToken.renouncePauser();
    }

    function _copyBalance(address _holder) internal {
        uint256 balance = oldToken.balanceOf(_holder);
        newToken.mint(_holder, balance);

        copied[_holder] = true;
    }
}
