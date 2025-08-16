import { Connection, PublicKey, Transaction, Keypair, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

export class SolanaDocumentService {
  constructor(connection, wallet) {
    this.connection = connection;
    this.wallet = wallet;
    this.pinataApiKey = 'a2e04f0f2e9afb91dcdc';
    this.pinataSecretKey = '9e0e367d231ca3c49c9e712df56bd0a27550e17110ee8b3ff36c5c744ac3bd8f';
  }

  async uploadToIPFS(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const metadata = JSON.stringify({
        name: file.name,
        keyvalues: {
          owner: this.wallet.publicKey.toString(),
          timestamp: new Date().toISOString(),
          hash: await this.calculateHash(file)
        }
      });
      formData.append('pinataMetadata', metadata);

      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'pinata_api_key': this.pinataApiKey,
          'pinata_secret_api_key': this.pinataSecretKey
        },
        body: formData
      });

      const result = await response.json();
      return `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
    } catch (error) {
      console.error('IPFS upload error:', error);
      throw error;
    }
  }

  async createMetadata(file, ipfsUrl) {
    const fileHash = await this.calculateHash(file);
    
    const metadata = {
      name: file.name,
      symbol: "STKW",
      description: "Document secured on Stackwell",
      image: ipfsUrl,
      attributes: [
        {
          trait_type: "Document Type",
          value: "Secure Document"
        },
        {
          trait_type: "Hash",
          value: fileHash
        },
        {
          trait_type: "Upload Date",
          value: new Date().toISOString()
        }
      ],
      properties: {
        files: [
          {
            uri: ipfsUrl,
            type: file.type
          }
        ]
      }
    };

    // Upload metadata to IPFS
    const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
    const metadataFile = new File([metadataBlob], 'metadata.json');
    
    const formData = new FormData();
    formData.append('file', metadataFile);
    
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'pinata_api_key': this.pinataApiKey,
        'pinata_secret_api_key': this.pinataSecretKey
      },
      body: formData
    });

    const result = await response.json();
    return `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
  }

  async mintDocumentNFT(file) {
    try {
      // First upload to IPFS
      const ipfsUrl = await this.uploadToIPFS(file);
      const fileHash = await this.calculateHash(file);

      // Create metadata and upload it
      const metadataUri = await this.createMetadata(file, ipfsUrl);

      // For now, let's create a simple transaction that transfers SOL
      // This proves the wallet integration works
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.wallet.publicKey,
          toPubkey: this.wallet.publicKey,
          lamports: 0, // 0 SOL transfer to self (just for testing)
        })
      );

      // Send transaction
      const signature = await this.wallet.sendTransaction(transaction, this.connection);

      // Wait for confirmation
      await this.connection.confirmTransaction(signature, 'confirmed');

      // For now, return a mock NFT address using the signature
      // In production, this would be the actual NFT mint address
      const mockMintAddress = signature.substring(0, 44);

      return {
        mint: mockMintAddress,
        tokenAccount: 'Created',
        ipfsUrl: ipfsUrl,
        metadataUri: metadataUri,
        fileHash: fileHash,
        fileName: file.name,
        signature: signature
      };
    } catch (error) {
      console.error('Mint error:', error);
      throw error;
    }
  }

  async calculateHash(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
