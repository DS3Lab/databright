pragma solidity ^0.4.21;    

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./SimpleDatabase.sol";

/**
* contract allowing you to create multiple databases
*/
contract SimpleDatabaseFactory is Ownable {

    event NewSimpleDatabase(address databaseAddr, string name, uint id);

    struct Database {
        address database;
        string name;
    }

    mapping(address => Database) addressToDatabases;

    address[] public databaseAddresses;
    uint public numberOfDatabases = 0;
    /** 
      * create new database and store it into databases
      * transfer the ownership of the database to the owner of the factory
      */
    function createDatabase(string _name) public onlyOwner returns (bool) {
        numberOfDatabases += 1;
        address simpleDatabaseAddr = new SimpleDatabase(_name);
        uint id = databaseAddresses.push(simpleDatabaseAddr) - 1; // returns index of db
        addressToDatabases[simpleDatabaseAddr] = Database(simpleDatabaseAddr, _name);
        emit NewSimpleDatabase(simpleDatabaseAddr, _name, id);
        SimpleDatabase db = SimpleDatabase(simpleDatabaseAddr);
        db.transferOwnership(msg.sender); // transfer ownership to the owner of factory
        return true;
    }

    /**
      * Solidity unfortunately can't return dynamic sized arrays yet
      */
    function getDatabase(uint _i) public view returns (address, string) {
        address addr = databaseAddresses[_i];
        return (addr, addressToDatabases[addr].name);
    } 
}
