const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const assetCode = process.argv[2] || "QXMP:AKTA-NI43-ZA";
  
  console.log("🔍 Verifying Asset on-chain...\n");
  console.log("Asset Code:", assetCode);

  // Load deployment info
  const deploymentsDir = path.join(__dirname, "../deployments");
  const deploymentFiles = fs.readdirSync(deploymentsDir)
    .filter(f => f.startsWith(hre.network.name))
    .sort()
    .reverse();

  if (deploymentFiles.length === 0) {
    throw new Error(`No deployment found for network: ${hre.network.name}`);
  }

  const latestDeployment = JSON.parse(
    fs.readFileSync(path.join(deploymentsDir, deploymentFiles[0]), 'utf8')
  );

  console.log("Network:", hre.network.name);
  console.log("Registry:", latestDeployment.contracts.QXMPAssetRegistry);
  console.log("ProofOfReserve:", latestDeployment.contracts.QXMPProofOfReserve, "\n");

  // Get contracts
  const QXMPProofOfReserve = await hre.ethers.getContractFactory("QXMPProofOfReserve");
  const proofOfReserve = QXMPProofOfReserve.attach(latestDeployment.contracts.QXMPProofOfReserve);

  const QXMPAssetRegistry = await hre.ethers.getContractFactory("QXMPAssetRegistry");
  const registryAddress = await proofOfReserve.registry();
  const registry = QXMPAssetRegistry.attach(registryAddress);

  // Generate asset code hash
  const assetCodeHash = hre.ethers.utils.id(assetCode);
  console.log("Asset Code Hash:", assetCodeHash, "\n");

  try {
    // Get asset from registry
    const asset = await registry.getAsset(assetCodeHash);
    
    console.log("✅ Asset Found!\n");
    console.log("📊 Asset Details:");
    console.log("================");
    console.log("Asset Name:", asset.assetName);
    console.log("Reporting Standard:", asset.reportingStandard);
    console.log("Jurisdiction:", asset.jurisdiction);
    console.log("Asset Value:", hre.ethers.utils.formatEther(asset.assetValueUsd), "ETH equivalent");
    console.log("             ", `$${(parseFloat(hre.ethers.utils.formatEther(asset.assetValueUsd)) * 1e9).toFixed(2)}B USD (approx)`);
    console.log("Mineral Resources:", asset.mineralResourcesMt.toString(), "Mt");
    console.log("Gold In Situ:", asset.goldOzInSitu.toString(), "oz");
    console.log("Report Hash:", asset.reportHash);
    console.log("Last Updated:", new Date(asset.lastUpdated.toNumber() * 1000).toISOString());
    console.log("Holder:", asset.holder);
    console.log("Active:", asset.isActive);
    
    // Get total asset count
    const assetCount = await registry.getAssetCount();
    console.log("\n📈 Registry Stats:");
    console.log("Total Assets:", assetCount.toString());
    
    // Try to get latest proof
    console.log("\n🔐 Proof-of-Reserve Status:");
    try {
      const proof = await proofOfReserve.getLatestProof(assetCodeHash);
      if (proof.timestamp.toNumber() > 0) {
        console.log("Latest Proof Value:", proof.value.toString());
        console.log("Proof Timestamp:", new Date(proof.timestamp.toNumber() * 1000).toISOString());
        console.log("Data Feed ID:", proof.dataFeedId);
      } else {
        console.log("⚠️  No proof submitted yet");
      }
    } catch (error) {
      console.log("⚠️  No proof submitted yet");
    }
    
    console.log("\n✅ Verification complete!\n");
    
  } catch (error) {
    console.log("❌ Asset not found in registry");
    console.log("Error:", error.message, "\n");
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
