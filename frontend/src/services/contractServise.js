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
  web3 = initWeb3IfNeeded();

  const factoryAddress = process.env.REACT_APP_GROUP_FACTORY_CONTRACT_ADDRESS;
  if (!factoryAddress) {
    throw new Error("REACT_APP_GROUP_FACTORY_CONTRACT_ADDRESS is not configured");
  }

  const factory = new web3.eth.Contract(groupFactoryABI.abi, factoryAddress);
  const data = factory.methods.createGroup().encodeABI();
  const txHash = await sendTransaction(accountAddress, factoryAddress, data);

  let groupAddress = null;
  try {
    const receipt = await waitForTransactionConfirmation(txHash);
    groupAddress = parseGroupCreatedEvent(factory, receipt);
  } catch {
    groupAddress = null;
  }

  return {
    txHash,
    groupAddress
  };
};

export const addMemberToGroup = async (groupAddress, memberAddress, adminAddress) => {
  web3 = initWeb3IfNeeded();
  const group = new web3.eth.Contract(groupABI.abi, groupAddress);
  const data = group.methods.addMember(memberAddress).encodeABI();
  const txHash = await sendTransaction(adminAddress, groupAddress, data);
  await waitForTransactionConfirmation(txHash);
  return { txHash };
};

export const removeMemberFromGroup = async (groupAddress, memberAddress, adminAddress) => {
  web3 = initWeb3IfNeeded();
  const group = new web3.eth.Contract(groupABI.abi, groupAddress);
  const data = group.methods.removeMember(memberAddress).encodeABI();
  const txHash = await sendTransaction(adminAddress, groupAddress, data);
  await waitForTransactionConfirmation(txHash);
  return { txHash };
};

export const createTopic = async (groupAddress, ipfsHash, adminAddress) => {
  web3 = initWeb3IfNeeded();
  const checksumGroupAddress = web3.utils.toChecksumAddress(groupAddress);
  const group = new web3.eth.Contract(groupABI.abi, checksumGroupAddress);
  const data = group.methods.createTopic(ipfsHash).encodeABI();
  const txHash = await sendTransaction(adminAddress, checksumGroupAddress, data);
  const receipt = await waitForTransactionConfirmation(txHash);
  const topicId = parseTopicCreatedEvent(group, receipt);
  return { txHash, topicId };
};

export const castVote = async (groupAddress, topicId, choice, voterAddress) => {
  web3 = initWeb3IfNeeded();
  const checksumGroupAddress = web3.utils.toChecksumAddress(groupAddress);
  const group = new web3.eth.Contract(groupABI.abi, checksumGroupAddress);
  const data = group.methods.vote(topicId, choice).encodeABI();
  const txHash = await sendTransaction(voterAddress, checksumGroupAddress, data);
  await waitForTransactionConfirmation(txHash);
  return { txHash };
};

export const finalizeTopic = async (groupAddress, topicId, adminAddress) => {
  web3 = initWeb3IfNeeded();
  const checksumGroupAddress = web3.utils.toChecksumAddress(groupAddress);
  const group = new web3.eth.Contract(groupABI.abi, checksumGroupAddress);
  const data = group.methods.finalize(topicId).encodeABI();
  const txHash = await sendTransaction(adminAddress, checksumGroupAddress, data);
  await waitForTransactionConfirmation(txHash);
  return { txHash };
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
  if (!receipt || !receipt.logs) {
    throw new Error("Missing transaction receipt logs");
  }

  if (group?.events?.TopicCreated?.parse) {
    const events = group.events.TopicCreated.parse(receipt.logs);
    if (events.length > 0) {
      return parseInt(events[0].returnValues.topicId, 10);
    }
  }

  const eventSignature = web3.eth.abi.encodeEventSignature("TopicCreated(uint256,string)");
  const eventLog = receipt.logs.find(
    (log) => Array.isArray(log.topics) && log.topics[0] === eventSignature
  );

  if (!eventLog) {
    throw new Error("TopicCreated event not found in transaction receipt");
  }

  const decoded = web3.eth.abi.decodeLog(
    [
      { type: "uint256", name: "topicId", indexed: false },
      { type: "string", name: "metadataURI", indexed: false },
    ],
    eventLog.data,
    eventLog.topics.slice(1)
  );

  return parseInt(decoded.topicId, 10);
};
