# Ragnarok NFT Art Protocol

How art assets are organized and mapped to gameplay entities. Authoritative as of the most recent commit; verify against `npm run audit:art` rather than this document if they diverge.

## Source of truth

`client/src/game/utils/art/artMapping.ts` exports `ART_REGISTRY` — a single `Readonly<Record<string, string>>` that maps every gameplay entity to exactly one `.webp` file under `client/public/art/nfts/`. There is no separate metadata catalogue, no remote loader, no schema validation at runtime.

All art is **bundled locally and served from the static path**. There is no external CDN dependency — each player is their own CDN.

## Mappable entities

| Key shape | Owner | Example |
|---|---|---|
| numeric string | `cardRegistry` (gameplay cards) | `'20110': '/art/nfts/9705-p5qah4s3.webp'` |
| `hero-<slug>` | `ALL_NORSE_HEROES` (Norse / Greek / Japanese / Egyptian) | `'hero-odin': '/art/nfts/af1e-tgfxq4gr.webp'` |
| `king-<slug>` | `NORSE_KINGS` | `'king-yggdrasil': '/art/nfts/a913-axqs13eu.webp'` |

The audit (`npm run audit:art`) cross-checks each `ART_REGISTRY` key against its owning collection and fails on any mismatch.

## Filename convention (strict)

```
[0-9a-f]{4}-[0-9a-z]{8}.webp
```

First 4 chars: hex (0-9 a-f). Next 8 chars: alnum lowercase (0-9 a-z). The audit rejects any other pattern. Files MUST live at exactly `client/public/art/nfts/{filename}.webp`.

## Invariants enforced by the audit

1. Every `ART_REGISTRY` value points at a `.webp` that exists on disk.
2. Every `.webp` in `client/public/art/nfts/` is referenced by `ART_REGISTRY` (or one is a true orphan).
3. Every numeric key exists in `cardRegistry` (or is whitelisted in `scripts/pending-art.json`).
4. Every `hero-X` key exists in `ALL_NORSE_HEROES`.
5. Every `king-X` key exists in `NORSE_KINGS`.
6. No two cards share a name (collisions, case-sensitive).
7. No two `ART_REGISTRY` keys map to the same `.webp` (1:1 invariant).

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

Current charter (post-deduplication, 2026-04-26):

| Rarity | Cards | Heroes | Kings | Copies each | NFT subtotal |
|--------|------:|-------:|------:|------------:|-------------:|
| common |   914 |     12 |     3 |       2,000 |    1,858,000 |
| rare   |   684 |     38 |     2 |       1,000 |      724,000 |
| epic   |   364 |     34 |     3 |         500 |      200,500 |
| mythic |   158 |     13 |     3 |         250 |       43,500 |
| **Total** | **2,120** | **97** | **11** | — | **2,826,000** |

The audit (`npm run audit:art`) reports a "Genesis Charter Compliance" block on every run. When `status: CLEAN` the registry matches the charter exactly; any drift surfaces as a delta the user can resolve before sealing.

> Historical note: the previous dev published an aspirational 2,152-card / 91-hero / 13-king target (927 / 695 / 370 / 160 cards by rarity). That figure was computed when the registry held 32 duplicate card names plus three placeholder kings (`king-askr`, `king-embla`, `king-leif`) that were never canonical. After de-duplication, the canonicalised counts are 2,120 cards / 97 heroes / 11 kings; the per-rarity proportions of cards remain identical to two decimal places (5.78 : 4.33 : 2.30 : 1.00). Hero and king bucket sizes were re-derived from the original proportions and rounded to the integer totals.

## Adding new art

See `docs/ART_GEN_PENDING.md` for the authoring workflow. Short version: drop a uniquely-named `.webp` into `client/public/art/nfts/`, add the matching key in `ART_REGISTRY` in numerical / alphabetical order, run `npm run gen:collections` and `npm run audit:art -- --strict`.

## Retiring art

Art that is no longer referenced should be moved to `client/public/art/orphaned/`. The audit treats files there as out of scope; nothing in the served bundle picks them up. Moving rather than deleting preserves the history of designs that may be revived.

## Sophisticated search

`npm run audit:art -- --search "<query>"` runs fuzzy matching against:
- entries in external batch exports under `/mnt/c/Users/Admin/Documents/ragartdev/all_arts/`

Useful when you want to know whether a piece of art for a given character already exists outside the project before commissioning a new one.

## Related

| File / doc | Role |
|---|---|
| `client/src/game/utils/art/artMapping.ts` | The registry itself |
| `client/src/game/utils/art/index.ts` | Public re-export barrel |
| `scripts/auditArt.ts` | Cross-layer audit |
| `scripts/genCollections.ts` | Manifest generator (consumes ART_REGISTRY) |
| `scripts/pending-art.json` | Whitelist for cards awaiting art |
| `docs/ART_GEN_PENDING.md` | Authoring workflow |
| `client/public/art/orphaned/` | Retired art (not served) |
