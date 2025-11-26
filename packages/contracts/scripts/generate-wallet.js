const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

console.log("🔐 Generating new Ethereum wallet for Sepolia testnet...\n");

// Generate a random wallet
const wallet = ethers.Wallet.createRandom();

console.log("✅ Wallet generated successfully!\n");
console.log("📋 Wallet Details:");
console.log("==================");
console.log("Address:", wallet.address);
console.log("Private Key:", wallet.privateKey);
console.log("Mnemonic:", wallet.mnemonic.phrase);
console.log("\n⚠️  IMPORTANT: Save these details securely!");
console.log("⚠️  Never share your private key or mnemonic with anyone!\n");

// Create .env file template
const envContent = `# Sepolia Testnet Configuration
SEPOLIA_RPC_URL=https://rpc.sepolia.org
PRIVATE_KEY=${wallet.privateKey}

# Etherscan API Key (optional, for contract verification)
# Get one at https://etherscan.io/myapikey
ETHERSCAN_API_KEY=

# Wallet Address (for reference)
WALLET_ADDRESS=${wallet.address}
`;

const envPath = path.join(__dirname, "../.env");
fs.writeFileSync(envPath, envContent);

console.log("📄 Created .env file at:", envPath);
console.log("\n🚰 Next Steps:");
console.log("==============");
console.log("1. Get Sepolia ETH from a faucet:");
console.log("   - https://sepoliafaucet.com/");
console.log("   - https://www.alchemy.com/faucets/ethereum-sepolia");
console.log("   - https://faucet.quicknode.com/ethereum/sepolia");
console.log("\n2. Your wallet address to fund:");
console.log("   " + wallet.address);
console.log("\n3. After receiving testnet ETH, deploy with:");
console.log("   npx hardhat run scripts/deploy.js --network sepolia");
console.log("\n4. Then register the AKTA asset:");
