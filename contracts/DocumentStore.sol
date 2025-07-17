// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DocumentStore {
    struct Document {
        string docType;
        string fileHash;
        uint256 timestamp;
    }

    mapping(address => Document[]) private documents;

    event DocumentStored(address indexed user, string docType, string fileHash, uint256 timestamp);

    function storeDocument(string memory docType, string memory fileHash) public {
        Document memory newDoc = Document({
            docType: docType,
            fileHash: fileHash,
            timestamp: block.timestamp
        });

        documents[msg.sender].push(newDoc);

        emit DocumentStored(msg.sender, docType, fileHash, block.timestamp);
    }

    function getDocuments() public view returns (Document[] memory) {
        return documents[msg.sender];
    }
}