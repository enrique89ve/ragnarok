# PvP Wire Protocol — Norse Mythos Card Game

**Status**: Authoritative spec for the live PvP system. Replaces the obsolete
`MULTIPLAYER_P2P.md` (deleted 2026-05-03).

> **Active testnet contract:** [ADR 0007](adr/0007-p2p-gameplay-only-testnet.md)
> enables deterministic WebSocket phase checkpoints but disables P2P
> `match_anchor`, `match_result`, economic settlement and every match-driven
> Keychain prompt. A completed match shows and exports a local result only.

**Audience**: contributors writing or auditing P2P wire code, the transcript
pipeline, or the matchmaking surface. Ranked settlement canon:
[ADR 0008](adr/0008-winner-posted-match-result.md).

**Companion specs**:
- `adr/0008-winner-posted-match-result.md` — ranked settlement (winner posts, replay validates)
- `adr/0011-server-notarized-poker-turn-clock.md` — P2P Time Notary for the 60s poker window
- `RAGNAROK_PROTOCOL_V1.md` — on-chain custom_json surface; ranked result follows ADR 0008;
  it is not submitted by the current testnet match flow.
- `P2P_SECURITY_HARDENING.md` — five security invariants enforced over this
  wire (still valid; folded into §6 below for context).
- `P2P_MATCH_RESUME.md` — same-tab reconnect, hard-reload snapshot, observer
  rules. IndexedDB is a local cache, not match authority.
- `P2P_TICKET_SECURITY_VALIDATION.md` — focused validation matrix for relay
  tickets, Origin checks, subprotocol handling, logging boundaries, and the
  poker P2P adapter seam.
- `TESTNET_READINESS_FAST_TRACK.md` — active work plan, technical debt, and
  release gates for Alfa Testnet to Closed Testnet Beta.
- `shared/p2p-wire/chess.ts` — chess wire schema (canon for chess envelopes).

**Conventions**:
- File:line references point to the implementing code; if a reference becomes
  stale the spec is wrong, not the code.
- Sections marked "**OPEN**" are decisions that have not been resolved at
  spec-write time — implementations may already exist but the contract is
  not stable. Do NOT rely on them in beta-blocking work.

---

## §0 Table of Contents

The wire protocol is transport/gameplay authority only. In F1 terminal local
settlement is persisted by replay/IndexedDB in a separate envelope; the wire
never emits Hive `match_anchor`/`match_result` or canonical economy.

1. Architecture overview
2. Transport: WebSocket relay
3. Match lifecycle
4. Wire envelopes (the `P2PMessage` union)
5. Authority model per phase
6. Identity binding (Hive ↔ peer)
7. Transcript and arbitration model
8. Match-result broadcast (on-chain)
9. Failure modes and slashing
10. Open questions and unresolved decisions
11. Glossary

---

## §1 Architecture Overview

A PvP match runs primarily between two browser clients ("peers"). The server
owns five bounded responsibilities:

1. **Matchmaking**: an in-memory, ELO-aware queue that issues per-peer
   `queueToken` bearer secrets and per-peer `P2PMatchTicket` relay
   credentials (`server/routes/matchmakingRoutes.ts`).
2. **Relay**: a WebSocket fan-out that forwards opaque JSON frames between
   the two peers in a room (`server/routes/p2pRelay.ts`). The relay does
   NOT inspect game logic; it only validates frame envelope shape,
   enforces a whitelist of `type` values, and applies the two notaries
   below.
3. **Phase notarization**: at `chess ↔ poker_combat` and `* → game_over`, the
   relay compares two opaque deterministic roots. It never receives or runs
   gameplay state. See [ADR 0005](adr/0005-server-notarized-phase-checkpoints.md).
4. **Time notarization**: at each timed poker decision (`pre_flop`, `faith`,
   `foresight`, `destiny`) both peers propose the same `turnId`. The relay
   stamps `serverStartedAtMs` on the first valid proposal and commits
   `deadline = start + 60_000` when the second matches. It then gates
   `poker_action` by receive time vs that deadline. It never runs poker.
   See [ADR 0011](adr/0011-server-notarized-poker-turn-clock.md).
5. **Future arbitration** (post-match, off-wire): outside those fixed
   checkpoints the server is *not* part of real-time gameplay validation.
   Dual-signed `match_result`, Hive broadcast and slash processing remain
   deferred ranked settlement work and are not executed in the current testnet.

The relay does not have a database of game state and cannot adjudicate moves.
It holds only constant-sized phase agreement and poker-turn deadline metadata
and is **not a source of truth about gameplay**.

**Client bridge dependency rule**: P2P wire handlers must not reach gameplay
stores through `globalThis`. Poker P2P behavior goes through the explicit
`pokerP2PCombatAdapter`; chess/combat snapshots must use explicit imports or a
typed adapter seam. P2P stores that hold relay tickets, match challenges, queue
tokens, peer ids, or live wire state must not be published on `globalThis`.
Legacy non-P2P `globalThis` exports may remain for diagnostics or chunk-boundary
compatibility, but they are not an application trust boundary and must not be
used by new P2P wire code.

**Two universes share this protocol** (see `SET_AXIS.md`). Starter cards are
off-chain entitlements and genesis cards belong to the future on-chain ranked
economy. ADR 0007 overrides broadcast policy for the current gameplay-only
testnet: neither universe signs or broadcasts a P2P result.

---

## §2 Transport: WebSocket Relay

**Endpoint**: `ws://<host>/ws/p2p?room=<roomId>&peer=<peerId>`
(`server/routes/p2pRelay.ts`)

The relay ticket is not carried in the URL. Browser clients send:

- `Sec-WebSocket-Protocol: ragnarok-p2p-v1`
- `Sec-WebSocket-Protocol: ragnarok-p2p-ticket.<token>`

The server validates browser `Origin` against same-host or
`P2P_RELAY_ALLOWED_ORIGINS`, and rejects `X-Forwarded-Host` unless
`P2P_RELAY_TRUST_FORWARDED_HOST=true`.

**Why WebSocket, not WebRTC**: the legacy WebRTC + PeerJS broker (commits
prior to `1bf9dcb refactor(transport): remove peerjs dependency`) failed
under broken DNS, restrictive NATs, and WSL2 networking. The WS relay works
universally because all traffic is server-mediated, at the cost of one extra
hop. For a turn-based card game this latency is negligible.

**Room lifecycle**:
- A room is created on first peer arrival, indexed by `roomId` (the
  `matchId` returned by matchmaking).
- In production/shared relay mode, each peer must present a server-signed
  `P2PMatchTicket` bound to exactly that `roomId` and its own `peerId`.
