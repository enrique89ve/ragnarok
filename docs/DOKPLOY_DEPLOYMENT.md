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

- The Environment tab is the supported load path: Dokploy writes it to `.env`
  next to the Compose file and interpolates `${VAR}` into the container.
- Paste `.env.alfa-testnet.example` into that tab, set
  `P2P_CHALLENGE_SIGNING_SECRET`, leave the fingerprint block as-is.
- Compose uses `${VAR:-baked-default}`. A blank field in the UI does **not**
  wipe the image epoch; it falls back to `alfa-testnet-full-nft-2026-05-22`.
- Only keys listed in `docker-compose.dokploy.yml` `environment:` enter the
  container. Extra UI keys (`VITE_DATA_LAYER_MODE`, packaging, NFTLox) are
  ignored — delete them from the tab if you pasted an old file.
- The Alfa public profile is also baked in the `Dockerfile`. Compose does not
  pass `VITE_*` as **build** args. The Environment tab does **not** rebuild
  the browser bundle: paste the same fingerprint the image was built with.
  Changing the epoch only in the UI leaves testers on the old JS namespace.
  To change epoch, rebuild the image, then keep the tab in sync (or leave
  fingerprint fields blank so `${VAR:-}` keeps the baked default).
- A missing `P2P_CHALLENGE_SIGNING_SECRET` fails the deploy before start.

Do not put Hive private keys or `P2P_CHALLENGE_SIGNING_SECRET` in Docker build
args or Build-time Secrets. They are runtime-only server values.

The Docker image is pinned to Node `24.19.0` on Alpine `3.24` in the
`Dockerfile`. `.nvmrc` and `package.json` document the same runtime. Do not
put `NODE_VERSION` or `NODE_ALPINE_VERSION` in Dokploy.

## Environment Variables

Load env from the Dokploy Environment tab (paste `.env.alfa-testnet.example`).

Required secret:

```dotenv
P2P_CHALLENGE_SIGNING_SECRET=<64-hex-chars>
```

Optional secrets (uncomment in the tab; never add `VITE_`):

```dotenv
RAGNAROK_ADMIN_OPERATOR_ACTIVE_KEY=<active-private-key>
P2P_RELAY_ALLOWED_ORIGINS=https://<your-public-game-host>
RAGNAROK_INDEX_POSTING_KEY=<posting-private-key>
WITNESS_HIVE_ACCOUNT=
WITNESS_HIVE_POSTING_KEY=
```

The same paste file already includes the launch fingerprint (`VITE_*` =
`RAGNAROK_*`). Keep those values. Changing `VITE_RAGNAROK_RESET_EPOCH` /
`RAGNAROK_RESET_EPOCH` in the UI is a wipe. If you omit a fingerprint key or
leave it blank, Compose keeps the baked default; the boot verifier still
requires the pair to match.

`P2P_RELAY_ALLOWED_ORIGINS` is only needed when the browser origin differs
from the API/relay host. Same-host deploys can omit it. Keep
`P2P_RELAY_TRUST_FORWARDED_HOST` unset unless Dokploy is behind a trusted
proxy that overwrites `X-Forwarded-Host`.

Baked in the image (do not paste into Dokploy). The Dockerfile uses one ARG
block for both the Vite bundle and the Node process, so `VITE_*` and
`RAGNAROK_*` cannot drift on a rebuild:

```text
fingerprint: testnet / rk_game_testnet / alfa-testnet-full-nft-2026-05-22
seasonStart: 2026-06-14T23:28:54Z
indexStartBlock: 109016418
state: data/chain-state.alfa-testnet.json (json ownership, indexer on)
```

Keep `VITE_NETWORK_STAGE=testnet` if you ever override the image. Do not set
`VITE_NETWORK_STAGE=practice` or `VITE_NETWORK_STAGE=alfa-testnet`; Alfa is
derived from the `alfa-testnet-*` reset epoch. Later NFT-full beta profiles
should rotate to a `closed-beta-*` reset epoch. Do not use `qa-s0-*` or
`qa-season-0-*` here; those epochs enable QA full-catalog entitlement.

Do not change `VITE_RAGNAROK_RESET_EPOCH` or `RAGNAROK_RESET_EPOCH` on a
routine Dokploy redeploy. The baked pair must stay equal
(`alfa-testnet-full-nft-2026-05-22`). A new epoch is a wipe: testers lose
IndexedDB progress and the named volume's JSON must be migrated, not reused.
The container verifier now rejects a client/server epoch or protocol mismatch
before Node boots.

NFTLoX is not an Alfa requirement. Leave `VITE_NFTLOX_PROTOCOL_ID` unset
during Alfa. Closed Beta must set `VITE_NFTLOX_PROTOCOL_ID=nftlox_testnet`
only after the collection proof exists.

Generate the P2P challenge secret with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

`P2P_CHALLENGE_SIGNING_SECRET` must stay the same 32+ character value in
Dokploy. Production Alfa fails closed if it is missing or too short. Do not
rotate it on a routine redeploy: tickets and challenge envelopes would die.

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

That verifier expects the baked Alfa public profile plus a stable P2P
challenge secret. Build-time verification still checks only public/build-safe
values so secrets do not enter the Docker image layer. The admin operator
active key is not required to boot; add it when the Admin Panel must broadcast.
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
