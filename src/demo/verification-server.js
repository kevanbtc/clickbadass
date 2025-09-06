/**
 * Simple Express server for SiloProof Demo
 * Provides mock verification endpoints for VC+NFT dual-rail testing
 */

const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Mock data for demo purposes
const mockNFTRegistry = {
    "42": {
        tokenId: "42",
        amount: "50000.00",
        asset: "USDC",
        holderAddress: "0x742d35Cc6634C0532925a3b8D93C7E8F476C4578",
        expiry: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
        kycCompliant: true,
        sanctionsCleared: true,
        custodian: "Coinbase Custody",
        auditHash: "0x8f3b4e9a7c1d6f2e5b8a9c4d7e1f6a2b5c8e1a4b7c2d5e8f1a4b7c2d5e8f1a4b",
        valid: true
    }
};

const mockVCRegistry = {
    "did:ethr:0x742d35Cc6634C0532925a3b8D93C7E8F476C4578/vc/pof-42": {
        vcURI: "did:ethr:0x742d35Cc6634C0532925a3b8D93C7E8F476C4578/vc/pof-42",
        valid: true,
        claims: ["ProofOfFunds", "KYCCompliant", "SanctionsCleared"],
        issuedBy: "UnyKorn Proof of Funds Service",
        expiresAt: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString(),
        verifiedAt: Date.now(),
        metadata: {
            amount: "50000.00",
            currency: "USDC",
            tokenId: "42",
            holderDID: "did:ethr:0x742d35Cc6634C0532925a3b8D93C7E8F476C4578"
        }
    }
};

// Utility functions
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function validateEthereumAddress(address) {
    try {
        return ethers.utils.isAddress(address);
    } catch {
        return false;
    }
}

function validateDID(did) {
    return did && did.startsWith('did:') && did.includes(':');
}

// Main verification endpoint
app.post('/api/verify', async (req, res) => {
    try {
        const { vcURI, tokenId, requiredAsset, minAmount, timestamp } = req.body;
        
        // Simulate processing time
        await delay(1000 + Math.random() * 1000);

        let result = {
            valid: false,
            reason: 'No verification method provided',
            claims: [],
            issuedBy: null,
            expiresAt: null,
            verifiedAt: Date.now(),
            metadata: {}
        };

        // VC Verification
        if (vcURI) {
            const vcData = mockVCRegistry[vcURI];
            if (vcData) {
                result = {
                    valid: vcData.valid,
                    reason: vcData.valid ? 'VC verification successful' : 'Invalid VC signature',
                    claims: vcData.claims,
                    issuedBy: vcData.issuedBy,
                    expiresAt: vcData.expiresAt,
                    verifiedAt: vcData.verifiedAt,
                    metadata: vcData.metadata
                };

                // Check required asset and amount
                if (requiredAsset && vcData.metadata.currency !== requiredAsset) {
                    result.valid = false;
                    result.reason = `Asset mismatch: required ${requiredAsset}, found ${vcData.metadata.currency}`;
                }

                if (minAmount && parseFloat(vcData.metadata.amount) < parseFloat(minAmount)) {
                    result.valid = false;
                    result.reason = `Insufficient amount: required ${minAmount}, found ${vcData.metadata.amount}`;
                }
            } else {
                result.reason = 'VC not found in registry';
            }
        }
        
        // NFT Token Verification
        else if (tokenId) {
            const nftData = mockNFTRegistry[tokenId];
            if (nftData) {
                result = {
                    valid: nftData.valid && nftData.expiry > (Date.now() / 1000),
                    reason: nftData.valid ? 
                        (nftData.expiry > (Date.now() / 1000) ? 'NFT verification successful' : 'Token expired') :
                        'Invalid token',
                    claims: ['ProofOfFunds'],
                    issuedBy: 'UPoF V2 System',
                    expiresAt: new Date(nftData.expiry * 1000).toISOString(),
                    verifiedAt: Date.now(),
                    metadata: {
                        tokenId: nftData.tokenId,
                        amount: nftData.amount,
                        currency: nftData.asset,
                        holderAddress: nftData.holderAddress,
                        custodian: nftData.custodian,
                        kycCompliant: nftData.kycCompliant,
                        sanctionsCleared: nftData.sanctionsCleared
                    }
                };

                // Check required asset and amount
                if (requiredAsset && nftData.asset !== requiredAsset) {
                    result.valid = false;
                    result.reason = `Asset mismatch: required ${requiredAsset}, found ${nftData.asset}`;
                }

                if (minAmount && parseFloat(nftData.amount) < parseFloat(minAmount)) {
                    result.valid = false;
                    result.reason = `Insufficient amount: required ${minAmount}, found ${nftData.amount}`;
                }
            } else {
                result.reason = 'NFT token not found';
            }
        }

        res.json(result);
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({
            valid: false,
            reason: 'Internal server error',
            verifiedAt: Date.now(),
            error: error.message
        });
    }
});

