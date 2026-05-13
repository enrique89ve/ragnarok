# PvP Wire Protocol — Norse Mythos Card Game

**Status**: Authoritative spec for the live PvP system. Replaces the obsolete
`MULTIPLAYER_P2P.md` (deleted 2026-05-03).

**Audience**: contributors writing or auditing P2P wire code, the dual-sig
match-result flow, the transcript pipeline, or the matchmaking surface.

**Companion specs**:
- `RAGNAROK_PROTOCOL_V1.md` — on-chain custom_json operations (the surface
  the winner submits at match end).
- `P2P_SECURITY_HARDENING.md` — five security invariants enforced over this
  wire (still valid; folded into §6 below for context).
- `BETA_TESTNET_ROADMAP.md` — work plan, technical debt, decisions per
  session (NOT a spec — read this for *why* the code is the way it is).
- `shared/p2p-wire/chess.ts` — chess wire schema (canon for chess envelopes).

**Conventions**:
- File:line references point to the implementing code; if a reference becomes
  stale the spec is wrong, not the code.
- Sections marked "**OPEN**" are decisions that have not been resolved at
  spec-write time — implementations may already exist but the contract is
  not stable. Do NOT rely on them in beta-blocking work.

---

## §0 Table of Contents

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

A PvP match runs entirely between two browser clients ("peers"). The server
owns three responsibilities and nothing more:

1. **Matchmaking**: a stateless first-come-first-served queue with ELO-aware
   pairing (`server/routes/matchmakingRoutes.ts`).
2. **Relay**: a WebSocket fan-out that forwards opaque JSON frames between
   the two peers in a room (`server/routes/p2pRelay.ts`). The relay does
   NOT inspect game logic; it only validates frame envelope shape and
   enforces a whitelist of `type` values.
3. **Arbitration** (post-match, off-wire): the server is *not* part of any
   real-time validation. Once both peers sign a `match_result`, the winner
   broadcasts a `custom_json` to Hive L1; the indexer / arbitrator processes
   it asynchronously. Disputes are submitted out-of-band as slash evidence.

The relay does not have a database of game state. It cannot adjudicate moves.
The server holds **no source of truth about gameplay**.

**Two universes share this protocol** (see `SET_AXIS.md`):
- `set: 'starter'` — off-chain, infinite supply. Match results MAY skip
  on-chain broadcast (casual matches).
- `set: 'genesis'` — on-chain NFT pool. Ranked match results MUST broadcast.

The wire protocol is identical across both universes; only the post-match
broadcast policy differs.

---

## §2 Transport: WebSocket Relay

**Endpoint**: `ws://<host>/ws/p2p?room=<roomId>&peer=<peerId>`
(`server/routes/p2pRelay.ts:128-137`)

**Why WebSocket, not WebRTC**: the legacy WebRTC + PeerJS broker (commits
prior to `1bf9dcb refactor(transport): remove peerjs dependency`) failed
under broken DNS, restrictive NATs, and WSL2 networking. The WS relay works
universally because all traffic is server-mediated, at the cost of one extra
hop. For a turn-based card game this latency is negligible.

**Room lifecycle**:
- A room is created on first peer arrival, indexed by `roomId` (the
  `matchId` returned by matchmaking).
- Maximum 2 peers per room (`ROOM_MAX_PEERS`, `p2pRelay.ts:31`).
- When the room reaches 2 peers, the relay sends `__sys.event=open` to
  each, with `isHost=true` to the first arrival and `isHost=false` to the
  second (`p2pRelay.ts:116-123`). This `isHost` is a **transport-level
  hint**, used to break ties during seed exchange. It does NOT confer
  authority by itself.
- A peer departure (close or error) sends `__sys.event=close` to the
  survivor. The room is garbage-collected when empty.

**Frame validation** (`p2pRelay.ts:86-107`):
- Maximum payload: 64 KB (`MAX_PAYLOAD_BYTES`).
- Must be valid JSON with a `type` string field.
- `type` must be in the whitelist (see §4 for the canonical list). Reserved
  prefix `__` is blocked from the client side (only the relay emits `__sys`
  envelopes).
