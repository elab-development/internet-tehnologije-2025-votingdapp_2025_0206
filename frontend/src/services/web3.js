import Web3 from "web3";

let web3;

const ensureWeb3 = () => {
  if (!window.ethereum) {
    throw new Error("MetaMask nije instaliran");
  }
  if (!web3) {
    web3 = new Web3(window.ethereum);
  }
  return web3;
};

export const connectWallet = async () => {
  if (!window.ethereum) {
    return null;
  }

  web3 = ensureWeb3();
  await window.ethereum.request({ method: "eth_requestAccounts" });
  const accounts = await web3.eth.getAccounts();

  return accounts[0];
};

export const sendTransaction = async (from, to, data = "0x") => {
  ensureWeb3();
  return window.ethereum.request({
    method: "eth_sendTransaction",
    params: [
      {
        from,
        to,
        data,
      },
    ],
  });
};

export const waitForTransactionConfirmation = async (txHash) => {
  web3 = ensureWeb3();
  let receipt = null;
  const maxAttempts = 60; // 60 * 2 seconds = 2 minutes max wait
  let attempts = 0;

  while (!receipt && attempts < maxAttempts) {
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
      return receipt;
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
