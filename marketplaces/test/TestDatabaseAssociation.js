var DatabaseAssociation = artifacts.require("./contracts/DatabaseAssociation.sol");

contract('DatabaseAssociation', function(accounts) {

  it("should give creation reward to database creator", async function() {
  });

  it("should allow proposal creation by anyone", async function() {
  });

  it("should allow initial shard proposal voting only by creator", async function() {
  });

  it("should decrement voting rights from creator after first shard", async function() {
  });

  it("should give shard reward to shard curator", async function() {
  });

  it("should decline proposal if quota is not fulfilled", async function() {
  });

  it("should decline proposal if minimum votes are not cast", async function() {
  });

  it("should decline proposal if minimum discussion time did not pass", async function() {
  });

  it("should decline proposal if token and association owners don't match", async function() {
  });

  it("should not let people with 0 shares have any weight in the voting", async function() {
  });

  it("should not count people with 0 shares towards number of votes", async function() {
  });
})