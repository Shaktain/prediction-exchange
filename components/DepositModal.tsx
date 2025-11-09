'use client';
import { useState } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { X, AlertCircle, CheckCircle } from 'lucide-react';
import { getVaultContract, VAULT_ADDRESS } from '@/lib/blockchain/vault';

interface DepositModalProps {
  onClose: () => void;
  onSuccess: () => void;
  walletBalance?: number;
}

export default function DepositModal({ onClose, onSuccess, walletBalance }: DepositModalProps) {
  const { address } = useAccount();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'input' | 'approving' | 'depositing' | 'syncing' | 'success'>('input');

  async function handleDeposit() {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!address) {
      setError('Wallet not connected');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();

      // Standard ERC20 ABI
      const erc20Abi = [
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function allowance(address owner, address spender) external view returns (uint256)",
        "function balanceOf(address account) external view returns (uint256)"
      ];
      
      const usdcContract = new ethers.Contract(
        "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        erc20Abi,
        signer
      );
      const vaultContract = getVaultContract(signer);

      const amountInWei = ethers.parseUnits(amount, 6);

      // Check allowance and approve if needed
      console.log('Checking allowance...');
      const currentAllowance = await usdcContract.allowance(signerAddress, VAULT_ADDRESS);
      console.log("Current allowance:", ethers.formatUnits(currentAllowance, 6), "USDC");
      console.log("Amount to deposit:", amount, "USDC");

      if (currentAllowance < amountInWei) {
        console.log('Approving USDC...');
        setStep('approving');
        
        // Approve a large amount to avoid needing approval every time
        const approvalAmount = ethers.parseUnits("1000000", 6); // Approve 1M USDC
        
        const approveTx = await usdcContract.approve(VAULT_ADDRESS, approvalAmount);
        console.log('Approval tx sent:', approveTx.hash);
        
        // Wait for approval to be mined
        const approvalReceipt = await approveTx.wait();
        console.log('✅ Approval confirmed in block:', approvalReceipt.blockNumber);
        
        // Wait an extra second for good measure
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        console.log("✅ Already approved, skipping approval");
      }

      // Deposit to vault
      setStep('depositing');
      const depositTx = await vaultContract.deposit(amountInWei);
      const receipt = await depositTx.wait();

      console.log('✅ Deposit transaction confirmed:', receipt.hash);

      // Sync with database
      setStep('syncing');
      const syncResponse = await fetch('/api/deposits/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          amount: parseFloat(amount),
          txHash: receipt.hash
        })
      });

      if (!syncResponse.ok) {
        const errorData = await syncResponse.json();
        throw new Error(errorData.error || 'Failed to sync deposit with database');
      }

      const syncData = await syncResponse.json();
      console.log('✅ Database synced:', syncData);

      setStep('success');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);

    } catch (err: any) {
      console.error('Deposit error:', err);
      setError(err.message || 'Failed to deposit');
      setStep('input');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Deposit USDC</h2>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-white/80 hover:text-white transition-colors disabled:opacity-50"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-blue-100 text-sm mt-2">
            Deposit USDC to start trading
          </p>
        </div>

        <div className="p-6">
          {step === 'input' && (
            <>
              {/* Wallet Balance */}
              {walletBalance !== undefined && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Wallet Balance:</span>
                    <span className="text-sm font-bold text-gray-900">{walletBalance.toFixed(2)} USDC</span>
                  </div>
                </div>
              )}

              {/* Amount Input */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Amount (USDC)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold"
                  />
                  {walletBalance !== undefined && (
                    <button
                      onClick={() => setAmount(walletBalance.toString())}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                      MAX
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Minimum: 1 USDC
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Info */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>How it works:</strong>
                </p>
                <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                  <li>Approve USDC spending (if needed)</li>
                  <li>Deposit to smart contract vault</li>
                  <li>Balance synced to platform automatically</li>
                </ol>
              </div>

              {/* Deposit Button */}
              <button
                onClick={handleDeposit}
                disabled={loading || !amount || parseFloat(amount) <= 0}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
              >
                Deposit {amount && parseFloat(amount) > 0 ? `${amount} USDC` : ''}
              </button>
            </>
          )}

          {step === 'approving' && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Approving USDC...</h3>
              <p className="text-gray-600">Please confirm the approval transaction in your wallet</p>
            </div>
          )}

          {step === 'depositing' && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mb-4"></div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Depositing...</h3>
              <p className="text-gray-600">Please confirm the deposit transaction in your wallet</p>
            </div>
          )}

          {step === 'syncing' && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mb-4"></div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Syncing balance...</h3>
              <p className="text-gray-600">Updating your platform balance</p>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Deposit Successful!</h3>
              <p className="text-gray-600">Your USDC is now available for trading</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
