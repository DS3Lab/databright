pragma solidity ^0.4.21;

import "openzeppelin-solidity/contracts/ownership/rbac/RBACWithAdmin.sol";
import "./DatabaseAssociation.sol";

contract ModelMarket is RBACWithAdmin {

    string constant ROLE_MODELCHECKER = "modelchecker";

    string[] activeModelHashes;
    mapping(string => bool) public modelsChecked;
    mapping(string => Model) public submittedModels;
    DatabaseAssociation underlying;

    struct Model {
        address owner;
        address databaseAddr;
        string hashcode;
        string title;
        string descriptionIpfsHash;
        string modelIpfsHash;
        string dataExtractorIpfsHash;
    }

    modifier onlyAdminOrChecker()
    {
        require(
        hasRole(msg.sender, ROLE_ADMIN) ||
        hasRole(msg.sender, ROLE_MODELCHECKER)
        );
        _;
    }
    event ModelSubmitted(string hashcode);
    event ModelChecked(string hashcode, bool isValid);
    event DBAChanged(address newDBA);

    function ModelMarket(address databaseAssociation, address modelChecker) public {
        underlying = DatabaseAssociation(databaseAssociation);
        addRole(modelChecker, ROLE_MODELCHECKER);
    }

    function changeDatabaseAssociation(address newDBA) onlyAdmin public {
        underlying = DatabaseAssociation(newDBA);        
        emit DBAChanged(newDBA);
    }

    function proposeNewModel(
        address databaseAddr, // SimpleDatabase address that this model uses
        string title,
        string descriptionIpfsHash, // A description text of the database
        string modelIpfsHash, // A hash to the TensorFlow model checkpoint files. The folder should also include the graph metadata and a config.ini
        string dataExtractorIpfsHash // A hash to the DataExtractor module that will be used to extract features and predictors from the dataset
    ) public returns (uint id) {
        
        string storage hashcode = keccak256(msg.sender, databaseAddr, title);
        require(submittedModels[hashcode] == 0, "Model with that hash has already been submitted.");
        require(underlying.databaseFactory.addressToDatabases[databaseAddr] != 0, "Database does not exist in the underlying DatabaseAssociation");

        
        modelsChecked[hashcode] = 0;
        Model storage m = submittedModels[hashcode];
        m.owner = msg.sender;
        m.databaseAddr = databaseAddr;
        m.title = title;
        m.descriptionIpfsHash = descriptionIpfsHash;
        m.modelIpfsHash = modelIpfsHash;
        m.dataExtractorIpfsHash = dataExtractorIpfsHash;
        m.hashcode = hashcode;

        emit ModelSubmitted(hashcode);
    }
    function checkModel(string hashcode, bool isValid) onlyAdminOrChecker public {
        require(modelsChecked[hashcode] == false, "Model is already checked");
        modelsChecked[hashcode] = true;
        if (isValid) {
            activeModelHashes.push(hashcode);
        }
        emit ModelChecked(hashcode, isValid);
    }
}