// Dual verification endpoint
app.post('/api/verify/dual', async (req, res) => {
    try {
        const { vcURI, tokenId, requiredAsset, minAmount } = req.body;

        if (!vcURI || !tokenId) {
            return res.status(400).json({
                error: 'Both vcURI and tokenId required for dual verification'
            });
        }

        // Simulate parallel verification
        await delay(1500 + Math.random() * 500);

        const [vcResult, nftResult] = await Promise.all([
            // Mock VC verification
            new Promise(resolve => {
                const vcData = mockVCRegistry[vcURI];
                resolve(vcData ? {
                    valid: vcData.valid,
                    method: 'VC',
                    claims: vcData.claims,
                    metadata: vcData.metadata
                } : {
                    valid: false,
                    method: 'VC',
                    reason: 'VC not found'
                });
            }),
            
            // Mock NFT verification
            new Promise(resolve => {
                const nftData = mockNFTRegistry[tokenId];
                resolve(nftData ? {
                    valid: nftData.valid && nftData.expiry > (Date.now() / 1000),
                    method: 'NFT',
                    claims: ['ProofOfFunds'],
                    metadata: {
                        amount: nftData.amount,
                        currency: nftData.asset,
                        tokenId: nftData.tokenId
                    }
                } : {
                    valid: false,
                    method: 'NFT',
                    reason: 'NFT not found'
                });
            })
        ]);

        // Cross-validate results
        const crossValidation = {
            bothValid: vcResult.valid && nftResult.valid,
            amountMatch: vcResult.metadata?.amount === nftResult.metadata?.amount,
            currencyMatch: vcResult.metadata?.currency === nftResult.metadata?.currency,
            tokenIdMatch: vcResult.metadata?.tokenId === nftResult.metadata?.tokenId
        };

        const result = {
            valid: crossValidation.bothValid && crossValidation.amountMatch && crossValidation.currencyMatch,
            verificationMethods: ['VC', 'NFT'],
            crossValidation,
            results: {
                vc: vcResult,
                nft: nftResult
            },
            verifiedAt: Date.now(),
            reason: crossValidation.bothValid ? 
                (crossValidation.amountMatch && crossValidation.currencyMatch ? 
                    'Dual verification successful with cross-validation' : 
                    'Methods valid but claims do not match') :
                'One or both verification methods failed'
        };

        res.json(result);
    } catch (error) {
        console.error('Dual verification error:', error);
        res.status(500).json({
            valid: false,
            reason: 'Internal server error',
            verifiedAt: Date.now(),
            error: error.message
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: Date.now(),
        service: 'SiloProof Verification API',
        version: '1.0.0'
    });
});

// Registry inspection endpoints (for debugging)
app.get('/api/registry/nft/:tokenId', (req, res) => {
    const { tokenId } = req.params;
    const nftData = mockNFTRegistry[tokenId];
    
    if (nftData) {
        res.json(nftData);
    } else {
        res.status(404).json({ error: 'NFT not found' });
    }
});

app.get('/api/registry/vc', (req, res) => {
    const { uri } = req.query;
    if (uri && mockVCRegistry[uri]) {
        res.json(mockVCRegistry[uri]);
    } else if (uri) {
        res.status(404).json({ error: 'VC not found' });
    } else {
        res.json(Object.keys(mockVCRegistry));
    }
});

// Serve the demo HTML
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/SiloProofDemo.html');
});

// Start server
app.listen(port, () => {
    console.log(`
🚀 SiloProof Demo Server running on port ${port}

Available endpoints:
- GET  /                     - Demo interface
- POST /api/verify           - Single verification (VC or NFT)
- POST /api/verify/dual      - Dual-rail verification
- GET  /api/health           - Health check
- GET  /api/registry/nft/:id - NFT registry lookup
- GET  /api/registry/vc      - VC registry lookup

Demo ready at: http://localhost:${port}
    `);
});

module.exports = app;