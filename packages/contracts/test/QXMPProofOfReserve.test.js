const { expect } = require("chai");
const { ethers } = require("hardhat");
const { WrapperBuilder } = require("@redstone-finance/evm-connector");
const { getSignersForDataServiceId } = require("@redstone-finance/sdk");

describe("QXMPProofOfReserve", function () {
  let registry;
  let proofOfReserve;
  let owner;
  let addr1;
  
  // AKTA Gold Project test data
  const AKTA_ASSET_CODE = ethers.utils.id("QXMP:AKTA-NI43-ZA");
  const AKTA_NAME = "AEM Gold Project";
  const AKTA_STANDARD = "NI 43-101";
  const AKTA_JURISDICTION = "ZA";
  const AKTA_VALUE = ethers.utils.parseEther("6800000000");
  const AKTA_RESOURCES = 25000000;
  const AKTA_GOLD_OZ = 1562825;
  const AKTA_REPORT_HASH = "0x96e2e35d0f3740c9941eabc471eaa4442dd7b0aed5a257bf53e4b5e9d8105a51";
  
  // RedStone data feed ID for AKTA
  const AKTA_DATA_FEED_ID = ethers.utils.formatBytes32String("AKTA");

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    
    // Deploy Registry
    const QXMPAssetRegistry = await ethers.getContractFactory("QXMPAssetRegistry");
    registry = await QXMPAssetRegistry.deploy();
    await registry.deployed();
    
    // Register AKTA asset
    await registry.registerAsset(
      AKTA_ASSET_CODE,
      AKTA_NAME,
      AKTA_STANDARD,
      AKTA_JURISDICTION,
      AKTA_VALUE,
      AKTA_RESOURCES,
      AKTA_GOLD_OZ,
      AKTA_REPORT_HASH,
      owner.address
    );
    
    // Deploy ProofOfReserve
    const QXMPProofOfReserve = await ethers.getContractFactory("QXMPProofOfReserve");
    proofOfReserve = await QXMPProofOfReserve.deploy(registry.address);
    await proofOfReserve.deployed();
    
    // Transfer registry ownership to ProofOfReserve contract
    await registry.transferOwnership(proofOfReserve.address);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await proofOfReserve.owner()).to.equal(owner.address);
    });

    it("Should set the right registry", async function () {
      expect(await proofOfReserve.registry()).to.equal(registry.address);
    });
  });

  describe("Proof Submission with RedStone", function () {
    it("Should submit proof with RedStone oracle data", async function () {
      const wrappedContract = WrapperBuilder.wrap(proofOfReserve).usingSimpleNumericMock({
        mockSignersCount: 3,
        dataPoints: [
          { dataFeedId: "AKTA", value: 6800000000 }
        ]
      });

      await expect(
        wrappedContract.submitProof(AKTA_ASSET_CODE, AKTA_DATA_FEED_ID)
      ).to.emit(proofOfReserve, "ProofSubmitted");
    });

    it("Should store proof data correctly", async function () {
      const testValue = 6800000000;
      
      const wrappedContract = WrapperBuilder.wrap(proofOfReserve).usingSimpleNumericMock({
        mockSignersCount: 3,
        dataPoints: [
          { dataFeedId: "AKTA", value: testValue }
        ]
      });

      await wrappedContract.submitProof(AKTA_ASSET_CODE, AKTA_DATA_FEED_ID);
      
      const proof = await proofOfReserve.getLatestProof(AKTA_ASSET_CODE);
      expect(proof.value).to.equal(testValue);
      expect(proof.dataFeedId).to.equal(AKTA_DATA_FEED_ID);
    });

    it("Should update registry value", async function () {
      const newValue = ethers.utils.parseEther("7000000000");
      
      const wrappedContract = WrapperBuilder.wrap(proofOfReserve).usingSimpleNumericMock({
        mockSignersCount: 3,
        dataPoints: [
          { dataFeedId: "AKTA", value: newValue }
        ]
      });

      await wrappedContract.submitProof(AKTA_ASSET_CODE, AKTA_DATA_FEED_ID);
      
      const asset = await registry.getAsset(AKTA_ASSET_CODE);
      expect(asset.assetValueUsd).to.equal(newValue);
    });

    it("Should fail if not owner", async function () {
      const wrappedContract = WrapperBuilder.wrap(
        proofOfReserve.connect(addr1)
      ).usingSimpleNumericMock({
        mockSignersCount: 3,
        dataPoints: [
          { dataFeedId: "AKTA", value: 6800000000 }
        ]
      });

      await expect(
        wrappedContract.submitProof(AKTA_ASSET_CODE, AKTA_DATA_FEED_ID)
      ).to.be.revertedWith("Only owner can call this function");
    });
  });

  describe("Oracle Value Reading", function () {
    it("Should read oracle value", async function () {
      const testValue = 6800000000;
      
      const wrappedContract = WrapperBuilder.wrap(proofOfReserve).usingSimpleNumericMock({
        mockSignersCount: 3,
        dataPoints: [
          { dataFeedId: "AKTA", value: testValue }
        ]
      });

      const oracleValue = await wrappedContract.getOracleValue(AKTA_DATA_FEED_ID);
      expect(oracleValue).to.equal(testValue);
    });
  });

  describe("Registry Updates", function () {
    it("Should update registry address", async function () {
      const newRegistry = await (await ethers.getContractFactory("QXMPAssetRegistry")).deploy();
      await newRegistry.deployed();

      await expect(
        proofOfReserve.updateRegistry(newRegistry.address)
      ).to.emit(proofOfReserve, "RegistryUpdated")
        .withArgs(newRegistry.address);

      expect(await proofOfReserve.registry()).to.equal(newRegistry.address);
    });

    it("Should fail to update registry if not owner", async function () {
      const newRegistry = await (await ethers.getContractFactory("QXMPAssetRegistry")).deploy();
      await newRegistry.deployed();

      await expect(
        proofOfReserve.connect(addr1).updateRegistry(newRegistry.address)
      ).to.be.revertedWith("Only owner can call this function");
    });
  });
});
