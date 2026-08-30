# PvP Wire Protocol — Norse Mythos Card Game

**Status**: Authoritative spec for the live PvP system. Replaces the obsolete
`MULTIPLAYER_P2P.md` (deleted 2026-05-03).

> **Active testnet contract:** [ADR 0007](adr/0007-p2p-gameplay-only-testnet.md)
> enables deterministic WebSocket phase checkpoints but disables P2P
> `match_anchor`, `match_result` and economic settlement. Quick Match follows
> `Offer → Accept → Ready`: queue/search is unsigned, `Accept` is the one
> match-specific Posting signature per player, and no later handshake,
> reconnect or result path may prompt Keychain. A completed match shows and
> exports a local result only.

**Audience**: contributors writing or auditing P2P wire code, the transcript
pipeline, or the matchmaking surface. Ranked settlement canon:
[ADR 0008](adr/0008-winner-posted-match-result.md).

Normative Quick Match invariants:

```text
SEARCH ≠ SIGN
ACCEPT = única firma Keychain de la partida
BATTLE_START ⇒ A_AUTHORIZED ∧ B_AUTHORIZED ∧ P2P_READY
P2P ∨ UNKNOWN_STATE ⇒ AI_DISABLED
```

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
owns four bounded responsibilities plus future settlement:

1. **Matchmaking**: an in-memory, ELO-aware queue that issues per-peer
   `queueToken` bearer secrets and per-peer `P2PMatchTicket` credentials
   (`server/routes/matchmakingRoutes.ts`).
2. **Gameplay data plane**: WebRTC DataChannel when the runtime policy allows
   it, with `/ws/p2p` as the server relay fallback. Neither path is gameplay
   authority.
3. **Control/referee plane**: authenticated `/ws/control` carries WebRTC
   signaling, transport lifecycle, phase checkpoint proposals/results and
   poker time-notary proposals/results. Quick Match uses Control WS for all
   referee traffic; the legacy relay handler remains for direct compatibility.
   See [ADR 0005](adr/0005-server-notarized-phase-checkpoints.md) and
   [ADR 0011](adr/0011-server-notarized-poker-turn-clock.md).
4. **Future arbitration** (post-match, off-wire): outside those fixed
   checkpoints the server is *not* part of real-time gameplay validation.
   Dual-signed `match_result`, Hive broadcast and slash processing remain
   deferred ranked settlement work and are not executed in the current testnet.

The server does not have a database of game state and cannot adjudicate moves.
It holds only constant-sized phase agreement and poker-turn deadline metadata
and is **not a source of truth about gameplay**. Referee messages use the
authenticated Control WS independently of gameplay transport in Quick Match.

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
- For authenticated Quick Match sessions, referee proposals are sent on the
  separate Control WS and never enter this gameplay socket. The relay still
  consumes `phase_checkpoint_propose_v1` and `poker_turn_started` for legacy
  direct rooms and older clients. Matching proposals produce the same
  server-only commit/dispute result; a mismatch never selects a winner.

**Keepalive**: WS-level ping/pong every 15s (`p2pRelay.ts:235-243`). An
app-level `heartbeat` envelope (sent by `useWireSync`) runs on top.

## §2.1 Control WebSocket and native WebRTC transport

**Endpoint**: `ws://<host>/ws/control?match=<matchId>&peer=<peerId>`
(`server/routes/p2pControl.ts`). This channel is separate from gameplay relay
traffic. It accepts only the `ragnarok-p2p-control-v1` subprotocol and a
ticket subprotocol `ragnarok-p2p-ticket.control.<token>`; the ticket never
appears in the URL.

In shared-network runtimes, the upgrade requires both the reusable Hive web
session cookie and a matching signed ticket account. The ticket is bound to
the match and peer and carries the deterministic `role` (`offerer` or
`answerer`). A missing role is accepted by legacy ticket readers but rejected
by Control WS. The web session cookie uses `/` scope so the browser sends it
to the WebSocket upgrade as well as `/api`.

The first client frame must be `control_hello_v1` with the same `matchId` and
authenticated `peerId` from the upgrade. Once both peers have completed the
hello, the server emits `control_open_v1` to each. These bounded messages are
either routed to the opponent or delivered back as referee results:

- `webrtc_offer_v1` from the `offerer`;
- `webrtc_answer_v1` from the `answerer`;
- `ice_candidate_v1`;
- `transport_ready_v1` and `transport_fallback_v1`;
- `phase_checkpoint_propose_v1` and `poker_turn_started` are submitted to the
  server referee; their commit/dispute results are never sent over gameplay.
