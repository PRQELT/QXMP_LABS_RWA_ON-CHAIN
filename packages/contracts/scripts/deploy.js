const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying QXMP Labs Proof-of-Reserves Contracts...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", (await deployer.getBalance()).toString(), "\n");

  // Deploy QXMPAssetRegistry
  console.log("📦 Deploying QXMPAssetRegistry...");
  const QXMPAssetRegistry = await hre.ethers.getContractFactory("QXMPAssetRegistry");
  const registry = await QXMPAssetRegistry.deploy();
  await registry.deployed();
  console.log("✅ QXMPAssetRegistry deployed to:", registry.address);

  // Deploy QXMPProofOfReserve
  console.log("\n📦 Deploying QXMPProofOfReserve...");
  const QXMPProofOfReserve = await hre.ethers.getContractFactory("QXMPProofOfReserve");
  const proofOfReserve = await QXMPProofOfReserve.deploy(registry.address);
  await proofOfReserve.deployed();
  console.log("✅ QXMPProofOfReserve deployed to:", proofOfReserve.address);

  // Transfer registry ownership to ProofOfReserve contract
  console.log("\n🔐 Transferring registry ownership to ProofOfReserve contract...");
  const transferTx = await registry.transferOwnership(proofOfReserve.address);
  await transferTx.wait();
  console.log("✅ Ownership transferred");

  // Save deployment addresses
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    contracts: {
      QXMPAssetRegistry: registry.address,
      QXMPProofOfReserve: proofOfReserve.address
    },
    timestamp: new Date().toISOString()
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const filename = `${hre.network.name}-${Date.now()}.json`;
  fs.writeFileSync(
    path.join(deploymentsDir, filename),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n📄 Deployment info saved to:", filename);
  console.log("\n🎉 Deployment complete!\n");
  console.log("Contract Addresses:");
  console.log("===================");
  console.log("QXMPAssetRegistry:", registry.address);
  console.log("QXMPProofOfReserve:", proofOfReserve.address);
  console.log("\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
