const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Registering AKTA Gold Project Asset...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Using account:", deployer.address);
  console.log("💰 Account balance:", (await deployer.getBalance()).toString(), "\n");

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

  console.log("📦 Using deployment:", deploymentFiles[0]);
  console.log("Registry:", latestDeployment.contracts.QXMPAssetRegistry);
  console.log("ProofOfReserve:", latestDeployment.contracts.QXMPProofOfReserve, "\n");

  // Load AKTA asset data
  const aktaDataPath = path.join(__dirname, "../../../data/assets/QXMP_AKTA-NI43-ZA.json");
  const aktaData = JSON.parse(fs.readFileSync(aktaDataPath, 'utf8'));

  console.log("📄 AKTA Asset Data:");
  console.log("  Asset Code:", aktaData.asset_code);
  console.log("  Asset Name:", aktaData.asset_name);
  console.log("  Value:", `$${(aktaData.asset_value_usd / 1e9).toFixed(2)}B USD`);
  console.log("  Resources:", `${(aktaData.mineral_resources_mt / 1e6).toFixed(1)}M Mt`);
  console.log("  Gold:", `${aktaData.gold_oz_in_situ.toLocaleString()} oz`);
  console.log("  Report Hash:", aktaData.report_hash, "\n");

  // Get ProofOfReserve contract (which owns the registry)
  const QXMPProofOfReserve = await hre.ethers.getContractFactory("QXMPProofOfReserve");
  const proofOfReserve = QXMPProofOfReserve.attach(latestDeployment.contracts.QXMPProofOfReserve);

  // Get Registry contract
  const QXMPAssetRegistry = await hre.ethers.getContractFactory("QXMPAssetRegistry");
  const registryAddress = await proofOfReserve.registry();
  const registry = QXMPAssetRegistry.attach(registryAddress);

  console.log("🔍 Checking if asset already registered...");
  
  // Generate asset code hash
  const assetCodeHash = hre.ethers.utils.id(aktaData.asset_code);
  
  try {
    const existingAsset = await registry.getAsset(assetCodeHash);
    console.log("⚠️  Asset already registered!");
    console.log("   Current Value:", hre.ethers.utils.formatEther(existingAsset.assetValueUsd), "ETH equivalent");
    console.log("   Last Updated:", new Date(existingAsset.lastUpdated.toNumber() * 1000).toISOString());
    console.log("\n✅ Registration check complete - asset exists\n");
    return;
  } catch (error) {
    // Asset doesn't exist, proceed with registration
    console.log("✓ Asset not yet registered, proceeding...\n");
  }

  // Prepare registration parameters
  const assetValueWei = hre.ethers.utils.parseEther(aktaData.asset_value_usd.toString());
  const reportHashBytes = aktaData.report_hash.startsWith('0x') 
    ? aktaData.report_hash 
    : '0x' + aktaData.report_hash;

  console.log("📝 Registration Parameters:");
  console.log("  Asset Code Hash:", assetCodeHash);
  console.log("  Asset Name:", aktaData.asset_name);
  console.log("  Standard:", aktaData.reporting_standard);
  console.log("  Jurisdiction:", aktaData.jurisdiction);
  console.log("  Value (Wei):", assetValueWei.toString());
  console.log("  Resources (Mt):", aktaData.mineral_resources_mt);
  console.log("  Gold (oz):", aktaData.gold_oz_in_situ);
  console.log("  Report Hash:", reportHashBytes);
  console.log("  Holder:", aktaData.holder, "\n");

  // Register the asset through ProofOfReserve contract
  console.log("🔐 Registering asset on-chain...");
  const tx = await proofOfReserve.registerAsset(
    assetCodeHash,
    aktaData.asset_name,
    aktaData.reporting_standard,
    aktaData.jurisdiction,
    assetValueWei,
    aktaData.mineral_resources_mt,
    aktaData.gold_oz_in_situ,
    reportHashBytes,
    deployer.address  // QXMP Labs as holder
  );

  console.log("⏳ Transaction submitted:", tx.hash);
  console.log("   Waiting for confirmation...");
  
  const receipt = await tx.wait();
  console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
  console.log("   Gas used:", receipt.gasUsed.toString());
  console.log("   Status:", receipt.status === 1 ? "Success" : "Failed", "\n");

  // Verify registration
  console.log("🔍 Verifying registration...");
  const registeredAsset = await registry.getAsset(assetCodeHash);
  
  console.log("✅ Asset successfully registered!");
  console.log("   Asset Code:", registeredAsset.assetCode);
  console.log("   Asset Name:", registeredAsset.assetName);
  console.log("   Value:", hre.ethers.utils.formatEther(registeredAsset.assetValueUsd), "ETH equivalent");
  console.log("   Resources:", registeredAsset.mineralResourcesMt.toString(), "Mt");
  console.log("   Gold:", registeredAsset.goldOzInSitu.toString(), "oz");
  console.log("   Active:", registeredAsset.isActive);
  console.log("   Holder:", registeredAsset.holder);
  
  // Get asset count
  const assetCount = await registry.getAssetCount();
  console.log("\n📊 Total assets in registry:", assetCount.toString());

  // Save registration info
  const registrationInfo = {
    network: hre.network.name,
    assetCode: aktaData.asset_code,
    assetCodeHash: assetCodeHash,
    transactionHash: tx.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    timestamp: new Date().toISOString(),
    registryAddress: registry.address,
    holder: deployer.address
  };

  const registrationFile = path.join(deploymentsDir, `registration-${hre.network.name}-${Date.now()}.json`);
  fs.writeFileSync(registrationFile, JSON.stringify(registrationInfo, null, 2));
  console.log("\n📄 Registration info saved to:", path.basename(registrationFile));
  
  console.log("\n🎉 AKTA Gold Project successfully registered on-chain!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