- Frames that fail validation are silently dropped (no client-visible error).
  This is intentional — surfacing failure shape would be a probe channel.

**Keepalive**: WS-level ping/pong every 15s (`p2pRelay.ts:235-243`). An
app-level `heartbeat` envelope (sent by `useWireSync`) runs on top.

---

## §3 Match Lifecycle

A complete match traverses six phases. All cross-peer state is established
in phases 0-2 before any gameplay action is sent.

### Phase 0 — Matchmaking

1. Each player POSTs `/api/matchmaking/queue` with `{ peerId, username }`.
   The body is signed via Hive Keychain when `username` is present
   (`matchmakingRoutes.ts:138`, middleware
   `requireHiveBodyAuthIfUsernamePresent`).
2. The server runs `findBestEloMatch` (`matchmakingRoutes.ts:93`):
   - First pass: closest ELO within ±200 (expands to ±500 after 30s,
     anyone after 60s — see `matchmakingRoutes.ts:99-102`).
   - Second pass: if no ELO match, pair with anyone waiting >60s.
3. On match, the server returns `{ matchId, opponentPeerId, isHost: false }`
   to the joining player. The other player learns of the match by polling
   `/api/matchmaking/status/:peerId`.
4. The first arrival becomes "host" by matchmaking convention. NOTE: the
   relay also emits `isHost` based on WS arrival order. These two
   `isHost` values are NOT guaranteed to agree — the WS-relay value is the
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
relay sends `__sys.open` once both arrive. Each peer transitions
`peerStore.connectionState` to `'connected'`.

### Phase 2 — Seed Exchange (commit-reveal)

Triggered by `useWireSync.ts:166-251` (effect dependent on
`connection / connectionState / send`).

1. Each peer generates a 32-byte salt and sends
   `{ type: 'seed_commit', commitment: SHA256(salt) }`
   (`useWireSync.ts:194-199`).
2. Each peer also sends `version_check` (build hash) and `wasm_hash_check`
   (game-engine WASM hash) for transparency. WASM mismatch disconnects
   immediately (`useWireSync.ts:361-372`); build mismatch only warns.
3. Each peer sends `army_announcement` with their selected army so both
   sides can render hero portraits and the host can build a deterministic
   initial gameState (`useWireSync.ts:208-218`).
4. On receiving the opponent's `seed_commit`, each peer sends
   `seed_reveal: { salt, hiveUsername }` (`useWireSync.ts:434-438`).
5. On receiving `seed_reveal`, the receiver:
   - Verifies `SHA256(theirSalt) === theirCommitment`. Mismatch →
     disconnect (`useWireSync.ts:449-455`).
   - Derives `matchSeed = SHA256(sortedSalts.join(''))` where sorting is
     by lexicographical peer-id order (`useWireSync.ts:457-463`).
   - Derives `matchId = SHA256(matchSeed + sortedPeerIds.join('')).slice(0,16)`
     (`useWireSync.ts:483-502`). Sorting matters: cards is host-auth so the
     client never compared, but chess Plan B is symmetric and both peers
     must arrive at the same value. Bug fixed in commit `dd9112c`.
   - Derives `myCanonicalSide = parity(matchSeed[0]) XOR isHost` →
     `'player' | 'opponent'` (`shared/p2p-wire/chess.ts:124-132`,
     `useWireSync.ts:469`). This is the canonical (global) side, NOT
     viewer-relative. Both peers agree on which side is which.
   - Stores `opponentUsernameRef.current = data.hiveUsername`
     (`useWireSync.ts:511-513`).
   - Both peers initialize the chess engine RNG from `matchSeed` so any
     chess-side randomness (mine placements, mine ids) converges
     (`useWireSync.ts:478-480`).
   - The HOST builds the authoritative initial `gameState` via
     `initGameWithSeed(matchSeed)` and sends it as `init`
     (`useWireSync.ts:515-528`).
6. The non-host applies the `init` after flipping the gameState perspective
   (`useWireSync.ts:532-536` + `flipGameState`).

Seed exchange has a 10s timeout (`useWireSync.ts:262-269`). On timeout, the
peer disconnects.

