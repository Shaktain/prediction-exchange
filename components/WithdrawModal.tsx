'use client';
import { useState } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { getVaultContract } from '@/lib/blockchain/vault';

interface WithdrawModalProps {
  onClose: () => void;
  onSuccess: () => void;
  onChainBalance: number;
  offChainBalance: number;
}

export default function WithdrawModal({ 
  onClose, 
  onSuccess, 
  onChainBalance,
  offChainBalance 
}: WithdrawModalProps) {
  const { address } = useAccount();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'input' | 'withdrawing' | 'success'>('input');

  const maxWithdrawable = onChainBalance; // Only settled balance can be withdrawn immediately

  async function handleWithdraw() {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (parseFloat(amount) > maxWithdrawable) {
      setError(`Maximum withdrawable amount is ${maxWithdrawable.toFixed(2)} USDC`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const vaultContract = getVaultContract(signer);

      const amountInWei = ethers.parseUnits(amount, 6); // USDC has 6 decimals

      setStep('withdrawing');
      const withdrawTx = await vaultContract.withdraw(amountInWei);
      await withdrawTx.wait();

      setStep('success');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);

    } catch (err: any) {
      console.error('Withdraw error:', err);
      setError(err.message || 'Failed to withdraw');
      setStep('input');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Withdraw USDC</h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-purple-100 text-sm mt-2">
            Withdraw USDC from your on-chain vault
          </p>
        </div>

        <div className="p-6">
          {step === 'input' && (
            <>
              {/* Balance Info */}
              <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Available to withdraw:</span>
                    <span className="text-lg font-bold text-green-700">
                      {maxWithdrawable.toFixed(2)} USDC
                    </span>
                  </div>
                  {offChainBalance > 0 && (
                    <div className="flex items-start gap-2 mt-3 pt-3 border-t border-blue-200">
                      <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-700">
                        You have {offChainBalance.toFixed(2)} USDC in pending trades. 
                        These will be available after settlement.
                      </p>
                    </div>
                  )}
                </div>
              </div>

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
                    max={maxWithdrawable}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg font-semibold"
                  />
                  <button
                    onClick={() => setAmount(maxWithdrawable.toString())}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-purple-100 text-purple-700 text-sm font-semibold rounded hover:bg-purple-200 transition-colors"
                  >
                    Max
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Maximum: {maxWithdrawable.toFixed(2)} USDC
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
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> USDC will be sent to your wallet address. 
                  You'll pay a small gas fee (~$0.01) for this transaction.
                </p>
              </div>

              {/* Withdraw Button */}
              <button
                onClick={handleWithdraw}
                disabled={loading || !amount || parseFloat(amount) > maxWithdrawable}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-bold text-lg hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
              >
                Withdraw
              </button>
            </>
          )}

          {step === 'withdrawing' && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mb-4"></div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Withdrawing...</h3>
              <p className="text-gray-600">Please confirm the transaction in your wallet</p>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Withdrawal Successful!</h3>
              <p className="text-gray-600">USDC has been sent to your wallet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}