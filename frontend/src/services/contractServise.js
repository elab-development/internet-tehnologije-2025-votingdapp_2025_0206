import Web3 from "web3";
import groupFactoryABI from "../contracts/groupFactory.json";
import groupABI from "../contracts/group.json";
import { sendTransaction, waitForTransactionConfirmation } from "./web3";

let web3;

// Initialize web3 if not already done
const initWeb3IfNeeded = () => {
  if (!web3) {
    web3 = new Web3(window.ethereum || Web3.givenProvider);
  }
  return web3;
};

export const createGroupOnBlockchain = async (accountAddress) => {
  try {
    web3 = initWeb3IfNeeded();
    
    const factoryAddress = process.env.REACT_APP_GROUP_FACTORY_CONTRACT_ADDRESS;
    if (!factoryAddress) {
      throw new Error("REACT_APP_GROUP_FACTORY_CONTRACT_ADDRESS is not configured");
    }
    
    const factory = new web3.eth.Contract(groupFactoryABI.abi, factoryAddress);
    
    // Encode the function call
    const data = factory.methods.createGroup().encodeABI();
    
    // Send transaction
    const txHash = await sendTransaction(
      accountAddress,
      factoryAddress,
      data
    );
    
    let groupAddress = null;
    let receipt = null;
    // Receipt parsing is best-effort; backend still verifies txHash and can keep pending row.
    try {
      receipt = await waitForTransactionConfirmation(txHash);
      try {
        groupAddress = parseGroupCreatedEvent(factory, receipt);
      } catch (parseError) {
        console.warn("GroupCreated parse warning:", parseError);
      }
    } catch (confirmationError) {
      console.warn("Receipt wait warning:", confirmationError);
    }
    
    return {
      txHash,
      groupAddress,
      receipt
    };
  } catch (error) {
    console.error("Error creating group on blockchain:", error);
    throw error;
  }
};

export const addMemberToGroup = async (groupAddress, memberAddress, adminAddress) => {
  try {
    web3 = initWeb3IfNeeded();
    
    const group = new web3.eth.Contract(groupABI.abi, groupAddress);
    
    // Encode the function call
    const data = group.methods.addMember(memberAddress).encodeABI();
    
    // Send transaction
    const txHash = await sendTransaction(
      adminAddress,
      groupAddress,
      data
    );
    
    // Wait for confirmation
    const receipt = await waitForTransactionConfirmation(txHash);
    
    return {
      txHash,
      receipt
    };
  } catch (error) {
    console.error("Error adding member to group:", error);
    throw error;
  }
};

export const removeMemberFromGroup = async (groupAddress, memberAddress, adminAddress) => {
  try {
    web3 = initWeb3IfNeeded();
    
    const group = new web3.eth.Contract(groupABI.abi, groupAddress);
    
    // Encode the function call
    const data = group.methods.removeMember(memberAddress).encodeABI();
    
    // Send transaction
    const txHash = await sendTransaction(
      adminAddress,
      groupAddress,
      data
    );
    
    // Wait for confirmation
    const receipt = await waitForTransactionConfirmation(txHash);
    
    return {
      txHash,
      receipt
    };
  } catch (error) {
    console.error("Error removing member from group:", error);
    throw error;
  }
};

export const createTopic = async (groupAddress, ipfsHash, adminAddress) => {
  try {
    web3 = initWeb3IfNeeded();
    
    const group = new web3.eth.Contract(groupABI.abi, groupAddress);
    
    // Encode the function call
    const data = group.methods.createTopic(ipfsHash).encodeABI();
    
    // Send transaction
    const txHash = await sendTransaction(
      adminAddress,
      groupAddress,
      data
    );
    
    // Wait for confirmation
    const receipt = await waitForTransactionConfirmation(txHash);
    
    // Parse the logs to get the topic ID
    const topicId = parseTopicCreatedEvent(group, receipt);
    
    return {
      txHash,
      topicId,
      receipt
    };
  } catch (error) {
    console.error("Error creating topic:", error);
    throw error;
  }
};