### Phase 3 — Move Loop

Each phase of the game (cards / chess / poker) emits its own envelope type;
see §5 for the authority model.

The transcript is started (`startNewTranscript()` at `useWireSync.ts:241`) at
the moment the connection becomes ready. Every move recorded — by the local
player at send time, or by the remote peer at receive time — appends to it
(see §7).

### Phase 4 — Result Proposal (dual-sig)

When `gameState.gamePhase === 'game_over'`, `BlockchainSubscriber` packages
the result (`BlockchainSubscriber.ts:272-294`):
1. Computes the merkle root of the transcript (`buildMerkleTree()`).
2. Pins the transcript bundle to IPFS (best-effort, non-blocking).
3. Calls `attemptDualSig` (`BlockchainSubscriber.ts:317-339`):
   - HOST signs `result.hash` with their Hive posting key
     (`hiveSync.signResultHash`).
   - HOST sends `result_propose: { result, hash, broadcasterSig, proposalId }`
     to the client.
   - HOST waits up to 30s for `result_countersign`.
4. CLIENT receives `result_propose` (`useWireSync.ts:1011-1057`):
   - Validates that the result names them as winner-or-loser by Hive
     username (NOT by peerId — identity is anchored to Hive account).
   - Validates that the proposal's winner agrees with the local
     `gameState.winner` field.
   - On agreement: signs `data.hash` and sends `result_countersign`.
   - On disagreement: sends `result_reject` with a reason code.
5. HOST attaches both signatures to the result and broadcasts on-chain
   (see §8). Without dual-sig the result is NOT broadcast for ranked
   matches (`BlockchainSubscriber.ts:298-301`).

### Phase 5 — Cleanup

- `clearTranscript()` runs in the seed-exchange effect's cleanup
  (`useWireSync.ts:248-250`).
- The relay garbage-collects the room when both peers disconnect.
- The server's `activeMatches` map evicts the match after 300s
  (`ACTIVE_MATCH_TTL_MS` in `matchmakingRoutes.ts`, applied uniformly at
  both the periodic sweep and the post-pair `setTimeout`).

---

## §4 Wire Envelopes (`P2PMessage` union)

The complete union is defined in `client/src/game/hooks/useWireSync.ts:78-91`.
The relay whitelist (`server/routes/p2pRelay.ts:47-69`) MUST stay in sync.

| `type` | Direction | Sender authority | Purpose |
|---|---|---|---|
| `seed_commit` | both | both | Phase 2: commit to a salt |
| `seed_reveal` | both | both | Phase 2: reveal salt + Hive username |
| `version_check` | both | both | Phase 2: build-hash diagnostic |
| `wasm_hash_check` | both | both | Phase 2: engine-hash check (disconnect on mismatch) |
| `army_announcement` | both | both | Phase 2: announce selected chess army |
| `deck_verify` | both | both | Phase 2: announce owned NFT card ids for cross-verification |
| `init` | host → client | host only | Phase 2: send authoritative initial gameState |
| `game_command` (envelope) | client → host | client | Phase 3 cards: requests an action from host |
| `gameState` | host → client | host | Phase 3 cards: sync authoritative state (debounced) |
| `chess_command` (envelope) | both | both (symmetric) | Phase 3 chess: discriminated union of `chess_move` (quiet) and `chess_attack` (instant-kill capture) — see §5 |
| `poker_action` | client → host | client | Phase 3 poker: action submitted to host |
| `hash_check` | host → client | host | Periodic state-hash sanity check |
| `hash_mismatch` | client → host | client | Reports a divergent state hash |
| `result_propose` | host → client | host | Phase 4: proposed match result with broadcaster sig |
| `result_countersign` | client → host | client | Phase 4: client's signature on the same hash |
| `result_reject` | client → host | client | Phase 4: client refuses to sign with reason |
| `heartbeat` | both | both | App-level keepalive |
| `ping` / `pong` | both | both | Lower-level RTT probe |
| `opponentDisconnected` | (relay only) | relay | Surfaced to UI |
| `spectator_state` | host | host | Future / unused in beta |
| `session_authorize` | peer→peer | both | Phase 0 (ADR 0004): broadcast `{ matchId, ephemeralPubkey, hiveSig }` at match start so the opponent binds the ephemeral signing key to the Hive identity |
| `session_renewal` | peer→peer | both | Phase 0 (ADR 0004): after reload/crash, broadcast `{ matchId, newPubkey, hiveSig }` so the opponent accepts a fresh ephemeral key for the same match |
| `session_resumed` | peer→peer | both | Phase 0 (ADR 0004): acknowledge a renewal with `{ matchId, lastSeenStateHash }` so the resuming peer can decide between replay-from-log and `state_sync_request` |
| `state_sync_request` | peer→peer | both | Phase 0 (ADR 0004): request the signed action log from a turn onwards (`{ matchId, fromTurn }`) when local IndexedDB replay is unavailable or corrupted |
| `action_envelope` | peer→peer | broadcaster | Phase 0 (ADR 0004): per-action signed envelope `{ matchId, seq, prevHash, action, sig }`. `action` stays `unknown` on this layer — issue 03 owns the inner schema and per-action validation |

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

