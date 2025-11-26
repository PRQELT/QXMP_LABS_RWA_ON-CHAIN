// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

/**
 * @title QXMPAssetRegistry
 * @notice Registry for QXMP Labs Real-World Assets with Proof-of-Reserves
 * @dev Stores asset metadata and verification proofs for tokenized RWAs
 */
contract QXMPAssetRegistry {
    
    struct Asset {
        bytes32 assetCode;           // e.g., "QXMP:AKTA-NI43-ZA"
        string assetName;            // e.g., "AEM Gold Project"
        string reportingStandard;    // e.g., "NI 43-101"
        string jurisdiction;         // ISO country code, e.g., "ZA"
        uint256 assetValueUsd;       // Asset value in USD (scaled by 1e18)
        uint256 mineralResourcesMt;  // Mineral resources in megatonnes
        uint256 goldOzInSitu;        // Gold ounces in situ
        bytes32 reportHash;          // SHA-256 hash of source PDF
        uint256 lastUpdated;         // Timestamp of last update
        address holder;              // QXMP Labs wallet address
        bool isActive;               // Active status
    }
    
    // Mapping from asset code to Asset struct
    mapping(bytes32 => Asset) public assets;
    
    // Array of all registered asset codes
    bytes32[] public assetCodes;
    
    // Owner address (QXMP Labs)
    address public owner;
    
    // Events
    event AssetRegistered(
        bytes32 indexed assetCode,
        string assetName,
        uint256 assetValueUsd,
        bytes32 reportHash
    );
    
    event AssetUpdated(
        bytes32 indexed assetCode,
        uint256 newValueUsd,
        uint256 timestamp
    );
    
    event AssetDeactivated(bytes32 indexed assetCode);
    
    event ProofVerified(
        bytes32 indexed assetCode,
        bytes32 reportHash,
        uint256 timestamp
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier assetExists(bytes32 assetCode) {
        require(assets[assetCode].isActive, "Asset does not exist or is inactive");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @notice Register a new asset in the registry
     * @param assetCode Unique asset identifier (e.g., keccak256("QXMP:AKTA-NI43-ZA"))
     * @param assetName Human-readable asset name
     * @param reportingStandard Compliance standard (NI 43-101, JORC, etc.)
     * @param jurisdiction ISO country code
     * @param assetValueUsd Asset value in USD (scaled by 1e18)
     * @param mineralResourcesMt Mineral resources in megatonnes
     * @param goldOzInSitu Gold ounces in situ
     * @param reportHash SHA-256 hash of the source report
     * @param holderAddress Address of the asset holder (QXMP Labs)
     */
    function registerAsset(
        bytes32 assetCode,
        string memory assetName,
        string memory reportingStandard,
        string memory jurisdiction,
        uint256 assetValueUsd,
        uint256 mineralResourcesMt,
        uint256 goldOzInSitu,
        bytes32 reportHash,
        address holderAddress
    ) external onlyOwner {
        require(!assets[assetCode].isActive, "Asset already registered");
        require(assetValueUsd > 0, "Asset value must be greater than 0");
        require(holderAddress != address(0), "Invalid holder address");
        
        assets[assetCode] = Asset({
            assetCode: assetCode,
            assetName: assetName,
            reportingStandard: reportingStandard,
            jurisdiction: jurisdiction,
            assetValueUsd: assetValueUsd,
            mineralResourcesMt: mineralResourcesMt,
            goldOzInSitu: goldOzInSitu,
            reportHash: reportHash,
            lastUpdated: block.timestamp,
            holder: holderAddress,
            isActive: true
        });
        
        assetCodes.push(assetCode);
        
        emit AssetRegistered(assetCode, assetName, assetValueUsd, reportHash);
    }
    
    /**
     * @notice Update the value of an existing asset
     * @param assetCode Asset identifier
     * @param newValueUsd New asset value in USD (scaled by 1e18)
     */
    function updateAssetValue(bytes32 assetCode, uint256 newValueUsd) 
        external 
        onlyOwner 
        assetExists(assetCode) 
    {
        require(newValueUsd > 0, "Asset value must be greater than 0");
        
        assets[assetCode].assetValueUsd = newValueUsd;
        assets[assetCode].lastUpdated = block.timestamp;
        
        emit AssetUpdated(assetCode, newValueUsd, block.timestamp);
    }
    
    /**
     * @notice Deactivate an asset
     * @param assetCode Asset identifier
     */
    function deactivateAsset(bytes32 assetCode) 
        external 
        onlyOwner 
        assetExists(assetCode) 
    {
        assets[assetCode].isActive = false;
        emit AssetDeactivated(assetCode);
    }
    
    /**
     * @notice Get full asset information
     * @param assetCode Asset identifier
     * @return Asset struct with all details
     */
    function getAsset(bytes32 assetCode) 
        external 
        view 
        assetExists(assetCode) 
        returns (Asset memory) 
    {
        return assets[assetCode];
    }
    
    /**
     * @notice Verify that a report hash matches the stored hash
     * @param assetCode Asset identifier
     * @param reportHash Hash to verify
     * @return bool True if hashes match
     */
    function verifyReportHash(bytes32 assetCode, bytes32 reportHash) 
        external 
        view 
        assetExists(assetCode) 
        returns (bool) 
    {
        return assets[assetCode].reportHash == reportHash;
    }
    
    /**
     * @notice Get the total number of registered assets
     * @return uint256 Number of assets
     */
    function getAssetCount() external view returns (uint256) {
        return assetCodes.length;
    }
    
    /**
     * @notice Get asset code by index
     * @param index Index in the assetCodes array
     * @return bytes32 Asset code
     */
    function getAssetCodeByIndex(uint256 index) external view returns (bytes32) {
        require(index < assetCodes.length, "Index out of bounds");
        return assetCodes[index];
    }
    
    /**
     * @notice Transfer ownership to a new address
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner address");
        owner = newOwner;
    }
}
