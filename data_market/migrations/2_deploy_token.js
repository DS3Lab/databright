var CuratorToken = artifacts.require("CuratorToken");
var DatabaseAssociation = artifacts.require("DatabaseAssociation");

module.exports = function(deployer) {
  deployer.deploy(DatabaseAssociation, 2, 10);
}
