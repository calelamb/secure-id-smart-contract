import React from 'react';
import { Shield, Zap } from 'lucide-react';

const BlockchainSelector = ({ selectedChain, onChainChange }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Select Blockchain</h3>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onChainChange('ethereum')}
          className={`p-4 rounded-lg border-2 transition-all ${
            selectedChain === 'ethereum'
              ? 'border-gray-900 bg-gray-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center space-x-3">
            <Shield className="text-gray-700" size={20} />
            <div className="text-left">
              <p className="font-medium text-gray-900">Ethereum</p>
              <p className="text-xs text-gray-500">$5-50 per transaction</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => onChainChange('solana')}
          className={`p-4 rounded-lg border-2 transition-all ${
            selectedChain === 'solana'
              ? 'border-purple-500 bg-purple-50'
              : 'border-gray-200 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center space-x-3">
            <Zap className="text-purple-600" size={20} />
            <div className="text-left">
              <p className="font-medium text-gray-900">Solana</p>
              <p className="text-xs text-purple-600">~$0.00025 per transaction</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default BlockchainSelector;
