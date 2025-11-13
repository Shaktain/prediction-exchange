'use client';
import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { ChevronDown, Wallet, Trophy, Zap, Shield, User, Settings } from 'lucide-react';
import { useUSDCBalance } from '@/lib/hooks/useUSDCBalance';
import { useTradingMode } from '@/lib/contexts/TradingModeContext';
import DepositModal from '@/components/DepositModal';
import WithdrawModal from '@/components/WithdrawModal';
import UsernameModal from '@/components/UsernameModal';

export default function Header() {
  const { address, isConnected } = useAccount();
  const { mode, setMode, demoBalance, realBalance, availableBalance, lockedBalance, refreshBalances } = useTradingMode();
  const [showBalanceMenu, setShowBalanceMenu] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  // Get real USDC balance from blockchain (wallet)
  const { balance: walletUSDC, isLoading: walletLoading, refetch: refetchWallet } = useUSDCBalance();

  // Check username whenever address changes or page loads
  useEffect(() => {
    if (isConnected && address) {
      checkUserUsername();
    } else {
      // Reset state when disconnected
      setUsername(null);
      setShowUsernameModal(false);
    }
  }, [isConnected, address]); // Removed the dependency on username

  const checkUserUsername = async () => {
    if (!address) return;

    setIsCheckingUsername(true);
    try {
      // Register/get user - this will return existing user with username if they have one
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address })
      });

      const data = await response.json();

      if (data.user) {
        if (data.user.username) {
          // User has username - set it in state
          setUsername(data.user.username);
          setShowUsernameModal(false);
        } else {
          // User doesn't have username - clear state
          setUsername(null);
          setShowUsernameModal(false);
        }
      }

    } catch (error) {
      console.error('Error checking username:', error);
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleUsernameComplete = (newUsername: string) => {
    // Immediately set username in state
    setUsername(newUsername);
    setShowUsernameModal(false);
    
    // Optionally refresh balances in background
    setTimeout(() => {
      refreshBalances();
    }, 100);
  };

  const handleRefresh = async () => {
    await Promise.all([refreshBalances(), refetchWallet(), checkUserUsername()]);
  };

  // Display username or shortened wallet address
  const displayName = username || (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '');

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
              {isConnected && address && !isCheckingUsername && (
                <div className="relative">
                  <button
                    onClick={() => setShowBalanceMenu(!showBalanceMenu)}
                    className="flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-lg transition-all border border-white/20"
                  >
                    {/* Username/Address Display */}
                    <div className="flex items-center gap-2 pr-3 border-r border-white/30">
                      <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-semibold text-white hidden sm:inline">
                        {displayName}
                      </span>
                    </div>

                    {/* Balance Display */}
                    <Wallet className="w-5 h-5 text-white" />
                    <div className="text-left">
                      <div className="text-xs text-blue-100 flex items-center gap-1">
                        {mode === 'demo' ? (
                          <>
                            <Zap className="w-3 h-3" />
                            Demo
                          </>
                        ) : (
                          <>
                            <Shield className="w-3 h-3" />
                            Real
                          </>
                        )}
                      </div>
                      <div className="text-sm font-bold text-white">
                        ${availableBalance.toFixed(2)} USDC
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
                      <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                        {/* User Info Header */}
                        <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 border-b border-gray-100">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                              <User className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-gray-900">{displayName}</h3>
                              <p className="text-xs text-gray-600">
                                {address.slice(0, 6)}...{address.slice(-4)}
                              </p>
                            </div>
                          </div>
                          {!username && (
                            <button
                              onClick={() => {
                                setShowUsernameModal(true);
                                setShowBalanceMenu(false);
                              }}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                            >
                              ✨ Set your username
                            </button>
                          )}
                          <p className="text-xs text-gray-600 mt-2">Switch between demo and real money</p>
                        </div>
                        
                        {/* Mode Toggle */}
                        <div className="p-4 bg-gray-50 border-b border-gray-200">
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => {
                                setMode('demo');
                                setShowBalanceMenu(false);
                              }}
                              className={`p-3 rounded-lg font-semibold transition-all ${
                                mode === 'demo'
                                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                              }`}
                            >
                              <div className="flex items-center justify-center gap-2 mb-1">
                                <Zap className="w-4 h-4" />
                                <span>Demo Mode</span>
                              </div>
                              <div className="text-xs opacity-90">Practice trading</div>
                            </button>
                            
                            <button
                              onClick={() => {
                                setMode('real');
                                setShowBalanceMenu(false);
                              }}
                              className={`p-3 rounded-lg font-semibold transition-all ${
                                mode === 'real'
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
                                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                              }`}
                            >
                              <div className="flex items-center justify-center gap-2 mb-1">
                                <Shield className="w-4 h-4" />
                                <span>Real Mode</span>
                              </div>
                              <div className="text-xs opacity-90">Real money</div>
                            </button>
                          </div>
                        </div>

                        <div className="p-4 space-y-3">
                          {/* Current Mode Balance */}
                          <div className={`p-4 rounded-lg border-2 ${
                            mode === 'demo' 
                              ? 'bg-amber-50 border-amber-200' 
                              : 'bg-green-50 border-green-200'
                          }`}>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-gray-700">
                                {mode === 'demo' ? '⚡ Demo Balance' : '💰 Real Balance'}
                              </span>
                              <span className={`text-xl font-bold ${
                                mode === 'demo' ? 'text-amber-700' : 'text-green-700'
                              }`}>
                                ${availableBalance.toFixed(2)}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 space-y-1">
                              <div>Total: ${(mode === 'demo' ? demoBalance : realBalance).toFixed(2)}</div>
                              <div>Locked: ${lockedBalance.toFixed(2)}</div>
                            </div>
                          </div>

                          {/* Wallet USDC Balance */}
                          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium text-gray-700">💳 Wallet USDC</span>
                              <span className="text-sm font-bold text-blue-700">
                                {walletLoading ? '...' : `${walletUSDC.toFixed(2)} USDC`}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              Base Sepolia • Available to deposit
                            </div>
                          </div>

                          {/* Info Box */}
                          {mode === 'demo' ? (
                            <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                              <div className="text-xs text-amber-800">
                                <strong>⚡ Demo Mode:</strong> Practice with $10,000 virtual USDC. No real money at risk!
                              </div>
                            </div>
                          ) : (
                            <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                              <div className="text-xs text-green-800">
                                <strong>💰 Real Mode:</strong> Trading with real USDC from your wallet. Deposit to get started!
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Quick Links */}
                        {username && (
                          <div className="border-t border-gray-100 py-2">
                            <a
                              href={`/profile/${username}`}
                              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                              onClick={() => setShowBalanceMenu(false)}
                            >
                              <User className="w-5 h-5 text-gray-500" />
                              <div>
                                <div className="font-medium text-gray-900">View Profile</div>
                                <div className="text-xs text-gray-500">@{username}</div>
                              </div>
                            </a>
                            <a
                              href="/settings"
                              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                              onClick={() => setShowBalanceMenu(false)}
                            >
                              <Settings className="w-5 h-5 text-gray-500" />
                              <span className="text-gray-700">Settings</span>
                            </a>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-2">
                          {mode === 'real' && (
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
                                onClick={() => {
                                  setShowWithdrawModal(true);
                                  setShowBalanceMenu(false);
                                }}
                                className="bg-white text-gray-700 px-4 py-2.5 rounded-lg font-semibold hover:bg-gray-100 transition-colors border border-gray-300"
                              >
                                Withdraw
                              </button>
                            </div>
                          )}
                          
                          <button
                            onClick={handleRefresh}
                            disabled={walletLoading}
                            className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium py-2 disabled:opacity-50"
                          >
                            {walletLoading ? 'Refreshing...' : '🔄 Refresh Balances'}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Show loading state while checking username */}
              {isConnected && address && isCheckingUsername && (
                <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="text-sm text-white">Loading...</span>
                  </div>
                </div>
              )}

              <ConnectButton />
            </div>
          </div>
        </div>
      </header>

      {/* Username Modal - Only shows when user manually clicks "Set username" */}
      {isConnected && address && showUsernameModal && (
        <UsernameModal
          isOpen={showUsernameModal}
          walletAddress={address}
          onComplete={handleUsernameComplete}
          onClose={() => setShowUsernameModal(false)}
        />
      )}

      {/* Deposit/Withdraw Modals - Only show in real mode */}
      {mode === 'real' && (
        <>
          {showDepositModal && (
            <DepositModal 
              onClose={() => setShowDepositModal(false)}
              onSuccess={handleRefresh}
              walletBalance={walletUSDC}
            />
          )}
          
          {showWithdrawModal && (
            <WithdrawModal 
              onClose={() => setShowWithdrawModal(false)}
              onSuccess={handleRefresh}
              onChainBalance={realBalance - lockedBalance}
              offChainBalance={lockedBalance}
            />
          )}
        </>
      )}
    </>
  );
}
