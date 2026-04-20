# Ragnarok Hive L1 Protocol Spec v1.0

**Status**: Frozen — launch gate spec
**Layer**: Hive Layer 1 (`custom_json` reader protocol)
**Model**: Ordinals-style reader-defined L1 asset and gameplay protocol

---

## 1. Scope

Ragnarok is a **reader-defined L1 asset and gameplay protocol** on Hive. The blockchain stores ordered `custom_json` operations. The protocol reader assigns semantics to those operations and derives canonical state. This is not a Hive-native smart contract. The chain is the data layer; the replay engine is the protocol interpreter.

## 2. Canonical Source of Truth

Canonical state is:

```
Replay(all Ragnarok protocol ops in irreversible Hive blocks, in canonical block order)
```

Where:

- "Ragnarok protocol ops" means `custom_json` operations with protocol id `ragnarok-cards`.
- Legacy ids `rp_*` and `ragnarok_level_up` are accepted by compatibility readers, but **new writers MUST emit `ragnarok-cards`** with `action` inside the JSON body.
- Canonical replay includes only blocks `<= last_irreversible_block_num`.
- Head-block data may be shown in UI, but it is not canonical.

**Not canonical:**

- Account history of `@ragnarok`
- Server cache / REST snapshots
- IndexedDB local state
- Any off-chain state

## 3. Canonical Ordering

Readers MUST apply operations in this order:

1. `block_num`
2. Operation order within the block as returned by `condenser_api.get_ops_in_block`
3. For multi-asset payloads (mint batch, pack reveal), ascending item index inside the payload

## 3.1 Legacy Op Name Compatibility

The codebase currently uses `rp_match_start` for match anchoring. The v1 spec renames this to `match_anchor` (action field inside `ragnarok-cards` JSON body).

**Migration rule:**

- Readers MUST accept both `rp_match_start` (legacy `custom_json` id) and `ragnarok-cards` with `"action": "match_anchor"` as semantically identical.
- Writers MUST emit the canonical form (`ragnarok-cards` with `"action": "match_anchor"`) for all new ops.
- No cutover block is defined; both forms are valid indefinitely. The legacy form is a compatibility alias, not a separate op.

This same rule applies to all legacy `rp_*` ids: `rp_mint` = `mint_batch`, `rp_transfer` = `card_transfer`, `rp_burn` = `burn`, `rp_match_result` = `match_result`, `rp_level_up` = `level_up`, `rp_queue_join` = `queue_join`, `rp_queue_leave` = `queue_leave`, `rp_reward_claim` = `reward_claim`, `rp_slash_evidence` = `slash_evidence`.

### 3.1.1 Legacy `rp_pack_open` Replay Rule

`rp_pack_open` is the only legacy op that does NOT map 1:1 to a v1 canonical op (the new flow splits into `pack_commit` + `pack_reveal`).

**Rule**: historical `rp_pack_open` ops that appear in irreversible blocks BEFORE the v1 protocol activation block are replayed under **legacy terminal-open semantics**: the pack is opened in one step using the original txid-seeded LCG algorithm. These ops are NOT reinterpreted as synthetic commit+reveal pairs.

After the v1 activation block, `rp_pack_open` is no longer a valid op. Readers MUST reject any `rp_pack_open` appearing after the activation block. Only `pack_commit` + `pack_reveal` are valid for new pack openings.

The **v1 activation block** is defined as: the `block_num` of the `seal` operation. Before seal, the system is in genesis/distribution mode and legacy ops are expected. After seal, all new ops must follow v1 semantics.

## 3.2 Schema-Code Alignment Requirements

Where the spec says a field is REQUIRED (e.g., `pow` on `match_result`), the Zod schema in `opSchemas.ts` MUST enforce it as non-optional at the validation boundary. The current codebase has `pow: PoWBlock.optional()` in the match result schema while the handler rejects missing PoW at runtime. This is a spec violation — the schema MUST be tightened to match before launch.

Affected ops requiring PoW at the schema level:

- `match_result`: 64 challenges, 6-bit difficulty
- `match_anchor` / `match_start`: 32 challenges, 4-bit difficulty
- `queue_join`: 32 challenges, 4-bit difficulty

## 4. Finality Rule

A conforming reader:

- MUST poll `get_dynamic_global_properties`
- MUST read `last_irreversible_block_num` (LIB)
- MUST NOT mutate canonical state from any operation whose `block_num > LIB`
- MAY maintain an optimistic overlay for head blocks, but that overlay MUST be discardable and MUST NOT advance the canonical cursor

## 5. Trust Model

| Layer | Role |
|-------|------|
| Hive L1 | Canonical data source (immutable, ordered) |
| Server indexer | Availability and performance cache |
| Browser replay | Verifier (can independently derive state from chain) |
| REST API | Convenience layer, not authoritative |

A fast client may consume server snapshots for UX. A verifying client may replay from Hive blocks and compare results. The chain is always canonical.

## 6. Serialization and Hashing

### 6.1 Canonical Serialization

For all hashed or signed payloads, v1 uses:

- UTF-8 JSON
- Recursive lexicographic key sorting for objects
- Array order preserved
- Integers only in hashed numeric fields
- No floats, no NaN
- No locale-sensitive transforms
- `canonicalStringify(obj) = JSON.stringify(sortKeys(obj))`

### 6.2 Hash Function

All hashes are lowercase hex SHA-256 over canonical serialized bytes.

### 6.3 Payload Grammar Constraints

- UTF-8 strings allowed only in whitelisted string fields
- Integers only where hashed
- No Unicode normalization dependency
- No floats, no Infinity, no NaN

## 7. Authority Model

Hive `custom_json` supports both `required_posting_auths` and `required_auths`.

**Posting authority** (routine signaling, self-directed, low-blast-radius):

- `queue_join`
- `queue_leave`
- `match_anchor`
- `match_result`
- `pack_commit`
- `pack_reveal`
- `reward_claim`
- `level_up`

**Active authority** (custody-changing, irreversible asset mutations):

- `card_transfer`
- `burn`
- `seal`
- `mint_batch`
- Any future transferable balance operation (`eitr_transfer`, `rune_transfer`)

Rule: any op that changes NFT custody or irreversibly destroys an NFT MUST require active auth. Routine signaling and self-serve gameplay ops MAY use posting auth.

## 8. Asset Model

Each canonical NFT is:

```json
{
  "uid": "string (globally unique)",
  "card_id": 12345,
  "owner": "hiveaccount",
  "rarity": "common|rare|epic|mythic",
  "level": 1,
  "xp": 0,
  "edition": "alpha|beta",
  "mint_source": "genesis|pack|reward",
  "mint_trx_id": "hex",
  "mint_block_num": 123456,
  "last_transfer_block": 0
}
```

Canonical identity is `uid`. Display metadata (name, race, image, art URL) are off-chain render metadata resolved from the card registry by `card_id` and MUST NOT affect ownership or replay validity.

## 9. Supply Model

Genesis MUST define distinct supply buckets:

```json
{
  "pack_supply": {
    "common": 2000, "rare": 1000, "epic": 500, "mythic": 250
  },
  "reward_supply": {
    "common": 0, "rare": 0, "epic": 150, "mythic": 50
  }
}
```

Per-card caps are per-rarity within each bucket. Pack opening draws from `pack_supply`. Reward claims draw from `reward_supply`. Supply buckets are independent — user behavior in one subsystem cannot starve another.

---

# 10. Canonical Operation Set

v1 has **14 canonical operations**. Unknown ops are ignored.

## 10.1 `genesis`

One-time collection initialization.

```json
{
  "p": "ragnarok-cards",
  "action": "genesis",
  "version": 1,
  "collection": "ragnarok-alpha",
  "protocol_hash": "sha256hex",
  "engine_hash": "sha256hex",
  "card_registry_hash": "sha256hex",
  "supply": { "pack_supply": { ... }, "reward_supply": { ... } }
}
```

- MUST appear exactly once
- Broadcaster MUST be `ragnarok` (genesis multisig account)
- Active auth REQUIRED
- Initializes protocol constants
- No later `genesis` is valid

## 10.2 `seal`

Irreversibly disables future admin minting.

```json
{ "p": "ragnarok-cards", "action": "seal", "version": 1 }
```

- MUST appear after `genesis`
- Broadcaster MUST be `ragnarok`
- Active auth REQUIRED
- After `seal`, all future `mint_batch` ops are permanently invalid

## 10.3 `mint_batch`

Pre-seal admin mint only.