- `poker_action_time_gate_v1` is submitted to the Time Notary and, when
  accepted, is delivered only to the opponent through Control WS.

SDP, ICE, frame size, message rate, room size, origin, and match bindings are
validated at the boundary. Control WS never forwards `P2PMessage` gameplay
frames and never chooses a winner. `WebRTCTransport` consumes this contract
behind `GameTransport`, using the public ICE list from the validated runtime
transport config when present. `TransportManager` tries it only when the
runtime policy enables it and the browser exposes the required capabilities.
The known-good `/ws/p2p` relay remains the fallback and receives gameplay if
WebRTC fails before the match opens. Quick Match also keeps the authenticated
Control WS open after fallback so referee traffic remains independent of
gameplay. A control close, error, malformed control frame, or
`control_error_v1` fails the active transport after it has opened, allowing the
existing reconnect/toast path to restore both sockets instead of leaving a
phase transition waiting forever. Legacy direct rooms without a signed
transport role keep their relay-compatible referee path.
No live transport switch is performed after gameplay begins.
Likewise, `control_peer_left_v1` means the opponent left the control plane: it
fails an in-progress WebRTC attempt and fails an already-open signed Quick
Match transport so the normal reconnect/toast flow restores both channels. A
real gameplay disconnect must come from the game transport itself or the
existing heartbeat/reconnect policy.

The gameplay `isHost` perspective is supplied by the match/manual host
assignment and is preserved across transport selection. The WebRTC
`offerer`/`answerer` role is signaling-only and must not become game authority.

### Runtime transport policy

The browser reads `GET /api/p2p/transport-config` before opening a P2P
transport. The response is versioned and contains `webrtcEnabled`,
`relayEnabled`, independent bounded `timeouts` (`webrtcNormalMs`,
`webrtcAggressiveMs`, `relayConnectMs`), and public ICE server URLs only.
`P2P_WEBRTC_ENABLED`, `P2P_WS_FALLBACK_ENABLED`, `P2P_WEBRTC_NORMAL_MS`,
`P2P_WEBRTC_AGGRESSIVE_MS`, `P2P_RELAY_CONNECT_MS`, and `P2P_ICE_SERVERS` are
server-side runtime values. Legacy flags may be read only for transition
compatibility; timeout values use only the new independent names. Invalid
values resolve to safe defaults; no ticket,
SDP, username, or credential is returned by this endpoint.

The pure transport policy distinguishes browser WebRTC capability, WebSocket
availability, signed offerer/answerer role, network type, shared-network
runtime, and ICE configuration. `cellular` selects `webrtcAggressiveMs`; other
known or unknown network types select `webrtcNormalMs`. On shared networks,
missing ICE servers selects relay-only (`no-ice`); local development may still
attempt WebRTC with host candidates. The client caches a valid response briefly
and uses this precedence when refreshing: fresh runtime config, last-known-good
runtime config, then a safe relay-only default. An unavailable config endpoint
never re-enables WebRTC from baked client flags.

The resolved `TransportPlan` carries the selected WebRTC and relay budgets to
the manager. They are independent: a WebRTC timeout does not consume the
relay budget. If WebRTC fails after its budget, the relay receives its full
`relayConnectMs` opportunity. The manager executes the plan but does not
recompute policy.

Before the DataChannel is ready, a failed WebRTC attempt sends one
`transport_fallback_v1` with a bounded reason. The server forwards it only
while that control member has not sent `transport_ready_v1`; after readiness,
fallback is ignored. Once the manager selects the relay, a match-scoped
transport session locks relay for subsequent reconnect attempts, preventing a
recreated manager from reintroducing WebRTC mid-match.

**Latency and reconnect policy (P0)**:
- User actions are sent as compact intent envelopes, not full state dumps.
  Chess/poker carry the minimum semantic action plus optional compact tuples.
  Cards applies `game_command` locally on both peers; host `gameState` is
  recovery-on-`hash_mismatch` only (OPEN-8 closed).
- Same-tab network loss enters `grace_period`/`reconnecting`; the local seed,
  transcript, seq counters, chess sender state, and queued messages are
  preserved. Reconnect allows two automatic attempts inside a 60s window
	(`2s`, then `15s` scheduling). Each recreated manager receives independent
	bounded WebRTC and relay budgets, and a relay fallback remains sticky for
	the match. If the window expires, the lifecycle cancels a pre-battle session;
	after competitive commitment, the disconnected side receives a local
	technical result.
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

