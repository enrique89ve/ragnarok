# Card category — distribution canon

How every card is bucketed for ownership, supply and on-chain semantics. Orthogonal to rarity (canon in [`docs/RULEBOOK.md`](./RULEBOOK.md) Card Rarity table, materialized in `shared/schemas/rarity.ts`).

## The mental model (read this first)

Cards split into two macro buckets:

```
  ASSET (bound to a player/account)                 EPHEMERAL (no ownership)
  ├── genesis  — economic NFT, on-chain, finite     └── token  — combat-only,
  └── starter  — account-bound, off-chain, infinite                summoned by effects
```

Tactically:
- *"Is this card owned by a player?"* → `isOwnedByPlayers(c.category)` — the macro split (asset vs ephemeral).
- *"If owned, is it on-chain?"* → `isOnChain(c.category)` — the sub-split inside asset (genesis vs starter).
- *Direct identity check* → `c.category === 'genesis' | 'starter' | 'token'` — exhaustive enum at the leaf level.

The flat enum `CardCategory` is the canonical TS type; the hierarchy above is the way humans should think about it. Both views are equivalent.

## Where the discriminator lives

- **`set`** — the *authoring intent* declared in source files (`'starter' | 'genesis'`). Optional. Lives in `client/src/game/data/schemas/primitives/set.ts`.
- **`category`** — the *canonical post-validation discriminator* (`'token' | 'starter' | 'genesis'`). **Always present** on cards exiting the registry. Lives in `shared/schemas/cardCategory.ts`.