```json
{
  "p": "ragnarok-cards",
  "action": "mint_batch",
  "to": "player",
  "cards": [
    { "uid": "alpha-000001", "card_id": 20001, "rarity": "rare", "edition": "alpha" }
  ]
}
```

- Valid only before `seal`
- Broadcaster MUST be `ragnarok`
- Active auth REQUIRED
- Each `uid` MUST be unique
- Each `card_id` MUST exist in the pinned card registry (reject undefined card IDs)
- Each mint MUST respect the relevant supply bucket and per-card cap

## 10.4 `pack_commit`

Commits pack open intent and salt hash. Replaces txid-seeded RNG.

```json
{
  "p": "ragnarok-cards",
  "action": "pack_commit",
  "account": "player",
  "pack_type": "starter|standard|class|mega|norse",
  "quantity": 1,
  "salt_commit": "sha256hex",
  "client_nonce": 42
}
```

- Posting auth by `account`
- `quantity` bounded by protocol max (10)
- One commit may be revealed only once
- Commit is canonical immediately, but no cards are minted yet
- **Anti-abort rule**: an unrevealed commit expires after `PACK_REVEAL_DEADLINE` blocks (default: 200 blocks ≈ 10 minutes). If no valid `pack_reveal` references this commit by the deadline block `D = commit_block + 200`, and `D <= LIB`, the reader MUST auto-finalize using the formula below. This prevents selective non-reveal (free-option abuse).

**Auto-finalize formula** (deterministic, every reader MUST produce identical output):

```
entropy_block       = commit_block + 3
deadline_block      = commit_block + 200
entropy_block_id    = block_id(entropy_block)    // 40-char hex from Hive block header
commit_trx_id       = trx_id of the pack_commit  // 40-char hex

seed = sha256( utf8_bytes(commit_trx_id) || utf8_bytes(entropy_block_id) || utf8_bytes("forfeit") )

// "||" is byte concatenation of the UTF-8 encoded hex strings
// sha256 output is lowercase hex
// This seed feeds the same deterministic pack draw algorithm as a normal reveal
```

This formula uses only immutable chain data (commit txid + entropy block id) and a fixed literal. No user salt is available (the user never revealed it), so `"forfeit"` replaces the salt. The entropy block id is not known at commit time (20 blocks / ~60s in the future), so the outcome is not predictable at commit time. The result is identical regardless of which reader computes it.

## 10.5 `pack_reveal`

Finalizes a prior pack commit using delayed irreversible entropy.

```json
{
  "p": "ragnarok-cards",
  "action": "pack_reveal",
  "account": "player",
  "commit_trx_id": "hex",
  "user_salt": "randomstring"
}
```

- Matching `pack_commit` MUST exist
- `sha256(user_salt) == salt_commit`
- Define `entropy_block = commit_block + K` (K = 20 blocks / ~60s minimum)
- Reveal is valid only when `entropy_block <= LIB`
- `seed = sha256(user_salt || commit_trx_id || entropy_block_id || version)`
- Cards drawn deterministically from remaining `pack_supply` using that seed
- Resulting minted `uid`s are `{reveal_trx_id}:{index}`

## 10.6 `reward_claim`

Claims a deterministic reward or milestone.

```json
{
  "p": "ragnarok-cards",
  "action": "reward_claim",
  "account": "player",
  "reward_id": "first_victory"
}
```

- Posting auth by `account`
- Eligibility MUST be derivable from prior canonical state (wins, ELO, matches played)
- Each `(account, reward_id)` may be claimed at most once
- Reward card mints draw only from `reward_supply`
- RUNE points are replay-derived, not a token transfer

## 10.7 `card_transfer`

Transfers NFT custody.

```json
{
  "p": "ragnarok-cards",
  "action": "card_transfer",
  "from": "alice",
  "to": "bob",
  "uid": "alpha-000001",
  "nonce": 9
}
```

- **Active auth** by `from`
- `from` MUST currently own `uid`
- `to != from`
- Per-account nonce MUST advance monotonically
- **Transfer cooldown**: a card MUST NOT be transferred again within 10 blocks of its `last_transfer_block`. Readers MUST reject transfers where `block_num - last_transfer_block < 10`.
- Ownership changes at application time

## 10.8 `burn`

Destroys an NFT.

```json
{
  "p": "ragnarok-cards",
  "action": "burn",
  "owner": "alice",
  "uid": "alpha-000001",
  "reason": "destroy"
}
```

