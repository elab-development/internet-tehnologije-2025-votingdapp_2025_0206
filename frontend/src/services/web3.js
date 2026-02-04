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

export default web3;
