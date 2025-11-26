// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@redstone-finance/evm-connector/contracts/data-services/MainDemoConsumerBase.sol";
import "./QXMPAssetRegistry.sol";

/**
 * @title QXMPProofOfReserve
 * @notice Proof-of-Reserve contract using RedStone Oracle for QXMP Labs assets
 * @dev Integrates with RedStone to verify and update asset reserve values on-chain
 */
contract QXMPProofOfReserve is MainDemoConsumerBase {
    
    QXMPAssetRegistry public registry;
    
    struct Proof {
        uint256 value;
        uint256 timestamp;
        bytes32 dataFeedId;
    }
    
    // Mapping from asset code to latest proof
    mapping(bytes32 => Proof) public latestProofs;
    
    // Owner address
    address public owner;
    
    // Events
    event ProofSubmitted(
        bytes32 indexed assetCode,
        uint256 value,
        uint256 timestamp,
        bytes32 dataFeedId
    );
    
    event RegistryUpdated(address indexed newRegistry);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    constructor(address _registryAddress) {
        require(_registryAddress != address(0), "Invalid registry address");
        registry = QXMPAssetRegistry(_registryAddress);
        owner = msg.sender;
    }
    
    /**
     * @notice Submit a proof-of-reserve for an asset using RedStone oracle data
     * @param assetCode Asset identifier
     * @param dataFeedId RedStone data feed ID for this asset
     * @dev This function reads oracle data from the transaction payload via RedStone
     */
    function submitProof(bytes32 assetCode, bytes32 dataFeedId) external onlyOwner {
        // Get the oracle value from RedStone (injected in tx via WrapperBuilder)
        uint256 oracleValue = getOracleNumericValueFromTxMsg(dataFeedId);
        
        require(oracleValue > 0, "Invalid oracle value");
        
        // Store the proof
        latestProofs[assetCode] = Proof({
            value: oracleValue,
            timestamp: block.timestamp,
            dataFeedId: dataFeedId
        });
        
        // Update the registry with the new value
        registry.updateAssetValue(assetCode, oracleValue);
        
        emit ProofSubmitted(assetCode, oracleValue, block.timestamp, dataFeedId);
    }
    
    /**
     * @notice Get the latest proof for an asset
     * @param assetCode Asset identifier
     * @return Proof struct with value, timestamp, and dataFeedId
     */
    function getLatestProof(bytes32 assetCode) external view returns (Proof memory) {
        return latestProofs[assetCode];
    }
    
    /**
     * @notice Get oracle value for a specific data feed
     * @param dataFeedId RedStone data feed identifier
     * @return uint256 Oracle value
     * @dev This is a view function that reads from RedStone oracle data in tx
     */
    function getOracleValue(bytes32 dataFeedId) external view returns (uint256) {
        return getOracleNumericValueFromTxMsg(dataFeedId);
    }
    
    /**
     * @notice Register a new asset in the registry
     * @dev Forwards the call to the registry contract
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
        address holder
    ) external onlyOwner {
        registry.registerAsset(
            assetCode,
            assetName,
            reportingStandard,
            jurisdiction,
            assetValueUsd,
            mineralResourcesMt,
            goldOzInSitu,
            reportHash,
            holder
        );
    }
    
    /**
     * @notice Update the registry contract address
     * @param newRegistry New registry contract address
     */
    function updateRegistry(address newRegistry) external onlyOwner {
        require(newRegistry != address(0), "Invalid registry address");
        registry = QXMPAssetRegistry(newRegistry);
        emit RegistryUpdated(newRegistry);
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
