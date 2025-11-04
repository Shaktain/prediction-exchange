'use client';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">PredictX</h1>
              <p className="text-xs text-gray-500">Prediction Markets</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            <Link href="/" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
              Markets
            </Link>
            <Link href="/portfolio" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
              Portfolio
            </Link>
            <Link href="#" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
              Leaderboard
            </Link>
          </nav>

          {/* RainbowKit Connect Button */}
          <div className="flex items-center">
            <ConnectButton 
              chainStatus="icon"
              showBalance={{
                smallScreen: false,
                largeScreen: true,
              }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}