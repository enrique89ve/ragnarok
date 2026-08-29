# P2P match resume

Canon for tab reload, short disconnect, and local snapshot recovery.
Gameplay authority stays on the two peers. The relay is an observer.

## Not this

`?ragnarokReload=` is a one-shot chunk cache-bust. HashRouter never reads it.
`bootstrap()` strips it. It is not a match session.

Single-player `/#/game/single` does not resume a half-finished practice match.

## Two recoveries

| Event | Source of truth | Server |
|---|---|---|
| Same-tab network drop | RAM (`peerStore`, `useWireSync` refs) | Reopen the room only |
| F5 / crash / chunk reload | Local snapshot, then the peer | Reopen the room only |

Reconnect policy is the same in both cases: **2 attempts** (`2s`, then `15s`) inside **60s**. Then a local technical result. That result is not RUNE evidence.

Transport selection is match-scoped during this window. If the initial WebRTC
attempt falls back to the relay, the relay decision is retained when
`peerStore` recreates `TransportManager`; reconnect cannot silently reintroduce
WebRTC. Each attempt uses the manager's single bounded connection budget.

On reconnect the client does not re-seed. It sends version/engine probes and `state_sync_request` to the **other peer**, not to Express.

## Local snapshot

Written every ~2.5s and on `pagehide` while a P2P match is live.

- Storage: `sessionStorage` (same tab) + IndexedDB `p2p-match-resume` (crash).
- Namespaced by reset epoch / protocol id (`createRuntimeDatabaseName`).
- One live slot per account. A newer different `matchId` may replace the slot; an older one may not.
- Cleared on `game_over`, leave, or technical result.

The snapshot is a **cache of this browser**. It is not server state and not the signed action log.

Chess→poker `CombatHandoff` is **not** taken from IndexedDB. On poker entry and on F5 apply, the client re-derives it from `matchSeed` + collision piece ids + `moveCount` (`derivePokerCombatHandoff`). Slot mapping, first strike, `combatId` and `deckSeed` come from that derivation. Mid-hand poker cards remain a local cache (not OPEN-8; cards apply is already symmetric).

### Seal (v3)

A write or restore is rejected unless:

- identity matches: `matchId` + `matchSeed` + `roomId` + `resetEpoch`
- progress does not go backwards: `turnNumber`, `chessMoveCount`, `seq`
- `turnNumber` equals `gameState.turnNumber` and move count equals the chess board
- ticket, if present, is that room and that `peerId`
- SHA-256 `seal` covers account, epoch, match, seed, room, peer, seq, turn, moves, ticket token
- age ≤ 90s
- phase is not `game_over` / `ended`

Saves are queued. IndexedDB `get` + `put` run in one transaction (compare-and-swap). Load picks the later of session vs IDB.

`init` after the match is already live is dropped. A `gameState` with a lower `turnNumber` is dropped.

## Observer rules

- `POST /api/matchmaking/leave` removes only the caller from the match book. A
  committed opponent remains `ready` until the active match expires or is left.
- `opponentDisconnected` is not a legal relay type. Departure is transport close only (`__sys.close`).
- Phase checkpoints: identical roots commit. A mismatch notifies and retries. The room freezes only after 3 mismatches. Equivocation keeps the first vote and does not freeze. The relay never picks a winner.
- Poker Time Notary: reconnect re-proposes the current `turnId`. The relay returns the original `serverStartedAtMs` / `serverDeadlineAtMs`. It does not grant a fresh 60s. Empty-room notary state is retained for the same 120s tombstone as phase checkpoints.

## What is still open

- Ranked replay from the encrypted `action-log` (`loadLog` is test-only today). ADR 0007 forbids Keychain mid-match, so that path stays deferred.
- Cards: both peers apply `game_command` locally after a `cards_deck` handshake. Host `gameState` is recovery-on-mismatch only. Rewind and extra `init` are already blocked.
- Last unsaved seconds before `pagehide` can be lost.

## Code

- `client/src/game/p2p/p2pMatchResume.ts`
- `client/src/game/p2p/p2pMatchResumeBridge.ts`
- `client/src/game/p2p/p2pResumePokerHandoff.ts`
- `client/src/game/p2p/useP2PMatchResume.ts`
- `client/src/game/stores/peerStore.ts` (`rejoinPersistedRoom`)
- `client/src/lib/chunkLoadRecovery.ts` (asset bust only)
