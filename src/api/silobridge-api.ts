/**
 * SiloBridge API - Enterprise verification endpoints
 * Provides consent-based data access and verification services
 */

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { body, param, query, validationResult } from 'express-validator';
import { VCIssuer, VCIssuerFactory } from '../vc-issuer';
import { VerifiableCredential } from '@veramo/core';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many verification requests, please try again later'
  }
});

app.use('/api/', limiter);

// Initialize VC Issuer
const vcIssuer = VCIssuerFactory.createFromEnv();

// Types
interface VerificationRequest {
  vcURI?: string;
  tokenId?: string;
  requiredAsset?: string;
  minAmount?: number;
  timestamp?: number;
}

interface AssertionRequest {
  userId: string;
  requester: string;
  context?: Record<string, any>;
}

interface ConsentGrant {
  userId: string;
  grantedTo: string;
  scopes: string[];
  expiresAt: number;
}

// Mock data stores (replace with real databases)
const consentStore = new Map<string, ConsentGrant[]>();
const credentialStore = new Map<string, VerifiableCredential[]>();
const pofTokenStore = new Map<string, any>(); // Mock PoF token data

// Validation middleware
const validateRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Authentication middleware (mock - replace with real auth)
const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  
  // Mock API key validation
  if (apiKey !== process.env.SILOBRIDGE_API_KEY && apiKey !== 'demo-key-123') {
    return res.status(403).json({ error: 'Invalid API key' });
  }
  
  (req as any).partnerId = apiKey;
  next();
};

// Consent checking middleware
const checkConsent = async (userId: string, requesterId: string, scope: string): Promise<boolean> => {
  const userConsents = consentStore.get(userId) || [];
  const validConsent = userConsents.find(consent => 
    consent.grantedTo === requesterId && 
    consent.scopes.includes(scope) &&
    consent.expiresAt > Date.now()
  );
  
  return !!validConsent;
};

/**
 * CORE VERIFICATION ENDPOINTS
 */

// Verify any credential or token
app.post('/api/verify',
  [
    body('vcURI').optional().isString(),
    body('tokenId').optional().isString(),
    body('requiredAsset').optional().isString(),
    body('minAmount').optional().isNumeric(),
    body('timestamp').optional().isNumeric()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { vcURI, tokenId, requiredAsset, minAmount }: VerificationRequest = req.body;
      
      let verificationResult;
      
      if (vcURI) {
        // Verify Verifiable Credential
        verificationResult = await verifyVC(vcURI, { requiredAsset, minAmount });
      } else if (tokenId) {
        // Verify PoF Token
        verificationResult = await verifyPOFToken(tokenId, { requiredAsset, minAmount });
      } else {
        return res.status(400).json({
          valid: false,
          reason: 'Either vcURI or tokenId must be provided'
        });
      }
      
      res.json(verificationResult);
    } catch (error) {
      console.error('Verification error:', error);
      res.status(500).json({
        valid: false,
        reason: error.message || 'Internal verification error'
      });
    }
  }
);

