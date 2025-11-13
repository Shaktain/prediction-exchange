// components/UsernameModal.tsx
'use client';
import { useState, useEffect } from 'react';
import { X, Check, AlertCircle, Loader2 } from 'lucide-react';

interface UsernameModalProps {
  isOpen: boolean;
  walletAddress: string;
  onComplete: (username: string) => void;
  onClose?: () => void; // Add optional close handler
}

export default function UsernameModal({ isOpen, walletAddress, onComplete, onClose }: UsernameModalProps) {
  const [username, setUsername] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounced username check
  useEffect(() => {
    if (!username || username.length < 3) {
      setIsAvailable(null);
      setError(null);
      return;
    }

    const delayCheck = setTimeout(async () => {
      await checkUsername(username);
    }, 500);

    return () => clearTimeout(delayCheck);
  }, [username]);

  const checkUsername = async (usernameToCheck: string) => {
    setIsChecking(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/username?username=${encodeURIComponent(usernameToCheck)}`);
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setIsAvailable(false);
      } else {
        setIsAvailable(data.available);
        if (!data.available) {
          setError('Username is already taken');
        }
      }
    } catch (err) {
      console.error('Error checking username:', err);
      setError('Failed to check username availability');
      setIsAvailable(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAvailable || !username) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/users/username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, username })
      });

      const data = await response.json();

      if (data.success) {
        // Immediately call onComplete and close - don't wait for anything
        onComplete(username);
      } else {
        setError(data.error || 'Failed to set username');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('Error setting username:', err);
      setError('Failed to set username. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (onClose && !isSubmitting) {
      onClose();
    }
  };

  const getInputBorderColor = () => {
    if (!username || username.length < 3) return 'border-gray-300';
    if (isChecking) return 'border-yellow-500';
    if (error) return 'border-red-500';
    if (isAvailable) return 'border-green-500';
    return 'border-gray-300';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative">
        {/* Close button - only show if onClose is provided and not submitting */}
        {onClose && !isSubmitting && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">👋</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to PredictEx!
          </h2>
          <p className="text-gray-600">
            Choose a unique username to get started
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-2">
              Username
            </label>
            <div className="relative">
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="Enter username..."
                className={`w-full px-4 py-3 pr-12 border-2 ${getInputBorderColor()} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                maxLength={30}
                disabled={isSubmitting}
                autoFocus
              />
              
              {/* Status Icon */}
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {isChecking && (
                  <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />
                )}
                {!isChecking && isAvailable === true && (
                  <Check className="w-5 h-5 text-green-500" />
                )}
                {!isChecking && error && (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
              </div>
            </div>

            {/* Helper Text */}
            <p className="text-xs text-gray-500 mt-2">
              3-30 characters • Letters, numbers, and underscores only
            </p>

            {/* Error Message */}
            {error && (
              <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {isAvailable && !error && username.length >= 3 && (
              <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                <Check className="w-4 h-4" />
                <span>Username is available!</span>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isAvailable || isSubmitting || isChecking}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating Account...
              </>
            ) : (
              <>
                Continue
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        {onClose && (
          <p className="text-xs text-gray-500 text-center mt-6">
            You can change your username later in settings
          </p>
        )}
      </div>
    </div>
  );
}
