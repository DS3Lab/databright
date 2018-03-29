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

  function burnFrom(address acct, uint256 _value) public onlyOwner {
    require(_value <= balances[acct]);
    // no need to require value <= totalSupply, since that would imply the
    // sender's balance is greater than the totalSupply, which *should* be an assertion failure

    address burner = acct;
    balances[burner] = balances[burner].sub(_value);
    totalSupply_ = totalSupply_.sub(_value);
    Burn(burner, _value);
  }
}
