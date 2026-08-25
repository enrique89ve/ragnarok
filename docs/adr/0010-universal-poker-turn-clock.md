# ADR 0010 — Universal 60s poker decision window

**Status**: Accepted for implementation  
**Date**: 2026-08-25  
**Scope**: Campaign, VS AI and P2P poker combat

## Requirement

Every human poker decision has one maximum window of 60 seconds. The same
contract applies to local AI matches, campaign matches and peer matches; only
the opponent controller changes.

## Foundational assumption changed

Spell/Pet preparation is not a separate human phase. It is part of the active
player's poker turn. A turn contains repeatable auxiliary card-game actions and
ends with one final poker action or a protocol timeout.

## Current design

- `CombatPhase.SPELL_PET` is a separate window with `player.isReady` /
  `opponent.isReady` synchronization.
- `useCombatTimer` has a separate Spellcraft timeout path and can skip the
  normal timer after a local Ready intent.
- `pokerCombatSlice` regenerates a clock from the current turn identity and
  advances from `SPELL_PET` only after both Ready flags are set.
- P2P has a `poker_turn_started` envelope for betting phases, while
  Spellcraft uses a separate Ready wire flow.

## Day-one design

The shared poker wire module owns one immutable turn-clock contract:

```ts
type TurnClockPolicy = {
  durationMs: 60_000;
  auxiliaryActions: 'repeatable';
  auxiliaryActionsResetClock: false;
  auxiliaryActionsAdvanceTurn: false;
  pokerActionEndsTurn: true;
  manaPoolScope: 'poker_hand';
  drawScope: 'poker_hand';
  progressionScope: 'poker_hand';
  phaseChangesRefillMana: false;
  playerChangesRefillMana: false;
  mulliganExit: 'explicit_confirmation_or_timeout';
  timeoutResolution: 'check_or_fold';
};
```

The absolute deadline is the only clock authority. Rendering derives remaining
seconds from `deadlineAtMs`; auxiliary actions never create a new `turnId`,
`startedAtMs` or `deadlineAtMs`. A valid poker action closes the current
`turnId` immediately. If the active player reaches zero, the protocol resolves
`CHECK` when there is no bet to call and `FOLD` when a response is required.

Cards are repeatable auxiliary actions. Maná is the primary practical budget,
but card legality also includes phase/timing, battlefield capacity, once-per-
turn constraints, valid targets and the same absolute deadline. There is no
artificial card-count limit. `pre_deal` cards remain legal only in their legal
pre-deal window; other card timings may participate in `PRE_FLOP`, `FAITH`,
`FORESIGHT` or `DESTINY` when their rules allow it.

The battlefield limit remains a hard command-boundary invariant:
`MAX_BATTLEFIELD_SIZE = 5`. Before a minion is played, `battlefield.length >= 5`
rejects it; extra timing and available mana never create a sixth slot.

Extending that legal timing does not create resources. `PRE_FLOP`, `FAITH`,
`FORESIGHT` and `DESTINY` consume the same per-player mana pool for the current
Poker hand. Draw and progression remain hand-scoped as they are today; phase
changes and active-player changes do not refill or increase mana. The turn
clock layer must not call the card-game turn-start pipeline or otherwise alter
mana, draw or progression.

Mulligan remains the only explicit-confirmation flow. Each P2P player confirms
their own mulligan; one peer never marks the other Ready.

## Rejected bolt-on

Keeping `SPELL_PET` as a second 60s phase and hiding the Ready button would
preserve the duplicate state machine, create two deadline authorities and make
the UI imply that a poker action is not terminal. Extending the existing
Ready handshake is therefore rejected, even as a permanent compatibility path.

## Incremental migration

1. Add the shared `TurnClockPolicy` and remove `SPELL_PET` from timed turn
   identity generation. Preserve the enum temporarily for replay/hydration
   compatibility, but never open a new human window for it.
2. Start the first poker turn directly after mulligan/first strike and keep the
   original absolute deadline through all auxiliary card actions.
3. Remove Ready gating from the local phase driver, controller, arena and P2P
   wire. The poker action remains the only normal turn terminator.
4. Make timeout submission rearmable and idempotent, and enforce one P2P clock
   owner with state/turn identity validation.
5. Add phase-aware auxiliary-card gates at the card command seam. This slice
   must not alter the per-hand mana pool, draw/progression boundaries or card
   effect resolution.

## Propagation checklist

- [x] Shared policy and 60s invariant: `shared/p2p-wire/pokerTurnClock.ts`
- [x] Poker phase entry/exit: `pokerCombatSlice.ts`, `activePlayerUtils.ts`
- [x] Final action and timeout: `pokerActionRules.ts`, `useCombatTimer.ts`
- [x] Auxiliary actions: arena card gate plus existing card command legality
- [x] P2P turn envelope, owner and duplicate handling: `useWireSync.ts` and
  `pokerP2PCombatAdapter.ts`
- [x] Remove normal-poker Ready UI and Spellcraft wire paths
- [x] Focused contract, runtime and P2P regression tests
- [x] Update `docs/PVP_WIRE_PROTOCOL.md` after the wire shape is stable

## Evidence gate

The redesign is complete only when focused tests prove that (a) an auxiliary
action preserves the original deadline and turn id, (b) a poker action creates
a new window only when the engine advances the active turn, (c) duplicate or
late P2P actions cannot advance state, (d) timeout can be retried after a
transport failure, and (e) the same 60s policy is used by Campaign, VS AI and
P2P, and (f) actor/phase changes preserve the current Poker-hand resource
scope. A full typecheck, lint and test run remains required; browser QA is
still separate evidence for presentation.
