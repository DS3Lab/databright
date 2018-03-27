pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./SimpleDatabaseFactory.sol";
import "./CuratorToken.sol";

contract Database {
    function addShard(address _curator, string _ipfsHash) public returns (bool);
    
    function getShard(uint _i) public view returns (address, string);

    function getNumberOfShards() public view returns (uint);
}

/**
 * The shareholder association contract itself
 */
contract DatabaseAssociation is Ownable {

    uint public minimumQuorum;
    uint public debatingPeriodInMinutes;
    Proposal[] public proposals;
    uint public numProposals;
    uint public creationReward = 1; // Temporary fixed reward for creating a new database, just so that voting on the first shard can happen
    uint public shardReward = 1000; // Temporary fixed reward for adding a shard to the database
    CuratorToken public sharesTokenAddress;
    SimpleDatabaseFactory public databaseFactory;

    event ProposalAdded(uint proposalID, address recipient, uint amount, string description, string argument, address curator, uint state);
    event Voted(uint proposalID, bool position, address voter);
    event ProposalTallied(uint proposalID, uint result, uint quorum, bool active);
    event ChangeOfRules(uint newMinimumQuorum, uint newDebatingPeriodInMinutes, address newSharesTokenAddress);
    event NewFactory(address newDatabaseFactory);


    struct Proposal {
        address recipient;
        uint amount;
        string description;
        uint votingDeadline;
        bool executed;
        bool proposalPassed;
        uint numberOfVotes;
        bytes32 proposalHash;
        string argument; //either name or ipfsHash
        address curator; //address for shard adder
        uint state;
        Vote[] votes;
        mapping (address => bool) voted;
    }

    struct Vote {
        bool inSupport;
        address voter;
    }

    // Modifier that allows only shareholders to vote and create new proposals
    modifier onlyShareholders {
        require(sharesTokenAddress.balanceOf(msg.sender) > 0);
        _;
    }

    /**
     * Constructor function
     *
     * First time setup
     */
    function DatabaseAssociation(CuratorToken sharesAddress, uint minimumSharesToPassAVote, uint minutesForDebate, uint _creationReward, uint _shardReward) payable public {
        changeVotingRules(sharesAddress, minimumSharesToPassAVote, minutesForDebate);
        databaseFactory = new SimpleDatabaseFactory(); //create new factory
        creationReward = _creationReward;
        shardReward = _shardReward;
        NewFactory(databaseFactory); //throw event!
    }

    /**
     * Change voting rules
     *
     * Make so that proposals need tobe discussed for at least `minutesForDebate/60` hours
     * and all voters combined must own more than `minimumSharesToPassAVote` shares of token `sharesAddress` to be executed
     *
     * @param sharesAddress token address
     * @param minimumSharesToPassAVote proposal can vote only if the sum of shares held by all voters exceed this number
     * @param minutesForDebate the minimum amount of delay between when a proposal is made and when it can be executed
     */
    function changeVotingRules(CuratorToken sharesAddress, uint minimumSharesToPassAVote, uint minutesForDebate) onlyOwner public{
        sharesTokenAddress = CuratorToken(sharesAddress);
        if (minimumSharesToPassAVote == 0 ) minimumSharesToPassAVote = 1;
        minimumQuorum = minimumSharesToPassAVote;
        debatingPeriodInMinutes = minutesForDebate;
        ChangeOfRules(minimumQuorum, debatingPeriodInMinutes, sharesTokenAddress);
    }
    
    /**
     * Add Proposal
     *
     * Propose to send `weiAmount / 1e18` ether to `beneficiary` for `jobDescription`. `transactionBytecode ? Contains : Does not contain` code.
     *
     * @param beneficiary who to send the ether to
     * @param weiAmount amount of ether to send, in wei
     * @param jobDescription Description of job
     * @param transactionBytecode bytecode of transaction
     */
    function newProposal (
        address beneficiary,
        uint weiAmount,
        string jobDescription,
        bytes transactionBytecode,
        string argument,
        address curator, //annoying but we need it to store the data owner
        uint state // use to save state (create database, shards etc)
    ) public
        //onlyShareholders
        returns (uint proposalID)
    {
        proposalID = proposals.length++;
        Proposal storage p = proposals[proposalID];
        p.recipient = beneficiary;
        p.amount = weiAmount;
        p.description = jobDescription;
        p.proposalHash = keccak256(beneficiary, weiAmount, transactionBytecode);
        p.votingDeadline = now + debatingPeriodInMinutes * 1 minutes;
        p.executed = false;
        p.proposalPassed = false;
        p.numberOfVotes = 0;
        p.argument = argument; //argument for creating database (name) or ipfsHash
        p.curator = curator; //argument for curator but we can check for address(0) !
        p.state = state;
        ProposalAdded(proposalID, beneficiary, weiAmount, jobDescription, argument, curator, state);
        numProposals = proposalID+1;

        return proposalID;
    }
    
    /**
      * Add new database
      */
    function proposeAddDatabase(
        string jobDescription,
        string name
    ) public
        returns (uint proposalID)
    {
        return newProposal(databaseFactory, 0, jobDescription, "", name,
                           address(0), 1);
    }
    
    /**
      * Add Shard
      */
    function proposeAddShard(
        address database,
        string jobDescription,
        string ipfsHash,
        address curator
    ) public 
        returns (uint proposalID)
    {
        return newProposal(database, 0, jobDescription, "", ipfsHash, curator, 2);
    }

    /**
     * Check if a proposal code matches
     *
     * @param proposalNumber ID number of the proposal to query
     * @param beneficiary who to send the ether to
     * @param weiAmount amount of ether to send
     * @param transactionBytecode bytecode of transaction
     */
    function checkProposalCode(
        uint proposalNumber,
        address beneficiary,
        uint weiAmount,
        bytes transactionBytecode
    ) public
        constant
        returns (bool codeChecksOut)
    {
        Proposal storage p = proposals[proposalNumber];
        return p.proposalHash == keccak256(beneficiary, weiAmount, transactionBytecode);
    }

    /**
     * Log a vote for a proposal
     *
     * Vote `supportsProposal? in support of : against` proposal #`proposalNumber`
     *
     * @param proposalNumber number of proposal
     * @param supportsProposal either in favor or against it
     */
    function vote(
        uint proposalNumber,
        bool supportsProposal
    ) public
        onlyShareholders
        returns (uint voteID)
    {
        Proposal storage p = proposals[proposalNumber];
        require(p.voted[msg.sender] != true);

        voteID = p.votes.length++;
        p.votes[voteID] = Vote({inSupport: supportsProposal, voter: msg.sender});
        p.voted[msg.sender] = true;
        p.numberOfVotes = voteID +1;
        Voted(proposalNumber,  supportsProposal, msg.sender);
        return voteID;
    }

    /**
     * Finish vote
     *
     * Count the votes proposal #`proposalNumber` and execute it if approved
     *
     * @param proposalNumber proposal number
     * @param transactionBytecode optional: if the transaction contained a bytecode, you need to send it
     */
    function executeProposal(uint proposalNumber, bytes transactionBytecode) public onlyOwner {
        Proposal storage p = proposals[proposalNumber];

        require(now > p.votingDeadline                                             // If it is past the voting deadline
            && !p.executed                                                          // and it has not already been executed
            && p.proposalHash == keccak256(p.recipient, p.amount, transactionBytecode)
            && owner == sharesTokenAddress.owner()); // and the supplied code matches the proposal...


        // ...then tally the results
        uint quorum = 0;
        uint yea = 0;
        uint nay = 0;

        for (uint i = 0; i <  p.votes.length; ++i) {
            Vote storage v = p.votes[i];
            uint voteWeight = sharesTokenAddress.balanceOf(v.voter);
            quorum += voteWeight;
            if (v.inSupport) {
                yea += voteWeight;
            } else {
                nay += voteWeight;
            }
        }

        require(quorum >= minimumQuorum); // Check if a minimum quorum has been reached

        if (yea > nay) {
            // Proposal passed; execute the transaction

            if (p.state == 1) {
                require(databaseFactory.createDatabase(p.argument));
                // On database creation, the association owner gets a symbolic token to vote on the first shard proposal
                // The DatabaseAssociation owner also needs to own the CuratorToken for minting
                sharesTokenAddress.mint(owner, creationReward);
            } else if (p.state == 2) {
                Database db = Database(p.recipient);
                // if this is the first shard, burn the symbolic token of the owner
                if(db.getNumberOfShards() == 0) {
                  sharesTokenAddress.burn(creationReward);
                }
                require(db.addShard(p.curator, p.argument)); // TODO: Are the transactions atomic?
                sharesTokenAddress.mint(p.curator, shardReward);
            } else {
                require(p.recipient.call.value(p.amount)(transactionBytecode));
            }

            p.executed = true;
            p.proposalPassed = true;
        } else {
            // Proposal failed
            p.proposalPassed = false;
        }

        // Fire Events
        ProposalTallied(proposalNumber, yea - nay, quorum, p.proposalPassed);
    }
}

