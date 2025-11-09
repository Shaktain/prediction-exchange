'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAccount } from 'wagmi';

type TradingMode = 'demo' | 'real';

interface TradingModeContextType {
  mode: TradingMode;
  setMode: (mode: TradingMode) => void;
  demoBalance: number;
  realBalance: number;
  availableBalance: number;
  lockedBalance: number;
  refreshBalances: () => Promise<void>;
}

const TradingModeContext = createContext<TradingModeContextType | undefined>(undefined);

export function TradingModeProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const [mode, setMode] = useState<TradingMode>('demo');
  const [demoBalance, setDemoBalance] = useState(0);
  const [realBalance, setRealBalance] = useState(0);
  const [lockedBalance, setLockedBalance] = useState(0);

  // Load saved mode from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('tradingMode') as TradingMode;
    if (savedMode) {
      setMode(savedMode);
    }
  }, []);

  // Save mode to localStorage
  const handleSetMode = (newMode: TradingMode) => {
    setMode(newMode);
    localStorage.setItem('tradingMode', newMode);
  };

  // Fetch balances
  const refreshBalances = async () => {
    if (!address || !isConnected) return;

    try {
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address })
      });
      const data = await response.json();

      console.log('📊 Fetched user data:', data.user);

      setDemoBalance(Number(data.user?.demoBalance || 10000));
      setRealBalance(Number(data.user?.usdcBalance || 0));
      
      // Set locked balance based on current mode
      if (mode === 'demo') {
        setLockedBalance(Number(data.user?.demoLockedBalance || 0));
      } else {
        setLockedBalance(Number(data.user?.realLockedBalance || 0));
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  };

  useEffect(() => {
    if (isConnected && address) {
      refreshBalances();
    }
  }, [isConnected, address, mode]); // Add mode to dependencies

  const availableBalance = (mode === 'demo' ? demoBalance : realBalance) - lockedBalance;

  return (
    <TradingModeContext.Provider
      value={{
        mode,
        setMode: handleSetMode,
        demoBalance,
        realBalance,
        availableBalance,
        lockedBalance,
        refreshBalances,
      }}
    >
      {children}
    </TradingModeContext.Provider>
  );
}

export function useTradingMode() {
  const context = useContext(TradingModeContext);
  if (!context) {
    throw new Error('useTradingMode must be used within TradingModeProvider');
  }
  return context;
}
