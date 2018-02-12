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
      App.web3Provider = new Web3.providers.HttpProvider('http://127.0.0.1:9545');
      web3 = new Web3(App.web3Provider);
    }

    return App.initContract();
  },

  initContract: function() {
    $.getJSON('CuratorToken.json', function(data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract.
      var CuratorTokenArtifact = data;
      App.contracts.CuratorToken = TruffleContract(CuratorTokenArtifact);

      // Set the provider for our contract.
      App.contracts.CuratorToken.setProvider(App.web3Provider);

      // Use our contract to retieve and mark the adopted pets.
      return App.getBalances();
    });

    $.getJSON('DatabaseAssociation.json', function(data) {
      var Artifact = data;
      App.contracts.DatabaseAssociation = TruffleContract(Artifact);
      App.contracts.DatabaseAssociation.setProvider(App.web3Provider);

      return App.updateAssociation(); 
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

    el('#addProposal').addEventListener('click', function(){
          App.addProposal();
        });

    // switch to proposal page
    el("#goToProposals").addEventListener('click', function(){
      el("#proposalCreation").style.display = 'none';
      el("#proposalOverview").style.display = 'block';
    });

    // switch back
    el("#goToShard").addEventListener('click', () => {
      el("#proposalCreation").style.display = 'block';
      el("#proposalOverview").style.display = 'none';
    });

    // the create ballot button
    el('#goToProposals').addEventListener('click', function(){
      
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
    })
  },

  addProposal: function(event) {

    var databaseAssociationInstance;

    App.contracts.DatabaseAssociation.deployed().then((instance) => {
      databaseAssociationInstance = instance;
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

      App.contracts.CuratorToken.deployed().then(function(instance) {
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
  }

};

$(function() {
  $(window).load(function() {
    App.init();
  });
});





// Running migration: 1_initial_migration.js
//   Replacing Migrations...
//   ... 0xb1e777ae4ac9b4f19228dd3a8086505f53e955be513ed6649cb0668a5797ec9e
//   Migrations: 0x676ae94d49fdbea2702d9a30ffa0d85cf60ab72b
// Saving successful migration to network...
//   ... 0x73b2e9b94a313da899a30856ece528a772ea519819d4af5d0bc6ff8099507623
// Saving artifacts...
// Running migration: 2_deploy_token.js
//   Replacing CuratorToken...
//   ... 0x0305874d74f8f7b68ffda04dcfe0d1cb55d4b02f65b81fefce1a75414ecd2c7e
//   CuratorToken: 0x68d0e6474a853b446ad5dc4462a168ab7a38fceb
//   Replacing DatabaseAssociation...
//   ... 0x3b19302d4a92e32e29fa5383ee03620c45cf4ab96ed068e7c643fd439fb4a44a
//   DatabaseAssociation: 0x7dac8906e3535aa42b18f380e44ecad9663b23b6
// Saving successful migration to network...
//   ... 0x2efcf02ea448dee71ae268c74fea7c42ee92d7fd327d409cc63ef4fa08a24d2f
// Saving artifacts...