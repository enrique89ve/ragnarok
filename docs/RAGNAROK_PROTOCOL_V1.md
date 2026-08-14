# Ragnarok Hive L1 Protocol Spec v1.0

**Status**: Frozen — launch gate spec
**Layer**: Hive Layer 1 (`custom_json` reader protocol)
**Model**: Ordinals-style reader-defined L1 asset and gameplay protocol

> **Runtime activation note:** this file defines the Hive protocol contract,
> not which operations the current client is allowed to emit. Under
> [ADR 0007](./adr/0007-p2p-gameplay-only-testnet.md), current P2P testnet
> matches do not sign or broadcast `match_anchor`/`match_result` and produce no
> P2P economic settlement.

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
- Portable save files, settings, tutorial flags, and UI-local progress. Writers
  MUST NOT broadcast `save_state` or any full client-store snapshot under the
  Ragnarok protocol id.

NFT custody boundary: in NFTLox-enabled phases, genesis NFT custody,
distribution, ownership, and transfers are NFTLox authority. This protocol
defines Ragnarok replay state: match settlement, RUNE/Eitr, pack triggers and
RNG resolution, ranking, and XP/level progression. See
[`HIVE_INDEXER_CONTRACT.md`](./HIVE_INDEXER_CONTRACT.md) and
[`NFTLOX_INTEGRATION_SPEC.md`](./NFTLOX_INTEGRATION_SPEC.md).

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

This same rule applies to all legacy `rp_*` ids: `rp_mint` = `mint_batch`, `rp_transfer` = `card_transfer`, `rp_burn` = `burn`, `rp_match_result` = `match_result`, `rp_campaign_result` = `campaign_result`, `rp_warband_request` = `warband_request`, `rp_warband_accept` = `warband_accept`, `rp_warband_remove` = `warband_remove`, `rp_warband_block` = `warband_block`, `rp_rune_exchange` = `rune_exchange`, `rp_level_up` = `level_up`, `rp_queue_join` = `queue_join`, `rp_queue_leave` = `queue_leave`, `rp_reward_claim` = `reward_claim`, `rp_slash_evidence` = `slash_evidence`.

### 3.1.1 Legacy `rp_pack_open` Replay Rule

`rp_pack_open` is the only legacy op that does NOT map 1:1 to a v1 canonical op (the new flow splits into `pack_commit` + `pack_reveal`).

**Rule**: historical `rp_pack_open` ops that appear in irreversible blocks BEFORE the v1 protocol activation block are replayed under **legacy terminal-open semantics**: the pack is opened in one step using the original txid-seeded LCG algorithm. These ops are NOT reinterpreted as synthetic commit+reveal pairs.

After the v1 activation block, `rp_pack_open` is no longer a valid op. Readers MUST reject any `rp_pack_open` appearing after the activation block. Only `pack_commit` + `pack_reveal` are valid for new pack openings.

The **v1 activation block** is defined as: the `block_num` of the `seal` operation. Before seal, the system is in genesis/distribution mode and legacy ops are expected. After seal, all new ops must follow v1 semantics.

**Canonical algorithm location**: the pre-seal LCG card-id draw, the Park-Miller step, the trxId-derived seed and `PACK_ID_RANGES` table are defined in [`shared/protocol-core/packDraw.ts`](../shared/protocol-core/packDraw.ts). Both `applyLegacyPackOpen` (server + client replay) and the client's optimistic pack-open preview (`client/src/data/blockchain/packDerivation.ts`) consume this module — no duplicated implementations. Card rarity for legacy opens comes from the resolved `CardDataProvider.getCardById(id).rarity`, never from a client-side rarity roll. Any change to `packDraw.ts` is a determinism-breaking change for all pre-seal pack opens already on chain.

**Starter packs are NOT part of this flow.** The starter pack (`pack_type: 'starter'`) is a deterministic, content-fixed off-chain entitlement (see §10.4 and `shared/schemas/starterEntitlement.ts`); `applyLegacyPackOpen` and `applyPackCommit` both reject it.

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
| REST API | Public read-only convenience layer under `/api/chain`, not authoritative |

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
- `campaign_result`
- `warband_request`
- `warband_accept`
- `warband_remove`
- `warband_block`
- `rune_exchange`
- `pack_commit`
- `pack_reveal`
- `reward_claim`
- `daily_quest_claim`
- `level_up`
- `forge_commit`
- `forge_reveal`
- `duat_airdrop_claim`