This is the **target** shape. The current code base has two transitional
exceptions, both tracked as open work:

- **Cards phase** runs host-authoritative today (see subsection below).
  Migration to symmetric tracked in **OPEN-8**.
- **Poker phase** runs host-authoritative today (see subsection below).
  Migration tracked in **OPEN-4**.

While these transitions persist, the bridge layer (today
`client/src/game/hooks/useWireSync.ts`, scheduled to move under
`client/src/game/match/modes/p2p/wireSync/` — see
`BETA_TESTNET_ROADMAP.md`) carries the host/client distinction internally
by reading `authority.myRole === 'first-mover'`. The wire envelope schemas
themselves are agnostic to authority; each receiver resolves authority
locally via `deriveAuthority`.

The single most important piece of context to hold when working on the
wire is: **a wrong authority assumption causes silent state divergence**.
Read `deriveAuthority` once at the entry point, propagate the result —
never re-derive ad-hoc with `isHost`.

### Cards Phase — Host-Authoritative (transitional, OPEN-8)

Pattern: client sends `game_command`, host validates and applies, host
broadcasts authoritative `gameState` periodically.

Implementation:
- Client wraps every action (`playCard`, `attack`, `endTurn`,
  `useHeroPower`) with `sendCommandEnvelope`
  (`useWireSync.ts:1170-1218`). The client does NOT apply locally when
  acting as `!isHost && connectionState === 'connected'`
  (`useWireSync.ts:1226-1238`); it waits for the host's gameState sync.
- Host receives `game_command`, runs the validation pipeline
  (`useWireSync.ts:540-723`), applies via `applyOpponentCommand` to the
  unified store, and emits a debounced `gameState` sync.
- The wire envelope carries `prevStateHash` (a quickhash of the host's
  pre-apply state). Host rejects if it doesn't match — this catches
  the fast-double-click race where the client sends two commands that
  reference the same pre-state but the host has already advanced.
- Cooldown of 250ms between client envelopes (`useWireSync.ts:1180-1185`)
  caps how fast the client can send.

The host's transcript is the authoritative one; the client's is a local
copy for QA export.

### Chess Phase — Symmetric (canonical)

Pattern: both peers validate AND apply each chess_command independently.
No host-only routing.

**Wire surface** (post C-Chess.8):
- `chess_move`: quiet move (no capture). Both peers apply via
  `executeMove`.
- `chess_attack`: instant-kill capture only. Receiver runs
  `startAttackAnimation(attacker, defender, true)` and the existing
  `completeAttackAnimation` → `executeInstantKill` chain handles the
  apply locally on each peer. Schema in `shared/p2p-wire/chess.ts`
  (discriminated union; `defenderId` is explicit and verified against
  the local roster as defense-in-depth).

