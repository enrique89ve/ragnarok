# Ragnarok NFT Art Protocol

How art assets are organized and mapped to gameplay entities. Authoritative as of the most recent commit; verify against `npm run audit:art` rather than this document if they diverge.

## Source of truth — split by entity kind

The mapping from a game entity to its `.webp` lives **next to the entity definition**, never in a parallel registry:

| Entity kind | Source of truth | Field |
|---|---|---|
| Cards (numeric ids) | `client/src/game/utils/art/artMapping.ts` `ART_REGISTRY` | record value |
| Heroes (`hero-X`) | `client/src/game/data/norseHeroes/` | `NorseHero.portrait` |
| Kings (`king-X`) | `client/src/game/data/norseKings/kingDefinitions.ts` | `NorseKing.portrait` |

`ART_REGISTRY` only holds card mappings. Heroes and kings carry their asset id on the entity itself; this avoids the historical dualities where the same fact was duplicated in `ART_REGISTRY` plus `ChessPieceConfig.portrait` plus the entity definition.

`resolveHeroPortrait(id)` reads the right source based on the id prefix:
```ts
if (id.startsWith('hero-')) return assetPath(`/art/nfts/${ALL_NORSE_HEROES[id]?.portrait}.webp`);
if (id.startsWith('king-')) return assetPath(`/art/nfts/${NORSE_KINGS[id]?.portrait}.webp`);
return ART_REGISTRY[id];
```

All art is **bundled locally and served from the static path**. There is no external CDN dependency — each player is their own CDN.

### Convention: `portrait` field is the asset id only

```ts
{ id: 'king-ymir', name: 'Ymir', portrait: '8f78-n51onie8', ... }
```

Just the `[0-9a-f]{4}-[0-9a-z]{8}` asset id — no `/art/nfts/` prefix, no `.webp` suffix, no slug. The path is constructed at lookup time. This keeps the field uniform and the audit easy to validate.

## Filename convention (strict)

```
[0-9a-f]{4}-[0-9a-z]{8}.webp
```

First 4 chars: hex (0-9 a-f). Next 8 chars: alnum lowercase (0-9 a-z). The audit rejects any other pattern. Files MUST live at exactly `client/public/art/nfts/{filename}.webp`.

## Invariants enforced by the audit

1. Every `ART_REGISTRY` value points at a `.webp` that exists on disk.
2. Every `.webp` in `client/public/art/nfts/` is referenced by `ART_REGISTRY` or by an entity `portrait` field (anything else is reported as orphan).
3. Every numeric key in `ART_REGISTRY` exists in `cardRegistry` (or is whitelisted in `scripts/pending-art.json`).
4. **`ART_REGISTRY` MUST NOT contain `hero-X` or `king-X` keys** — that would be a dual source of truth alongside the entity `portrait` field. The audit fails strict mode on any such key.
5. Every hero in `ALL_NORSE_HEROES` has a `portrait` field whose `.webp` exists on disk.
6. Every king in `NORSE_KINGS` has a `portrait` field whose `.webp` exists on disk.
7. No two cards share a name (collisions, case-sensitive).
8. No two `ART_REGISTRY` values + entity portraits map to the same `.webp` (1:1 invariant across sources).

Run `npm run audit:art -- --strict` in CI to enforce these.

## Single source of truth — no parallel directories

The audit also scans `client/public/` for any folder outside the allowed set (`art`, `icons`, `ui`, `sounds`, `textures`, `fonts`, `assets`, `data`) that contains image / audio / 3D files. Any such folder is reported as `parallel_art_directory` and fails strict mode. This guards against the historical pattern of multiple parallel portrait dumps (`/portraits/kings/`, `/portraits/heroes/`, `/heroes/*.glb`, `/debug_art/`, etc.) silently shadowing the canonical art system.

If an art-bearing folder needs to exist, add it to `ALLOWED_PUBLIC_ASSET_DIRS` in `scripts/auditArt.ts` so the decision is explicit and version-controlled.

## Lazy loading & service-worker cache

Art is **never bulk-downloaded**. The Vercel static host serves the `.webp` directly when a card render needs it. The service worker (`client/public/sw.js`) is a pure cache-on-fetch layer:

1. First time a card is shown → browser fetches `/art/nfts/<id>.webp` from network.
2. SW intercepts the response, stores it in the `ragnarok-assets-v3` cache.
3. Subsequent renders → SW serves instantly from cache without touching the network.

There is no "Download Game" button, no zip packs, no asset manifest. The cache grows organically as the player explores. This keeps the initial load lean and the offline experience proportional to what the player has actually seen.

## Genesis Charter — collection sizing

The total size of the sealed Genesis Alpha collection is fixed by `shared/schemas/genesisCharter.ts`. The `GENESIS_CHARTER` constant declares per-rarity bucket sizes for cards, heroes and kings; everything else (manifest totals, supply caps, NFT mint counts) is derived from it.

Current charter (sealed, derived from `shared/schemas/genesisCharter.ts`):