**Active authority** (custody-changing, irreversible asset mutations):

- `genesis`
- `card_transfer`
- `burn`
- `seal`
- `mint_batch`
- `pack_purchase`
- `pack_mint`
- `pack_distribute`
- `pack_transfer`
- `pack_burn`
- `card_replicate`
- `card_merge`
- `market_buy`
- `market_accept`
- `duat_airdrop_finalize`

Rule: any op that changes NFT custody or irreversibly destroys an NFT MUST require active auth. Routine signaling and self-serve gameplay ops MAY use posting auth.

## 7.1 Warband Relationship Ops

Warband contacts are a game-level relationship, separate from Hive's generic
social follow graph. A local Warband entry is only a private address-book row.
It does not grant presence visibility, chat, or challenge permission.

All Warband relationship ops use Posting authority and MUST be emitted under
the canonical `ragnarok-cards` custom_json id with an `action` field.

### `warband_request`

Creates a pending outbound request from the broadcaster to another Hive account.

Payload:

```json
{
  "action": "warband_request",
  "v": 1,
  "to": "bob",
  "nonce": "alice-bob-unique-request-id",
  "expiresAt": 1760000000000
}
```

Rules:

- `broadcaster` is the requester; any `from` payload field is ignored.
- `to` MUST be a valid Hive username and MUST NOT equal `broadcaster`.
- `nonce` MUST identify this request uniquely for the requester/target pair.
- `expiresAt` is a Unix millisecond timestamp used by UIs and caches to hide
  stale requests; readers MAY keep expired requests for audit but MUST NOT use
  them to grant presence or challenge permission.

### `warband_accept`

Accepts an existing request. The accepter is the broadcaster.

Payload:

```json
{
  "action": "warband_accept",
  "v": 1,
  "requester": "alice",
  "requestNonce": "alice-bob-unique-request-id"
}
```

Rules:

- `broadcaster` is the accepter.
- A relationship becomes accepted only when a valid non-expired
  `warband_request` from `requester` to `broadcaster` exists and this accept
  references its `nonce`.
- Accepted Warband pairs are symmetric for presence, chat, and challenge
  permission.

### `warband_remove`

Ends an accepted Warband relationship for both sides.

Payload:

```json
{
  "action": "warband_remove",
  "v": 1,
  "account": "bob"
}
```

Either side may remove. After removal, presence, chat, and challenge permission
are revoked until a new request/accept pair is replayed.

### `warband_block`

Blocks an account from opening Warband relationship or invite surfaces with the
broadcaster.

Payload:

```json
{
  "action": "warband_block",
  "v": 1,
  "account": "bob"
}
```

Readers MUST treat a block by either side as overriding pending and accepted
Warband relationships. UIs SHOULD hide presence and prevent challenge/chat
invites when either side has blocked the other.

### Presence Privacy Rule

The social presence server MAY keep a temporary connected-user pool, but it MUST
only return presence, challenge, or chat-routing metadata for accepted,
unblocked Warband pairs. A locally saved contact, or a Hive social follow, is
not sufficient authority to reveal online status.

Admin-only Active ops use a native Hive two-account transaction path from the
Admin Panel. The server prepares a Hive transaction through
`/api/admin/multisig/prepare` with `required_auths: [admin, operator]`. The
browser admin account from `VITE_RAGNAROK_ADMIN_ACCOUNT` signs that exact
transaction with Keychain Active authority. The server then verifies the admin
signature, adds the operator Active signature from
`RAGNAROK_ADMIN_OPERATOR_ACTIVE_KEY`, and broadcasts through
`/api/admin/multisig/broadcast`. Readers accept the op when:

- `required_auths[0]` is the configured admin account.
- `required_auths[1]` is the configured operator account.
- Hive consensus accepted both Active signatures for the same transaction.

Direct broadcasts by `RAGNAROK_ADMIN_ACCOUNT` remain valid for legacy/manual
ceremony flows.

Admin panel access uses a single off-chain login signature before any admin UI
action is available. The frontend admin account signs a canonical
`ragnarok-admin-session-login-v1` custom_json-shaped payload with Posting
authority and sends the payload, message, and signature to the server in one
request. The server verifies the admin Posting signature, rejects stale or
replayed payloads, and stores the result in an HttpOnly `ragnarok_admin_session`
cookie. This login payload is not broadcast to Hive. `/api/admin/multisig/*`
requires that session; new panel actions use the native multisig endpoints.

