# Dokploy Deployment

This deployment path runs the full Ragnarok app as one persistent Node process:
the Vite static build, Express `/api/*` routes, the chain indexer, and the
`/ws/p2p` WebSocket relay. The current intended Dokploy profile is **Alfa
Testnet**: a one-week, NFT-full testnet alias with JSON-backed
ownership/provenance evidence, RUNE/P2P active, and QA full-catalog access
disabled.

## Dokploy Project

Create a Docker Compose app connected to the GitHub repository and use:

```text
docker-compose.dokploy.yml
```

Expose port `5000` in Dokploy's domain settings. Traefik should route both
HTTPS and WSS traffic to the same service, so `/ws/p2p` stays on the same
origin as the web app.

## Environment Variables

Configure variables in Dokploy's Environment tab. Dokploy writes them to `.env`;
the compose file injects them into the container with `env_file: .env`.

Public build-time variables are passed as Docker build args because Vite embeds
`VITE_*` values into the browser bundle:

```dotenv
RAGNAROK_RUNTIME_MODE=alfa-testnet
VITE_NETWORK_STAGE=testnet
VITE_RAGNAROK_PROTOCOL_ID=rk_game_testnet
VITE_RAGNAROK_COLLECTION_ID=ragnarok-testnet
VITE_RAGNAROK_RESET_EPOCH=alfa-testnet-full-nft-2026-05-22
VITE_RAGNAROK_ADMIN_ACCOUNT=ragnarok-test
VITE_RAGNAROK_ADMIN_OPERATOR_ACCOUNT=ragnarok-test-operator
VITE_RAGNAROK_GENESIS_ACCOUNT=ragnarok-test
VITE_RAGNAROK_TREASURY_ACCOUNT=ragp2p
VITE_RAGNAROK_INDEX_ACCOUNT=ragp2p
VITE_NFTLOX_PROTOCOL_ID=nftlox_testnet
VITE_NFT_ART_BASE_URL=https://your-domain.example
VITE_EXTERNAL_URL_BASE=https://your-domain.example
```

Keep `VITE_NETWORK_STAGE=testnet`. Do not set `VITE_NETWORK_STAGE=practice` or
`VITE_NETWORK_STAGE=alfa-testnet`; Alfa is derived from the
`alfa-testnet-*` reset epoch. Later NFT-full beta profiles should rotate to a
`closed-beta-*` reset epoch. Do not use `qa-s0-*` or `qa-season-0-*` here;
those epochs deliberately enable QA full-catalog entitlement and are not NFT
custody evidence.

Server-only variables must stay unprefixed. Do not add `VITE_` to private keys:

```dotenv
ENABLE_CHAIN_INDEXER=true
RAGNAROK_CHAIN_STATE_FILE=data/chain-state.alfa-testnet.json
RAGNAROK_NFT_OWNERSHIP_SOURCE=json
RAGNAROK_INDEX_START_BLOCK=106536940

ENABLE_INDEX_CHECKPOINT_PUBLISHER=false
RAGNAROK_INDEX_CHECKPOINT_DRY_RUN=true
RAGNAROK_INDEX_ACCOUNT=ragp2p
RAGNAROK_INDEX_POSTING_KEY=<posting-private-key>

RAGNAROK_ADMIN_OPERATOR_ACCOUNT=ragnarok-test-operator
RAGNAROK_ADMIN_OPERATOR_ACTIVE_KEY=<active-private-key>

WITNESS_HIVE_ACCOUNT=
WITNESS_HIVE_POSTING_KEY=
```

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
JSON-backed ownership/provenance under this JSON state path. This is a testnet
adapter, not mainnet custody.

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
```

The admin config should expose the same non-secret runtime and JSON state
evidence. Product UI may say Alfa Practice; diagnostic rows should still show
`stage=testnet`.

Then test the browser P2P path. The client derives:

```text
wss://your-domain.example/ws/p2p
```

If P2P cannot connect, check the Dokploy domain points to port `5000` and that
the service logs show the Express server started successfully.