- Maximum 2 peers per room (`ROOM_MAX_PEERS`, `p2pRelay.ts:31`).
- When the room reaches 2 peers, the relay sends `__sys.event=open` to
  each. `isHost=true` belongs to the lexicographically smaller `peerId`, so
  reconnect order cannot flip transport host (seed parity, cards hash frame,
  recovery publisher). This `isHost` is a **transport-level hint**. It does
  NOT confer cards gameplay authority by itself (OPEN-8: both peers apply).
- A peer departure (close or error) sends `__sys.event=close` to the
  survivor. Socket membership is garbage-collected when empty; its constant-size
  checkpoint tombstone remains for 120s and is removed by a global sweep.

**Frame validation** (`p2pRelay.ts`):
- Maximum payload: 16 KB (`P2P_RELAY_MAX_PAYLOAD_BYTES`).
- Initial and recovery `gameState` frames use `json+gzip+base64url@1`
  (`compressedGameState`) so the relay stays below the 16 KB cap while the
  receiver restores the same `GameState` before applying `flipGameState`.
- Must be valid JSON with a `type` string field.
- `type` must be in the whitelist (see §4 for the canonical list). Reserved
  prefix `__` is blocked from the client side (only the relay emits `__sys`
  envelopes).
- Frames that fail validation are silently dropped (no client-visible error).
  This is intentional — surfacing failure shape would be a probe channel.
- `phase_checkpoint_propose_v1` is consumed by the relay instead of fanned out.
  Matching proposals produce server-only `__sys.event=phase_checkpoint`; a
  mismatch freezes the room and never selects a winner.

**Keepalive**: WS-level ping/pong every 15s (`p2pRelay.ts:235-243`). An
app-level `heartbeat` envelope (sent by `useWireSync`) runs on top.

**Latency and reconnect policy (P0)**:
- User actions are sent as compact intent envelopes, not full state dumps.
  Chess/poker carry the minimum semantic action plus optional compact tuples.
  Cards applies `game_command` locally on both peers; host `gameState` is
  recovery-on-`hash_mismatch` only (OPEN-8 closed).
- Same-tab network loss enters `grace_period`/`reconnecting`; the local seed,
  transcript, seq counters, chess sender state, and queued messages are
  preserved. Reconnect allows two automatic attempts inside a 60s window
  (`2s`, then `15s` scheduling, with per-attempt transport timeout). If the
  window expires, the disconnected side receives a local technical result.
- On reconnect, `useWireSync` does not run a new seed handshake. It sends
  version/engine probes and `state_sync_request` for transcript recovery.
- P0 technical results are gameplay/UI outcomes only. They do not authorize
  RUNE settlement. Ranked RUNE must stay `no settlement` unless a future
  `timeout_claim`/`forfeit_claim` path can prove abandonment from a prior
  `match_anchor`, signed transcript, reconnect window, silence proof, and
  dispute window. A high win probability or "one move from victory" state is
  not economic evidence by itself.
- This mirrors the conservative esports/game precedent: Axie: Origins used a
  60s disconnect threshold before match loss during its RPS / pre-battle flow,
  while tournament rules often count a mid-match disconnect as a loss unless
  both players/admin agree.
- A hard page reload restores from the local sealed snapshot (see
  `P2P_MATCH_RESUME.md`) and rejoins the room with the same 2-attempt / 60s
  window. The relay does not hold the board. Ranked replay from the signed
  action log remains deferred (ADR 0007).

---

## §3 Match Lifecycle

A complete match traverses six phases. All cross-peer state is established
in phases 0-2 before any gameplay action is sent.

### Phase 0 — Matchmaking

1. Each player POSTs `/api/matchmaking/queue`. In local/dev runtime, anonymous
   `{ peerId }` free-play remains available. In shared-network runtime
   (`testnet`/`mainnet`), the request must include a Hive `username`,
   `starterClaimed: true`, and a Posting signature over the canonical queue
   message from `shared/p2pMatchmakingAuth.ts`:
   `ragnarok-queue:<username>:<peerId>:starter-claimed:<timestamp>`.
   Binding `peerId` and starter claim state into the signed bytes prevents a
   queue signature from being reused for a different relay peer. The server
   does not trust the body boolean as proof that onboarding happened: it also
   requires a server-side starter ceremony receipt recorded through
   `/api/starter/claim` before shared-network matchmaking can enqueue the
   account. After login/identity, F1 registers that receipt without a second
   wallet invocation; F2/F3 retain signed body authentication. The server returns
   a process-local `queueToken`; clients send it
   back as `x-p2p-queue-token` for queue rechecks, status polling, and leave
   requests. Queue/status handling re-checks that receipt before returning
   queued/matched state: a peer that loses starter access is removed from the
   queue, skipped as an opponent, and cannot receive a match ticket from
   `/api/matchmaking/status/:peerId`.

   Direct friend challenges use the same shared-network starter receipt gate.
   `/api/friends/heartbeat` may still serve read-only friend presence, but if
   the authenticated account lacks a starter ceremony receipt it strips `peerId`
   and publishes the account as non-challengeable. `/api/friends/challenge`
   rejects with `starter_claim_required` unless both sender and target have
   server-recorded starter receipts. `/api/friends/challenges/:username` also
   re-checks the receiver receipt before delivering pending challenges; if the
   receiver loses starter access, pending tickets are discarded and the endpoint
   returns `starter_claim_required`.
2. The server runs `findBestEloMatch` (`matchmakingRoutes.ts:93`):
   - First pass: closest ELO within ±200 (expands to ±500 after 30s,
     anyone after 60s — see `matchmakingRoutes.ts:99-102`).
   - Second pass: if no ELO match, pair with anyone waiting >60s.
3. On match, the server returns `{ matchId, opponentPeerId, isHost, matchTicket }`
   to the joining player. The other player learns of the match by polling
   `/api/matchmaking/status/:peerId` with its `x-p2p-queue-token`; the status
   response includes only that peer's own `matchTicket`.
4. The first arrival becomes "host" by matchmaking convention. The relay
   emits `isHost` from lexical `peerId` order so reconnect cannot flip it. These
   two `isHost` values are NOT guaranteed to agree — the WS-relay value is the
   one that drives downstream code (`peerStore.ts` consumes
   `__sys.open.isHost`).

   **Known debt** (not an OPEN — direction decided): `isHost` is a
   transport-level detail that should not leak past `peerStore`. Mode-level
   decisions (authority) read `deriveAuthority(matchCtx)` from
   `client/src/game/match/derived.ts`, which encapsulates the
   `isHost`-to-`myRole` translation once. Any new code reading
   `peerStore.isHost` outside `deriveAuthority` is a Mode-invariant
   violation.

