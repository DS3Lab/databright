var SimpleDatabaseFactory = artifacts.require("./contracts/SimpleDatabaseFactory.sol");

contract('SimpleDatabaseFactory', function(accounts) {

  it("should create a database correctly", async function() {
    let factory = await SimpleDatabaseFactory.deployed();
    await factory.createDatabase("Dogmeat");
    var fetchedDB = await factory.getDatabase(0);
    assert.equal(fetchedDB[1], "Dogmeat", "First DB should be Dogmeat");
  });
})