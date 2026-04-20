# Genesis Runbook — Ragnarok Cards NFT Launch

> **Classification**: Internal operations document.
> **Audience**: Genesis ceremony participants (multisig signers).
> **Status**: Pre-launch draft — update checkpoints as accounts are created.

---

## Table of Contents

1. [Pre-Ceremony Checklist](#1-pre-ceremony-checklist)
2. [Multisig Ceremony Roles](#2-multisig-ceremony-roles)
3. [Phase 1 — Account Creation](#3-phase-1--account-creation)
4. [Phase 2 — Genesis Broadcast](#4-phase-2--genesis-broadcast)
5. [Phase 3 — Mint Batches](#5-phase-3--mint-batches)
6. [Phase 4 — Seal](#6-phase-4--seal)
7. [Phase 5 — Authority Bricking](#7-phase-5--authority-bricking)
8. [Post-Seal Validation](#8-post-seal-validation)
9. [Irreversible Verification Checkpoints](#9-irreversible-verification-checkpoints)
10. [Emergency Procedures](#10-emergency-procedures)
11. [Reference: Op Payloads](#11-reference-op-payloads)
12. [Tabletop Rehearsal](#12-tabletop-rehearsal)

---

## 1. Pre-Ceremony Checklist

Complete every item before scheduling the ceremony window.

### Code & Data

- [ ] `npm run check` — 0 TypeScript errors
- [ ] `npm run build` — production build succeeds, no TDZ errors
- [ ] `npm run build:packs` — asset packs generated
- [ ] All 2,242 cards resolve via `getCardById()` (0 lookup failures)
- [ ] 2,082 collectible cards have `collectible: true`
- [ ] 160 tokens have `collectible: false`
- [ ] `VALID_CARD_RANGES` in protocol-core covers all card IDs
- [ ] Conformance suite passes: 37 golden vectors + 38 replay traces (170 tests)

### Artifact Hash Bundle (Computed Pre-Ceremony, Verified by All Signers)

The genesis op carries three hashes that are **permanently frozen on-chain**. Every signer must independently compute and agree on the exact hex values before the ceremony begins.

```bash
# 1. WASM engine hash
ENGINE_HASH=$(sha256sum client/public/engine.wasm | awk '{print $1}')
echo "engine_hash: $ENGINE_HASH"

# 2. Card registry hash (deterministic canonical stringify)
REGISTRY_HASH=$(node -e "
  const { canonicalStringify } = require('./shared/protocol-core');
  const { ALL_CARDS } = require('./client/src/game/data/allCards');
  const crypto = require('crypto');
  console.log(crypto.createHash('sha256').update(canonicalStringify(ALL_CARDS)).digest('hex'));
")
echo "card_registry_hash: $REGISTRY_HASH"

# 3. Protocol-core hash (deterministic canonical stringify of apply module)
PROTOCOL_HASH=$(node -e "
  const fs = require('fs');
  const crypto = require('crypto');
  const src = fs.readFileSync('./shared/protocol-core/apply.ts', 'utf8');
  console.log(crypto.createHash('sha256').update(src).digest('hex'));
")
echo "protocol_hash: $PROTOCOL_HASH"
```

Each signer records their computed values independently and shares them on the ceremony call. **All three hashes must match unanimously.** Any mismatch means signers are running different source — halt and investigate.

- [ ] `engine_hash` — all signers agree: `_________________________________`
- [ ] `card_registry_hash` — all signers agree: `_________________________________`
- [ ] `protocol_hash` — all signers agree: `_________________________________`

These values are written into the genesis payload (Section 4.1) and become the permanent cryptographic anchor for the entire NFT system.

### Infrastructure

- [ ] GitHub Pages deploy is live and functional
- [ ] Service worker caches asset packs correctly
- [ ] At least 2 Hive API nodes reachable from deployment environment
- [ ] Hive Keychain extension installed on all signer machines
- [ ] All signers have tested Keychain signing on testnet

### Accounts (created in Phase 1)

- [ ] `@ragnarok` account exists on Hive mainnet
- [ ] `@ragnarok-genesis` account exists on Hive mainnet
- [ ] `@ragnarok-treasury` account exists on Hive mainnet
- [ ] All three accounts funded with sufficient RC (resource credits)

### Participants

- [ ] Minimum 3 signers confirmed and available for ceremony window
- [ ] All signers have each other's Hive usernames
- [ ] Communication channel established (voice call recommended)
- [ ] Each signer has independently verified the card registry hash

---

## 2. Multisig Ceremony Roles

### Signer Roles

| Role | Responsibility | Account |
| ---- | -------------- | ------- |
| **Conductor** | Calls each phase, verifies checkpoints, announces go/no-go | Any signer |
| **Broadcaster** | Constructs unsigned transactions, initiates Keychain signing | `@ragnarok` holder |
| **Witness** | Co-signs transactions, independently verifies on-chain state | Other signers |
| **Auditor** | Reads chain independently (separate node), confirms ops landed | Non-signer (optional) |

### Signing Protocol

1. Broadcaster builds unsigned transaction via `buildUnsignedGenesisTx()` / `buildUnsignedSealTx()`
2. Broadcaster shares the **digest hex** with all signers over secure channel
3. Each signer independently verifies the digest matches expected payload
4. Each signer signs the digest via Hive Keychain (active authority)
5. Signatures collected by broadcaster
6. Once threshold met (2-of-3), broadcaster calls `broadcastSignedTransaction()`
7. All participants verify the transaction hit an irreversible block

### Quorum Requirements — Exact Hive Authority Math

Hive multisig works with **integer weights** and a **weight_threshold**. A transaction is authorized when the sum of weights from participating signers meets or exceeds the threshold. An account is only truly multisig when no single signer's weight can satisfy the threshold alone.

#### Genesis accounts (`@ragnarok`, `@ragnarok-genesis`) — Active Authority

```json
{
  "weight_threshold": 2,
  "account_auths": [
    ["signer-a", 1],
    ["signer-b", 1],
    ["signer-c", 1]
  ],
  "key_auths": []
}
```

- Each signer has weight **1**. Max total weight = **3**.
- Threshold = **2**. No single signer (max weight 1) can reach it alone.
- Any **2 of 3** signers satisfy: `1 + 1 = 2 >= 2`.
- `key_auths` is empty — no standalone public key can ever sign.

This authority is used for: genesis, mint_batch, seal, account_update (brick).

#### Genesis accounts — Posting Authority

```json
{
  "weight_threshold": 2,
  "account_auths": [
    ["signer-a", 1],
    ["signer-b", 1],
    ["signer-c", 1]
  ],
  "key_auths": []
}
```

Identical to active. Genesis accounts don't use posting auth operationally (all ceremony ops require active), but we lock posting identically so no single key can perform any action.

#### Treasury account (`@ragnarok-treasury`) — Active Authority (Initial)

```json
{
  "weight_threshold": 2,
  "account_auths": [
    ["signer-a", 1],
    ["signer-b", 1],
    ["signer-c", 1]
  ],
  "key_auths": []
}
```

Same 2-of-3 at launch. Post-launch, the treasury coordinator manages authority updates as signers join/leave via WoT. When the signer set grows, thresholds are recomputed:

| Active Signers | Transfer threshold (`ceil(N * 0.6)`) | Authority threshold (`ceil(N * 0.8)`) |
| --------------- | -------------------------------------- | -------------------------------------- |
| 3 | **2** (any 2 of 3) | **3** (all 3 of 3) |
| 4 | **3** (any 3 of 4) | **4** (all 4 of 4) |
| 5 | **3** (any 3 of 5) | **4** (any 4 of 5) |
| 7 | **5** (any 5 of 7) | **6** (any 6 of 7) |
| 10 | **6** (any 6 of 10) | **8** (any 8 of 10) |

All signers always have weight **1**. The `weight_threshold` integer is the only value that changes.

#### Bricked Authority (Post-Ceremony)

All three authority levels (owner, active, posting) are set to:

```json
{
  "weight_threshold": 255,
  "account_auths": [],
  "key_auths": []
}
```

Additionally, `memo_key` is set to the null public key (`STM1111111111111111111111111111111114T1Anm`).

- Threshold = **255**. Total available weight = **0** (no auths exist).
- `0 < 255` — impossible to satisfy. Account is permanently inert.
- Hive allows `weight_threshold` up to 255 (uint8). With zero auths, this is maximally dead.
- Owner authority bricked = no future authority updates possible (owner is required to change active/posting).

#### Validation Invariants

Before proceeding past any checkpoint, verify these hold for the relevant account:

1. `key_auths` is empty (no standalone keys)
2. Every entry in `account_auths` has weight exactly **1** (no weighted bypass)
3. `weight_threshold` > max individual weight (true multisig, not decorative)
4. `weight_threshold` <= sum of all weights (threshold is actually reachable)
5. Posting authority matches active authority (for genesis accounts)

---

## 3. Phase 1 — Account Creation

### 3.1 Create `@ragnarok` (Genesis Account)

```text
Type: 2-of-3 multisig (no standalone posting/active keys)
Purpose: Genesis broadcast, mint batches, seal, then bricked forever
Lifetime: Active only during genesis ceremony
```

**Steps**:

1. One signer creates the account via Hive account creation

2. Set active authority — exact JSON object from Section 2 above:

   ```json
   {
     "weight_threshold": 2,
     "account_auths": [
       ["signer-a", 1],
       ["signer-b", 1],
       ["signer-c", 1]
     ],
     "key_auths": []
   }
   ```

3. Set posting authority to the identical object
4. Verify `key_auths` is empty on both active and posting (no single key can sign)
5. Delegate enough HP for RC to broadcast ~100 custom_json ops

**Checkpoint A1**: Query `condenser_api.get_accounts(["ragnarok"])` and verify all 5 invariants from Section 2:

- `active.weight_threshold === 2`
- `active.account_auths` has exactly 3 entries, each with weight 1
- `active.key_auths` is empty
- `posting` matches active exactly (same threshold, same auths, empty key_auths)
- `weight_threshold (2) > max single weight (1)` — confirmed true multisig

### 3.2 Create `@ragnarok-genesis` (Legacy Alias)

```text
Type: 2-of-3 multisig (same signers as @ragnarok)
Purpose: Secondary authorized account in GENESIS_SIGNERS array
Lifetime: Bricked alongside @ragnarok after seal
```

Same authority configuration as `@ragnarok`. Same 5-invariant check.

**Checkpoint A2**: Verify authority matches `@ragnarok` exactly (same signers, same threshold, empty key_auths).

### 3.3 Create `@ragnarok-treasury` (Treasury Account)

```text
Type: 2-of-3 initial (expandable via WoT after launch)
Purpose: Holds RUNE payouts, ongoing operational funds
Lifetime: Permanent — active authority updated as signers join/leave
```

1. Create account with same initial 2-of-3 multisig authority
2. Fund with initial HBD/HIVE for operational expenses
3. Treasury coordinator will manage authority updates post-launch (see threshold table in Section 2)

**Checkpoint A3**: Verify treasury account authority (same 5 invariants) and balance.

### Phase 1 Gate

> **GO/NO-GO**: All three accounts exist, all authorities verified, all signers can query all three accounts from independent nodes. Proceed only on unanimous go.

---

## 4. Phase 2 — Genesis Broadcast

### 4.1 Prepare Genesis Payload

Broadcaster constructs the genesis payload locally:

```json
{
  "p": "ragnarok-cards",
  "action": "genesis",
  "version": 1,
  "collection": "ragnarok-alpha",
  "protocol_hash": "<sha256 of protocol-core>",
  "engine_hash": "<sha256 of engine.wasm>",
  "card_registry_hash": "<sha256 of card registry>",
  "supply": {
    "pack_supply": {
      "common": 2000,
      "rare": 1000,
      "epic": 500,
      "mythic": 250
    },
    "reward_supply": {
      "common": 0,
      "rare": 0,
      "epic": 150,
      "mythic": 50
    }
  }
}
```

### 4.2 Hash Bundle Verification (Checkpoint H1)

Before signing the genesis transaction, every signer verifies that the hash values in the payload match the values they independently computed during the pre-ceremony checklist (Section 1).

1. Broadcaster reads aloud the three hashes from the constructed genesis payload
2. Each signer compares against their pre-computed values from the checklist
3. Any mismatch is an **immediate halt** — do not sign

**Checkpoint H1**: All signers confirm the genesis payload contains the unanimously agreed hash bundle:

- `protocol_hash` matches pre-ceremony value
- `engine_hash` matches pre-ceremony value
- `card_registry_hash` matches pre-ceremony value

This is the last moment these hashes can be corrected. After broadcast, they are frozen on Hive Layer 1 forever.

### 4.3 Sign and Broadcast

1. Broadcaster calls `buildUnsignedGenesisTx()` → receives `{ customJsonId, payload, txDigest }`
2. Broadcaster shares `txDigest` with all signers
3. Each signer verifies digest matches their locally computed payload hash
4. Signers sign via Keychain: `hive_keychain.requestSignBuffer(txDigest, 'Active')`
5. Broadcaster collects 2 signatures, assembles signed transaction
6. Broadcaster calls `broadcastSignedTransaction(signedTx)`
7. Note the returned `trxId` and `blockNum`

### 4.4 Confirm Irreversibility via LIB

"Irreversible" on Hive means the block has been confirmed by 2/3+1 of active witnesses. This is not a time estimate — it is a concrete on-chain value: `last_irreversible_block_num` (LIB). A transaction is irreversible if and only if `transaction_block_num <= LIB`.

**Procedure** (used at every checkpoint in the ceremony):

```bash
# Replace <BLOCK_NUM> with the block number returned by the broadcast
# Query 2+ nodes — both must agree the block is at or below LIB
for NODE in "https://api.hive.blog" "https://api.deathwing.me"; do
  LIB=$(curl -s "$NODE" -d '{
    "jsonrpc":"2.0",
    "method":"condenser_api.get_dynamic_global_properties",
    "params":[],"id":1
  }' | jq '.result.last_irreversible_block_num')
  echo "$NODE — LIB: $LIB, tx block: <BLOCK_NUM>, irreversible: $([ "$LIB" -ge "<BLOCK_NUM>" ] && echo YES || echo NO)"
done
```

**Do NOT proceed until both nodes return `irreversible: YES`.** If LIB has not advanced past the transaction block, wait and re-query. Do not rely on elapsed time ("~45 seconds is usually enough") — LIB is the only source of truth.

**Checkpoint B1** (Irreversible): Genesis `trx_id` resolves on 2+ nodes AND `block_num <= LIB` on both.

### 4.5 Verify Genesis State

Each signer independently runs the replay engine (pointed at a different API node) and checks IndexedDB:

- `genesis_state.sealed === false`
- `genesis_state.genesisBlock === <BLOCK_NUM>`
- `genesis_state.readerHash === <ENGINE_HASH>` (matches hash bundle from Checkpoint H1)
- `supply_counters` initialized to 0 for all rarities
- Supply caps match: common 2000, rare 1000, epic 500, mythic 250

**Checkpoint B2**: All signers confirm identical genesis state from independent nodes. Reader hash in genesis state matches the engine hash from the pre-ceremony hash bundle.

### Phase 2 Gate

> **GO/NO-GO**: Genesis is irreversible (`block_num <= LIB` on 2+ nodes), all signers see identical state, hash bundle is permanently anchored. Proceed only on unanimous go.

---

## 5. Phase 3 — Mint Batches

### 5.1 Mint Strategy

Mint in batches of ~50 cards per `custom_json` (4KB Hive op limit). Plan mint order:

| Batch | Cards | Recipient | Purpose |
| ----- | ----- | --------- | ------- |
| 1-N | Collectible NFT cards (all rarities) | `@ragnarok` | Initial distribution pool (base cards are free/local, NOT minted on-chain) |
| N+1-P | Pack supply allocation | `@ragnarok` | Pack opening pool |
| P+1-Q | Reward supply allocation | `@ragnarok` | Milestone reward pool |

### 5.2 Mint Each Batch

For each batch:

1. Broadcaster prepares `mint_batch` payload with card array
2. Build unsigned transaction, share digest
3. Collect 2-of-3 signatures
4. Broadcast, record `trx_id` and `block_num` in ceremony ledger
5. Confirm `block_num <= LIB` on 2+ nodes (same procedure as Section 4.4)
6. Verify supply counters incremented correctly in IndexedDB
7. Proceed to next batch only after current batch is irreversible

### 5.3 Supply Verification After All Mints

```text
For each card_id in registry:
  For each rarity:
    assert supply_counters[card_id][rarity] <= supply_caps[rarity]
```

**Checkpoint C1**: All mint batches irreversible. Supply counters match expected totals.

**Checkpoint C2**: No card exceeds its per-rarity supply cap.

**Checkpoint C3**: All minted NFTs have unique `uid` values (no duplicates in `cards` IDB store).

### Phase 3 Gate

> **GO/NO-GO**: All mints landed, supply verified, no cap violations. This is the last chance to mint additional cards. After seal, minting is permanently disabled. Proceed only on unanimous go.

---

## 6. Phase 4 — Seal

### 6.1 Final Pre-Seal Audit

Before sealing, verify one final time:

- [ ] Total minted cards matches plan
- [ ] No supply cap exceeded
- [ ] All card UIDs unique
- [ ] All minted cards resolve via `getCardById()`
- [ ] Pack opening pool is sufficient for launch
- [ ] Reward pool is sufficient for 11 milestones

### 6.2 Sign and Broadcast Seal

```json
{ "p": "ragnarok-cards", "action": "seal", "version": 1 }
```

1. Broadcaster calls `buildUnsignedSealTx()` → `{ customJsonId, payload, txDigest }`
2. Share `txDigest`, collect 2-of-3 signatures
3. Broadcast, record `trx_id` and `block_num` in ceremony ledger
4. Confirm `block_num <= LIB` on 2+ nodes (same procedure as Section 4.4)

**Checkpoint D1** (Irreversible): Seal `trx_id` resolves on 2+ nodes AND `block_num <= LIB` on both.

### 6.3 Verify Seal State

Each signer independently:

- `genesis_state.sealed === true`
- `genesis_state.sealBlock === <SEAL_BLOCK_NUM>`
- Attempt a test mint broadcast → must be **hard-ignored** by all readers

**Checkpoint D2**: All signers confirm `sealed === true`. Test mint rejected by replay engine.

### Phase 4 Gate

> **GO/NO-GO**: Seal is irreversible. No more minting is possible, ever. Proceed to authority bricking only on unanimous go.

---

## 7. Phase 5 — Authority Bricking

### 7.1 Brick `@ragnarok` Authority

After seal, the `@ragnarok` account has no further purpose. Brick its authority to make it permanently inoperable:

```typescript
buildAuthorityBrickTx('ragnarok')
// Sets weight_threshold: 255, all key_auths and account_auths: []
// No combination of keys can ever sign for this account again
```

1. Build unsigned brick transaction via `buildAuthorityBrickTx('ragnarok')`
2. Collect 2-of-3 signatures (last time this authority will ever be used)
3. Broadcast, record `trx_id` and `block_num` in ceremony ledger
4. Confirm `block_num <= LIB` on 2+ nodes (same procedure as Section 4.4)

**Checkpoint E1** (Irreversible): Brick `trx_id` resolves on 2+ nodes AND `block_num <= LIB` on both.

### 7.2 Verify Bricked State

```bash
curl -s https://api.hive.blog -d '{
  "jsonrpc":"2.0",
  "method":"condenser_api.get_accounts",
  "params":[["ragnarok"]],
  "id":1
}' | jq '.result[0].active'
```

Expected:

```json
{
  "weight_threshold": 255,
  "account_auths": [],
  "key_auths": []
}
```

**Checkpoint E2**: Active authority threshold is 255, no auths exist. Account is permanently inert.

### 7.3 Brick `@ragnarok-genesis` Authority

Repeat the same bricking for `@ragnarok-genesis`.

**Checkpoint E3**: Both genesis-related accounts are permanently bricked.

### 7.4 Verify Treasury Unaffected

Confirm `@ragnarok-treasury` authority is **unchanged** (still 2-of-3 multisig, operational):

```bash
curl -s https://api.hive.blog -d '{
  "jsonrpc":"2.0",
  "method":"condenser_api.get_accounts",
  "params":[["ragnarok-treasury"]],
  "id":1
}' | jq '.result[0].active'
```

**Checkpoint E4**: Treasury account authority intact, operational.

### Phase 5 Gate

> **CEREMONY COMPLETE**: Genesis accounts bricked, treasury operational, all state verified. NFT system is live.

---

## 8. Post-Seal Validation

Run these checks after the ceremony is complete. Any failure is a critical incident.

### 8.1 Client Replay Validation

On a fresh browser (no IndexedDB):

1. Load the game at the deployed URL
2. Enable Hive mode, log in with any account
3. Wait for replay engine to sync from block 0
4. Verify:
   - [ ] Genesis detected at correct block
   - [ ] All minted cards appear in `cards` IDB store
   - [ ] Seal detected at correct block
   - [ ] `genesis_state.sealed === true`
   - [ ] Supply counters match expected values
   - [ ] No errors in console during replay

### 8.2 Server Indexer Validation

If server indexer is enabled (`ENABLE_CHAIN_INDEXER=true`):

1. Start server, wait for indexer to catch up to LIB
2. Query `/api/chain/leaderboard` — should return empty (no matches yet)
3. Query `/api/chain/cards/:account` — should return minted cards for `@ragnarok`
4. Verify indexer cursor is at or past seal block

### 8.3 Pack Opening Validation

1. A test account opens a starter pack (pack_commit → pack_reveal flow)
2. Verify:
   - [ ] Commit accepted (posting auth)
   - [ ] After 3+ blocks, reveal accepted
   - [ ] Cards deterministically generated
   - [ ] Supply counters incremented
   - [ ] Cards appear in test account's collection

### 8.4 Cross-Node Consistency

Query at least 2 independent Hive API nodes:

```text
api.hive.blog
api.deathwing.me
api.openhive.network
```

For each node, verify:

- Genesis trxId resolves to same block
- Seal trxId resolves to same block
- All mint trxIds resolve
- `@ragnarok` authority is bricked
- `@ragnarok-genesis` authority is bricked

### 8.5 NFT Provenance Spot Check

Pick 5 random minted cards:

1. Open Collection page, find card
2. Open NFT Provenance Viewer
3. Verify:
   - [ ] `officialMint` shows correct signer
   - [ ] Mint trxId links to correct Hive explorer page
   - [ ] Block number matches expected mint batch
   - [ ] Provenance stamps array is populated
   - [ ] Explorer links (hivehub.dev) resolve correctly

---

## 9. Irreversible Verification Checkpoints

Every checkpoint below must pass before proceeding to the next phase. "Irreversible" means `block_num <= last_irreversible_block_num` on 2+ independent Hive API nodes. Do not use elapsed time as a proxy — LIB is the only source of truth.

| ID | Phase | Check | Verification method | Rollback possible? |
| -- | ----- | ----- | ------------------- | ------------------ |
| **A1** | Account Creation | `@ragnarok` authority is 2-of-3, 5 invariants pass | `get_accounts` on 2+ nodes | Only via authority update (pre-brick) |
| **A2** | Account Creation | `@ragnarok-genesis` authority matches | `get_accounts` on 2+ nodes | Only via authority update (pre-brick) |
| **A3** | Account Creation | `@ragnarok-treasury` authority and balance | `get_accounts` on 2+ nodes | Authority updatable (by design) |
| **H1** | Hash Bundle | All 3 artifact hashes unanimous across signers | Independent local computation | Recompute from source if mismatch |
| **B1** | Genesis | Genesis `trx_id` included AND `block_num <= LIB` | `get_transaction` + `get_dynamic_global_properties` on 2+ nodes | **Never** — genesis is one-time |
| **B2** | Genesis | All signers see identical genesis state + hashes | Independent replay engine on different nodes | Re-replay if mismatch |
| **C1** | Minting | Every mint batch `block_num <= LIB` | Per-batch `get_transaction` on 2+ nodes | **Never** — minted cards exist forever |
| **C2** | Minting | No supply cap violated | IndexedDB `supply_counters` audit | Burn excess if needed (pre-seal) |
| **C3** | Minting | All UIDs unique | IndexedDB `cards` store scan | Duplicate UIDs rejected by replay engine |
| **D1** | Seal | Seal `trx_id` included AND `block_num <= LIB` | `get_transaction` + LIB check on 2+ nodes | **Never** — minting disabled forever |
| **D2** | Seal | `sealed === true`, test mint rejected | Independent replay + attempted mint | N/A |
| **E1** | Bricking | `@ragnarok` brick `block_num <= LIB` | `get_transaction` + LIB check on 2+ nodes | **Never** — threshold 255, no auths |
| **E2** | Bricking | Bricked authority verified | `get_accounts` on 2+ nodes, check 5 invariants fail | N/A |
| **E3** | Bricking | `@ragnarok-genesis` bricked | Same as E1+E2 | **Never** |
| **E4** | Bricking | `@ragnarok-treasury` authority unchanged | `get_accounts` on 2+ nodes, 5 invariants still pass | Authority updatable (by design) |

### Point of No Return

```text
Account creation ←── recoverable (authority can be updated)
         ↓
    Genesis broadcast ←── PERMANENT (supply caps locked forever)
         ↓
    Mint batches ←── PERMANENT (cards exist on-chain forever)
         ↓
    Seal ←── PERMANENT (no more minting, ever)
         ↓
    Authority brick ←── PERMANENT (genesis accounts dead forever)
```

**The ceremony is designed to be irreversible in one direction.** Each phase closes a door that cannot be reopened. The only safe abort point is *between* phases, before the next broadcast.

---

## 10. Emergency Procedures

### 10.1 Abort Before Genesis

If issues discovered before genesis broadcast:

- **Action**: Simply don't broadcast. No on-chain state exists yet.
- **Recovery**: Fix issues, reschedule ceremony.

### 10.2 Abort After Genesis, Before Seal

If issues discovered after genesis but before seal:

- **Action**: Stop minting. Do NOT seal.
- **Options**:
  - Mint corrective batches to fix errors
  - Burn incorrectly minted cards (if burn op supported pre-seal)
  - A new genesis on a different account is NOT possible (genesis is one-time per `ragnarok-cards` app ID)
- **Severity**: High — genesis payload (hashes, supply caps) is locked forever.

### 10.3 Abort After Seal, Before Bricking

If issues discovered after seal but before authority bricking:

- **Action**: Stop. Do NOT brick authority.
- **Options**:
  - Authority is still functional — can broadcast corrective ops if protocol supports them
  - Cannot mint new cards (seal is permanent)
  - Can potentially broadcast informational ops for client-side handling
- **Severity**: Critical — supply is frozen, but authority is still alive.

### 10.4 Post-Bricking Issues

If issues discovered after authority bricking:

- **Action**: Protocol-level response only.
- **Options**:
  - Client-side patches (update card registry, engine, UI)
  - Server-side patches (indexer, API)
  - Cannot modify on-chain state for genesis/minting
  - Treasury account is still operational for fund management
- **Severity**: Maximum — genesis accounts are permanently dead.

### 10.5 Signer Becomes Unavailable Mid-Ceremony

- If 2-of-3 signers remain: ceremony can continue (quorum met)
- If only 1 signer available: **HALT** — cannot meet 2-of-3 threshold
- Recovery: Wait for signer to return, or abort if between phases

### 10.6 Hive Network Issues & Ambiguous Broadcasts

#### Rule — Never broadcast a replacement until you have confirmed the original did not land

An ambiguous broadcast (timeout, connection drop, unclear error) does NOT mean the transaction failed. The signed transaction may have reached a witness and been included in a block despite the client never receiving the confirmation response.

#### Transaction Lookup Procedure

After any ambiguous broadcast, execute this procedure before taking further action:

**Step 1 — Query the original `trx_id` on 2+ independent nodes**:

```bash
# Look up transaction by ID (returns block_num if included, null if not)
for NODE in "https://api.hive.blog" "https://api.deathwing.me" "https://api.openhive.network"; do
  echo "=== $NODE ==="
  curl -s "$NODE" -d '{
    "jsonrpc": "2.0",
    "method": "account_history_api.get_transaction",
    "params": { "id": "<TRXID>", "include_reversible": true },
    "id": 1
  }' | jq '{block_num: .result.block_num, expiration: .result.expiration}'
done
```

**Step 2 — Determine inclusion status**:

| Nodes returning `block_num` | Status | Action |
| --- | --- | --- |
| 2+ nodes agree on same block | **Included** | Check if `block_num <= LIB`. If yes: irreversible, move on. If no: wait for LIB to advance. |
| 1 node returns block, others return null | **Ambiguous** | Wait 1 minute, re-query. Node may be behind. Do NOT broadcast a replacement. |
| All nodes return null / error | **Likely not included** | Check if `expiration` timestamp has passed. If yes: transaction is dead, safe to build a new one. If no: still in mempool, keep waiting. |

**Step 3 — If transaction expired without inclusion:**

1. Build a **new** unsigned transaction (new `ref_block_num`, new `ref_block_prefix`, new `expiration`)
2. The JSON payload (genesis/seal/mint) may be identical — this is a new Hive transaction carrying the same semantic intent
3. Collect signatures on the **new** digest (old signatures are invalid — they signed a different `ref_block` + `expiration`)
4. Broadcast the new transaction
5. Record both the old (dead) and new `trx_id` in the ceremony ledger

**Step 4 — Confirm the winning transaction is irreversible**:

```bash
LIB=$(curl -s https://api.hive.blog -d '{
  "jsonrpc":"2.0",
  "method":"condenser_api.get_dynamic_global_properties",
  "params":[],"id":1
}' | jq '.result.last_irreversible_block_num')
echo "LIB: $LIB — transaction block: <BLOCK_NUM>"
# Proceed ONLY when LIB >= BLOCK_NUM
```

#### Ceremony Transaction Ledger

The Conductor maintains a running ledger during the ceremony. Every broadcast attempt is recorded, including failures:

```text
| # | Phase    | Intent       | trx_id           | block_num | Status       | Notes                |
|---|----------|--------------|------------------|-----------|--------------|----------------------|
| 1 | Genesis  | genesis      | abc123...        | 82345678  | IRREVERSIBLE | Checkpoint B1 passed |
| 2 | Mint     | mint_batch_1 | def456...        | —         | EXPIRED      | Timeout, rebuilt     |
| 3 | Mint     | mint_batch_1 | ghi789...        | 82345702  | IRREVERSIBLE | Replacement for #2   |
| 4 | Mint     | mint_batch_2 | ...              | ...       | ...          | ...                  |
```

This ledger is the audit trail. It proves that no semantic intent was broadcast twice, and that every replacement was preceded by confirmed non-inclusion of the original.

#### Other Network Issues

- If API nodes unresponsive: rotate through `HIVE_NODES` list. All 3 down simultaneously is extremely rare — wait 2 minutes and retry.
- If fork detected (nodes disagree on head block by >10 blocks): **HALT ceremony**. Wait for fork resolution. Verify all previously confirmed `trx_id` values still resolve on the canonical chain before resuming.
- If a confirmed transaction disappears after a micro-fork: it was in a reversible block. This is why every checkpoint requires `block_num <= LIB` — reversible confirmations are not confirmations.

---

## 11. Reference: Op Payloads

### Genesis

```json
{
  "id": "ragnarok-cards",
  "required_auths": ["ragnarok"],
  "required_posting_auths": [],
  "json": "{\"p\":\"ragnarok-cards\",\"action\":\"genesis\",\"version\":1,\"collection\":\"ragnarok-alpha\",\"protocol_hash\":\"...\",\"engine_hash\":\"...\",\"card_registry_hash\":\"...\",\"supply\":{\"pack_supply\":{\"common\":2000,\"rare\":1000,\"epic\":500,\"mythic\":250},\"reward_supply\":{\"common\":0,\"rare\":0,\"epic\":150,\"mythic\":50}}}"
}
```

### Mint Batch

```json
{
  "id": "ragnarok-cards",
  "required_auths": ["ragnarok"],
  "required_posting_auths": [],
  "json": "{\"p\":\"ragnarok-cards\",\"action\":\"mint_batch\",\"to\":\"ragnarok\",\"cards\":[{\"uid\":\"alpha-000001\",\"card_id\":20001,\"rarity\":\"rare\",\"edition\":\"alpha\"},{\"uid\":\"alpha-000002\",\"card_id\":20002,\"rarity\":\"epic\",\"edition\":\"alpha\"}]}"
}
```

### Seal

```json
{
  "id": "ragnarok-cards",
  "required_auths": ["ragnarok"],
  "required_posting_auths": [],
  "json": "{\"p\":\"ragnarok-cards\",\"action\":\"seal\",\"version\":1}"
}
```

### Authority Brick

```json
[
  "account_update",
  {
    "account": "ragnarok",
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
    },
    "memo_key": "STM1111111111111111111111111111111114T1Anm",
    "json_metadata": "{}"
  }
]
```

All three authority levels (owner, active, posting) are bricked to threshold 255 with zero auths. The `memo_key` is set to the null public key (`STM111...`), rendering encrypted memos impossible. This is the maximally dead state — no operation of any kind can ever be performed by this account.

---

## Ceremony Timeline (Estimated)

| Step | Duration | Cumulative |
| ---- | -------- | ---------- |
| Pre-ceremony sync call | 15 min | 15 min |
| Phase 1: Account creation + verification | 20 min | 35 min |
| Phase 2: Genesis broadcast + irreversibility | 5 min | 40 min |
| Phase 3: Mint batches (depends on volume) | 30-120 min | 70-160 min |
| Phase 4: Seal + irreversibility | 5 min | 75-165 min |
| Phase 5: Authority bricking | 10 min | 85-175 min |
| Post-seal validation | 20 min | 105-195 min |

**Total**: ~2-3 hours for full ceremony.

---

## Signatures

Each signer signs this runbook (off-chain) to confirm they have read and understood the procedure:

| Signer | Hive Username | Date | Signature |
| ------ | ------------- | ---- | --------- |
| | | | |
| | | | |
| | | | |

---

## 12. Tabletop Rehearsal

Run this rehearsal before scheduling the mainnet ceremony. Its purpose is to verify that all participants can execute the signing flow, the retry procedure, and the LIB verification without ambiguity. The rehearsal uses Hive testnet or a throwaway mainnet account — no real genesis state is created.

### 12.1 Setup

- All signers join voice call with screen share
- Conductor prepares a dummy `custom_json` payload (not `ragnarok-cards` — use a throwaway app ID like `ragnarok-rehearsal`)
- Create a throwaway 2-of-3 multisig account on testnet (or use an existing test account)
- Each signer has Hive Keychain configured for the test account

### 12.2 Exercise 1 — Happy Path Signing

Walk the full signing flow end-to-end:

1. Broadcaster builds an unsigned `custom_json` transaction
2. Broadcaster shares `digestHex` over voice channel
3. Each signer independently hashes the expected payload, confirms digest matches
4. Each signer signs via Keychain (`requestSignBuffer` with Active authority)
5. Broadcaster collects 2 signatures, assembles signed transaction
6. Broadcaster broadcasts
7. All participants independently run the LIB verification:

   ```bash
   # Each signer runs this against a different node
   for NODE in "https://api.hive.blog" "https://api.deathwing.me"; do
     LIB=$(curl -s "$NODE" -d '{
       "jsonrpc":"2.0",
       "method":"condenser_api.get_dynamic_global_properties",
       "params":[],"id":1
     }' | jq '.result.last_irreversible_block_num')
     echo "$NODE — LIB: $LIB, tx block: <BLOCK_NUM>"
   done
   ```

8. Conductor records the transaction in a practice ledger

**Pass criteria**: All signers completed signing within 2 minutes. Both nodes confirm `block_num <= LIB`. Ledger entry is complete.

### 12.3 Exercise 2 — Ambiguous Broadcast Recovery

Simulate a failed broadcast and exercise the retry ledger:

1. Broadcaster builds and signs a transaction but does NOT broadcast it
2. Conductor announces: "Broadcast returned timeout — status unknown"
3. All participants execute the transaction lookup procedure (Section 10.6, Step 1):

   ```bash
   curl -s https://api.hive.blog -d '{
     "jsonrpc": "2.0",
     "method": "account_history_api.get_transaction",
     "params": { "id": "<FAKE_TRXID>", "include_reversible": true },
     "id": 1
   }'
   ```

4. Confirm all nodes return null (transaction was never broadcast)
5. Broadcaster builds a **new** unsigned transaction (new `ref_block`, new `expiration`)
6. Signers re-sign the new digest
7. Broadcast the replacement, verify irreversibility via LIB
8. Conductor records both entries in the practice ledger (original: EXPIRED, replacement: IRREVERSIBLE)

**Pass criteria**: No signer attempted to re-broadcast the original. All followed the lookup-first rule. Ledger shows two entries for the same intent.

### 12.4 Exercise 3 — Authority Invariant Verification

Each signer independently queries the test account and verifies the 5 invariants from Section 2:

```bash
curl -s https://api.hive.blog -d '{
  "jsonrpc":"2.0",
  "method":"condenser_api.get_accounts",
  "params":[["<TEST_ACCOUNT>"]],
  "id":1
}' | jq '.result[0] | {
  active_threshold: .active.weight_threshold,
  active_account_auths: .active.account_auths,
  active_key_auths: .active.key_auths,
  posting_threshold: .posting.weight_threshold,
  posting_account_auths: .posting.account_auths,
  posting_key_auths: .posting.key_auths
}'
```

Each signer confirms:

1. `key_auths` is empty (no standalone keys)
2. Every `account_auths` entry has weight exactly 1
3. `weight_threshold (2) > max single weight (1)`
4. `weight_threshold (2) <= sum of all weights (3)`
5. Posting authority matches active authority

**Pass criteria**: All signers independently produced the same JSON output and confirmed all 5 invariants hold.

### 12.5 Exercise 4 — Hash Bundle Agreement

Each signer independently computes the artifact hash bundle from their local checkout (Section 1):

1. Compute `engine_hash`, `card_registry_hash`, `protocol_hash`
2. Share values on voice call — do NOT share screens until all values are stated
3. Conductor compares all values

**Pass criteria**: All three hashes match unanimously across all signers. If any mismatch, investigate which checkout diverged before proceeding.

### 12.6 Rehearsal Sign-Off

| Exercise | Conductor confirms pass | Date |
| -------- | ----------------------- | ---- |
| 1. Happy path signing | | |
| 2. Ambiguous broadcast recovery | | |
| 3. Authority invariant verification | | |
| 4. Hash bundle agreement | | |

All four exercises must pass before scheduling the mainnet ceremony.
