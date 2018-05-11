Common = {
  web3Provider: null,
  contracts: {},
  databaseAssociationInstance: null,
  databaseFactoryInstance: null,
  dbAddressToNameDict: null,
  ipfsNodeAddress: 'localhost',
  ipfsNodePort: '5001',
  ipfsGatewayURL: 'http://localhost:8080/ipfs/',

  init: function() {
    ipfs = window.IpfsApi({host: Common.ipfsNodeAddress, port: Common.ipfsNodePort, protocol: 'http'})
    return Common.initWeb3();
  },

  initWeb3: function() {
    // Initialize web3 and set the provider to the testRPC.
    if (typeof web3 !== 'undefined') {
      Common.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    } else {
      // set the provider you want from Web3.providers
      // Common.web3Provider = new Web3.providers.HttpProvider('http://127.0.0.1:9545');
      Common.web3Provider = new Web3.providers.HttpProvider('http://127.0.0.1:8180'); // parity
      web3 = new Web3(Common.web3Provider);
    }

    return Common.initContract();
  },

  initContract: function() {
    
    $.getJSON('DatabaseAssociation.json', function(data) {
      var Artifact = data;
      Common.contracts.DatabaseAssociation = TruffleContract(Artifact);
      Common.contracts.DatabaseAssociation.setProvider(Common.web3Provider);

      $.getJSON('CuratorToken.json', function(data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract.
      var CuratorTokenArtifact = data;
      Common.contracts.CuratorToken = TruffleContract(CuratorTokenArtifact);

      // Set the provider for our contract.
      Common.contracts.CuratorToken.setProvider(Common.web3Provider);

      });

      $.getJSON('SimpleDatabaseFactory.json', function(data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract.
      var Artifact = data;
      Common.contracts.SimpleDatabaseFactory = TruffleContract(Artifact);

      // Set the provider for our contract.
      Common.contracts.SimpleDatabaseFactory.setProvider(Common.web3Provider);
      });

      $.getJSON('SimpleDatabase.json', function(data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract.
      var Artifact = data;
      Common.contracts.SimpleDatabase = TruffleContract(Artifact);

      // Set the provider for our contract.
      Common.contracts.SimpleDatabase.setProvider(Common.web3Provider);
      });

      App.setAssociation();
    });
    return App.bindEvents();
  },

  reloadDatabaseDict: function() {
    Common.dbAddressToNameDict = {}

    function assignToDict(db) {
      Common.dbAddressToNameDict[db[0]] = db[1];
    }

    return databaseFactoryInstance.numberOfDatabases().then(function(numDatabases) {

      var allPromises = [];
      var i;
      for (i = 0; i < numDatabases; i++) {
        allPromises.push(databaseFactoryInstance.getDatabase(i))
      }
      return Promise.all(allPromises).then((allDbs) => allDbs.map(assignToDict))
    });
  }
}