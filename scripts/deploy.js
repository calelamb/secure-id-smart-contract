const hre = require("hardhat");

async function main() {
  const DocumentStore = await hre.ethers.getContractFactory("DocumentStore");
  const contract = await DocumentStore.deploy();
  
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  console.log("Contract deployed to:", contractAddress);
  
  // Test storing a document
  console.log("Testing document storage...");
  const tx = await contract.storeDocument("test.pdf", "0x1234567890abcdef");
  await tx.wait();
  console.log("Test document stored successfully!");
  
  // Now try to get documents
  const docs = await contract.getDocuments();
  console.log("Retrieved documents:", docs);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
