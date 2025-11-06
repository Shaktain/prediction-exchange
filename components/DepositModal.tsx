'use client';
import { useState } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { X, AlertCircle, CheckCircle } from 'lucide-react';
import { getVaultContract, VAULT_ADDRESS } from '@/lib/blockchain/vault';

interface DepositModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function DepositModal({ onClose, onSuccess }: DepositModalProps) {
  const { address } = useAccount();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'input' | 'approving' | 'depositing' | 'success'>('input');

  async function handleDeposit() {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
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

      // Try-catch for allowance check
      try {
        const currentAllowance = await usdcContract.allowance(signerAddress, VAULT_ADDRESS);
        console.log("Current allowance:", ethers.formatUnits(currentAllowance, 6));

        if (currentAllowance < amountInWei) {
          setStep('approving');
          const approveTx = await usdcContract.approve(VAULT_ADDRESS, amountInWei);
          await approveTx.wait();
        } else {
          console.log("Already approved, skipping approval");
        }
      } catch (allowanceError) {
        console.log("Allowance check failed, approving anyway:", allowanceError);
        // If allowance fails, just approve
        setStep('approving');
        const approveTx = await usdcContract.approve(VAULT_ADDRESS, amountInWei);
        await approveTx.wait();
      }

      setStep('depositing');
      const depositTx = await vaultContract.deposit(amountInWei);
      await depositTx.wait();

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
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-blue-100 text-sm mt-2">
            Deposit USDC to your on-chain vault
          </p>
        </div>

        <div className="p-6">
          {step === 'input' && (
            <>
              {/* Amount Input */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Amount (USDC)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold"
                />
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
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> You'll need to approve USDC spending first (if not already approved), then confirm the deposit transaction.
                </p>
              </div>

              {/* Deposit Button */}
              <button
                onClick={handleDeposit}
                disabled={loading || !amount}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
              >
                Deposit
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

          {step === 'success' && (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Deposit Successful!</h3>
              <p className="text-gray-600">Your USDC has been deposited to the vault</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}