**Sender invariant** (`useChessBoardInteractions.ts:184-238`):
**every wire envelope represents a mutation that the sender already
applied locally**. The sender calls `movePiece` first; only if the slice
returns a collision (attack) or null with no rejection (quiet) does the
wire emit fire. This guarantees that if the local validation refused to
apply (illegal move, animation in progress, missing selection), no
envelope is sent and the remote never sees a mutation that the sender
itself didn't perform.

**Instant-kill rule** (single source of truth:
`shared/p2p-wire/chess.ts` `isChessAttackInstantKill`): an attack is
instant-kill when `attacker.type ∈ {pawn, king}` (Valkyrie weapon) OR
`defender.type === pawn` (too weak to defend). The predicate is consulted
by the sender (to decide between `chess_attack` emit vs the
non-instant-capture toast) and by the receiver (to reject envelopes that
claim a non-instant outcome). Same module = no drift.

**Non-instant captures** (queen vs rook, rook vs bishop, etc.) are
**blocked at the UI layer** with a toast — they require the chess→poker
phase to be wired symmetrically, which is a separate workstream tracked
in §10 OPEN-3. The `executeInstantKill` chain bypasses the poker phase
entirely; it's the only chess→state-mutation path safe to run on both
peers without coordination today.

**King ability (mine placement) blocked in P2P**: each peer's mines
live in their local store and don't cross the wire today. If kept
enabled, an opponent piece landing on a mine triggers stamina penalty
on the placer's side but not on the opponent's, drifting stats over
time and surfacing as `attacker_position_mismatch` later. Blocked at
`useKingChessAbility.enterPlacementMode` with a toast until
`chess_mine_placement` envelope ships (separate workstream — §10
OPEN-9).

**Receiver pipeline** (`useWireSync.ts` case `chess_command`): common
validations (schema, matchId, monotonic seq, commandId dedup, rate
limit, attacker lookup, position match, ownership boundary, currentTurn)
run once; then a branch on `command.type` dispatches to the move or
attack apply. Reject codes are verbose snake_case (e.g.
`non_instant_capture_not_supported_p2p`,
`remote_attempting_to_move_my_piece`, `attacker_not_found_*` with
roster dump diagnostic).

**Implementation locations**:
- Schema + predicate: `shared/p2p-wire/chess.ts`.
- Sender: `client/src/game/p2p/chessWireSender.ts` (`sendChessMove`,
  `sendChessAttack`, shared `dispatchChessCommand` helper).
- Receiver: `client/src/game/hooks/useWireSync.ts` case `chess_command`.
- Click handler gate: `client/src/game/components/chess/useChessBoardInteractions.ts`.
- Mine block: `client/src/game/hooks/useKingChessAbility.ts`
  `enterPlacementMode`.

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

### Poker Phase — Host-Authoritative (transitional, OPEN-4)

Pattern: similar to cards. Client sends `poker_action`; host validates
the player turn and calls `pokerState.performAction`.

Implementation: `useWireSync.ts:879-910`. The client does NOT apply
locally; the host's resulting state is reflected via the next
`gameState` sync.

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
2. `gameState` carries `stateHash` for tamper detection (cards path).
3. `seed_reveal.hiveUsername` is the only place identity is announced;
   `deck_verify` cross-verifies NFT ownership against Hive chain.
4. `result_propose.proposalId` correlates the proposal with its
   countersignature (prevents pairing two simultaneous proposals).
5. Ranked matches require dual-sig — no single-sig fallback broadcast.

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

**Authority rule** (CRITICAL): the **HOST's transcript is the only one that
goes on-chain**. The client builds its own local transcript (for QA export
via `exportSessionLog`), but `BlockchainSubscriber.attemptDualSig` is
host-only (`BlockchainSubscriber.ts:319`). The client signs the host's
result hash without comparing transcript roots
(`useWireSync.ts:1046`). See §10 OPEN-1.

**Arbitration surface** (off-wire, post-match):
- Server-side arbitrator (NOT yet implemented as a service — see
  HivePoA design) consumes the on-chain `match_result.tr` (transcript
  root) and `match_result.tc` (transcript IPFS CID).
- A player can submit a dispute via `submitSlashEvidence` (already wired
  for `forged_move`, `fake_disconnect`, `double_result` — see
  `useWireSync.ts:309-317, 397-405, 1024-1031`).
