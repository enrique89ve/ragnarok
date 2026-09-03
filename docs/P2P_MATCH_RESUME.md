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
| F5 / crash / chunk reload | Local snapshot for validation; no gameplay rejoin in current Alfa | No relay rejoin until session renewal is enabled |

Same-tab reconnect uses **2 attempts** (`2s`, then `15s`) inside **60s** and
then a local technical result. A full reload is a separate explicit blocker in
the current Alfa because its ephemeral key cannot be renewed. Neither result
is RUNE evidence.

Starting a different room while the old match is in `grace_period` cancels the
old reconnect timers before the new room is opened; an expired old window can
never resolve the new match's lifecycle.

Transport selection is match-scoped during this window. If the initial WebRTC
attempt falls back to the relay, the relay decision is retained when
`peerStore` recreates `TransportManager`; reconnect cannot silently reintroduce
WebRTC. Each WebRTC and relay attempt uses the independent bounded budget
resolved for that transport.

The Control WS treats `transport_ready_v1` as an advertisement, not a gameplay
open. Both peers must advertise the same kind and receive the server's
`transport_committed_v1` before the adapter enters `connected`. A mixed
WebRTC/relay race forces the WebRTC attempt to fall back before gameplay can
open; the relay can then be advertised and committed. After commitment, a
transport mismatch fails the session and uses the normal reconnect/quarantine
path rather than switching transports in an active match.

If the same authenticated ticket replaces a half-open Control WS (for example
after a VPN or network-interface change), the server starts a fresh bilateral
transport epoch, notifies the surviving peer with `control_peer_left_v1`, and
requires both peers to advertise and commit again. This prevents a stale
WebRTC commitment from blocking relay recovery.

On reconnect the client does not re-seed. It sends version/engine probes and `state_sync_request` to the **other peer**, not to Express.

In the current Alfa gameplay phase, a full reload is surfaced as a local
recovery blocker before the client rejoins the relay: the ephemeral session key
is gone and no visible renewal ceremony is enabled. The player must start a new
match. A future runtime with an approved visible `session_renewal` ceremony may
enable full-reload recovery.

## Local snapshot

Written every ~2.5s and on `pagehide` while a P2P match is live.

- Storage: `sessionStorage` (same tab) + IndexedDB `p2p-match-resume` (crash).
- Namespaced by reset epoch / protocol id (`createRuntimeDatabaseName`).
- One live slot per account. A newer different `matchId` may replace the slot; an older one may not.
- Cleared on `game_over`, leave, or technical result.

The snapshot is a **cache of this browser**. It is not server state and not the signed action log.

Chess→poker `CombatHandoff` is **not** taken from IndexedDB. On poker entry and on F5 apply, the client re-derives it from `matchSeed` + collision piece ids + `moveCount` (`derivePokerCombatHandoff`). Slot mapping, first strike, `combatId` and `deckSeed` come from that derivation. Mid-hand poker cards remain a local cache; cards apply is symmetric.

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
- Signed transcript recovery is contiguous and fail-closed: if a replay frame is rejected by the bounded transport buffer, the sender quarantines the session instead of leaving a partial transcript that could look complete.
- Poker Time Notary: reconnect re-proposes the current `turnId`. The relay returns the original `serverStartedAtMs` / `serverDeadlineAtMs`. It does not grant a fresh 60s. Empty-room notary state is retained for the same 120s tombstone as phase checkpoints.
- A Poker action waiting for its time-gate ACK retains its signed `decisionId` while the short reconnect window is active. After the replacement transport opens, the exact proposal is re-emitted once; the receiver's `decisionId` ledger makes the retry idempotent. An unanswered gate after reconnect fails closed and quarantines the session.
- Before the first legal Chess piece move, temporary Cards hash unavailability and a missing Mulligan receipt retry the exact signed command. Three unanswered delivery attempts cancel setup bilaterally with no winner, loss, RUNE, ELO, or XP. After `battle_started`, a real cards/chess/poker state-hash mismatch or transition receipt disagreement sets a session integrity quarantine. Only that established-battle state renders the blocking integrity overlay; reconnect preserves it until the player leaves.
- A signed cards envelope is not committed to the local transcript until the local reducer returns `applied`. A stale UI command, reducer rejection, sequence gap, or rate-limit drop quarantines the session instead of advancing one peer past a command the other peer could not reproduce.

## What is still open

- Ranked replay from the encrypted `action-log` (`loadLog` is test-only today). ADR 0007 forbids Keychain mid-match, so that path stays deferred.
- Cards: both peers apply `game_command` locally after a `cards_deck` handshake. Peer-authored `gameState` snapshots are rejected; mismatch recovery remains fail-closed until signed replay is available. Rewind and extra `init` are already blocked.
- Discover choices are also signed cards commands: the receiver matches the
  selected id against its synchronised option list and uses the command-scoped
  deterministic id stream, so a reconnect cannot turn a stale/forged modal
  choice into a local-only hand mutation.
- Last unsaved seconds before `pagehide` can be lost.

## Code

- `client/src/game/p2p/p2pMatchResume.ts`
- `client/src/game/p2p/p2pMatchResumeBridge.ts`
- `client/src/game/p2p/p2pResumePokerHandoff.ts`
- `client/src/game/p2p/useP2PMatchResume.ts`
- `client/src/game/stores/peerStore.ts` (`rejoinPersistedRoom`)
- `client/src/lib/chunkLoadRecovery.ts` (asset bust only)
