# Ragnarok NFT Art Protocol (DNA)

This document defines the standard for NFT assets within the Ragnarok Mythos ecosystem. By following this protocol, assets become "Self-Describing" and integrate automatically into the game's rendering engine.

> **Last verified:** 2026-04-25 — schema cross-checked against `client/public/art/nfts/metadata.json` and `client/src/game/utils/art/types.ts`.

## 1. The Source of Truth
The canonical list of all validated NFT assets is located at:
`client/public/art/nfts/metadata.json`

Every asset in the game MUST be registered here to be considered part of the "Official Collection".

All art is **bundled locally and served from `_localPath`**. There is no external CDN dependency — each player is their own CDN.

## 2. Asset Schema (DNA Parameters)

Each NFT entry in the `cards` array conforms to the `ArtCard` interface (`client/src/game/utils/art/types.ts`):

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Unique identifier (hex pattern: `xxxx-xxxxxxxx`). |
| `character` | `string` | Canonical character slug (e.g., `odin`, `thor`). Multiple cards can share a `character`. |
| `name` | `string` | Display name. |
| `category` | `string \| null` | Classification — see §2.1. |
| `description` | `string \| null` | One-line flavor text. |
| `lore` | `string \| null` | Full mythological description. |
| `element` | `string \| null` | Gameplay element — see §2.1. |
| `piece` | `string \| null` | Chess piece role — see §2.1. |
| `faction` | `string \| null` | Faction allegiance — see §2.1. |
| `rarity` | `string \| null` | Rarity tier — see §2.1. |
| `mainArt` | `boolean` | If `true`, this is the primary portrait for the character. |
| `collection` | `string` (optional) | Release/Set name (e.g., `"Genesis Alpha"`). |
| `styleDNA` | `object` (optional) | Rendering hints: `palette[]`, `composition`, `scale`. |
| `stats` | `ArtCardStats` | All six fields nullable — see §2.2. |
| `wiki` | `string \| null` | External wiki URL (e.g., `https://mythus.fandom.com/...`). |
| `_localPath` | `string` | Path relative to public folder (e.g., `/art/nfts/{id}.webp`). |

### 2.1 Enum Values (current data)

| Field | Allowed values |
|---|---|
| `category` | `gods`, `goddesses`, `vikings`, `pets`, `mystical beings` |
| `element` | `fire`, `water`, `wind`, `earth` |
| `faction` | `aesir`, `vanir`, `jotnar`, `mystical beings`, `pets` |
| `piece` | `king`, `queen`, `bishop`, `knight`, `rook`, `pawn` |
| `rarity` | `common`, `uncommon`, `rare`, `epic`, `legendary` |
| `collection` | `Genesis Alpha` (only release shipped so far) |

> **Note:** types.ts declares some of these as `string | null` (open) while runtime values are bounded. The strict enums (`ArtFaction`, `ArtElement`, `ArtPiece`) are exported for filter UIs.

### 2.2 ArtCardStats Schema

```ts
{
  health: number | null,
  stamina: number | null,
  attack: number | null,
  speed: number | null,
  mana: number | null,
  weight: number | null
}
```

These are **NFT lore stats**, not gameplay stats. Combat stats live in `client/src/game/data/cardRegistry/`. Currently only `health` and `weight` are populated for the 406 Genesis Alpha cards; the rest are `null` placeholders.

## 3. Rendering DNA
The game engine uses these parameters to decide HOW to render the card:
- **Portrait source**: `_localPath` resolved through `assetPath()`.
- **Theme**: derived from `element`.
- **Holo Effect**: enabled if `rarity` is `epic` or `legendary`.
- **Faction badge**: derived from `faction`.

## 4. Collection Versioning
The `metadata.json` includes a `version` field at the root.
- **Major**: Breaking changes to the schema.
- **Minor**: New collections added.
- **Patch**: Asset bugfixes (path corrections, lore edits).

## 5. Implementation DNA

The art module lives at `client/src/game/utils/art/`:

| File | Role |
|---|---|
| `types.ts` | TypeScript schema for `ArtCard`, `ArtMetadata`, `ArtFilters`. |
| `artRegistry.ts` | Loads and caches `metadata.json` (Source of Truth, 406 NFT VIPs). |
| `artMapping.ts` | Operational map `card_id ↔ art file` (covers ~2,700+ files including non-NFT gameplay assets). |
| `artUtils.ts` | Pure helpers: filter, group, lookup. |
| `index.ts` | Public barrel export. |

**Two-layer model:**
- `metadata.json` = canonical NFT identity (lore + DNA, 406 entries).
- `artMapping.ts` = render-layer mapping for the full card pool (~2,700 files).

No hardcoded paths should exist outside this module.
