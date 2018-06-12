App = {
  databases: null,
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
    // go back to proposal page
    $(".goToProposals").on('click', function(){
      el("#shardProposalCreation").style.display = 'none';
      el("#databaseProposalCreation").style.display = 'none';
      el("#shardProposalVoting").style.display = 'none';
      el("#databaseProposalVoting").style.display = 'none';
      el("#databaseOverview").style.display = 'none';
      el("#databaseView").style.display = 'none';
      el("#proposalOverview").style.display = 'block';
      App.loadProposals();
    });

    // switch to add shard page
    el("#goToShard").addEventListener('click', () => {
      $('#shardProposal_curator').val($('#accountAddress').text())
      el("#shardProposalCreation").style.display = 'block';
      el("#proposalOverview").style.display = 'none';

      App.populateDatabaseList();
    });

    // switch to add database page
    el("#goToNewDatabase").addEventListener('click', () => {
      el("#databaseProposalCreation").style.display = 'block';
      el("#proposalOverview").style.display = 'none';
    });

    // switch to database overview page
    el("#goToDatabaseOverview").addEventListener('click', () => {
      el("#databaseOverview").style.display = 'block';
      el("#proposalOverview").style.display = 'none';
    });

    // details button for each database
    $('#databases').on('click', '#viewDbDetails', function(){
      App.loadShardList(this.getAttribute("data-id"));
      el("#databaseView").style.display = 'block';
      el("#databaseOverview").style.display = 'none';
    });

    // details button for each shard
    $('#shards').on('click', '#viewShardBtn', function(){
      App.loadSingleShard(this.getAttribute("db-addr"), parseInt(this.getAttribute("shard-idx")));
      el("#databaseView").style.display = 'none';
      el("#singleShardView").style.display = 'block';
    });

    // go back to shards list
    el("#singleShardBackBtn").addEventListener('click', () => {
      el("#databaseView").style.display = 'block';
      el("#singleShardView").style.display = 'none';
    });

    // challenge shard / propose shard to be removed
    el("#singleShardChallengeBtn").addEventListener('click', () => {
      App.challengeShard($('#singleShard_dbAddr').text(), $('#singleShard_idx').text())
      el("#databaseView").style.display = 'block';
      el("#singleShardView").style.display = 'none';
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
    $('#proposals').on('click', '#voteShardRemoveProposalBtn', function(){
      App.loadShardRemoveProposalVoting(parseInt(this.getAttribute("data-id")));
      el("#shardRemoveProposalVoting").style.display = 'block';
      el("#proposalOverview").style.display = 'none';
    });
    $('#proposals').on('click', '#executeProposalBtn', function(){
      Common.databaseAssociationInstance.executeProposal(parseInt(this.getAttribute("data-id")), 0);
    });

    // Voting buttons
    el("#yayDatabaseProposal").addEventListener('click', () => {
      App.voteOnProposal(parseInt($('#databaseProposalVoting_id').text()),true);
      el("#databaseProposalVoting").style.display = 'none';
      el("#proposalOverview").style.display = 'block';
    });

    el("#nayDatabaseProposal").addEventListener('click', () => {
      App.voteOnProposal(parseInt($('#databaseProposalVoting_id').text()),false);
      el("#databaseProposalVoting").style.display = 'none';
      el("#proposalOverview").style.display = 'block';
    });

    el("#yayShardProposal").addEventListener('click', () => {
      App.voteOnProposal(parseInt($('#shardProposalVoting_id').text()),true);
      el("#shardProposalVoting").style.display = 'none';
      el("#proposalOverview").style.display = 'block';
    });

    el("#nayShardProposal").addEventListener('click', () => {
      App.voteOnProposal(parseInt($('#shardProposalVoting_id').text()),false);
      el("#shardProposalVoting").style.display = 'none';
      el("#proposalOverview").style.display = 'block';
    });
    el("#yayShardRemoveProposal").addEventListener('click', () => {
      App.voteOnProposal(parseInt($('#shardRemoveProposalVoting_id').text()),true);
      el("#shardRemoveProposalVoting").style.display = 'none';
      el("#proposalOverview").style.display = 'block';
    });

    el("#nayShardRemoveProposal").addEventListener('click', () => {
      App.voteOnProposal(parseInt($('#shardRemoveProposalVoting_id').text()),false);
      el("#shardRemoveProposalVoting").style.display = 'none';
      el("#proposalOverview").style.display = 'block';
    });
  },

  loadProposals: function() {

    var el = function(id){ return document.querySelector(id); }; // Selector

    var proposalNames = [];
    // Callback function
    
    function get_proposal_list_entry(id) {
      function get_list_entry(prop) {
        if (!prop[4]) { // not yet executed && prop[3]*1000 >= Date.now()) { // prop.executed and deadline didn't pass yet

          dbName = Common.dbAddressToNameDict[prop[0]]
          votingDeadline = new Date(prop[3] * 1000).format('d-m-Y H:i:s')
          var shardProposalText;
          var databaseProposalText;
          var shardRemoveProposalText;
          if (prop[3]*1000 >= Date.now()) { // voting deadline has not yet passed
            // Proposal is still open to voting
            shardProposalText = '<h5><a>#' + id + ' Add shard to "'
            + dbName + '" database: ' + prop[2] + '</a></h5><p>Voting ends at: '
            + votingDeadline + '<p>' + '<button id="voteShardProposalBtn" data-id="' +
            id + '" class="float-right voteForProposal">Vote</button></p><hr />';

            databaseProposalText = '<h5><a>#' + id + ' Create database: ' + prop[8] + '</a></h5><p>' + prop[2] + '</a><p>Voting ends at: '
            + votingDeadline + '<p>'+ '<button id="voteDatabaseProposalBtn" data-id="' +
            id + '" class="float-right voteForProposal">Vote</button></p><hr />';

            shardRemoveProposalText = '<h5><a>#' + id + ' Remove shard from "'
            + dbName + '" database: ' + prop[2] + '</a></h5><p>Voting ends at: '
            + votingDeadline + '<p>' + '<button id="voteShardRemoveProposalBtn" data-id="' +
            id + '" class="float-right voteForProposal">Vote</button></p><hr />';
          } else {
            // Proposal voting is closed, proposal can be executed
            executableProposalDescription = 'Voting already ended at: '
            + votingDeadline + '<p>' + '<button id="executeProposalBtn" data-id="' +
            id + '" class="float-right voteForProposal">Execute</button></p><hr />';

            shardProposalText = '<h5><a>#' + id + ' Add shard to "' + dbName +
            '" database: ' + prop[2] + '</a></h5><p>' + executableProposalDescription

            shardRemoveProposalText = '<h5><a>#' + id + ' Remove shard from "' + dbName +
            '" database: ' + prop[2] + '</a></h5><p>' + executableProposalDescription

            databaseProposalText = '<h5><a>#' + id + ' Create database: ' + prop[8] +
            '</a></h5><p>' + executableProposalDescription
          }
          
          if (prop[11] == 1) { // Is this a database proposal?
            return databaseProposalText;
          } else if (prop[11] == 2) { // Is this a shard proposal?
            return shardProposalText;
          } else if (prop[11] == 3) { // Is this a shard remove proposal?
            return shardRemoveProposalText;
          } else  {
            console.log("Can't display proposal " + id + ".(Unknown state of proposal)")
          }
        }
      }
      return get_list_entry;
    }

    // draw the proposals submitted
    Common.reloadDatabaseDict().then(() => Common.databaseAssociationInstance.numProposals()).then((inputProposals) => {
      el('#proposals').innerHTML = '' 

      var allPromises = [];
      var proposalID;
      for (proposalID = 0; proposalID < inputProposals; proposalID++) {
        allPromises.push(Common.databaseAssociationInstance.proposals(proposalID).then(get_proposal_list_entry(proposalID)))
      }

      Promise.all(allPromises).then(proposalsToShow => {
        proposalsToShow.forEach(propText => {
          if (typeof propText != 'undefined') {
            el('#proposals').innerHTML += propText
          }
        })

        if (el('#proposals').innerHTML == '') {
        el('#proposals').innerHTML = '<p>No proposals to display<p>'
        }
      })
    })
  },

  loadDatabaseOverview: function() {

    var el = function(id){ return document.querySelector(id); }; // Selector

    var databaseNames = [];
    // Callback function
    
    function get_database_list_entry(addr) {
      dbName = Common.dbAddressToNameDict[addr]
    
      itemText = '<h5>' + dbName + '</h5><button id="viewDbDetails" data-id="' +
      addr + '" class="float-right viewDbDetails">View Details</button></p>';

      return itemText;
    }

    
    // draw the databases
    Common.reloadDatabaseDict().then(() => {
      el('#databases').innerHTML = ''
      for (var addr  in Common.dbAddressToNameDict) {
        el('#databases').innerHTML += get_database_list_entry(addr)
      }

      if (el('#databases').innerHTML == '') {
        el('#databases').innerHTML = '<p>No databases to display<p>'
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

          Common.databaseAssociationInstance.proposeAddShard(databaseAddress, description, hash, requestedTokens, curator);
        }
      )
    )
  },

  addDatabaseProposal: function(event) {
    name = $('#databaseProposal_name').val();
    description = $('#databaseProposal_description').val();
    Common.databaseAssociationInstance.proposeAddDatabase(description, name);
  },

  setAssociation: (event) => {
    Common.contracts.DatabaseAssociation.deployed().then(function(instance) {
      Common.databaseAssociationInstance = instance;
      $('#associationAddress').text(Common.databaseAssociationInstance.address);

      App.getBalances();

      return instance.databaseFactory();
    }).then(function(factory) {
      Common.contracts.SimpleDatabaseFactory.at(factory).then(function(instance) {
        Common.databaseFactoryInstance = instance;
        App.loadDatabaseOverview();
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

      Common.contracts.TutorialToken.deployed().then(function(instance) {
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

      Common.databaseAssociationInstance.sharesTokenAddress().then(function(result) {
        Common.contracts.CuratorToken.at(result).then(function(instance) {
        curatorTokenInstance = instance;

        return curatorTokenInstance.balanceOf(account);
        }).then(function(result) {
          balance = result.c[0];
          curatorTokenInstance.totalSupply().then(function(result) {
            var share = balance / result.c[0] * 100
            $('#accountBalance').text(balance + " (" + share + "%)" ); //calculates shares
          });
          $('#accountAddress').text(account);
          Common.databaseAssociationInstance.minimumProposeBalance().then(function(minPropBal) {
            $("#goToShard").text("Add data (min " + minPropBal + ")")
            $("#goToNewDatabase").text("New Database (min " + minPropBal + ")")
            if (balance < minPropBal) {
              $("#goToShard").prop('disabled', true);
              $("#goToNewDatabase").prop('disabled', true);
            }
          });
          

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

    el('#shardProposal_database').innerHTML = ''
    Common.databaseFactoryInstance.numberOfDatabases().then(function(numDatabases) {

      var allPromises = [];
      var i;
      if (numDatabases == 0) {
        el('#shardProposal_database').innerHTML += '<option>No database available</option>';
        el('#shardProposal_database').disabled = true;
        el('#addShardProposal').disabled = true;
      } else {
        for (i = 0; i < numDatabases; i++) {
          allPromises.push(Common.databaseFactoryInstance.getDatabase(i))
        }
        Promise.all(allPromises).then((allDbs) => allDbs.map(addToProposalsView))
        el('#shardProposal_database').disabled = false;
        el('#addShardProposal').disabled = false;
      }
    });
  },

  voteOnProposal: function(proposalID, supportsProposal) {
    Common.databaseAssociationInstance.vote(proposalID, supportsProposal);
  },

  loadDatabaseProposalVoting: function(proposalID) {

    Common.databaseAssociationInstance.proposals(proposalID).then(function(prop){
      $('#databaseProposalVoting_id').text(proposalID);
      $('#databaseProposalVoting_dbtitle').text(prop[8]);
      $('#databaseProposalVoting_description').text(prop[2]);
      $('#databaseProposalVoting_deadline').text(new Date(prop[3] * 1000).format('d-m-Y h:i:s'));
    });
    
  },

  loadShardList: function(dbaddr) {

    var el = function(id){ return document.querySelector(id); }; // Selector
    function get_shard_list_entry(shardTuple) {
      idx = shardTuple[0]
      shard = shardTuple[1]
      votingDeadlineDate = new Date(shard[2] * 1000).format('d-m-Y h:i:s')
      itemText = '<h5>Shard #' + idx + '</h5><p>Added: '
      + votingDeadlineDate + '<p>Curator: ' + shard[0] + '<p>Rewarded tokens: '
      + shard[3] + '<p><button id="viewShardBtn" db-addr="' + dbaddr + '" shard-idx="' +
      idx + '" class="float-right viewShard">View details</button></p>';

      return itemText;
    }
    function isValidShard(shardTuple) {
      return shardTuple[1][0] != 0
    }
    function shardComparator(sT1, sT2) {
      return sT1[1][2] - sT2[1][2];
    }

    $('#databaseView_dbtitle').text(Common.dbAddressToNameDict[dbaddr]);

    Common.contracts.SimpleDatabase.at(dbaddr).then((db) => {
      db.getShardArrayLength().then((arrLen) => {
        var shardPromises = [];
        var shardIndices = [];
        for (var i = 0; i < arrLen; i++) {
          shardPromises.push(db.shards(i))
          shardIndices.push(i)
        }
        Promise.all(shardPromises).then((allShards) => {
          var sortedValidShards = shardIndices
                                  .map((e, i) => [e, allShards[i]])
                                  .filter(isValidShard)
                                  .sort(shardComparator)
                                  .map(get_shard_list_entry)
          
          el('#shards').innerHTML = ''

          sortedValidShards.forEach(shardText => {
            el('#shards').innerHTML += shardText
          })

          if (el('#shards').innerHTML == '') {
            el('#shards').innerHTML = '<p>No shards to display<p>'
            }
        })
      })
    })
  },

  loadShardProposalVoting: function(proposalID) {

    Common.databaseAssociationInstance.proposals(proposalID).then(function(prop){
      App.loadProposalVotingWithPrefix(false, prop, proposalID)
    });    
  },

  loadShardRemoveProposalVoting: function(proposalID) {

    Common.databaseAssociationInstance.proposals(proposalID).then(function(prop){
      App.loadProposalVotingWithPrefix(true, prop, proposalID)
    });    
  },

  loadProposalVotingWithPrefix: function(isRemoveProposal, prop, proposalID) {

    prefix = isRemoveProposal ? '#shardRemoveProposalVoting' : '#shardProposalVoting'
    
    $(prefix + '_id').text(proposalID);
    $(prefix + '_description').text(prop[2]);
    $(prefix + '_requestedReward').text(prop[9]);
    $(prefix + '_deadline').text(new Date(prop[3] * 1000).format('d-m-Y h:i:s'));
    $(prefix + '_dbtitle').text(Common.dbAddressToNameDict[prop[o]]);
    


    pathPromise = isRemoveProposal ?
                  Common.contracts.SimpleDatabase.at(prop[0]).then((db) => db.shards(prop[9])).then((shard) => shard[1]) :
                  Promise.resolve(prop[8])

    pathPromise.then((directoryRefpath) => {
      ipfs.ls(directoryRefpath, (err, filesAdded) => {
        if (err) { throw err }
        fileUrls = filesAdded.map((file) => { return Common.ipfsGatewayURL + file.path;})
        previewConfigs = filesAdded.map((file) => { return {caption: file.name, downloadUrl: Common.ipfsGatewayURL + file.path, size: file.size, width: "120px"};})
        $(prefix + '_files').fileinput({
          initialPreview: fileUrls,
          initialPreviewAsData: true,
          initialPreviewConfig: previewConfigs,
          overwriteInitial: false,
          showRemove: false,
          showUpload: false,
          showBrowse: false
        }); 
      });
    })
  },

  loadSingleShard: function(dbAddr, shardIdx) {

    Common.contracts.SimpleDatabase.at(dbAddr).then((db) => {
      db.shards(shardIdx).then((shard) => {
        $('#singleShard_dbAddr').text(dbAddr);
        $('#singleShard_dbName').text(Common.dbAddressToNameDict[dbAddr]);
        $('#singleShard_idx').text(shardIdx);
        $('#singleShard_added').text(new Date(shard[2] * 1000).format('d-m-Y h:i:s'));
        $('#singleShard_curator').text(shard[0]);  
        $('#singleShard_rewardedTokens').text(shard[3]);
        
        directoryRefpath = shard[1]
        ipfs.ls(directoryRefpath, (err, filesAdded) => {
          if (err) { throw err }
          fileUrls = filesAdded.map((file) => { return Common.ipfsGatewayURL + file.path;})
          previewConfigs = filesAdded.map((file) => { return {caption: file.name, downloadUrl: Common.ipfsGatewayURL + file.path, size: file.size, width: "120px"};})
          $('#singleShard_files').fileinput({
            initialPreview: fileUrls,
            initialPreviewAsData: true,
            initialPreviewConfig: previewConfigs,
            overwriteInitial: false,
            showRemove: false,
            showUpload: false,
            showBrowse: false
          }); 
        });
      })
    });    
  },

  challengeShard: function(dbAddr, shardIdx) {
    Common.databaseAssociationInstance.proposeRemoveShard(dbAddr, "", shardIdx);
  }
}

$(function() {
  $(window).on( "load",Common.init());
});