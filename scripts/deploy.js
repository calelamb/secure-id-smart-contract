const hre = require("hardhat");

async function main() {
  // Grab local test signer
  const [user] = await hre.ethers.getSigners();

  // Your deployed contract address
  const contractAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

  // Get contract instance
  const DocumentStore = await hre.ethers.getContractFactory("DocumentStore");
  const contract = await DocumentStore.attach(contractAddress);

  // Store a new document
  const tx = await contract.connect(user).storeDocument("Birth Certificate", "0xabcdef1234567890");
  await tx.wait();

  console.log("Document stored!");

  // Retrieve documents for this user
  const docs = await contract.connect(user).getDocuments();

  console.log("Stored documents:");
  for (const doc of docs) {
    console.log(`Type: ${doc.docType}, Hash: ${doc.fileHash}, Timestamp: ${doc.timestamp}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});