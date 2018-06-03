pragma solidity ^0.4.21;

import "openzeppelin-solidity/contracts/ownership/rbac/RBACWithAdmin.sol";
import "./DatabaseAssociation.sol";

contract ModelMarket is RBACWithAdmin {

    string constant ROLE_MODELCHECKER = "modelchecker";

    Model[] activeModels;
    Model[] submittedModels;
    DatabaseAssociation underlying;

    struct Model {
        address owner;
        string id;
        address databaseAddr;
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
    event ModelSubmitted(string id, uint idx);
    event ModelChecked(string id, uint idx, bool isValid);
    event DBAChanged(address newDBA);

    function ModelMarket(address databaseAssociation, address modelChecker) public {
        underlying = DatabaseAssociation(databaseAssociation);
        addRole(modelChecker, ROLE_MODELCHECKER);
    }

    function changeDatabaseAssociation(address newDBA) onlyAdmin public {
        underlying = DatabaseAssociation(newDBA);        
        emit DBAChanged(newDBA);
    }

    function checkModel(string id, uint idx, bool isValid) onlyAdminOrChecker public {
        if (isValid) {
            activeModels.push(submittedModels[idx]);
        }
        emit ModelChecked(id, idx, isValid);
    }
}