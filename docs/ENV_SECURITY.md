# Environment And Key Security

This document is the canonical rule for runtime configuration and Hive keys.

## Public Browser Configuration

Only non-secret values may use the `VITE_` prefix. Vite exposes every `VITE_*`
variable to browser code, so these values must be safe to inspect in DevTools.

Allowed public values:

- `VITE_NETWORK_STAGE`
- `VITE_RAGNAROK_PROTOCOL_ID`
- `VITE_RAGNAROK_COLLECTION_ID`
- `VITE_RAGNAROK_RESET_EPOCH`
- `VITE_SEASON_START`
- `VITE_RAGNAROK_INDEX_START_BLOCK`
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

`VITE_NFTLOX_PROTOCOL_ID` is public but phase-gated. Do not set it for Alfa
unless the NFTLoX collection flow is being tested intentionally; Closed Beta
requires it only after collection proof exists.

`VITE_DATA_LAYER_MODE` and `VITE_BLOCKCHAIN_PACKAGING` are mock/debug
overrides. Do not put them in launch env files. They live in
[`NFT_DEV_TESTING.md`](./NFT_DEV_TESTING.md). Normal runs derive those values
from `VITE_NETWORK_STAGE`.

Profile examples:

- `.env.example` is local workshop only (`VITE_NETWORK_STAGE=local`).
- `.env.alfa-testnet.example` is the Dokploy Environment-tab paste file
  (P2P secret + filled fingerprint). Compose `${VAR:-}` keeps baked defaults
  if a fingerprint field is blank.
- `.env.testnet.example` is generic/QA testnet, not the Alfa launch replica.
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
- `P2P_CHALLENGE_SIGNING_SECRET`
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

`VITE_SEASON_START` and `VITE_RAGNAROK_INDEX_START_BLOCK` are public phase
boundary evidence. Every runtime profile, including mainnet, must declare both:
the season start date used by UI/economy displays and the first Hive block where
that phase's Ragnarok protocol id can appear.

`RAGNAROK_SEASON_START` is not secret. It is the server-side mirror of
`VITE_SEASON_START` for split deployments and operator runtimes. Keep the two
equal unless a deployment explicitly documents why browser diagnostics and
server replay use different phase boundaries.

`RAGNAROK_INDEX_START_BLOCK` is not secret. It is the server-side mirror of
`VITE_RAGNAROK_INDEX_START_BLOCK` and acts as the operational bootstrap cursor
for fresh server indexer state files. Set it to the first Hive block where the
selected Ragnarok protocol id can appear, so the server does not replay all
historical Hive blocks during a testnet or mainnet bootstrap.

`RAGNAROK_CHAIN_STATE_FILE` is not secret, but it is authority-sensitive because
it selects the JSON projection the API serves. Prefer one file per runtime phase
(`data/chain-state.alfa-testnet.json`, `data/chain-state.mainnet.json`, etc.).
When omitted, the server now derives a runtime-specific default instead of using
one shared `data/chain-state.json` for every profile.

## Restart isolation

Routine process restarts must not look like a phase wipe. Keep the launch
fingerprint stable: `VITE_NETWORK_STAGE`, `VITE_RAGNAROK_PROTOCOL_ID`,
`VITE_RAGNAROK_RESET_EPOCH`, `VITE_SEASON_START`,
`VITE_RAGNAROK_INDEX_START_BLOCK` and their `RAGNAROK_*` server mirrors.

| Preventive seam | What it blocks |
|---|---|
| `pnpm run verify:runtime-env` / `verify:alfa-runtime-env` | Boot with a missing or mismatched fingerprint |
| Docker `CMD` runs the Alfa verifier before `dist/index.js` | Image start without the baked epoch/protocol/P2P secret |
| `RAGNAROK_RESET_EPOCH` must match `VITE_RAGNAROK_RESET_EPOCH` on Alfa and Closed Beta | Browser IndexedDB namespace vs server JSON namespace split |
| Chain-state `runtimeFingerprint` | Loading a JSON volume from another epoch; `fingerprint_mismatch` throws before Maps mutate |
| IndexedDB / localStorage keys include stage + epoch + protocol | Old tester progress bleeding into a new epoch |
| Stable `P2P_CHALLENGE_SIGNING_SECRET` | Redeploy invalidating match tickets and challenge envelopes |

Do **not** rotate `VITE_RAGNAROK_RESET_EPOCH` on a normal redeploy. A new epoch
is an intentional wipe: browsers get an empty namespace and the server JSON
must be migrated with [`PHASE_MIGRATION_RUNBOOK.md`](./PHASE_MIGRATION_RUNBOOK.md),
never reused in place.

Anonymous progress sentinels `guest` and legacy `local` are `dev/local` only.
Shared Alfa/testnet never writes RUNE, ELO, SeasonScore or CardXP under those
ids, so a restart without Hive identity cannot mint anonymous ledger rows.

`RAGNAROK_RANGE_SCAN` and `RAGNAROK_HAF_ENDPOINTS` are not secret. Range scan is
enabled by default and uses HafAH for fast catch-up over large block gaps. Keep
`RAGNAROK_HAF_ENDPOINTS=https://api.hive.blog` unless another endpoint exposes
the same `/hafah-api/operations` surface; regular Hive RPC nodes may not.
The deterministic Hive operation selection and validation contract is
documented in [`HIVE_INDEXER_CONTRACT.md`](./HIVE_INDEXER_CONTRACT.md).

`P2P_CHALLENGE_SIGNING_SECRET` is a server-only HMAC secret for direct P2P
challenge envelopes and relay match tickets. Local/dev may use the process
fallback, but Dokploy or any shared environment must set a stable value of at
least 32 characters. Production Alfa fails closed when this value is missing or
too short. Never add `VITE_` to this name.

`P2P_RELAY_ALLOWED_ORIGINS` is a server-only comma-separated allowlist for
browser Origins that may open `/ws/p2p` when the frontend and API hosts differ.
Do not use `*`. Prefer exact `https://host[:port]` origins. Same-host requests
are allowed by comparing `Origin` to `Host`.

`P2P_RELAY_TRUST_FORWARDED_HOST=true` should be used only behind a trusted
reverse proxy that overwrites `X-Forwarded-Host`. Leave it false for direct
Node/Dokploy exposure; otherwise a client could spoof the forwarded host and
weaken the Origin check.

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
