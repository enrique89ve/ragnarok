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

_None._ All cards in `cardRegistry` have art assigned (verified via `npm run audit:art`).

## Pending filenames are owned by `pending-art.json`

The whitelist of cards excused from `missing_asset_mapping` errors lives in `scripts/pending-art.json` so that CI can pass while these slots are open. The audit uses it to downgrade these specific IDs from error to info. **Keep both files in sync** — adding a card here without adding the ID to `scripts/pending-art.json` will fail CI.

_Last updated: 2026-04-28. Total active pending: **0 cards**._
