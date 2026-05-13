# ADR 0001 — Eitr v1: replay-derived crafting balance

**Status**: Accepted
**Date**: 2026-05-12
**Deciders**: enrique
**Supersedes**: RAGNAROK_PROTOCOL_V1.md §13 "Eitr — Non-canonical in v1"

---

## Context

Eitr is the crafting material of the game. It currently exists as a `localStorage`-persisted scalar in `craftingStore.ts`, with no canonical source of truth: `rp_burn` is broadcast on dissolve but does not credit any balance in replay state, and `rp_forge` does not exist as a canonical op. The economy is therefore **non-canonical** today and disabled in trade and scarce crafting flows.

The protocol launch gate ([RAGNAROK_PROTOCOL_V1.md §15](../RAGNAROK_PROTOCOL_V1.md#L655)) requires Eitr to either be removed from canonical flows or made replay-derived before mainnet. This ADR makes it replay-derived.

The conversation that led to this decision is in [.scratch/eitr-v1/PRD.md](../../.scratch/eitr-v1/PRD.md).

## Decision

Eitr becomes a **replay-derived, non-transferable, season-scoped** balance whose sole source is dissolving genesis NFTs and whose sole sink is forging new genesis NFTs of a chosen rarity. The ledger model mirrors RUNE exactly.

### 1. Identity & dimensions

Each genesis card has three orthogonal dimensions, with non-overlapping mutators:

| Dimension | Mutator | Source of truth |
|---|---|---|
| `rarity` | Eitr (`forge` / `burn`) | replay-derived |
| `xp` / `level` | gameplay (`match_result`) | replay-derived |
| `owner` | `transfer`, `mint`, `burn` | replay-derived |

Eitr crosses only the rarity dimension. **Eitr does not, and will not, inject `xp` or `level_up`.** Forge always mints at level 0 (Mortal tier).

### 2. Forge output

`rp_forge { rarity }` mints a **random card_id** within the requested rarity from the available `pack_supply` pool. The player does not choose card_id. This preserves the existing UI mental model (*"Forge a random Rare card"*) and keeps Eitr a low-per-unit dust currency rather than a chase-card accelerator.

### 3. Entropy

Forge uses the same commit-reveal pattern as pack opening:

- `rp_forge_commit { rarity, salt_commit, nonce, pow }` — debits Eitr at commit time, fixes the entropy block at `commit_block + PACK_ENTROPY_DELAY_BLOCKS`.
- `rp_forge_reveal { commit_trx_id, user_salt, nonce, pow }` — reads `hash(entropy_block_id)`, draws card_id deterministically, mints uid.
- `autoFinalizeExpiredForgeCommits` runs in the block scanner with forfeit seed `sha256(commit_trx_id + entropy_block_id + "forfeit")`. Same anti-abort guarantee as packs.

### 4. Supply source

`rp_burn` is extended to refill `pack_supply`:

```
applyBurn(op):
	require ownership(broadcaster, uid)
	require category(uid) === 'genesis'
	destroy uid (irreversible — uid_total -= 1, per_card_circulation -= 1)
	credit EitrLedger { direction: 'credit', sourceType: 'burn', amount: EITR_VALUES[rarity(uid)] }
	pack_supply[rarity(uid)] += 1
```

Forge debits from the same `pack_supply`:

```
applyForgeReveal(op):
	... RNG seed from entropy ...
	for each candidate card_id in rarity order (by RNG):
		if perCardCap not reached AND pack_supply[rarity] > 0:
			mint uid, pack_supply[rarity] -= 1, perCardCirculation[card_id] += 1
			return applied
	// no eligible card_id
	credit EitrLedger { direction: 'credit', sourceType: 'forge_refund', amount: <original debit> }
	return applied // reveal completes, no card delivered, Eitr returned
```

**Conservation invariant**: `uids_in_circulation + pack_supply = total_supply_at_genesis` for any rarity. Burns reduce circulation by 1 and increase pack_supply by 1; forges do the inverse.

### 5. Dissolve scope

`rp_burn` accepts only uids of `category: 'genesis'`. Starter cards (no uid, account-bound entitlement) and tokens (non-collectible) cannot be dissolved. Eitr credited equals `EITR_VALUES[rarity(uid)]` regardless of XP/level — the card's level history is destroyed with the uid. Eitr value table:

| Rarity | Dissolve credit | Forge cost | Ratio |
|---|---|---|---|
| Common | 5 | 40 | 8:1 |
| Rare | 20 | 100 | 5:1 |
| Epic | 100 | 400 | 4:1 |
| Mythic | 400 | 1600 | 4:1 |

(values inherited from RULEBOOK.md Card Rarity table)

### 6. Seasonality

Eitr is **scoped to a single season**, same as RUNE. The balance does not carry across seasons; at season rollover, the active balance returns to zero. Each `EitrLedgerEntry` is tagged with the `seasonId` whose block range covered its emitting op.

Asymmetry note: **burns destroy uids permanently AND credit Eitr seasonally**. A player who dissolves a Mythic on the last day of a season without forging will lose 400 Eitr at the rollover. The destroyed uid is gone regardless. This is intentional — Eitr presses on "use it" cadence within the season.

### 7. Storage

Mirror of `RuneLedgerEntry`:

```ts
interface EitrLedgerEntry {
	entryId: string;        // canonical: seasonId:direction:sourceType:sourceKey
	seasonId: string;       // 'S01'
	account: string;        // 'alice'
	direction: 'credit' | 'debit';
	sourceType: 'burn' | 'forge_commit' | 'forge_refund';
	amount: number;         // positive integer; sign comes from `direction`
	sourceKey: string;      // idempotency, e.g. 'burn:S01:alice:trxId:uid'
	balanceBefore: number;  // ledger-derived: credits(prior) - debits(prior)
	balanceAfter: number;   // balanceBefore +/- amount per direction
	trxId: string;
	blockNum: number;
	timestamp: number;
}
```

Unlike RUNE, Eitr **has no `TokenBalance` scalar** — there is no `Eitr` field on `TokenBalance`, and no `getEitrBalanceTotal` accessor. Balance is computed by ledger query alone:

```
balance(account, seasonId) = sum(amount where direction='credit')
                           - sum(amount where direction='debit')
```

The per-entry `balanceBefore` / `balanceAfter` fields capture the trace at write time (audit-friendly), and the writer (e.g. `applyBurn`) computes them via two `getEitrLedgerTotal` queries before persisting. This keeps RUNE-style audit parity without requiring a denormalized scalar that could diverge.

### 8. Lockup at burn time

Protocol-level burn checks **only ownership** (matches existing `applyBurn` behavior). UI is responsible for hiding the "Dissolve" button when a uid is listed on marketplace, anchored in an active match, or pending in a trade. Listings whose uid is destroyed are closed by downstream `applyListingResolve` logic; pending trades are aborted by the trade resolver.

### 9. Exhaustion handling

If `forge_reveal` finds no eligible card_id (every card in the rarity is at per-card cap), the reveal completes with a `forge_refund` credit entry returning the original Eitr debit. The reveal is marked `revealed: true` so it cannot be retried. UX: *"This rarity is exhausted in the genesis pool. Your Eitr has been returned."*

### 10. Quality variants

Not in v1. The `CardQuality` type and `GOLDEN_MULTIPLIER` constant are leftover from a planned-but-unimplemented variant axis. They are deleted. A future ADR introduces quality if/when the design is revisited.

### 11. Rate limiting

No Eitr-specific rate limit. Operations inherit the PoW + nonce + posting-auth machinery already used by packs. The Eitr cost itself is the economic rate limit.

## Non-goals (v1)

These are explicitly out of scope for v1 and **must not appear** in the protocol document, the wire schemas, or the client code:

- `eitr_transfer` op — Eitr is non-transferable peer-to-peer.
- Eitr awarded by `match_result`, `campaign_result`, daily quests, or any other gameplay event.
- Eitr injecting `xp` or `level_up`. There is no `xp_update` op and Eitr will not become one.
- Forge minting a uid at any level above 0 (Mortal). XP must be earned in play.
- Quality variants (golden / foil / diamond) at the protocol layer.

## Consequences

### Protocol surface

- 2 new canonical ops (`forge_commit`, `forge_reveal`) and 1 extended op (`burn` now credits Eitr ledger and refills `pack_supply`).
- 1 new replay store: `eitr_ledger` (mirror of `rune_ledger`).
- 1 new auto-finalize loop: `autoFinalizeExpiredForgeCommits` (mirror of pack auto-finalize).
- 3 new server endpoints: `/api/testnet/eitr/state`, `/ledger`, `/balances` (mirror of RUNE).
- 1 new client API module: `client/src/data/eitrAPI.ts` (mirror of `runeAPI.ts`).

### Doc surface changes

See [.scratch/eitr-v1/issues/01-eitr-doc-cleanup.md](../../.scratch/eitr-v1/issues/01-eitr-doc-cleanup.md) for the full diff list. Summary:

- [RAGNAROK_PROTOCOL_V1.md §13](../RAGNAROK_PROTOCOL_V1.md#L641) replaced with canonical specification.
- [RAGNAROK_PROTOCOL_V1.md §14](../RAGNAROK_PROTOCOL_V1.md#L645) non-goals updated.
- [RAGNAROK_PROTOCOL_V1.md §15](../RAGNAROK_PROTOCOL_V1.md#L655) launch gate item #5 removed (Eitr is now canonical).
- [RAGNAROK_PROTOCOL_V1.md:147](../RAGNAROK_PROTOCOL_V1.md#L147) `eitr_transfer` mention deleted.
- [HIVE_BLOCKCHAIN_BLUEPRINT.md:389](../HIVE_BLOCKCHAIN_BLUEPRINT.md#L389) burn semantics nuanced (uid permanent, slot recyclable).
- [RULEBOOK.md:120](../RULEBOOK.md#L120) tabla rarity gets footnote on Eitr canon.
- [SET_AXIS.md:111](../SET_AXIS.md#L111) "eitr flags" language refreshed.
- New: [docs/TOKEN_AXIS.md](../TOKEN_AXIS.md) — single map of all tokenized balances.

### Code surface changes

- New: `shared/protocol-core/apply.ts` handlers (`applyForgeCommit`, `applyForgeReveal`, `autoFinalizeExpiredForgeCommits`), `applyBurn` extension.
- New: `client/src/data/blockchain/replayDB.ts` `eitr_ledger` store + accessors.
- New: `client/src/data/eitrAPI.ts`, `client/src/game/hooks/useEitrBalance.ts`.
- Modified: `client/src/data/blockchain/opSchemas.ts` (forge ops).
- Deleted: `GOLDEN_MULTIPLIER` constant, `CardQuality` type, `craftingStore.ts` persist logic, `offeredEitr`/`requestedEitr` from `TradeOffer`.

### Migration

`localStorage['ragnarok-crafting']` is cleared on v1 boot. A one-time UI banner explains: *"Eitr is now chain-derived. Your previous balance was a local preview."* No admin grant op is broadcast — testers start S01 with 0 Eitr.

**Non-retroactive credit for historical burns.** `rp_burn` ops broadcast **before** the v1 deployment block do not retroactively credit Eitr. The extended `applyBurn` handler ignores ops on uids that were already deleted by the legacy handler (the `if (!card) return ignored` branch fires before the ledger write). Eitr accrual begins at the upgrade block and is fully derived from burns going forward. This is consistent with the resettable testnet posture; if a tester quemó NFTs pre-upgrade, those uids are gone but generated no Eitr.

## Rejected alternatives

- **Forge debits a dedicated `forge_supply` bucket**: violates the bucket-independence axiom only if forge competes against another economy. With self-balancing burn refill, sharing `pack_supply` is conservation-correct and avoids genesis having to size yet another bucket.
- **Forge_pool fed by dissolves (uids in limbo)**: most elegant supply conservation, but introduces a "limbo" ownership state and breaks `rp_burn` semantics. Rejected as over-engineering for the v1 benefit.
- **Targeted forge (player picks card_id)**: turns Eitr into a chase-card accelerator and creates dust-farming pressure on mythics. Rejected to preserve "dust" semantics.
- **Eitr persists across seasons**: rejected to mirror RUNE engagement cadence; the asymmetry with NFT permanence is the intended press.
- **XP / level injected by Eitr**: violates orthogonality of dimensions and creates pay-to-win incentive. Rejected hard.
- **Quality variants in v1**: out of scope; future ADR.

## See also

- [docs/RAGNAROK_PROTOCOL_V1.md](../RAGNAROK_PROTOCOL_V1.md) — protocol canon
- [docs/TOKEN_AXIS.md](../TOKEN_AXIS.md) — token map
- [docs/RULEBOOK.md](../RULEBOOK.md) — Card Rarity table (Eitr value canon)
- [docs/SET_AXIS.md](../SET_AXIS.md) — genesis vs starter vs token
- [.scratch/eitr-v1/PRD.md](../../.scratch/eitr-v1/PRD.md) — design conversation
- [.scratch/eitr-v1/issues/](../../.scratch/eitr-v1/issues/) — implementation issues
