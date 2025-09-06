/**
 * SiloProofCheck React Component
 * Verifies Verifiable Credentials and Proof of Funds tokens
 */

import React, { useState, useEffect, useCallback } from 'react';
import { VerifiableCredential } from '../vc-issuer';

// Types
interface VerificationResult {
  valid: boolean;
  reason?: string;
  claims?: string[];
  issuedBy?: string;
  expiresAt?: string;
  verifiedAt: number;
  metadata?: Record<string, any>;
}

interface SiloProofCheckProps {
  vcURI?: string;
  tokenId?: string;
  requiredAsset?: string;
  minAmount?: number;
  className?: string;
  onVerified?: (result: VerificationResult) => void;
  onError?: (error: Error) => void;
  apiEndpoint?: string;
  showDetails?: boolean;
  autoVerify?: boolean;
}

// Icons (using simple SVG for portability)
const CheckIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20" width="20" height="20">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

const XIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20" width="20" height="20">
    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

const Spinner: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24" width="20" height="20">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const InfoIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20" width="16" height="16">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
  </svg>
);

// Utility functions
const formatAmount = (amount: number | string, currency = 'USD'): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === 'USDC' ? 'USD' : currency,
    minimumFractionDigits: currency === 'USD' ? 2 : 6
  }).format(num);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Main component
