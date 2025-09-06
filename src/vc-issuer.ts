/**
 * Verifiable Credential Issuer for UPoF V2 Integration
 * Extends existing Proof of Funds system with W3C VC compatibility
 */

import { ethers } from 'ethers';
import { DIDDocument, VerifiableCredential, VerifiablePresentation } from '@veramo/core';

export interface POFData {
  tokenId: string;
  asset: string;
  amount: string;
  expiry: number;
  holderAddress: string;
  kycCompliant: boolean;
  sanctionsCleared: boolean;
  custodian?: string;
  auditHash?: string;
}

export interface VCIssuerConfig {
  issuerDID: string;
  signingKey: string;
  registryContract: string;
  rpcUrl: string;
}

export interface AttestationResult {
  valid: boolean;
  claims: Record<string, any>;
  metadata?: Record<string, any>;
}

export class VCIssuer {
  private config: VCIssuerConfig;
  private provider: ethers.providers.JsonRpcProvider;
  private signer: ethers.Wallet;

  constructor(config: VCIssuerConfig) {
    this.config = config;
    this.provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    this.signer = new ethers.Wallet(config.signingKey, this.provider);
  }

  /**
   * Issue a Verifiable Credential for Proof of Funds
   */
  async issueProofOfFunds(
    holderDID: string,
    pofData: POFData
  ): Promise<VerifiableCredential> {
    const now = new Date();
    const expirationDate = new Date(pofData.expiry * 1000);

    const credentialSubject = {
      id: holderDID,
      hasAsset: {
        type: pofData.asset,
        minimumAmount: pofData.amount,
        currency: this.extractCurrency(pofData.asset)
      },
      proofOfFunds: {
        tokenId: pofData.tokenId,
        verifiedAmount: pofData.amount,
        custodian: pofData.custodian || 'self-custody',
        auditTrail: pofData.auditHash
      },
      compliance: {
        kycApproved: pofData.kycCompliant,
        sanctionsCleared: pofData.sanctionsCleared,
        verifiedAt: now.toISOString()
      }
    };

    const vc: VerifiableCredential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://pof.unykorn.com/contexts/v1',
        'https://schema.org'
      ],
      type: ['VerifiableCredential', 'ProofOfFundsCredential'],
      issuer: {
        id: this.config.issuerDID,
        name: 'UnyKorn Proof of Funds Service'
      },
      issuanceDate: now.toISOString(),
      expirationDate: expirationDate.toISOString(),
      credentialSubject,
      credentialStatus: {
        id: `${this.config.registryContract}#${pofData.tokenId}`,
        type: 'EthereumAttestationServiceStatus'
      }
    };

    return this.signVC(vc);
  }

  /**
   * Issue a KYC Compliance Credential
   */
  async issueKYCCredential(
    holderDID: string,
    kycData: {
      userId: string;
      provider: string;
      level: string;
      approved: boolean;
      verifiedAt: number;
    }
  ): Promise<VerifiableCredential> {
    const now = new Date();
    const expirationDate = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year

    const vc: VerifiableCredential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://kyc.unykorn.com/contexts/v1'
      ],
      type: ['VerifiableCredential', 'KYCCredential'],
      issuer: {
        id: this.config.issuerDID,
        name: 'UnyKorn KYC Verification Service'
      },
      issuanceDate: now.toISOString(),
      expirationDate: expirationDate.toISOString(),
      credentialSubject: {
        id: holderDID,
        kycStatus: {
          approved: kycData.approved,
          level: kycData.level,
          provider: kycData.provider,
          verifiedAt: new Date(kycData.verifiedAt * 1000).toISOString()
        }
      }
    };

    return this.signVC(vc);
  }

  /**
   * Issue a Device Attestation Credential
   */
  async issueDeviceAttestation(
    holderDID: string,
    deviceData: {
      deviceId: string;
      platform: 'ios' | 'android' | 'web';
      securityLevel: 'basic' | 'enhanced' | 'hardware';
      attestations: string[];
      verifiedAt: number;
    }
  ): Promise<VerifiableCredential> {
    const now = new Date();
    const expirationDate = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)); // 1 week

    const vc: VerifiableCredential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://device.unykorn.com/contexts/v1'
      ],
      type: ['VerifiableCredential', 'DeviceAttestationCredential'],
      issuer: {
        id: this.config.issuerDID,
        name: 'UnyKorn Device Attestation Service'
      },
      issuanceDate: now.toISOString(),
      expirationDate: expirationDate.toISOString(),
      credentialSubject: {
        id: holderDID,
        device: {
          id: deviceData.deviceId,
          platform: deviceData.platform,
          securityLevel: deviceData.securityLevel,
          attestations: deviceData.attestations,
          verifiedAt: new Date(deviceData.verifiedAt * 1000).toISOString()
        }
      }
    };

    return this.signVC(vc);
  }

  /**
   * Verify a Verifiable Credential
   */
  async verifyCredential(vc: VerifiableCredential): Promise<{
    verified: boolean;
    error?: string;
    details?: any;
  }> {
    try {
      // Verify signature
      const signatureValid = await this.verifyVCSignature(vc);
      if (!signatureValid) {
        return { verified: false, error: 'Invalid signature' };
      }

      // Check expiration
      if (vc.expirationDate && new Date(vc.expirationDate) < new Date()) {
        return { verified: false, error: 'Credential expired' };
      }

      // Check revocation status
      const revoked = await this.checkRevocationStatus(vc);
      if (revoked) {
        return { verified: false, error: 'Credential revoked' };
      }

      return { verified: true, details: { issuer: vc.issuer, type: vc.type } };
    } catch (error) {
      return { verified: false, error: error.message };
    }
  }

  /**
   * Create a Verifiable Presentation
   */
  async createPresentation(
    credentials: VerifiableCredential[],
    holderDID: string,
    challenge?: string,
    domain?: string
  ): Promise<VerifiablePresentation> {
    const now = new Date();

    const vp: VerifiablePresentation = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiablePresentation'],
      verifiableCredential: credentials,
      holder: holderDID,
      proof: {
        type: 'EthereumEip712Signature2021',
        created: now.toISOString(),
        verificationMethod: `${holderDID}#key-1`,
        proofPurpose: 'authentication'
      }
    };

    if (challenge) {
      vp.proof.challenge = challenge;
    }

    if (domain) {
      vp.proof.domain = domain;
    }

    return this.signVP(vp);
  }

  /**
   * Sign a Verifiable Credential using EIP-712
   */
  private async signVC(vc: VerifiableCredential): Promise<VerifiableCredential> {
    const domain = {
      name: 'UnyKorn Verifiable Credentials',
      version: '1',
      chainId: await this.provider.getNetwork().then(n => n.chainId),
      verifyingContract: this.config.registryContract
    };

    const types = {
      VerifiableCredential: [
        { name: 'context', type: 'string[]' },
        { name: 'type', type: 'string[]' },
        { name: 'issuer', type: 'string' },
        { name: 'issuanceDate', type: 'string' },
        { name: 'expirationDate', type: 'string' },
        { name: 'credentialSubject', type: 'string' }
      ]
    };

    const value = {
      context: Array.isArray(vc['@context']) ? vc['@context'] : [vc['@context']],
      type: vc.type,
      issuer: typeof vc.issuer === 'string' ? vc.issuer : vc.issuer.id,
      issuanceDate: vc.issuanceDate,
      expirationDate: vc.expirationDate || '',
      credentialSubject: JSON.stringify(vc.credentialSubject)
    };

    const signature = await this.signer._signTypedData(domain, types, value);

    vc.proof = {
      type: 'EthereumEip712Signature2021',
      created: new Date().toISOString(),
      verificationMethod: `${this.config.issuerDID}#key-1`,
      proofPurpose: 'assertionMethod',
      proofValue: signature
    };

    return vc;
  }

  /**
   * Sign a Verifiable Presentation
   */
  private async signVP(vp: VerifiablePresentation): Promise<VerifiablePresentation> {
    const domain = {
      name: 'UnyKorn Verifiable Presentations',
      version: '1',
      chainId: await this.provider.getNetwork().then(n => n.chainId),
      verifyingContract: this.config.registryContract
    };

    const types = {
      VerifiablePresentation: [
        { name: 'context', type: 'string[]' },
        { name: 'type', type: 'string[]' },
        { name: 'holder', type: 'string' },
        { name: 'verifiableCredential', type: 'string[]' }
      ]
    };

    const value = {
      context: Array.isArray(vp['@context']) ? vp['@context'] : [vp['@context']],
      type: vp.type,
      holder: vp.holder,
      verifiableCredential: vp.verifiableCredential.map(vc => JSON.stringify(vc))
    };

    const signature = await this.signer._signTypedData(domain, types, value);

    vp.proof.proofValue = signature;
    return vp;
  }

  /**
   * Verify VC signature
   */
  private async verifyVCSignature(vc: VerifiableCredential): Promise<boolean> {
    if (!vc.proof || !vc.proof.proofValue) {
      return false;
    }

    try {
      const domain = {
        name: 'UnyKorn Verifiable Credentials',
        version: '1',
        chainId: await this.provider.getNetwork().then(n => n.chainId),
        verifyingContract: this.config.registryContract
      };

      const types = {
        VerifiableCredential: [
          { name: 'context', type: 'string[]' },
          { name: 'type', type: 'string[]' },
          { name: 'issuer', type: 'string' },
          { name: 'issuanceDate', type: 'string' },
          { name: 'expirationDate', type: 'string' },
          { name: 'credentialSubject', type: 'string' }
        ]
      };

      const value = {
        context: Array.isArray(vc['@context']) ? vc['@context'] : [vc['@context']],
        type: vc.type,
        issuer: typeof vc.issuer === 'string' ? vc.issuer : vc.issuer.id,
        issuanceDate: vc.issuanceDate,
        expirationDate: vc.expirationDate || '',
        credentialSubject: JSON.stringify(vc.credentialSubject)
      };

      const recoveredAddress = ethers.utils.verifyTypedData(
        domain,
        types,
        value,
        vc.proof.proofValue
      );

      return recoveredAddress.toLowerCase() === this.signer.address.toLowerCase();
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Check if credential is revoked
   */
  private async checkRevocationStatus(vc: VerifiableCredential): Promise<boolean> {
    if (!vc.credentialStatus) {
      return false; // No revocation mechanism = not revoked
    }

    try {
      // Implementation would check EAS registry or other revocation list
      // For now, return false (not revoked)
      return false;
    } catch (error) {
      console.error('Revocation check failed:', error);
      return false; // Assume not revoked on error
    }
  }

  /**
   * Extract currency from asset string
   */
  private extractCurrency(asset: string): string {
    // Simple extraction - would be more sophisticated in production
    if (asset.includes('USDC')) return 'USDC';
    if (asset.includes('USDT')) return 'USDT';
    if (asset.includes('ETH')) return 'ETH';
    if (asset.includes('BTC')) return 'BTC';
    return 'USD'; // Default
  }
}

/**
 * Factory for creating VCIssuer instances
 */
export class VCIssuerFactory {
  static create(config: VCIssuerConfig): VCIssuer {
    return new VCIssuer(config);
  }

  static createFromEnv(): VCIssuer {
    const config: VCIssuerConfig = {
      issuerDID: process.env.VC_ISSUER_DID || 'did:ethr:0x123...',
      signingKey: process.env.VC_SIGNING_KEY || '',
      registryContract: process.env.EAS_REGISTRY_CONTRACT || '',
      rpcUrl: process.env.RPC_URL || 'https://eth-mainnet.alchemyapi.io/v2/demo'
    };

    if (!config.signingKey) {
      throw new Error('VC_SIGNING_KEY environment variable required');
    }

    return new VCIssuer(config);
  }
}

// Export types for use in other modules
export type {
  VerifiableCredential,
  VerifiablePresentation,
  DIDDocument
} from '@veramo/core';