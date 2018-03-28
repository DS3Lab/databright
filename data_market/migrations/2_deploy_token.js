var CuratorToken = artifacts.require("CuratorToken");
var DatabaseAssociation = artifacts.require("DatabaseAssociation");

module.exports = function(deployer) {
  // first deploy CuratorToken, then use its address to deploy the Database Association
  deployer.deploy(CuratorToken).then(function(){
    return deployer.deploy(DatabaseAssociation, CuratorToken.address, 10, 2, 1, 1000)
  });
}
