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
- `VITE_RAGNAROK_ADMIN_OPERATOR_ACCOUNT`
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

Profile examples:

- `.env.example` defaults to `VITE_NETWORK_STAGE=local`.
- `.env.testnet.example` is the resettable shared beta profile.
- `.env.mainnet.example` is the permanent economic profile for release
  rehearsals and mainnet builds.

## Server And Operator Secrets

These values are sensitive and must never use the `VITE_` prefix:

- `DATABASE_URL`
- `PGPASSWORD`
- `SESSION_SECRET`
- `HIVE_POSTING_KEY`
- `HIVE_ACTIVE_KEY`
- `RAGNAROK_ADMIN_OPERATOR_ACTIVE_KEY`
- `RAGNAROK_INDEX_POSTING_KEY`
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

Admin Panel login and actions use separate authority paths:

- `VITE_RAGNAROK_ADMIN_ACCOUNT` is the frontend account allowed to log in with
  Hive Keychain Posting authority and sign admin transactions with Active authority.
- `VITE_RAGNAROK_ADMIN_OPERATOR_ACCOUNT` is the public account that co-signs
  prepared admin Hive transactions from the server.
- `RAGNAROK_ADMIN_OPERATOR_ACTIVE_KEY` is the server/operator-only Active key
  for private admin operation co-signing and broadcasting. It must never use
  the `VITE_` prefix.

The admin panel does not open from the browser account check alone. The server
issues an HttpOnly admin session only after the admin Posting signature verifies
over a canonical custom_json-shaped login payload. The signed login payload is
sent by the client for exact matching, but it is not broadcast to Hive. No
server posting key or operator signature is required for panel login.
`VITE_RAGNAROK_TREASURY_ACCOUNT` is payments-only and must not grant panel,
operator, or protocol authority.

Admin actions are separate from login. The server prepares a Hive transaction
with `required_auths: [admin, operator]`, the browser signs that transaction
with Keychain Active authority, and the server only broadcasts after validating
the admin signature and adding the operator Active signature.

Index checkpoint publishing uses `VITE_RAGNAROK_INDEX_ACCOUNT` only as the
public account name. The future publisher must use a server/operator-only
posting key such as `RAGNAROK_INDEX_POSTING_KEY`; it must never be exposed as
`VITE_*`.

`RAGNAROK_INDEX_START_BLOCK` is not secret. It is an operational bootstrap
cursor for fresh server indexer state files; set it to the first Hive block
where the selected Ragnarok protocol id can appear, so the server does not
replay all historical Hive blocks during a testnet or mainnet bootstrap.

`ENABLE_INDEX_CHECKPOINT_PUBLISHER=true` turns on server-side Hive checkpoint
broadcasts. The publisher uses `hive-tx` with `RAGNAROK_INDEX_ACCOUNT` and
`RAGNAROK_INDEX_POSTING_KEY` to write compact `index_checkpoint` custom_json
payloads under the `${RAGNAROK_PROTOCOL_ID}_index` id. Keep it disabled unless
the posting key is present on the server and the account authority has been
verified. `RAGNAROK_INDEX_CHECKPOINT_INTERVAL_BLOCKS` controls how often a new
checkpoint bucket can be emitted. `RAGNAROK_INDEX_CHECKPOINT_DRY_RUN=true`
keeps the same validation and payload-building path but skips the Hive
transaction broadcast; use it for local/testnet smoke checks only.

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
RAGNAROK_ADMIN_OPERATOR_ACTIVE_KEY=...
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