export const SiloProofCheck: React.FC<SiloProofCheckProps> = ({
  vcURI,
  tokenId,
  requiredAsset,
  minAmount,
  className = "",
  onVerified,
  onError,
  apiEndpoint = '/api/verify',
  showDetails = true,
  autoVerify = true
}) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'valid' | 'invalid'>('idle');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verify = useCallback(async () => {
    if (!vcURI && !tokenId) {
      setError('Either vcURI or tokenId must be provided');
      setStatus('invalid');
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      const requestBody = {
        vcURI,
        tokenId,
        requiredAsset,
        minAmount,
        timestamp: Date.now()
      };

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Verification failed: ${response.status} ${response.statusText}`);
      }

      const verificationResult: VerificationResult = await response.json();
      
      setResult(verificationResult);
      setStatus(verificationResult.valid ? 'valid' : 'invalid');
      
      if (onVerified) {
        onVerified(verificationResult);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown verification error';
      setError(errorMessage);
      setStatus('invalid');
      
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage));
      }
    }
  }, [vcURI, tokenId, requiredAsset, minAmount, apiEndpoint, onVerified, onError]);

  // Auto-verify when component mounts or props change
  useEffect(() => {
    if (autoVerify && (vcURI || tokenId)) {
      verify();
    }
  }, [autoVerify, verify]);

  // Render helpers
  const renderLoadingState = () => (
    <div className="flex items-center space-x-2 text-blue-600">
      <Spinner />
      <span className="text-sm">Verifying credentials...</span>
    </div>
  );

  const renderValidState = () => (
    <div className="space-y-2">
      <div className="flex items-center space-x-2 text-green-600">
        <CheckIcon className="text-green-500" />
        <span className="text-sm font-medium">Verification Successful</span>
      </div>
      
      {showDetails && result && (
        <div className="space-y-1 text-xs text-gray-600">
          {result.claims && result.claims.length > 0 && (
            <div>
              <strong>Claims:</strong> {result.claims.join(', ')}
            </div>
          )}
          
          {result.issuedBy && (
            <div>
              <strong>Issued by:</strong> {result.issuedBy}
            </div>
          )}
          
          {result.expiresAt && (
            <div>
              <strong>Expires:</strong> {formatDate(result.expiresAt)}
            </div>
          )}
          
          {result.metadata?.amount && (
            <div>
              <strong>Verified Amount:</strong> {formatAmount(result.metadata.amount, result.metadata.currency)}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderInvalidState = () => (
    <div className="space-y-2">
      <div className="flex items-center space-x-2 text-red-600">
        <XIcon className="text-red-500" />
        <span className="text-sm font-medium">Verification Failed</span>
      </div>
      
      <div className="text-xs text-red-600">
        {error || result?.reason || 'Unknown verification error'}
      </div>
      
      {showDetails && (
        <button
          onClick={verify}
          className="text-xs text-blue-600 hover:text-blue-800 underline"
        >
          Try again
        </button>
      )}
    </div>
  );

  const renderIdleState = () => (
    <div className="flex items-center space-x-2">
      <button
        onClick={verify}
        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        disabled={!vcURI && !tokenId}
      >
        Verify Credentials
      </button>
      
      {!vcURI && !tokenId && (
        <div className="flex items-center space-x-1 text-amber-600">
          <InfoIcon className="text-amber-500" />
          <span className="text-xs">No credentials provided</span>
        </div>
      )}
    </div>
  );

  // Main render
  const baseClasses = "p-3 border rounded-lg transition-colors duration-200";
  const statusClasses = {
    idle: "border-gray-200 bg-gray-50",
    loading: "border-blue-200 bg-blue-50",
    valid: "border-green-200 bg-green-50",
    invalid: "border-red-200 bg-red-50"
  };

  return (
    <div className={`silo-proof-check ${baseClasses} ${statusClasses[status]} ${className}`}>
      {status === 'loading' && renderLoadingState()}
      {status === 'valid' && renderValidState()}
      {status === 'invalid' && renderInvalidState()}
      {status === 'idle' && renderIdleState()}
    </div>
  );
};

// Higher-order component for specific use cases
export const ProofOfFundsChecker: React.FC<{
  tokenId: string;
  requiredAmount: number;
  requiredAsset?: string;
  onVerified?: (result: VerificationResult) => void;
}> = ({ tokenId, requiredAmount, requiredAsset = 'USDC', onVerified }) => (
  <SiloProofCheck
    tokenId={tokenId}
    requiredAsset={requiredAsset}
    minAmount={requiredAmount}
    onVerified={onVerified}
    className="proof-of-funds-checker"
  />
);

export const KYCStatusChecker: React.FC<{
  vcURI: string;
  onVerified?: (result: VerificationResult) => void;
}> = ({ vcURI, onVerified }) => (
  <SiloProofCheck
    vcURI={vcURI}
    onVerified={onVerified}
    className="kyc-status-checker"
  />
);

export const DeviceAttestationChecker: React.FC<{
  vcURI: string;
  requiredSecurityLevel?: 'basic' | 'enhanced' | 'hardware';
  onVerified?: (result: VerificationResult) => void;
}> = ({ vcURI, requiredSecurityLevel, onVerified }) => (
  <SiloProofCheck
    vcURI={vcURI}
    onVerified={onVerified}
    className="device-attestation-checker"
  />
);

// Demo component that shows multiple verification types
export const SiloProofDemo: React.FC<{
  pofTokenId?: string;
  kycVCURI?: string;
  deviceVCURI?: string;
}> = ({ pofTokenId, kycVCURI, deviceVCURI }) => {
  const [verificationResults, setVerificationResults] = useState<Record<string, VerificationResult>>({});

  const handleVerification = (type: string) => (result: VerificationResult) => {
    setVerificationResults(prev => ({
      ...prev,
      [type]: result
    }));
  };

  return (
    <div className="space-y-4 p-4 max-w-2xl">
      <h3 className="text-lg font-semibold text-gray-900">SiloProof Verification Demo</h3>
      
      {pofTokenId && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Proof of Funds</h4>
          <ProofOfFundsChecker
            tokenId={pofTokenId}
            requiredAmount={10000}
            requiredAsset="USDC"
            onVerified={handleVerification('pof')}
          />
        </div>
      )}
      
      {kycVCURI && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">KYC Status</h4>
          <KYCStatusChecker
            vcURI={kycVCURI}
            onVerified={handleVerification('kyc')}
          />
        </div>
      )}
      
      {deviceVCURI && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Device Attestation</h4>
          <DeviceAttestationChecker
            vcURI={deviceVCURI}
            requiredSecurityLevel="enhanced"
            onVerified={handleVerification('device')}
          />
        </div>
      )}
      
      {Object.keys(verificationResults).length > 0 && (
        <div className="mt-6 p-3 bg-gray-100 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Verification Summary</h4>
          {Object.entries(verificationResults).map(([type, result]) => (
            <div key={type} className="flex items-center space-x-2 text-xs">
              {result.valid ? (
                <CheckIcon className="text-green-500" />
              ) : (
                <XIcon className="text-red-500" />
              )}
              <span className="capitalize">{type}</span>
              <span className={result.valid ? 'text-green-600' : 'text-red-600'}>
                {result.valid ? 'Verified' : 'Failed'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SiloProofCheck;