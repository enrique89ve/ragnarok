# ADR 0007 — Gameplay-only P2P testnet

**Status**: Accepted  
**Date**: 2026-08-13  
**Deciders**: enrique  
**Supersedes**: ADR 0004 only for the current testnet activation order and
wallet-prompt budget; it does not remove the future ranked settlement design

## Context

The immediate testnet objective is to prove that complete P2P matches are
fluid and deterministic across two browsers. Activating Hive settlement at the
same time would add wallet prompts, economic side effects and winner-arbitration
failure modes that do not help validate chess, poker, reconnects or phase
transitions.

The server should do the least possible work. Gameplay rules, state, effects,
art and audio remain client-side. The relay is already the connectivity fallback
for browsers that cannot establish a direct path.

## Decision

The current Alfa/closed testnet P2P track is **gameplay-only**:

- Both peers run the deterministic chess and poker mechanics.
- The WebSocket relay notarizes only deterministic phase boundaries as defined
  by [ADR 0005](./0005-server-notarized-phase-checkpoints.md).
- No P2P `match_anchor` or `match_result` is signed or broadcast to Hive.
- The match flow must not open Hive Keychain during a match, on reload/reconnect,
  or after `game_over`. A login/session action explicitly initiated before
  matchmaking may still use Keychain.
- P2P does not settle RUNE, ELO, Season Score, CardXP, `level_up`, NFTLoX mutable
  data or ownership.
- The terminal result is displayed and exported as local test evidence only.
  It is not canonical economic evidence.

The winner-posted `match_result` path, session keys, winner arbiter and Hive
broadcast remain future ranked work under
[ADR 0008](./0008-winner-posted-match-result.md). Those documents stay in the
repository, labeled deferred, and must not be testnet release gates for this
gameplay-only track. There is no loser `game_over` countersign.

## Server boundary

The server is a bounded phase referee, not a gameplay judge:

1. authenticate matchmaking and room membership;
2. relay approved fixed-size wire envelopes;
3. compare the two opaque roots only at `chess ↔ poker_combat` and
   `* → game_over`;
4. commit an exact match or freeze on disagreement without choosing a winner.

This keeps proposal handling and memory O(1) per active room. The server does
not replay moves, evaluate cards or poker hands, inspect snapshots, award a win,
or submit a Hive operation.

## Acceptance evidence

A gameplay-only P2P smoke is successful when two browsers complete the full
`chess → poker_combat → chess → game_over` path, agree at every phase checkpoint,
survive the supported short reconnect path, export diagnostic evidence, show a
local terminal result, and trigger no match-driven Keychain prompt or Hive
operation.

## Consequences

- Gameplay bugs and connectivity issues can be measured independently from
  settlement and wallet UX.
- A local winner is not an official ranked winner and receives no canonical
  economic mutation.
- Checkpoint agreement detects divergence but does not prove objective legality;
  colluding clients may agree on a false root.
- Ranked settlement is specified by
  [ADR 0008](./0008-winner-posted-match-result.md): winner-posted `match_result`,
  server replay validation, no loser countersign at game_over. It stays
  inactive until Closed Beta explicitly opens that gate.
