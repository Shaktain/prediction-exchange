'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Market {
  id: number;
  question: string;
  category: string;
  endDate: Date;
  volume: number;
  resolved: boolean;
  resolvedOutcome?: string;
  // For multi-option markets
  options?: Array<{
    id: number;
    text: string;
  }>;
}

export default function AdminResolutionPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<number | null>(null);

  useEffect(() => {
    fetchUnresolvedMarkets();
  }, []);

  async function fetchUnresolvedMarkets() {
    try {
      const response = await fetch('/api/admin/unresolved-markets');
      const data = await response.json();
      setMarkets(data.markets);
    } catch (error) {
      console.error('Failed to fetch markets:', error);
    } finally {
      setLoading(false);
    }
  }

  async function resolveMarket(marketId: number, outcome: string, optionId?: number) {
    if (!confirm(`Are you sure you want to resolve this market as ${outcome}?`)) {
      return;
    }

    setResolving(marketId);

    try {
      // Step 1: Resolve in database
      const dbResponse = await fetch('/api/admin/resolve-market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketId: marketId.toString(),
          outcome,
          optionId, // For multi-option markets
        }),
      });

      if (!dbResponse.ok) {
        const error = await dbResponse.json();
        throw new Error(error.error || 'Failed to resolve in database');
      }

      // Step 2: Resolve on-chain
      const contractResponse = await fetch('/api/admin/resolve-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketId,
          outcome: outcome === 'yes', // true for YES, false for NO
        }),
      });

      if (!contractResponse.ok) {
        const error = await contractResponse.json();
        throw new Error(error.error || 'Failed to resolve on-chain');
      }

      const { txHash, explorerUrl } = await contractResponse.json();

      alert(`Market resolved successfully!\n\nTransaction: ${explorerUrl}`);

      // Refresh the list (resolved market should disappear)
      fetchUnresolvedMarkets();

    } catch (error: any) {
      console.error('Resolution error:', error);
      alert(`Failed to resolve market: ${error.message}`);
    } finally {
      setResolving(null);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">Loading markets...</div>
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Link href="/admin">
          <Button variant="ghost" className="mb-6">
            ← Back to Admin
          </Button>
        </Link>
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No markets pending resolution</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Link href="/admin">
        <Button variant="ghost" className="mb-6">
          ← Back to Admin
        </Button>
      </Link>

      <h1 className="text-3xl font-bold mb-8">Resolve Markets</h1>

      <div className="space-y-6">
        {markets.map((market) => (
          <Card key={market.id} className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                    {market.category}
                  </span>
                </div>

                <h3 className="text-lg font-semibold mb-2">{market.question}</h3>

                <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium">End Date:</span>
                    <br />
                    {market.endDate ? new Date(market.endDate).toLocaleDateString() : 'Invalid Date'}
                  </div>
                  <div>
                    <span className="font-medium">Volume:</span>
                    <br />
                    ${(market.volume || 0).toFixed(2)}
                  </div>
                  <div>
                    <span className="font-medium">Traders:</span>
                    <br />
                    TBD
                  </div>
                </div>

                {/* Show options for multi-option markets */}
                {market.options && market.options.length > 0 && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Available Options:</p>
                    <ul className="space-y-1">
                      {market.options.map((option) => (
                        <li key={option.id} className="text-sm">
                          • {option.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {/* For multi-option markets, show option-specific buttons */}
                {market.options && market.options.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {market.options.map((option) => (
                      <Button
                        key={option.id}
                        onClick={() => resolveMarket(market.id, 'yes', option.id)}
                        disabled={resolving === market.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {resolving === market.id ? 'Resolving...' : `✓ ${option.text}`}
                      </Button>
                    ))}
                    <Button
                      onClick={() => resolveMarket(market.id, 'no')}
                      disabled={resolving === market.id}
                      variant="destructive"
                    >
                      {resolving === market.id ? 'Resolving...' : '✗ None of Above'}
                    </Button>
                  </div>
                ) : (
                  /* For binary markets, show YES/NO buttons */
                  <>
                    <Button
                      onClick={() => resolveMarket(market.id, 'yes')}
                      disabled={resolving === market.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {resolving === market.id ? 'Resolving...' : '✓ Resolve YES'}
                    </Button>
                    <Button
                      onClick={() => resolveMarket(market.id, 'no')}
                      disabled={resolving === market.id}
                      variant="destructive"
                    >
                      {resolving === market.id ? 'Resolving...' : '✗ Resolve NO'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
