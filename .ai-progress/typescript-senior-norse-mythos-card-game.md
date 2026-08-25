# TypeScript Senior Progress

Task: Universal 60s poker turn clock with auxiliary card actions and P2P synchronization
Scope: .
Mode: hitl
Quality: production
Max iterations: 3
Max hypotheses: 2
Max neutral actions: 2

## Stop Condition
- [ ] all selected work items have passes=true
- [ ] no unsupported architecture/security/impact/correctness claim remains
- [ ] no new P0/P1 finding is introduced by scan or review
- [ ] progress file records decisions, changed files, blockers, and next notes
- [ ] stop after 2 consecutive neutral actions (no new information) — reassess, don't keep reading
- [ ] selected pattern-card choice is recorded with baseline-vs-pattern comparison and monotony rejection reason
- [ ] feedback loop resolved: pnpm run check
- [ ] feedback loop resolved: pnpm run lint
- [ ] feedback loop resolved: pnpm run test

## Relevant Function Patterns
- local-agent-tooling: repeated twice or fragile means script; one-off means command; evolving workflow means script plus a lazy reference. | recent=0 | avoid monotony: Do not turn every small decision into a CLI; reuse the project's existing command when it already owns the workflow.
History file: /root/.claude/projects/-root-projects-norse-mythos-card-game/memory/pattern-card-history.json

## Work Items
- [x] canvas-freeze (P0, scope): Freeze scope and stop conditions for: Universal 60s poker turn clock with auxiliary card actions and P2P synchronization
- [x] bidirectional-context (P0, evidence): Build graph, scan, impact, runtime-boundary, and existing-pattern evidence before editing
- [x] function-pattern-context (P1, context): Apply anonymous function-pattern context without monotony
- [x] risk-denoise (P1, risk): Denoise weak assumptions around client/src/game/types.ts
- [x] one-slice (P1, implementation): Implement one reviewable slice, then pause for evidence review
- [x] feedback-loop (P1, verification): Run feedback loops and compare deltas before declaring progress
- [x] progress-commit (P2, progress): Commit the block to the progress file before the next block

## Decisions
- Universal policy accepted: 60,000 ms for every human poker decision in Campaign, VS AI, and P2P.
- Auxiliary cards are repeatable and remain bounded by mana and card legality; they do not reset/advance the poker clock. A valid poker action terminates the turn.
- Resource boundary is unchanged: PRE_FLOP, FAITH, FORESIGHT and DESTINY share the same per-player mana pool for one Poker hand; phase/active-player changes do not refill mana, draw or advance hand progression.
- Battlefield capacity remains a hard five-slot command invariant; `battlefield.length >= MAX_BATTLEFIELD_SIZE` rejects a minion before play resolution.
- Mulligan remains explicit-confirmation-only; the local timer auto-confirms the current selection at 60s.
- `SPELL_PET` is retired from runtime phase entry and its Ready UI/wire machinery is removed. The enum remains only for legacy compatibility surfaces.
- P2P accepts clock announcements only for the remote actor and shared duration; `turnClockOwnerId` makes duplicate announcements idempotent.

## Changed Files
- `shared/p2p-wire/pokerTurnClock.ts`: `TurnClockPolicy`, invariant, timed-phase contract.
- `client/src/game/stores/combat/pokerCombatSlice.ts`, `activePlayerUtils.ts`, `PokerCombatTypes.ts`: merged phase entry, deadline preservation, remote owner guard.
- `client/src/game/combat/hooks/useCombatTimer.ts`, `usePokerPhases.ts`, `RagnarokCombatArena.tsx`, `useRagnarokCombatController.ts`: normal clock, card gate, timeout/mulligan handling, no Ready path.
- `client/src/game/match/modes/p2p/wireSync/useWireSync.ts`, `pokerP2PCombatAdapter.ts`, message catalog/context: fixed P2P clock and removed the legacy Ready protocol.
- `PhaseManager.ts`, `SmartAI.ts`, poker spell timing and player-facing phase copy: removed runtime Spell/Pet sequencing and aligned legal pre-flop timing.
- `client/src/game/core/commands/applyGameCommand.ts` and its test: preserved the authoritative five-slot minion gate.
- `docs/adr/0010-universal-poker-turn-clock.md`, `docs/PVP_WIRE_PROTOCOL.md`: redesign and wire contract.
- Focused regression tests updated/added for policy, clock, phase re-entry, owner idempotence, P2P adapter, and message schema.

## Blockers / Next Notes
- `pnpm run check`: pass.
- `pnpm run lint`: pass.
- Focused poker/P2P suite: pass (119 tests); resource-scope regression included.
- Battlefield command regression: pass (26 tests); minion play is rejected at the hard five-slot cap.
- `pnpm run test`: 248 files / 1,796 tests passed; one unrelated timeout remains in `client/src/data/blockchain/deckVerification.test.ts` (`accepts starter cards without nft_id in testnet`).
- Browser two-client smoke and visual verification are not run in this turn.
