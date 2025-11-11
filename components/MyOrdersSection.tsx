'use client';

import React, { useState, useMemo } from 'react';
import { X, ChevronDown, ChevronUp, ExternalLink, Filter, Download, XCircle } from 'lucide-react';

interface Order {
  id: string;
  marketId: number;
  side: string;
  direction: string;
  type: string;
  price: number;
  quantity: number;
  filled: number;
  remaining: number;
  status: string;
  createdAt: string;
  mode: string;
  market: {
    title: string;
    category: string;
    optionText: string | null;
    marketGroupId: number | null;
    marketGroup: {
      id: number;
      question: string;
    } | null;
  };
}

interface MyOrdersProps {
  orders: Order[];
  onCancelOrder: (orderId: string) => Promise<void>;
  onRefresh: () => void;
}

type SortField = 'date' | 'price' | 'quantity' | 'market';
type SortOrder = 'asc' | 'desc';

export default function MyOrdersSection({ orders, onCancelOrder, onRefresh }: MyOrdersProps) {
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<string | null>(null);
  const [cancellingAll, setCancellingAll] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [marketFilter, setMarketFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showFilters, setShowFilters] = useState(false);

  // Get unique markets for filter
  const uniqueMarkets = useMemo(() => {
    const markets = new Map();
    orders.forEach(order => {
      markets.set(order.marketId, order.market.title);
    });
    return Array.from(markets.entries());
  }, [orders]);

  // Filter and sort orders
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = orders;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Apply market filter
    if (marketFilter !== 'all') {
      filtered = filtered.filter(order => order.marketId.toString() === marketFilter);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'price':
          comparison = Number(a.price) - Number(b.price);
          break;
        case 'quantity':
          comparison = Number(a.quantity) - Number(b.quantity);
          break;
        case 'market':
          comparison = a.market.title.localeCompare(b.market.title);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [orders, statusFilter, marketFilter, sortField, sortOrder]);

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    
    setCancellingOrder(orderId);
    try {
      await onCancelOrder(orderId);
      onRefresh();
    } catch (error) {
      console.error('Failed to cancel order:', error);
      alert('Failed to cancel order');
    } finally {
      setCancellingOrder(null);
    }
  };

  const handleCancelAllOrders = async () => {
    const openOrders = orders.filter(o => o.status === 'open' || o.status === 'partial');
    
    if (openOrders.length === 0) {
      alert('No open orders to cancel');
      return;
    }

    if (!confirm(`Are you sure you want to cancel all ${openOrders.length} open orders?`)) return;
    
    setCancellingAll(true);
    try {
      await Promise.all(openOrders.map(order => onCancelOrder(order.id)));
      onRefresh();
    } catch (error) {
      console.error('Failed to cancel orders:', error);
      alert('Some orders failed to cancel');
    } finally {
      setCancellingAll(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Market', 'Option', 'Side', 'Type', 'Price', 'Quantity', 'Filled', 'Status'];
    const rows = filteredAndSortedOrders.map(order => [
      new Date(order.createdAt).toLocaleString(),
      order.market.title,
      order.side.toUpperCase(),
      order.direction.toUpperCase(),
      order.type,
      order.price,
      order.quantity,
      order.filled,
      order.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const truncateText = (text: string | null | undefined, maxLength: number) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      open: 'bg-blue-100 text-blue-700',
      partial: 'bg-yellow-100 text-yellow-700',
      filled: 'bg-green-100 text-green-700',
      cancelled: 'bg-gray-100 text-gray-700'
    };
    return badges[status as keyof typeof badges] || badges.open;
  };

  // Calculate P&L color gradient for filled orders
  const getPnLGradient = (order: Order) => {
    if (order.status !== 'filled') return '';
    
    // Simple P&L estimation based on direction
    // In reality, you'd need current market price to calculate actual P&L
    const estimatedPnL = order.direction === 'buy' ? 0.1 : -0.05; // Placeholder
    
    if (estimatedPnL > 0.05) return 'bg-gradient-to-r from-green-50 to-green-100';
    if (estimatedPnL < -0.05) return 'bg-gradient-to-r from-red-50 to-red-100';
    return 'bg-gray-50';
  };

  const openOrdersCount = orders.filter(o => o.status === 'open' || o.status === 'partial').length;

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">My Orders</h2>
        </div>
        <div className="p-8 text-center text-gray-500">
          <p>No orders found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header with Actions */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-900">My Orders</h2>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors ${
                showFilters 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>

            {/* Cancel All */}
            {openOrdersCount > 0 && (
              <button
                onClick={handleCancelAllOrders}
                disabled={cancellingAll}
                className="inline-flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                {cancellingAll ? 'Cancelling...' : `Cancel All (${openOrdersCount})`}
              </button>
            )}
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="partial">Partial</option>
                <option value="filled">Filled</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Market Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Market</label>
              <select
                value={marketFilter}
                onChange={(e) => setMarketFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Markets</option>
                {uniqueMarkets.map(([id, title]) => (
                  <option key={id} value={id}>{truncateText(title, 40)}</option>
                ))}
              </select>
            </div>

            {/* Sort Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="date">Date</option>
                <option value="price">Price</option>
                <option value="quantity">Quantity</option>
                <option value="market">Market</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="px-6 py-2 bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
        Showing {filteredAndSortedOrders.length} of {orders.length} orders
      </div>

      {/* Desktop View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-gray-700 w-8"></th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Market</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700">Option</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700">Side</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">Price</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">Quantity</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700 w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedOrders.map((order) => {
              const fillPercentage = (Number(order.filled) / Number(order.quantity)) * 100;
              
              return (
                <React.Fragment key={order.id}>
                  {/* Main Row with gradient for filled orders */}
                  <tr 
                    key={order.id} 
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${getPnLGradient(order)}`}
                  >
                    {/* Expand Button */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {expandedOrder === order.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </td>

                    {/* Market - Show option text for market groups, title for binary */}
                    <td className="py-3 px-4">
                      <div className="relative group">
                        <div className="font-medium text-gray-900 max-w-xs">
                          {truncateText(
                            order.market.optionText || order.market.title || 'Untitled Market', 
                            50
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{order.market.category || 'Uncategorized'}</div>
                        
                        {/* Tooltip on Hover - Show full question for market groups */}
                        {order.market.marketGroup && order.market.marketGroup.question && (
                          <div className="absolute left-0 top-full mt-2 w-80 bg-gray-900 text-white text-sm p-3 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            <div className="font-semibold mb-1">Question:</div>
                            {order.market.marketGroup.question}
                            <div className="mt-2 text-xs text-gray-300">Option: {order.market.optionText}</div>
                            <div className="absolute bottom-full left-4 border-4 border-transparent border-b-gray-900"></div>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Option */}
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        order.side === 'yes' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {order.side.toUpperCase()}
                      </span>
                    </td>

                    {/* Side */}
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        order.direction === 'buy' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {order.direction.toUpperCase()}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="py-3 px-4 text-right font-medium">
                      ${Number(order.price).toFixed(2)}
                    </td>

                    {/* Quantity with Progress Bar */}
                    <td className="py-3 px-4 text-right">
                      <div className="space-y-1">
                        <div className="text-sm">
                          {order.status === 'filled' ? (
                            <span className="text-gray-900 font-medium">{Number(order.quantity).toFixed(0)}</span>
                          ) : (
                            <>
                              <span className="text-gray-500">{Number(order.filled).toFixed(0)}/</span>
                              <span className="text-gray-900 font-medium">{Number(order.quantity).toFixed(0)}</span>
                            </>
                          )}
                        </div>
                        
                        {/* Progress Bar for Partial Orders */}
                        {order.status === 'partial' && (
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className="bg-blue-600 h-1.5 rounded-full transition-all"
                              style={{ width: `${fillPercentage}%` }}
                            ></div>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(order.status)}`}>
                        {order.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center">
                      {(order.status === 'open' || order.status === 'partial') && (
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          disabled={cancellingOrder === order.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors disabled:opacity-50"
                          title="Cancel order"
                        >
                          {cancellingOrder === order.id ? (
                            <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full"></div>
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* Expanded Details Row */}
                  {expandedOrder === order.id && (
                    <tr className="bg-blue-50 border-b border-blue-100">
                      <td colSpan={8} className="py-4 px-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-gray-600 mb-1">Order Type</div>
                            <div className="font-semibold text-gray-900 capitalize">{order.type}</div>
                          </div>
                          <div>
                            <div className="text-gray-600 mb-1">Total Value</div>
                            <div className="font-semibold text-gray-900">
                              ${(Number(order.price) * Number(order.quantity)).toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600 mb-1">Filled/Remaining</div>
                            <div className="font-semibold text-gray-900">
                              {Number(order.filled).toFixed(0)} / {Number(order.remaining).toFixed(0)}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600 mb-1">Date Created</div>
                            <div className="font-semibold text-gray-900">
                              {new Date(order.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 flex gap-2">
                          <a
                            href={
                              order.market.marketGroupId 
                                ? `/market-group/${order.market.marketGroupId}`
                                : `/markets/${order.marketId}`
                            }
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
                          >
                            <ExternalLink className="w-4 h-4" />
                            View Market
                          </a>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile View - Card Based */}
      <div className="md:hidden divide-y divide-gray-200">
        {filteredAndSortedOrders.map((order) => {
          const fillPercentage = (Number(order.filled) / Number(order.quantity)) * 100;
          
          return (
            <div key={order.id} className={`p-4 ${getPnLGradient(order)}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="font-medium text-gray-900 mb-1">
                    {truncateText(
                      order.market.optionText || order.market.title || 'Untitled Market',
                      60
                    )}
                  </div>
                  <div className="text-xs text-gray-500">{order.market.category || 'Uncategorized'}</div>
                  {order.market.marketGroup && (
                    <div className="text-xs text-gray-400 mt-1">
                      Q: {truncateText(order.market.marketGroup.question, 40)}
                    </div>
                  )}
                </div>
                
                {(order.status === 'open' || order.status === 'partial') && (
                  <button
                    onClick={() => handleCancelOrder(order.id)}
                    disabled={cancellingOrder === order.id}
                    className="text-red-600 hover:text-red-700 p-2 ml-2"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  order.direction === 'buy' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  {order.direction.toUpperCase()}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  order.side === 'yes' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {order.side.toUpperCase()}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(order.status)}`}>
                  {order.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <div>
                  <div className="text-gray-600">Price</div>
                  <div className="font-semibold">${Number(order.price).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-gray-600">Quantity</div>
                  <div className="font-semibold">
                    {Number(order.filled).toFixed(0)}/{Number(order.quantity).toFixed(0)}
                  </div>
                </div>
              </div>

              {/* Progress Bar for Partial Orders */}
              {order.status === 'partial' && (
                <div className="mb-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${fillPercentage}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {fillPercentage.toFixed(0)}% filled
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-500">
                {new Date(order.createdAt).toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
