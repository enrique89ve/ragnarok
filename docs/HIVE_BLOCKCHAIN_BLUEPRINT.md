# Ragnarok — Hive Blockchain Integration Blueprint

**Status**: Phase 2 complete — all chain ops wired end-to-end. NFT provenance viewer, direct card gifting, ownership enforcement, post-match IDB→Zustand refresh, HiveEvents toast notifications, reward claiming on chain. Genesis launch (broadcast genesis + seal on Hive mainnet) is next.
**Layer**: Hive Layer 1 (no Hive-Engine dependency)
**Model**: Fixed-supply NFT cards, decentralized P2P gameplay, cryptographic anti-cheat

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Layer 1 NFT Architecture](#2-layer-1-nft-architecture)
3. [Genesis Distribution](#3-genesis-distribution)
4. [In-Browser Chain Replay Engine](#4-in-browser-chain-replay-engine)
5. [Player-Signed Transfers](#5-player-signed-transfers)
6. [WASM Game Logic Module](#6-wasm-game-logic-module)
7. [Cryptographic Match Protocol](#7-cryptographic-match-protocol)
8. [Anti-Cheat Design](#8-anti-cheat-design)
9. [P2P Integration with Existing Architecture](#9-p2p-integration-with-existing-architecture)
10. [Community Airdrop & Economy](#10-community-airdrop--economy)
11. [Implementation Phases](#11-implementation-phases)
12. [File Structure](#12-file-structure)
13. [Key Design Invariants](#13-key-design-invariants)
14. [Design Philosophy: Ordinals-Style Reader Model](#14-design-philosophy-ordinals-style-reader-model)
15. [Anti-Cheat Hardening Notes](#15-anti-cheat-hardening-notes)
16. [Card XP, Leveling & Evolution System](#16-card-xp-leveling--evolution-system)
17. [Multisig Governance (Genesis & Authority)](#17-multisig-governance-genesis--authority)
18. [Treasury Multisig & Fund Management](#18-treasury-multisig--fund-management)

---

## 1. System Overview

Ragnarok uses Hive Layer 1 custom JSON operations as an immutable ledger for card ownership. There are no smart contracts, no Hive-Engine dependency, and no ongoing server involvement after the genesis distribution.

### Core Principle

```text
Blockchain = the ledger (what happened, immutable)
Reader     = the interpreter (runs IN the browser, open-source, deterministic)
Client     = the UI + reader + verifier (what you see, WASM-verified)
P2P        = the gameplay (what you do, cryptographically signed)
```

**Zero-cost model:** No servers, no databases, no hosted services. Every player's browser replays the chain and maintains its own local copy of the ownership ledger in IndexedDB. Public Hive API nodes (free) provide chain data.

### Trust Model

| Actor | Can do | Cannot do |
|---|---|---|
| Ragnarok account | Mint during genesis window only | Mint after seal, move player cards |
| Players | Transfer cards, open packs, claim rewards | Transfer cards they don't own, claim unearned rewards |
| Reader | Interpret ownership from chain | Override chain history |
| Anyone | Audit all transactions | Falsify Hive blockchain history |

**Admin lifecycle:** Genesis (one broadcast) -> Seal (one broadcast) -> Admin key permanently irrelevant. All ongoing operations (packs, rewards, transfers, matches) are player-driven.

---

## 2. Layer 1 NFT Architecture

### Why not Hive-Engine?

Hive-Engine is a second layer with its own nodes, fees, and upgrade paths. For a **fixed-supply, sealed collection** that never needs rule changes after launch, a deterministic L1 reader is simpler and more trustworthy — there is no team that can later upgrade the contract.

### Custom JSON App ID

All Ragnarok transactions use a single app identifier:

```
app id: "ragnarok-cards"
```

This namespaces all operations. Any Hive node can filter for this app ID and reconstruct full ownership history from block 0.

### Operation Types

```json
// v1.0 Base Protocol (14 canonical ops)
{ "app": "ragnarok-cards", "action": "genesis",        ... }  // Admin: set supply caps (one-time)
{ "app": "ragnarok-cards", "action": "mint",           ... }  // Admin: batch mint (pre-seal only)
{ "app": "ragnarok-cards", "action": "seal",           ... }  // Admin: permanently lock minting (one-time)
{ "app": "ragnarok-cards", "action": "transfer",       ... }  // Player: move card to another account
{ "app": "ragnarok-cards", "action": "burn",           ... }  // Player: permanently remove card
{ "app": "ragnarok-cards", "action": "pack_commit",    ... }  // Player: commit to pack open (salt hash)
{ "app": "ragnarok-cards", "action": "pack_reveal",    ... }  // Player: reveal salt → derive cards
{ "app": "ragnarok-cards", "action": "reward_claim",   ... }  // Player: claim milestone reward (self-serve)
{ "app": "ragnarok-cards", "action": "match_anchor",   ... }  // Player: dual-sig match anchor
{ "app": "ragnarok-cards", "action": "match_result",   ... }  // Player: record match + derive ELO/RUNE/XP
{ "app": "ragnarok-cards", "action": "level_up",       ... }  // Player: stamp card level-up (XP-gated)
{ "app": "ragnarok-cards", "action": "queue_join",     ... }  // Player: enter matchmaking queue
{ "app": "ragnarok-cards", "action": "queue_leave",    ... }  // Player: leave matchmaking queue
{ "app": "ragnarok-cards", "action": "slash_evidence", ... }  // Anyone: permissionless cheat report

// v1.1 Extensions (7 new ops — see ATOMIC_NFT_PACKS_DESIGN.md)
{ "app": "ragnarok-cards", "action": "pack_mint",       ... }  // Admin: create sealed pack NFTs
{ "app": "ragnarok-cards", "action": "pack_distribute",  ... }  // Admin: distribute packs to player (atomic 0.001 HIVE)
{ "app": "ragnarok-cards", "action": "pack_transfer",    ... }  // Player: trade/gift sealed pack (atomic 0.001 HIVE)
{ "app": "ragnarok-cards", "action": "pack_burn",        ... }  // Player: open pack (burn NFT → derive cards from DNA)
{ "app": "ragnarok-cards", "action": "card_replicate",   ... }  // Player: clone card (same genotype, new phenotype)
{ "app": "ragnarok-cards", "action": "card_merge",       ... }  // Player: merge 2 same-origin cards → ascended card
{ "app": "ragnarok-cards", "action": "card_transfer",    ... }  // Player: transfer card (atomic 0.001 HIVE, v1.1)
```

21 operation types total (14 base + 7 extensions). The reader processes these in block order. State is fully reproducible by replaying from block 0. See [RAGNAROK_PROTOCOL_V1.md](RAGNAROK_PROTOCOL_V1.md) for the frozen v1.0 spec and [ATOMIC_NFT_PACKS_DESIGN.md](ATOMIC_NFT_PACKS_DESIGN.md) for the v1.1 design.

---

## 3. Genesis Distribution

### 3.1 Genesis Broadcast (one-time, ever)

The Ragnarok account broadcasts a single genesis transaction before any minting begins. This defines the entire supply forever.

```json
{
  "app": "ragnarok-cards",
  "action": "genesis",
  "version": "1.0",
  "supply_per_card": {
    "common":      2000,
    "rare":        1000,
    "epic":         500,
    "mythic":       250
  },
  "reader_hash": "sha256:<hash_of_reader_source>"
}
```

**What this commits to:**

- Supply is hard-capped per card: 2,000 common, 1,000 rare, 500 epic, 250 mythic (~2.7M total NFTs)
- The reader version that interprets ownership is pinned by hash
- Supply counters enforce caps per rarity — even from the Ragnarok account

### 3.2 Mint Batch (admin only, pre-seal)

The Ragnarok account can batch mint cards before seal. After seal, no more admin mints ever.

```json
{
  "app": "ragnarok-cards",
  "action": "mint",
  "to": "player_hive_account",
  "pack_id": "pack-20240101-00001",
  "cards": [
    { "nft_id": "gen1-common-000001", "card_id": "einherjar-warrior", "rarity": "common" },
    { "nft_id": "gen1-common-000002", "card_id": "valkyrie-shield",   "rarity": "common" },
    { "nft_id": "gen1-rare-000001",   "card_id": "odin-allfather",    "rarity": "rare"   }
  ]
}
```

**Key properties:**
- `nft_id` is globally unique and never reused
- The reader tracks running totals per rarity — mint rejected if cap exceeded
- Only transactions broadcast by the Ragnarok account are valid mints; anyone else's mint is ignored

### 3.3 Pack Opening (player self-serve, no admin key)

Players broadcast `rp_pack_open` with their own Keychain. Cards are deterministically generated by the replay engine using an LCG seeded from the transaction ID. No admin account involved.

```json
{
  "app": "ragnarok-cards",
  "action": "pack_open",
  "pack_type": "standard",
  "quantity": 1
}
```

The replay engine derives card IDs, rarities, and foil status from the trxId seed. Card metadata (name, type, race, image) is resolved from the card registry at mint time. Supply caps are enforced per card.

### 3.4 Reward Claiming (player self-serve, no admin key)

Players broadcast `rp_reward_claim` to claim milestone rewards. The replay engine verifies their on-chain stats (wins, ELO, matches played) and mints the reward card directly to them.

```json
{
  "app": "ragnarok-cards",
  "action": "reward_claim",
  "reward_id": "champion_50"
}
```

11 milestone rewards are defined in `tournamentRewards.ts`: 5 win-based, 3 ELO-based, 2 matches-played. Each can only be claimed once per account. Reward cards mint from the same supply pool as packs.

### 3.5 Seal Broadcast (one-time, permanent)

After genesis, Ragnarok broadcasts seal to permanently lock admin minting:

```json
{
  "app": "ragnarok-cards",
  "action": "seal"
}
```

After this block, the reader hard-ignores all future `rp_mint` operations from any account. The Ragnarok account's signing key is now irrelevant. Pack opening and reward claiming continue to work — they are player-driven and don't require admin authority.

---

## 4. In-Browser Chain Replay Engine

### 4.1 Zero-Cost Architecture

There is no server. Every player's browser IS the reader. The replay engine:
1. Calls `condenser_api.get_account_history` on **public Hive API nodes** (free, no auth)
2. Filters for `app: "ragnarok-cards"` custom JSON operations
3. Applies the ruleset defined in the genesis broadcast
4. Stores derived state in **IndexedDB** (player's local browser storage)
5. Exposes ownership/collection queries to the game client via a local API module

**Cost: $0/month.** No servers, no databases, no hosted services. Public Hive API nodes are free community infrastructure run by Hive witnesses.

### 4.2 Reader Rules (encoded in v1.0)

```
VALID mint:           broadcaster == ragnarok_account AND pre-seal AND supply not exhausted
VALID transfer:       broadcaster == from_account AND nft_id owned by from_account
VALID burn:           broadcaster == owner_account AND nft_id owned by owner_account
VALID pack_open:      supply not exhausted (deterministic LCG mint from trxId seed)
VALID reward_claim:   reward exists AND not already claimed AND condition met (wins/ELO/matches)
VALID match_start:    broadcaster == one of { player_a, player_b } AND valid PoW AND no duplicate match_id
VALID match_result:   broadcaster == one of { winner, loser } AND valid PoW AND valid nonce
VALID level_up:       broadcaster == card owner AND chain-derived XP sufficient for claimed level
VALID queue_join:     valid PoW AND no existing active queue entry for this account
VALID queue_leave:    broadcaster has active queue entry
VALID slash_evidence: anyone can submit; tx_a and tx_b must be verifiable contradictory ops by same account
INVALID:              anything else — silently ignored, no state change
```

**PoW validation:** Every `match_start`, `match_result`, and `queue_join` op must include a valid proof-of-work field. The replay engine verifies the PoW before processing. Ops without valid PoW are silently ignored (see Section 8.4).

These rules are fixed at genesis. The reader source code version is pinned by hash in the genesis broadcast. Anyone can verify the game client runs the canonical reader logic.

### 4.3 IndexedDB Schema

Database: `ragnarok-chain-v1` version 6, with 13 object stores:

```typescript
// Stored locally in each player's browser via IndexedDB

// cards (keyed by uid) — NFT card assets
interface HiveCardAsset {
  uid: string;            // PRIMARY KEY — e.g. "trxId-0" or "reward-first_victory-alice-0"
  cardId: number;         // numeric card definition ID
  ownerId: string;        // current Hive username
  edition: 'alpha' | 'beta' | 'promo';
  foil: 'standard' | 'gold';
  rarity: string;
  level: number;
  xp: number;
  lastTransferBlock?: number;
  name: string;           // card name from registry
  type: string;           // minion, spell, weapon, hero
  race?: string;          // beast, dragon, etc.
  image?: string;         // CDN art URL
}

// supply_counters (keyed by rarity)
interface SupplyCounter { rarity: string; cap: number; minted: number; }

// genesis_state (keyed by 'singleton')
interface GenesisState {
  version: string; totalSupply: number; cardDistribution: Record<string, number>;
  sealed: boolean; sealedAtBlock: number | null; readerHash: string; genesisBlock: number;
}

// matches (keyed by matchId, indexed by participants[])
interface HiveMatchResult { matchId: string; player1: {...}; player2: {...}; winnerId: string; ... }

// match_anchors (keyed by matchId)
interface MatchAnchor { matchId: string; playerA: string; playerB: string; dualAnchored: boolean; ... }

// elo_ratings (keyed by account)
interface EloRating { account: string; elo: number; wins: number; losses: number; lastMatchBlock: number; }

// token_balances (keyed by hiveUsername)
interface HiveTokenBalance { hiveUsername: string; RUNE: number; VALKYRIE: number; SEASON_POINTS: number; }

// reward_claims (keyed by claimKey = account:rewardId)
interface RewardClaim { claimKey: string; account: string; rewardId: string; claimedAt: number; blockNum: number; }

// Also: sync_cursors, queue_entries, slashed_accounts, player_nonces, pending_slashes
```

### 4.4 Replay Engine Flow

```
Game client launches
        │
        ▼
Read SyncMeta from IndexedDB
   → lastProcessedBlock = N (or GENESIS_BLOCK on first run)
        │
        ▼
Call condenser_api.get_account_history("ragnarok-cards-account", ...)
   → Returns all custom_json ops from block N+1 to chain head
   → Uses public API nodes: api.hive.blog, api.deathwing.me, etc.
        │
        ▼
For each op (in block order):
   ├── action: "genesis"       → Initialize supply counters (admin only, one-time)
   ├── action: "mint"          → Batch mint NFTs, increment supply (admin only, pre-seal)
   ├── action: "seal"          → Set sealed = true, lock minting permanently (admin only)
   ├── action: "transfer"      → Update card owner (sender must own card)
   ├── action: "burn"          → Delete card (owner only)
   ├── action: "pack_open"     → Deterministic LCG mint from trxId seed (player self-serve)
   ├── action: "reward_claim"  → Verify stats, mint reward card (player self-serve)
   ├── action: "match_start"   → Validate PoW, insert dual-sig MatchAnchor
   ├── action: "match_result"  → Validate PoW + nonce + sigs, derive ELO/RUNE/XP
   ├── action: "level_up"      → Validate XP threshold, stamp card level
   ├── action: "queue_join"    → Validate PoW, add to matchmaking queue
   ├── action: "queue_leave"   → Remove from matchmaking queue
   ├── action: "slash_evidence" → Verify contradictory ops, ban offender
   └── anything else           → Silently ignored
        │
        ▼
Update SyncMeta.lastProcessedBlock = chain head
        │
        ▼
Game queries IndexedDB for collection/ownership — instant, local reads
```

### 4.5 Performance

| Scenario | Time | Data |
|---|---|---|
| First-ever sync (500K cards minted) | ~30-60 seconds | ~50MB of ops |
| Returning player (1 day behind) | ~2-5 seconds | ~1MB of ops |
| Already synced | Instant | 0 (read IndexedDB) |

**Why this is fast enough:**
- `get_account_history` returns only the game account's ops — not the entire blockchain
- IndexedDB persists across sessions — only catch up from where you left off
- Background sync after initial load — game is playable while syncing

### 4.6 Redundancy & Trust

Every player running the game has an independent copy of the ownership ledger. No single reader can lie — any player can verify any other player's collection by replaying the same chain data.

If a public API node is slow or down, the client falls back to the next node in the list. Since all nodes serve the same immutable chain, they all return the same data.

```typescript
const API_NODES = [
  'https://api.hive.blog',
  'https://api.deathwing.me',
  'https://api.openhive.network',
  'https://rpc.mahdiyari.info',
];
// Client tries each in order, falls back on timeout/error
```

---

## 5. Player-Signed Transfers

Once a card is in a player's account, only they can move it. No third party signature is involved.

### 5.1 Transfer

Player signs and broadcasts directly via Hive Keychain:

```json
{
  "app": "ragnarok-cards",
  "action": "transfer",
  "nft_id": "gen1-rare-000001",
  "from": "player_alice",
  "to": "player_bob",
  "memo": "traded for einherjar-warrior"
}
```

The operation must be broadcast from `player_alice`'s account (Hive verifies the signature). The reader updates ownership to `player_bob`.

### 5.2 Burn (optional)

```json
{
  "app": "ragnarok-cards",
  "action": "burn",
  "nft_id": "gen1-common-000042",
  "reason": "eitr_conversion"
}
```

Burned cards are removed from circulation permanently. Total circulating supply decreases. This could be used for crafting mechanics.

### 5.3 Deck Verification Before Match

Before a P2P match begins, both players prove they own the cards in their deck:

```
For each card in player's deck:
  Query reader: GET /verify/:nft_id/:hive_account → { owns: true }

If any card returns owns: false → deck is invalid → match refused
```

This happens at match handshake, enforced by both clients. A player cannot use cards they don't own.

In local mode (`VITE_DATA_LAYER_MODE=local`), deck building is unrestricted. In Hive mode, `heroDeckStore.ts` checks `useHiveDataStore.cardCollection` and rejects cards exceeding the player's owned NFT copies.

### 5.4 NFT Provenance & Explorer Links

Every `HiveCardAsset` stores on-chain provenance:

| Field | Set by | Description |
|---|---|---|
| `mintTrxId` | `applyMint()` | Transaction ID when card was minted |
| `mintBlockNum` | `applyMint()` | Block number when card was minted |
| `lastTransferTrxId` | `applyCardTransfer()` | Transaction ID of most recent transfer |
| `lastTransferBlock` | `applyCardTransfer()` | Block number of most recent transfer |

The `NFTProvenanceViewer.tsx` component displays this metadata with clickable links to the Hive explorer (`hivehub.dev/tx/{trxId}` and `hivehub.dev/b/{blockNum}`), generated by `explorerLinks.ts`.

### 5.5 Direct Card Gifting

Players can send cards directly to friends without trade negotiation:

1. Open Collection → click card → **"Send to Friend"** button
2. `SendCardModal.tsx` validates recipient (Hive username regex, no self-transfer)
3. Optional memo field
4. Double-confirm safety (first click shows warning, second click signs)
5. `hiveSync.transferCard(uid, recipient, memo)` broadcasts `rp_card_transfer` via Keychain
6. On success: `HiveDataStore.removeCard()` + `hiveEvents.emitCardTransferred()` → toast notification

### 5.6 Real-Time Event Broadcasting

`HiveEvents.ts` provides a lightweight event bus for chain state changes:

| Event | Emitted by | Consumed by |
|---|---|---|
| `card:transferred` | `SendCardModal`, `tradeStore`, `replayRules` | `gameStoreIntegration` (toast) |
| `token:updated` | `BlockchainSubscriber` (RUNE rewards) | `gameStoreIntegration` (toast) |
| `transaction:confirmed` | `transactionProcessor` | `gameStoreIntegration` (toast) |
| `transaction:failed` | `transactionProcessor` | `gameStoreIntegration` (toast) |

### 5.7 Post-Match State Refresh

After each match, `BlockchainSubscriber.ts`:
1. Packages match result → transaction queue → Hive broadcast
2. Applies XP to cards in IndexedDB, stamps level-ups on chain
3. Calls `refreshHiveDataStoreFromIDB()` — re-reads IndexedDB → Zustand (cards, ELO, tokens)
4. Awards RUNE tokens: +10 win, +3 loss for ranked matches
5. Emits `token:updated` event → toast notification

### 5.8 Reward Claiming on Chain

Campaign mission rewards and daily quest rewards broadcast `reward_claim` via `hiveSync.claimReward()`:
- `campaignStore.claimReward()` → `hiveSync.claimReward('campaign:{missionId}')`
- `dailyQuestStore.claimReward()` → `hiveSync.claimReward('daily_quest:{questId}')`

All chain broadcasts are gated behind `isHiveMode()` — zero impact in local/test mode.

---

## 6. WASM Game Logic Module

### 6.1 Why WASM

JavaScript can be modified by the player. WASM compiled from source has a content hash — modify one byte and the hash changes. Both clients verify they're running identical game logic before accepting moves from each other.

### 6.2 What Goes in WASM

The WASM module contains all **deterministic game rules**:

```
ragnarok-engine.wasm:
  - Card effect resolution
  - Attack/damage calculation
  - Poker hand evaluation
  - Mana cost validation
  - Legal move checking
  - State transition function: (GameState, Move) → GameState
```

What stays in React/TypeScript (UI only):
- Rendering
- Animations
- Sound
- User input handling
- Network messaging

### 6.3 WASM Hash Verification at Handshake

```typescript
// At P2P connection
async function verifyEngineVersion(peer: DataConnection) {
  const myHash = await computeWasmHash('/ragnarok-engine.wasm');

  // Fetch canonical hash from Hive (or HAF reader)
  const canonicalHash = await reader.getGenesisField('wasm_hash');

  if (myHash !== canonicalHash) {
    throw new Error('Game engine mismatch — update your client');
  }

  // Exchange hashes with peer
  peer.send({ type: 'engine_handshake', wasm_hash: myHash });

  const peerHash = await waitForPeerHash(peer);
  if (peerHash !== myHash) {
    throw new Error('Peer running different engine version');
  }
}
```

### 6.4 Existing Code Migration

The following files in the current codebase are candidates for WASM extraction:

| Current file | WASM candidate |
|---|---|
| `game/utils/gameUtils.ts` | Core state machine |
| `game/stores/combat/pokerCombatSlice.ts` | Poker resolution |
| `game/combat/modules/BettingEngine.ts` | Betting rules |
| `game/combat/modules/SmartAI.ts` | AI (for offline play) |

The React stores (`gameStore.ts`, `pokerCombatSlice.ts`) become thin wrappers that call into WASM and reflect the returned state.

---

## 7. Cryptographic Match Protocol

This eliminates the 1v1 consensus problem. Neither player can fake a game result without the other's cryptographic cooperation.

### 7.0 Match Anchor (`match_start`) — Before Gameplay Begins

Before any cards are dealt, both players broadcast a `match_start` transaction to Hive. This creates an immutable on-chain proof that a match was initiated, binding both accounts and the battle ID with a cryptographic hash.

**Why this is needed:**
- Without a `match_start`, there's no on-chain proof a match was ever initiated — only the result exists
- If a player disconnects, the opponent has no on-chain evidence the match started
- Enables disconnect accountability: if `match_start` exists but no `match_result`, the replay engine can flag the disconnector

**Dual-signature anchor (both players broadcast independently):**

```json
{
  "app": "ragnarok-cards",
  "action": "match_start",
  "match_id": "match-20260223-alice-bob-001",
  "player_a": "alice",
  "player_b": "bob",
  "match_hash": "sha256:0x...",
  "deck_hash_a": "sha256:0x...",
  "deck_hash_b": "sha256:0x...",
  "timestamp": 1707350000,
  "pow": {
    "nonces": [12847, 9234, 45123, 7891, 33201, 4102],
    "count": 32,
    "difficulty": 4
  }
}
```

**`match_hash` computation:**
```typescript
match_hash = sha256(match_id + player_a + player_b + timestamp)
```

Both players must agree on the same `match_id` and `match_hash` — the P2P handshake generates these deterministically. Each player then broadcasts their own `match_start` via Hive Keychain.

**Flow:**

```text
P2P handshake completes (WebRTC connection open)
        │
        ▼
Both clients agree on match_id, match_hash (deterministic from handshake)
        │
        ├──── Alice's client ──────────────┐
        │                                   │
        ▼                                   ▼
Alice computes PoW for match_start    Bob computes PoW for match_start
Alice broadcasts via Keychain         Bob broadcasts via Keychain
        │                                   │
        ▼                                   ▼
Both ops appear on Hive (within 3-6 seconds, one block apart at worst)
        │
        ▼
Both clients verify the other's match_start appeared on-chain
   → Proceed to deck commitment (Section 7.1)
        │
        ▼
If opponent's match_start does NOT appear within 30 seconds:
   → Match aborted — the anchored player has on-chain proof they showed up
```

**Replay engine rules for `match_start`:**
- Must include a valid PoW (see Section 8.4)
- `match_id` must not already exist as a dual-anchored match
- Both `player_a` and `player_b` must broadcast matching `match_id` and `match_hash`
- A `match_start` with only one player's broadcast is stored but flagged as incomplete
- `match_result` ops are only valid if a dual-anchored `match_start` exists for that `match_id`

### 7.1 Deck Commitment (before cards are revealed)

```
Step 1: Each player commits to their deck seed before the match

  Alice: H(seed_A) = sha256("alice_random_salt_12345")
  Bob:   H(seed_B) = sha256("bob_random_salt_67890")

  Alice broadcasts H(seed_A) to Bob (and optionally to Hive)
  Bob broadcasts H(seed_B) to Alice

Step 2: Both players reveal their seeds

  Alice reveals: seed_A = "alice_random_salt_12345"
  Bob reveals:   seed_B = "bob_random_salt_67890"

  Bob verifies: sha256(seed_A) == H(seed_A) they received
  Alice verifies: sha256(seed_B) == H(seed_B) they received

Step 3: Final game seed = sha256(seed_A + seed_B)

  Neither player could have predicted this before the reveal.
  Neither player can manipulate it without the other detecting the fraud.
```

This determines the card draw order. Neither player controls randomness.

### 7.2 Move Signing (during gameplay)

Every game action is signed by the acting player and countersigned by the opponent:

```typescript
interface SignedMove {
  move_id:         number;              // Sequential
  player:          'alice' | 'bob';
  action:          GameAction;          // play_card, attack, end_turn, etc.
  prev_state_hash: string;             // sha256 of state before this move
  new_state_hash:  string;             // sha256 of state after this move
  hive_block_ref:  string;             // sha256 of recent Hive block header — temporal anchor
  player_sig:      string;             // Acting player's signature
  opponent_sig?:   string;             // Opponent confirms state transition
}
```

**`hive_block_ref` purpose:** Each move is anchored to the most recent Hive block at the time of the move. This:
- Proves the move happened **after** that block (cannot be pre-computed offline)
- Creates a wall-clock timeline for every move — critical for disconnect disputes
- Prevents pre-computed move sequences (the block hash didn't exist when the attack could have been pre-planned)

Opponent signs only after their local WASM produces the same `new_state_hash`. If hashes disagree, a cheating attempt is detected and the match is terminated.

### 7.3 Match Transcript (Merkle Tree)

The complete ordered list of `SignedMove` objects is the match transcript. Rather than a single flat hash, moves are organized into a **Merkle tree**:

```
transcript_merkle_root = MerkleRoot([
  sha256(move_0),
  sha256(move_1),
  ...
  sha256(move_N)
])
```

**Why Merkle over a flat hash:**

| Property | Flat hash | Merkle tree |
|---|---|---|
| Verify entire transcript | Yes | Yes |
| Verify single move without full transcript | No | Yes (~7 hashes) |
| Dispute resolution (submit only disputed moves) | No | Yes |
| Proof size for 128-move game | Full transcript | ~7 × 32 bytes |

**For dispute resolution:** If Player A claims move #42 was illegal, they submit:
1. `SignedMove` #42 (the disputed move)
2. A Merkle proof (7 sibling hashes) proving move #42 is in the agreed root
3. The root is already on-chain in the `match_result`

Any observer can verify the proof without downloading the full game. The transcript is:

- Self-verifying (each move references the previous state hash)
- Mutually authenticated (both signatures on every state)
- Replay-auditable (anyone can reconstruct the full game)
- Partially verifiable (Merkle proofs for individual moves)

### 7.4 Result Broadcast to Hive

At game end, both players co-sign the result. **A `match_result` is only valid if a dual-anchored `match_start` exists for that `match_id`.**

```json
{
  "app": "ragnarok-cards",
  "action": "match_result",
  "match_id": "match-20240101-alice-bob-001",
  "winner": "alice",
  "loser": "bob",
  "final_state_hash": "sha256:0xABCDEF...",
  "transcript_merkle_root": "sha256:0x123456...",
  "move_count": 87,
  "alice_sig": "...",
  "bob_sig": "...",
  "played_at_block": 89234600,
  "pow": {
    "nonces": [9182, 43201, 7823, 55102, 12947, 890],
    "count": 64,
    "difficulty": 4
  }
}
```

**`transcript_merkle_root`** is the root of a Merkle tree over all `SignedMove` hashes (see Section 7.3). This replaces the old flat `transcript_hash` and enables partial transcript verification without downloading the full game log.

This goes on Hive as an immutable record. Ladder rankings, ban systems, and reward distributions read from this log. A result is ignored by the reader if:

- It lacks both player signatures (dual-signed requirement)
- No matching dual-anchored `match_start` exists for the `match_id`
- The PoW is missing or invalid (see Section 8.4)

### 7.5 Dispute: One Player Disconnects

The `match_start` anchor enables provable disconnect accountability:

```text
Case 1: match_start exists (dual-anchored) but NO match_result
   → Both players showed up, one disconnected mid-game
   → The remaining player broadcasts a partial transcript with their signature
   → Replay engine sees: dual match_start + single-signed partial result
   → Disconnector's account flagged with a penalty (configurable)

Case 2: match_start from Player A only (not dual-anchored)
   → Player B never showed up or connected too late
   → No penalty — match simply never started
   → Player A's queue entry is released

Case 3: match_start (dual-anchored) + match_result (dual-signed)
   → Normal completed match — no dispute
```

The `match_start` anchor is what makes disconnect detection trustworthy. Without it, a malicious player could claim their opponent disconnected when no match ever happened.

---

## 8. Anti-Cheat Design

### 8.1 Threat Model

| Attack | Defense |
|---|---|
| Modified client accepts illegal moves | Opponent's WASM rejects → refuses to countersign → match stalls |
| Client reports false match result | Requires opponent's co-signature → impossible without collusion |
| Replay attack (reuse old transcript) | match_id includes block hash + timestamp, unique per match |
| Sybil attack (fake accounts) | Hive account creation has PoW cost; karma/RC system |
| Deck cheating (using unowned cards) | Deck verified against reader at handshake before match starts |
| Randomness manipulation | Commit-reveal scheme — neither player controls the seed |
| Bot spam (mass fake queue ops) | Multi-challenge PoW (32×4-bit, parallelized) — computational cost deters automation at scale |
| Fake disconnect claims | `match_start` anchor proves whether a match was actually initiated |
| Result without match | `match_result` rejected by replay engine unless dual-anchored `match_start` exists |
| Pre-computed move sequences | `hive_block_ref` in every `SignedMove` — block hash didn't exist when attack was pre-planned |
| Double-broadcast fraud (contradictory results) | Anyone can submit `slash_evidence` citing two conflicting on-chain ops — auto-ban, permissionless |
| Single-move dispute (claim illegal move) | Merkle proof for that move alone — no need to submit full transcript |

### 8.2 What Client-Side Checks Still Do

Client-side SHA checks on the WASM module are **not a security guarantee** — a determined attacker can modify them. They serve a different purpose:

- **Deterrence**: Most players won't bother modifying their client
- **Accident prevention**: Detects outdated clients automatically
- **UX**: Gives a clear error message when the client is wrong version

Security comes from the **cryptographic protocol** (opponent won't countersign illegal moves), not from the hash check.

### 8.3 Ban System

```json
{
  "app": "ragnarok-cards",
  "action": "flag_account",
  "account": "cheater_hive",
  "reason": "invalid_transcript_submitted",
  "evidence_tx": "abc123def456",
  "banned_by": "ragnarok-account"
}
```

The game client reads the ban list from Hive at startup. Banned accounts cannot find matches. Ban evidence is public and auditable — anyone can verify the proof.

### 8.4 Client-Side Proof of Work (Anti-Spam)

Every `match_start`, `match_result`, and `queue_join` operation must include a valid proof-of-work. This runs entirely in the player's browser — no server is involved.

**Why PoW:**
- **Anti-bot:** Automating thousands of fake ops becomes computationally expensive
- **Anti-spam:** Each op costs real CPU — a script can't flood the queue with garbage
- **Zero cost to honest players:** Total computation takes <1 second, imperceptible during gameplay
- **No centralization:** Challenges derive deterministically from the payload — no server needed

**Multi-challenge design (inspired by Hashcash, improved with parallelism):**

Instead of one large challenge (single 16-bit problem), we use many small parallel challenges. Same total work, but:

- **Parallelizable via Web Workers** — solved across all available CPU cores simultaneously
- **Predictable timing** — law of large numbers smooths out variance (no unlucky 30-second waits)
- **WASM-friendly** — SHA256 inner loop can run in the game's existing WASM binary

```typescript
interface ProofOfWork {
  nonces:     number[];   // one nonce per sub-challenge
  count:      number;     // number of sub-challenges (32 or 64)
  difficulty: number;     // leading zero bits per challenge (4-6)
}

// Serverless: all challenges derived from payload hash — no server needed
function computePoW(payload: object, count: number, difficulty: number): ProofOfWork {
  // Derive per-challenge seeds deterministically from payload
  const seed = sha256(JSON.stringify(payload, Object.keys(payload).sort()));
  const nonces: number[] = new Array(count);

  // Spawn Web Workers — each worker solves a subset in parallel
  // Single-threaded fallback shown here for clarity:
  for (let i = 0; i < count; i++) {
    const challenge = sha256(seed + ':' + i);
    let nonce = 0;
    while (countLeadingZeroBits(sha256(challenge + ':' + nonce)) < difficulty) nonce++;
    nonces[i] = nonce;
  }
  return { nonces, count, difficulty };
}

function verifyPoW(payload: object, pow: ProofOfWork): boolean {
  const seed = sha256(JSON.stringify(payload, Object.keys(payload).sort()));
  for (let i = 0; i < pow.count; i++) {
    const challenge = sha256(seed + ':' + i);
    const hash = sha256(challenge + ':' + pow.nonces[i]);
    if (countLeadingZeroBits(hash) < pow.difficulty) return false;
  }
  return true;
}
```

**Difficulty tiers:**

| Operation | Sub-challenges | Bits each | Total work (avg hashes) | Wall time |
|---|---|---|---|---|
| `queue_join` | 32 | 4 | 32 × 8 = 256 | <0.1s |
| `match_start` | 32 | 4 | 32 × 8 = 256 | <0.1s |
| `match_result` | 64 | 6 | 64 × 32 = 2,048 | ~0.5s |

**Why this is resistant to ASICs/GPUs:** A single attacker with GPU hardware can solve large single challenges very fast. Many small independent challenges don't parallelize as efficiently on GPU — each challenge requires a separate seed derivation. A bot farm would need one SHA256 computation per challenge per op, making mass automation linearly expensive.

**Replay engine enforcement:** Verifies all `count` nonces independently. Any nonce that fails the leading-zero check invalidates the entire op — silently ignored, no state change.

### 8.5 Slash Conditions (Permissionless Double-Broadcast Detection)

If any player submits contradictory on-chain ops (e.g., broadcasts two different `match_result` ops for overlapping matches, or claims to be in two queue positions simultaneously), **any observer** — not just the Ragnarok account — can submit slash evidence:

```json
{
  "app": "ragnarok-cards",
  "action": "slash_evidence",
  "account": "cheater_hive",
  "tx_a": "abc123def456",
  "tx_b": "def456abc123",
  "reason": "contradictory_match_results",
  "submitted_by": "honest_observer"
}
```

**Replay engine behavior on valid slash evidence:**

```text
1. Fetch tx_a and tx_b from chain — verify both are real
2. Verify both ops are signed by `account`
3. Check contradiction logic for the `reason` type:
   contradictory_match_results → same match_id, different winner
   double_queue_entry          → two active queue_join with no queue_leave between
   deck_hash_mismatch          → match_result deck_hash differs from match_start deck_hash
4. If contradiction confirmed → mark account as slashed in IndexedDB
5. Slashed accounts cannot find matches, cannot join queue
```

**Why this is powerful:**
- **Permissionless:** Any honest player who spots a contradiction can submit evidence — no admin needed
- **Trustless:** The replay engine verifies the proof independently, from on-chain data only
- **Automatic:** Slashing happens at the IndexedDB level — no central ban list to corrupt
- **Incentive-compatible:** Honest players are motivated to submit evidence (cleans up the pool)
- **Ethereum analogy:** Same mechanism as PoS slashing — provable misbehavior = automatic penalty

---

## 9. P2P Integration with Existing Architecture

The game currently uses PeerJS (WebRTC) for P2P. The Hive layer adds on-chain matchmaking and deck verification — all running in the player's browser with zero server involvement.

```
Current flow:
  Player A ←──── WebRTC (PeerJS) ────→ Player B

New flow:
  Player A ←──── WebRTC (PeerJS) ────→ Player B
       │                                      │
       └──── Hive L1 (match result) ──────────┘
       │                                      │
       └──── Local IndexedDB (deck verify) ───┘
       │                                      │
       └──── Hive L1 (matchmaking queue) ─────┘
```

### 9.1 On-Chain Matchmaking (Replaces Express Server)

The current Express matchmaking server is replaced with Hive custom_json operations. No server needed.

**Queue join:**
```json
{
  "app": "ragnarok-cards",
  "action": "queue_join",
  "mode": "ranked",
  "elo": 1200,
  "peer_id": "peerjs-uuid-abc123",
  "deck_hash": "sha256:0x...",
  "timestamp": 1707350000,
  "pow": {
    "nonces": [4821, 19203, 7741, 33012, 9982, 15634],
    "count": 32,
    "difficulty": 4
  }
}
```

**Queue leave:**
```json
{
  "app": "ragnarok-cards",
  "action": "queue_leave"
}
```

**How matching works:**
1. Player broadcasts `queue_join` via Hive Keychain (costs only RC, no fees)
2. Every game client polls recent `ragnarok-cards` ops (or subscribes via `condenser_api`)
3. Client sees another player in the queue with compatible ELO → initiates WebRTC connection using the `peer_id` from the queue op
4. Both players verify each other's deck ownership locally (IndexedDB lookup)
5. Match begins via existing PeerJS P2P flow

**Latency:** Hive blocks are 3 seconds apart. Worst case, a queue_join takes 3 seconds to appear. Acceptable for ranked matchmaking.

**Fallback:** For instant casual matches, players can still share PeerJS peer IDs directly (invite link). On-chain matchmaking is only needed for anonymous ranked queue.

### 9.2 Local Deck Verification (Replaces Reader API)

```typescript
// Runs entirely in the player's browser — no server call
async function verifyDeckOwnership(
  hiveAccount: string,
  deck: CardInstance[]
): Promise<boolean> {
  const db = await openReplayDB(); // IndexedDB
  for (const card of deck) {
    if (!card.nft_id) continue; // Skip non-NFT cards (dev mode)
    const ownership = await db.get('nft_ownership', card.nft_id);
    if (!ownership || ownership.ownerAccount !== hiveAccount) return false;
  }
  return true;
}
```

Both players verify each other's deck at P2P handshake. If either player's deck contains cards they don't own (according to the local chain replay), the match is refused.

### 9.3 P2P Message Protocol Extension

Add to existing `useP2PSync.ts` message types:

```typescript
type P2PMessage =
  | { type: 'engine_handshake'; wasm_hash: string; hive_account: string }
  | { type: 'match_anchor';     match_id: string; match_hash: string }
  | { type: 'match_anchor_ack'; tx_id: string }
  | { type: 'deck_commit';      deck_hash: string; deck_nft_ids: string[] }
  | { type: 'seed_commit';      seed_hash: string }
  | { type: 'seed_reveal';      seed: string }
  | { type: 'signed_move';      move: SignedMove }
  | { type: 'match_result';     result: SignedResult }
  // ... existing message types
```

### 9.4 Non-Breaking: NFT Cards Alongside Normal Cards

During the transition period, not all cards need to be NFTs. Add `nft_id?: string` to the card instance type:

```typescript
interface CardInstance {
  // ... existing fields
  nft_id?: string;  // Present if this is a Hive NFT card; absent for demo/dev cards
}
```

The deck verifier skips cards without `nft_id`. This lets the game run in both modes:

- **Dev/demo mode**: All cards, no blockchain
- **NFT mode**: Deck must be verified on-chain before ranked matches

---

## 10. Community Airdrop & Economy

### 10.1 Distribution Model

This is a **community airdrop, not a for-profit sale**. Cards are distributed freely to players.

```
1. Ragnarok account pre-mints all 500,000 genesis cards via batch mint ops
2. Cards are assigned to airdrop recipients based on:
   - Hive community participation (HP holders, active posters)
   - Early testers and contributors
   - Game launch event participants
3. Each recipient gets a mint batch: { "action": "mint", "to": "recipient", "cards": [...] }
4. After all distribution is complete, broadcast "seal" — no more minting ever
5. Players trade cards peer-to-peer using "transfer" ops signed via Keychain
```

### 10.2 No Token, No Fees

- No game token. No speculation. No Hive Engine.
- Card transfers cost only Hive Resource Credits (free, regenerates with HP)
- The Ragnarok account needs minimal HP for broadcasting mints during genesis
- After the seal, the Ragnarok account's authority is irrelevant

### 10.3 Supply Scarcity by Design

```
Genesis distribution (500,000 total):
  Mythic:      5,000  cards
  Epic:       50,000  cards
  Rare:      150,000  cards
  Common:    295,000  cards

Once sealed: no new cards ever. Scarcity is permanent and verifiable.
Burns reduce circulating supply further (optional crafting mechanic).

This is enforced by every player's replay engine — no one can override it.
```

### 10.4 Secondary Market

Players trade cards freely using Hive Keychain-signed `transfer` ops. The game client can include a built-in trade UI, or players can trade via any Hive-compatible tool that understands the `ragnarok-cards` protocol. No marketplace fees, no intermediary.

---

## 11. Implementation Phases

### Phase 2A — Foundation (COMPLETE)

- [ ] Set up Ragnarok Hive account
- [ ] Write and publish genesis design doc as Hive post (public commitment)
- [x] Build in-browser chain replay engine (TypeScript + IndexedDB)
- [x] Add `nft_id` field to card types (non-breaking)
- [x] Build Hive Keychain connection in client (`HiveSync.ts`)
- [x] Build replay DB (IndexedDB schema + CRUD)
- [x] Build replay rules engine (deterministic op dispatch)
- [x] Build multi-challenge PoW module (`proofOfWork.ts`)
- [x] Build match anchor broadcast (`matchAnchor.ts`)
- [x] Build slash evidence broadcaster (`slashEvidence.ts`)
- [x] Build transaction queue + processor (local/test/hive modes)
- [x] Build card XP system + NFT metadata generator
- [x] Build match result packager (ELO, XP, rune rewards)
- [x] Build mock blockchain server for testing
- [x] Build Keychain login UI component
- [x] Build blockchain subscriber (game end → queue)
- [ ] Test mint/transfer/verify on Hive testnet

### Phase 2B — Match Protocol (COMPLETE)

- [ ] Extract game rule engine to pure TypeScript module (no React deps) — deferred to post-launch; not required for genesis
- [x] Implement multi-challenge PoW module (`proofOfWork.ts`: `computePoW`, `verifyPoW` with Web Workers)
- [x] Implement `match_start` anchor broadcast (dual-sig, with PoW)
- [x] Implement commit-reveal seed exchange (`useP2PSync.ts`: SHA256 commitments, joint seed derivation, seeded PRNG deck shuffle via `seededRng.ts`)
- [x] Implement dual-signature `match_result` (`BlockchainSubscriber.ts`: host signs → proposes via P2P → opponent verifies + counter-signs → ranked matches require dual-sig or are NOT broadcast; `apply.ts` rejects ranked results without both sigs)
- [x] Implement XP derivation from `match_result` (replay engine processes embedded `xpRewards[]` array, updates card XP/level in IndexedDB — no separate `xp_update` ops needed)
- [x] Implement `level_up` on-chain convenience record (auto-broadcast when card crosses level threshold; `replayRules.ts` validates ownership + XP warrants claimed level)
- [x] Implement card evolution scaling (`cardLevelScaling.ts`: NFT XP level → evolution tier (Mortal/Ascended/Divine) → stat/effect/keyword scaling at deck creation; `enrichDeckWithNFTLevels` wires collection into gameplay)
- [x] Implement move recording with hash-chained transcript (`signedMove.ts`: `GameMove` + `MoveRecord` types; `transcriptBuilder.ts`: accumulates moves during gameplay, builds SHA-256 Merkle tree at game end)
- [x] Implement Merkle tree transcript builder (`transcriptBuilder.ts`: binary Merkle tree with inclusion proofs; `TranscriptBuilder.verifyProof()` for dispute verification)
- [x] Implement move transcript protocol in P2P layer (`useP2PSync.ts`: `recordMove()` on every action; both host and client accumulate; `startNewTranscript()`/`clearTranscript()` lifecycle; Merkle root embedded in `PackagedMatchResult.transcriptRoot`)
- [x] Add build-hash verification at P2P handshake (`vite.config.ts` injects `__BUILD_HASH__` from git rev-parse; `version_check` message exchanged on connection; mismatch warns but doesn't block for dev mode)
- [x] Validate transcript root in replay engine (`replayRules.ts`: ranked `match_result` ops rejected if `transcriptRoot` is missing)
- [x] Add PoW and `slash_evidence` processing to replay engine rules

### Phase 2C — Genesis Launch (NEXT — requires mainnet Hive account)

- [ ] Create @ragnarok Hive account
- [ ] Upload card art to CDN/IPFS (559 webp files)
- [ ] Update `NFT_ART_BASE_URL` in `hiveConfig.ts` to production CDN
- [ ] Broadcast genesis transaction via `broadcastGenesis()` (one Keychain click)
- [ ] Broadcast seal via `broadcastSeal()` (one Keychain click)
- [ ] Admin key permanently irrelevant after seal
- [ ] Test mint/transfer/verify on Hive testnet

### Phase 2D — On-Chain Matchmaking & Ladder (COMPLETE)

- [x] Implement on-chain matchmaking queue (`queue_join` / `queue_leave` ops) — `matchmakingOnChain.ts`: PoW broadcast, ELO window matching, 5s poller
- [x] Ban system (on-chain evidence, client-enforced) — `slashEvidence.ts` + `replayRules.ts` blocks slashed accounts at dispatch
- [x] `result_nonce` anti-replay — monotonic per-account nonce in `matchResultPackager` + validated by `applyMatchResult`
- [x] Deck ownership verification at P2P handshake — `deckVerification.ts` + `deck_verify` message in `useP2PSync.ts`
- [x] Ranked ladder UI (`RankedLadderPage.tsx`: leaderboard tab computes ELO rankings from IndexedDB match history; match history tab with win/loss/duration/damage stats; `/ladder` route with homepage nav)
- [x] Dispute resolution (`disputeResolution.ts`: `buildDisputeEvidence()` extracts move + Merkle proof from transcript; `submitMoveDispute()` broadcasts `slash_evidence` with `forged_move` reason; `verifyMoveInTranscript()` for client-side proof validation)

### Phase 2E — Server-Side Chain Indexer (COMPLETE)

- [x] In-memory global chain state with JSON file persistence (`server/services/chainState.ts`)
- [x] Server-side Hive RPC poller for all known accounts (`server/services/chainIndexer.ts`)
- [x] REST endpoints: leaderboard, player profile, ELO, cards, match history, deck verify, register, status (`server/routes/chainRoutes.ts`)
- [x] ELO-proximity matchmaking (±200 expanding to ±500) replacing FIFO queue (`server/routes/matchmakingRoutes.ts`)
- [x] Client fetch wrapper for all chain API endpoints (`client/src/data/chainAPI.ts`)
- [x] Matchmaking wired to pass Hive username for ELO lookup (`useMatchmaking.ts`)
- [x] Opponent ELO lookup from chain indexer at match end (`BlockchainSubscriber.ts`)
- [x] Server-side deck verification cross-check (`useP2PSync.ts`)
- [x] Auto-register both players with indexer after match (`BlockchainSubscriber.ts`)

### Current vs Planned — Accuracy Notes

| Blueprint Section | Status | Notes |
| --- | --- | --- |
| Section 6 (WASM) | **NOT IMPLEMENTED** | Planned for Phase 2C. Game logic runs in TypeScript. Build-hash verification provides version checking. |
| Section 7.2 (Move Signing) | **PARTIAL** | Moves are recorded into a Merkle transcript but NOT individually signed with `player_sig`/`opponent_sig` or block-anchored with `hive_block_ref`. |
| Section 7.4 (Result Broadcast) | **IMPLEMENTED** | Dual-sig with 30s timeout + **cryptographic verification via `hive-tx`**. Replay engine recovers public keys from signatures and checks against Hive account posting keys. |
| Section 8.4 (PoW) | **IMPLEMENTED — REQUIRED** | PoW is now **mandatory** for `match_start`, `match_result`, and `queue_join`. Ops without valid PoW are rejected (not silently ignored). `match_result` uses 64 challenges × 6-bit difficulty. |
| Section 9.1 (On-Chain Matchmaking) | **HYBRID** | Both on-chain (`queue_join`/`queue_leave`) and server-side ELO matchmaking exist. **ELO in queue entries is now chain-derived** (not client-reported). |
| Signature Verification | **IMPLEMENTED** | `hiveSignatureVerifier.ts` uses `hive-tx` to fetch posting keys via `condenser_api.get_accounts` (3-node fallback, 8s timeout, 5-min cache) and verify signatures cryptographically. |
| Slash Evidence Verification | **IMPLEMENTED** | `applySlashEvidence` now fetches referenced transactions from public Hive RPC and verifies both are ragnarok ops from the offender. Unreachable RPC queues to `pending_slashes` IDB store (max 3 retries). |
| ELO Derivation | **CHAIN-DERIVED** | ELO is computed deterministically from `match_result` history (K=32). Stored in `elo_ratings` IDB store. `queue_join` ignores client-reported ELO — uses chain-derived values. |
| RUNE Rewards | **CHAIN-DERIVED + CLAIMABLE** | Match RUNE: derived inside `applyMatchResult` (10 win / 3 loss for ranked). Milestone RUNE: awarded via `rp_reward_claim` alongside reward cards (self-serve). |
| Supply Cap (Pack Open) | **ENFORCED** | `applyPackOpen` checks `getSupplyCounter()` before minting each card. Cards exceeding the cap are skipped. |
| Deck Hash | **SHA-256** | `computeDeckHash` now uses SHA-256 (truncated to 32 hex chars) instead of reversible base64. |
| P2P Turn Validation | **IMPLEMENTED** | Host validates `currentTurn === 'opponent'` before executing remote actions. Messages are queued (not dropped) when busy. AI guard prevents `processAITurn` from running when P2P connected. |
| Invariant #7 (Block-anchored moves) | **NOT IMPLEMENTED** | Per-move `hive_block_ref` is a design goal. Current implementation uses unsigned Merkle transcripts. |
| Invariant #10 (WASM hash) | **NOT IMPLEMENTED** | Uses `__BUILD_HASH__` (git rev-parse) instead. WASM compilation deferred to Phase 2C. |
| Feature Flags | **ENV-VAR DRIVEN** | `VITE_DATA_LAYER_MODE` and `VITE_BLOCKCHAIN_PACKAGING` read from env vars. `.env.production` sets `hive` / `true`. |
| Mock Blockchain Routes | **PRODUCTION-GUARDED** | `mockBlockchainRoutes` only mounted when `NODE_ENV !== 'production'`. |
| Server Rate Limiting | **IMPLEMENTED** | `express-rate-limit` on all `/api` routes: 120 req/min per IP. |
| Matchmaking Auth | **IMPLEMENTED** | Server-side Hive signature verification via `hive-tx`. Validates `ragnarok-queue:{username}:{timestamp}` signed with Posting key. 5-min timestamp drift window. |
| Username Validation | **IMPLEMENTED** | All chain/matchmaking endpoints validate Hive username format (`/^[a-z][a-z0-9.-]{2,15}$/`). |
| Account Registry Cap | **ENFORCED** | Max 10,000 known accounts in server chain indexer. |
| Demo Card Guard | **ENFORCED** | In hive mode, cards without `nft_uid` are excluded from chain packaging. Deck verification rejects non-NFT cards. |
| PoW Web Worker | **IMPLEMENTED** | `computePoW` dispatches to up to 4 Web Workers in parallel. Falls back to serial if Workers unavailable. |
| Poker Hands Won | **WIRED** | `pokerHandsWon` counter tracked per player/opponent in `PokerCombatSlice` and read by `matchResultPackager`. |
| stampLevelUp | **CANONICAL FORMAT** | Uses `broadcastCustomJson` with `ragnarok-cards` app ID instead of legacy `ragnarok_level_up` custom_json id. |
| Dead Code Cleanup | **DONE** | Removed `hashDeck(btoa)`, `generateMatchSeed`, `generateTrxId` from HiveSync. Removed unused multer import from server routes. |

---

## 12. File Structure

Client-side files live alongside the game code. A thin server-side chain indexer provides global state (leaderboard, opponent ELO, cross-account deck verification) that per-account browser replay can't provide.

```
client/src/
├── data/
│   ├── blockchain/                    # Chain replay, PoW, anti-cheat (BUILT)
│   │   ├── types.ts                   # NFT, Transfer, MatchResult, TransactionEntry types
│   │   ├── replayEngine.ts            # Chain replay: fetch ops → apply rules → IndexedDB
│   │   ├── replayRules.ts             # Deterministic rules (v1.0, hash-pinned at genesis)
│   │   ├── replayDB.ts                # IndexedDB schema + queries (ownership, supply, sync)
│   │   ├── proofOfWork.ts             # Multi-challenge PoW: computePoW, verifyPoW
│   │   ├── hashUtils.ts              # SHA256, canonical JSON, match/NFT hashing
│   │   ├── matchAnchor.ts            # match_start broadcast + verification logic
│   │   ├── slashEvidence.ts          # Permissionless slash evidence broadcaster
│   │   ├── transactionQueueStore.ts  # Zustand + persist (IndexedDB/localStorage)
│   │   ├── transactionProcessor.ts   # Mode-aware submission (local/test/hive)
│   │   ├── cardXPSystem.ts           # XP calculations per rarity (thresholds, getLevelForXP)
│   │   ├── matchResultPackager.ts    # Package match into on-chain format (result_nonce anti-replay)
│   │   ├── nftMetadataGenerator.ts   # NFT metadata from card definitions
│   │   ├── deckVerification.ts       # verifyDeckOwnership, computeDeckHash (SHA-256, IndexedDB, no server)
│   │   ├── hiveSignatureVerifier.ts  # verifyHiveSignature, fetchAccountKeys (hive-tx, 3-node fallback)
│   │   ├── matchmakingOnChain.ts     # broadcastQueueJoin, startQueuePoller, ELO window matching
│   │   ├── signedMove.ts            # GameMove, MoveRecord, MerkleProof types
│   │   ├── transcriptBuilder.ts     # TranscriptBuilder class: Merkle tree, proofs, singleton lifecycle
│   │   ├── disputeResolution.ts     # buildDisputeEvidence, submitMoveDispute, verifyMoveInTranscript
│   │   ├── genesisAdmin.ts          # Admin: broadcastGenesis, broadcastSeal, broadcastMint (one-time)
│   │   ├── hiveConfig.ts            # Config: HIVE_NODES, RAGNAROK_ACCOUNT, explorer URLs
│   │   ├── explorerLinks.ts        # Hive explorer URL builders (getTransactionUrl, getBlockUrl)
│   │   ├── tournamentRewards.ts     # 11 milestone rewards: wins/ELO/matches → cards + RUNE
│   │   ├── powWorker.ts             # Web Worker for parallel PoW computation
│   │   └── index.ts                  # Barrel exports
│   │
│   ├── chainAPI.ts                    # Client fetch wrapper for /api/chain/* server endpoints
│   ├── HiveSync.ts                    # Keychain integration: login, broadcast, transfer, claimReward
│   ├── HiveDataLayer.ts              # Zustand store: user, stats, collection, tokens
│   ├── HiveEvents.ts                 # Event bus for chain state changes
│   └── schemas/
│       └── HiveTypes.ts              # Core Hive types: HiveCardAsset, HiveMatchResult, etc.
│
├── game/
│   ├── engine/                        # WASM game logic (PLANNED — Phase 2C)
│   │   ├── ragnarok-engine.wasm       # Compiled game logic
│   │   ├── wasmLoader.ts              # WASM init + hash verification
│   │   └── engineBridge.ts            # TypeScript ↔ WASM interface
│   │
│   ├── utils/cards/
│   │   ├── cardLevelScaling.ts        # Evolution tiers (Mortal/Ascended/Divine), stat scaling, enrichDeckWithNFTLevels
│   │   └── cardUtils.ts               # createCardInstance (auto-reads _evolutionLevel from CardData)
│   │
│   ├── utils/
│   │   └── seededRng.ts               # Mulberry32 PRNG + Fisher-Yates seededShuffle (commit-reveal seed)
│   │
│   ├── protocol/                      # Cryptographic match protocol (BUILT — lives in data/blockchain/)
│   │   └── (merged into blockchain/signedMove.ts, transcriptBuilder.ts, disputeResolution.ts)
│   │
│   ├── components/
│   │   ├── HiveKeychainLogin.tsx      # Keychain login UI component
│   │   └── ladder/
│   │       ├── RankedLadderPage.tsx   # Leaderboard + match history (reads IndexedDB)
│   │       └── ladder.css            # Ladder page styles
│   │
│   ├── components/collection/
│   │   ├── NFTProvenanceViewer.tsx   # On-chain metadata + explorer links modal
│   │   └── SendCardModal.tsx        # Direct card gifting (Keychain transfer)
│   │
│   ├── stores/
│   │   ├── heroDeckStore.ts         # Deck building (NFT ownership enforcement in Hive mode)
│   │   └── gameStoreIntegration.ts  # Subscriber init + HiveEvents → toast notifications
│   │
│   ├── subscribers/
│   │   └── BlockchainSubscriber.ts    # Game end → match packaging → IDB refresh → RUNE rewards
│   │
│   └── config/
│       └── featureFlags.ts            # DATA_LAYER_MODE, BLOCKCHAIN_PACKAGING_ENABLED

server/
├── services/
│   ├── chainState.ts                  # In-memory global state (players, cards, matches) + JSON persistence
│   └── chainIndexer.ts                # Polls Hive RPC for known accounts, processes ops server-side
├── routes/
│   ├── chainRoutes.ts                 # REST: leaderboard, ELO, cards, deck verify, register, status
│   ├── matchmakingRoutes.ts           # ELO-proximity matchmaking queue
│   └── mockBlockchainRoutes.ts        # In-memory mock blockchain (testing only)
└── routes.ts                          # Mount points + indexer startup
```

**Architecture note:** The server-side chain indexer is a **convenience layer**, not a trust dependency. It polls the same public Hive RPC data that every browser replays independently. If the server is down, clients still function via their local IndexedDB replay — they just lose global queries (leaderboard, opponent ELO lookup, cross-account deck verification).

---

## 13. Key Design Invariants

These rules must never be violated, regardless of future development:

1. **The genesis broadcast is final.** Total supply, rarity caps, and reader version are set once and never changed.

2. **The reader is append-only and runs in every player's browser.** It reads chain history and builds state in IndexedDB. It never writes to Hive. A thin server-side chain indexer provides global convenience queries (leaderboard, opponent ELO) but is NOT a trust dependency — every browser can independently verify all state.

3. **Card transfers require the owner's key.** The Ragnarok account cannot move a card after it has been distributed. Only the holder's Hive private key can sign a transfer.

4. **Every match starts with a dual-anchored `match_start`.** Both players broadcast before gameplay begins. A `match_result` without a matching `match_start` is ignored by all readers.

5. **Ranked match results require both cryptographically verified signatures.** Both broadcaster and counterparty signatures are verified by recovering the public key (via `hive-tx`) and checking it against the account's posting keys fetched from `condenser_api.get_accounts`. A ranked result with invalid or missing signatures is rejected. Casual matches may use single-sig.

6. **Every broadcast requires multi-challenge proof of work.** `match_start`, `match_result`, and `queue_join` ops MUST include valid PoW — ops without PoW are **rejected** (not silently ignored). `match_result` uses 64 challenges × 6-bit difficulty. Challenges derive from the payload — no server needed.

7. **Move transcripts are Merkle-anchored.** _(Note: per-move Hive block anchoring (`hive_block_ref`) is described in Section 7.2 as a design goal but is NOT yet implemented. Current implementation records moves into a Merkle transcript without individual block references or cryptographic signatures per move. The Merkle root of all moves is embedded in the `match_result` on chain.)_

8. **Match transcripts use Merkle trees.** The `transcript_merkle_root` in `match_result` enables single-move verification without the full transcript. Dispute resolution requires only the disputed move + a Merkle proof.

9. **Slash evidence is permissionless and verified.** Any observer can submit `slash_evidence` citing contradictory on-chain ops. The replay engine fetches both referenced transactions from public Hive RPC (3-node fallback, 8s timeout), verifies they are ragnarok ops from the offender, and confirms contradiction before applying the slash. If RPC is unreachable, evidence is queued to `pending_slashes` for retry (max 3 attempts).

10. **The build hash is the version.** _(Note: WASM compilation is planned for Phase 2C but not yet implemented. Currently, a git-derived `__BUILD_HASH__` is exchanged at P2P handshake via the `version_check` message. Mismatches warn but don't block in dev mode. Once WASM is compiled, the WASM module hash will replace the build hash as the canonical version identifier.)_

11. **Mints after the seal are ignored, always.** No exception, no admin override. The replay engine code that enforces this is pinned by hash at genesis and runs locally in every player's browser.

12. **All rules are public.** The reader source code, the genesis broadcast, the WASM module, and this design document are all publicly accessible. Security comes from cryptography, not obscurity.

13. **Tournament rewards are self-serve.** Players claim rewards by broadcasting `rp_reward_claim` with their own Keychain. The replay engine verifies on-chain stats (wins, ELO, matches played). No admin distribution, no server, no manual intervention. One claim per account per reward.

14. **Admin authority ends at seal.** After `rp_seal`, the Ragnarok account cannot mint, cannot distribute, cannot intervene. Pack opening and reward claiming are player-driven and work without any admin key.

---

## 14. Design Philosophy: Ordinals-Style Reader Model

Ragnarok's NFT system follows the same philosophical model as Bitcoin Ordinals: **the data layer is dumb text; the reader gives it meaning.**

### How it works

Hive's `custom_json` operation stores arbitrary text on an immutable blockchain. By itself, `{ "action": "mint", "nft_id": "gen1-rare-001" }` is meaningless — it's just a JSON string in a block. The **reader** (our replay engine running in every player's browser) is what interprets this text as "a rare NFT card now exists and belongs to this account."

This means:
- **Anything can be an NFT** if the reader says it is. The chain stores data; the reader assigns semantics.
- **The reader IS the protocol.** Two readers running the same rules will always agree on ownership state. A reader running different rules will disagree — and that's fine, because the genesis broadcast pins the canonical reader version by hash.
- **No smart contracts needed.** The "contract" is the reader code itself, version-locked at genesis. It can't be upgraded, paused, or rugged — it's just a function: `(chain_history) → ownership_state`.
- **Composability is open.** Any third party can write their own reader for `ragnarok-cards` ops. A marketplace, a stats tracker, a tournament organizer — all possible by reading the same public chain data with the same deterministic rules.

### Why this is stronger than smart contracts for fixed-supply collections

| Property | Smart contract (Hive-Engine/ETH) | Reader model (Ragnarok/Ordinals) |
|---|---|---|
| Upgrade risk | Contract owner can change rules | Rules frozen at genesis, reader hash-pinned |
| Runtime dependency | Needs contract VM / sidechain nodes | Runs in any browser, no dependency |
| Audit surface | Contract code + VM + sidechain | Reader code only (small, static) |
| Cost | Gas / sidechain fees | Zero (Hive RC only) |
| Finality | Subject to chain reorgs / upgrades | Hive L1 finality (irreversible after 60 blocks) |
| Offline verification | Requires node connection | IndexedDB cache works offline |

### The social contract

The genesis broadcast is a permanent, public, on-chain commitment. It says: "here are the rules, here is the reader hash, here is the total supply." Any player can verify their client runs the canonical reader. If someone forks the reader to claim they own cards they don't, every other player's reader will disagree — and majority consensus wins, just like Bitcoin.

---

## 15. Anti-Cheat Hardening Notes

Additional protections beyond the core protocol:

### 15.1 Replay Nonce for Match Results

Each `match_result` should include a monotonic `result_nonce` per account. The replay engine tracks the highest nonce seen per player. Results with a nonce <= the previous highest are rejected. This prevents replay attacks where an old winning result is re-broadcast.

### 15.2 Deck Hash Consistency

The `match_start` anchor includes a `deck_hash`. The `match_result` should also include the same `deck_hash`. The replay engine can cross-reference: if the deck hash in the result doesn't match the deck hash in the anchor, the result is suspicious. Players who consistently submit mismatched deck hashes can be flagged.

### 15.3 Time-Window Validation

`queue_join` entries older than 10 minutes should be auto-expired by the replay engine. This prevents stale queue entries from accumulating and being used for delayed match manipulation.

### 15.4 Rate Limiting via PoW Scaling

If the replay engine detects an account submitting ops at an unusually high rate (e.g., >10 `queue_join` ops per hour), future PoW difficulty for that account's ops can be scaled up. This is enforced locally by every reader — no coordination needed.

### 15.5 Reward Claim Anti-Replay

Each reward can only be claimed once per account. The replay engine stores `{account}:{rewardId}` in the `reward_claims` IndexedDB store. Duplicate claims are silently ignored (idempotent). Conditions are verified against chain-derived stats (ELO rating, win count, matches played) — not client-reported values.

---

## 16. Card XP, Leveling & Evolution System

Cards gain XP from ranked matches. XP accumulates on-chain and determines the card's evolution tier, which directly affects gameplay stats.

### 16.1 XP Flow

```
match_result (on-chain)
  └── xpRewards[] array (embedded in payload)
        └── replay engine reads each reward
              └── updates card.xp + card.level in IndexedDB
```

XP is **derived from match_result during replay** — no separate `xp_update` ops needed. The `xpRewards[]` array is computed by `cardXPSystem.ts` at match packaging time and embedded in the `match_result` payload. Every reader processes it identically.

### 16.2 Level Thresholds (per rarity)

| Rarity    | Max Level | XP per level (approx) |
|-----------|-----------|----------------------|
| Free      | 5         | Low thresholds       |
| Basic     | 5         | Low thresholds       |
| Common    | 10        | Moderate thresholds  |
| Rare      | 8         | Higher thresholds    |
| Epic      | 6         | High thresholds      |
| Mythic    | 4         | Very high thresholds |

Thresholds defined in `cardXPSystem.ts:XP_CONFIG`.

### 16.3 Evolution Tiers (gameplay impact)

XP levels map to 3 evolution tiers that scale card stats:

| Tier      | Attack | Health | Effects | Keywords |
|-----------|--------|--------|---------|----------|
| Mortal    | 60%    | 70%    | 60%     | Basic only (taunt, charge, rush, etc.) |
| Ascended  | 80%    | 90%    | 80%     | All keywords |
| Divine    | 100%   | 100%   | 100%    | All keywords |

Tier thresholds by rarity (`EVOLUTION_TIER_MAP` in `cardLevelScaling.ts`):

| Rarity    | Mortal (levels) | Ascended (levels) | Divine (levels) |
|-----------|-----------------|--------------------|-----------------|
| Common    | 1-3             | 4-7                | 8-10            |
| Rare      | 1-3             | 4-6                | 7-8             |
| Epic      | 1-2             | 3-4                | 5-6             |
| Mythic    | 1               | 2-3                | 4               |

### 16.4 How Scaling is Applied

1. At deck creation, `enrichDeckWithNFTLevels(deck, collection)` looks up the player's best NFT for each cardId
2. Each card's XP level is mapped to an evolution tier via `getEvolutionLevel(xpLevel, rarity)`
3. The tier is attached to the `CardData` as `_evolutionLevel`
4. When cards are drawn/instantiated, `createCardInstance` reads the tier and applies `getCardAtLevel`
5. `getCardAtLevel` scales attack, health, effect values, descriptions, and keywords

Summoned/generated cards (battlecries, deathrattles) always spawn at Divine (level 3). Only cards from the player's NFT collection are affected.

### 16.5 `level_up` On-Chain Record

When a card crosses a level threshold, the client auto-broadcasts a `level_up` op:

```json
{
  "app": "ragnarok-cards",
  "action": "level_up",
  "nft_id": "gen1-rare-042",
  "card_id": 2001,
  "old_level": 3,
  "new_level": 4,
  "xp_total": 1250,
  "match_id": "abc123..."
}
```

The replay engine validates: card exists, broadcaster owns it, card XP warrants the claimed level. This op is a convenience index for quick lookups — the canonical XP state is always derivable from replaying `match_result` ops.

---

## 17. Multisig Governance (Genesis & Authority)

Adapted from [HivePoA's witness-based treasury multisig](https://github.com/Dhenz14/HivePoA). Uses Hive L1 native `account_auths` — no smart contracts, no custom infrastructure.

### 17.1 Hive Authority Primer

Every Hive account has three authority levels, each with weighted signers and a threshold:

```
owner:    { weight_threshold: 3, account_auths: [["alice",1],["bob",1],["carol",1]], key_auths: [] }
active:   { weight_threshold: 2, account_auths: [["alice",1],["bob",1],["carol",1]], key_auths: [] }
posting:  { weight_threshold: 2, account_auths: [["alice",1],["bob",1],["carol",1]], key_auths: [] }
```

- `key_auths: []` = no standalone keys. Only named accounts can authorize.
- `weight_threshold: 2` with three weight-1 signers = 2-of-3 multisig.
- `custom_json` (all Ragnarok ops) uses **posting** authority.
- `transfer` (HBD/HIVE payments) uses **active** authority.
- `account_update` (changing authorities) uses **owner** authority.

### 17.2 Two Multisig Accounts

| Account | Purpose | Lifetime |
|---------|---------|----------|
| `@ragnarok-genesis` | Genesis, mint batches, seal | Temporary — bricked after seal |
| `@ragnarok-treasury` | RUNE rewards, tournament prizes, marketplace fees | Permanent, self-healing |

Both use the same Hive L1 multisig primitives. No servers, no agents needed for genesis (Keychain-only). Treasury grows into the full HivePoA pattern over time.

### 17.3 Genesis Account Setup

**Initial authority (at account creation):**

```json
{
  "account": "ragnarok-genesis",
  "owner": {
    "weight_threshold": 3,
    "account_auths": [["founder1", 1], ["founder2", 1], ["founder3", 1]],
    "key_auths": []
  },
  "active": {
    "weight_threshold": 2,
    "account_auths": [["founder1", 1], ["founder2", 1], ["founder3", 1]],
    "key_auths": []
  },
  "posting": {
    "weight_threshold": 2,
    "account_auths": [["founder1", 1], ["founder2", 1], ["founder3", 1]],
    "key_auths": []
  }
}
```

**Properties:**
- **Posting** (2-of-3): genesis, mint, seal — all are `custom_json` ops
- **Active** (2-of-3): account creation costs, delegation if needed
- **Owner** (3-of-3): authority changes require unanimous agreement
- **No standalone keys**: `key_auths: []` on all levels. No single person can act alone.

### 17.4 Genesis Ceremony (Multisig Flow)

The genesis ceremony requires co-signing via Hive Keychain:

```
Step 1: Founder A opens Ragnarok admin panel, clicks "Broadcast Genesis"
        → Keychain creates partially-signed custom_json
        → Returns serialized tx + signature A

Step 2: Founder B receives tx (shared via secure channel)
        → Keychain adds signature B to existing tx
        → Threshold met (2-of-3) → broadcasts to Hive L1

Step 3: Repeat for each mint batch (pre-seal)
        → Same 2-of-3 co-signing flow per batch

Step 4: Founders co-sign "seal" operation
        → Replay engine permanently ignores future admin mints

Step 5: Founders co-sign authority brick (all 3 required for owner update)
        → Sets all authorities to weight_threshold: 255, key_auths: [], account_auths: []
        → Account is permanently inert — cryptographic proof of no future admin power
```

### 17.5 Post-Seal Authority Bricking

After seal, the genesis account should be permanently disabled:

```json
{
  "account": "ragnarok-genesis",
  "owner": {
    "weight_threshold": 255,
    "account_auths": [],
    "key_auths": []
  },
  "active": {
    "weight_threshold": 255,
    "account_auths": [],
    "key_auths": []
  },
  "posting": {
    "weight_threshold": 255,
    "account_auths": [],
    "key_auths": []
  }
}
```

**Result:** No combination of keys or accounts can ever authorize any operation. The genesis account becomes an immutable historical record — its `custom_json` ops (genesis, mints, seal) are on-chain forever, but no new ops can ever be broadcast.

**Caveat:** Hive's account recovery mechanism (30-day window via `@hive` recovery account) could theoretically restore owner authority. To fully eliminate this: set the recovery account to a bricked account as well, or accept the 30-day theoretical window as acceptable (it requires the recovery account partner to cooperate).

### 17.6 Signing Protocol (Keychain-Native)

For genesis (3 founders, occasional ops), we use Hive Keychain's built-in multisig support — no custom agent infrastructure needed:

1. **Initiator** builds unsigned tx via `hive-tx` library
2. **Initiator** signs with Keychain → gets `{ signatures: [sigA], tx }`
3. **Tx + partial signature shared** via secure channel (encrypted DM, Signal, etc.)
4. **Co-signer** imports tx, adds signature via Keychain → `{ signatures: [sigA, sigB], tx }`
5. **Threshold met** → co-signer broadcasts (or third signer adds sig first if needed)

**Implementation:** `genesisAdmin.ts` updated with `buildUnsignedGenesisTx()`, `addSignature(tx, sig)`, `broadcastIfThresholdMet(tx)` functions.

### 17.7 Why Not a Single Key?

| Risk | Single Key | 2-of-3 Multisig |
|------|-----------|-----------------|
| Key compromise | Attacker mints unlimited NFTs | Attacker needs 2 separate keys |
| Insider abuse | One person can rug | Requires collusion |
| Key loss | System locked forever | 2 remaining founders can still operate |
| Accountability | No proof of who authorized | Each signature is on-chain, attributable |
| Trust | "Trust me, I deleted the key" | Cryptographic proof (bricked authority) |

---

## 18. Treasury Multisig & Fund Management

Adapted from HivePoA's self-healing treasury. Starts simple (Keychain multisig), scales to full agent-based system as the game grows.

### 18.1 Treasury Account Setup

```json
{
  "account": "ragnarok-treasury",
  "owner": {
    "weight_threshold": 4,
    "account_auths": [["founder1",1],["founder2",1],["founder3",1],["community1",1],["community2",1]],
    "key_auths": []
  },
  "active": {
    "weight_threshold": 3,
    "account_auths": [["founder1",1],["founder2",1],["founder3",1],["community1",1],["community2",1]],
    "key_auths": []
  },
  "posting": {
    "weight_threshold": 3,
    "account_auths": [["founder1",1],["founder2",1],["founder3",1],["community1",1],["community2",1]],
    "key_auths": []
  }
}
```

**Quorum model** (from HivePoA):

| Operation | Quorum | Rationale |
|-----------|--------|-----------|
| RUNE token disbursement | 60% (`ceil(N * 0.6)`) | Routine reward payouts |
| HBD/HIVE transfers | 60% | Marketplace fee distribution |
| Authority updates (add/remove signer) | 80% (`ceil(N * 0.8)`) | Higher bar for governance changes |
| Emergency freeze | 1 signer (any) | Fast response to anomalies |
| Unfreeze | 80% supermajority | Prevents premature unlock |

### 18.2 Treasury Responsibilities

| Fund | Source | Disbursement |
|------|--------|-------------|
| **RUNE token pool** | Match rewards (+10 win, +3 loss) | Self-serve claim via `reward_claim` op |
| **Tournament prizes** | Entry fees | Post-tournament payout to top N |
| **Marketplace fees** | Trade commissions (future) | Periodic distribution to stakeholders |
| **Development fund** | Initial allocation | Bounties, art commissions, hosting |

### 18.3 Phased Treasury Rollout

**Phase 1 — Launch (Keychain-only, 2-of-3)**

Minimal setup, same as genesis signing flow:
- 3 founding signers with Hive Keychain
- Manual co-signing for payouts
- No server infrastructure needed
- Daily cap: 100 HBD equivalent

**Phase 2 — Growth (Agent-assisted, 3-of-5)**

Adapted from HivePoA when transaction volume justifies automation:
- 5 signers (3 founders + 2 community-elected)
- Desktop/CLI agent auto-signer for routine payouts
- WebSocket signing protocol (server → agent → signature → broadcast)
- Agent-side policy engine (per-tx cap, daily cap, op-type whitelist)
- Anomaly detection with auto-freeze

**Phase 3 — Decentralized (WoT-based, N-of-M)**

Full HivePoA model:
- Open signer set via Web of Trust vouching
- Top community members vouch for treasury signer candidates
- 3+ vouches required for eligibility
- Self-healing authority rotation (10-minute sync checks)
- Automatic removal of inactive/deranked signers
- Time-delayed broadcasts with veto window for large amounts

### 18.4 Agent Signing Protocol (Phase 2+)

Adapted from HivePoA's 6-layer security model:

```
Server                              Agent (Desktop/CLI)
  │                                    │
  ├─── SigningRequest ────────────────>│
  │    { txId, nonce, txDigest,        │
  │      operations, tx, expiresAt,    │ 1. Protocol version check
  │      metadata: { txType,           │ 2. Nonce replay check (LRU 10K)
  │        recipient, amount } }       │ 3. Expiration check (45s max)
  │                                    │ 4. Digest recomputation & verify
  │                                    │ 5. Operations cross-check
  │                                    │ 6. Policy check (caps, whitelist)
  │                                    │
  │<─── SigningResponse ──────────────┤
  │    { txId, nonce, signature,       │
  │      rejected, rejectReason,       │
  │      signerUsername }              │
  │                                    │
  ├─── (collect threshold sigs) ──────>│
  │                                    │
  ├─── Broadcast to Hive L1 ─────────>│
```

**Security layers:**

| Layer | Protection | How |
|-------|-----------|-----|
| Digest verification | Prevents tampered txs | Agent independently computes SHA256 from raw tx |
| Operations cross-check | Prevents policy bypass | `request.operations` must match `tx.operations` exactly |
| Nonce replay | Prevents double-signing | LRU cache, auto-evicts oldest 20% at 10K |
| Spending caps | Limits blast radius | Per-tx max ($5), daily cap ($200), non-overrideable local config |
| Time delay | Allows human review | Transfers >$1: 1-hour delay. Authority updates: 6-hour delay |
| Anomaly detection | Auto-halts suspicious patterns | >5 tx/10min, >3x average amount, unknown recipient |

### 18.5 Emergency Controls

**Freeze** (any single signer):
- `POST /api/treasury/freeze` with optional reason
- Blocks all operations immediately
- Persists across server restarts

**Unfreeze** (80% supermajority):
- Each signer votes to unfreeze
- Threshold computed at freeze time (prevents moving goalposts)
- All votes tracked on-chain for transparency

**Veto** (any signer, during delay window):
- Time-delayed transactions can be vetoed before broadcast
- Single veto cancels the transaction
- New proposal required with fresh co-signatures

### 18.6 Self-Healing Authority Sync

Every 10 minutes (adapted from HivePoA):

1. Read on-chain authority for `@ragnarok-treasury`
2. Compare against active signer database
3. If mismatch detected (signer left, became inactive, lost vouches):
   - Build `account_update` operation with corrected authority
   - Collect 80% co-signatures from remaining signers
   - Broadcast authority update
4. Threshold auto-adjusts: `ceil(remainingSigners * quorumRatio)`

**Result:** No manual intervention needed when signers change. The authority self-corrects.

### 18.7 Audit Trail

Every treasury operation logged immutably:

```typescript
interface TreasuryAuditEntry {
  txId: string;
  action: 'requested' | 'signed' | 'rejected' | 'broadcast' | 'failed' | 'vetoed' | 'frozen' | 'unfrozen';
  signerUsername: string;
  timestamp: number;
  nonce: string;
  txDigest: string;
  rejectReason?: string;
  anomalyFlags?: string[];
  metadata: {
    txType: 'transfer' | 'authority_update' | 'custom_json';
    recipient?: string;
    amount?: string;
    memo?: string;
  };
}
```

On-chain: all Hive transactions are immutable and publicly visible on any Hive block explorer.
Off-chain: server-side audit log for signing request/response tracking.

### 18.8 Constants

```typescript
// Genesis multisig
const GENESIS_POSTING_THRESHOLD = 2;    // 2-of-3 for custom_json ops
const GENESIS_ACTIVE_THRESHOLD = 2;     // 2-of-3 for transfers
const GENESIS_OWNER_THRESHOLD = 3;      // 3-of-3 (unanimous) for authority changes
const BRICK_THRESHOLD = 255;            // Unreachable — permanently disables authority

// Treasury quorums
const TRANSFER_QUORUM_RATIO = 0.6;      // 60% for payments
const AUTHORITY_QUORUM_RATIO = 0.8;     // 80% for signer changes
const MIN_SIGNERS_FOR_OPERATION = 3;    // Minimum operational signers

// Treasury security
const SIGNING_TIMEOUT_MS = 45_000;                // Request expiration
const AUTHORITY_SYNC_INTERVAL_MS = 10 * 60_000;   // Self-healing check interval
const MAX_PER_TX_HBD = 5.0;                       // Per-transaction spending cap
const DAILY_CAP_HBD = 200.0;                      // Rolling 24-hour cap
const IMMEDIATE_BROADCAST_MAX_HBD = 1.0;          // Transfers ≤$1 broadcast instantly
const TRANSFER_DELAY_SECONDS = 3_600;             // 1-hour delay for >$1 transfers
const AUTHORITY_UPDATE_DELAY_SECONDS = 21_600;    // 6-hour delay for authority updates
const NONCE_CACHE_SIZE = 10_000;                  // LRU replay protection cache

// Treasury cooldowns
const OPT_OUT_COOLDOWN_DAYS = 7;        // Default leave cooldown
const CHURN_COOLDOWN_DAYS = 30;         // Extended cooldown for frequent leavers
const CHURN_THRESHOLD = 3;              // Opt-outs triggering extended cooldown
const CHURN_WINDOW_DAYS = 90;           // Window for churn detection

// WoT (Phase 3)
const MIN_TREASURY_VOUCHES = 3;         // Vouches needed for non-founder signer
```

### 18.9 Implementation Files

```
client/src/
├── data/blockchain/
│   ├── genesisAdmin.ts          # Multisig genesis/seal/brick + unsigned tx builders
│   │   ├── buildUnsignedGenesisTx()   — genesis tx with SHA-256 digest
│   │   ├── buildUnsignedSealTx()      — seal tx with digest
│   │   ├── buildAuthorityBrickTx()    — account_update with threshold 255
│   │   ├── GENESIS_SIGNERS            — authorized signer list
│   │   └── requireGenesisSigner()     — auth guard for signing ops
│   └── hiveConfig.ts            # RAGNAROK_GENESIS_ACCOUNT, RAGNAROK_TREASURY_ACCOUNT
├── game/components/treasury/
│   └── TreasuryPage.tsx         # Full treasury management UI
│       ├── StatusBanner          — frozen/operational, signer count, HBD balance, authority sync
│       ├── AuthorityRing         — SVG circle visualization of signer positions + weights
│       ├── SignersTable          — username, online status, weight, vouch count, joined date
│       ├── JoinLeaveActions      — conditional join/leave with eligibility + cooldown warnings
│       ├── WebOfTrust            — vouch input, candidate progress bars, revoke button
│       ├── RecentTransactions    — tx list with Sign/Veto buttons per pending tx
│       ├── EmergencyControls     — freeze button, unfreeze vote with progress bar
│       └── PendingSigningPanel   — tx details + Approve via Keychain requestSignBuffer
└── lib/routes.ts                # /treasury route

shared/
├── treasuryTypes.ts             # All shared types + constants
│   ├── SigningRequest            — protocol version, expiration, metadata
│   ├── SigningResponse           — signature + rejection handling
│   ├── TreasuryStatus            — frozen state, signer counts, thresholds, balance
│   ├── TreasurySignerInfo        — per-signer metadata (online, weight, vouches)
│   ├── TreasuryTransaction       — 7 statuses (pending→signing→broadcast→completed/failed/vetoed/expired)
│   ├── VouchCandidate            — WoT candidate progress tracking
│   └── Constants                 — quorum ratios, timeouts, caps, delays, cooldowns
└── schema.ts                    # Drizzle ORM treasury tables
    ├── treasurySigners           — username, weight, online, joinedAt, leftAt
    ├── treasuryVouches           — voucher → candidate, witnessRank, createdAt
    ├── treasuryTransactions      — type, status, signatures, recipient, amount, memo, delays
    ├── treasuryAuditLog          — action, signer, nonce, txDigest, anomalyFlags, metadata
    └── treasuryFreezeState       — frozen, frozenBy, reason, unfreezeVotes, threshold

server/
├── services/
│   ├── treasuryCoordinator.ts   # Core coordinator (consolidates signing + authority sync)
│   │   ├── getStatus()           — treasury operational status
│   │   ├── getSignerInfoList()   — online tracking with heartbeat
│   │   ├── joinSigner()          — WoT-verified join with witness rank check
│   │   ├── leaveSigner()         — with 7/30-day cooldown (churn detection)
│   │   ├── submitTransfer()      — daily caps, per-tx limits, anomaly check
│   │   ├── submitSignature()     — threshold tracking, auto-broadcast
│   │   ├── freeze()              — any-signer emergency freeze
│   │   ├── voteUnfreeze()        — 80% supermajority vote tracking
│   │   ├── vetoTransaction()     — cancel during delay window
│   │   ├── vouchForCandidate()   — WoT vouch (witness rank verified)
│   │   ├── revokeVouch()         — remove vouch
│   │   ├── syncAuthority()       — 10-min self-healing (compare DB vs on-chain)
│   │   └── auditLog()            — immutable action logging
│   ├── treasuryAnomalyDetector.ts # In-memory anomaly detection
│   │   ├── recordTransaction()   — track amount, recipient, timing
│   │   ├── checkBurst()          — >5 tx in 10 minutes
│   │   ├── checkSpike()          — >3x rolling average amount
│   │   ├── checkRapidSuccession() — <60s between transfers
│   │   ├── checkNewRecipient()   — first-time recipient flag
│   │   └── shouldAutoFreeze()    — 3+ anomalies/hour triggers freeze
│   └── treasuryHive.ts          # Pure Hive L1 blockchain utilities
│       ├── computeThreshold()    — ceil(signerCount * quorumRatio)
│       ├── authorityMatchesSigners() — compare on-chain authority vs DB
│       ├── buildAuthorityUpdatePayload() — account_update ops
│       ├── buildTransferPayload()  — transfer/transfer_to_vesting ops
│       ├── getAccountAuthority()   — fetch account posting/active/owner auths
│       ├── getWitnessRank()        — current witness ranking lookup
│       ├── isTopWitness()          — check if within top 150
│       ├── getTreasuryBalance()    — HBD + HIVE balance
│       ├── getDynamicGlobalProperties() — head block, time, etc.
│       ├── buildUnsignedTransaction() — construct Hive tx with ref_block
│       └── broadcastSignedTransaction() — broadcast with collected signatures
└── routes/
    └── treasuryRoutes.ts        # 14 REST endpoints with Hive signature auth
        ├── GET  /status              — public: frozen state, signer count, balance
        ├── GET  /signers             — public: all signers with online status
        ├── GET  /transactions        — auth: recent transactions with status
        ├── GET  /transactions/:id    — auth: single transaction details
        ├── POST /transactions/:id/veto — auth: veto pending transaction
        ├── GET  /pending-signing     — auth: transactions awaiting this signer
        ├── POST /submit-signature    — auth: submit Keychain signature for tx
        ├── POST /join                — auth: join treasury (WoT verified)
        ├── POST /leave               — auth: leave treasury (cooldown enforced)
        ├── POST /freeze              — auth: emergency freeze (any signer)
        ├── POST /unfreeze            — auth: vote to unfreeze (80% required)
        ├── POST /wot/vouch           — auth: vouch for candidate
        ├── DELETE /wot/vouch         — auth: revoke vouch
        └── GET  /wot/vouches         — public: all pending vouch candidates
        Auth: X-Hive-Username + X-Hive-Signature + X-Hive-Timestamp headers
```

### 18.10 Genesis Launch Checklist

```
Pre-Launch:
  [ ] Create @ragnarok-genesis Hive account
  [ ] Create @ragnarok-treasury Hive account
  [ ] Set genesis posting authority → 2-of-3 founders (no standalone keys)
  [ ] Set genesis owner authority → 3-of-3 founders (unanimous)
  [ ] Set treasury posting/active authority → 2-of-3 founders (initial)
  [ ] Set treasury owner authority → 3-of-3 founders (initial)
  [ ] Test multisig co-signing flow on Hive testnet

Launch Day:
  [ ] Founder A + B co-sign genesis broadcast (2-of-3)
  [ ] Founder A + B co-sign initial mint batches
  [ ] Founder A + B co-sign seal broadcast (permanent)
  [ ] All 3 founders co-sign authority brick on genesis account (3-of-3)
  [ ] Verify: genesis account inert on block explorer
  [ ] Verify: replay engine accepts genesis + seal, rejects post-seal mints

Post-Launch:
  [ ] Treasury remains active with 2-of-3 for ongoing payouts
  [ ] Expand treasury to 3-of-5 as community signers join via WoT
  [ ] Monitor anomaly detector logs, tune thresholds as needed
  [ ] Transition to fully open WoT signer set when critical mass reached
```

---

## References

- [Hive custom JSON documentation](https://developers.hive.io/)
- [dhive (Hive JS library)](https://github.com/openhive-network/dhive)
- [hive-tx (lightweight Hive TX library)](https://github.com/nickelHive/hive-tx-js)
- [Hive Keychain API](https://github.com/hive-keychain/hive-keychain-extension)
- [IndexedDB API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- Mental poker (commit-reveal): Shamir, Rivest, Adleman (1979)
- [Splinterlands architecture (reference implementation on Hive)](https://splinterlands.com)
- [Bitcoin Ordinals theory](https://docs.ordinals.com/) — reader-interprets-data model