### Phase 1 — Connection

Both peers open WebSockets to `/ws/p2p?room=<matchId>&peer=<peerId>`. The
relay verifies the peer-specific `P2PMatchTicket` from the WebSocket
subprotocol, including the ticket account's current starter receipt whenever
tickets are required (`production`, `testnet`, or `mainnet`). The relay sends
`__sys.open` once both arrive. Each peer transitions `peerStore.connectionState`
to `'connected'`.

### Phase 2 — Seed Exchange (commit-reveal)

Triggered by `useWireSync.ts:166-251` (effect dependent on
`connection / connectionState / send`).

1. Each peer generates a 32-byte salt and sends
   `{ type: 'seed_commit', commitment: SHA256(salt) }`
   (`useWireSync.ts:194-199`).
2. Each peer also sends `version_check` (build hash) and `wasm_hash_check`
   (game-engine WASM hash) for transparency. WASM mismatch disconnects
   immediately (`useWireSync.ts:361-372`); build mismatch only warns.
3. Each peer sends `army_announcement` (chess portraits) and a cards-deck
   announcement (hero class, card ids, NFT levels). In shared-network mode,
   the peer derives source-aware ownership claims from that exact deck and
   sends `deck_verify`; the immutable handshake snapshot binds deck, claims,
   `deckHash`, and `claimsHash`.
4. On receiving the opponent's `seed_commit`, each peer sends
   `seed_reveal: { salt, hiveUsername }`.
5. On receiving `seed_reveal`, the receiver:
   - Verifies `SHA256(theirSalt) === theirCommitment`. Mismatch → disconnect.
   - Derives `matchSeed = SHA256(sortedSalts.join(''))` where sorting is
     by lexicographical peer-id order.
   - Derives `matchId = SHA256(matchSeed + sortedPeerIds.join('')).slice(0,16)`.
     Sorting matters: chess and cards both hash symmetrically, so both peers
     must arrive at the same value. Bug fixed in commit `dd9112c`.
   - Derives `myCanonicalSide = parity(matchSeed[0]) XOR isHost` →
     `'player' | 'opponent'` (`shared/p2p-wire/chess.ts`). This is the
     canonical (global) side, NOT viewer-relative.
   - Stores the opponent Hive username from the reveal payload. A
     `deck_verify.hiveAccount` must normalize to that identity; a missing
     identity remains pending only until `seed_reveal` resolves, then fails
     closed.
   - Both peers initialize the chess engine RNG from `matchSeed`.
   - Both peers bind `${matchSeed}:cards`. In local-dev, the cards handshake
     may initialize from the two deck snapshots without Hive verification. In
     shared-network, `initGameFromHandshake` is blocked until the remote
     snapshot's claims bind to the announced card multiset, the Hive identity
     matches, and both local IndexedDB ownership and server verification return
     approved. Any mismatch or verifier failure disconnects; it is never
     treated as an approval.
6. Live cards init does not wait on host `init`. A leftover `init` envelope
   is ignored once `p2pInitApplied` is set. Guest recovery `gameState`
   (hash mismatch only) still applies through `flipGameState`.

Seed exchange has a 10s timeout. On timeout, the peer disconnects.

### Phase 3 — Move Loop

Each phase of the game (cards / chess / poker) emits its own envelope type;
see §5 for the authority model.

The transcript is started (`startNewTranscript()` at `useWireSync.ts:241`) at
the moment the connection becomes ready. Every move recorded — by the local
player at send time, or by the remote peer at receive time — appends to it
(see §7).

### Phase 4 — Local Result (current) / winner-posted result (future, ADR 0008)

When `gameState.gamePhase === 'game_over'`, the current testnet displays and
exports the local result after the terminal checkpoint commits. It opens no
Keychain prompt and emits no Hive operation.

The retained future settlement implementation in `BlockchainSubscriber`
packages the result (`BlockchainSubscriber.ts:272-294`):
1. Computes the merkle root of the transcript (`buildMerkleTree()`).
2. Pins the transcript bundle to IPFS (best-effort, non-blocking).
3. Calls `attemptDualSig`:
   - The winning peer computes the compact commitment hash `ch` over
     `{m,w,l,n,h,s,v,c,tr,tc}` where `h = result.hash` and `tr` is the
     transcript Merkle root.
   - Current client behavior: record `result_signature_deferred` and do NOT
     open Keychain from match end.
   - Future behavior must route this through a visible result review/sign flow.
4. Opponent receives `result_propose` from an older peer:
   - Builds its local transcript Merkle root and rejects
     `missing_transcript_root`, `local_transcript_unavailable`, or
     `transcript_root_mismatch` before signing if the proposed `tr` cannot be
     certified locally.
   - Recomputes `ch` locally from `result` and rejects
     `commitment_mismatch` before signing if it differs.
   - Validates that the result names them as winner-or-loser by Hive
     username (NOT by peerId — identity is anchored to Hive account).
   - Validates that the proposal's winner agrees with the local
     `gameState.winner` field.
   - On agreement: sends `result_reject: signature_deferred` instead of opening
     Keychain. Countersigning needs a visible wallet action.
   - On disagreement: sends `result_reject` with a reason code.
5. Without a later ranked gate the result is NOT broadcast. Alfa never posts
   `match_result`. Closed Beta posts winner-only (ADR 0008).

### Phase 5 — Cleanup

- `clearTranscript()` runs in the seed-exchange effect's cleanup
  (`useWireSync.ts:248-250`).
- The relay garbage-collects socket membership when both peers disconnect and
  retains only the constant-size phase checkpoint tombstone for 120s.
- The server's `activeMatches` map evicts the match after 300s
  (`ACTIVE_MATCH_TTL_MS` in `matchmakingRoutes.ts`, applied uniformly at
  both the periodic sweep and the post-pair `setTimeout`).

---

## §4 Wire Envelopes (`P2PMessage` union)

The complete union is defined in `client/src/game/p2p/messages.ts`.
The relay whitelist (`server/routes/p2pRelay.ts:47-69`) MUST stay in sync.

