pragma solidity ^0.4.21;

import "openzeppelin-solidity/contracts/ownership/rbac/RBACWithAdmin.sol";
import "./DatabaseAssociation.sol";

contract ModelMarket is RBACWithAdmin {

    string constant ROLE_MODELCHECKER = "modelchecker";

    bytes32[] activeModelHashes;
    mapping(bytes32 => bool) public modelsChecked;
    mapping(bytes32 => Model) public submittedModels;
    DatabaseAssociation underlying;

    struct Model {
        address owner;
        address databaseAddr;
        bytes32 hashcode;
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
    event ModelSubmitted(bytes32 hashcode);
    event ModelChecked(bytes32 hashcode, bool isValid);
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
    ) public returns (bytes32 hashcode) {
        
        hashcode = keccak256(msg.sender, databaseAddr, title);
        require(submittedModels[hashcode].databaseAddr == 0);
        //TODO Check that the DB exists in the underlying DatabaseAssociation
        
        modelsChecked[hashcode] = false;
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
    function checkModel(bytes32 hashcode, bool isValid) onlyAdminOrChecker public {
        require(modelsChecked[hashcode] == false);
        modelsChecked[hashcode] = true;
        if (isValid) {
            activeModelHashes.push(hashcode);
        }
        emit ModelChecked(hashcode, isValid);
    }
}