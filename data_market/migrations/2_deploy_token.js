var CuratorToken = artifacts.require("CuratorToken");
var DatabaseAssociation = artifacts.require("DatabaseAssociation");

module.exports = function(deployer) {
  // first deploy CuratorToken, then use its address to deploy the Database Association
  deployer.deploy(CuratorToken).then(function(){
    return deployer.deploy(DatabaseAssociation, 10, 2, 1000)
  });
}
