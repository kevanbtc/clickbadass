/**
 * UnyKorn Identity (UnyID) - Universal Trust Layer
 * Single sign-on + verifiable credentials for Web3
 * Built on proven UPoF V2 foundation
 */

import { ethers } from 'ethers';
import { VCIssuer, POFData } from '../../vc-issuer';

export interface UnyIDProfile {
  did: string;
  address: string;
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
  credentials: VerifiableCredential[];
  devices: DeviceAttestation[];
  createdAt: number;
  lastActive: number;
}

export interface DeviceAttestation {
  deviceId: string;
  platform: 'ios' | 'android' | 'web' | 'desktop';
  securityLevel: 'basic' | 'enhanced' | 'hardware';
  attestedAt: number;
  expiresAt: number;
  metadata: {
    os: string;
    browser?: string;
    isJailbroken: boolean;
    hasScreenLock: boolean;
    biometricsEnabled: boolean;
  };
}

export interface TrustScoreFactors {
  verificationCount: number;      // +10 per verification
  accountAge: number;             // +1 per month
  transactionHistory: number;     // +5 per successful transaction  
  communityVouches: number;       // +15 per vouch from trusted user
  complianceScore: number;        // KYC/AML compliance (0-100)
  deviceSecurity: number;         // Device attestation score (0-100)
}

export class UnyID {
  private vcIssuer: VCIssuer;
  private profiles: Map<string, UnyIDProfile> = new Map();
  
  constructor(vcIssuerConfig: any) {
    this.vcIssuer = new VCIssuer(vcIssuerConfig);
  }

  /**
   * Create a new UnyID profile
   */
  async createProfile(
    address: string,
    username: string,
    displayName: string
  ): Promise<UnyIDProfile> {
    const did = `did:ethr:${address}`;
    
    // Check if username is available
    if (this.isUsernameTaken(username)) {
      throw new Error('Username already taken');
    }

    const profile: UnyIDProfile = {
      did,
      address: address.toLowerCase(),
      username,
      displayName,
      trustScore: 0,
      verifications: {
        email: false,
        phone: false,
        identity: false,
        address: false,
        income: false,
        employment: false
      },
      credentials: [],
      devices: [],
      createdAt: Date.now(),
      lastActive: Date.now()
    };

    this.profiles.set(did, profile);
    this.profiles.set(username, profile); // Allow lookup by username
    
    return profile;
  }

  /**
   * Add proof of funds to profile
   */
  async addProofOfFunds(
    userDID: string,
    pofData: POFData
  ): Promise<void> {
    const profile = this.profiles.get(userDID);
    if (!profile) {
      throw new Error('Profile not found');
    }

    // Issue VC for proof of funds
    const vc = await this.vcIssuer.issueProofOfFunds(userDID, pofData);
    profile.credentials.push(vc);
    
    // Update verifications
    profile.verifications.income = true;
    if (pofData.kycCompliant) {
      profile.verifications.identity = true;
    }

    // Recalculate trust score
    profile.trustScore = this.calculateTrustScore(profile);
    profile.lastActive = Date.now();
  }

  /**
   * Add device attestation
   */
  async addDeviceAttestation(
    userDID: string,
    deviceData: {
      deviceId: string;
      platform: 'ios' | 'android' | 'web' | 'desktop';
      attestationData: any;
    }
  ): Promise<void> {
    const profile = this.profiles.get(userDID);
    if (!profile) {
      throw new Error('Profile not found');
    }

    // Verify device attestation based on platform
    const securityLevel = await this.verifyDeviceAttestation(
      deviceData.platform,
      deviceData.attestationData
    );

    const attestation: DeviceAttestation = {
      deviceId: deviceData.deviceId,
      platform: deviceData.platform,
      securityLevel,
      attestedAt: Date.now(),
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 1 week
      metadata: this.extractDeviceMetadata(deviceData.attestationData)
    };

    // Remove old attestation for same device
    profile.devices = profile.devices.filter(d => d.deviceId !== deviceData.deviceId);
    profile.devices.push(attestation);

    // Issue VC for device attestation
    const vc = await this.vcIssuer.issueDeviceAttestation(userDID, {
      deviceId: deviceData.deviceId,
      platform: deviceData.platform,
      securityLevel,
      attestations: [JSON.stringify(attestation)],
      verifiedAt: Math.floor(Date.now() / 1000)
    });
    
    profile.credentials.push(vc);
    profile.trustScore = this.calculateTrustScore(profile);
    profile.lastActive = Date.now();
  }

