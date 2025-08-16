import React, { useState, useEffect, useMemo } from 'react';
import { ethers } from "ethers";
import { Connection, clusterApiUrl } from "@solana/web3.js";
import { useConnection, useWallet, ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { Upload, Shield, FileText, Search, CheckCircle, Clock, X, Copy, Award, Globe, FileCheck, Menu, ChevronLeft, Home, FolderOpen, UploadCloud, ShieldCheck } from 'lucide-react';
import StackwellLogo from './components/StackwellLogo';
import contractABI from "./contract/OfficialDocumentNFT.json";

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

const StackwellNFT = () => {
  const [activeTab, setActiveTab] = useState('documents');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
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
      loadDocuments();
      checkIssuerStatus();
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
      setStatus("Securing your document...");
      
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);
      const fileHash = ethers.keccak256(buffer);
      
      const imageHash = await uploadToIPFS(file);
      const metadataURI = `ipfs://Qm${Math.random().toString(36).substr(2, 40)}`;
      
      setStatus("Creating secure record...");
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI.abi, signer);
      
      let tx;
      if (isAuthorizedIssuer) {
        tx = await contract.registerOfficialDocument(
          userAddress,
          documentType,
          fileHash,
          imageHash,
          metadataURI,
          "Stackwell Official",
          jurisdiction
        );
      } else {
        tx = await contract.selfRegisterDocument(
          documentType,
          fileHash,
          imageHash,
          metadataURI,
          jurisdiction
        );
      }
      
      setStatus("Processing...");
      await tx.wait();
      
      setStatus("Document secured successfully!");
      setActiveTab('documents');
      await loadDocuments();
      
      setDocumentType('');
      setJurisdiction('');
      
    } catch (error) {
      console.error(error);
      setStatus("Error: " + error.message);
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
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-gray-900">{documents.length}</p>
              <p className="text-sm text-gray-600 mt-1">Secured Documents</p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-lg">
              <FileText className="text-indigo-600" size={24} />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {documents.filter(d => d.isVerified).length}
              </p>
              <p className="text-sm text-gray-600 mt-1">Verified Documents</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircle className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-gray-900">100%</p>
              <p className="text-sm text-gray-600 mt-1">Blockchain Secured</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Shield className="text-purple-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Your Documents</h2>
          <p className="text-sm text-gray-600 mt-1">All your documents are securely stored on the blockchain</p>
        </div>
        <div className="p-6">
          {documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
              <p className="text-gray-600 mb-6">Upload your first document to get started</p>
              <button 
                onClick={() => setActiveTab('upload')}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Upload Document
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map(doc => (
                <div 
                  key={doc.tokenId} 
                  className="bg-gray-50 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => openModal(doc)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white rounded-lg">
                        <FileCheck size={20} className="text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{doc.name}</h3>
                        <p className="text-sm text-gray-500">{doc.jurisdiction}</p>
                      </div>
                    </div>
                    {doc.isVerified && (
                      <CheckCircle className="text-green-500" size={20} />
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Status</span>
                      <span className={`font-medium ${
                        doc.isVerified ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {doc.isVerified ? 'Verified' : 'Pending Verification'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Date</span>
                      <span className="text-gray-900">{new Date(doc.timestamp).toLocaleDateString()}</span>
                    </div>
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
    <div className="max-w-3xl mx-auto p-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Upload Document</h2>
          <p className="text-sm text-gray-600 mt-1">Your document will be securely stored on the blockchain</p>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Type
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select document type</option>
                <option value="Birth Certificate">Birth Certificate</option>
                <option value="Diploma">Diploma</option>
                <option value="License">License</option>
                <option value="Contract">Contract</option>
                <option value="Certificate">Certificate</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location/Jurisdiction
              </label>
              <input
                type="text"
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                placeholder="e.g., California, USA"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select your document</h3>
            <p className="text-gray-600 mb-4">PDF, DOC, DOCX, or image files up to 10MB</p>
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
              className={`inline-block px-6 py-2 rounded-lg transition-colors cursor-pointer ${
                isUploading || !documentType || !jurisdiction
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {isUploading ? 'Uploading...' : 'Choose File'}
            </label>
          </div>

          {status && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">{status}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderVerification = () => (
    <div className="max-w-3xl mx-auto p-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Verify Document</h2>
          <p className="text-sm text-gray-600 mt-1">Check if a document is authentic and verified</p>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Verification Code
              </label>
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={verificationHash}
                  onChange={(e) => setVerificationHash(e.target.value)}
                  placeholder="Enter document code..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  onClick={verifyDocumentByHash}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Verify
                </button>
              </div>
            </div>
          </div>

          {verificationResult && (
            <div className="mt-6">
              {verificationResult.exists ? (
                <div className={`p-6 rounded-lg ${
                  verificationResult.isVerified ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  <div className="flex items-start space-x-3">
                    {verificationResult.isVerified ? (
                      <CheckCircle className="text-green-600 mt-1" size={24} />
                    ) : (
                      <Clock className="text-yellow-600 mt-1" size={24} />
                    )}
                    <div className="flex-1">
                      <h4 className={`font-semibold ${
                        verificationResult.isVerified ? 'text-green-900' : 'text-yellow-900'
                      }`}>
                        {verificationResult.isVerified ? 'Document Verified' : 'Document Pending Verification'}
                      </h4>
                      <p className={`text-sm mt-1 ${
                        verificationResult.isVerified ? 'text-green-700' : 'text-yellow-700'
                      }`}>
                        This document is registered on the blockchain
                      </p>
                      
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Type</span>
                          <span className="font-medium text-gray-900">{verificationResult.documentType}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Issuer</span>
                          <span className="font-medium text-gray-900">{verificationResult.issuerName}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Location</span>
                          <span className="font-medium text-gray-900">{verificationResult.jurisdiction}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Date</span>
                          <span className="font-medium text-gray-900">{verificationResult.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <X className="text-red-600 mt-1" size={24} />
                    <div>
                      <h4 className="font-semibold text-red-900">Document Not Found</h4>
                      <p className="text-sm text-red-700 mt-1">
                        This document code was not found in our registry
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">{doc.name}</h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
                  <div className="flex items-center space-x-2">
                    {doc.isVerified ? (
                      <CheckCircle className="text-green-500" size={16} />
                    ) : (
                      <Clock className="text-yellow-500" size={16} />
                    )}
                    <span className="font-medium">
                      {doc.isVerified ? 'Verified' : 'Pending Verification'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Location</label>
                  <span className="text-gray-900">{doc.jurisdiction}</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Registration Date</label>
                  <span className="text-gray-900">{doc.timestamp}</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Issuer</label>
                  <span className="text-gray-900">{doc.issuerName}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <details className="cursor-pointer">
                  <summary className="text-sm font-medium text-gray-600 hover:text-gray-900">
                    Technical Details
                  </summary>
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Document ID</label>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm bg-gray-50 p-2 rounded flex-1 truncate">
                          {doc.tokenId}
                        </span>
                        <button 
                          onClick={() => copyToClipboard(doc.tokenId)}
                          className="p-2 hover:bg-gray-100 rounded"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Verification Code</label>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm bg-gray-50 p-2 rounded flex-1 truncate">
                          {doc.fileHash}
                        </span>
                        <button 
                          onClick={() => copyToClipboard(doc.fileHash)}
                          className="p-2 hover:bg-gray-100 rounded"
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
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
            >
              <Menu size={24} />
            </button>
            
            <div className="flex-1 flex justify-center">
              <div className="flex items-center space-x-3">
                <StackwellLogo size={40} className="text-indigo-600" />
                <div className="hidden sm:block">
                  <h1 className="text-xl font-bold text-gray-900">Stackwell</h1>
                  <p className="text-xs text-gray-500">Secure Document Storage</p>
                </div>
              </div>
            </div>
            
            <WalletMultiButton />
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-white border-r border-gray-200 transition-all duration-300 relative`}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute -right-3 top-6 bg-white border border-gray-200 rounded-full p-1 hidden lg:block"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${!sidebarOpen ? 'rotate-180' : ''}`} />
          </button>
          
          <nav className="p-4 space-y-2">
            <button
              onClick={() => setActiveTab('documents')}
              className={`w-full flex items-center ${sidebarOpen ? 'space-x-3' : 'justify-center'} px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'documents'
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <FolderOpen size={20} />
              {sidebarOpen && <span>My Documents</span>}
            </button>
            
            <button
              onClick={() => setActiveTab('upload')}
              className={`w-full flex items-center ${sidebarOpen ? 'space-x-3' : 'justify-center'} px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'upload'
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <UploadCloud size={20} />
              {sidebarOpen && <span>Upload</span>}
            </button>
            
            <button
              onClick={() => setActiveTab('verify')}
              className={`w-full flex items-center ${sidebarOpen ? 'space-x-3' : 'justify-center'} px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'verify'
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <ShieldCheck size={20} />
              {sidebarOpen && <span>Verify</span>}
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {!connected ? (
            <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
              <div className="text-center max-w-md">
                <StackwellLogo size={64} className="mx-auto text-indigo-600 mb-6" />
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Secure Document Storage
                </h2>
                <p className="text-gray-600 mb-8">
                  Store your important documents securely on the blockchain. 
                  Each document is encrypted and verified for authenticity.
                </p>
                <div className="inline-block">
                  <WalletMultiButton />
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

      {showModal && (
        <DocumentModal doc={selectedDocument} onClose={closeModal} />
      )}
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
