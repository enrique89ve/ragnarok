# Dokploy Deployment

This deployment path runs the full Ragnarok app as one persistent Node process:
the Vite static build, Express `/api/*` routes, the chain indexer, and the
`/ws/p2p` WebSocket relay. The current intended Dokploy profile is **Alfa
Testnet**: a one-week, NFT-full testnet alias with temporary JSON-backed
collection/provenance projection, RUNE/P2P active, and QA full-catalog access
disabled. This JSON projection is not NFTLox custody evidence.

## Dokploy Project

Create a Docker Compose app connected to the GitHub repository and use:

```text
docker-compose.dokploy.yml
```

Expose port `5000` in Dokploy's domain settings. Traefik should route both
HTTPS and WSS traffic to the same service, so `/ws/p2p` stays on the same
origin as the web app.

This app should use the Compose/Dockerfile path, not Static, Nixpacks, or
Railpack. Ragnarok needs the persistent Express process for `/api/*`, the chain
indexer, `/api/health`, admin diagnostics, and the `/ws/p2p` relay.

## Dokploy Runtime Notes

The Compose file follows Dokploy's Docker Compose variable model:

- Dokploy's Environment tab writes values to `.env` next to the Compose file.
- `env_file: .env` injects runtime-only values, including server secrets.
- Compose interpolation passes selected public `VITE_*` values into Docker
  build args because Vite embeds them into the browser bundle.
- Runtime `environment` repeats the non-secret profile values so Express,
  `/api/health`, and `/api/admin/config` see the same profile as the browser.

Do not put Hive private keys or `P2P_CHALLENGE_SIGNING_SECRET` in Docker build
args or Build-time Secrets. They are runtime-only server values. Do keep
`VITE_RAGNAROK_RESET_EPOCH` and other public `VITE_*` values available at build
time, because the browser bundle needs them.

The Docker image is pinned by default to Node `20.20.2` on Alpine `3.22`.
`Dockerfile`, `docker-compose.dokploy.yml`, `.nvmrc`, and `package.json`
document this runtime. Override `NODE_VERSION` or `NODE_ALPINE_VERSION` only
after a local build and smoke pass.

## Environment Variables

Configure variables in Dokploy's Environment tab. Dokploy writes them to `.env`;
the compose file injects them into the image build and into the running
container. Do not put these public profile values only in Build-time Secrets:
the Express process must also see them at runtime for `/api/health` and
`/api/admin/config`.

Public build-time variables are passed as Docker build args because Vite embeds
`VITE_*` values into the browser bundle:

```dotenv
RAGNAROK_RUNTIME_MODE=alfa-testnet
NODE_VERSION=20.20.2
NODE_ALPINE_VERSION=3.22
VITE_NETWORK_STAGE=testnet
VITE_RAGNAROK_PROTOCOL_ID=rk_game_testnet
VITE_RAGNAROK_COLLECTION_ID=ragnarok-testnet
VITE_RAGNAROK_RESET_EPOCH=alfa-testnet-full-nft-2026-05-22
VITE_RAGNAROK_ADMIN_ACCOUNT=ragnarok-test
VITE_RAGNAROK_ADMIN_OPERATOR_ACCOUNT=ragnarok-test-operator
VITE_RAGNAROK_GENESIS_ACCOUNT=ragnarok-test
VITE_RAGNAROK_TREASURY_ACCOUNT=ragp2p
VITE_RAGNAROK_INDEX_ACCOUNT=ragp2p
VITE_SEASON_START=2026-06-14T23:28:54Z
VITE_RAGNAROK_INDEX_START_BLOCK=109016418
VITE_NFT_ART_BASE_URL=https://your-domain.example
VITE_EXTERNAL_URL_BASE=https://your-domain.example
```