1. LOGIN signs `ragnarok-login:<username>:<timestamp>` once with Hive Posting
   authority and establishes the reusable `/api/session` HTTP session. In
   shared-network runtime (`testnet`/`mainnet`), Quick Match queue/search
   requires that session; it does not open Keychain or sign the queue body.
   The server also requires a server-side starter ceremony receipt recorded
   through `/api/starter/claim` before the account can enqueue. The request may
   carry identity metadata for ELO lookup, but the HTTP session is the
   authentication authority. The server returns a process-local `queueToken`;
   clients send it as `x-p2p-queue-token` for queue rechecks, status polling and
   leave requests.
2. The server runs `findBestEloMatch` (`matchmakingRoutes.ts:93`):
   - First pass: closest ELO within ±200 (expands to ±500 after 30s,
     anyone after 60s — see `matchmakingRoutes.ts:99-102`).
   - Second pass: if no ELO match, pair with anyone waiting >60s.
   A pair receives perspective-specific `offer` objects, not relay tickets.
   The offer includes the shared `offerId`, `matchId`, both peer identities,
   nonce and expiry. No active room exists yet.
3. Each player explicitly accepts their offer with `POST
   /api/matchmaking/accept`. On shared network this is the only
   match-specific Keychain action: the player signs the canonical acceptance
   payload containing the offer, peer binding, ruleset/engine hashes,
   ephemeral session public key, nonce and expiry. The server verifies the
   proof against the reusable HTTP session and stores it idempotently.
   One acceptance returns `waiting_opponent`; two valid acceptances commit the
   match. A declined or expired offer creates no room.
4. Only after bilateral acceptance does the server create the peer-specific
   relay tickets/challenges and return `status: ready`. Each status response
   contains only that caller's own `matchTicket`. Direct challenges and manual
   rooms remain legacy compatibility paths and are outside this Quick Match
   migration.

5. The first arrival becomes "host" by matchmaking convention. The relay
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

Both peers open the gameplay socket `/ws/p2p?room=<matchId>&peer=<peerId>` and,
for signed Quick Match, the authenticated control socket
`/ws/control?match=<matchId>&peer=<peerId>`. Each route verifies the
peer-specific `P2PMatchTicket` from its WebSocket subprotocol, including the
ticket account's current starter receipt whenever tickets are required
(`production`, `testnet`, or `mainnet`). Quick Match is considered connected
only when both gameplay and control channels are open; direct legacy rooms may
use gameplay-only compatibility. The gameplay relay sends `__sys.open` once
both peers arrive, and the control route sends `control_open_v1` after both
authenticated hellos. Each peer transitions `peerStore.connectionState` to
`'connected'` only after the selected transport has both channels ready.

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

### Phase 2.1 — BattleReady

After the transport, identity/session, seed, loadout, and initial-state
handshakes complete, each peer sends exactly one `battle_ready_v1` proof for
the active match:

```text
{ matchId, engineHash, rulesetHash, loadoutHash, initialStateRoot }
```

The receiver validates the match binding and compares the engine, ruleset, and
canonical initial-state root. `loadoutHash` must be present on both proofs;
the two players may legitimately have different loadouts. Quick Match also
requires bilateral Accept authorization and its active peer-specific ticket.
Direct challenges preserve their existing ticket/session compatibility path,
but both paths remain blocked until local and remote BattleReady proofs agree.
This proof is transport-independent and is never added to canonical gameplay
state.

### Phase 3 — Move Loop

Each phase of the game (cards / chess / poker) emits its own envelope type;
see §5 for the authority model.

The transcript is started (`startNewTranscript()` at `useWireSync.ts:241`) at
the moment the connection becomes ready. Every move recorded — by the local
player at send time, or by the remote peer at receive time — appends to it
(see §7).

#### Competitive commitment and abandonment

Transport readiness is not competitive commitment. The pure reducer in
`shared/p2p-wire/p2pCompetitionLifecycle.ts` starts in `pre_battle` and enters
`battle` only after the canonical engine accepts a valid action. Until then,
disconnect expiry or explicit `p2p_leave` cancels the session without a winner,
loser, or economic consequence.

