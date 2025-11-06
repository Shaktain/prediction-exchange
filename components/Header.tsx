'use client';
import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { ChevronDown, Wallet, Trophy } from 'lucide-react';
import { getOnChainBalance } from '@/lib/blockchain/vault';
import DepositModal from '@/components/DepositModal';

export default function Header() {
  const { address, isConnected } = useAccount();
  const [showBalanceMenu, setShowBalanceMenu] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [onChainBalance, setOnChainBalance] = useState<number>(0);
  const [offChainBalance, setOffChainBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      fetchBalances();
    }
  }, [isConnected, address]);

  async function fetchBalances() {
    if (!address) return;
    
    setLoading(true);
    try {
      // Fetch on-chain balance
      const onChain = await getOnChainBalance(address);
      setOnChainBalance(onChain);

      // Fetch off-chain balance from your API
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address })
      });
      const data = await response.json();
      setOffChainBalance(Number(data.user?.usdcBalance || 0));
    } catch (error) {
      console.error('Error fetching balances:', error);
    } finally {
      setLoading(false);
    }
  }

  const totalBalance = onChainBalance + offChainBalance;

  return (
    <>
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <a href="/" className="text-2xl font-bold text-white hover:text-blue-100 transition-colors">
                PredictEx
              </a>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex space-x-8">
              <a href="/" className="text-white hover:text-blue-100 font-medium transition-colors">
                Markets
              </a>
              <a href="/portfolio" className="text-white hover:text-blue-100 font-medium transition-colors">
                Portfolio
              </a>
              <a href="/leaderboard" className="flex items-center gap-2 text-white hover:text-blue-100 font-medium transition-colors">
                <Trophy className="w-4 h-4" />
                Leaderboard
              </a>
            </nav>

            {/* Right side - Balance & Connect */}
            <div className="flex items-center gap-4">
              {isConnected && address && (
                <div className="relative">
                  <button
                    onClick={() => setShowBalanceMenu(!showBalanceMenu)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-lg transition-all border border-white/20"
                  >
                    <Wallet className="w-5 h-5 text-white" />
                    <div className="text-left">
                      <div className="text-xs text-blue-100">Balance</div>
                      <div className="text-sm font-bold text-white">
                        {loading ? '...' : `${totalBalance.toFixed(2)} USDC`}
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-white transition-transform ${showBalanceMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {showBalanceMenu && (
                    <>
                      {/* Backdrop */}
                      <div 
                        className="fixed inset-0" 
                        onClick={() => setShowBalanceMenu(false)}
                      />
                      
                      {/* Dropdown */}
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
                        <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 border-b border-gray-100">
                          <h3 className="text-lg font-bold text-gray-900 mb-1">Your Wallet</h3>
                          <p className="text-xs text-gray-600">Optimistic balance model</p>
                        </div>
                        
                        <div className="p-4 space-y-3">
                          {/* On-Chain Balance */}
                          <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium text-gray-700">On-Chain (Settled)</span>
                              <span className="text-sm font-bold text-green-700">
                                {onChainBalance.toFixed(2)} USDC
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              ✓ Available for immediate withdrawal
                            </div>
                          </div>

                          {/* Off-Chain Balance */}
                          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium text-gray-700">Off-Chain (Pending)</span>
                              <span className="text-sm font-bold text-blue-700">
                                {offChainBalance.toFixed(2)} USDC
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              Trading balance & unsettled P&L
                            </div>
                          </div>

                          {/* Total */}
                          <div className="pt-3 border-t border-gray-200">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-semibold text-gray-700">Total Balance</span>
                              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                {totalBalance.toFixed(2)} USDC
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => {
                                setShowDepositModal(true);
                                setShowBalanceMenu(false);
                              }}
                              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2.5 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-105 shadow-md"
                            >
                              Deposit
                            </button>
                            <button
                              onClick={() => {/* We'll add withdraw next */}}
                              className="bg-white text-gray-700 px-4 py-2.5 rounded-lg font-semibold hover:bg-gray-100 transition-colors border border-gray-300"
                            >
                              Withdraw
                            </button>
                          </div>
                          
                          <button
                            onClick={fetchBalances}
                            disabled={loading}
                            className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium py-2 disabled:opacity-50"
                          >
                            {loading ? 'Refreshing...' : '🔄 Refresh Balances'}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              <ConnectButton />
            </div>
          </div>
        </div>
      </header>

      {/* Modals */}
      {showDepositModal && (
        <DepositModal 
          onClose={() => setShowDepositModal(false)}
          onSuccess={fetchBalances}
        />
      )}
    </>
  );
}