Keep `VITE_NETWORK_STAGE=testnet`. Do not set `VITE_NETWORK_STAGE=practice` or
`VITE_NETWORK_STAGE=alfa-testnet`; Alfa is derived from the
`alfa-testnet-*` reset epoch. Later NFT-full beta profiles should rotate to a
`closed-beta-*` reset epoch. Do not use `qa-s0-*` or `qa-season-0-*` here;
those epochs deliberately enable QA full-catalog entitlement and are not NFT
custody evidence.

NFTLoX is not an Alfa requirement. Leave `VITE_NFTLOX_PROTOCOL_ID` unset during
Alfa unless you are explicitly testing the finalized NFTLoX collection flow.
Closed Beta must set `VITE_NFTLOX_PROTOCOL_ID=nftlox_testnet` only after the
collection proof exists.

Server-only variables must stay unprefixed. Do not add `VITE_` to private keys:

```dotenv
ENABLE_CHAIN_INDEXER=true
RAGNAROK_CHAIN_STATE_FILE=data/chain-state.alfa-testnet.json
RAGNAROK_NFT_OWNERSHIP_SOURCE=json
# Server-side mirror of VITE_SEASON_START for runtime/operator code.
RAGNAROK_SEASON_START=2026-06-14T23:28:54Z
# Server-side mirror of VITE_RAGNAROK_INDEX_START_BLOCK for fresh JSON state.
RAGNAROK_INDEX_START_BLOCK=109016418
RAGNAROK_RANGE_SCAN=true
RAGNAROK_HAF_ENDPOINTS=https://api.hive.blog
P2P_CHALLENGE_SIGNING_SECRET=<64-hex-chars>
P2P_RELAY_ALLOWED_ORIGINS=https://<your-public-game-host>
P2P_RELAY_TRUST_FORWARDED_HOST=false

ENABLE_INDEX_CHECKPOINT_PUBLISHER=false
RAGNAROK_INDEX_CHECKPOINT_DRY_RUN=true
RAGNAROK_INDEX_ACCOUNT=ragp2p
RAGNAROK_INDEX_POSTING_KEY=<posting-private-key>

RAGNAROK_ADMIN_OPERATOR_ACCOUNT=ragnarok-test-operator
RAGNAROK_ADMIN_OPERATOR_ACTIVE_KEY=<active-private-key>

WITNESS_HIVE_ACCOUNT=
WITNESS_HIVE_POSTING_KEY=
```

Generate the P2P challenge secret with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

`P2P_CHALLENGE_SIGNING_SECRET` must be stable in Dokploy. If it is missing or
shorter than 32 characters, the server falls back to a process-local secret,
which is acceptable for local/dev but wrong for shared Alfa/P2P because
redeploys or future replicas can invalidate challenge envelopes. In production
Alfa the server now fails closed instead of signing challenges with a
process-local fallback.

`P2P_RELAY_ALLOWED_ORIGINS` should list the browser origins allowed to open the
`/ws/p2p` relay when the public frontend host differs from the API/relay host.
If frontend and API share the same host, the same-host Origin check is enough.
Keep `P2P_RELAY_TRUST_FORWARDED_HOST=false` unless Dokploy is behind a trusted
reverse proxy that overwrites `X-Forwarded-Host`; otherwise that header is
spoofable by direct clients.

The chain indexer operation filter, fast-sync mode, and replay validation
surface are documented in [`HIVE_INDEXER_CONTRACT.md`](./HIVE_INDEXER_CONTRACT.md).
Use `/api/chain/status` after deploy to confirm `stateFile`,
`syncTargetBlock`, `blocksBehind`, and `progressPercent`.

`RAGNAROK_ADMIN_OPERATOR_ACTIVE_KEY` is required for shared Alfa if the Admin
Panel must perform private admin broadcasts. Keep it server-only in Dokploy. It
must belong to `VITE_RAGNAROK_ADMIN_OPERATOR_ACCOUNT` /
`RAGNAROK_ADMIN_OPERATOR_ACCOUNT`.

