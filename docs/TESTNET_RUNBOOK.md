# Testnet Runbook

## Purpose

Run Ragnarok in a mainnet-like beta environment with a separate Hive namespace, collection id, accounts, and service endpoints. Testnet validates the full architecture but remains resettable.

## First Setup

Create the local testnet env file:

```bash
cp .env.testnet.example .env.testnet
```

Required values for the current profile:

```env
VITE_NETWORK_STAGE=testnet
VITE_DATA_LAYER_MODE=hive
VITE_BLOCKCHAIN_PACKAGING=true
VITE_RAGNAROK_PROTOCOL_ID=rk_game_testnet
VITE_RAGNAROK_COLLECTION_ID=ragnarok-testnet
VITE_NFTLOX_PROTOCOL_ID=nftlox_testnet
```

Indexer and art endpoints can stay empty until those services are deployed:

```env
VITE_RAGNAROK_INDEXER_URL=
VITE_RAGNAROK_ART_INDEXER_URL=
```

## Start Testnet

```bash
npm run dev:testnet
```

Expected UI signals:

- Header shows `TESTNET`.
- Dismissible lower-left banner shows `Testnet / Resettable / rk_game_testnet`.

The header badge remains visible after dismissing the lower-left banner.

## Smoke Test

1. Open the app at the dev server URL.
2. Confirm the testnet badge is visible.
3. Connect Hive Keychain.
4. Broadcast a low-risk operation first, such as queue join/leave or match anchor.
5. Confirm the Hive `custom_json` id is `rk_game_testnet`.
6. Confirm client replay reads the same namespace.

Passing this smoke test closes the testnet configuration gate and opens the next roadmap block: gameplay/P2P validation under the testnet namespace.

## Failure Checks

- If the badge does not appear, verify the server was started with `npm run dev:testnet`.
- If the client writes ops but replay does not see them, check protocol id filters first.
- If server status reports `ragnarok-cards`, check env loading and optional `RAGNAROK_PROTOCOL_ID` override.