## 8. Asset Model

Runtime note: this asset model describes the Ragnarok replay projection and the
legacy/JSON compatibility shape. It is not the final custody source for
NFTLox-enabled phases; NFTLox owns custody and ownership, while Ragnarok replay
owns gameplay-derived state and may mirror XP/level to NFTLox.

Each canonical NFT asset is:

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

Starter cards are not canonical NFT assets. They are off-chain, account-bound gameplay entitlements and therefore have no canonical `uid`, custody transfer, `CardXP`, or `level_up` state in this protocol.

## 9. Supply Model

Genesis MUST define distinct supply buckets. Per-rarity values **MUST** match the canonical Card Rarity table in [`RULEBOOK.md`](RULEBOOK.md); the JSON example below is illustrative of structure, not a competing source of truth.

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

v1 has **18 canonical operations**. Unknown ops are ignored. The Eitr-specific ops (`forge_commit`, `forge_reveal`) and the extended `burn` semantics are specified in [ADR 0001](adr/0001-eitr-v1-canonical.md); the wire shape is documented in §10.15 / §10.16 below.

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
- Broadcaster MUST be `RAGNAROK_ADMIN_ACCOUNT`; Admin Panel broadcasts use a
  Hive transaction also co-signed by the configured operator account.
- Active auth REQUIRED
- Initializes protocol constants
- No later `genesis` is valid

## 10.2 `seal`

Irreversibly disables future admin minting.

```json
{ "p": "ragnarok-cards", "action": "seal", "version": 1 }
```

