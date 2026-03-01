import Web3 from "web3";

let web3;

export const connectWallet = async () => {
  if (!window.ethereum) {
    alert("MetaMask nije instaliran");
    return null;
  }

  web3 = new Web3(window.ethereum);
  await window.ethereum.request({ method: "eth_requestAccounts" });
  const accounts = await web3.eth.getAccounts();

  return accounts[0];
};

export const signMessage = async (message, account) => {
  if (!web3) {
    web3 = new Web3(window.ethereum);
  }
  
  try {
    const signature = await web3.eth.personal.sign(message, account, "");
    return signature;
  } catch (error) {
    console.error("Error signing message:", error);
    throw error;
  }
};

export const getConnectedAccount = async () => {
  if (!web3) {
    web3 = new Web3(window.ethereum);
  }
  
  try {
    const accounts = await web3.eth.getAccounts();
    return accounts[0] || null;
  } catch (error) {
    console.error("Error getting connected account:", error);
    return null;
  }
};

export const sendTransaction = async (from, to, data = "0x", value = "0") => {
  if (!web3) {
    web3 = new Web3(window.ethereum);
  }
  
  try {
    const txHash = await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [
        {
          from,
          to,
          data,
          value,
        },
      ],
    });
    return txHash;
  } catch (error) {
    console.error("Error sending transaction:", error);
    throw error;
  }
};

export const getTransactionReceipt = async (txHash) => {
  if (!web3) {
    web3 = new Web3(window.ethereum);
  }
  
  try {
    return await web3.eth.getTransactionReceipt(txHash);
  } catch (error) {
    console.error("Error getting transaction receipt:", error);
    return null;
  }
};

export const waitForTransactionConfirmation = async (txHash, confirmations = 1) => {
  if (!web3) {
    web3 = new Web3(window.ethereum);
  }
  
  let receipt = null;
  let confirmationCount = 0;
  const maxAttempts = 60; // 60 * 2 seconds = 2 minutes max wait
  let attempts = 0;

  while (confirmationCount < confirmations && attempts < maxAttempts) {
    try {
      receipt = await web3.eth.getTransactionReceipt(txHash);
    } catch (error) {
      const msg = (error?.message || "").toLowerCase();
      // Some providers temporarily return "transaction not found" right after broadcast.
      if (msg.includes("transaction not found") || msg.includes("not found")) {
        receipt = null;
      } else {
        throw error;
      }
    }
    
    if (receipt) {
      confirmationCount++;
      if (confirmationCount >= confirmations) {
        return receipt;
      }
    }
    
    // Wait 2 seconds before next check
    await new Promise((resolve) => setTimeout(resolve, 2000));
    attempts++;
  }

  if (!receipt) {
    throw new Error("Transaction confirmation timeout");
  }

  return receipt;
};

export const getWeb3 = () => web3;
export const initWeb3 = (provider) => {
  web3 = new Web3(provider);
  return web3;
};

export default web3;
