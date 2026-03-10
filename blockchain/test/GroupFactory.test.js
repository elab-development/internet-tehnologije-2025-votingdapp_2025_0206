const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GroupFactory Smart Contract - Unit Testovi", function () {
  
  it("Trebalo bi da se uspešno postavi na mrežu (Deploy)", async function () {
    const GroupFactory = await ethers.getContractFactory("GroupFactory");
    
    // Simuliramo postavljanje na mrežu
    const factory = await GroupFactory.deploy();

    // Ethers.js v6 koristi .target, a starije verzije .address
    const contractAddress = factory.target || factory.address;

    // Proveravamo da li je ugovor dobio validnu blockchain adresu
    expect(contractAddress).to.be.properAddress;
    console.log("GroupFactory uspešno postavljen na adresi:", contractAddress);
  });

});