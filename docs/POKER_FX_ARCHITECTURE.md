# Poker FX Architecture

Status: active frontend contract

This document defines how poker gameplay becomes visual feedback. It does not
own gameplay rules, economy, RUNE, ledger, or protocol state.

## Authority flow

```text
game command
  -> poker store / rules resolve state
  -> visual event is emitted
  -> poker FX handler maps event to intent
  -> motion coordinator selects lane + anchor + timing
  -> effect adapter renders art, sound, or DOM motion
  -> cleanup cancels or releases visual work only
```

An animation must never validate an action, apply damage, advance a turn, or
decide a winner. A missing visual target is a presentation failure, not a
gameplay failure.

## Contract owner

`client/src/game/combat/vfx/pokerMotionContract.ts` owns the typed presentation
contract:

- `intent`: why the player needs to see the effect;
- `zone`: the canonical poker viewport zone used as its anchor;
- `priority`: how the effect competes with other visual work;
- `owner`: player/opponent when the effect is actor-specific;
- `enterMs`, `exitMs`, and `staggerMs`: the timing budget;
- cancellation and completion handles for lifecycle safety.

Coordinates come from `pokerViewportLayout.ts` and its `--poker-zone-*` CSS
variables. FX code must not introduce local canvas offsets.

## Lanes and collision policy

| Lane | Purpose | Anchor model | Collision policy |
| --- | --- | --- | --- |
| `cinema` | phase, Ragnarok, rare streak | `vfxFocus` | exclusive; the newest sequence cancels the stale one |
| `impact` | hand rank and showdown damage | feedback stack or hero target | one sequence per semantic anchor/owner |
| `feedback` | betting action and community reveal | feedback stack or community slot | same anchor replaces stale work; different community slots may stagger |
| `persistent` | turn ownership and durable state | `turnBadge` | never behaves like a toast; state owns visibility |

The coordinator uses a semantic key in addition to the lane. This prevents a
new player action from canceling an opponent action while still preventing two
effects from fighting for the same anchor.

## Current intent map

| Gameplay event | Intent | Zone | Timing |
| --- | --- | --- | --- |
| bet / raise / call / check / fold | `betting-action` | `feedbackStack` | immediate, short feedback |
| flop / turn / river reveal | `community-reveal` | `communityCards` | 160 ms slot stagger for flop |
| hand rank announced | `hand-rank` | `feedbackStack` | 400/900 ms showdown cadence |
| showdown damage | `showdown-impact` | target hero | 1400 ms after rank reveal |
| phase entered | `phase-reveal` | `vfxFocus` | cinema lane |
| Ragnarok / domination / last stand | `streak-announcement` | `vfxFocus` | rare expressive motion |
| active player changes | `persistent-turn` | `turnBadge` | persistent state transition |

## Implementation rules

1. Prefer `transform` and `opacity`; do not animate layout geometry.
2. Repeated actions must be interruptible.
3. Use `Stagger` only when order communicates meaning, such as community-card
   slots.
4. Rare cinematic motion may be longer, but must own the cinema lane.
5. Every retained motion needs a reduced-motion path.
6. Art can change without changing the intent, zone, or coordinate contract.
7. `arenaVfxTargets.ts` owns stable DOM target selectors; CSS classes are not
   gameplay or FX authority.

## Next frontend layers

1. Add lane-aware feedback rendering so the store exposes `cinema`, `impact`,
   and `feedback` independently instead of projecting everything into one
   stack.
2. Replace scale-from-zero and non-interruptible shared popups with the same
   motion primitives.
3. Add browser evidence for phase, betting, reveal, showdown, and reduced-motion
   states at the fixed poker canvas scale.
