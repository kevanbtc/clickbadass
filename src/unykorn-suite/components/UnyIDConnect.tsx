/**
 * UnyID Connect - Universal Web3 Authentication Widget
 * One component that handles all identity/verification needs
 * Much simpler than managing 20+ SiloCloud apps
 */

import React, { useState, useEffect, useCallback } from 'react';

// Types
interface UnyIDProfile {
  did: string;
  username: string;
  displayName: string;
  avatar?: string;
  trustScore: number;
  verifications: {
    email: boolean;
    phone: boolean;
    identity: boolean;
    address: boolean;
    income: boolean;
    employment: boolean;
  };
}

interface UnyIDConnectProps {
  apiEndpoint?: string;
  requiredVerifications?: string[];
  minTrustScore?: number;
  onAuthenticated?: (profile: UnyIDProfile, token: string) => void;
  onError?: (error: Error) => void;
  className?: string;
  showTrustScore?: boolean;
  allowRegistration?: boolean;
}

// Icons
const UnyKornIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L15.09 8.26L22 9L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9L8.91 8.26L12 2Z"/>
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

const XIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

const LoadingSpinner: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

// Main Component
export const UnyIDConnect: React.FC<UnyIDConnectProps> = ({
  apiEndpoint = '/api/unyid',
  requiredVerifications = [],
  minTrustScore = 0,
  onAuthenticated,
  onError,
  className = "",
  showTrustScore = true,
  allowRegistration = true
}) => {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'authenticated' | 'registering'>('idle');
  const [profile, setProfile] = useState<UnyIDProfile | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRegistration, setShowRegistration] = useState(false);

  // Registration form state
  const [registrationData, setRegistrationData] = useState({
    username: '',
    displayName: '',
    email: ''
  });

  /**
   * Connect to existing UnyID
   */
  const connectUnyID = useCallback(async (identifier: string) => {
    setStatus('connecting');
    setError(null);

    try {
      const response = await fetch(`${apiEndpoint}/auth/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier })
      });

      if (!response.ok) {
        throw new Error(`Connection failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Check if profile meets requirements
      if (minTrustScore > 0 && data.profile.trustScore < minTrustScore) {
        throw new Error(`Trust score too low: ${data.profile.trustScore} < ${minTrustScore}`);
      }

      if (requiredVerifications.length > 0) {
        const missingVerifications = requiredVerifications.filter(
          verification => !data.profile.verifications[verification]
        );
        if (missingVerifications.length > 0) {
          throw new Error(`Missing verifications: ${missingVerifications.join(', ')}`);
        }
      }

      setProfile(data.profile);
      setAuthToken(data.token);
      setStatus('authenticated');

      if (onAuthenticated) {
        onAuthenticated(data.profile, data.token);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown connection error';
      setError(errorMessage);
      setStatus('idle');
      
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage));
      }
    }
  }, [apiEndpoint, minTrustScore, requiredVerifications, onAuthenticated, onError]);

  /**
   * Register new UnyID
   */
  const registerUnyID = useCallback(async () => {
    setStatus('registering');
    setError(null);

    try {
      const response = await fetch(`${apiEndpoint}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData)
      });

      if (!response.ok) {
        throw new Error(`Registration failed: ${response.statusText}`);
      }

      const data = await response.json();
      setProfile(data.profile);
      setAuthToken(data.token);
      setStatus('authenticated');
      setShowRegistration(false);

      if (onAuthenticated) {
        onAuthenticated(data.profile, data.token);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown registration error';
      setError(errorMessage);
      setStatus('idle');
      
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage));
      }
    }
  }, [apiEndpoint, registrationData, onAuthenticated, onError]);

  /**
   * Disconnect UnyID
   */
  const disconnect = useCallback(() => {
    setProfile(null);
    setAuthToken(null);
    setStatus('idle');
    setError(null);
    setShowRegistration(false);
  }, []);

  /**
   * Get verification badge color
   */
  const getVerificationColor = (verified: boolean) => {
    return verified ? 'text-green-500' : 'text-gray-400';
  };

  /**
   * Get trust score color
   */
  const getTrustScoreColor = (score: number) => {
    if (score >= 800) return 'text-green-500';
    if (score >= 600) return 'text-yellow-500';
    if (score >= 400) return 'text-orange-500';
    return 'text-red-500';
  };

  // Render states
  const renderIdleState = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-center space-x-2 text-gray-600">
        <UnyKornIcon className="w-6 h-6" />
        <span className="font-semibold">Connect with UnyID</span>
      </div>
      
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Username or DID"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              connectUnyID(e.currentTarget.value);
            }
          }}
        />
        
        <button
          onClick={() => {
            const input = document.querySelector('input') as HTMLInputElement;
            if (input?.value) {
              connectUnyID(input.value);
            }
          }}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Connect
        </button>

        {allowRegistration && (
          <button
            onClick={() => setShowRegistration(true)}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Create New UnyID
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2 text-red-700">
            <XIcon className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}
    </div>
  );

  const renderConnectingState = () => (
    <div className="flex items-center justify-center space-x-3 py-4">
      <LoadingSpinner className="w-5 h-5 text-blue-600" />
      <span className="text-gray-600">Connecting to UnyID...</span>
    </div>
  );

  const renderRegistrationForm = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Create UnyID</h3>
        <button
          onClick={() => setShowRegistration(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>
      
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Username"
          value={registrationData.username}
          onChange={(e) => setRegistrationData(prev => ({ ...prev, username: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        
        <input
          type="text"
          placeholder="Display Name"
          value={registrationData.displayName}
          onChange={(e) => setRegistrationData(prev => ({ ...prev, displayName: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        
        <input
          type="email"
          placeholder="Email (optional)"
          value={registrationData.email}
          onChange={(e) => setRegistrationData(prev => ({ ...prev, email: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        <button
          onClick={registerUnyID}
          disabled={status === 'registering' || !registrationData.username || !registrationData.displayName}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {status === 'registering' ? 'Creating...' : 'Create UnyID'}
        </button>
      </div>
    </div>
  );

  const renderAuthenticatedState = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <span className="text-white font-semibold">
            {profile?.displayName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1">
          <div className="font-semibold text-gray-900">{profile?.displayName}</div>
          <div className="text-sm text-gray-500">@{profile?.username}</div>
        </div>
        <button
          onClick={disconnect}
          className="text-gray-400 hover:text-gray-600"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>

      {showTrustScore && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-600">Trust Score</span>
          <span className={`font-semibold ${getTrustScoreColor(profile?.trustScore || 0)}`}>
            {profile?.trustScore}/1000
          </span>
        </div>
      )}

      {profile && Object.keys(profile.verifications).length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">Verifications</div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(profile.verifications).map(([type, verified]) => (
              <div key={type} className="flex items-center space-x-2">
                <CheckIcon className={`w-4 h-4 ${getVerificationColor(verified)}`} />
                <span className={`text-xs capitalize ${getVerificationColor(verified)}`}>
                  {type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="text-sm text-green-800">
          <strong>✅ Authenticated</strong><br />
          Ready to use across all UnyKorn apps
        </div>
      </div>
    </div>
  );

  // Main render
  const baseClasses = "p-6 border rounded-xl shadow-sm bg-white transition-all duration-200";
  const statusClasses = {
    idle: "border-gray-200",
    connecting: "border-blue-200 bg-blue-50",
    authenticated: "border-green-200 bg-green-50",
    registering: "border-yellow-200 bg-yellow-50"
  };

  return (
    <div className={`unyid-connect ${baseClasses} ${statusClasses[status]} ${className}`}>
      {showRegistration ? renderRegistrationForm() :
       status === 'connecting' || status === 'registering' ? renderConnectingState() :
       status === 'authenticated' ? renderAuthenticatedState() :
       renderIdleState()}
    </div>
  );
};

// Higher-order components for specific use cases
export const UnyIDGate: React.FC<{
  children: React.ReactNode;
  requiredVerifications?: string[];
  minTrustScore?: number;
  fallback?: React.ReactNode;
}> = ({ children, requiredVerifications, minTrustScore, fallback }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return isAuthenticated ? (
    <>{children}</>
  ) : (
    fallback || <UnyIDConnect 
      requiredVerifications={requiredVerifications}
      minTrustScore={minTrustScore}
      onAuthenticated={() => setIsAuthenticated(true)}
    />
  );
};

export const UnyIDTrustBadge: React.FC<{
  username: string;
  showScore?: boolean;
  apiEndpoint?: string;
}> = ({ username, showScore = true, apiEndpoint = '/api/unyid' }) => {
  const [profile, setProfile] = useState<Partial<UnyIDProfile> | null>(null);

  useEffect(() => {
    fetch(`${apiEndpoint}/profile/${username}`)
      .then(res => res.json())
      .then(data => setProfile(data))
      .catch(() => setProfile(null));
  }, [username, apiEndpoint]);

  if (!profile) return null;

  const getTrustScoreColor = (score: number) => {
    if (score >= 800) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 600) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (score >= 400) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  return (
    <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getTrustScoreColor(profile.trustScore || 0)}`}>
      <UnyKornIcon className="w-3 h-3" />
      <span>Verified</span>
      {showScore && <span>({profile.trustScore})</span>}
    </div>
  );
};

export default UnyIDConnect;