After commitment, explicit leave or reconnect expiry produces a technical
result using absolute peer IDs. Disconnect is first recorded as a transient
absence; only expiry resolves it. Normal engine results and technical results
are terminal, idempotent, and irreversible. The reducer owns no RUNE, ELO, XP,
or blockchain settlement policy: those remain separate post-match layers.

### Phase 4 — Local Result (current) / winner-posted result (future, ADR 0008)

When `gameState.gamePhase === 'game_over'`, the current testnet displays and
exports the local result after the terminal checkpoint commits. It opens no
Keychain prompt and emits no Hive operation.

The retained future settlement implementation in `BlockchainSubscriber`
packages the result (`BlockchainSubscriber.ts:272-294`) for a later ranked
activation:
1. Computes the merkle root of the transcript (`buildMerkleTree()`).
2. Pins the transcript bundle to IPFS (best-effort, non-blocking).
3. The winner computes the compact commitment hash `ch` over
   `{m,w,l,n,h,s,v,c,tr,tc}` where `h = result.hash` and `tr` is the
   transcript Merkle root, then signs it in a visible result review flow.
4. The winner posts `match_result`; the loser does not countersign `game_over`.
   Replay validates the winner, transcript root, and Terminal Checkpoint Receipt
   before any ranked projection is accepted.
5. Without a later ranked gate the result is NOT broadcast. Alfa never posts
   `match_result`. Closed Beta posts winner-only (ADR 0008).

### Phase 5 — Cleanup

- `clearTranscript()` runs in the seed-exchange effect's cleanup
  (`useWireSync.ts:248-250`).
- The relay garbage-collects socket membership when both peers disconnect and
  retains only the constant-size phase checkpoint tombstone for 120s.
- The server's active-match registry retains a live match behind the
  24-hour safety TTL. A terminal checkpoint schedules direct cleanup after the
  10-minute audit/reconnect retention window; the periodic sweep remains a
  defensive backstop (`p2pActiveMatchRegistry.ts`).

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
| `battle_ready_v1` | both | both | Phase 2: bilateral match, engine, ruleset, loadout, and initial-state proof; game start stays blocked until both proofs agree |
| `army_announcement` | both | both | Phase 2: announce selected chess army |
| `cards_deck` | both | both | Phase 2: announce the deck half of the immutable deck+claims snapshot |
| `deck_verify` | both | both | Phase 2: bind source-aware `protocolVersion: 2` claims to the announced deck; shared-network init waits for identity + IndexedDB + server approval |
| `init` | host → client | legacy | Phase 2 leftover: ignored after handshake init |
| `game_command` (envelope) | both | both | Phase 3 cards and Poker auxiliary intents: both peers apply locally |
| `gameState` | host → client | host recovery | `hash_mismatch` recovery snapshot only, compressed as `json+gzip+base64url@1` |
| `chess_command` (envelope) | both | both (symmetric) | Phase 3 chess: discriminated union of `chess_move` (quiet), `chess_attack` (instant-kill capture), and `chess_combat_initiated` (non-instant capture into poker) — see §5 |
| `transition_receipt_v1` | receiver → command sender | both (symmetric) | Post-commit chess receipt binding the command intent to the receiver's pre/post chess+cards integrity roots. A rejection or root mismatch quarantines further local chess actions. |
| `p2p_leave` | peer → peer | leaving peer | Explicit lifecycle event; cancellation before engine commitment, technical defeat after commitment |
| `phase_checkpoint_propose_v1` | peer → Control WS referee | both | Fixed-size proposal for a deterministic phase boundary; legacy direct rooms may submit it through the relay compatibility path. |
| `phase_checkpoint_commit_v1` / `phase_checkpoint_dispute_v1` | Control WS referee → peers | server referee only | Commit if roots match. Mismatch retries; freeze only after 3 strikes. The referee never picks a winner. |
| `poker_turn_started` | peer → Control WS referee | both | Timed-poker turn identity proposal; legacy direct rooms may submit it through the relay compatibility path. Client `durationMs` / `remainingMs` / `sentAtMs` are ignored. |
| `poker_turn_notary_commit_v1` / `poker_turn_notary_dispute_v1` | Control WS referee → peers | server referee only | Commit if both peers proposed the same `turnId`. The first proposal stamps the start; the deadline is always 60s. Mismatch retries; freeze after 3 strikes. The referee never picks a winner. |
| `poker_action` / `poker_action_time_gate_v1` | both | both (symmetric) | Phase 3 poker: deterministic local apply + server-gated delivery to the peer; Quick Match sends the control wrapper through Control WS, while legacy direct rooms may use the relay. Required `origin` and `turnId`; compact tuple remains optional. |
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
| `session_authorize` | peer→peer | both | Quick Match carries the already-verified `Accept` proof `{ matchId, ephemeralPubkey, hiveSig, acceptance }` into the handshake. Both peers must verify the bilateral proof before BattleReady; it never opens a second Keychain prompt. Direct challenges retain their existing session/ticket authorization path. |
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
symmetrically. Cards hashes use the canonical player frame
(`myCanonicalSide === 'player'`), independent of the transport host hint;
forward `gameState` dumps are off.

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
  `prevStateHash` uses the canonical player frame so both viewers hash the
  same state even when transport host and canonical player are different.
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
  Control WS referee consumes the frame (it is never fanned out), ignores
  client `durationMs` / `remainingMs` / `sentAtMs`, stamps
  `serverStartedAtMs` on the first valid proposal, and commits
  `deadline = start + 60_000` when the second identity matches. Reconnect
  replays that same commit; it does not grant another 60s. See ADR 0011.