  /**
   * Verify identity with external KYC provider
   */
  async verifyIdentity(
    userDID: string,
    kycData: {
      provider: string;
      level: string;
      approved: boolean;
      userId: string;
      verifiedAt: number;
    }
  ): Promise<void> {
    const profile = this.profiles.get(userDID);
    if (!profile) {
      throw new Error('Profile not found');
    }

    // Issue KYC credential
    const vc = await this.vcIssuer.issueKYCCredential(userDID, kycData);
    profile.credentials.push(vc);
    
    // Update verifications
    profile.verifications.identity = kycData.approved;
    if (kycData.approved) {
      profile.trustScore = this.calculateTrustScore(profile);
    }
    
    profile.lastActive = Date.now();
  }

  /**
   * Generate authentication token for cross-platform use
   */
  async generateAuthToken(
    userDID: string,
    domain: string,
    expiryHours: number = 24
  ): Promise<{
    token: string;
    expiresAt: number;
    profile: Partial<UnyIDProfile>;
  }> {
    const profile = this.profiles.get(userDID);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const expiresAt = Date.now() + (expiryHours * 60 * 60 * 1000);
    
    // Create JWT-like token with verifiable credentials
    const tokenData = {
      did: profile.did,
      username: profile.username,
      trustScore: profile.trustScore,
      verifications: profile.verifications,
      domain,
      iat: Date.now(),
      exp: expiresAt
    };

    // Sign with user's private key (in real implementation, use secure signing)
    const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');
    
    return {
      token,
      expiresAt,
      profile: {
        did: profile.did,
        username: profile.username,
        displayName: profile.displayName,
        avatar: profile.avatar,
        trustScore: profile.trustScore,
        verifications: profile.verifications
      }
    };
  }

  /**
   * Verify authentication token
   */
  async verifyAuthToken(token: string): Promise<{
    valid: boolean;
    profile?: Partial<UnyIDProfile>;
    error?: string;
  }> {
    try {
      const tokenData = JSON.parse(Buffer.from(token, 'base64').toString());
      
      if (tokenData.exp < Date.now()) {
        return { valid: false, error: 'Token expired' };
      }

      const profile = this.profiles.get(tokenData.did);
      if (!profile) {
        return { valid: false, error: 'Profile not found' };
      }

      // In real implementation, verify signature
      return {
        valid: true,
        profile: {
          did: profile.did,
          username: profile.username,
          displayName: profile.displayName,
          trustScore: profile.trustScore,
          verifications: profile.verifications
        }
      };
    } catch (error) {
      return { valid: false, error: 'Invalid token format' };
    }
  }

  /**
   * Get profile by DID or username
   */
  getProfile(identifier: string): UnyIDProfile | null {
    return this.profiles.get(identifier) || null;
  }

  /**
   * Search profiles by criteria
   */
  searchProfiles(criteria: {
    minTrustScore?: number;
    verifications?: string[];
    createdAfter?: number;
  }): UnyIDProfile[] {
    const profiles = Array.from(this.profiles.values())
      .filter(p => p.did) // Only actual profiles, not username mappings
      .filter(profile => {
        if (criteria.minTrustScore && profile.trustScore < criteria.minTrustScore) {
          return false;
        }
        
        if (criteria.verifications) {
          const hasAllVerifications = criteria.verifications.every(
            verification => profile.verifications[verification]
          );
          if (!hasAllVerifications) return false;
        }
        
        if (criteria.createdAfter && profile.createdAt < criteria.createdAfter) {
          return false;
        }
        
        return true;
      });

    return profiles;
  }