- **Active auth** by `owner`
- `owner` MUST currently own `uid`
- Asset is removed from canonical ownership state
- v1 note: `burn` has **no canonical Eitr side effect**. Eitr is removed from trade and scarce crafting until a later replay-derived balance model exists.

## 10.9 `level_up`

Acknowledges a level derived from chain XP.

```json
{
  "p": "ragnarok-cards",
  "action": "level_up",
  "owner": "alice",
  "uid": "alpha-000001",
  "new_level": 2
}
```

- Posting auth by `owner`
- `owner` MUST own `uid`
- `new_level` MUST be `> current_level`
- `new_level` MUST be `<= derivedLevel(xp, rarity)` where XP is accumulated from valid `match_result` ops
- Max level: 3
- No XP is created by this op; it only records acknowledgement of a chain-valid level transition

## 10.10 `queue_join`

Joins ranked queue.

```json
{
  "p": "ragnarok-cards",
  "action": "queue_join",
  "account": "alice",
  "format": "ranked-standard",
  "deck_hash": "sha256hex",
  "engine_hash": "sha256hex",
  "nonce": 14
}
```

- Posting auth by `account`
- Any user-reported rating is ignored; matchmaking readers MUST use chain-derived ELO only
- Newer `queue_join` replaces older live queue entries for the same account

## 10.11 `queue_leave`

Leaves ranked queue.

```json
{ "p": "ragnarok-cards", "action": "queue_leave", "account": "alice" }
```

- Posting auth by `account`
- Removes any active queue presence

## 10.12 `match_anchor`

Anchors a match session and the historical signing keys. Fixes historical signature breakage on key rotation.

```json
{
  "p": "ragnarok-cards",
  "action": "match_anchor",
  "match_id": "season1:alice:bob:00123",
  "player_a": "alice",
  "player_b": "bob",
  "pubkey_a": "STM...",
  "pubkey_b": "STM...",
  "deck_hash_a": "sha256hex",
  "deck_hash_b": "sha256hex",
  "engine_hash": "sha256hex",
  "seed_commit_a": "sha256hex",
  "seed_commit_b": "sha256hex",
  "sig_a": "hex",
  "sig_b": "hex"
}
```

- Posting auth by either player is sufficient for broadcast
- Both detached signatures MUST verify over the same canonical payload
- Verification MUST use `pubkey_a` / `pubkey_b` from **this payload**, not current chain account keys
- Each `match_id` may anchor once

## 10.13 `match_result`

Settles a match with transcript commitment.

```json
{
  "p": "ragnarok-cards",
  "action": "match_result",
  "match_id": "season1:alice:bob:00123",
  "winner": "alice",
  "loser": "bob",
  "result_nonce": 55,
  "transcript_merkle_root": "sha256hex",
  "terminal_state_hash": "sha256hex",
  "pow": { "nonces": [123, 456, "...64 total"] },
  "sig_a": "hex",
  "sig_b": "hex"
}
```

- Referenced `match_anchor` MUST exist
- Both signatures MUST verify against anchored pubkeys (not current chain keys)
- `winner` and `loser` MUST match anchored players
- `result_nonce` MUST advance per broadcaster monotonic nonce rules
- Proof of work MUST be valid: 64 challenges, 6-bit difficulty over canonical payload hash
- Ranked rewards, XP, and ELO changes are derived only from valid `match_result`
- XP is accumulated on the winner's NFTs that match the card IDs encoded in the result
- RUNE rewards: +10 winner, +3 loser for ranked matches (deterministic, non-transferable)
- ELO: K=32, derived from match history

## 10.14 `slash_evidence`

Submits objective evidence against a fraudulent ranked action.

```json
{
  "p": "ragnarok-cards",
  "action": "slash_evidence",
  "match_id": "season1:alice:bob:00123",
  "reason": "invalid_signature|conflicting_result|bad_transcript_root|nonce_replay",
  "evidence_hash": "sha256hex",
  "payload": { }
}
```

- May be broadcast by any account (permissionless)
- Evidence rules are objective and deterministic
- Supported reasons are a closed set: contradictory match_result, impossible transcript, deck hash mismatch, nonce replay, invalid disconnect claim
- Successful slash may: void ranked reward accrual, void a fraudulent result, impose `ranked_ban_until_block`
- Slash MUST NOT confiscate NFTs or mutate asset ownership

---

