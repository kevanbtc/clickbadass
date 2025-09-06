# SiloProof Connect Demo

A live demonstration of VC+NFT dual-rail verification system, built for SiloCloud integration strategy.

## Quick Start

```bash
# Install dependencies
npm install

# Start the demo server
npm start

# Or run in development mode
npm run dev
```

Visit `http://localhost:3001` to see the demo interface.

## What This Demonstrates

### 🏦 NFT Rail (UPoF V2)
- Blockchain-based proof of funds using NFTs
- On-chain verification with immutable records
- Traditional Web3 approach with gas costs

### 🆔 VC Rail (W3C Standards)
- Verifiable Credentials with EIP-712 signatures
- Privacy-preserving, selective disclosure
- Zero gas costs, standards compliant

### 🔄 Dual-Rail System
- Cross-verification between both methods
- Redundant proof with user choice
- Future-ready architecture

## Demo Features

- **Interactive Tabs**: Explore each verification method
- **Live Verification**: See dual-rail verification in action
- **Mock Data**: Realistic test scenarios without real blockchain calls
- **Responsive UI**: Works on desktop and mobile

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/verify` | POST | Single verification (VC or NFT) |
| `/api/verify/dual` | POST | Dual-rail verification |
| `/api/health` | GET | Health check |
| `/api/registry/nft/:id` | GET | NFT registry lookup |
| `/api/registry/vc` | GET | VC registry lookup |

## Sample Requests

### Single VC Verification
```bash
curl -X POST http://localhost:3001/api/verify \
  -H "Content-Type: application/json" \
  -d '{
    "vcURI": "did:ethr:0x742d35Cc6634C0532925a3b8D93C7E8F476C4578/vc/pof-42",
    "requiredAsset": "USDC",
    "minAmount": "10000"
  }'
```

### Single NFT Verification
```bash
curl -X POST http://localhost:3001/api/verify \
  -H "Content-Type: application/json" \
  -d '{
    "tokenId": "42",
    "requiredAsset": "USDC",
    "minAmount": "10000"
  }'
```

### Dual-Rail Verification
```bash
curl -X POST http://localhost:3001/api/verify/dual \
  -H "Content-Type: application/json" \
  -d '{
    "vcURI": "did:ethr:0x742d35Cc6634C0532925a3b8D93C7E8F476C4578/vc/pof-42",
    "tokenId": "42",
    "requiredAsset": "USDC",
    "minAmount": "10000"
  }'
```

## Mock Test Data

### NFT Token #42
- **Amount**: $50,000 USDC
- **Holder**: 0x742d35Cc6634C0532925a3b8D93C7E8F476C4578
- **Custodian**: Coinbase Custody
- **Status**: KYC Approved, Sanctions Clear

### VC Credential
- **URI**: did:ethr:0x742d35Cc6634C0532925a3b8D93C7E8F476C4578/vc/pof-42
- **Claims**: ProofOfFunds, KYCCompliant, SanctionsCleared
- **Amount**: $50,000 USDC
- **Issuer**: UnyKorn Proof of Funds Service

## Technical Architecture

This demo showcases the technical foundation for:
- **SiloCloud Integration**: User data ownership with verify-at-source
- **Enterprise API Design**: Consent management and privacy-preserving verification
- **React Component Library**: Production-ready verification widgets
- **W3C Standards Compliance**: Future-proof credential architecture

Built as part of the 72-hour SiloCloud partnership demonstration plan.