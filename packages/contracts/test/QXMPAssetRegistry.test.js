const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("QXMPAssetRegistry", function () {
  let registry;
  let owner;
  let addr1;
  
  // AKTA Gold Project test data
  const AKTA_ASSET_CODE = ethers.utils.id("QXMP:AKTA-NI43-ZA");
  const AKTA_NAME = "AEM Gold Project";
  const AKTA_STANDARD = "NI 43-101";
  const AKTA_JURISDICTION = "ZA";
  const AKTA_VALUE = ethers.utils.parseEther("6800000000"); // $6.8B in wei
  const AKTA_RESOURCES = 25000000; // 25M Mt
  const AKTA_GOLD_OZ = 1562825; // Gold ounces
  const AKTA_REPORT_HASH = "0x96e2e35d0f3740c9941eabc471eaa4442dd7b0aed5a257bf53e4b5e9d8105a51";

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    
    const QXMPAssetRegistry = await ethers.getContractFactory("QXMPAssetRegistry");
    registry = await QXMPAssetRegistry.deploy();
    await registry.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await registry.owner()).to.equal(owner.address);
    });

    it("Should start with zero assets", async function () {
      expect(await registry.getAssetCount()).to.equal(0);
    });
  });

  describe("Asset Registration", function () {
    it("Should register a new asset successfully", async function () {
      await expect(
        registry.registerAsset(
          AKTA_ASSET_CODE,
          AKTA_NAME,
          AKTA_STANDARD,
          AKTA_JURISDICTION,
          AKTA_VALUE,
          AKTA_RESOURCES,
          AKTA_GOLD_OZ,
          AKTA_REPORT_HASH,
          owner.address
        )
      ).to.emit(registry, "AssetRegistered")
        .withArgs(AKTA_ASSET_CODE, AKTA_NAME, AKTA_VALUE, AKTA_REPORT_HASH);
    });

    it("Should store asset data correctly", async function () {
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

      const asset = await registry.getAsset(AKTA_ASSET_CODE);
      
      expect(asset.assetCode).to.equal(AKTA_ASSET_CODE);
      expect(asset.assetName).to.equal(AKTA_NAME);
      expect(asset.reportingStandard).to.equal(AKTA_STANDARD);
      expect(asset.jurisdiction).to.equal(AKTA_JURISDICTION);
      expect(asset.assetValueUsd).to.equal(AKTA_VALUE);
      expect(asset.mineralResourcesMt).to.equal(AKTA_RESOURCES);
      expect(asset.goldOzInSitu).to.equal(AKTA_GOLD_OZ);
      expect(asset.reportHash).to.equal(AKTA_REPORT_HASH);
      expect(asset.holder).to.equal(owner.address);
      expect(asset.isActive).to.equal(true);
    });

    it("Should increment asset count", async function () {
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

      expect(await registry.getAssetCount()).to.equal(1);
    });

    it("Should fail if not owner", async function () {
      await expect(
        registry.connect(addr1).registerAsset(
          AKTA_ASSET_CODE,
          AKTA_NAME,
          AKTA_STANDARD,
          AKTA_JURISDICTION,
          AKTA_VALUE,
          AKTA_RESOURCES,
          AKTA_GOLD_OZ,
          AKTA_REPORT_HASH,
          owner.address
        )
      ).to.be.revertedWith("Only owner can call this function");
    });

    it("Should fail if asset already registered", async function () {
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

      await expect(
        registry.registerAsset(
          AKTA_ASSET_CODE,
          AKTA_NAME,
          AKTA_STANDARD,
          AKTA_JURISDICTION,
          AKTA_VALUE,
          AKTA_RESOURCES,
          AKTA_GOLD_OZ,
          AKTA_REPORT_HASH,
          owner.address
        )
      ).to.be.revertedWith("Asset already registered");
    });
  });

  describe("Asset Updates", function () {
    beforeEach(async function () {
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
    });

    it("Should update asset value", async function () {
      const newValue = ethers.utils.parseEther("7000000000");
      
      await expect(
        registry.updateAssetValue(AKTA_ASSET_CODE, newValue)
      ).to.emit(registry, "AssetUpdated");

      const asset = await registry.getAsset(AKTA_ASSET_CODE);
      expect(asset.assetValueUsd).to.equal(newValue);
    });

    it("Should fail to update if not owner", async function () {
      const newValue = ethers.utils.parseEther("7000000000");
      
      await expect(
        registry.connect(addr1).updateAssetValue(AKTA_ASSET_CODE, newValue)
      ).to.be.revertedWith("Only owner can call this function");
    });
  });

  describe("Asset Verification", function () {
    beforeEach(async function () {
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
    });

    it("Should verify correct report hash", async function () {
      expect(
        await registry.verifyReportHash(AKTA_ASSET_CODE, AKTA_REPORT_HASH)
      ).to.equal(true);
    });

    it("Should reject incorrect report hash", async function () {
      const wrongHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
      expect(
        await registry.verifyReportHash(AKTA_ASSET_CODE, wrongHash)
      ).to.equal(false);
    });
  });

  describe("Asset Deactivation", function () {
    beforeEach(async function () {
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
    });

    it("Should deactivate asset", async function () {
      await expect(
        registry.deactivateAsset(AKTA_ASSET_CODE)
      ).to.emit(registry, "AssetDeactivated")
        .withArgs(AKTA_ASSET_CODE);
    });

    it("Should fail to get deactivated asset", async function () {
      await registry.deactivateAsset(AKTA_ASSET_CODE);
      
      await expect(
        registry.getAsset(AKTA_ASSET_CODE)
      ).to.be.revertedWith("Asset does not exist or is inactive");
    });
  });
});
