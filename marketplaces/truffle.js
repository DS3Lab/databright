module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // for more about customizing your Truffle configuration!
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*" // Match any network id
    },
    parity: {
      host: "127.0.0.1",
      port: 8180,
      network_id: "*",      
      gas: 6721975, // Gas limit used for deploys
      from: "0x0033B8c5e87BE49d624982F1cc787168e410F692" // default address for parity  
    },
    rinkeby: {
      host: "localhost", // Connect to geth on the specified
      port: 8545,

      network_id: 4,
      gas: 6721975 // Gas limit used for deploys
    },
    mist: {
      host: "localhost",
      port: 8545, // somehow still buggy
      network_id: "*"
    }
  }
};
