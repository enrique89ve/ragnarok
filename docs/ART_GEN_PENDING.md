# Art generation — pending queue

Cards that exist in `cardRegistry` but have no entry in `client/src/game/utils/art/artMapping.ts` (and therefore no `assetId` in the manifests). Each entry is a slot the audit (`npm run audit:art`) tracks; once the matching artwork is dropped into `client/public/art/nfts/` and a line is added to `ART_REGISTRY`, the entry must be removed from this list.

## Authoring workflow

1. Pick a card below.
2. Generate or commission art at 1024×1024 minimum, exported as `.webp`.
3. Choose a filename matching the canonical pattern `[0-9a-f]{4}-[0-9a-z]{8}.webp` (4 hex + dash + 8 alnum). Verify it does not collide with existing files: `ls client/public/art/nfts/<prefix>*`.
4. Drop the file at `client/public/art/nfts/<filename>.webp`.
5. Add a line in `client/src/game/utils/art/artMapping.ts`'s `ART_REGISTRY`, placed in numerical order:
   ```ts
   '<cardId>': '/art/nfts/<filename>.webp',
   ```
6. Run `npm run gen:collections` to refresh manifests and `npm run audit:art` to confirm the entry leaves this queue.
7. Remove the row from this file **and** from `scripts/pending-art.json` in the same commit.

## Pending cards

### Additional Class Minions — 3 cards

**Deferral reason:** Cards in `additionalClassMinions.ts` pending art review as part of ongoing class card migration. Not blocking gameplay.

| cardId | Name | Type |
|--------|------|------|
| 40002 | Sorcerer | minion |
| 40009 | Keeper of the Grove: Silence | spell |
| 40013 | Muspel Imp | minion |

### Quest / Legendary Cards — 6 cards (IDs 95501–95506)

**Deferral reason:** High-profile quest and legendary cards with strong narrative identity. Intentionally deferred — these cards deserve custom-generated art that reflects their unique role in the game, not generic portraits from the orphaned pool.

| cardId | Name | Type | Notes |
|--------|------|------|-------|
| 95501 | Chronos Warp | spell | Time-manipulation quest reward |
| 95502 | Mjolnir | weapon | Thor's hammer — iconic, needs signature art |
| 95503 | Yggdrasil Core | spell | World Tree essence — central to Norse theme |
| 95504 | Elpis, Warden of Hope | minion | Greek mythology — Hope personified |
| 95505 | Queen Echidna | minion | Mother of Monsters — needs tentacular beast art |
| 95506 | Barnabus, Titan Stomper | minion | Titan stomper — needs massive giant art |

## Non-active files (excluded from this queue)

The following files contain card definitions that are **not imported** into the active card registry. They do not affect the game and are not tracked by the art audit. They are documented here to avoid future confusion.

| File | IDs | Reason excluded |
|------|-----|----------------|
| `pets/darkPets.ts` | 50400–50417 | Not imported in `pets/index.ts` — orphaned file |
| `pets/lightPets.ts` | 50500–50513 | Not imported in `pets/index.ts` — orphaned file |
| `pets/neutralPets.ts` | 50600–50615 | Not imported in `pets/index.ts` — orphaned file |

> **Note:** The active pet system is the 38-family 3-3-1 system (IDs 50000–50376), fully documented in `RULEBOOK.md § Pet Evolution System`. That system has 266 art entries in `artMapping.ts` and is fully covered.

## Pending filenames are owned by `pending-art.json`

The whitelist of cards excused from `missing_asset_mapping` errors lives in `scripts/pending-art.json` so that CI can pass while these slots are open. The audit uses it to downgrade these specific IDs from error to info. **Keep both files in sync** — adding a card here without adding the ID to `scripts/pending-art.json` will fail CI.

_Last updated: 2026-04-28. Total active pending: **9 cards** (3 class minions + 6 quest cards)._
