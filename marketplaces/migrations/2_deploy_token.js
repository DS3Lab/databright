var CuratorToken = artifacts.require("CuratorToken");
var DatabaseAssociation = artifacts.require("DatabaseAssociation");
var ModelMarket = artifacts.require("ModelMarket");

module.exports = function(deployer, network, accounts) {
  deployer.deploy(DatabaseAssociation, 2, 10)
  .then( ()=> 
    deployer.deploy(ModelMarket, DatabaseAssociation.deployed().address, accounts[0]))
  .then( ()=>
    DatabaseAssociation.deployed().associateModelMarket(ModelMarket.deployed().address));
}

