// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract OfficialDocumentNFT is ERC721URIStorage, Ownable {
    uint256 private _tokenIds;

    struct OfficialDocument {
        string documentType;
        string fileHash;
        string imageHash;
        uint256 timestamp;
        address issuer;
        string issuerName;
        bool isVerified;
        string jurisdiction;
    }

    mapping(uint256 => OfficialDocument) public documents;
    mapping(address => uint256[]) public userDocuments;
    mapping(string => uint256) public hashToTokenId;
    mapping(address => bool) public authorizedIssuers;

    event DocumentOfficiallyRegistered(
        uint256 indexed tokenId,
        address indexed holder,
        address indexed issuer,
        string documentType,
        string fileHash,
        uint256 timestamp
    );

    event DocumentVerified(
        uint256 indexed tokenId,
        address indexed verifier,
        uint256 timestamp
    );

    event IssuerAuthorized(
        address indexed issuer,
        string issuerName,
        uint256 timestamp
    );

    modifier onlyAuthorizedIssuer() {
        require(authorizedIssuers[msg.sender] || msg.sender == owner(), "Not authorized issuer");
        _;
    }

    constructor() ERC721("OfficialDocument", "ODOC") {}

    function registerOfficialDocument(
        address _holder,
        string memory _documentType,
        string memory _fileHash,
        string memory _imageHash,
        string memory _metadataURI,
        string memory _issuerName,
        string memory _jurisdiction
    ) public onlyAuthorizedIssuer returns (uint256) {
        require(hashToTokenId[_fileHash] == 0, "Document already registered");
        require(bytes(_documentType).length > 0, "Document type required");

        _tokenIds++;
        uint256 newTokenId = _tokenIds;

        _mint(_holder, newTokenId);
        _setTokenURI(newTokenId, _metadataURI);

        documents[newTokenId] = OfficialDocument({
            documentType: _documentType,
            fileHash: _fileHash,
            imageHash: _imageHash,
            timestamp: block.timestamp,
            issuer: msg.sender,
            issuerName: _issuerName,
            isVerified: true,
            jurisdiction: _jurisdiction
        });

        userDocuments[_holder].push(newTokenId);
        hashToTokenId[_fileHash] = newTokenId;

        emit DocumentOfficiallyRegistered(
            newTokenId,
            _holder,
            msg.sender,
            _documentType,
            _fileHash,
            block.timestamp
        );

        return newTokenId;
    }

    function selfRegisterDocument(
        string memory _documentType,
        string memory _fileHash,
        string memory _imageHash,
        string memory _metadataURI,
        string memory _jurisdiction
    ) public returns (uint256) {
        require(hashToTokenId[_fileHash] == 0, "Document already registered");
        require(bytes(_documentType).length > 0, "Document type required");

        _tokenIds++;
        uint256 newTokenId = _tokenIds;

        _mint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, _metadataURI);

        documents[newTokenId] = OfficialDocument({
            documentType: _documentType,
            fileHash: _fileHash,
            imageHash: _imageHash,
            timestamp: block.timestamp,
            issuer: msg.sender,
            issuerName: "Self-Registered",
            isVerified: false,
            jurisdiction: _jurisdiction
        });

        userDocuments[msg.sender].push(newTokenId);
        hashToTokenId[_fileHash] = newTokenId;

        emit DocumentOfficiallyRegistered(
            newTokenId,
            msg.sender,
            msg.sender,
            _documentType,
            _fileHash,
            block.timestamp
        );

        return newTokenId;
    }

    function verifyDocument(uint256 _tokenId) public onlyAuthorizedIssuer {
        require(_exists(_tokenId), "Document does not exist");
        require(!documents[_tokenId].isVerified, "Document already verified");

        documents[_tokenId].isVerified = true;
        documents[_tokenId].issuer = msg.sender;

        emit DocumentVerified(_tokenId, msg.sender, block.timestamp);
    }

    function verifyDocumentByHash(string memory _fileHash) 
        public 
        view 
        returns (
            bool exists,
            bool isVerified,
            string memory documentType,
            string memory issuerName,
            uint256 timestamp,
            string memory jurisdiction
        ) 
    {
        uint256 tokenId = hashToTokenId[_fileHash];
        if (tokenId == 0) {
            return (false, false, "", "", 0, "");
        }

        OfficialDocument memory doc = documents[tokenId];
        return (
            true,
            doc.isVerified,
            doc.documentType,
            doc.issuerName,
            doc.timestamp,
            doc.jurisdiction
        );
    }

    function getMyDocuments() public view returns (uint256[] memory) {
        return userDocuments[msg.sender];
    }

    function getDocument(uint256 _tokenId) 
        public 
        view 
        returns (OfficialDocument memory) 
    {
        require(_exists(_tokenId), "Document does not exist");
        return documents[_tokenId];
    }

    function authorizeIssuer(address _issuer, string memory _issuerName) 
        public 
        onlyOwner 
    {
        authorizedIssuers[_issuer] = true;
        emit IssuerAuthorized(_issuer, _issuerName, block.timestamp);
    }

    function revokeIssuer(address _issuer) public onlyOwner {
        authorizedIssuers[_issuer] = false;
    }

    function getTotalDocuments() public view returns (uint256) {
        return _tokenIds;
    }
}
