# Set vs Rarity — taxonomy reference

Two **orthogonal** axes classify every collectible card.

## The axes

| Axis | Question | Values | Where it lives |
|---|---|---|---|
| **Set** | "How is this card distributed?" | `starter` \| `genesis` | `client/src/game/data/schemas/primitives/set.ts` |
| **Rarity** | "How scarce is it within its set?" | `common` \| `uncommon` \| `rare` \| `epic` \| `legendary` | `client/src/game/data/schemas/primitives/rarity.ts` |

A card has exactly one value on each axis. The two are independent: a `starter` card can be `legendary`, a `genesis` card can be `common`.

## Set canon

```ts
SETS = ['starter', 'genesis'] as const;
```

| Value | Meaning | On-chain | Mintable | Packs | Eitr |
|---|---|---|---|---|---|
| `starter` | Every player has these from day one. Infinite supply. Distributed via `StarterPackCeremony` from `BASE_CARD_IDS_BY_CLASS` in `baseCards.ts`. | no | no | no | no |
| `genesis` | Sealed NFT collection. Finite supply locked at Genesis ceremony. | yes | yes | yes | yes |

`SET_RULES` in `set.ts` encodes these flags as data; combat-engine code MUST NOT branch on `set`.

## Rarity canon

```ts
RARITY = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
```

Rarity is purely a tier-of-quality label. Used by:
- UI (color, glow, holo effect)
- Eitr economy (Forge/Dissolve costs in `docs/RULEBOOK.md` table)
- Pack drop tables (genesis only)

Rarity has **no gameplay effect** in the combat engine.

The `adaptRarity` adapter in `rarity.ts` translates external/legacy vocabularies (e.g. `'basic' → 'common'`, `'mythic' → 'legendary'`) at the trust boundary. Combat code never sees non-canonical values.

## Boundary normalization

`validateCardRegistry` (in `cardRegistry/validation.ts`) enforces the set axis at load time:

| Card source state | Result |
|---|---|
| `set: 'starter'` declared | `'starter'` |
| `set: 'genesis'` declared | `'genesis'` |
| `collectible !== false` and no canonical set | defaulted to `'genesis'` |
| `collectible: false` and `set !== 'starter'` | `set` stripped (combat-only token) |

This guarantees every collectible card in `cardRegistry` has a canonical `set` value, regardless of how its source file declares it.

## What is NOT in either axis

- **Heroes** (`data/heroes.ts`, `data/norseHeroes/`) — player avatars, not cards. Use `HeroRarity` for tier and `accountTier` for access gating.
- **Kings** (`data/norseKings/`) — chess-mode summoners. Same as heroes for axis treatment.
- **Tokens** (`collectible: false`, range 9000–9099 and others) — combat-only summons. `set` is undefined; they are not part of any pool.

## Commit checklist when adding a new card

1. Pick a `set` (`starter` for everyone-gets, `genesis` for NFT-mintable).
2. Pick a `rarity` from canon.
3. Make sure `id` falls in a valid range (see `docs/RULEBOOK.md` Card ID Ranges).
4. If `genesis`: register an art asset in `metadata.json` + `CARD_ID_TO_ART` in `artMapping.ts`. Run `npm test` — the snapshot in `client/src/game/utils/art/artMapping.test.ts` will diff.
5. If `starter`: art is optional (no NFT identity), but recommended for UX.

## See also

- `client/src/game/data/schemas/primitives/set.ts` — canonical set definition
- `client/src/game/data/schemas/primitives/rarity.ts` — canonical rarity + adapters
- `client/src/game/data/cardRegistry/validation.ts` — boundary normalization
- `docs/RULEBOOK.md` — gameplay-side rarity table (eitr costs)
- `docs/NFT_ART_PROTOCOL.md` — how `genesis` cards bind to assets
- `docs/GENESIS_RUNBOOK.md` — ceremony that seals the genesis pool on-chain
