App = {
  web3Provider: null,
  contracts: {},
  databaseAssociationInstance: null,
  databaseFactoryInstance: null,
  dbAddressToNameDict: null,
  ipfsNodeAddress: 'localhost',
  ipfsNodePort: '5001',
  ipfsGatewayURL: 'http://localhost:8080/ipfs/',

  init: function() {
    ipfs = window.IpfsApi({host: App.ipfsNodeAddress, port: App.ipfsNodePort, protocol: 'http'})
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

      App.setAssociation();
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

    // vote buttons for each proposal
    $('#proposals').on('click', '#voteDatabaseProposalBtn', function(){
      App.loadDatabaseProposalVoting(parseInt(this.getAttribute("data-id")));
      el("#databaseProposalVoting").style.display = 'block';
      el("#proposalOverview").style.display = 'none';
    });
    $('#proposals').on('click', '#voteShardProposalBtn', function(){
      App.loadShardProposalVoting(parseInt(this.getAttribute("data-id")));
      el("#shardProposalVoting").style.display = 'block';
      el("#proposalOverview").style.display = 'none';
    });

    // Voting buttons
    el("#yayDatabaseProposal").addEventListener('click', () => {
      el("#databaseProposalVoting").style.display = 'none';
      el("#proposalOverview").style.display = 'block';
      App.voteOnProposal(parseInt($('#databaseProposalVoting_id').val()),true);
    });

    el("#nayDatabaseProposal").addEventListener('click', () => {
      el("#databaseProposalVoting").style.display = 'none';
      el("#proposalOverview").style.display = 'block';
      App.voteOnProposal(parseInt($('#databaseProposalVoting_id').val()),false);
    });
  },

  loadProposals: function() {

    var el = function(id){ return document.querySelector(id); }; // Selector

    var proposalNames = [];
    // Callback function
    
    function display_and_filter_proposal(id) {
      function display_and_filter_prop(prop) {
        if (!prop[4] && prop[3]*1000 >= Date.now()) { // prop.executed and deadline didn't pass yet
          dbName = App.dbAddressToNameDict[prop[0]]
          votingDeadline = new Date(prop[3] * 1000).format('d-m-Y h:i:s')

          var shardProposalText = '<h5><a>#' + id + ' Add shard to "'
          + dbName + '" database: ' + prop[2] + '</a></h5><p>Voting ends at: '
          + votingDeadline + '<p>' + '<button id="voteShardProposalBtn" data-id="' +
          id + '" class="float-right voteForProposal">Vote</button></p><hr />';
          
          var databaseProposalText = '<h5><a>#' + id + ' Create database: ' + prop[8] + '</a></h5><p>' + prop[2] + '</a><p>Voting ends at: '
          + votingDeadline + '<p>'+ '<button id="voteDatabaseProposalBtn" data-id="' +
          id + '" class="float-right voteForProposal">Vote</button></p><hr />';

          if (prop[11] == 1) { // Is this a database proposal?
            el('#proposals').innerHTML += databaseProposalText
          } else if (prop[11] == 2) { // Is this a shard proposal?
            el('#proposals').innerHTML += shardProposalText
          } else  {
            console.log("Can't display proposal " + id + ".(Unknown state of proposal)")
          }
        }
      }
      return display_and_filter_prop;
    }

    // draw the proposals submitted
    App.reloadDatabaseDict().then(() => databaseAssociationInstance.numProposals()).then((inputProposals) => {
      el('#proposals').innerHTML = ''
      for(proposalID = 0; proposalID <= inputProposals; proposalID++) {
        databaseAssociationInstance.proposals(proposalID).then(display_and_filter_proposal(proposalID))
      }
    })
  },

  addShardProposal: function(event) {

    function readFileContents (file) {
      return new Promise((resolve) => {
        const reader = new window.FileReader()
        reader.onload = (event) => resolve({
              path: file.name,
              content: Buffer.from(event.target.result)
          })
        reader.readAsArrayBuffer(file)
      })
    }

    let Buffer = ipfs.types.Buffer
    Promise.all($('#shardProposal_files').fileinput('getFileStack').map((file) => readFileContents(file)))
      .then(filesToUpload => ipfs.files.add(filesToUpload, { wrapWithDirectory: true }, (err, filesAdded) => {
          if (err) { throw err }

          directory = filesAdded.find(function(file) {
                        return "" == file.path;
                      });
          databaseAddress = $('#shardProposal_database').val();
          description = $('#shardProposal_description').val();
          hash = directory.hash;
          requestedTokens = parseInt($('#shardProposal_requestedtokens').val());
          curator = $('#shardProposal_curator').val();

          databaseAssociationInstance.proposeAddShard(databaseAddress, description, hash, requestedTokens, curator);
        }
      )
    )
  },

  addDatabaseProposal: function(event) {
    name = $('#databaseProposal_name').val();
    description = $('#databaseProposal_description').val();
    databaseAssociationInstance.proposeAddDatabase(description, name);
  },

  setAssociation: (event) => {
    App.contracts.DatabaseAssociation.deployed().then(function(instance) {
      databaseAssociationInstance = instance;
      $('#associationAddress').text(databaseAssociationInstance.address);

      App.getBalances();

      return instance.databaseFactory();
    }).then(function(factory) {
      App.contracts.SimpleDatabaseFactory.at(factory).then(function(instance) {
        databaseFactoryInstance = instance;
        App.loadProposals();
      })
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

      databaseAssociationInstance.sharesTokenAddress().then(function(result) {
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

    var el = function(id){ return document.querySelector(id); }; // Selector

    function addToProposalsView(db) {
      el('#shardProposal_database').innerHTML += '<option value="' + db[0] + '" >' + db[1] + '</option>';
    }

    databaseFactoryInstance.numberOfDatabases().then(function(numDatabases) {
      var i;
      var dbPromise = databaseFactoryInstance
      for (i = 0; i < numDatabases; i++) {
        dbPromise = dbPromise.getDatabase(i).then(addToProposalsView);
      }
    });
  },

  voteOnProposal: function(proposalID, supportsProposal) {
    databaseAssociationInstance.vote(proposalID, supportsProposal);
  },

  reloadDatabaseDict: function() {
    App.dbAddressToNameDict = {}
    return databaseFactoryInstance.numberOfDatabases().then(function(numDatabases) {
      var i;
      var dbPromise = databaseFactoryInstance
      for (i = 0; i < numDatabases; i++) {
        dbPromise = dbPromise.getDatabase(i).then(function(db) {
          App.dbAddressToNameDict[db[0]] = db[1];
        });
      }
      App.dbAddressToNameDict.size = numDatabases;

      return dbPromise;
    });
  },

  loadDatabaseProposalVoting: function(proposalID) {

    databaseAssociationInstance.proposals(proposalID).then(function(prop){
      $('#databaseProposalVoting_id').text(proposalID);
      $('#databaseProposalVoting_dbtitle').text(prop[8]);
      $('#databaseProposalVoting_description').text(prop[2]);
      $('#databaseProposalVoting_deadline').text(new Date(prop[3] * 1000).format('d-m-Y h:i:s'));
    });
    
  },

  loadShardProposalVoting: function(proposalID) {

    databaseAssociationInstance.proposals(proposalID).then(function(prop){
      $('#shardProposalVoting_id').text(proposalID);
      $('#shardProposalVoting_description').text(prop[2]);
      $('#shardProposalVoting_requestedReward').text(prop[9]);
      $('#shardProposalVoting_deadline').text(new Date(prop[3] * 1000).format('d-m-Y h:i:s'));
      dbNam = App.contracts.SimpleDatabase.at(prop[0]).then((db) => {return db.name();}).then((name) => {
        $('#shardProposalVoting_dbtitle').text(name);
      });

      
      directoryRefpath = prop[8]
      ipfs.ls(directoryRefpath, (err, filesAdded) => {
        if (err) { throw err }
        fileUrls = filesAdded.map((file) => { return App.ipfsGatewayURL + file.path;})
        previewConfigs = filesAdded.map((file) => { return {caption: file.name, downloadUrl: App.ipfsGatewayURL + file.path, size: file.size, width: "120px"};})
        $('#shardProposalVoting_files').fileinput({
          initialPreview: fileUrls,
          initialPreviewAsData: true,
          initialPreviewConfig: previewConfigs,
          overwriteInitial: false,
          showRemove: false,
          showUpload: false,
          showBrowse: false
        }); 
      });
    });    
  }
}

$(function() {
  $(window).on( "load",App.init());
});