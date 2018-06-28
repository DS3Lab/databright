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
      host: 'localhost',
      port: 8545,
      network_id: '42',
      gas: 7984371, // Gas limit used for deploys
      from: "0x00c8A26E3D481C5527868081b2d1b329C7289D9F" // default address for parity  
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
