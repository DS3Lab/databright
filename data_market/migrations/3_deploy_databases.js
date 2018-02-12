// Only for debugging, they will be later created by the DatabaseAssociation
var SimpleDatabaseFactory = artifacts.require("SimpleDatabaseFactory");
var SimpleDatabase = artifacts.require("SimpleDatabase");

module.exports = function(deployer) {
  deployer.deploy(SimpleDatabaseFactory);
  deployer.deploy(SimpleDatabase);
}