# 11. Shared Replay Core

## 11.1 Runtime Parity Requirement

The client replay engine (`replayRules.ts`) and the server indexer (`chainIndexer.ts`) MUST use the **same canonical validation logic**. Currently they do not: the client enforces PoW verification, dual-signature verification, transfer cooldown, and supply cap checks, while the server indexer has none of these.

The correct implementation is:

- **Extract one shared replay/validation core** that implements all 14 op handlers with full validation (PoW, signatures, nonces, cooldowns, supply caps, ownership checks).
- The **server** imports this core and feeds it ops from irreversible block scanning.
- The **client** imports this core and feeds it ops from server snapshots (fast mode) or block replay (verify mode).
- Op normalization (legacy `rp_*` → canonical `ragnarok-cards` action names) MUST happen **before** validation, PoW hashing, signature verification, and state transition — not after.

Without this, a block-scanning indexer that uses the current server handlers would be block-complete but validation-incomplete — still wrong.

## 11.2 Server Indexer Spec

The v1 canonical server indexer MUST:

1. Load persisted `last_irreversible_block_processed`
2. Poll `get_dynamic_global_properties`
3. Read `LIB = last_irreversible_block_num`
4. For each block `b` from `cursor + 1` to `LIB`:
   - Call `condenser_api.get_ops_in_block(b, false)`
   - Filter `custom_json` ops by protocol id `ragnarok-cards` (and legacy `rp_*`, `ragnarok_level_up`)
   - Normalize op names to canonical action names
   - Apply ops through the **shared replay core** in returned block order
5. Persist state and new cursor `last_irreversible_block_processed = LIB`

The indexer MUST NOT:

- Use known-account discovery as the primary sync method
- Advance cursor on reversible head blocks
- Treat REST output as authoritative over chain replay
- Use simplified validation handlers that skip PoW, signatures, cooldowns, or supply caps

# 12. Client Spec

### Fast mode (default)

- Fetch indexed snapshot from server
- Hydrate UI
- Optionally fetch recent head-block ops for display

### Verify mode (optional, background)

- Replay irreversible blocks from genesis or a trusted local checkpoint
- Compare derived state hash to server snapshot hash
- Alert on divergence

# 13. Economy Model

### ELO / MMR

Fully derived from `match_result` history. Non-transferable. K=32.

### RUNE

Derived non-transferable reward points. +10 per ranked win, +3 per ranked loss. Milestone bonuses from `reward_claim`. Used for progression thresholds and season rewards. Not a transferable token in v1.

### Eitr

**Non-canonical in v1.** Removed from P2P trade and scarce card forging until replay-derived. May exist as local UI preview only with zero effect on scarce assets. Path to canonical: `burn` deterministically credits Eitr in replay state; `forge` deterministically debits Eitr in replay state.

# 14. Explicit Non-Goals for v1

- Protocol-id split into multiple namespaces
- RFC 8785 canonical JSON
- On-chain per-move transcripts
- Checkpoint ops
- Transferable RUNE
- Canonical Eitr balances
- Eitr in P2P trade or scarce forging

# 15. Launch Gate

Do not call mainnet launch-ready until ALL FIVE are true:

1. **Shared replay core** extracted and used by both client and server — full validation parity (PoW, signatures, nonces, cooldowns, supply caps)
2. **Server indexer** is irreversible block-based (`get_ops_in_block` + LIB cursor), not account-history polling
3. **Pack opening** uses commit-reveal with irreversible entropy block and anti-abort auto-finalization on deadline expiry
4. **`match_anchor`** pins pubkeys and result verification uses anchored keys (not current chain keys)
5. **Eitr** is removed from canonical trade/crafting flows until replay-derived

## 15.1 Implementation Order

1. Extract shared replay/validation core from `replayRules.ts` (isomorphic: runs in browser + Node)
2. Rewrite server indexer: `get_ops_in_block` + LIB cursor, using shared core
3. Rewrite client replay: block-based cursor, LIB-gated, using shared core
4. Implement `pack_commit` / `pack_reveal` with delayed entropy + anti-abort deadline
5. Implement `match_anchor` with pinned pubkeys; update signature verifier
6. Tighten Zod schemas (PoW required, undefined card guard)
7. Remove Eitr from trade store and scarce crafting until replay-derived

---

*Frozen: v1.0 — derived from four rounds of adversarial protocol review*
