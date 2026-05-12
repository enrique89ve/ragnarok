# Environment And Key Security

This document is the canonical rule for runtime configuration and Hive keys.

## Public Browser Configuration

Only non-secret values may use the `VITE_` prefix. Vite exposes every `VITE_*`
variable to browser code, so these values must be safe to inspect in DevTools.

Allowed public values:

- `VITE_NETWORK_STAGE`
- `VITE_RAGNAROK_PROTOCOL_ID`
- `VITE_RAGNAROK_COLLECTION_ID`
- `VITE_RAGNAROK_ADMIN_ACCOUNT`
- `VITE_RAGNAROK_GENESIS_ACCOUNT`
- `VITE_RAGNAROK_TREASURY_ACCOUNT`
- `VITE_RAGNAROK_INDEX_ACCOUNT`
- `VITE_RAGNAROK_INDEXER_URL`
- `VITE_RAGNAROK_ART_INDEXER_URL`
- `VITE_NFTLOX_PROTOCOL_ID`
- `VITE_NFT_ART_BASE_URL`
- `VITE_EXTERNAL_URL_BASE`
- `VITE_API_URL`, only when it is a public URL without credentials

`VITE_DATA_LAYER_MODE` and `VITE_BLOCKCHAIN_PACKAGING` are advanced test/debug
overrides. Normal `local`, `testnet`, and `mainnet` runs derive those values
from `VITE_NETWORK_STAGE`.

## Server And Operator Secrets

These values are sensitive and must never use the `VITE_` prefix:

- `DATABASE_URL`
- `PGPASSWORD`
- `SESSION_SECRET`
- `HIVE_POSTING_KEY`
- `HIVE_ACTIVE_KEY`
- any Hive WIF private key
- any Hive `PVT_*` private key
- `ANTHROPIC_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_API_KEY`, unless a browser upload flow is explicitly designed
  around a restricted, client-safe credential

Local development can store server/operator secrets in gitignored `.env.*`
files. Deployed environments should use the hosting provider's secret manager.

## Hive Key Placement

Player keys live in Hive Keychain. The browser app asks Keychain to sign; it
does not receive, persist, or transmit private keys.

Operator posting keys live only in a server/operator process when automation is
required. Use a non-public name such as:

```env
HIVE_POSTING_KEY=...
RAGNAROK_OPERATOR_POSTING_KEY=...
```

Operator active keys should be avoided in always-on web servers. If an active
key is required, keep it in a dedicated operator process or use Keychain/manual
multisig for the action:

```env
HIVE_ACTIVE_KEY=...
RAGNAROK_OPERATOR_ACTIVE_KEY=...
```

Genesis and treasury signer active keys should remain in Hive Keychain on each
signer's machine. They should not be exported to repo files, server env, browser
env, logs, or issue trackers.

## Build Guard

`vite.config.ts` fails fast if a public env var looks sensitive. It blocks:

- sensitive public names such as `VITE_*KEY`, `VITE_*SECRET`, `VITE_*TOKEN`,
  `VITE_*PASSWORD`, `VITE_*PRIVATE`, and `VITE_*WIF`
- public values that look like Hive private keys
- public URLs containing credentials
- public URLs containing secret-like query parameters

If this guard trips, rename the variable without `VITE_` and move it to the
server/operator runtime.
