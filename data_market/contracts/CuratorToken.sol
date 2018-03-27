pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/token/ERC20/MintableToken.sol";
import "zeppelin-solidity/contracts/token/ERC20/BurnableToken.sol";
/**
* Mintable token allowing the owner to create more tokens to distribute the votes 
*/

contract CuratorToken is MintableToken, BurnableToken {
  string public name = "CuratorCoin"; 
  string public symbol = "CC";
  uint public decimals = 0;
  uint public INITIAL_SUPPLY = 0;

  function  CuratorToken() public {
    totalSupply_ = INITIAL_SUPPLY;
    balances[msg.sender] = INITIAL_SUPPLY;
  }
}