export const castVote = async (groupAddress, topicId, choice, voterAddress) => {
  try {
    web3 = initWeb3IfNeeded();
    
    const group = new web3.eth.Contract(groupABI.abi, groupAddress);
    
    // Encode the function call
    const data = group.methods.vote(topicId, choice).encodeABI();
    
    // Send transaction
    const txHash = await sendTransaction(
      voterAddress,
      groupAddress,
      data
    );
    
    // Wait for confirmation
    const receipt = await waitForTransactionConfirmation(txHash);
    
    return {
      txHash,
      receipt
    };
  } catch (error) {
    console.error("Error casting vote:", error);
    throw error;
  }
};

export const getGroupInfo = async (groupAddress) => {
  try {
    web3 = initWeb3IfNeeded();
    
    const group = new web3.eth.Contract(groupABI.abi, groupAddress);
    
    const admin = await group.methods.admin().call();
    const memberCount = await group.methods.memberCount().call();
    const topicCount = await group.methods.topicCount().call();
    
    return {
      admin,
      memberCount: parseInt(memberCount),
      topicCount: parseInt(topicCount)
    };
  } catch (error) {
    console.error("Error getting group info:", error);
    throw error;
  }
};

export const getTopicInfo = async (groupAddress, topicId) => {
  try {
    web3 = initWeb3IfNeeded();
    
    const group = new web3.eth.Contract(groupABI.abi, groupAddress);
    
    const topic = await group.methods.topics(topicId).call();
    
    return {
      metadataURI: topic.metadataURI,
      votersCount: parseInt(topic.votersCount),
      votesYes: parseInt(topic.votesYes),
      votesNo: parseInt(topic.votesNo),
      votesAbstain: parseInt(topic.votesAbstain),
      finalized: topic.finalized,
      result: parseInt(topic.result)
    };
  } catch (error) {
    console.error("Error getting topic info:", error);
    throw error;
  }
};

export const isMember = async (groupAddress, memberAddress) => {
  try {
    web3 = initWeb3IfNeeded();
    
    const group = new web3.eth.Contract(groupABI.abi, groupAddress);
    
    const member = await group.methods.members(memberAddress).call();
    
    return member.exists;
  } catch (error) {
    console.error("Error checking membership:", error);
    throw error;
  }
};

export const hasVoted = async (groupAddress, topicId, voterAddress) => {
  try {
    web3 = initWeb3IfNeeded();
    
    const group = new web3.eth.Contract(groupABI.abi, groupAddress);
    
    const topic = await group.methods.topics(topicId).call();
    
    return topic.voted[voterAddress] || false;
  } catch (error) {
    console.error("Error checking vote status:", error);
    throw error;
  }
};

const parseGroupCreatedEvent = (factory, receipt) => {
  if (!receipt || !receipt.logs) {
    throw new Error("Missing transaction receipt logs");
  }

  // Try contract helper first (works in some web3 versions)
  if (factory?.events?.GroupCreated?.parse) {
    const events = factory.events.GroupCreated.parse(receipt.logs);
    if (events.length > 0) {
      return events[0].returnValues.groupAddress;
    }
  }

  // Fallback: decode raw logs manually
  const eventSignature = web3.eth.abi.encodeEventSignature("GroupCreated(address,address)");
  const eventLog = receipt.logs.find(
    (log) => Array.isArray(log.topics) && log.topics[0] === eventSignature
  );

  if (!eventLog) {
    throw new Error("GroupCreated event not found in transaction receipt");
  }

  const decoded = web3.eth.abi.decodeLog(
    [
      { type: "address", name: "groupAddress", indexed: false },
      { type: "address", name: "admin", indexed: false },
    ],
    eventLog.data,
    eventLog.topics.slice(1)
  );

  return decoded.groupAddress;
};

const parseTopicCreatedEvent = (group, receipt) => {
  const events = group.events.TopicCreated.parse(receipt.logs);
  if (events.length > 0) {
    return parseInt(events[0].returnValues.topicId);
  }
  throw new Error("TopicCreated event not found in transaction receipt");
};

const groupService = {
  createGroupOnBlockchain,
  addMemberToGroup,
  removeMemberFromGroup,
  createTopic,
  castVote,
  getGroupInfo,
  getTopicInfo,
  isMember,
  hasVoted
};
export default groupService;
