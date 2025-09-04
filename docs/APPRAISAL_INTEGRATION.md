# UMSE Appraisal Integration

This MVP maps registry CSVs into node tooltips/panels as follows:

- polygonTokens.csv: `symbol,address,name` — linked from token-address nodes if present
- solanaTokens.csv: `symbol,mint,name` — same as above for Solana
- tlds.csv: `tld,description` — provides descriptive chips for domain/TLD nodes
- summary.md: investor HUD markdown panel

Server exposes CSVs and summary directly at:

- `/api/registry/polygonTokens.csv`
- `/api/registry/solanaTokens.csv`
- `/api/registry/tlds.csv`
- `/api/appraisal/summary.md`

Client can fetch and parse CSVs via `src/utils/csv.ts` to enrich node details.

Future work:
- Join nodes by `address`/`mint` and domain names where present
- Add compliance chips (Reg D, ISO20022, FATF, MiCA, GDPR) based on node metadata
