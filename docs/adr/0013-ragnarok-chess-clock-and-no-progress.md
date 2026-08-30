# ADR 0013 — Ragnarok Chess clock and no-progress limit

- **Status**: Proposed; documentation only, not implemented
- **Date**: 2026-08-30
- **Scope**: Ragnarok Chess in P2P Quick Match
- **Related**: [ADR 0007](./0007-p2p-gameplay-only-testnet.md), [ADR 0011](./0011-server-notarized-poker-turn-clock.md), [ADR 0012](./0012-p2p-v2-transport-boundaries.md)

## Context

Ragnarok Chess is not standard chess. It uses a 7×5 board, piece HP and
stamina, one optional King mine placement per turn, instant pawn/king
captures, and hero-vs-hero captures that suspend Chess and open deterministic
Poker Combat. Moving also grants stamina to the moving side's army.

A healthy P2P connection must survive an arbitrarily quiet board. Transport
ping/pong, the 60-second reconnect grace period, the 60-second Poker decision
window, and a future Chess decision clock are separate contracts. Game-action
silence must never be interpreted as network loss.

Copying a standard `3+2` chess clock would ignore the extra decisions made
before a Ragnarok move and would add time while repeated quiet moves can also
farm stamina. A per-move timer alone would bound one delay but would not bound
the match.

## Proposed decision

Quick Match uses two simultaneous Chess limits:

```text
CHESS_BANK_PER_PLAYER_MS = 360_000       // 6 minutes
CHESS_TURN_MAX_MS = 90_000               // 90 seconds
CHESS_INCREMENT_MS = 0
CHESS_NO_PROGRESS_MAX_PLIES = 40
```

For a ready Chess turn, the acting side's effective deadline is the earlier of
its remaining bank deadline and the 90-second turn deadline. Only the acting
side's bank runs.

### Start and stop boundary

- Start the clock only when the canonical phase is `chess`, the phase
  checkpoint required to enter Chess has committed, and input is legally
  actionable for the current side.
- King mine targeting and placement remain inside the same Chess decision.
  Placing a mine does not stop, pause, or restart the clock and does not add
  time.
- Stop the acting clock when one legal `chess_move`, `chess_attack`, or
  `chess_combat_initiated` command commits. Rejected commands do not stop or
  reset it.
- Stop at command commit, before presentation animation. VFX cannot spend or
  restore gameplay time.
- An instant capture completes the Chess decision normally.
- A hero-vs-hero capture stops both Chess clocks before the transition to
  Poker. Both stay paused through attack presentation, the
  `chess → poker_combat` checkpoint, Poker Combat, and the
  `poker_combat → chess` checkpoint.
- After Poker, arm the next Chess deadline only when the committed canonical
  state is actionable again. Poker time never reduces either Chess bank.

### Disconnect boundary

- A real transport failure pauses both Chess clocks and starts the existing
  60-second reconnect contract.
- A successful reconnect resumes the same bank and logical Chess turn; it
  never grants a fresh six-minute bank or restarts the 90-second turn window.
- Reconnect expiry resolves through the existing technical-abandonment
  lifecycle. It is not `chess_clock_expired` and must not be counted twice.
- An open, pong-responsive connection with no game action remains connected.

### Clock expiry

- Ragnarok never chooses a random move, passes the turn, or lets UI invent a
  move when time expires.
- Expiry proposes one idempotent `chess_clock_expired` terminal event for the
  current match, turn identity, actor and deadline.
- The expired side loses unless the opponent has insufficient decisive
  material under the existing Ragnarok Chess endgame rules; in that case the
  result is a draw.
- P2P requires a server-notarized deadline/receipt-time gate comparable to ADR
  0011. The server certifies time only; both peers apply the same terminal
  gameplay event. The relay does not select a move or inspect the board.
- Alfa keeps this result local. It does not authorize Hive settlement,
  official ELO, RUNE, Season Score or CardXP.

## No-progress limit

Ragnarok does not copy FIDE repetition identity directly. Piece HP, stamina,
mine state and hidden mine information mean equal piece coordinates do not
necessarily represent equal game state.

Instead, shared Chess state carries a deterministic `noProgressPlies` counter.
It increments after each committed Chess command and resets to zero when that
command or its immediate resolution produces at least one of:

- a pawn advance;
- any instant capture;
- entry into hero-vs-hero Poker Combat;
- a mine trigger.

Mine placement without a trigger does not reset the counter. At 40 plies,
after checking higher-priority victory/checkmate/material outcomes, the match
ends in a local draw for no progress. Poker already resets the counter on
entry; its later damage result must not reset it a second time.

The counter, reset reason and terminal result belong to canonical gameplay
state and replay. UI may display them but may not recompute them.

## Authority and state shape

The eventual implementation must use one shared contract containing at least:

```ts
type RagnarokChessClock = Readonly<{
	playerRemainingMs: number;
	opponentRemainingMs: number;
	activeSide: 'player' | 'opponent';
	turnId: string;
	turnStartedAtMs: number;
	turnDeadlineAtMs: number;
	noProgressPlies: number;
}>;
```

This shape is illustrative, not an implemented wire schema. Canonical sides
must be perspective-stable before a real schema is accepted. Absolute
deadlines and remaining-bank transitions are gameplay authority; browser
intervals only render the countdown.

## Rejected alternatives

- **Disconnect after N seconds without a move**: confuses gameplay with
  transport and caused the observed two-minute relay failure mode.
- **Fresh 60/90 seconds after every move with no bank**: bounds one decision
  but not total Chess duration.
- **FIDE `3+2` copied literally**: ignores mine selection and Poker suspension,
  and increment rewards repeated quiet movement alongside stamina gain.
- **Random/AI move on timeout**: changes player intent and would introduce a
  second gameplay authority.
- **Position-only threefold repetition**: coordinates alone omit Ragnarok HP,
  stamina and hidden mine state.
- **Let Poker reuse the Chess clock**: merges two distinct turn identities and
  contradicts the existing 60-second Poker contract.

## Implementation gate

This ADR does not activate a timer. Implementation requires a separate scoped
change with tests proving:

1. bank and 90-second deadline arithmetic;
2. mine actions preserve the current deadline;
3. rejected Chess commands do not stop or reset time;
4. quiet and instant-capture commands charge exactly the acting side;
5. Poker entry/exit pauses both Chess banks without granting time;
6. reconnect resumes the same logical turn and bank;
7. timeout is idempotent and perspective-stable on both peers;
8. no-progress reset/increment and 40-ply draw ordering;
9. terminal checkpoint convergence and zero external settlement in Alfa;
10. fresh two-browser validation behind the deployed relay/proxy.
