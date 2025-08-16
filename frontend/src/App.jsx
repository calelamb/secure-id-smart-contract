import React, { useState, useEffect, useMemo } from 'react';
import { ethers } from "ethers";
import { Connection, clusterApiUrl } from "@solana/web3.js";
import { useConnection, useWallet, ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { Upload, Shield, FileText, Search, CheckCircle, Clock, X, Copy, Award, Globe, FileCheck, Menu, ChevronLeft, Home, FolderOpen, UploadCloud, ShieldCheck, Sparkles, Lock, Fingerprint, Cloud } from 'lucide-react';
import StackwellLogo from './components/StackwellLogo';
import { SolanaDocumentService } from './services/SolanaDocumentService';
import contractABI from "./contract/OfficialDocumentNFT.json";

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

const StackwellNFT = () => {
  const [activeTab, setActiveTab] = useState('documents');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { connection } = useConnection();
  const { publicKey, connected, wallet, signTransaction, sendTransaction } = useWallet();
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [status, setStatus] = useState("");
  const [documents, setDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [verificationHash, setVerificationHash] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [documentType, setDocumentType] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [isAuthorizedIssuer, setIsAuthorizedIssuer] = useState(false);

  useEffect(() => {
  if (connected && publicKey) {
    setIsWalletConnected(true);
    setUserAddress(publicKey.toString());
    // Comment out Ethereum functions for now
    // loadDocuments();
    // checkIssuerStatus();
  }
}, [connected, publicKey]);

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setIsWalletConnected(true);
        setUserAddress(accounts[0]);
        setStatus("Wallet connected successfully!");
      } catch (error) {
        console.error('Failed to connect wallet:', error);
        setStatus("Error: Failed to connect wallet");
      }
    } else {
      setStatus("Please install MetaMask to use this application");
    }
  };

  const checkIssuerStatus = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI.abi, signer);
      
      const authorized = await contract.authorizedIssuers(userAddress);
      setIsAuthorizedIssuer(authorized);
    } catch (error) {
      console.error("Error checking issuer status:", error);
    }
  };

  const loadDocuments = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI.abi, signer);
      
      const tokenIds = await contract.getMyDocuments();
      const formattedDocs = [];

      for (let i = 0; i < tokenIds.length; i++) {
        const tokenId = tokenIds[i];
        const doc = await contract.getDocument(tokenId);
        
        formattedDocs.push({
          tokenId: tokenId.toString(),
          name: doc.documentType,
          type: doc.documentType.toLowerCase().replace(/\s+/g, '_'),
          fileHash: doc.fileHash,
          imageHash: doc.imageHash,
          timestamp: new Date(Number(doc.timestamp) * 1000).toLocaleString(),
          issuer: doc.issuer,
          issuerName: doc.issuerName,
          isVerified: doc.isVerified,
          jurisdiction: doc.jurisdiction,
          status: doc.isVerified ? 'verified' : 'pending',
          size: 'Secured Document'
        });
      }
      
      setDocuments(formattedDocs);
    } catch (error) {
      console.error("Error loading documents:", error);
      setStatus("Error loading documents: " + error.message);
    }
  };

  const uploadToIPFS = async (file) => {
    // This is now handled by SolanaDocumentService
    const hash = `Qm${Math.random().toString(36).substr(2, 40)}`;
    return hash;
  };

  const handleFileUpload = async (file) => {
    if (!documentType || !jurisdiction) {
      setStatus("Please fill in all required information");
      return;
    }

    setIsUploading(true);
    
    try {
      setStatus("Encrypting your document...");
      
      // Create wallet adapter for the service
      const walletAdapter = {
        publicKey: publicKey,
        signTransaction: signTransaction,
        signAllTransactions: signTransaction, // Use same as signTransaction
        sendTransaction: sendTransaction
      };

      // Initialize the Solana service
      const solanaService = new SolanaDocumentService(connection, walletAdapter);
      
      setStatus("Uploading to IPFS...");
      
      // Mint NFT (this also uploads to IPFS)
      const result = await solanaService.mintDocumentNFT(file);
      
      setStatus("Securing on blockchain...");
      
      // Store the document info
      const newDoc = {
        id: result.mint,
        name: file.name,
        type: documentType,
        hash: result.fileHash,
        ipfsUrl: result.ipfsUrl,
        uploadDate: new Date().toISOString(),
        status: 'verified',
        tokenAddress: result.mint,
        jurisdiction: jurisdiction,
        issuer: isAuthorizedIssuer ? "Stackwell Official" : userAddress || publicKey.toString()
      };
      
      // Add to local state
      setDocuments(prev => [...prev, newDoc]);
      
      setStatus("Document secured successfully!");
      console.log("NFT Mint Address:", result.mint);
      console.log("View on Explorer:", `https://explorer.solana.com/address/${result.mint}?cluster=devnet`);
      
      setActiveTab('documents');
      
      setDocumentType('');
      setJurisdiction('');
      
    } catch (error) {
      console.error("Upload error:", error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };
 

  const verifyDocumentByHash = async () => {
    if (!verificationHash) return;
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, contractABI.abi, provider);
      
      const result = await contract.verifyDocumentByHash(verificationHash);
      
      setVerificationResult({
        exists: result.exists,
        isVerified: result.isVerified,
        documentType: result.documentType,
        issuerName: result.issuerName,
        timestamp: result.timestamp ? new Date(Number(result.timestamp) * 1000).toLocaleString() : '',
        jurisdiction: result.jurisdiction
      });
    } catch (error) {
      console.error("Verification error:", error);
      setStatus("Error verifying document: " + error.message);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const openModal = (doc) => {
    setSelectedDocument(doc);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDocument(null);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setStatus("Copied to clipboard!");
  };

  const renderDocuments = () => (
    <div className="p-8">
      {/* Hero Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Document Vault</h1>
        <p className="text-gray-600">Your documents, encrypted and secured forever.</p>
      </div>

      {/* Stats Cards with Gradient Borders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
          <div className="relative bg-white rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-gray-900">{documents.length}</p>
                <p className="text-sm text-gray-600 mt-1">Total Documents</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl">
                <Cloud className="text-purple-600" size={24} />
              </div>
            </div>
          </div>
        </div>
        
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
          <div className="relative bg-white rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-gray-900">
                  {documents.filter(d => d.isVerified).length}
                </p>
                <p className="text-sm text-gray-600 mt-1">Verified</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-green-50 to-teal-50 rounded-xl">
                <Fingerprint className="text-green-600" size={24} />
              </div>
            </div>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-600 to-pink-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
          <div className="relative bg-white rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-gray-900">256-bit</p>
                <p className="text-sm text-gray-600 mt-1">Encryption</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-orange-50 to-pink-50 rounded-xl">
                <Lock className="text-orange-600" size={24} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="bg-white/50 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100">
        <div className="p-6">
          {documents.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-6">
                <Cloud size={40} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No documents yet</h3>
              <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                Start securing your important files with blockchain technology
              </p>
              <button 
                onClick={() => setActiveTab('upload')}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
              >
                Upload First Document
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map(doc => (
                <div 
                  key={doc.id || doc.tokenId}
                  className="group bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 hover:shadow-xl transition-all cursor-pointer border border-gray-100"
                  onClick={() => openModal(doc)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl">
                      <FileText size={24} className="text-purple-600" />
                    </div>
                    {doc.isVerified && (
                      <div className="flex items-center space-x-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                        <CheckCircle size={12} />
                        <span>Verified</span>
                      </div>
                    )}
                  </div>
                  
                  <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors">
                    {doc.name}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">{doc.jurisdiction}</p>
                  <p className="text-sm text-gray-500 mb-4">{doc.jurisdiction}</p>
                  <p className="text-xs text-gray-400 font-mono mt-2">
                      {doc.hash ? `${doc.hash.substring(0, 12)}...` : 'No hash'}
                    </p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{new Date(doc.timestamp).toLocaleDateString()}</span>
                    <span className="flex items-center space-x-1">
                      <Lock size={12} />
                      <span>Encrypted</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderUpload = () => (
    <div className="max-w-2xl mx-auto p-8">
      <div className="text-center mb-8">
        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center mb-4">
          <UploadCloud size={32} className="text-purple-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Secure Upload</h1>
        <p className="text-gray-600">End-to-end encryption. Immutable storage. Forever.</p>
      </div>

      <div className="bg-white/50 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100">
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Type
              </label>
              <div className="relative">
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="">Select type</option>
                  <option value="Birth Certificate">Birth Certificate</option>
                  <option value="Diploma">Diploma</option>
                  <option value="License">License</option>
                  <option value="Contract">Contract</option>
                  <option value="Certificate">Certificate</option>
                  <option value="Other">Other</option>
                </select>
                <ChevronLeft className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 rotate-180 pointer-events-none" />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jurisdiction
              </label>
              <input
                type="text"
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                placeholder="e.g., California, USA"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
            <div className="relative border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center bg-white">
              <Cloud size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Drop your file here</h3>
              <p className="text-gray-600 mb-4 text-sm">or click to browse</p>
              <p className="text-xs text-gray-500 mb-6">Maximum file size: 10MB</p>
              <input
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                disabled={isUploading || !documentType || !jurisdiction}
              />
              <label
                htmlFor="file-upload"
                className={`inline-flex items-center space-x-2 px-6 py-3 rounded-xl transition-all cursor-pointer ${
                  isUploading || !documentType || !jurisdiction
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg transform hover:-translate-y-0.5'
                }`}
              >
                <Upload size={18} />
                <span>{isUploading ? 'Encrypting...' : 'Select File'}</span>
              </label>
            </div>
          </div>

          {status && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
              <p className="text-sm text-purple-800 flex items-center">
                <Sparkles size={16} className="mr-2" />
                {status}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderVerification = () => (
    <div className="max-w-2xl mx-auto p-8">
      <div className="text-center mb-8">
        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-100 to-teal-100 rounded-2xl flex items-center justify-center mb-4">
          <ShieldCheck size={32} className="text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Verify Authenticity</h1>
        <p className="text-gray-600">Instant blockchain verification for any document</p>
      </div>

      <div className="bg-white/50 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100">
        <div className="p-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={verificationHash}
                  onChange={(e) => setVerificationHash(e.target.value)}
                  placeholder="Enter document hash..."
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
                />
                <button
                  onClick={verifyDocumentByHash}
                  className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-8 py-3 rounded-xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
                >
                  Verify
                </button>
              </div>
            </div>
          </div>

          {verificationResult && (
            <div className="mt-8">
              {verificationResult.exists ? (
                <div className={`p-6 rounded-2xl ${
                  verificationResult.isVerified 
                    ? 'bg-gradient-to-br from-green-50 to-teal-50 border border-green-200' 
                    : 'bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200'
                }`}>
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-xl ${
                      verificationResult.isVerified 
                        ? 'bg-green-100' 
                        : 'bg-yellow-100'
                    }`}>
                      {verificationResult.isVerified ? (
                        <Fingerprint className="text-green-600" size={24} />
                      ) : (
                        <Clock className="text-yellow-600" size={24} />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-semibold text-lg ${
                        verificationResult.isVerified ? 'text-green-900' : 'text-yellow-900'
                      }`}>
                        {verificationResult.isVerified ? 'Verified Authentic' : 'Pending Verification'}
                      </h4>
                      <p className={`text-sm mt-1 ${
                        verificationResult.isVerified ? 'text-green-700' : 'text-yellow-700'
                      }`}>
                        Document found on blockchain
                      </p>
                      
                      <div className="mt-6 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-600">Document Type</p>
                          <p className="font-medium text-gray-900">{verificationResult.documentType}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Issuer</p>
                          <p className="font-medium text-gray-900">{verificationResult.issuerName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Location</p>
                          <p className="font-medium text-gray-900">{verificationResult.jurisdiction}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Timestamp</p>
                          <p className="font-medium text-gray-900">{verificationResult.timestamp}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 rounded-2xl">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-red-100 rounded-xl">
                      <X className="text-red-600" size={24} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-red-900">Not Found</h4>
                      <p className="text-sm text-red-700 mt-1">
                        This document hash doesn't exist on the blockchain
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const DocumentModal = ({ doc, onClose }) => {
    if (!doc) return null;

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">{doc.name}</h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          
          <div className="p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
                <div className="flex items-center space-x-3">
                  {doc.isVerified ? (
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Fingerprint className="text-green-600" size={20} />
                    </div>
                  ) : (
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Clock className="text-yellow-600" size={20} />
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900">
                      {doc.isVerified ? 'Verified Document' : 'Pending Verification'}
                    </p>
                    <p className="text-sm text-gray-600">Blockchain secured</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Location</p>
                  <p className="font-medium text-gray-900">{doc.jurisdiction}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Timestamp</p>
                  <p className="font-medium text-gray-900">{doc.timestamp}</p>
                </div>
              </div>

              <details className="group">
                <summary className="cursor-pointer list-none flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <span className="font-medium text-gray-700">Technical Details</span>
                  <ChevronLeft className="w-5 h-5 text-gray-400 transform group-open:rotate-90 transition-transform" />
                </summary>
                <div className="mt-4 space-y-3">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-600 mb-2">Document Hash</p>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 text-xs bg-gray-900 text-gray-100 p-3 rounded-lg font-mono">
                        {doc.fileHash}
                      </code>
                      <button 
                        onClick={() => copyToClipboard(doc.fileHash)}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo on the left */}
            <div className="flex items-center space-x-3">
              <StackwellLogo size={32} className="text-purple-600" />
              <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Stackwell
              </span>
            </div>
            
            {/* Center navigation */}
            <nav className="hidden md:flex items-center space-x-8 absolute left-1/2 transform -translate-x-1/2">
              <button
                onClick={() => setActiveTab('documents')}
                className={`px-1 py-2 text-sm font-medium transition-colors relative ${
                  activeTab === 'documents'
                    ? 'text-gray-900'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Documents
                {activeTab === 'documents' && (
                  <div className="absolute -bottom-3 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-600 to-blue-600"></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-1 py-2 text-sm font-medium transition-colors relative ${
                  activeTab === 'upload'
                    ? 'text-gray-900'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Upload
                {activeTab === 'upload' && (
                  <div className="absolute -bottom-3 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-600 to-blue-600"></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab('verify')}
                className={`px-1 py-2 text-sm font-medium transition-colors relative ${
                  activeTab === 'verify'
                    ? 'text-gray-900'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Verify
                {activeTab === 'verify' && (
                  <div className="absolute -bottom-3 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-600 to-blue-600"></div>
                )}
              </button>
            </nav>

            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu size={24} />
            </button>
            
            {/* Wallet button */}
            <div className="hidden md:block">
              <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-blue-600 !rounded-xl !text-sm !font-medium" />
            </div>
          </div>
        </div>

        {/* Mobile navigation */}
        {sidebarOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3">
            <nav className="space-y-2">
              <button
                onClick={() => {
                  setActiveTab('documents');
                  setSidebarOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${
                  activeTab === 'documents'
                    ? 'bg-purple-50 text-purple-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Documents
              </button>
              <button
                onClick={() => {
                  setActiveTab('upload');
                  setSidebarOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${
                  activeTab === 'upload'
                    ? 'bg-purple-50 text-purple-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Upload
              </button>
              <button
                onClick={() => {
                  setActiveTab('verify');
                  setSidebarOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${
                  activeTab === 'verify'
                    ? 'bg-purple-50 text-purple-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Verify
              </button>
              <div className="pt-2 border-t border-gray-100">
                <WalletMultiButton className="!w-full !bg-gradient-to-r !from-purple-600 !to-blue-600 !rounded-xl !text-sm !font-medium" />
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-64px)]">
        {!connected ? (
          <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
            <div className="text-center max-w-lg px-8">
              <div className="mb-8">
                <div className="mx-auto w-32 h-32 bg-gradient-to-br from-purple-100 to-blue-100 rounded-3xl flex items-center justify-center mb-8 animate-pulse">
                  <Lock size={48} className="text-purple-600" />
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  The Future of Document Security
                </h1>
                <p className="text-lg text-gray-600 mb-8">
                  Military-grade encryption meets blockchain permanence. 
                  Your documents, secured forever.
                </p>
              </div>
              <div className="space-y-4">
                <div className="inline-block">
                  <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-blue-600 !rounded-xl !px-8 !py-4 !text-base !font-medium" />
                </div>
                <p className="text-sm text-gray-500">
                  Connect with Phantom wallet to get started
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'documents' && renderDocuments()}
            {activeTab === 'upload' && renderUpload()}
            {activeTab === 'verify' && renderVerification()}
          </>
        )}
      </main>
    </div>
  );
};

// Wallet Context Provider for Solana
const WalletContextProvider = ({ children }) => {
  const network = clusterApiUrl('devnet');
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={network}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

// Main App with Solana Wallet Provider
const App = () => {
  return (
    <WalletContextProvider>
      <StackwellNFT />
    </WalletContextProvider>
  );
};

export default App;