- The arbitrator fetches the IPFS bundle, verifies the merkle root,
  walks the move list, and resolves the dispute.

---

## §8 Match-Result Broadcast (On-Chain)

Once dual-sig completes, `BlockchainSubscriber.enqueueResult`
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
  ch?: contentHash,            // sha256(canonical({m,w,l,n,s,v,c}))
  sig?: { b, c },              // broadcaster + counterparty Hive sigs
  tr?: transcriptMerkleRoot,
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
| State hash mismatch (cards) | `hash_check` from host | Toast + `submitSlashEvidence({ reason: 'forged_move' })` |
| Mid-match disconnect | WS close handler | If `gamePhase !== 'game_over'`: `submitSlashEvidence({ reason: 'fake_disconnect' })` |
| Duplicate match_result on-chain | Found via `findExistingMatchResult` | `submitSlashEvidence({ reason: 'double_result' })` |
| Dual-sig timeout / rejection | 30s timer in `attemptDualSig` | Result NOT broadcast; both players may submit slash evidence |
| Chess piece-not-found mid-move | Receive handler `piece_not_found_*` | `recordSessionEvent('chess_command_rejected', { cause })`; freeze (no auto-recovery — see §10 OPEN-3) |

Slash evidence is submitted via `submitSlashEvidence`
(`client/src/data/blockchain/slashEvidence.ts`) which broadcasts another
custom_json. The server-side processor is part of HivePoA (separate spec).

---

## §10 Open Questions and Unresolved Decisions

These are decisions that are **not** stable and which beta-blocking work
should NOT depend on without first re-grilling and updating this spec.

### OPEN-1 — Client signs host's merkle root without verification

