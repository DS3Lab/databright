App = {

  bindEvents: function() {

    var el = function(id){ return document.querySelector(id); }; // Selector

    console.log("Binding events ...")

    el('#addShardProposal').addEventListener('click', function(){
          App.addShardProposal();
        });

    el("#uploadMore").addEventListener('click', () => {
      el("#shardProposalCreation").style.display = 'block';
      el("#shardProposalSucceeded").style.display = 'none';
    });
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
          requestedTokens = filesToUpload.length // TODO: Currently we request tokens equal to the number of files. The reward should be dependent on the data quality.
          curator = $('#shardProposal_curator').val() != '' ? $('#shardProposal_curator').val() : $('#accountAddress').val()

          Common.databaseAssociationInstance.proposeAddShard(databaseAddress, description, hash, requestedTokens, curator).then((err, res) => {
            if (err) {
              console.log(err)
              throw err;
            }

            el("#shardProposalCreation").style.display = 'none';
            el("#shardProposalSucceeded").style.display = 'block';
          }); // TODO: Go to succeded-page after transaction has been sent
        }
      )
    )
  },

  setAssociation: (event) => {
    Common.contracts.DatabaseAssociation.deployed().then(function(instance) {
      Common.databaseAssociationInstance = instance;
      $('#associationAddress').text(Common.databaseAssociationInstance.address);
      return instance.databaseFactory();
    }).then(function(factory) {
      Common.contracts.SimpleDatabaseFactory.at(factory).then(function(instance) {
        Common.databaseFactoryInstance = instance;
        App.populateDatabaseList()
      })
    });

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      $('#accountAddress').text(accounts[0])
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
  }
}

$(function() {
  $(window).on( "load",Common.init());
});