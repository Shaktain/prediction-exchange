'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { mainnet, polygon, optimism, arbitrum, base, baseSepolia } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { TradingModeProvider } from '@/lib/contexts/TradingModeContext';

const config = getDefaultConfig({
  appName: 'Prediction Exchange',
  projectId: '7d65eff474d477ebf434646be6d269f4',
  chains: [baseSepolia, base, mainnet, polygon, optimism, arbitrum],
  ssr: true,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <TradingModeProvider>
            {children}
          </TradingModeProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
