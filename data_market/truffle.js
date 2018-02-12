module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // for more about customizing your Truffle configuration!
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7546,
      network_id: "*" // Match any network id
    },
    rinkeby: {
      host: "localhost", // Connect to geth on the specified
      port: 8545,
      from: "0x0537c5218758aac6dB21ad22a17527b31C4291c5", // default address to use for any transaction Truffle makes during migrations
      network_id: 4,
      gas: 6721975 // Gas limit used for deploys
    }
  }
};