  /**
   * Calculate trust score based on various factors
   */
  private calculateTrustScore(profile: UnyIDProfile): number {
    const factors: TrustScoreFactors = {
      verificationCount: Object.values(profile.verifications).filter(Boolean).length,
      accountAge: Math.floor((Date.now() - profile.createdAt) / (30 * 24 * 60 * 60 * 1000)),
      transactionHistory: 0, // Would be calculated from actual transaction data
      communityVouches: 0,   // Would be calculated from vouch system
      complianceScore: profile.verifications.identity ? 100 : 0,
      deviceSecurity: this.calculateDeviceSecurityScore(profile.devices)
    };

    const score = Math.min(1000, 
      factors.verificationCount * 10 +
      factors.accountAge * 1 +
      factors.transactionHistory * 5 +
      factors.communityVouches * 15 +
      factors.complianceScore * 2 +
      factors.deviceSecurity * 1
    );

    return Math.round(score);
  }

  /**
   * Calculate device security score
   */
  private calculateDeviceSecurityScore(devices: DeviceAttestation[]): number {
    if (devices.length === 0) return 0;
    
    const activeDevices = devices.filter(d => d.expiresAt > Date.now());
    if (activeDevices.length === 0) return 0;

    const avgSecurityLevel = activeDevices.reduce((sum, device) => {
      const levelScore = device.securityLevel === 'hardware' ? 100 :
                        device.securityLevel === 'enhanced' ? 75 : 50;
      return sum + levelScore;
    }, 0) / activeDevices.length;

    return Math.round(avgSecurityLevel);
  }

  /**
   * Verify device attestation based on platform
   */
  private async verifyDeviceAttestation(
    platform: string,
    attestationData: any
  ): Promise<'basic' | 'enhanced' | 'hardware'> {
    // Mock implementation - in real app, verify with platform-specific APIs
    switch (platform) {
      case 'ios':
        return attestationData.hasSecureEnclave ? 'hardware' : 
               attestationData.hasTouchID ? 'enhanced' : 'basic';
      case 'android':
        return attestationData.hasStrongBox ? 'hardware' :
               attestationData.hasFingerprint ? 'enhanced' : 'basic';
      case 'web':
        return attestationData.hasWebAuthn ? 'enhanced' : 'basic';
      default:
        return 'basic';
    }
  }

  /**
   * Extract device metadata from attestation data
   */
  private extractDeviceMetadata(attestationData: any): DeviceAttestation['metadata'] {
    return {
      os: attestationData.os || 'unknown',
      browser: attestationData.browser,
      isJailbroken: attestationData.isJailbroken || false,
      hasScreenLock: attestationData.hasScreenLock || false,
      biometricsEnabled: attestationData.biometricsEnabled || false
    };
  }

  /**
   * Check if username is already taken
   */
  private isUsernameTaken(username: string): boolean {
    const existing = this.profiles.get(username);
    return existing !== undefined && existing.username === username;
  }
}

/**
 * Factory for UnyID instances
 */
export class UnyIDFactory {
  static create(vcIssuerConfig: any): UnyID {
    return new UnyID(vcIssuerConfig);
  }

  static createFromEnv(): UnyID {
    const config = {
      issuerDID: process.env.UNYKORN_ISSUER_DID || 'did:ethr:0x123...',
      signingKey: process.env.UNYKORN_SIGNING_KEY || '',
      registryContract: process.env.EAS_REGISTRY_CONTRACT || '',
      rpcUrl: process.env.RPC_URL || 'https://eth-mainnet.alchemyapi.io/v2/demo'
    };

    if (!config.signingKey) {
      throw new Error('UNYKORN_SIGNING_KEY environment variable required');
    }

    return new UnyID(config);
  }
}