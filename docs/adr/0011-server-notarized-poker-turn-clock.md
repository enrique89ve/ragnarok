# ADR 0011 — Server-notarized Poker turn clock

**Status**: Accepted for implementation  
**Date**: 2026-08-25  
**Scope**: P2P poker combat only. Campaign, Single, and VS AI keep a local `PokerTurnClock`.  
**Related**: [ADR 0005](./0005-server-notarized-phase-checkpoints.md), [ADR 0010](./0010-universal-poker-turn-clock.md)

## Requirement

In P2P, a client must not be able to autodeclare when a 60s poker decision
window started or whether an action arrived in time. The existing
`PokerTurnClock` window `(turnId, startedAtMs, deadlineAtMs, durationMs)` stays
the mathematical contract. The relay certifies the timestamps.

## Foundational assumption

The WebSocket host is not gameplay authority. Both peers execute poker
locally. The server answers only:

- when this `turnId` officially started
- when it officially expires
- whether a `poker_action` arrived before or after that deadline

It does not compute cards, HP, mana, stamina, betting, or hand rank.

## Current design

`poker_turn_started` is a peer-advisory envelope. The active player announces
`remainingMs` / `sentAtMs`. The receiver rebuilds a deadline from its own
`Date.now()`. A delayed announcement extends the window. Timeout vs player
origin already exists in the game core (`PokerActionOrigin`).

## Day-one design

Reuse `poker_turn_started` as a dual proposal, consumed by the relay the same
way `phase_checkpoint_propose_v1` is consumed. Both peers propose the same
canonical identity (`combatId`, `phase`, piece-id `activePlayerId`,
`actionsThisRound`, `turnId` from `buildPokerTurnId`). The first valid
proposal stamps `serverStartedAtMs`. The deadline is always

`serverStartedAtMs + DEFAULT_POKER_TURN_DURATION_MS`

The second matching proposal commits. A late second vote never restarts the
60s. Client `durationMs` / `remainingMs` / `sentAtMs` are ignored. The relay
emits `__sys.event=poker_turn_notary` with a server-only commit or dispute.
Clients cannot forge commit frames (`__` reserved).

Memory is O(1) per room: previous committed turn + current pending-or-committed
turn (at most two votes). Empty rooms keep that tombstone for the same 120s
reconnect window as phase checkpoints.

`poker_action` is time-gated without GameState. The gate looks only at
`current` and requires a dual commit:

- missing notary / disputed room is fail-closed (drop)
- `current.status !== 'committed'` → drop `notary_pending`
- `action.turnId !== current.turnId` → drop `stale_turn` (`previous` is only
  for reconnect replay of the commit, never for new actions)
- `origin=player` requires `receivedAtServerMs < deadline`
- `origin=timeout` requires `receivedAtServerMs >= deadline`

The commit also carries `remainingMsAtCommit`, computed from the server
deadline minus server now at emit time. Clients project that remainder onto
local `Date.now()` for UI/timeout firing. Acceptance authority stays the
relay receive timestamp versus `serverDeadlineAtMs`.

The server never chooses Check vs Fold. Each peer still runs
`derivePokerTimeoutIntent`. Auxiliaries do not create a new notary turn.

On mismatch the relay does not pick a winner. Equivocation keeps the first
vote. The room freezes only after three peer mismatches, matching ADR 0005.

Local UI projects remaining time as `Date.now() + remainingMsAtCommit`.
That projection is not acceptance authority and does not compare wall clocks.

## Rejected bolt-on

A second `TurnClock`, NTP skew compensation, per-second tick sync, and a
generic Notary base class shared with phase checkpoints are rejected. The
phase coordinator is the pattern to copy, not an abstraction to merge.

Failing open to each peer's local clock when the notary is missing is
rejected for P2P testnet: a missing notary drops time-sensitive
`poker_action` frames.

## Trust boundary

A commit proves both authenticated room peers agreed on one turn identity and
that the relay stamped the start time. It does not prove the poker action is
legal. Two colluding clients can still agree on a false board. Future dispute
verification is out of scope.

## Evidence gate

Focused tests must prove: dual commit, second vote does not reset, duplicate
and reconnect replay the same deadline, client duration is ignored, stale
previous turn does not replace current, player/timeout gating at the exact
deadline, cleanup, perspective-stable `turnId`, and Single/Campaign still use
the local clock.
