const hre = require("hardhat");

async function main() {
  console.log("Deploying OfficialDocumentNFT contract...");

  const OfficialDocumentNFT = await hre.ethers.getContractFactory("OfficialDocumentNFT");
  const contract = await OfficialDocumentNFT.deploy();

  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log("OfficialDocumentNFT deployed to:", contractAddress);

  const [deployer] = await hre.ethers.getSigners();
  console.log("Contract owner:", deployer.address);

  console.log("Authorizing deployer as issuer...");
  const tx = await contract.authorizeIssuer(deployer.address, "Stackwell Official");
  await tx.wait();
  console.log("Deployer authorized as issuer!");

  console.log("\n=== Deployment Summary ===");
  console.log("Contract Address:", contractAddress);
  console.log("Owner Address:", deployer.address);
  console.log("Network: Localhost");
  console.log("\nUpdate your .env file with:");
  console.log(`VITE_CONTRACT_ADDRESS=${contractAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
