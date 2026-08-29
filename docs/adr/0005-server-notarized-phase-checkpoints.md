# ADR 0005 — Server-notarized deterministic phase checkpoints

**Status**: Accepted
**Date**: 2026-08-13
**Deciders**: enrique
**Supersedes**: ADR 0004 only where it says the relay is fully opaque and the
server never participates during a match

**Current testnet scope**: [ADR 0007](./0007-p2p-gameplay-only-testnet.md)
uses these checkpoints without Hive `match_result` signing, settlement or
post-`Accept` Keychain prompts. Quick Match `Accept` is the one explicit
match-specific signature per player; the Control WS referee never signs.

## Context

Chess and poker remain client-owned deterministic systems. However, allowing
each browser to cross `chess ↔ poker_combat` or enter `game_over` without an
agreement checkpoint lets a predictable divergence continue into another
ruleset or into settlement.

Sending full state or replaying gameplay on the server would defeat the
low-cost P2P architecture. A fixed-size agreement protocol is sufficient at
these boundaries.

## Decision

The authenticated `/ws/control` route consumes `phase_checkpoint_propose_v1`
for signed Quick Match rooms. Each authenticated room peer computes the same
canonical client-side projection and submits only its 32-byte `stateRoot` plus
the transition, epoch and previous checkpoint id. `/ws/p2p` retains the same
consumer only for legacy/direct compatibility.

The shared referee keeps one last commit and at most two votes per room. When
both proposals match byte-for-byte it emits `phase_checkpoint_commit_v1` over
the authenticated Control WS. When they differ it emits
`phase_checkpoint_dispute_v1` and clears the votes so both peers can retry.
The legacy relay compatibility path emits the same typed result inside its
existing server envelope. The room freezes only after three mismatches on the
same epoch. Equivocation keeps the first vote and does not freeze the room.
The referee never chooses a winner. A client cannot forge commit or dispute
frames because client frames beginning with `__` are rejected.

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

Referee work is O(1) per proposal and O(1) memory per room. The legacy relay
retains empty-room checkpoint state for 120 seconds and removes it by one
global sweep; the Control WS drops its room state when its last control member
leaves. Transport host (seed parity,
cards hash frame, recovery publisher) is derived from lexical peer-id order and
therefore does not change with reconnect order. Cards *apply* is symmetric; see
`PVP_WIRE_PROTOCOL.md` OPEN-8.

## Trust boundary

A commit proves that the two authenticated room peers agreed on one opaque
root. It does **not** prove that the gameplay state is objectively legal. Two
colluding clients can agree on a false state. On mismatch the server cannot
choose the honest peer without replay or external evidence. The first
disagreements are observer retries (clear votes, notify both, do not pick a
winner). The room freezes only after the mismatch strike budget is exhausted.

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