| `type` | Direction | Sender authority | Purpose |
|---|---|---|---|
| `seed_commit` | both | both | Phase 2: commit to a salt |
| `seed_reveal` | both | both | Phase 2: reveal salt + Hive username |
| `version_check` | both | both | Phase 2: build-hash diagnostic |
| `wasm_hash_check` | both | both | Phase 2: engine-hash check (disconnect on mismatch) |
| `army_announcement` | both | both | Phase 2: announce selected chess army |
| `cards_deck` | both | both | Phase 2: announce the deck half of the immutable deck+claims snapshot |
| `deck_verify` | both | both | Phase 2: bind source-aware `protocolVersion: 2` claims to the announced deck; shared-network init waits for identity + IndexedDB + server approval |
| `init` | host → client | legacy | Phase 2 leftover: ignored after handshake init |
| `game_command` (envelope) | both | both | Phase 3 cards and Poker auxiliary intents: both peers apply locally |
| `gameState` | host → client | host recovery | `hash_mismatch` recovery snapshot only, compressed as `json+gzip+base64url@1` |
| `chess_command` (envelope) | both | both (symmetric) | Phase 3 chess: discriminated union of `chess_move` (quiet), `chess_attack` (instant-kill capture), and `chess_combat_initiated` (non-instant capture into poker) — see §5 |
| `transition_receipt_v1` | receiver → command sender | both (symmetric) | Post-commit chess receipt binding the command intent to the receiver's pre/post chess+cards integrity roots. A rejection or root mismatch quarantines further local chess actions. |
| `phase_checkpoint_propose_v1` | peer → relay | both | Fixed-size proposal for a deterministic phase boundary; consumed by the relay and never fanned out. |
| `phase_checkpoint_commit_v1` / `phase_checkpoint_dispute_v1` | relay → peers inside `__sys.event=phase_checkpoint` | relay only | Commit if roots match. Mismatch retries; freeze only after 3 strikes. The relay never picks a winner. |
| `poker_turn_started` | peer → relay | both | Timed-poker turn identity proposal; consumed by the relay and never fanned out. Client `durationMs` / `remainingMs` / `sentAtMs` are ignored. |
| `poker_turn_notary_commit_v1` / `poker_turn_notary_dispute_v1` | relay → peers inside `__sys.event=poker_turn_notary` | relay only | Commit if both peers proposed the same `turnId`. The first proposal stamps the start; the deadline is always 60s. Mismatch retries; freeze after 3 strikes. The relay never picks a winner. |
| `poker_action` | both | both (symmetric) | Phase 3 poker: deterministic local apply + relay to peer; required `origin` and `turnId`. The relay time-gates by server receive time vs the notarized deadline, then fans out. Compact tuple remains optional. |
| `poker_hash_check` | host → client | host | Turn-scoped Poker integrity probe; compared only when phase, turn id and action count match locally |
| `hash_check` | host → client | host | Periodic state-hash sanity check |
| `hash_mismatch` | client → host | client | Reports a divergent state hash |
| `result_propose` | winner → relay/indexer path | winner | **Obsolete as loser handshake.** ADR 0008: winner posts `match_result` to Hive. Alfa never initiates it. |
| `result_countersign` | — | — | **Obsolete.** Loser does not countersign game_over (ADR 0008). |
| `result_reject` | — | — | Compatibility only; not a settlement vote. |
| `heartbeat` | both | both | App-level keepalive |
| `ping` / `pong` | both | both | Lower-level RTT probe |
| `opponentDisconnected` | — | — | **Dropped.** Not a legal relay type. Departure is `__sys.close` only. |
| `spectator_state` | host | host | Future / unused in beta |
| `session_authorize` | peer→peer | both | Future ranked/settlement path: broadcast `{ matchId, ephemeralPubkey, hiveSig }` signed with Hive Posting authority so the opponent binds the ephemeral signing key to the Hive identity. Closed-beta full NFT gameplay skips this prompt; NFT custody is enforced by deck verification while P2P RUNE/ELO settlement remains disabled. |
| `session_renewal` | peer→peer | both | **Future ADR 0004 settlement path**; disabled because current matches cannot request a reload Keychain signature |
| `session_resumed` | peer→peer | both | **Future ADR 0004 settlement path**; not a current testnet release gate |
| `state_sync_request` | peer→peer | both | Ask the **peer** for missing transcript leaves after reconnect or hard-reload rejoin. The relay only fans the request out. |
| `action_envelope` | peer→peer | broadcaster | **Future ADR 0004 settlement path**: per-action signed envelope; current gameplay uses its existing deterministic command envelopes |

Envelope schemas live next to their handlers:
- Cards: `client/src/game/hooks/p2pEnvelope.ts` (`GameCommandEnvelope`)
- Chess: `shared/p2p-wire/chess.ts` (`ChessCommandEnvelope`) — the only
  envelope type whose schema is in `shared/`, because chess is symmetric
  and both peers run the same parser.

---

## §5 Authority Model

**Canon**: authority is derived from `MatchContext`, not from the wire and
not from the phase. The canonical type lives in
`client/src/game/match/derived.ts`:

```ts
export type Authority =
	| { kind: 'local' }                                                  // ai/scripted matches
	| { kind: 'p2p-symmetric'; myRole: 'first-mover' | 'second-mover' }; // peer matches
```

The deliberate omission of `p2p-host-authoritative` /
`p2p-client-deferring` variants expresses architectural intent: **P2P
matches are symmetric by design**. Both peers compute and apply each phase
identically; the wire carries intent, not delegation.

Cards apply is symmetric (OPEN-8). Poker already applies `poker_action`
symmetrically. Hashing still uses the host-as-player frame
(`isCardsHostFrame`); forward `gameState` dumps are off.

Cards-authority *dumps* go through `isCardsAuthorityRole` (false in the
default symmetric mode). Do not read `peerStore.isHost` as a gameplay-authority
proxy. Recovery snapshots and the hash beacon still use the transport host.

The single most important piece of context to hold when working on the
wire is: **a wrong authority assumption causes silent state divergence**.
Read `deriveAuthority` once at the entry point, propagate the result —
never re-derive ad-hoc with `isHost`.

### Cards Phase — Symmetric apply, host recovery (OPEN-8)

Pattern: both peers announce a single deck+claims snapshot, pass the
shared-network verification gate when applicable, then call
`initGameFromHandshake`, send `game_command`, and apply locally. The transport host still sends
`hash_check` and a `gameState` snapshot on `hash_mismatch`. There is no
forward `gameState` dump after each action.

Implementation:
- Local action plan: `planCardsLocalAction` in
  `client/src/game/match/modes/p2p/wireSync/cardsWirePlan.ts`.
- Remote `game_command` applies on both peers after `p2pInitApplied`.
  `prevStateHash` uses `isCardsHostFrame` so the guest hashes the
  host-canonical flip.
- Both peers bind `${matchSeed}:cards` at `seed_reveal` and init from the
  shared deck handshake only after the snapshot gate (`cards_deck` + bound
  `deck_verify` + verification approval in shared-network).
- Cards-side command RNG is `commandRng()` / `cardsRng()` from
  `${matchSeed}:cards`. `cryptoRng` is the SP fallback when `matchSeed`
  is null.
