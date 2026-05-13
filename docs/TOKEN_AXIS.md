# Token axis — distribution and tokenization canon

How every tokenized balance in the game is bucketed for transferability, source of truth, and lifecycle. Orthogonal to [SET_AXIS.md](./SET_AXIS.md) (which classifies *cards*, not balances).

## The mental model (read this first)

The game has **three canonical balances** and **one external signal**:

```
  TOKENIZED BALANCES (live in replay state)
  ├── NFT (genesis cards)  — on-chain asset, supply-capped, transferable
  ├── RUNE                  — replay-derived points, season-scoped, non-transferable
  └── Eitr                  — replay-derived crafting dust, season-scoped, non-transferable

  EXTERNAL SIGNAL (lives outside the game)
  └── DUAT                  — legacy Hive token, read-only eligibility input
```

The flat axis is exhaustive. Anything else that *looks* like a token (in-match stamina, hero XP, mastery badges, deck slots) is either gameplay state (lives in combat stores) or a derived counter (does not have its own ledger).

## The matrix

| Balance | Transferable | Source of truth | Ledger owner | v1 status | Season-scoped |
|---|:-:|---|---|---|:-:|
| **NFT** | yes (`transfer`) | chain replay | `shared/protocol-core/apply.ts` (cards store) | canon | no — persists forever |
| **RUNE** | no | chain replay | `rune_ledger` store, replay-derived | canon | yes — resets per season |
| **Eitr** | no | chain replay | `eitr_ledger` store, replay-derived | canon (per [ADR 0001](./adr/0001-eitr-v1-canonical.md)) | yes — resets per season |
| **DUAT** | n/a (external) | legacy Hive chain snapshot | external — not a game balance | input-only | n/a |

## Per-balance contracts

### NFT (genesis cards)

The on-chain economic asset. One uid per minted card. Categorized via [SET_AXIS.md](./SET_AXIS.md) as `category: 'genesis'`. Supply is hard-capped per rarity at genesis ceremony; per-card_id caps live in the registry.

- **Source ops**: `mint_batch` (admin only), `pack_reveal` (player), `forge_reveal` (player), `reward_claim` (player).
- **Sink ops**: `burn` — destroys uid permanently, refills `pack_supply[rarity] += 1`.
- **Mutation ops**: `transfer` (ownership), `level_up` (xp threshold acknowledgement).
- **Visible at**: [client/src/data/blockchain/replayDB.ts](../client/src/data/blockchain/replayDB.ts) `cards` store; [INFTBridge](../client/src/game/nft/INFTBridge.ts) for client access.
- **Canonical doc**: [RAGNAROK_PROTOCOL_V1.md](./RAGNAROK_PROTOCOL_V1.md), [SET_AXIS.md](./SET_AXIS.md).

### RUNE

Non-transferable season points used for ranking score bonus and for the `rune_exchange → pack` flow. Capped per-account and per-pool per season.

