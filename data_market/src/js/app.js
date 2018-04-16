App = {
  web3Provider: null,
  contracts: {},

  init: function() {
    ipfs = new Ipfs(); //create new IPFS object
    return App.initWeb3();
  },

  initWeb3: function() {
    // Initialize web3 and set the provider to the testRPC.
    if (typeof web3 !== 'undefined') {
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    } else {
      // set the provider you want from Web3.providers
      // App.web3Provider = new Web3.providers.HttpProvider('http://127.0.0.1:9545');
      App.web3Provider = new Web3.providers.HttpProvider('http://127.0.0.1:8180'); // parity
      web3 = new Web3(App.web3Provider);
    }

    return App.initContract();
  },

  initContract: function() {
    
    $.getJSON('DatabaseAssociation.json', function(data) {
      var Artifact = data;
      App.contracts.DatabaseAssociation = TruffleContract(Artifact);
      App.contracts.DatabaseAssociation.setProvider(App.web3Provider);

      $.getJSON('CuratorToken.json', function(data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract.
      var CuratorTokenArtifact = data;
      App.contracts.CuratorToken = TruffleContract(CuratorTokenArtifact);

      // Set the provider for our contract.
      App.contracts.CuratorToken.setProvider(App.web3Provider);

      // Use our contract to retieve and mark the adopted pets.
      App.getBalances();
      });

      $.getJSON('SimpleDatabaseFactory.json', function(data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract.
      var Artifact = data;
      App.contracts.SimpleDatabaseFactory = TruffleContract(Artifact);

      // Set the provider for our contract.
      App.contracts.SimpleDatabaseFactory.setProvider(App.web3Provider);
      });

      $.getJSON('SimpleDatabase.json', function(data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract.
      var Artifact = data;
      App.contracts.SimpleDatabase = TruffleContract(Artifact);

      // Set the provider for our contract.
      App.contracts.SimpleDatabase.setProvider(App.web3Provider);
      });

      App.updateAssociation();
      App.loadProposals();
    });
    return App.bindEvents();
  },

  bindEvents: function() {

    var el = function(id){ return document.querySelector(id); }; // Selector

    console.log("Binding events ...")
    $(document).on('click', '#goToProposal', App.handleTransfer);

    async function predictFromIPFS() {

      const catImage = document.getElementById('image_' + $('#checkAddress').val());

      const math = new dl.NDArrayMathGPU();
      // squeezenet is loaded from https://unpkg.com/deeplearn-squeezenet
      const squeezeNet = new squeezenet.SqueezeNet(math);
      await squeezeNet.load();

      // Load the image into an NDArray from the HTMLImageElement.
      const image = dl.Array3D.fromPixels(catImage);

      // Predict through SqueezeNet.
      const logits = squeezeNet.predict(image);

      // Convert the logits to a map of class to probability of the class.
      const topK = await squeezeNet.getTopKClasses(logits, 5);
      for (const className in topK) {
        console.log(
            `${topK[className].toFixed(5)}: ${className}`);
      }

      el('#aiResults').innerHTML = '';
      el('#aiResults').innerHTML = '<h5>SqueezeNet Prediction</h5>'
      var i = 0;
      for (const key in topK) {
        if (i == 0) {
          el('#aiResults').innerHTML += `<b>Probability, Class</b> <br><em>${topK[key].toFixed(5)}: ${key}</em>\n`;
        } else {
          el('#aiResults').innerHTML += `<br>${topK[key].toFixed(5)}: ${key}</b>\n`;
        }
        i++;
      };
    }

    $("#aiEvaluate").click(predictFromIPFS);

    el('#addShardProposal').addEventListener('click', function(){
          App.addShardProposal();
          el("#shardProposalCreation").style.display = 'none';
          el("#proposalOverview").style.display = 'block';
        });

    el('#addDatabaseProposal').addEventListener('click', function(){
          App.addDatabaseProposal();
          el("#databaseProposalCreation").style.display = 'none';
          el("#proposalOverview").style.display = 'block';
        });
    // switch to proposal page
    el("#fromShardGoToProposals").addEventListener('click', function(){
      el("#shardProposalCreation").style.display = 'none';
      el("#proposalOverview").style.display = 'block';
      App.loadProposals();
    });

    // switch to proposal page
    el("#fromDatabaseGoToProposals").addEventListener('click', function(){
      el("#databaseProposalCreation").style.display = 'none';
      el("#proposalOverview").style.display = 'block';
      App.loadProposals();
    });

    // switch to add shard page
    el("#goToShard").addEventListener('click', () => {
      el("#shardProposalCreation").style.display = 'block';
      el("#proposalOverview").style.display = 'none';

      App.populateDatabaseList();
    });

    // switch to add database page
    el("#goToNewDatabase").addEventListener('click', () => {
      el("#databaseProposalCreation").style.display = 'block';
      el("#proposalOverview").style.display = 'none';
    });
  },

  loadProposals: function() {

    var el = function(id){ return document.querySelector(id); }; // Selector

    var databaseAssociationInstance;

    App.contracts.DatabaseAssociation.deployed().then((instance) => {
      databaseAssociationInstance = instance;
      var proposalNames = [];
      // Callback function
      
      function create_cb(proposalID) {
        
        function cb(x) {
          console.log(x);
          var addImageText = '<h5><a>#' + proposalID + ' '
          + x[2] + "</a><h5><a>Preview Image</a><p><img id=image_" + proposalID + " src='https://ipfs.io/ipfs/" +
          x[8] +
          "' width=227 height=227 crossorigin><button data-id='" +
          proposalID + "' class='float-right voteForProposal'>"
          + 'Vote</button></p><hr /></h5>';

          var addText = '<h5><a>#' + proposalID + ' '
          + x[8] + "</a><h5><a>Description</a><p>" + x[2] + ' <button data-id="' +
          proposalID + '" class="float-right voteForProposal">'
          + 'Vote</button></p><hr /></h5>';

          if (x[9] !== '0x0000000000000000000000000000000000000000'){
            el('#proposals').innerHTML += addImageText
          } else {
            el('#proposals').innerHTML += addText
          }
        }
        return cb;
      }

      // draw the proposals submitted
      instance.numProposals().then((inputProposals) => {
        el('#proposals').innerHTML = ''
        for(proposalID = 0; proposalID <= inputProposals; proposalID++) {
          instance.proposals(proposalID).then(create_cb(proposalID))
        }
      })
    })
  },

  addShardProposal: function(event) {

    var databaseAssociationInstance;

    App.contracts.DatabaseAssociation.deployed().then((instance) => {
      databaseAssociationInstance = instance;
      databaseAddress = $('#shardProposal_database').val();
      description = $('#shardProposal_description').val();
      hash = $('#shardProposal_hash').val();
      requestedTokens = parseInt($('#shardProposal_requestedtokens').val());
      curator = $('#shardProposal_curator').val();
      databaseAssociationInstance.proposeAddShard(databaseAddress, description, hash, requestedTokens, curator);
    })
  },

  addDatabaseProposal: function(event) {

    var databaseAssociationInstance;

    App.contracts.DatabaseAssociation.deployed().then((instance) => {
      databaseAssociationInstance = instance;
      name = $('#databaseProposal_name').val();
      description = $('#databaseProposal_description').val();
      databaseAssociationInstance.proposeAddDatabase(name, description);
    })
  },

  updateAssociation: (event) => {
    var databaseAssociationInstance;
    App.contracts.DatabaseAssociation.deployed().then(function(instance) {
      databaseAssociationInstance = instance;
      $('#associationAddress').text(databaseAssociationInstance.address);
    });
  },

  handleTransfer: function(event) {
    event.preventDefault();

    var amount = parseInt($('#TTTransferAmount').val());
    var toAddress = $('#TTTransferAddress').val();

    console.log('Transfer ' + amount + ' TT to ' + toAddress);

    var tutorialTokenInstance;

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];

      App.contracts.TutorialToken.deployed().then(function(instance) {
        tutorialTokenInstance = instance;

        return tutorialTokenInstance.transfer(toAddress, amount, {from: account});
      }).then(function(result) {
        alert('Transfer Successful!');
        return App.getBalances();
      }).catch(function(err) {
        console.log(err.message);
      });
    });
  },

  getBalances: function(adopters, account) {
    console.log('Getting balances...');

    var tutorialTokenInstance;

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];
      App.contracts.DatabaseAssociation.deployed().then((instance) => {
        databaseAssociationInstance = instance;
        return instance.sharesTokenAddress();
      }).then(function(result) {
        App.contracts.CuratorToken.at(result).then(function(instance) {
        curatorTokenInstance = instance;

        return curatorTokenInstance.balanceOf(account);
        }).then(function(result) {
          balance = result.c[0];
          curatorTokenInstance.totalSupply().then(function(result) {
            var share = balance / result.c[0] * 100
            $('#accountBalance').text(balance + " (" + share + "%)" ); //calculates shares
          });
          $('#accountAddress').text(account);
        }).catch(function(err) {
          console.log(err.message);
        });
      });
    });
  },

  populateDatabaseList: function() {

    App.contracts.DatabaseAssociation.deployed().then((instance) => {
      return instance.databaseFactory();
    }).then(function(result) {
      console.log(result);
      App.contracts.SimpleDatabaseFactory.at(result).then(function(factoryInstance) {
        var i;
        for (i = 0; i < factoryInstance.numberOfDatabases; i++) { 
          db = factoryInstance.getDatabase(i);
          console.log(db);
          el('#shardProposal_database').innerHTML += '<option value="' + db[0] + ' >' + db[1] + '</option>';
        }
      });
    });
  }
};

$(function() {
  $(window).on( "load",App.init());
});