- `game_command` includes the repeatable Poker auxiliary intents
  `play_card`, `frontline_attack`, `norse_hero_power` and `weapon_upgrade`.
  Both peers validate and apply them locally; an auxiliary command does not
  advance the Poker `turnId`, `activePlayerId` or absolute deadline. The
  Poker actor and deadline are read from the Poker combat state, not from the
  legacy cards-only `gameState.currentTurn` field.

### Chess Phase — Symmetric (canonical)

Pattern: both peers validate AND apply each chess_command independently.
No host-only routing.

**Wire surface** (P0 combat sync):
- `chess_move`: quiet move (no capture). Both peers apply via
  `executeMove`.
- `chess_attack`: instant-kill capture. Receiver runs
  `startAttackAnimation(attacker, defender, true)` and the existing
  `completeAttackAnimation` → `executeInstantKill` chain handles the
  apply locally on each peer. Schema in `shared/p2p-wire/chess.ts`
  (discriminated union; `defenderId` is explicit and verified against
  the local roster as defense-in-depth).
- `chess_combat_initiated`: non-instant capture. Receiver mirrors the
  same attack animation with `isInstantKill=false`; after animation,
  `pendingCombat` boots poker on both peers.

**Sender invariant** (`useChessBoardInteractions.ts:184-238`):
**every wire envelope represents a mutation that the sender already
applied locally**. The sender calls `movePiece` first; only if the slice
returns a collision (attack) or null with no rejection (quiet) does the
wire emit fire. This guarantees that if the local validation refused to
apply (illegal move, animation in progress, missing selection), no
envelope is sent and the remote never sees a mutation that the sender
itself didn't perform.

**Capture routing rule** (single source of truth:
`shared/p2p-wire/chess.ts` `isChessAttackInstantKill`): an attack is
instant-kill when the attacker is a pawn (Valkyrie execute), the
defender is a pawn (no deck), or the defender is a king (touching the
commander wins). Kings do not capture. Hero vs hero (N/B/R/Q) uses
`chess_combat_initiated`. Sender and receiver share the predicate.

**King ability (mine placement) blocked in P2P**: each peer's mines
live in their local store and don't cross the wire today. If kept
enabled, an opponent piece landing on a mine triggers stamina penalty
on the placer's side but not on the opponent's, drifting stats over
time and surfacing as `attacker_position_mismatch` later. Blocked at
`useKingChessAbility.enterPlacementMode` with a toast until
`chess_mine_placement` envelope ships (separate workstream — §10
OPEN-9).

**Receiver pipeline** (`useWireSync.ts` case `chess_command`): common
validations (schema, matchId, contiguous sender-local seq, commandId dedup, rate
limit, attacker lookup, position match, ownership boundary, currentTurn)
run once; then a branch on `command.type` dispatches to the move or
attack apply. The reducer returns an explicit `applied | rejected` union;
only an applied result advances seq/transcript and emits
`transition_receipt_v1`. Reject codes are verbose snake_case (e.g.
`non_instant_capture_not_supported_p2p`,
`remote_attempting_to_move_my_piece`, `attacker_not_found_*` with
roster dump diagnostic).

**Implementation locations**:
- Schema + predicate: `shared/p2p-wire/chess.ts`.
- Integrity schema/root: `shared/p2p-wire/integrity.ts`.
- Sender: `client/src/game/p2p/chessWireSender.ts` (`sendChessMove`,
  `sendChessAttack`, shared `dispatchChessCommand` helper).
- Receiver: `client/src/game/match/modes/p2p/wireSync/useWireSync.ts` case
  `chess_command`.
- Click handler gate: `client/src/game/components/chess/useChessBoardInteractions.ts`.
- Mine block: `client/src/game/hooks/useKingChessAbility.ts`
  `enterPlacementMode`.

### Chess transition-integrity receipt v1

The sender computes a pre-root from the hashes already carried by the chess
envelope, applies locally, computes its expected post-root, and permits only
one outstanding transition. The receiver independently validates and applies
the command, then emits a strict receipt containing `intentHash`, `prevRoot`
and `nextRoot`. `intentHash` binds match, sender-local seq, UUID commandId,
pre-root and the canonical command payload.

The receiver caches the bounded receipt by `commandId`. A duplicate intent
returns the original receipt without reapplying the reducer. After a same-tab
reconnect, the sender re-emits its single pending envelope; this recovers both
"intent lost" and "receipt lost" without server-side state.

This is deliberately a partial root with `scope: 'chess+cards'`. It detects
divergence in the domains currently covered by the existing canonicalizers;
it is not a full-match commitment and does not yet cover rich chess stats,
poker, `pendingCombat` or the round FSM. The monitor is not protocol authority:
the reducer/executor creates the receipt, while the monitor only confirms or
quarantines. The relay only whitelists and forwards this opaque frame.

**Coordination**:
- Both peers reach `phase === 'chess'` after seed exchange and a P2P-
  specific board bootstrap (`RagnarokGameCoordinator.tsx:230-249`),
  which uses `createSeededIdGen(matchSeed, 'chess-pieces')` so both
  peers compute identical `pieceId` strings.
- AI is gated by `!matchSeed` (`RagnarokGameCoordinator.ts:573-593`),
  NOT by `!isP2PConnected`. The earlier gate flipped to false during
  transient WS reconnects, allowing the AI to mutate the local opponent
  piece and desync the two peers. Fixed in commit `93daee7`.

**Determinism contract for chess**:
- `_chessRng = createSeededRng(matchSeed)` on both peers
  (`chessCombatSlice.ts:62-65`).
- All chess-side randomness must consume from `_chessRng`, never from
  `Math.random()` or `Date.now()`.

The host still produces the authoritative transcript at match end
(§7), but the chess move list is identical on both peers if determinism
holds.

### Poker Phase — Symmetric P0

Pattern: both peers initialize poker from the same chess combat seed and
apply the same `poker_action` locally. The relay carries intent; it is not
the source of poker state.

Implementation:
- `RagnarokGameCoordinator` uses chess piece ids as poker participant ids
  and derives deterministic combat/deck seeds from `matchSeed`, the piece
  ids, positions, and chess move count.
- `initializePokerCombat` accepts deterministic options so both peers deal
  the same physical attacker/defender cards even when viewer slots are
  swapped.
- `poker_action` is applied locally by the sender and by the receiver in
  `useWireSync`. The message keeps legacy object fields plus a compact
  tuple from `shared/p2p-wire/combat.ts`, and carries a required `decisionId`
  for receiver-side duplicate rejection. It also carries required
  `origin: 'player' | 'timeout'`; timeout is semantic gameplay input, not a
  client permission flag.
