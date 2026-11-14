# Presentation Orchestration

Status: architecture contract (implementation incremental)

Gameplay stores remain authoritative. This layer owns **human pacing** only: who
may occupy which pixel, for how long, and in what order. It does not advance
turns, damage, or protocol state.

## Problem

Poker arena feedback arrived through parallel paths (`PhaseBanner`,
`combatFeedbackStore`, `unifiedUIStore`, `pokerMotionContract`, floaters).
Without a single lane policy, decorative VFX could preempt center titles and
stack chips felt simultaneous.

## Target architecture

```text
gameplay visual event
  -> typed intent (lane + optional holder + dwellMs)
  -> PresentationOrchestrator (policy; no DOM)
  -> existing stores / motion contract (render state)
  -> React + GSAP adapters
```

### Lanes

| Lane | Anchor | Occupancy | Examples |
| --- | --- | --- | --- |
| `center-title` | cinema reading lane | exclusive; `cinemaLanePolicy` holders | PhaseBanner, First Strike, matchup, hand-rank slam |
| `stack` | feedback stack | one chip + pending + cascade gap | `showStatus`, spell toasts |
| `announcement` | top-right | queue; defers when stack/center busy | `ActionAnnouncement` |
| `floater` | hero / card | local; must not release other lanes | damage floaters, hero popups |
| `zone-vfx` | board slots | decorative; **no** `occupyCinema` | shake, particles, deal motion |

### Hard rules

1. **VFX in `zone-vfx` must not call `occupyCinema` or shorten another lane's dwell.**
2. **One center title at a time** (`isCenterTitleBlocked`).
3. **Cascade:** `FEEDBACK_CASCADE_GAP_MS` (1.5s) between stack and announcement items.
4. **Gameplay clock never waits** on presentation `onComplete`.

### Current implementation map

| Concern | Today | Target owner |
| --- | --- | --- |
| Center holders | `cinemaLanePolicy.ts` + `combatFeedbackStore` | unchanged; extend only via policy |
| Stack queue | `combatFeedbackStore` | unchanged |
| Announcements | `unifiedUIStore` + feedback subscribe | route defer through orchestrator helper |
| Phase VFX | `phase-reveal` without `poker-cinema` | frozen |
| Slams | `poker-cinema` + `POKER_MOTION_SPECS` | unchanged |
| Message copy | meta UI still uses `showStatus` | combat/poker: `enqueueGameplayMessage` → catalog |

### Facade API

`client/src/game/effects/presentation/presentationOrchestrator.ts` (adopt at new call sites; legacy paths migrate per issue tracker):

- `presentationBusy(lane): boolean`
- `requestCenterTitle(holder, dwellMs): void` — wraps `occupyCinema` + policy check
- `canShowFloater(): boolean` — false while center-title or stack presentation active
- `enqueueGameplayMessage(messageId, params)` — catalog + stack lane

No second timer runtime: `gameEffectCoordinator` + Zustand stay authoritative.

## Agent orchestration (how we build this)

See `.scratch/presentation-orchestration/PRD.md` for issue slices, harness gates
per slice, and which agent role runs each phase.

## Related docs

- `docs/GAME_EFFECT_ARCHITECTURE.md` — effect domains and migration order
- `docs/POKER_FX_ARCHITECTURE.md` — motion intents and center choreography
- `docs/POKER_ARENA_UI.md` — lane geometry and mount targets