pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/token/ERC20/MintableToken.sol";
/**
* Mintable token allowing the owner to create more tokens to distribute the votes 
*/

contract CuratorToken is MintableToken {
  string public name = "CuratorCoin"; 
  string public symbol = "CC";
  uint public decimals = 0;
  uint public INITIAL_SUPPLY = 10000 * (10 ** decimals);

  function  CuratorToken() public {
    totalSupply_ = INITIAL_SUPPLY;
    balances[msg.sender] = INITIAL_SUPPLY;
  }
}
