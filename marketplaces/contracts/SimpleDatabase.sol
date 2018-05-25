pragma solidity ^0.4.21;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

/**
* contract implements a simple DB table that allows to create and store shards
*/
contract SimpleDatabase is Ownable {
    
    /** 
      * Event returning contract address and metadata
      */
    event NewShard(address databaseAddr, string name, uint shardId, address curator, string ipfsHash);

    string public name;
    /**
      * Shard types include ipfsHashes of data and address of curator
      */
    struct Shard {
        address curator;
        string ipfsHash;
    }

    /**
      * shards array keeps track of all shards 
      */
    Shard[] public shards;
    uint public numberOfShards = 0;
    /**
      * Constructor
      */
    function SimpleDatabase(string _name) public {
        name = _name;
    }

    /**
      * adding hash to hashMap 
      * can only be called by owner
      */
    function addShard(address _curator, string _ipfsHash) public onlyOwner returns (bool) {
        numberOfShards += 1; // increment total number of shards
        uint id = shards.push(Shard(_curator, _ipfsHash)) - 1; // returns index of added shard
        emit NewShard(address(this), name, id, _curator, _ipfsHash); // trigger event
        return true;
    }

    /**
      * reading shards array
      */
    function getShard(uint _i) public view returns (address, string) {
        return (shards[_i].curator, shards[_i].ipfsHash);
    }

    function getNumberOfShards() public view returns (uint) {
      return numberOfShards;
    }
}