// Issue Verifiable Credential from PoF token
app.post('/api/vc/pof',
  authenticate,
  [
    body('holderDID').isString().notEmpty(),
    body('tokenId').isString().notEmpty()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { holderDID, tokenId } = req.body;
      
      // Get PoF data from token ID (mock implementation)
      const pofData = pofTokenStore.get(tokenId);
      if (!pofData) {
        return res.status(404).json({ error: 'PoF token not found' });
      }
      
      const vc = await vcIssuer.issueProofOfFunds(holderDID, pofData);
      
      res.json({
        vc,
        vcURI: `ipfs://${await storeCredentialOnIPFS(vc)}`,
        issuedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('VC issuance error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Issue KYC Credential
app.post('/api/vc/kyc',
  authenticate,
  [
    body('holderDID').isString().notEmpty(),
    body('kycData').isObject().notEmpty()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { holderDID, kycData } = req.body;
      
      const vc = await vcIssuer.issueKYCCredential(holderDID, kycData);
      
      res.json({
        vc,
        vcURI: `ipfs://${await storeCredentialOnIPFS(vc)}`,
        issuedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('KYC VC issuance error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Issue Device Attestation Credential
app.post('/api/vc/device',
  authenticate,
  [
    body('holderDID').isString().notEmpty(),
    body('deviceData').isObject().notEmpty()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { holderDID, deviceData } = req.body;
      
      const vc = await vcIssuer.issueDeviceAttestation(holderDID, deviceData);
      
      res.json({
        vc,
        vcURI: `ipfs://${await storeCredentialOnIPFS(vc)}`,
        issuedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Device VC issuance error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * ASSERTION ENDPOINTS (B2B)
 */

// Check if user has KYC
app.get('/api/assertions/hasKYC/:userId',
  authenticate,
  [param('userId').isString().notEmpty()],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { userId } = req.params;
      const requesterId = (req as any).partnerId;
      
      // Check consent
      const hasConsent = await checkConsent(userId, requesterId, 'kyc_status');
      if (!hasConsent) {
        return res.status(403).json({
          error: 'Consent required',
          consentUrl: `/consent/grant?scope=kyc_status&requester=${requesterId}`
        });
      }
      
      // Check KYC status
      const kycResult = await checkUserKYC(userId);
      
      res.json({
        assertion: 'has_kyc',
        result: kycResult.approved,
        proof: kycResult.proofURI,
        metadata: {
          kycLevel: kycResult.level,
          provider: kycResult.provider,
          verifiedAt: kycResult.verifiedAt
        },
        issuedAt: Date.now(),
        validUntil: Date.now() + (24 * 60 * 60 * 1000) // 24h validity
      });
    } catch (error) {
      console.error('KYC assertion error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Check if user has minimum balance
app.get('/api/assertions/hasBalance/:userId',
  authenticate,
  [
    param('userId').isString().notEmpty(),
    query('minAmount').isNumeric(),
    query('asset').optional().isString()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { userId } = req.params;
      const { minAmount, asset = 'USDC' } = req.query;
      const requesterId = (req as any).partnerId;
      
      // Check consent
      const hasConsent = await checkConsent(userId, requesterId, 'balance_verification');
      if (!hasConsent) {
        return res.status(403).json({
          error: 'Consent required',
          consentUrl: `/consent/grant?scope=balance_verification&requester=${requesterId}`
        });
      }
      
      // Check balance
      const balanceResult = await checkUserBalance(userId, parseFloat(minAmount as string), asset as string);
      
      res.json({
        assertion: 'has_minimum_balance',
        result: balanceResult.hasMinBalance,
        proof: balanceResult.proofURI,
        metadata: {
          asset,
          minimumAmount: minAmount,
          verifiedAt: balanceResult.verifiedAt
        },
        issuedAt: Date.now(),
        validUntil: Date.now() + (60 * 60 * 1000) // 1h validity for balance checks
      });
    } catch (error) {
      console.error('Balance assertion error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Check device compliance
app.get('/api/assertions/isDeviceCompliant/:userId',
  authenticate,
  [
    param('userId').isString().notEmpty(),
    query('requiredLevel').optional().isIn(['basic', 'enhanced', 'hardware'])
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { userId } = req.params;
      const { requiredLevel = 'basic' } = req.query;
      const requesterId = (req as any).partnerId;
      
      // Check consent
      const hasConsent = await checkConsent(userId, requesterId, 'device_attestation');
      if (!hasConsent) {
        return res.status(403).json({
          error: 'Consent required',
          consentUrl: `/consent/grant?scope=device_attestation&requester=${requesterId}`
        });
      }
      
      // Check device compliance
      const deviceResult = await checkDeviceCompliance(userId, requiredLevel as string);
      
      res.json({
        assertion: 'device_compliant',
        result: deviceResult.compliant,
        proof: deviceResult.proofURI,
        metadata: {
          requiredLevel,
          actualLevel: deviceResult.level,
          attestations: deviceResult.attestations,
          verifiedAt: deviceResult.verifiedAt
        },
        issuedAt: Date.now(),
        validUntil: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days validity
      });
    } catch (error) {
      console.error('Device assertion error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * CONSENT MANAGEMENT ENDPOINTS
 */

// Grant consent
app.post('/api/consent/grant',
  [
    body('userId').isString().notEmpty(),
    body('grantedTo').isString().notEmpty(),
    body('scopes').isArray().notEmpty(),
    body('expiresIn').optional().isNumeric()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { userId, grantedTo, scopes, expiresIn = 30 * 24 * 60 * 60 * 1000 } = req.body; // 30 days default
      
      const consent: ConsentGrant = {
        userId,
        grantedTo,
        scopes,
        expiresAt: Date.now() + expiresIn
      };
      
      const userConsents = consentStore.get(userId) || [];
      
      // Remove existing consent for this requester/scopes combo
      const filteredConsents = userConsents.filter(c => 
        !(c.grantedTo === grantedTo && scopes.some(scope => c.scopes.includes(scope)))
      );
      
      filteredConsents.push(consent);
      consentStore.set(userId, filteredConsents);
      
      res.json({
        success: true,
        consentId: `${userId}-${grantedTo}-${Date.now()}`,
        expiresAt: consent.expiresAt
      });
    } catch (error) {
      console.error('Consent grant error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Revoke consent
app.post('/api/consent/revoke',
  [
    body('userId').isString().notEmpty(),
    body('revokeFrom').isString().notEmpty(),
    body('scopes').optional().isArray()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { userId, revokeFrom, scopes } = req.body;
      
      const userConsents = consentStore.get(userId) || [];
      
      let filteredConsents;
      if (scopes) {
        // Revoke specific scopes
        filteredConsents = userConsents.filter(consent => 
          !(consent.grantedTo === revokeFrom && scopes.some(scope => consent.scopes.includes(scope)))
        );
      } else {
        // Revoke all consents for this requester
        filteredConsents = userConsents.filter(consent => consent.grantedTo !== revokeFrom);
      }
      
      consentStore.set(userId, filteredConsents);
      
      res.json({
        success: true,
        revokedAt: Date.now()
      });
    } catch (error) {
      console.error('Consent revoke error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * HELPER FUNCTIONS
 */

async function verifyVC(vcURI: string, requirements: any) {
  try {
    // Fetch VC from URI (IPFS, HTTP, etc.)
    const vc = await fetchCredentialFromURI(vcURI);
    
    // Verify signature and validity
    const verification = await vcIssuer.verifyCredential(vc);
    
    if (!verification.verified) {
      return {
        valid: false,
        reason: verification.error || 'Invalid credential'
      };
    }
    
    // Check requirements
    const requirementCheck = checkCredentialRequirements(vc, requirements);
    
    return {
      valid: requirementCheck.valid,
      reason: requirementCheck.reason,
      claims: extractCredentialClaims(vc),
      issuedBy: typeof vc.issuer === 'string' ? vc.issuer : vc.issuer.name,
      expiresAt: vc.expirationDate,
      verifiedAt: Date.now(),
      metadata: requirementCheck.metadata
    };
  } catch (error) {
    return {
      valid: false,
      reason: error.message || 'Verification failed'
    };
  }
}

async function verifyPOFToken(tokenId: string, requirements: any) {
  try {
    // Mock PoF token verification - replace with real implementation
    const pofData = pofTokenStore.get(tokenId);
    
    if (!pofData) {
      return {
        valid: false,
        reason: 'PoF token not found'
      };
    }
    
    // Check requirements
    const meetsRequirements = (!requirements.requiredAsset || pofData.asset === requirements.requiredAsset) &&
                             (!requirements.minAmount || parseFloat(pofData.amount) >= requirements.minAmount);
    
    return {
      valid: meetsRequirements && pofData.kycCompliant && pofData.sanctionsCleared,
      reason: meetsRequirements ? undefined : 'Requirements not met',
      claims: [`Holds ${pofData.amount} ${pofData.asset}`, 'KYC Compliant', 'Sanctions Cleared'],
      issuedBy: 'UnyKorn PoF Service',
      expiresAt: new Date(pofData.expiry * 1000).toISOString(),
      verifiedAt: Date.now(),
      metadata: {
        amount: pofData.amount,
        currency: pofData.asset,
        tokenId
      }
    };
  } catch (error) {
    return {
      valid: false,
      reason: error.message || 'Token verification failed'
    };
  }
}

// Mock helper functions (replace with real implementations)
async function fetchCredentialFromURI(uri: string): Promise<VerifiableCredential> {
  // Mock implementation - replace with real IPFS/HTTP fetching
  if (uri.startsWith('ipfs://')) {
    const hash = uri.replace('ipfs://', '');
    // Fetch from IPFS
    return {} as VerifiableCredential;
  }
  
  throw new Error('Unsupported credential URI scheme');
}

function checkCredentialRequirements(vc: VerifiableCredential, requirements: any) {
  // Mock requirement checking
  return {
    valid: true,
    metadata: {}
  };
}

function extractCredentialClaims(vc: VerifiableCredential): string[] {
  // Extract human-readable claims from VC
  const claims: string[] = [];
  
  if (vc.type.includes('ProofOfFundsCredential')) {
    const subject = vc.credentialSubject as any;
    claims.push(`Verified funds: ${subject.hasAsset?.minimumAmount} ${subject.hasAsset?.currency}`);
  }
  
  if (vc.type.includes('KYCCredential')) {
    claims.push('KYC Approved');
  }
  
  if (vc.type.includes('DeviceAttestationCredential')) {
    claims.push('Device Verified');
  }
  
  return claims;
}

async function storeCredentialOnIPFS(vc: VerifiableCredential): Promise<string> {
  // Mock IPFS storage - replace with real implementation
  return `Qm${Math.random().toString(36).substring(2, 48)}`;
}

async function checkUserKYC(userId: string) {
  // Mock KYC check
  return {
    approved: true,
    level: 'standard',
    provider: 'UnyKorn KYC',
    verifiedAt: Date.now(),
    proofURI: 'ipfs://QmKYC...'
  };
}

async function checkUserBalance(userId: string, minAmount: number, asset: string) {
  // Mock balance check
  return {
    hasMinBalance: true,
    verifiedAt: Date.now(),
    proofURI: 'ipfs://QmBalance...'
  };
}

async function checkDeviceCompliance(userId: string, requiredLevel: string) {
  // Mock device compliance check
  return {
    compliant: true,
    level: 'enhanced',
    attestations: ['bootloader_locked', 'no_root', 'biometric_enabled'],
    verifiedAt: Date.now(),
    proofURI: 'ipfs://QmDevice...'
  };
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    version: '1.0.0'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SiloBridge API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

export default app;