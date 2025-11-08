'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { ArrowLeft, Plus, X, AlertCircle } from 'lucide-react';

interface Option {
  id: string;
  text: string;
}

export default function CreateMarketPage() {
  const router = useRouter();
  const [marketType, setMarketType] = useState<'single' | 'multiple'>('single');
  const [formData, setFormData] = useState({
    question: '',
    description: '',
    category: 'Crypto',
    thumbnail: '💰', // Default emoji
    endDate: '',
    yesPrice: 0.5,
    noPrice: 0.5
  });
  const [options, setOptions] = useState<Option[]>([
    { id: '1', text: '' },
    { id: '2', text: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [charCounts, setCharCounts] = useState({
    question: 0,
    description: 0
  });

  const categories = ['Crypto', 'Technology', 'Space', 'Politics', 'Entertainment', 'Sports', 'Climate'];

  const MAX_CHARS = {
    question: 100,
    option: 50,
    description: 500
  };

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, { id: Date.now().toString(), text: '' }]);
    }
  };

  const removeOption = (id: string) => {
    if (options.length > 2) {
      setOptions(options.filter(opt => opt.id !== id));
    }
  };

  const updateOption = (id: string, text: string) => {
    if (text.length <= MAX_CHARS.option) {
      setOptions(options.map(opt => opt.id === id ? { ...opt, text } : opt));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validation
      if (formData.question.length > MAX_CHARS.question) {
        throw new Error(`Question must be ${MAX_CHARS.question} characters or less`);
      }
      if (formData.description.length > MAX_CHARS.description) {
        throw new Error(`Description must be ${MAX_CHARS.description} characters or less`);
      }

      let payload;

      if (marketType === 'single') {
        // Single market
        payload = {
          type: 'single',
          title: formData.question,
          description: formData.description,
          category: formData.category,
          endDate: formData.endDate,
          yesPrice: formData.yesPrice,
          noPrice: formData.noPrice
        };
      } else {
        // Multi-option market
        const validOptions = options.filter(opt => opt.text.trim() !== '');
        if (validOptions.length < 2) {
          throw new Error('Please add at least 2 options');
        }

        payload = {
          type: 'multiple',
          question: formData.question,
          description: formData.description,
          category: formData.category,
          thumbnail: formData.thumbnail,
          endDate: formData.endDate,
          options: validOptions.map(opt => ({
            text: opt.text,
            yesPrice: formData.yesPrice,
            noPrice: formData.noPrice
          }))
        };
      }

      const response = await fetch('/api/markets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create market');
      }

      router.push('/admin');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.push('/admin')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Admin
        </button>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Create New Market</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Market Type Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Market Type
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setMarketType('single')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    marketType === 'single'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-semibold text-gray-900">Single Market</div>
                  <div className="text-sm text-gray-600 mt-1">One yes/no question</div>
                </button>
                <button
                  type="button"
                  onClick={() => setMarketType('multiple')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    marketType === 'multiple'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-semibold text-gray-900">Multi-Option</div>
                  <div className="text-sm text-gray-600 mt-1">Multiple choice options</div>
                </button>
              </div>
            </div>

            {/* Question */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {marketType === 'single' ? 'Market Question' : 'Main Question'}
              </label>
              <input
                type="text"
                value={formData.question}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= MAX_CHARS.question) {
                    setFormData({ ...formData, question: value });
                    setCharCounts({ ...charCounts, question: value.length });
                  }
                }}
                placeholder={marketType === 'single' 
                  ? "Will Bitcoin reach $100,000 by end of 2025?"
                  : "By when will Bitcoin reach $150,000?"
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <div className="text-xs text-gray-500 mt-1 text-right">
                {charCounts.question}/{MAX_CHARS.question} characters
              </div>
            </div>

            {/* Thumbnail (multi-option only) */}
            {marketType === 'multiple' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Thumbnail Emoji
                </label>
                <input
                  type="text"
                  value={formData.thumbnail}
                  onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                  placeholder="💰"
                  maxLength={2}
                  className="w-24 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-2xl text-center"
                />
                <p className="text-xs text-gray-500 mt-1">Choose an emoji or icon</p>
              </div>
            )}

            {/* Options (multi-option only) */}
            {marketType === 'multiple' && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-semibold text-gray-700">
                    Options ({options.length})
                  </label>
                  <button
                    type="button"
                    onClick={addOption}
                    disabled={options.length >= 10}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
                  >
                    <Plus className="w-4 h-4" />
                    Add Option
                  </button>
                </div>
                <div className="space-y-3">
                  {options.map((option, index) => (
                    <div key={option.id} className="flex gap-2">
                      <input
                        type="text"
                        value={option.text}
                        onChange={(e) => updateOption(option.id, e.target.value)}
                        placeholder={`Option ${index + 1} (e.g., "Before January 2026")`}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                      <div className="text-xs text-gray-500 flex items-center px-2">
                        {option.text.length}/{MAX_CHARS.option}
                      </div>
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(option.id)}
                          className="p-3 text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= MAX_CHARS.description) {
                    setFormData({ ...formData, description: value });
                    setCharCounts({ ...charCounts, description: value.length });
                  }
                }}
                placeholder="Detailed description of how this market will be resolved..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <div className="text-xs text-gray-500 mt-1 text-right">
                {charCounts.description}/{MAX_CHARS.description} characters
              </div>
            </div>

            {/* Category and End Date */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Initial Prices */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Initial YES Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="0.99"
                  value={formData.yesPrice}
                  onChange={(e) => {
                    const yesPrice = parseFloat(e.target.value);
                    setFormData({ 
                      ...formData, 
                      yesPrice,
                      noPrice: 1 - yesPrice
                    });
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Initial NO Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.noPrice}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-calculated (YES + NO = 1)</p>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.push('/admin')}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition"
              >
                {loading ? 'Creating...' : `Create ${marketType === 'single' ? 'Market' : 'Markets'}`}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
