# ADR 0002 - State authority boundaries

**Status**: Accepted
**Date**: 2026-05-12
**Deciders**: enrique

Ragnarok splits authority by domain instead of letting PostgreSQL or any one indexer become the hidden source of truth. Starter cards are a universal entitlement declared in `shared/schemas/starterEntitlement.ts` and may be distributed as TS/JSON artifacts; Protocol Buffers are allowed only as generated transport/cache artifacts, not as the canonical authoring source. NFTLox owns genesis NFT custody and distribution, while Ragnarok replay owns gameplay-derived state: ranking, tournament-sensitive progress, RUNE, Eitr, pack RNG resolution, and any balance used for rewards.

## Consequences

- PostgreSQL/server storage is an operational projection only; it must be rebuildable or replaceable.
- Starter cards must not be materialized as per-player inventory rows.
- Sensitive pack distribution must check both the Ragnarok entitlement trigger and NFTLox custody/distribution state.
- The canonical final ranking remains reproducible from Ragnarok Hive replay, not from a leaderboard table.

