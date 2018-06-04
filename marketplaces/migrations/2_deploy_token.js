var CuratorToken = artifacts.require("CuratorToken");
var DatabaseAssociation = artifacts.require("DatabaseAssociation");
var ModelMarket = artifacts.require("ModelMarket");

module.exports = function(deployer, network, accounts) {
  deployer.deploy(DatabaseAssociation, 2, 10).then(function() {
    return deployer.deploy(ModelMarket, DatabaseAssociation.address, accounts[0]);
  }).then(function() {
    return DatabaseAssociation.deployed();
  }).then(function(dba) {
    dba.associateModelMarket(ModelMarket.address);
  });
}

