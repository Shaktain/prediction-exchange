'use client';
import { useState, useEffect } from 'react';
import { useAccount, useBalance, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { CONTRACTS } from '@/lib/contracts/config';
import ExchangeABI from '@/lib/contracts/PredictExExchange.abi.json';
import UsdcABI from '@/lib/contracts/USDC.abi.json';

export default function DepositWithdraw() {
  const { address } = useAccount();
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [step, setStep] = useState<'input' | 'approving' | 'depositing' | 'withdrawing'>('input');
  
  // Get USDC balance in wallet
  const { data: usdcBalance, refetch: refetchUsdcBalance } = useBalance({
    address: address,
    token: CONTRACTS.usdc,
  });

  // Get exchange balance from contract
  const { data: exchangeBalanceRaw, refetch: refetchExchangeBalance } = useReadContract({
    address: CONTRACTS.exchange,
    abi: ExchangeABI,
    functionName: 'getBalance',
    args: [address],
    query: {
      enabled: !!address,
    },
  });

  const exchangeBalance = exchangeBalanceRaw 
    ? formatUnits(exchangeBalanceRaw as bigint, 6) 
    : '0';

  // Approve USDC
  const { writeContract: approveUsdc, data: approveHash } = useWriteContract();
  const { isLoading: isApproving, isSuccess: approveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  // Deposit
  const { writeContract: deposit, data: depositHash } = useWriteContract();
  const { isLoading: isDepositing, isSuccess: depositSuccess } = useWaitForTransactionReceipt({
    hash: depositHash,
  });

  // Withdraw
  const { writeContract: withdraw, data: withdrawHash } = useWriteContract();
  const { isLoading: isWithdrawing, isSuccess: withdrawSuccess } = useWaitForTransactionReceipt({
    hash: withdrawHash,
  });

  // Reset after successful transactions
  useEffect(() => {
    if (approveSuccess) {
      setStep('input');
    }
  }, [approveSuccess]);

  useEffect(() => {
    if (depositSuccess && depositHash && address && amount) {
      // Sync to database
      syncDepositToDatabase();
      
      setAmount('');
      setStep('input');
      // Refetch balances
      refetchUsdcBalance();
      refetchExchangeBalance();
    }
  }, [depositSuccess, depositHash, address, amount, refetchUsdcBalance, refetchExchangeBalance]);

  const syncDepositToDatabase = async () => {
    try {
      const response = await fetch('/api/deposits/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          amount: parseFloat(amount),
          txHash: depositHash,
        }),
      });

      if (!response.ok) {
        console.error('Failed to sync deposit to database');
      } else {
        console.log('✅ Deposit synced to database');
      }
    } catch (error) {
      console.error('Error syncing deposit:', error);
    }
  };

  useEffect(() => {
    if (withdrawSuccess && withdrawHash && address && amount) {
      // Sync to database
      syncWithdrawalToDatabase();
      
      setAmount('');
      setStep('input');
      // Refetch balances
      refetchUsdcBalance();
      refetchExchangeBalance();
    }
  }, [withdrawSuccess, withdrawHash, address, amount, refetchUsdcBalance, refetchExchangeBalance]);

  const syncWithdrawalToDatabase = async () => {
    try {
      const response = await fetch('/api/withdrawals/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          amount: parseFloat(amount),
          txHash: withdrawHash,
        }),
      });

      if (!response.ok) {
        console.error('Failed to sync withdrawal to database');
      } else {
        console.log('✅ Withdrawal synced to database');
      }
    } catch (error) {
      console.error('Error syncing withdrawal:', error);
    }
  };

  /**
   * Handle approve
   */
  const handleApprove = async () => {
    if (!amount || !address) return;

    try {
      setStep('approving');
      const amountInWei = parseUnits(amount, 6);

      await approveUsdc({
        address: CONTRACTS.usdc,
        abi: UsdcABI,
        functionName: 'approve',
        args: [CONTRACTS.exchange, amountInWei],
      });
    } catch (error) {
      console.error('Approve error:', error);
      setStep('input');
    }
  };

  /**
   * Handle deposit
   */
  const handleDeposit = async () => {
    if (!amount || !address) return;

    try {
      setStep('depositing');
      const amountInWei = parseUnits(amount, 6);

      await deposit({
        address: CONTRACTS.exchange,
        abi: ExchangeABI,
        functionName: 'deposit',
        args: [amountInWei],
      });
    } catch (error) {
      console.error('Deposit error:', error);
      setStep('input');
    }
  };

  /**
   * Handle withdraw
   */
  const handleWithdraw = async () => {
    if (!amount || !address) return;

    try {
      setStep('withdrawing');
      const amountInWei = parseUnits(amount, 6);

      await withdraw({
        address: CONTRACTS.exchange,
        abi: ExchangeABI,
        functionName: 'withdraw',
        args: [amountInWei],
      });
    } catch (error) {
      console.error('Withdraw error:', error);
      setStep('input');
    }
  };

  const walletBalanceNumber = usdcBalance ? parseFloat(formatUnits(usdcBalance.value, 6)) : 0;
  const exchangeBalanceNumber = parseFloat(exchangeBalance);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Manage Funds</h2>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('deposit')}
          className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
            mode === 'deposit'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Deposit
        </button>
        <button
          onClick={() => setMode('withdraw')}
          className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
            mode === 'withdraw'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Withdraw
        </button>
      </div>

      {/* Balances */}
      <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div>
          <p className="text-sm text-gray-500 mb-1">Wallet Balance</p>
          <p className="text-xl font-bold">
            {walletBalanceNumber.toFixed(2)} USDC
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Exchange Balance</p>
          <p className="text-xl font-bold text-green-600">
            {exchangeBalanceNumber.toFixed(2)} USDC
          </p>
          <p className="text-xs text-gray-500">Available to trade</p>
        </div>
      </div>

      {/* Amount Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Amount (USDC)
        </label>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            step="0.01"
            min="0"
            disabled={step !== 'input'}
          />
          <button
            onClick={() => {
              if (mode === 'deposit') {
                setAmount(walletBalanceNumber.toString());
              } else {
                setAmount(exchangeBalanceNumber.toString());
              }
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            MAX
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      {mode === 'deposit' ? (
        <div className="space-y-3">
          <button
            onClick={handleApprove}
            disabled={!amount || step !== 'input' || parseFloat(amount) <= 0}
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-4 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {step === 'approving' ? 'Approving...' : '1. Approve USDC'}
          </button>
          <button
            onClick={handleDeposit}
            disabled={!amount || step !== 'input' || parseFloat(amount) <= 0}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {step === 'depositing' ? 'Depositing...' : '2. Deposit to Exchange'}
          </button>
        </div>
      ) : (
        <button
          onClick={handleWithdraw}
          disabled={!amount || step !== 'input' || parseFloat(amount) <= 0 || parseFloat(amount) > exchangeBalanceNumber}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {step === 'withdrawing' ? 'Withdrawing...' : 'Withdraw from Exchange'}
        </button>
      )}

      {/* Transaction Status */}
      {(approveHash || depositHash || withdrawHash) && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            Transaction submitted! View on{' '}
            <a
              href={`https://sepolia.basescan.org/tx/${approveHash || depositHash || withdrawHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold"
            >
              Basescan
            </a>
          </p>
        </div>
      )}

      {/* Info */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          💡 <strong>Trading Balance:</strong> Your exchange balance ({exchangeBalanceNumber.toFixed(2)} USDC) is what you can use to trade. 
          Deposit from your wallet to add more funds.
        </p>
      </div>
    </div>
  );
}