The runtime container runs the strict Alfa verifier before boot:

```bash
pnpm run verify:alfa-runtime-env
```

That verifier expects `VITE_NETWORK_STAGE=testnet`, an `alfa-testnet-*` reset
epoch, JSON ownership source, JSON state file, a stable P2P challenge secret,
and the admin operator active key. Build-time verification still checks only
public/build-safe values so secrets do not enter the Docker image layer.
The JSON ownership source is an Alfa adapter only; Closed Beta/mainnet NFT
custody must move to NFTLox once the collection proof exists.

For mainnet, switch `RAGNAROK_RUNTIME_MODE` and `VITE_NETWORK_STAGE` to
`mainnet`, then replace the protocol, collection, account, reset epoch, start
block, ownership source, and key values with mainnet values before deploying.

## Persistent Data

`docker-compose.dokploy.yml` mounts a named volume at `/app/data`. The default
Alfa's chain-state file should live under that volume:

```text
/app/data/chain-state.alfa-testnet.json
```

Use Dokploy volume backups for this volume if the server-side indexer is enabled.
Alfa stores chain projections, RUNE projections, ceremony/session evidence, and
JSON-backed ownership/provenance projections under this JSON state path. This
is a testnet adapter, not mainnet custody.

Keep this as a Docker named volume. Do not bind-mount files from the repository
for persistent state; Dokploy can re-clone the repo on deploy, while named
volumes remain stable and are the path Dokploy can back up.

## Healthcheck And Rollback

The Dockerfile includes a container healthcheck against:

```text
http://127.0.0.1:5000/api/health
```

If configuring Dokploy's Advanced healthcheck manually, use the same endpoint
and port `5000`. A failing healthcheck should block the rollout or roll back,
because a green static page without Express health is not a valid deploy for
P2P.

## Release Cache Rules

The origin intentionally serves the release shell and service-worker entrypoints
with `Cache-Control: no-store, no-cache, max-age=0, must-revalidate`. Keep any
Cloudflare or reverse-proxy cache rule aligned with that behavior:

```text
Bypass cache: /
Bypass cache: /index.html
Bypass cache: /sw.js
Bypass cache: /manifest.json
Bypass cache: /service-worker.js
Cache immutable: /assets/*
```

`/service-worker.js` should return a 404. Ragnarok registers `/sw.js` with the
Alfa reset epoch in its query string, and the hashed `/assets/*` files may stay
cached as immutable build artifacts.

## Smoke Checks

After deploy:

```bash
curl https://your-domain.example/api/health
```

Confirm the response reports the expected runtime stage, protocol id, reset
epoch, state evidence, and indexer status. For the Alfa Testnet Dokploy profile,
these fields
should be:

```json
{
  "runtime": {
    "stage": "testnet",
    "runtimePhase": "alfa-testnet",
    "resetEpoch": "alfa-testnet-full-nft-2026-05-22",
    "qaFullCatalogEnabled": false,
    "resettable": true,
    "economic": false,
    "state": {
      "persistence": "json-file",
      "chainStateFile": "data/chain-state.alfa-testnet.json",
      "ownershipSource": "json"
    }
  }
}
```

Also check:

```bash
curl https://your-domain.example/api/admin/config
curl https://your-domain.example/api/admin/p2p/status
```

The admin config should expose the same non-secret runtime and JSON state
evidence. Product UI may say Alfa Practice; diagnostic rows should still show
`stage=testnet`.

The P2P status response should include:

```json
{
  "challengeSigning": {
    "source": "env",
    "validLength": true,
    "required": true,
    "ready": true,
    "error": null
  },
  "summary": {
    "challengeSigningSecretConfigured": true
  }
}
```

Then test the browser P2P path. The client derives:

```text
wss://your-domain.example/ws/p2p
```

If P2P cannot connect, check the Dokploy domain points to port `5000` and that
the service logs show the Express server started successfully.