- MUST appear after `genesis`
- Broadcaster MUST be `RAGNAROK_ADMIN_ACCOUNT`; Admin Panel broadcasts use a
  Hive transaction also co-signed by the configured operator account.
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
- Broadcaster MUST be `RAGNAROK_ADMIN_ACCOUNT`; Admin Panel broadcasts use a
  Hive transaction also co-signed by the configured operator account.
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
  "pack_type": "standard|premium|mythic|class|mega|norse",
  "quantity": 1,
  "salt_commit": "sha256hex",
  "client_nonce": 42
}
```

- Posting auth by `account`
- `quantity` bounded by protocol max (10)
- One commit may be revealed only once
- Commit is canonical immediately, but no cards are minted yet
- `pack_type` MUST match an `isActive: true` entry in [`shared/protocol-core/packCatalog.ts`](../shared/protocol-core/packCatalog.ts) (canonical pack definitions, slots, prices). The **starter** pack key is rejected here — it is a one-time off-chain entitlement, not a repeatable pack open. See §15.2.
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

## 10.5.5 Sealed Pack Lifecycle (v1.1)

v1.1 introduces a sealed-pack asset model on top of the commit-reveal draw. Sealed packs are NFT-like records (uid, packType, owner, sealed flag, mint trxId) that exist between mint and burn. The four ops below are admin-gated except `pack_burn`, which any pack owner may broadcast on their own pack.

### `pack_mint`

Pre-burn sealed-pack mint. Admin-only.

```json
{ "p": "ragnarok-cards", "action": "pack_mint", "pack_type": "standard", "quantity": 1 }
```

- Broadcaster MUST be `RAGNAROK_ADMIN_ACCOUNT`; Admin Panel broadcasts use a
  Hive transaction also co-signed by the configured operator account.
- Genesis MUST be `sealed` (post-v1).
- `pack_type` MUST be `adminMintable: true` in `packCatalog`.
- `quantity` ∈ [1, 10].
- Mints `quantity` sealed packs with `uid = pack_${trxId}:${i}` to the admin account.

### `pack_distribute`

Atomic admin → player batch distribution of previously-minted sealed packs.

```json
{ "p": "ragnarok-cards", "action": "pack_distribute", "pack_uids": ["..."], "to": "player" }
```

- Broadcaster MUST be `RAGNAROK_ADMIN_ACCOUNT`; Admin Panel broadcasts use a
  Hive transaction also co-signed by the configured operator account.
- Every `pack_uid` MUST exist, be sealed, and currently owned by admin.
- Atomic: either every uid transfers to `to`, or none of them do.

### `pack_transfer`

**Admin-only** one-off sealed-pack transfer.

```json
{ "p": "ragnarok-cards", "action": "pack_transfer", "pack_uid": "...", "to": "player" }
```

- Broadcaster MUST be `RAGNAROK_ADMIN_ACCOUNT`; Admin Panel broadcasts use a
  Hive transaction also co-signed by the configured operator account.
  **Player-to-player pack transfers are not supported in v1.1.** Player
  wallets MUST NOT broadcast `pack_transfer`; readers reject all non-admin
  broadcasters.
- Companion atomic HIVE transfer (escrow proof) MUST exist for the trxId.
- Pack MUST be sealed and currently owned by admin (admin can only move their own holdings).
- Cooldown: pack MUST NOT have been transferred in the last `TRANSFER_COOLDOWN_BLOCKS`.

The handler lives at `applyPackTransfer` in `shared/protocol-core/apply.ts`. Bulk admin moves SHOULD prefer `pack_distribute`; `pack_transfer` is the surgical single-pack tool (treasury rebalancing, manual remediation).

### `pack_burn`

Opens a sealed pack — burns the NFT, draws cards from DNA + chain entropy.

```json
{ "p": "ragnarok-cards", "action": "pack_burn", "pack_uid": "...", "salt": "randomstring" }
```

- Active auth by pack owner.
- Pack MUST exist, be sealed, and owned by broadcaster.
- Entropy block = `op.blockNum + PACK_ENTROPY_DELAY_BLOCKS`; reveal is valid only when entropy block ≤ LIB.
- `seed = sha256(pack.dna || trxId || entropy_block_id)`.
- Cards drawn from `PACK_ID_RANGES[pack.packType]` filtered to collectible IDs via `CardDataProvider.getCollectibleIdsInRanges` (canon LCG step lives in [`packDraw.ts`](../shared/protocol-core/packDraw.ts) — same algorithm as legacy).
- Resulting minted card `uid`s are `{trxId}:{index}`.
- Pack record is deleted; supply counter incremented on `burned`.

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
- Any RUNE bonus writes a `reward_claim` ledger credit with source key
  `reward:S01:{account}:{rewardId}`. RUNE points are replay-derived, not a
  token transfer.

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
- Asset is removed from the Ragnarok replay projection. In NFTLox-enabled
  phases, custody burn/destruction must also be proven through NFTLox.
- `burn` deterministically credits Eitr in replay state per `EITR_VALUES[rarity]` and refills `pack_supply[rarity] += 1`. The uid is permanently destroyed; per-card_id circulation decreases by 1. See [ADR 0001](adr/0001-eitr-v1-canonical.md) for the full Eitr ledger model.

## 10.9 `level_up`

Acknowledges an NFT card level derived from chain XP.

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
- `uid` MUST resolve to a canonical NFT asset
- `owner` MUST own `uid`
- `new_level` MUST be `> current_level`
- `new_level` MUST be `<= derivedLevel(xp, rarity)` where XP is accumulated from valid `match_result` ops
- Max level: 3
- Starter cards and local/dev catalog cards MUST NOT emit `level_up`
- No XP is created by this op; it only records acknowledgement of a chain-valid NFT level transition

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
- Referenced `match_anchor` MUST be dual-anchored before result replay reaches this op
- Both signatures MUST verify against anchored pubkeys (not current chain keys)
- `winner` and `loser` MUST match anchored players
- `result_nonce` MUST advance per broadcaster monotonic nonce rules
- Proof of work MUST be valid: 64 challenges, 6-bit difficulty over canonical payload hash
- Ranked rewards, XP, and ELO changes are derived only from valid `match_result`
- XP is accumulated only on winner-owned NFTs that match the card IDs encoded in the result
- Starter entitlements, local/dev catalog cards, and combat tokens are excluded from protocol XP
- RUNE rewards: +2 winner, +0 loser for ranked matches (deterministic, non-transferable); owner and source key are derived by the RUNE ledger protocol
- ELO: K=32, derived from match history

## 10.14 `slash_evidence`

Submits objective evidence against a fraudulent ranked action.

## 10.15 `forge_commit`

First half of the two-phase forge ([ADR 0001 §3](adr/0001-eitr-v1-canonical.md#decision)). Debits Eitr and pins the entropy block; reveal must follow within `PACK_REVEAL_DEADLINE_BLOCKS`.

```json
{
  "p": "ragnarok-cards",
  "action": "forge_commit",
  "rarity": "rare",
  "salt_commit": "sha256hex"
}
```

- **Posting auth** by broadcaster
- `rarity` MUST be one of `common | rare | epic | mythic` (lowercase)
- `salt_commit` MUST be a non-empty hex string; the reveal proves preimage knowledge
- Eitr balance MUST be `>= EITR_FORGE_COSTS[rarity]`
- `pack_supply[rarity]` SupplyRecord MUST exist (genesis integrity)
- Idempotent on `op.trxId` (replay safe)
- Effects: writes `eitr_ledger` debit (`sourceType: 'forge_commit'`, `amount: EITR_FORGE_COSTS[rarity]`) and a `ForgeCommitRecord` keyed by `trxId`
- Wire-level entropy block: `commitBlock + PACK_ENTROPY_DELAY_BLOCKS` (same delay constant as packs)

## 10.16 `forge_reveal`

Second half of the two-phase forge. Verifies the salt preimage against the commit, draws a card_id deterministically from the entropy block hash, and either mints a fresh uid or refunds the original Eitr debit.

```json
{
  "p": "ragnarok-cards",
  "action": "forge_reveal",
  "commit_trx_id": "abc...",
  "user_salt": "hexstring"
}
```

- **Posting auth** by broadcaster (MUST be the same account as the commit)
- `sha256(user_salt) === commit.saltCommit` (else `rejected: salt does not match commitment`)
- Entropy block MUST be irreversible (`commitBlock + PACK_ENTROPY_DELAY_BLOCKS <= LIB`)
- Reveal MUST occur within `commitBlock + PACK_REVEAL_DEADLINE_BLOCKS` (else `auto-finalize` runs with a forfeit seed)
- Seed: `sha256(user_salt + commit_trx_id + entropy_block_id + "forge")`
- Draw rule: iterate collectible card_ids, accept the first one matching `rarity === commit.rarity` whose per-card cap and `pack_supply[rarity]` permit a new mint
- On success: mint uid `forge:<reveal_trx_id>` with `level: 1` (Mortal), `xp: 0`, `mintSource: 'forge'`; debit `pack_supply[rarity]` and the per-card supply
- On exhaustion (no eligible card_id): credit `eitr_ledger` (`sourceType: 'forge_refund'`, `amount: commit.debitAmount`); no card is minted
- The commit is marked `revealed: true` either way; cannot be retried
- `autoFinalizeExpiredForgeCommits` (block-scanner hook) executes the same logic with a forfeit seed `sha256(commit_trx_id + entropy_block_id + "forfeit")` for commits whose deadline lapsed without an explicit reveal



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

The client replay engine and the server indexer MUST use the **same canonical
validation logic** for protocol operations.

Current runtime shape:

- The shared protocol core lives in `shared/protocol-core`.
- The server imports that core from `server/services/chainIndexer.ts`.
- Op normalization in `shared/protocol-core/normalize.ts` happens before proof
  of work, signature verification, nonce checks, ownership checks, supply cap
  checks, and state transitions.
- The server storage adapter is different from browser storage, but selected
  Hive operations pass through the same protocol handler.

The canonical indexer contract, including current limitations, lives in
[`HIVE_INDEXER_CONTRACT.md`](./HIVE_INDEXER_CONTRACT.md).

## 11.2 Server Indexer Spec

The v1 canonical server indexer MUST:

1. Load the runtime-specific JSON state file and persisted block cursor.
2. Poll `get_dynamic_global_properties`.
3. Compute the replay target from irreversible Hive state, currently
   `last_irreversible_block_num - PACK_ENTROPY_DELAY_BLOCKS`.
4. Read operations either through block RPC (`get_ops_in_block`) or HafAH range
   scan for `custom_json` catch-up.
5. Filter selected `custom_json` operations by runtime protocol id and accepted
   legacy ids.
6. Normalize op names to canonical action names.
7. Apply selected ops through `shared/protocol-core`.
8. Persist state, sync health, and the new block cursor after inspected blocks.

The indexer MUST NOT:

- Use known-account discovery as the primary sync method
- Advance cursor on reversible head blocks
- Treat REST output as authoritative over chain replay
- Use simplified validation handlers that skip PoW, signatures, cooldowns, or supply caps

The HafAH fast path currently fetches `operation-types=18` (`custom_json`).
Operations whose validation depends on sibling `transfer` ops are fully
validated only when those transfer siblings are available to the replay adapter.
See [`HIVE_INDEXER_CONTRACT.md`](./HIVE_INDEXER_CONTRACT.md) §Companion
Transfer Limitation.

### Index checkpoints

The server indexer MAY publish compact projection checkpoints to Hive when
`ENABLE_INDEX_CHECKPOINT_PUBLISHER=true`.

- Signer: `RAGNAROK_INDEX_ACCOUNT` with server-only `RAGNAROK_INDEX_POSTING_KEY`.
- Authority: Posting.
- `custom_json` id: `${RAGNAROK_PROTOCOL_ID}_index`, separate from protocol
  state ops so checkpoints do not mutate Ragnarok replay state.
- Payload action: `index_checkpoint`.
- Payload includes the indexed block cursor, irreversible block, sync target block,
  deterministic projection `stateHash`, and summary counts.
- Interval: `RAGNAROK_INDEX_CHECKPOINT_INTERVAL_BLOCKS`.

Checkpoints are attestations over a replay-derived projection. They are useful
for drift detection and client verification shortcuts, but chain replay remains
the source of truth.

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

Fully derived from verified ranked `match_result` history. Non-transferable.
K=32. The official S01 leaderboard ranks eligible accounts by Season Score at
the season-end snapshot: `finalElo + floor(min(seasonRuneEarned, 130) * 0.5)`.
RUNE is capped in the formula (`10` campaign + `100` P2P + `20` daily quest, max `65` score bonus)
so campaign participation matters without letting raw farming overpower ELO.

### RUNE

Derived non-transferable reward points. Caps, sources, source keys, read endpoints, and code pointers live in [RUNE.md](./RUNE.md) — that file is canon. The protocol-visible surface is:

- **Owner rule**: self-directed RUNE ops mutate only the authenticated Hive broadcaster's balance; ranked P2P uses the balance owner proven by the dual-signed match envelope.
- **Sources**: `match_result` (P2P ranked, sourceType `p2p_ranked`), `campaign_result` (first-clear inline credit, sourceType `campaign_first_clear`), `daily_quest_claim` (slot/day credit, sourceType `daily_quest_claim`), `reward_claim` (non-campaign rewards, sourceType `reward_claim`).
- **Sink**: `rune_exchange` (debits RUNE, delegates pack delivery to the exchange adapter).
- **Independent per-account pools**: P2P, campaign, and daily quest caps do not share quota.
- **Read API**: under `/api/chain/rune/*` and `/api/chain/player/:username/rune`. No `/api/testnet/rune/*` parallel namespace.

### Eitr

Replay-derived, non-transferable, season-scoped crafting balance. Full design canon lives in [ADR 0001](adr/0001-eitr-v1-canonical.md); this section summarizes the protocol-visible surface.

- **Sole source**: `burn` credits `EITR_VALUES[rarity(uid)]` and refills `pack_supply[rarity] += 1`.
- **Sole sink**: `forge_commit` (debit at commit time) → `forge_reveal` (mint a random card_id within the chosen rarity from `pack_supply`, or `forge_refund` credit when the rarity is exhausted).
- **Identity discipline**: Eitr crosses only the `rarity` dimension. It MUST NOT inject `xp` or `level_up`. Forge mints at level 1 (Mortal tier) with `xp: 0`; subsequent levels are earned via `match_result`.
- **Ledger**: `eitr_ledger` store mirrors `rune_ledger`. Balance is computed by query, not persisted as a scalar. Each entry is tagged with `seasonId` and resets at season rollover.
- **Lockup at burn time**: protocol checks only ownership. UI is responsible for hiding "Dissolve" when a uid is listed on marketplace, anchored in an active match, or pending in a trade.

Dissolve / Forge cost table (canonical, matches [RULEBOOK.md Card Rarity](RULEBOOK.md#card-rarity)):

| Rarity | Dissolve credit | Forge cost | Ratio |
|---|---|---|---|
| Common | 5 | 40 | 8:1 |
| Rare | 20 | 100 | 5:1 |
| Epic | 100 | 400 | 4:1 |
| Mythic | 400 | 1600 | 4:1 |

Conservation invariant: `uids_in_circulation + pack_supply = total_supply_at_genesis` for any rarity. Burns reduce circulation by 1 and increase `pack_supply` by 1; forge reveals do the inverse.

# 14. Explicit Non-Goals for v1

- Protocol-id split into multiple namespaces
- RFC 8785 canonical JSON
- On-chain per-move transcripts
- Checkpoint ops
- Transferable RUNE
- `eitr_transfer` op (Eitr is non-transferable peer-to-peer; see [ADR 0001](adr/0001-eitr-v1-canonical.md))
- Eitr from gameplay rewards (`match_result`, `campaign_result`, quests)
- Eitr injecting `xp` / `level_up`
- Quality variants in Eitr ops

# 15. Launch Gate

Do not call mainnet launch-ready until ALL FOUR are true:

1. **Shared replay core** extracted and used by both client and server — full validation parity (PoW, signatures, nonces, cooldowns, supply caps)
2. **Server indexer** is irreversible block-based (`get_ops_in_block` + LIB cursor), not account-history polling
3. **Pack opening** uses commit-reveal with irreversible entropy block and anti-abort auto-finalization on deadline expiry
4. **`match_anchor`** pins pubkeys and result verification uses anchored keys (not current chain keys)

## 15.1 Implementation Order

1. Maintain shared replay/validation core in `shared/protocol-core` (isomorphic: runs in browser + Node)
2. Keep server indexer on `get_ops_in_block`/HafAH range sync + LIB cursor, using shared core
3. Keep client replay block-based and LIB-gated, using shared core
4. Implement `pack_commit` / `pack_reveal` with delayed entropy + anti-abort deadline
5. Implement `match_anchor` with pinned pubkeys; update signature verifier
6. Tighten Zod schemas (PoW required, undefined card guard)

Eitr canonicalization (`forge_commit` / `forge_reveal` ops, `eitr_ledger` store, extended `burn` semantics) is sequenced separately per [ADR 0001](adr/0001-eitr-v1-canonical.md).

## 15.2 Starter Pack — Deterministic, Off-Chain Entitlement

The `starter` pack key in `packCatalog.ts` is intentionally **not** a chain-broadcast pack open. It is a fixed-content off-chain entitlement claimed once per account.

| Property | Value |
|---|---|
| `cardCount` | 45 |
| Slots | `commonSlots: 45` (all collapsed — pack is deterministic, no roll) |
| `epicChance` / `mythicChance` | 0 |
| `acquisition` | `['free_starter_claim']` (no `direct_purchase`, no `rune_exchange`) |
| Source of card IDs | [`shared/schemas/starterEntitlement.ts`](../shared/schemas/starterEntitlement.ts) — `STARTER_ENTITLEMENT_CARD_IDS_BY_CLASS` (10 Mage + 10 Warrior + 10 Priest + 10 Rogue + 5 Neutral) |
| Materialization | `materializeStarterEntitlement()` in `client/src/game/data/starterSet.ts` — writes 45 starter-category cards directly into the local collection. No Hive broadcast for the cards themselves. |
| `claimStarterEntitlement` | Client ceremony state plus shared-network server receipt. No Hive broadcast; cards are entitled regardless. In `testnet`/`mainnet`, `/api/starter/claim` records a signed operational receipt so public P2P can reject accounts that skipped the ceremony. |

Protocol-level rejection rules:

- `applyLegacyPackOpen` rejects `pack_type === 'starter'`.
- `applyPackCommit` rejects `pack_type === 'starter'`.
- `applyPackReveal` rejects `commit.packType === 'starter'`.

Starter cards are tagged `category: 'starter'` (see [`docs/SET_AXIS.md`](SET_AXIS.md)) — they are non-NFT, infinite-supply, account-bound. They do **not** consume `pack_supply` buckets, accrue protocol XP, or emit `level_up`.

The starter pack's `cardCount: 45` exists so the rest of the pack catalog stays uniform (`slotTotal === cardCount` invariant), not because 45 cards are drawn at open time. Client UX presents the entitlement as opening "one big pack" — see `StarterPackCeremony` and the `mode-select` follow-up screen.

---

*Frozen: v1.0 — derived from four rounds of adversarial protocol review*
*v1.1 additions (sealed pack lifecycle, admin-only pack_transfer, starter pack §15.2, packDraw.ts canon location): documented inline. No new launch-gate requirements introduced.*
