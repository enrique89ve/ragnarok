# Ragnarok NFT Art Protocol (DNA)

This document defines the standard for NFT assets within the Ragnarok Mythos ecosystem. By following this protocol, assets become "Self-Describing" and integrate automatically into the game's rendering engine.

## 1. The Source of Truth
The canonical list of all validated NFT assets is located at:
`client/public/art/nfts/metadata.json`

Every asset in the game MUST be registered here to be considered part of the "Official Collection".

## 2. Asset Schema (DNA Parameters)

Each NFT entry in the `cards` array must contain the following Aesthetic DNA:

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Unique identifier (hex pattern: `xxxx-xxxxxxxx`). |
| `collection` | `string` | The Release/Set name (e.g., "Genesis Alpha", "Greek Expansion"). |
| `character` | `string` | Canonical character name (slug format: `odin`, `thor`). |
| `name` | `string` | Display name. |
| `category` | `string` | Classification (gods, goddesses, vikings, pets). |
| `element` | `string` | Gameplay element (fire, water, ice, grass, light, dark, electric). |
| `rarity` | `string` | common, uncommon, rare, epic, mythic. |
| `mainArt` | `boolean` | If true, this is the primary portrait for the character. |
| `styleDNA` | `object` | Rendering hints (palette, composition, scale). |
| `_localPath` | `string` | Path relative to public folder. |

## 3. Rendering DNA
The game engine uses these parameters to decide HOW to render the card:
- **Portrait ID**: Derived from `id`.
- **Theme**: Derived from `element`.
- **Holo Effect**: Enabled if `rarity` is `epic` or `mythic`.

## 4. Collection Versioning
The `metadata.json` includes a `version` field at the root. 
- **Major**: Breaking changes to the schema.
- **Minor**: New collections added.
- **Patch**: Asset bugfixes (path corrections).

## 5. Implementation DNA
The `ArtRegistry` module (`client/src/game/utils/art/artRegistry.ts`) acts as the bridge between this protocol and the React components. No hardcoded paths should exist outside this registry.
