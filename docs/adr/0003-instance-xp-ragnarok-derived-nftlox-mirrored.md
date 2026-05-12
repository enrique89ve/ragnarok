# ADR 0003 - Instance XP is Ragnarok-derived and NFTLox-mirrored

**Status**: Accepted
**Date**: 2026-05-12
**Deciders**: enrique

XP and level are gameplay progression for a specific NFT instance, so Ragnarok replay is the authority and NFTLox `mutableData` is only a mirror. The server/operator indexer derives `xp` and `level` from verified Ragnarok ops, writes the projection locally, then writes the same values to NFTLox through a Ragnarok-approved data operator. If the two disagree, Ragnarok replay wins and the NFTLox mirror is repaired.

## Consequences

- Match/deck payloads that award progression must identify concrete `nftUid`s, not just `cardId`s, otherwise XP cannot be safely assigned per instance.
- NFTLox owner-authored `mutableData` must never be accepted as canonical XP.
- Marketplace and external readers may use NFTLox `xp`/`level` for display, but gameplay validation must verify against Ragnarok replay when the value matters.

