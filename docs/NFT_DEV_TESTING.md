# NFT Dev Testing Guide

Step-by-step guide for testing the Ragnarok NFT pipeline on Hive. Assumes you have access to the `ragnarok` Hive account and Hive Keychain installed.

## Prerequisites

- Node.js 18+
- [Hive Keychain](https://hive-keychain.com/) browser extension
- `ragnarok` account **active key** imported into Keychain
- Git access to `https://github.com/Dhenz14/norse-mythos-card-game`

## Setup

```bash
git clone https://github.com/Dhenz14/norse-mythos-card-game.git
cd norse-mythos-card-game
npm install
npm run dev
```

Open **http://localhost:5000** in your browser.

> PostgreSQL is optional — the game works fully without it. Chain replay and NFT ownership run entirely client-side via IndexedDB.

## Architecture Overview (for Hive devs)

```
custom_json id: "ragnarok-cards"
payload: { p: "ragnarok-cards", action: "rp_mint", ... }

Browser:
  Keychain signs -> broadcast custom_json -> Hive L1
  condenser_api.get_account_history -> replayRules.ts -> IndexedDB
  IndexedDB -> HiveDataLayer (Zustand) -> Game UI
```

- **All chain ops** use `custom_json` with `id = "ragnarok-cards"`
- **Replay engine** is client-side: browser fetches ops, applies deterministic rules, builds IndexedDB
- **No HAF / no backend indexer required** — the browser IS the indexer
- **21 op types**: genesis, seal, mint, transfer, burn, pack_commit, pack_reveal, reward_claim, match_anchor, match_result, level_up, queue_join, queue_leave, slash_evidence, card_transfer, pack_mint, pack_distribute, pack_transfer, pack_burn, card_replicate, card_merge
- **Supply caps**: 2,000/common, 1,000/rare, 500/epic, 250/mythic per card ID

## Test Flow

### Step 1: Login with Hive Keychain

1. Click **"Login with Hive Keychain"** on the home page
2. Keychain popup asks to verify — approve it
3. Your Hive username should appear in the top-right

**What's happening:** The game calls `window.hive_keychain.requestSignBuffer()` to verify account ownership. No keys are transmitted — Keychain signs a challenge string locally.

### Step 2: Genesis Broadcast (First Time Only)

1. Navigate to **Packs** (`/packs`)
2. If logged in as the `ragnarok` account, you'll see **"Test Mint 5 NFTs"** button (top-right)
3. Click it — if genesis hasn't been broadcast yet, it will broadcast automatically
4. Keychain asks to sign a `custom_json` — approve it

**What's happening:**
```json
{
  "id": "ragnarok-cards",
  "json": {
    "p": "ragnarok-cards",
    "action": "rp_genesis",
    "version": "1.0.0",
    "protocol_hash": "...",
    "engine_hash": "...",
    "card_registry_hash": "...",
    "supply_config": { ... },
    "timestamp": "..."
  }
}
```

This creates the chain state. Only needs to happen once. The genesis op sets protocol version, hash bundle, and supply caps.

### Step 3: Test Mint

1. After genesis, the same button mints 5 random cards
2. Keychain asks to sign — approve it

**What's happening:**
```json
{
  "id": "ragnarok-cards",
  "json": {
    "p": "ragnarok-cards",
    "action": "rp_mint",
    "to": "ragnarok",
    "cards": [
      { "nft_id": "test-...", "card_id": 20001, "rarity": "epic", "name": "..." },
      ...
    ]
  }
}
```

Each card gets a unique `nft_id` (UID), a `card_id` (references the card registry), and rarity.

### Step 4: Verify Collection

1. Navigate to **Collection** (`/collection`)
2. Minted cards should appear in your inventory
3. Click a card → **"View on Chain"** → opens NFT Provenance Viewer
4. Provenance shows: mint trxId, block number, clickable hivehub.dev explorer link

**What's happening:** The replay engine fetches your account history, finds the `rp_mint` op, applies `replayRules.ts` to create `HiveCardAsset` objects in IndexedDB, which are read by `HiveDataLayer` (Zustand store) and displayed in the UI.

### Step 5: Card Transfer (Optional)

1. In Collection, click a card
2. Click **"Send to Friend"**
3. Enter a Hive username, add an optional memo
4. Double-confirm, then Keychain signs the transfer

**What's happening:**
```json
{
  "id": "ragnarok-cards",
  "json": {
    "p": "ragnarok-cards",
    "action": "rp_card_transfer",
    "from": "ragnarok",
    "to": "recipient",
    "cards": [{ "uid": "test-..." }],
    "memo": "..."
  }
}
```

The transfer appends a `ProvenanceStamp` to the card's history. Both sender and recipient can see the full ownership chain via explorer links.

### Step 6: Pack Opening (Commit-Reveal)

1. On Packs page, click **"Open Pack"** on any pack type
2. Keychain signs the `pack_commit` op
3. After ~60 blocks (~3 minutes), the reveal auto-finalizes using the irreversible block hash as entropy

**What's happening:**
- `pack_commit`: Player commits to opening, system records the block
- After commit lands in an irreversible block, `pack_reveal` derives card contents using `SHA256(trxId + block_hash)` as seed
- This prevents manipulation — neither player nor anyone else can predict the cards before the irreversible block is finalized

> **Note:** In dev/local mode, pack opening bypasses commit-reveal and opens instantly with client-side RNG.

## Key Files for Hive Devs

| File | What |
|------|------|
| `client/src/data/blockchain/hiveConfig.ts` | Account names, node URLs, app ID |
| `client/src/data/blockchain/replayEngine.ts` | Chain replay: fetches ops → applies rules → IndexedDB |
| `client/src/data/blockchain/replayRules.ts` | Deterministic rule engine (the "smart contract") |
| `client/src/data/blockchain/replayDB.ts` | IndexedDB v6 schema (13 stores) |
| `client/src/data/blockchain/opSchemas.ts` | Zod validation for all 21 op types |
| `client/src/data/blockchain/genesisAdmin.ts` | Genesis/seal/brick authority functions |
| `client/src/data/blockchain/packDerivation.ts` | Deterministic pack card derivation from block entropy |
| `client/src/data/HiveSync.ts` | Keychain integration: login, broadcast, transfer |
| `client/src/data/HiveDataLayer.ts` | Zustand store: collection, stats, tokens |
| `client/src/data/HiveEvents.ts` | Event bus: card transfers, token updates, tx status |
| `client/src/game/nft/INFTBridge.ts` | Contract interface (26 methods) |
| `client/src/game/nft/HiveNFTBridge.ts` | Hive implementation of INFTBridge |
| `docs/RAGNAROK_PROTOCOL_V1.md` | Frozen protocol spec (14 canonical ops) |
| `docs/GENESIS_RUNBOOK.md` | Mainnet ceremony procedures |
| `docs/HIVE_BLOCKCHAIN_BLUEPRINT.md` | Full NFT architecture document |

## Verifying On-Chain

After minting, verify the ops landed on Hive:

```bash
# Using curl + Hive API
curl -s https://api.hive.blog \
  -d '{"jsonrpc":"2.0","method":"condenser_api.get_account_history","params":["ragnarok",-1,10],"id":1}' \
  | python3 -m json.tool | grep ragnarok-cards
```

Or visit: `https://hivehub.dev/@ragnarok` and look for `custom_json` operations with `id: ragnarok-cards`.

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| "Test Mint" button not visible | Not logged in as `ragnarok` account | Login with the correct account |
| Keychain popup doesn't appear | Keychain not installed or locked | Install/unlock Hive Keychain extension |
| "Genesis failed" | Active key not in Keychain | Import the active key (not just posting) |
| Cards don't appear in collection | Replay hasn't synced yet | Wait 10-15 seconds, refresh page |
| "Pack open failed" | Commit-reveal needs ~60 blocks | Wait ~3 minutes for irreversible finality |
| Provenance shows no explorer links | Card was minted before stamp system | Only affects pre-stamp legacy cards |

## Data Layer Modes

The game has 3 modes (set in `featureFlags.ts`):

| Mode | Chain Ops | Collection | NFT Ownership |
|------|-----------|------------|---------------|
| `local` (default) | No-ops | localStorage | Unlimited copies |
| `hive` | Real Hive L1 | IndexedDB from chain | Enforced per-card |
| `test` | Mock server | Server-side | Server-managed |

To switch to Hive mode, the user logs in via Keychain — mode auto-detects.

## Security Notes

- **Private keys never leave Keychain** — the game only asks Keychain to sign payloads
- **Replay rules are deterministic** — every reader computes the same state from the same ops
- **Supply caps are hard-enforced** — every reader independently rejects mints that exceed caps
- **Genesis is one-time** — after seal, admin authority is bricked forever
- **Zod validates all ops** — malformed chain data is rejected at the boundary