- On receive, the engine result is discriminated as `applied` or `rejected`.
  Only `applied` commits the decision id to dedup/eviction, records the
  transcript move, and closes the betting round. A rejected/no-op engine action
  changes none of those three authorities.
- Store-level validation is mandatory before any poker action mutates state:
  phase must be a betting phase, `activePlayerId` must match, checks are
  rejected when a wager is pending, folds require a wager to answer, and
  bet/raise amounts are capped by `min(HP, stamina * 10)`. All-in showdown
  windows are not actionable.
- On receive, `poker_action.playerId` must be the local viewer's remote
  poker actor (`pokerState.opponent.playerId`) and the active actor for the
  current `turnId`; a peer cannot act for the local player's poker slot.
- If `poker_action.compact` is present, it must agree with the legacy
  `action` / `hpCommitment` fields. Peers reject mismatches before applying
  the action so the transcript cannot carry two interpretations.
- `poker_turn_started` is a dual proposal to the Time Notary, not peer-advisory
  clock sync. Both peers send it when they discover a timed `turnId`. The
  relay consumes the frame (it is never fanned out), ignores client
  `durationMs` / `remainingMs` / `sentAtMs`, stamps `serverStartedAtMs` on the
  first valid proposal, and commits `deadline = start + 60_000` when the
  second identity matches. Reconnect replays that same commit; it does not
  grant another 60s. See ADR 0011.
- The browser still renders a countdown from `PokerTurnClock` via
  `createNotarizedPokerTurnClock`. That projection may lag the server by one
  RTT. Acceptance authority is the relay receive timestamp, not `Date.now()`
  on either client.
- `origin: 'timeout'` is accepted by the relay only at or after the notarized
  deadline, and by the local engine only when the action equals the shared
  derivation: no pending wager → `DEFEND`, pending wager → `BRACE`. Timeout
  `DEFEND` preserves stamina; it never grants the manual-check `+1 STA`
  reward. Missing origin or `turnId` is rejected at the wire schema.
- After a notary commit the store records `turnClockOwnerId = server-notary`
  for that `turnId`. Later commits for the same identity cannot re-arm the
  deadline. A new logical turn creates a new `turnId` and a new notary record.
- Playing a legal card is an auxiliary action. It is repeatable while the
  active poker decision remains open and does not emit `poker_turn_started`,
  advance `activePlayerId`, or change the absolute deadline. The next valid
  `poker_action` is the turn terminator.
- Extending card timing does not grant resources: `PRE_FLOP`, `FAITH`,
  `FORESIGHT` and `DESTINY` share each player's mana pool for the current
  Poker hand. Phase changes and active-player changes do not refill or
  increase mana; draw and progression remain scoped to the Poker hand as
  before. Clock/card timing code must not invoke a turn-start resource refresh.
- The battlefield remains a hard five-slot limit (`MAX_BATTLEFIELD_SIZE = 5`).
  A minion command is rejected when `battlefield.length >= 5`, regardless of
  remaining mana or time; card timing never creates a sixth slot.
- Shared resource validation also rejects impossible state before and after a
  card command or Poker action: hand `<= 6`, mana `0 <= current <= max <= 10`,
  armor `0 <= armor <= 30`, and current health/stamina may not exceed their
  respective maxima. Timeout `DEFEND` has an exact stamina delta of `0`;
  manual `DEFEND` has at most `+1` after the max-stamina clamp.
- P2P poker freezes local input and phase advancement while the transport is
  in reconnect/grace states, but the absolute deadline remains live. A
  deterministic timeout may resolve locally; reconnect re-announces the
  current turn when needed.
- The host emits `poker_hash_check` from the same canonical Poker projection
  used by phase checkpoints. The receiver compares only the same turn identity
  and action count, then records a Poker integrity mismatch without treating
  the relay as a gameplay judge.
- Showdown wager coin flips are derived from deterministic combat metadata
  instead of browser randomness so both peers can replay the same result.

---

## §6 Identity Binding (Hive ↔ Peer)

PeerIds are ephemeral UUIDs — not cryptographic identity. The only durable,
arbitrable identity is the Hive username (signed-in via Keychain).

**Binding moment**: Phase 2 `seed_reveal` includes `hiveUsername` if the
peer is logged in (`useWireSync.ts:437`). The receiver stores it in
`opponentUsernameRef` (`useWireSync.ts:511-513`).

**Identity in wire envelopes**: NONE of the in-match envelopes carry the
sender's username. Authority is implicit:
- Cards/poker: only the client sends `game_command` / `poker_action`; the
  host knows it's "the other peer" by transport (the relay only routes
  to the other room member).
- Chess: ownership is enforced by `piece.owner === remote_canonical_side`
  in the receive handler (`useWireSync.ts:851-854`).

**Identity in the transcript**: every `GameMove.playerId` is resolved
through `client/src/data/blockchain/playerIdentity.ts`:
- Local moves → `localPlayerId({ hiveUsername: getNFTBridge().getUsername(), myPeerId })`
- Remote moves → `remotePlayerId({ opponentUsername: opponentUsernameRef.current, remotePeerId })`
- Fallback when no Hive username is bound → `'guest:' + peerId.slice(0, 8)`
  (the `'guest:'` prefix is the explicit non-arbitrable marker).

**Identity in the match-result**: `result.winner.username` and
`result.loser.username` are Hive usernames. The dual-sig validates these
against the local user's `getNFTBridge().getUsername()`
(`useWireSync.ts:1039-1054`).

**Hardening invariants** (all from `P2P_SECURITY_HARDENING.md`, still in
effect):
1. `matchId` binds every action envelope to a specific match — replays
   across matches are rejected.
2. Cards integrity uses `prevStateHash` on `game_command` plus host
   `hash_check` / `hash_mismatch` recovery snapshots (not forward dumps).
3. `seed_reveal.hiveUsername` is the only place identity is announced;
   `deck_verify` cross-verifies source-aware deck claims (`starter-entitlement`,
   `nft-custody`, or reset-epoch-scoped `qa_full_catalog`) against the chain
   projection and runtime entitlement rules.
4. `result_propose.proposalId` correlates the proposal with its
   countersignature (prevents pairing two simultaneous proposals).
5. Ranked `match_result` is winner-posted (ADR 0008). Dual signatures belong
   to `match_anchor` and session-signed moves, not to a loser game_over
   countersign. Result-only claims without transcript replay are rejected.

---

## §7 Transcript and Arbitration Model

The transcript is a sequence of `GameMove` records hashed into a Merkle
tree at match end. The root is embedded in the on-chain `match_result`.

