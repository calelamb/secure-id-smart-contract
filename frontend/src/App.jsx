import { useState } from "react";
import { ethers } from "ethers";
import contractABI from "./contract/DocumentStore.json";
import "./App.css"; // We'll update this next

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

function App() {
  const [imageFile, setImageFile] = useState(null);
  const [previewURL, setPreviewURL] = useState("");
  const [status, setStatus] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setImageFile(file);
    if (file) {
      setPreviewURL(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!imageFile) return setStatus("No file selected.");

    try {
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);
      const hash = ethers.utils.keccak256(buffer);

      setStatus("Hash: " + hash);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI.abi, signer);

      const tx = await contract.storeDocument(imageFile.name, hash);
      setStatus("Transaction sent: " + tx.hash);
      await tx.wait();

      setStatus("Stored successfully! Hash: " + hash);
    } catch (err) {
      console.error(err);
      setStatus("Error: " + err.message);
    }
  };

  return (
    <div className="app-container">
      <header className="navbar">
        <div className="logo">StackWell</div>
        <nav className="nav-tabs">
          <button>Upload</button>
          <button>Documents</button>
          <button>About</button>
        </nav>
      </header>

      <main className="main-content">
        <h1>Upload a Document</h1>
        <input type="file" accept="image/*" onChange={handleFileChange} />
        {previewURL && (
          <div className="preview">
            <img src={previewURL} alt="preview" />
          </div>
        )}
        <button className="upload-btn" onClick={handleUpload}>Upload and Store</button>
        <p className="status">{status}</p>
      </main>
    </div>
  );
}

export default App;