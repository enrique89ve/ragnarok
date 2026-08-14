/**
 * Art module — public API.
 *
 * Operational mapping of cardId / heroId / kingId → art file path.
 * Authoring rule: every entry must point at a `.webp` file inside
 * `client/public/art/nfts/`. See `docs/NFT_ART_PROTOCOL.md` for the file
 * naming convention and `pnpm run audit:art` for cross-layer validation.
 */
export * from './artMapping';
export * from './elementBand';
export * from './frameArt';