**Module**: `client/src/data/blockchain/transcriptBuilder.ts` — singleton
`activeTranscript: TranscriptBuilder | null` with a module-scoped
`moveCounter` shared across cards / chess / poker entry points.

**Lifecycle**:
- `startNewTranscript()` is called once per session, in the seed-exchange
  effect (`useWireSync.ts:241`).
- `recordMove(action, payload, playerId)` appends a record. Call sites:
  - Cards send: `useWireSync.ts` wrapped actions (`wrappedPlayCard`,
    `wrappedAttack`, `wrappedEndTurn`, `wrappedUseHeroPower`).
  - Cards receive (host only): the four cases under `case 'game_command'`.
  - Poker receive (host only): under `case 'poker_action'`.
  - Chess send: `chessWireSender.ts`, after `send(envelope)` succeeds.
  - Chess receive: under `case 'chess_command'`, after `executeMove`.
- `clearTranscript()` runs in the seed-exchange effect's cleanup and on
  every reconnect (`useWireSync.ts:171`).
- `buildMerkleTree()` is invoked at match end by `BlockchainSubscriber`.

**`GameMove` shape** (`client/src/data/blockchain/signedMove.ts`):
```ts
{
  moveNumber: number;        // monotonic, scoped to the singleton
  action: string;             // 'playCard' | 'attack' | 'endTurn' | 'useHeroPower' | 'poker_action' | 'chess_move'
  payload: Record<string, unknown>;
  playerId: string;           // Hive username, or 'guest:<peerId8>' sentinel
  timestamp: number;          // wall-clock ms
}
```

**Merkle algorithm** (`transcriptBuilder.ts:125-161`):
- Each leaf = `SHA256(canonicalStringify({ ...move, previousHash }))`.
- Hash chain: `previousHash` of leaf N = leaf hash of N-1 ("" for N=0).
- Tree built bottom-up by pairing siblings (left|right concatenated and
  hashed). Odd-out nodes hash with themselves.
- Empty transcript → `SHA256('empty_transcript')`.

**Authority rule** (CRITICAL): the **winner's compact commitment** is what
goes on-chain (ADR 0008). The loser does not countersign. Alfa defers all
Keychain at match-end.

**Arbitration surface** (off-wire, post-match):
- Server-side arbitrator (NOT yet implemented as a service — see
  HivePoA design) consumes the on-chain `match_result.tr` (transcript
  root) and `match_result.tc` (transcript IPFS CID).
- Current client behavior records `slash_evidence_deferred` for detected
  `forged_move` / `double_result` cases. Broadcasting slash evidence needs a
  future visible Submit evidence wallet action.
- The arbitrator fetches the IPFS bundle, verifies the merkle root,
  walks the move list, and resolves the dispute.

---

## §8 Future Match-Result Broadcast (On-Chain, Disabled in Current Testnet)

ADR 0007 disables this entire section for the gameplay-only testnet. The client
must not enqueue `match_result` or broadcast after `game_over`. ADR 0008 is the
ranked contract: winner-posted result, terminal receipt, replay on the indexer.

In a future explicitly activated ranked flow, after the winner signs,
`BlockchainSubscriber.enqueueResult`
(`BlockchainSubscriber.ts:396-408`) broadcasts a compact `match_result`
custom_json with PoW (64 challenges × 6-bit). The on-chain shape lives in
`PackagedMatchResultOnChain` (`client/src/data/blockchain/types.ts:72-85`):

```ts
{
  m: matchId,
  w: winnerUsername,
  l: loserUsername,
  n: nonce,                    // monotonic per-account, prevents replay
  h: resultHash,
  s: seed,
  v: version,
  c?: winnerCardIdsHex,
  ch: commitmentHash,          // sha256(canonical({m,w,l,n,h,s,v,c,tr,tc}))
  sig: { b, c },               // winner/proposer + opponent Hive sigs
  tr: transcriptMerkleRoot,
  tc?: transcriptIPFSCID
}
```

The on-chain payload is intentionally compact (single-letter keys) — Hive
custom_json is metered. The full `PackagedMatchResult` lives in IPFS via
the `tc` CID; the chain only carries enough to verify integrity.

---

## §9 Failure Modes and Slashing

| Failure | Detection | Response |
|---|---|---|
| WASM-engine version mismatch | `wasm_hash_check` envelope | Disconnect immediately (both peers know) |
| Build-hash mismatch | `version_check` envelope | Toast warning, continue (not a slash) |
| Seed commitment mismatch | `seed_reveal` validation | Disconnect; possible cheating |
| State hash mismatch (cards) | `hash_check` from host | Toast + `slash_evidence_deferred` record |
| Poker state hash mismatch | `poker_hash_check` with matching turn identity | Integrity event + diagnostic path; no relay-side winner selection |
| Chess transition root/rejection mismatch | `transition_receipt_v1` | Quarantine local chess actions; retain session evidence; no automatic settlement |
| Mid-match disconnect | WS close handler | No auto-broadcast; future evidence flow required |
| Duplicate match_result on-chain | Found via `findExistingMatchResult` | `slash_evidence_deferred` record |
| Transcript root mismatch at result proposal | Opponent local root check | Reject `result_propose`; ranked result is not broadcast |
| Result signature deferred | `attemptDualSig` or inbound `result_propose` | Result NOT broadcast; future result review/sign flow required |
| Chess piece-not-found mid-move | Receive handler `piece_not_found_*` | `recordSessionEvent('chess_command_rejected', { cause })`; freeze (no auto-recovery — see §10 OPEN-3) |

Slash evidence broadcasting is implemented by `submitSlashEvidence`
(`client/src/data/blockchain/slashEvidence.ts`), but P2P runtime paths must not
call it directly. They record deferred evidence until a visible wallet action
exists.

---

## §10 Open Questions and Unresolved Decisions

These are decisions that are **not** stable and which beta-blocking work
should NOT depend on without first re-grilling and updating this spec.

### OPEN-1 — Transcript root comparison can false-reject until ordering is deterministic

**Where**: `useWireSync.ts:1484-1542` — the opponent now compares
`result.transcriptRoot` against its own local replay root before signing.

**Risk**: this closes the "sign without local replay agreement" gap, but it
turns OPEN-2 into a live availability risk. If honest peers record the same
actions in a different order, the opponent rejects with
`transcript_root_mismatch` and the ranked result is not broadcast.

**Decision needed**: make transcript ordering deterministic, then collapse
OPEN-1 into the normal Phase 4 contract. Until then, a mismatch is fail-closed
and keeps the local action log for dispute export.

**Dependency**: OPEN-1 cannot be safely closed while OPEN-2 is open.
Verifying transcript roots between peers requires deterministic ordering;
without it, honest peers would falsely reject each other due to socket
scheduling races. The two must be designed together.

