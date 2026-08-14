# ADR 0005 — Server-notarized deterministic phase checkpoints

**Status**: Accepted
**Date**: 2026-08-13
**Deciders**: enrique
**Supersedes**: ADR 0004 only where it says the relay is fully opaque and the
server never participates during a match

**Current testnet scope**: [ADR 0007](./0007-p2p-gameplay-only-testnet.md)
uses these checkpoints without Hive `match_result` signing, settlement or
match-driven Keychain prompts.

## Context

Chess and poker remain client-owned deterministic systems. However, allowing
each browser to cross `chess ↔ poker_combat` or enter `game_over` without an
agreement checkpoint lets a predictable divergence continue into another
ruleset or into settlement.

Sending full state or replaying gameplay on the server would defeat the
low-cost P2P architecture. A fixed-size agreement protocol is sufficient at
these boundaries.

## Decision

The existing `/ws/p2p` route has one server-consumed message:
`phase_checkpoint_propose_v1`. Each authenticated room peer computes the same
canonical client-side projection and submits only its 32-byte `stateRoot` plus
the transition, epoch and previous checkpoint id.

The relay keeps one last commit and at most two votes per room. When both
proposals match byte-for-byte it emits a server-only
`__sys.event=phase_checkpoint` containing `phase_checkpoint_commit_v1`. When
they differ it emits `phase_checkpoint_dispute_v1` and freezes that room. A
client cannot forge either response because client frames beginning with `__`
are rejected.

Allowed transitions are exactly:

- `chess → poker_combat`
- `poker_combat → chess`
- `chess → game_over`
- `poker_combat → game_over`

`vs_screen` is presentation and is not checkpointed. Gameplay inputs,
rewards, `GAME_ENDED` and settlement remain gated while a checkpoint is
pending. Visual effects and audio remain local.

The root includes deterministic gameplay state: rich chess pieces, cards
state hash, pending combat handoff, mines, poker deck and state normalized to
attacker/defender, and poker-spell mechanics. It excludes clocks, timestamps,
viewer slot names, selection state, animation markers, art and audio.

Relay work is O(1) per proposal and O(1) memory per room. Empty-room checkpoint
state is retained for 120 seconds and removed by one global sweep, so reconnect
does not require a timer per match. Transport host/cards authority is derived
from lexical peer-id order and therefore does not change with reconnect order.

## Trust boundary

A commit proves that the two authenticated room peers agreed on one opaque
root. It does **not** prove that the gameplay state is objectively legal. Two
colluding clients can agree on a false state. On mismatch the server cannot
choose the honest peer without replay or external evidence, so it freezes
instead.

The v1 commit is authenticated by the active WSS system channel but is not yet
a portable server-signed settlement receipt. Binding checkpoint evidence into
the final Hive operation requires a later signed-receipt extension; this ADR
does not claim that property. In the current gameplay-only testnet there is no
final Hive operation: the terminal result remains local test evidence.

## Consequences

- ADR 0004 remains a future design reference for per-action signed settlement,
  full-match replay and post-match arbitration; ADR 0007 controls current
  testnet activation.
- The server never receives snapshots, cards, effects, art or game rules.
- One peer may stall by withholding a proposal; that is not automatic economic
  victory evidence.
- Horizontal relay deployments require room affinity or a tiny shared
  checkpoint store.