**Where**: `useWireSync.ts:1046` — the client signs `data.hash` (which
includes the host's `transcriptRoot`) without comparing against its own
local transcript root.

**Risk**: a malicious host could omit moves from the transcript before
broadcasting; the client's signature certifies "I agree on the winner",
not "I agree on the move list". An honest server arbitrator would have
no way to detect the omission from the signed payload alone (only via a
dispute that surfaces the missing moves).

**Decision needed**: should the client validate the host's transcript root
against its local one before countersigning? If so, what to do when they
diverge (auto-reject? ask the user? request resync?).

**Dependency**: OPEN-1 cannot be safely closed while OPEN-2 is open.
Verifying transcript roots between peers requires deterministic ordering;
without it, honest peers would falsely reject each other due to socket
scheduling races. The two must be designed together.

### OPEN-2 — Transcript order is not deterministic between peers

**Where**: `recordMove` is called inline at send time on the local peer
and at receive time on the remote peer. Local-and-remote interleaving is
race-dependent — peer A may record `[A1, B1]` while peer B records
`[A1, B1]` OR `[B1, A1]` depending on socket scheduling.

**Risk**: the host's transcript (the one that goes on-chain) is internally
consistent — the host sees its own moves and remote moves in arrival
order. The client's local transcript (QA export) may differ. Today this
is masked by §10 OPEN-1, but if we ever validate roots cross-peer, this
breaks.

**Decision needed**: order transcript by `(timestamp, commandId)` before
hashing? Use a deterministic counter from the wire envelope (the
`envelope.seq`)? Drop the local transcript entirely on the client and
only host's counts?

### OPEN-3 — Chess non-instant captures + state recovery

**Where**: `useChessBoardInteractions.ts` blocks non-instant captures
(queen vs rook etc.) with a toast. The chess→poker phase is not wired
symmetrically: poker init uses `uuidv4()` for combat IDs (non-deterministic
across peers), `Math.random()` for wager bonuses, and viewer-relative
`pokerSlotsSwapped`. Adapting it for P2P requires a separate workstream
similar in scope to chess Plan B applied to the poker phase.

Additionally: when chess_command is rejected mid-match with
`attacker_not_found` / `defender_not_found` (post C-Chess.8 these are
rarer but possible under residual bugs), no state recovery is attempted.
The roster dump diagnostic helps debug from logs but the match
effectively freezes.

**Decision needed (poker sync)**: design and implement
`chess_combat_initiated` + symmetric poker phase wire envelopes, OR
keep poker host-auth and design the cross-peer init handoff. Multi-step
refactor; needs grilling.

**Decision needed (state recovery)**: implement snapshot request
between peers when divergence is detected, OR keep current
"freeze + console diagnostic" semantics for beta and rely on the fact
that the typical divergence sources (AI gate, mines, captures) are now
each individually blocked or guarded.

### OPEN-4 — Poker phase is host-only — should it migrate to symmetric?

**Where**: `useWireSync.ts:879-910` — only the host validates and applies
poker actions. The client never executes locally; it waits for the host's
`gameState` sync.

**Risk**: same impedance mismatch that plagued chess pre-Plan-B. If poker
has any client-driven UI state that depends on having applied locally,
animations and selection may lag visibly.

**Decision needed**: leave host-auth (poker phases are short, lag is
tolerable), or migrate to symmetric (consistency with chess Plan B)?

### OPEN-5 — Disconnect / reconnect mid-match

**Where**: `useWireSync.ts:284-325` — the `close` handler shows a
disconnect toast and submits `fake_disconnect` slash evidence, but does
NOT attempt reconnection or state recovery. The transcript is cleared
on next mount.

**Decision needed**: implement reconnection with state recovery (snapshot
from peer? from host's last gameState sync?), or keep the current
"disconnect = forfeit" semantics? If reconnection lands, how is the
transcript merged across the gap?

### OPEN-6 — `result_propose` matchType field source-of-truth

**Where**: `BlockchainSubscriber.ts:298-301` gates broadcast on
`finalResult.matchType === 'ranked'`. But `matchType` is set client-side
when the result is packaged — the wire never tells the host whether the
match was ranked, casual, or tournament. Today this is implicit (the
matchmaking endpoint that originated the match knows).

**Decision needed**: should `matchType` ride the `init` envelope as
authoritative? Or is it OK to derive client-side from local context?

### OPEN-8 — Audit gameState wire and migrate to recovery-on-mismatch

**Where**: today the host sends full `gameState` snapshots (~10KB)
debounced post-command (host→client) regardless of whether the client
needs it. `hash_check` exists but only triggers `slash_evidence`, not
state recovery.

**Decision needed**: refactor so `gameState` flows ONLY when a
`hash_mismatch` is observed by the receiver — i.e., the wire becomes
push-on-recovery instead of push-on-every-action. This requires
migrating cards from host-auth-broadcast to symmetric-replay-with-
recovery (similar to chess Plan B applied to cards). Multi-step
workstream (~500+ LoC). Tracked in the project task queue.

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
| **dual-sig** | Both peers sign the same `result.hash` before on-chain broadcast. |
| **envelope** | A wire frame — `chess_command`, `game_command`, `result_propose`, etc. |
| **guest sentinel** | The `'guest:' + peerId.slice(0, 8)` playerId used when no Hive username is bound. Indicates a non-arbitrable move. |
| **host** | The peer that arrived first at the relay. Authoritative for cards/poker; tied for chess. NOT a server. |
| **instant-kill** | Chess capture that resolves without entering the poker phase. Triggered when attacker is `pawn`/`king` (Valkyrie weapon) OR defender is `pawn`. Predicate `isChessAttackInstantKill` in `shared/p2p-wire/chess.ts`. |
| **isHost** | The transport-level hint emitted by the relay's `__sys.open`. |
| **matchId** | `SHA256(matchSeed + sortedPeerIds)`, 16 hex chars. Binds every action to one match. |
| **matchSeed** | `SHA256(sortedSalts)`, derived in seed_reveal. The root of all per-match randomness. |
| **myCanonicalSide** | The local viewer's canonical side, derived from `matchSeed` parity XOR `isHost`. |
| **prevStateHash** | Pre-apply state hash carried in the cards envelope; protects against fast-double-click race. |
| **proposalId** | UUID correlating a `result_propose` with its `result_countersign`. |
| **transcript** | The ordered list of `GameMove` records hashed at match end into a Merkle tree. |