- **Source ops**: `match_result` (P2P ranked), `campaign_result` (first-clear), `reward_claim`.
- **Sink ops**: `rune_exchange` — debits RUNE, asks a RUNE exchange bridge to deliver packs.
- **Visible at**: [client/src/data/runeAPI.ts](../client/src/data/runeAPI.ts), `rune_ledger` store in `replayDB.ts`.
- **Caps (S01)**: 2,200,000 emission cap; 100 RUNE per account in P2P pool; 10 RUNE per account in campaign pool.
- **Canonical doc**: [BETA_TESTNET_SCOPE.md](./BETA_TESTNET_SCOPE.md), [RAGNAROK_PROTOCOL_V1.md §13](./RAGNAROK_PROTOCOL_V1.md#L637).

### Eitr

Non-transferable season-scoped crafting dust. Sole source is dissolving NFTs; sole sink is forging new NFTs.

- **Source ops**: `burn` only (credit equals `EITR_DISSOLVE_VALUES[rarity(uid)]`).
- **Sink ops**: `forge_commit` (debit at commit) → `forge_reveal` (mint a random card_id within the rarity, or `forge_refund` credit on exhaustion).
- **Storage**: [`eitr_ledger`](../client/src/data/blockchain/replayDB.ts) IDB store (client) / `eitrLedger` Map (server `chainState.ts`). Balance derived from `getEitrLedgerTotal({direction})` queries; no scalar `TokenBalance.Eitr` field.
- **Server endpoints** (mirror of `/api/chain/rune/*`):
	- `GET /api/chain/eitr/state?seasonId=S01` — season-wide totals + emission breakdown
	- `GET /api/chain/eitr/ledger?seasonId=...&account=...&direction=...&sourceType=...` — paginated entries
	- `GET /api/chain/eitr/balances?seasonId=...` — paginated per-account `eitrBalance = credits − debits`
	- `GET /api/chain/player/:username/eitr?seasonId=S01` — single account summary
- **Caps**: implicit — bounded by `Σ NFT_supply[rarity] × EITR_DISSOLVE_VALUES[rarity]`. No configured pool cap.
- **Canonical doc**: [ADR 0001](./adr/0001-eitr-v1-canonical.md), [RULEBOOK.md Card Rarity table](./RULEBOOK.md#card-rarity), [RAGNAROK_PROTOCOL_V1.md §10.15–10.16, §13](./RAGNAROK_PROTOCOL_V1.md#1015-forge_commit).

### DUAT (external, read-only)

Legacy coupon-like Hive token from the original Ragnarok NFT project. Used **only** as an eligibility signal for the genesis pack airdrop. The game does not credit, debit, or transfer DUAT.

- **Read at**: [scripts/calibrateDuatAirdrop.mjs](../scripts/calibrateDuatAirdrop.mjs) snapshot.
- **Single use**: `applyDuatAirdropClaim` — once per account, mints the calibrated pack count.
- **Boundary**: DUAT is NOT a Ragnarok balance. Do not add it to wallets, do not display "DUAT" as a player balance, do not write ops that touch it.
- **Canonical doc**: [DUAT_AIRDROP_DESIGN.md](./DUAT_AIRDROP_DESIGN.md).

## Cross-balance non-goals

These are **explicit non-goals** of v1 and must not be implemented or documented as future ops without superseding ADRs:

- ❌ Eitr ↔ RUNE conversion (no `eitr_to_rune` or `rune_to_eitr`).
- ❌ Eitr awarded by `match_result` or any gameplay event.
- ❌ Eitr injecting `xp` / `level_up`.
- ❌ RUNE transferable peer-to-peer.
- ❌ Eitr transferable peer-to-peer.
- ❌ DUAT credited by any in-game action.
- ❌ "Combined wallet view" treating Eitr + RUNE + DUAT as fungible balances.

## Macro views

### Replay-derived vs external

```ts
isReplayDerived('NFT')   === true
isReplayDerived('RUNE')  === true
isReplayDerived('Eitr')  === true
isReplayDerived('DUAT')  === false  // external chain
```

### Transferable vs account-bound

```ts
isTransferable('NFT')    === true   // transfer op
isTransferable('RUNE')   === false  // non-transferable
isTransferable('Eitr')   === false  // non-transferable
isTransferable('DUAT')   === false  // not a game balance
```

### Season-scoped vs persistent

```ts
isSeasonScoped('NFT')    === false  // persists forever
isSeasonScoped('RUNE')   === true   // resets per season
isSeasonScoped('Eitr')   === true   // resets per season
isSeasonScoped('DUAT')   === false  // n/a
```

## Wire schema discipline

Functions that emit token deltas to the UI must use a closed enum, not a free-form string. The current `emitTokenUpdate(token: string, …)` in [INFTBridge.ts:119](../client/src/game/nft/INFTBridge.ts#L119) accepts arbitrary keys and convives with magic strings `'Eitr'` and `'RUNE'` today. After ADR 0001 lands, replace with:

```ts
type TokenKind = 'NFT' | 'RUNE' | 'Eitr';
emitTokenUpdate(token: TokenKind, amount: number, change: number): void;
```

Anything outside this enum is either a bug or a missing ADR.

## See also

- [docs/SET_AXIS.md](./SET_AXIS.md) — card category axis (orthogonal to this)
- [docs/RAGNAROK_PROTOCOL_V1.md](./RAGNAROK_PROTOCOL_V1.md) — protocol canon
- [docs/adr/0001-eitr-v1-canonical.md](./adr/0001-eitr-v1-canonical.md) — Eitr design rationale
- [docs/BETA_TESTNET_SCOPE.md](./BETA_TESTNET_SCOPE.md) — RUNE caps and exchange rates
- [docs/DUAT_AIRDROP_DESIGN.md](./DUAT_AIRDROP_DESIGN.md) — DUAT external snapshot