### OPEN-2 — Transcript order is not deterministic between peers

**Where**: `recordMove` is called inline at send time on the local peer
and at receive time on the remote peer. Local-and-remote interleaving is
race-dependent — peer A may record `[A1, B1]` while peer B records
`[A1, B1]` OR `[B1, A1]` depending on socket scheduling.

**Risk**: each peer's transcript can be internally consistent while still
hashing to a different root because local and remote actions are interleaved
by arrival time. This still blocks closing §10 OPEN-1 because root comparison
would otherwise false-reject honest peers under socket scheduling races.

**Decision needed**: order transcript by `(timestamp, commandId)` before
hashing? Use a deterministic counter from the wire envelope (the
`envelope.seq`)? Drop the local transcript entirely on the client and
only host's counts?

### OPEN-3 — Chess non-instant captures + state recovery

**Status**: P0 implementation in progress. Non-instant captures now emit
`chess_combat_initiated` and no longer stop at the UI toast. Poker bootstrap
uses deterministic participant ids and seeded deck order.

Additionally: when chess_command is rejected mid-match with
`attacker_not_found` / `defender_not_found` (post C-Chess.8 these are
rarer but possible under residual bugs), no state recovery is attempted.
The roster dump diagnostic helps debug from logs but the match
effectively freezes.

**Remaining P0 validation**: two-browser smoke for capture-combat-poker
resolution, reconnect during poker, and state-sync recovery after mismatch.

**Decision needed (state recovery)**: implement snapshot request
between peers when divergence is detected, OR keep current
"freeze + console diagnostic" semantics for beta and rely on the fact
that the typical divergence sources (AI gate, mines, captures) are now
each individually blocked or guarded.

### OPEN-4 — Poker symmetric hardening

**Status**: migrated to symmetric P0 path. Action legality, stamina/HP
capacity checks, compact tuple mismatch rejection, remote-actor binding,
duplicate `decisionId` rejection, all-in action lockout, deterministic
showdown coin flips, and turn-clock duration guards are implemented.
Remaining hardening is compact transcript replay from
`shared/p2p-wire/combat.ts` and two-browser smoke evidence.

Live Poker hash coverage now uses the turn-scoped `poker_hash_check`
projection; it remains peer-side evidence because the relay does not execute
the Poker reducer.

### OPEN-5 — Disconnect / reconnect mid-match

**Status**: closed for Alfa / gameplay-only testnet. See
[`P2P_MATCH_RESUME.md`](./P2P_MATCH_RESUME.md).

Same-tab reconnect, sealed local snapshot, 2 relay attempts / 60s, observer
checkpoint retries, no HTTP kick of the opponent, no peer-authored disconnect
frame. The server does not store or judge the board.

**Not this ticket**: ranked `action-log` replay (ADR 0007 / OPEN ranked
settlement). Cards no longer take *forward* host `gameState`; recovery-on-mismatch remains.

### OPEN-6 — `result_propose` matchType field source-of-truth

**Where**: `BlockchainSubscriber.ts:298-301` gates broadcast on
`finalResult.matchType === 'ranked'`. But `matchType` is set client-side
when the result is packaged — the wire never tells the host whether the
match was ranked, casual, or tournament. Today this is implicit (the
matchmaking endpoint that originated the match knows).

**Decision needed**: should `matchType` ride an early match envelope
(seed/`cards_deck`/matchmaking context) as authoritative? Or is it OK to
derive client-side from local context? Do not reopen host `init` for this.

### OPEN-8 — Audit gameState wire and migrate to recovery-on-mismatch

**Status**: closed. Both peers send/apply `game_command`. `cards_deck`
handshake feeds `initGameFromHandshake` on both sides. Forward `gameState`
dumps are off. `hash_mismatch` still pushes a host snapshot. Default
process flags are `symmetric`; hashing uses `isCardsHostFrame`.

### OPEN-9 — Chess king ability (mine placement) sync

**Where**: `useKingChessAbility.enterPlacementMode` blocks mine
placement in P2P with a toast. The ability is fully functional in SP.

**Decision needed**: design `chess_mine_placement` envelope (likely a
new variant added to `ChessCommandSchema`), receiver pipeline that
mirrors the placement on both peers, and visibility rules (does the
opponent see the mine? Same as SP today which is hidden until trigger?).
Same shape as C-Chess.8 — small, scoped, can land as one commit when
the design is settled.

---

## §11 Glossary

| Term | Meaning |
|---|---|
| **canonical side** | Global side label (`'player'` = first-mover, `'opponent'` = second-mover). Decided at seed_reveal. NOT viewer-relative. |
| **commandId** | UUID minted per envelope; used for dedup independent of seq. |
| **dual-sig** | Both peers sign `match_anchor` at start. Ranked `match_result` is winner-posted (ADR 0008); the loser does not countersign game_over. |
| **envelope** | A wire frame — `chess_command`, `game_command`, `result_propose`, etc. |
| **guest sentinel** | The `'guest:' + peerId.slice(0, 8)` playerId used when no Hive username is bound. Indicates a non-arbitrable move. |
| **host** | The peer with the lexicographically smaller `peerId`. Stable across reconnect order. Transport role for seed parity, cards hash frame (`isCardsHostFrame`), hash beacon, and `hash_mismatch` recovery — not gameplay authority for cards apply. NOT a server. |
| **instant-kill** | Chess capture that resolves without entering poker. Triggered when the attacker is a pawn, the defender is a pawn, or the defender is a king. Kings do not capture. Predicate `isChessAttackInstantKill` in `shared/p2p-wire/chess.ts`. |
| **isHost** | The transport-level hint emitted by the relay's `__sys.open`. |
| **matchId** | `SHA256(matchSeed + sortedPeerIds)`, 16 hex chars. Binds every action to one match. |
| **matchSeed** | `SHA256(sortedSalts)`, derived in seed_reveal. The root of all per-match randomness. |
| **myCanonicalSide** | The local viewer's canonical side, derived from `matchSeed` parity XOR `isHost`. |
| **prevStateHash** | Pre-apply state hash carried in the cards envelope; hashed in the host-as-player frame (`isCardsHostFrame`). Protects against fast-double-click race and cross-peer divergence. |
| **cards_deck** | Deck half of the Phase-2 immutable deck+claims snapshot. In shared-network it feeds `initGameFromHandshake` only after identity, binding, IndexedDB, and server approval. |
| **proposalId** | UUID correlating a `result_propose` with its `result_countersign`. |
| **transcript** | The ordered list of `GameMove` records hashed at match end into a Merkle tree. |
