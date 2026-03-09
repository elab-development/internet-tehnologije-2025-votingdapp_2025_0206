// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.19;

contract Group {

    address public admin;

    uint public memberCount;
    uint public topicCount;

    struct Member {
        bool everJoined;
        bool exists;
        uint joinedAtTopic;
        uint leftAtTopic;
    }

    struct Topic {
        string metadataURI; 
        uint votersCount;
        uint votesYes;
        uint votesNo;
        uint votesAbstain;
        bool finalized;
        uint8 result;
        mapping(address => bool) voted;
    }

    mapping(address => Member) public members;
    mapping(uint => Topic) public topics;

    event MemberAdded(address member);
    event MemberRemoved(address member);

    event TopicCreated(uint topicId, string metadataURI);

    event VoteCast(
        uint topicId,
        address voter,
        uint8 vote
    );

    event TopicFinalized(
        uint topicId,
        uint8 result
    );

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    constructor(address _admin) {
        admin = _admin;
        members[_admin] = Member(true,true, 0, 0);
        memberCount = 1;
    }

    function addMember(address user)
        external
        onlyAdmin
    {
        require(!members[user].exists);

        members[user] = Member(
            true,
            true,
            topicCount,
            0
        );

        memberCount++;

        emit MemberAdded(user);
    }

    function removeMember(address user)
        external
        onlyAdmin
    {
        Member storage m = members[user];

        require(m.exists, "Not a member");

        m.exists = false;
        m.leftAtTopic = topicCount;

        memberCount--;

        emit MemberRemoved(user);
    }

    function createTopic(string calldata metadataURI)
        external
        onlyAdmin
    {
        Topic storage t = topics[topicCount];

        t.metadataURI = metadataURI;
        t.votersCount = memberCount;

        emit TopicCreated(topicCount, metadataURI);

        topicCount++;
    }
    

    function vote(uint topicId, uint8 choice)
        external
    {
        Topic storage t = topics[topicId];

        require(!t.finalized);
        require(topicId < topicCount, "Invalid topic");
        require(choice <= 2, "Invalid vote");


        Member storage m = members[msg.sender];

        require(m.everJoined, "Not a member");
        require(m.joinedAtTopic <= topicId &&(m.leftAtTopic == 0 || m.leftAtTopic > topicId),"Not eligible");



        require(!t.voted[msg.sender], "Already voted");

        t.voted[msg.sender] = true;

        if(choice == 0) t.votesYes++;
        else if(choice == 1) t.votesNo++;
        else if(choice == 2) t.votesAbstain++;

        emit VoteCast(topicId, msg.sender, choice);

        tryFinalize(topicId);
    }

    function tryFinalize(uint topicId)
        public
    {
        Topic storage t = topics[topicId];

        if(t.finalized) return;

        uint total = t.votersCount;

        uint yes = t.votesYes;
        uint no = t.votesNo;
        uint abstain = t.votesAbstain;

        uint cast = yes + no + abstain;
        uint remaining = total - cast;

        uint majority = (total / 2) + 1;

        if (yes > no + remaining) {
            finalize(topicId, 0);
            return;
        }

        if (no > yes + remaining) {
            finalize(topicId, 1);
            return;
        }

        if (
            yes + remaining < majority &&
            no + remaining < majority
        ) {
            finalize(topicId, 2);
            return;
        }
    }

    function finalize(uint topicId, uint8 result)
        internal
    {
        Topic storage t = topics[topicId];

        t.finalized = true;
        t.result = result;

        emit TopicFinalized(topicId, result);
    }
}