| Rarity | Cards | Heroes | Kings | Copies each | NFT subtotal |
|--------|------:|-------:|------:|------------:|-------------:|
| common |   914 |     12 |     6 |       2,000 |    1,864,000 |
| rare   |   684 |     38 |     2 |       1,000 |      724,000 |
| epic   |   364 |     34 |     3 |         500 |      200,500 |
| mythic |   158 |     13 |     3 |         250 |       43,500 |
| **Total** | **2,120** | **97** | **14** | — | **2,832,000** |

The audit (`npm run audit:art`) reports a "Genesis Charter Compliance" block on every run. When `status: CLEAN` the registry matches the charter exactly; any drift surfaces as a delta the user can resolve before sealing.

> Source-of-truth rule: this table mirrors `GENESIS_CHARTER` in `shared/schemas/genesisCharter.ts`. If the two diverge, the code wins — open the charter file and update this doc, never the other way around.

> Historical note: an earlier draft published an aspirational 2,152-card / 91-hero / 13-king target (927 / 695 / 370 / 160 cards by rarity). That figure was computed when the registry held 32 duplicate card names. After de-duplication and king re-balancing, the canonicalised counts are 2,120 cards / 97 heroes / 14 kings; the per-rarity proportions of cards remain identical to two decimal places (5.78 : 4.33 : 2.30 : 1.00).

## Adding new art

See `docs/ART_GEN_PENDING.md` for the authoring workflow. Short version: drop a uniquely-named `.webp` into `client/public/art/nfts/`, add the matching key in `ART_REGISTRY` in numerical / alphabetical order, run `npm run gen:collections` and `npm run audit:art -- --strict`.

## Retiring art

Art that is no longer referenced should be moved to `client/public/art/orphaned/`. The audit treats files there as out of scope; nothing in the served bundle picks them up. Moving rather than deleting preserves the history of designs that may be revived.

## Sophisticated search

`npm run audit:art -- --search "<query>"` runs fuzzy matching against:
- entries in external batch exports under `/mnt/c/Users/Admin/Documents/ragartdev/all_arts/`

Useful when you want to know whether a piece of art for a given character already exists outside the project before commissioning a new one.

## Pending-art triage

`npm run triage:art` cross-references every cardId in `scripts/pending-art.json` against the external batch exports and the orphaned pool, then prints a per-card recommendation:

- ✅ **Direct cardId match**: the external dataset declares an asset for this exact cardId and the file is present in `art/orphaned/`. Highest confidence — apply.
- ⚡ **High-confidence fuzzy (≥50%)**: name token overlap exceeds half. Worth applying after a quick visual sanity-check.
- ⚠️ **Low-confidence fuzzy (<50%)**: only one or two tokens match, often a stopword. Review manually.
- ❌ **No candidate**: needs new art commission.

Add `--json` for machine-readable output. The triage report is regenerated on demand and intentionally not committed as a static doc — file-based copies go stale within hours of any reassignment commit.

## Mismatch detection — avoiding false positives

Many cards have a `type: 'spell'` but use art whose external metadata describes a character (e.g. `5018 Odin → "Odin"`). These look like mismatches but aren't — the spell is *named after* a deity and intentionally depicts that deity. The naïve check "spell card has art with character-token in name" produces ~80% false positives.

**Rule of thumb**: a real mismatch exists when the card name and the external art name share **zero tokens of length ≥4 chars** after case-folding. Stopwords (`of`, `the`, `to`) are filtered by the length threshold. Examples:

| Card | Art (external) | Real mismatch? |
|---|---|---|
| `5018 Odin` (spell) | `Odin` | ❌ no — same token |
| `5025 Tyr` (spell) | `Bloodied Axe of Tyr` | ❌ no — share `Tyr` |
| `107 Frostbolt of Niflheim` | `Titan of the Blazing Sun` | ✅ yes — disjoint |
| `40116 Nidhogg's Chains` | `Mechanical Dragon` | ✅ yes — disjoint |

When applying a fix, **prefer pending over wrong art**. Showing `DEFAULT_PORTRAIT` is honest; showing the wrong character actively misleads the player.

## Related

| File / doc | Role |
|---|---|
| `client/src/game/utils/art/artMapping.ts` | The registry itself |
| `client/src/game/utils/art/index.ts` | Public re-export barrel |
| `scripts/auditArt.ts` | Cross-layer audit (run on every PR) |
| `scripts/triagePendingArt.ts` | On-demand `npm run triage:art` |
| `scripts/genCollections.ts` | Manifest generator (consumes ART_REGISTRY) |
| `scripts/pending-art.json` | Whitelist for cards awaiting art |
| `docs/ART_GEN_PENDING.md` | Authoring workflow |
| `client/public/art/orphaned/` | Retired art (not served) |
| `client/public/art/orphaned/ORPHAN_INVENTORY.txt` | Regenerable summary; rebuild with `node scripts/regenOrphanInventory.mjs` |