Consumers MUST branch on `category` (it's exhaustive and TypeScript-checked). The `set` field stays for authoring clarity but never appears alone in business logic.

## Category canon (with hierarchy)

Three categories ordered ascending by economic weight:

```ts
CARD_CATEGORIES = ['token', 'starter', 'genesis'] as const;
```

| Category | Order | On-chain | Mintable | In packs | In decks | Owned by players | Supply capped |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `token`   | 0 | no  | no  | no  | no  | no  | no  |
| `starter` | 1 | no  | no  | no  | yes | yes | no  |
| `genesis` | 2 | yes | yes | yes | yes | yes | yes |

`starter` ownership is account-bound and non-economic. Starter cards do not earn `CardXP`, do not emit `level_up`, do not receive NFT evolution scaling, and do not gain transferable value. Starter usage is tracked separately as local/account-bound reputation.

### Starter delivery

Starter cards reach a new account as **a single deterministic Starter Pack of 45 cards** — never as random pack draws. The card-id list is canonical in [`shared/schemas/starterEntitlement.ts`](../shared/schemas/starterEntitlement.ts) (10 Mage + 10 Warrior + 10 Priest + 10 Rogue + 5 Neutral). The pack metadata (`cardCount: 45`, `commonSlots: 45`, all chance fields `0`) lives in [`shared/protocol-core/packCatalog.ts`](../shared/protocol-core/packCatalog.ts) so the pack catalog stays uniform with `slotTotal === cardCount`, but the open is content-fixed — `applyLegacyPackOpen`, `applyPackCommit` and `applyPackReveal` all reject `pack_type === 'starter'`. See [`docs/RAGNAROK_PROTOCOL_V1.md`](RAGNAROK_PROTOCOL_V1.md) §15.2 for the protocol-side rejection rules.

`CARD_CATEGORY_TABLE` in `cardCategory.ts` encodes the matrix as data; combat-engine code MUST NOT branch on `category` for resolution rules. `categoryOrder()` and `isAtLeast()` enable hierarchy filters like *"every card a player can own"* (= `isAtLeast(c.category, 'starter')`).

## Macro splits (derived views)

The category table answers two macro questions implicitly. Both are derived helpers — no new state, just clearer call sites.

### NFT vs non-NFT

```ts
isNFT('genesis')  === true
isNFT('starter')  === false
isNFT('token')    === false
```

Use `isNFT(c.category)` whenever you mean "is this card on-chain / mintable / supply-capped". Backed by `CARD_CATEGORY_TABLE.<x>.onChain`.

`isNFT(c.category)` is also the correct conceptual boundary for economic progression. `CardXP`, `level_up`, NFT mastery badges, and NFT evolution scaling are NFT-only concepts. Starter cards may have local/account reputation, but that reputation must not be confused with transferable card progression.

### Persistent vs ephemeral

```ts
isPersistent('genesis')  === true   // owned, in deck, lives across combats
isPersistent('starter')  === true   // owned by all players, in deck
isPersistent('token')    === false  // exists only during one combat
```

Use `isPersistent(c.category)` to mean "this card lives outside combat" — i.e. has account binding, can be in a deck, has identity. Backed by `CARD_CATEGORY_TABLE.<x>.inDecks`.

### Owned vs un-owned

```ts
isOwnedByPlayers('genesis')  === true   // owned via NFT mint
isOwnedByPlayers('starter')  === true   // owned by every player from day one
isOwnedByPlayers('token')    === false  // no owner, runtime entity
```

Use `isOwnedByPlayers(c.category)` to mean "is this card bound to a player account?" — the Web3 "asset" question.

> **Note**: there is intentionally **no** `isCollectible(c)` helper. The source field `collectible: boolean` has a narrower meaning in this codebase (it marks the genesis NFT pool, not all owned cards), and adding such a helper would duplicate `isNFT` while suggesting a different semantics. Use `isNFT` or `isOwnedByPlayers` instead, depending on which question you mean.

### The summon relationship (what tokens are NOT)

A `token` card is **not a sub-category** of `genesis` or `starter`. It is a peer category that represents a runtime entity. Cards from any category can summon tokens via `summonId`:

```ts
// In a deathrattle / battlecry / etc. on a parent card:
deathrattle: { type: 'summon', summonId: 9206 }
```

The relationship is one-directional: parent → token. The token does not know who summoned it, and the same token can be summoned by many different parent cards across categories.

Therefore:
- *"Can a starter card summon a token?"* — Yes.
- *"Can a genesis card summon a token?"* — Yes (very common — most NFT minions with deathrattles).
- *"Does a token belong to genesis or starter?"* — Neither. It is shared combat infrastructure.

## Set canon (authoring intent, optional)

```ts
SETS = ['starter', 'genesis'] as const;
```

Capabilities (on-chain, mintable, in-packs, deck limits) live in `CARD_CATEGORY_TABLE` keyed by `category`, not on the authoring `set`. There is no per-set `eitr` flag: Eitr eligibility is a derived consequence of `category === 'genesis'` (only genesis uids can be burned for Eitr — see [ADR 0001](./adr/0001-eitr-v1-canonical.md) and [TOKEN_AXIS.md](./TOKEN_AXIS.md)). Combat tokens have no `set` value because they are not part of any distribution pool.

<!-- Decision (2026-05-12, issue 01 doc-cleanup): `SET_RULES` does not exist in `client/src/game/data/schemas/primitives/set.ts` and was never landed in `shared/`. Earlier prose described an `eitr` flag that never materialized. The non-branching rule is enforced by absence (combat-engine code can't read a flag that isn't there). Future authors: do not add a per-set `eitr` flag — Eitr eligibility is category-derived. -->


## Boundary normalization

`validateCardRegistry` (in `cardRegistry/validation.ts`) classifies every card at load time and stamps `category`:

| Card source state | Stamped `category` | Notes |
|---|---|---|
| `set: 'starter'` declared | `'starter'` | regardless of `collectible` |
| `set: 'genesis'` declared, `collectible !== false` | `'genesis'` | |
| no canonical set, `collectible !== false` | `'genesis'` | default |
| `collectible: false`, no `set: 'starter'` | `'token'` | `set` stripped from output |

This guarantees every collectible card in `cardRegistry` has a canonical `set` value, regardless of how its source file declares it.

## What is NOT in the axis

- **Heroes** (`data/heroes.ts`, `data/norseHeroes/`) — player avatars, not cards. Use `HeroRarity` for tier and `accountTier` for access gating.
- **Kings** (`data/norseKings/`) — chess-mode summoners. Same as heroes for axis treatment.
- **Tokens** (`collectible: false`, range 9000–9099 and others) — combat-only summons. `set` is undefined; they are not part of any pool.

## Commit checklist when adding a new card

1. Pick a `set` (`starter` for everyone-gets, `genesis` for NFT-mintable).
2. Pick a `rarity` from canon — see `docs/RULEBOOK.md` Card Rarity table.
3. Make sure `id` falls in a valid range (see `docs/RULEBOOK.md` Card ID Ranges).
4. If `genesis`: drop a `.webp` in `client/public/art/nfts/` (filename pattern `[0-9a-f]{4}-[0-9a-z]{8}.webp`) and add a line to `ART_REGISTRY` in `client/src/game/utils/art/artMapping.ts`. Run `pnpm test` — the snapshot in `client/src/game/utils/art/artMapping.test.ts` will diff. Run `pnpm run audit:art -- --strict` to confirm cross-layer integrity.
5. If `starter`: art is optional (no NFT identity), but recommended for UX.

## See also

- `client/src/game/data/schemas/primitives/set.ts` — canonical set definition
- `shared/schemas/rarity.ts` — canonical rarity (4 tiers per RULEBOOK)
- `client/src/game/data/cardRegistry/validation.ts` — boundary normalization
- `docs/RULEBOOK.md` — gameplay rules and rarity canon (Card Rarity table)
- `docs/NFT_ART_PROTOCOL.md` — how `genesis` cards bind to assets
- `docs/GENESIS_RUNBOOK.md` — ceremony that seals the genesis pool on-chain