- The browser renders a countdown from `PokerTurnClock` via
  `createNotarizedPokerTurnClock`, which projects `remainingMsAtCommit` onto
  local `Date.now()`. That may lag the server by one RTT. Acceptance
  authority is the Control WS receive timestamp versus `serverDeadlineAtMs`,
  not either wall clock. A `poker_action` is forwarded only after the turn is
  `committed`; a pending notary or a previous `turnId` is dropped.
- `poker_action_time_gate_v1` carries the same validated action fields through
  Control WS. The referee applies the notary gate before delivering it to the
  opponent; the receiver unwraps it into the normal `poker_action` envelope.
- `origin: 'timeout'` is accepted by the Control WS referee only at or after the notarized
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
4. Future ranked terminal receipts bind the winner-posted `match_result` to
   the committed checkpoint; there is no loser result countersignature.
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
  sig: { b },                  // winner Hive signature; loser does not countersign
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
| Transcript root mismatch at future result replay | Opponent local root check | Reject the terminal receipt; ranked result is not broadcast |
| Result signature deferred | Future winner review/sign flow | Result NOT broadcast; no loser countersign is requested |
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

**Status**: closed as obsolete for Alfa / current testnet. The legacy
`result_propose`/`result_countersign` path is not used for ranked settlement;
the winner-posted `match_result` path carries the result after terminal
checkpoint and replay validation. The legacy schemas and relay allow-list may
remain only for compatibility with older clients.

### OPEN-8 — Audit gameState wire and migrate to recovery-on-mismatch

**Status**: closed. Both peers send/apply `game_command`. `cards_deck`
handshake feeds `initGameFromHandshake` on both sides. Forward `gameState`
dumps are off. `hash_mismatch` still pushes a host snapshot. Default
process flags are `symmetric`; hashing uses the canonical player side, not the
transport host hint.

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
| **host** | The peer with the lexicographically smaller `peerId`. Stable across reconnect order. Transport role for seed parity, hash beacon, and `hash_mismatch` recovery — not gameplay authority or the cards hash frame. NOT a server. |
| **instant-kill** | Chess capture that resolves without entering poker. Triggered when the attacker is a pawn, the defender is a pawn, or the defender is a king. Kings do not capture. Predicate `isChessAttackInstantKill` in `shared/p2p-wire/chess.ts`. |
| **isHost** | The transport-level hint emitted by the relay's `__sys.open`. |
| **matchId** | `SHA256(matchSeed + sortedPeerIds)`, 16 hex chars. Binds every action to one match. |
| **matchSeed** | `SHA256(sortedSalts)`, derived in seed_reveal. The root of all per-match randomness. |
| **myCanonicalSide** | The local viewer's canonical side, derived from `matchSeed` parity XOR `isHost`. |
| **prevStateHash** | Pre-apply state hash carried in the cards envelope; hashed in the canonical player frame (`myCanonicalSide === 'player'`). Protects against fast-double-click race and cross-peer divergence. |
| **cards_deck** | Deck half of the Phase-2 immutable deck+claims snapshot. In shared-network it feeds `initGameFromHandshake` only after identity, binding, IndexedDB, and server approval. |
| **proposalId** | Historical identifier for the obsolete `result_propose`/`result_countersign` handshake; not part of the current winner-posted result path. |
| **transcript** | The ordered list of `GameMove` records hashed at match end into a Merkle tree. |
