import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import contractABI from './contract/DocumentStore.json';

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

function App() {
  const [documents, setDocuments] = useState([]);
  const [name, setName] = useState('');
  const [hash, setHash] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI.abi, signer);
      const docs = await contract.getDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  };

  const storeDocument = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI.abi, signer);
      const timestamp = Math.floor(Date.now() / 1000);
      const tx = await contract.storeDocument(name, hash, timestamp);
      await tx.wait();
      setName('');
      setHash('');
      fetchDocuments();
    } catch (err) {
      console.error('Error storing document:', err);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Secure Document Store</h1>

      <input
        type="text"
        placeholder="Document Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ marginRight: 10 }}
      />
      <input
        type="text"
        placeholder="Document Hash"
        value={hash}
        onChange={(e) => setHash(e.target.value)}
        style={{ marginRight: 10 }}
      />
      <button onClick={storeDocument}>Store Document</button>

      <h2>Stored Documents</h2>
      <ul>
        {documents.map((doc, idx) => (
          <li key={idx}>
            <strong>{doc[0]}</strong> | Hash: {doc[1]} | Timestamp: {new Date(Number(doc[2]) * 1000).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;