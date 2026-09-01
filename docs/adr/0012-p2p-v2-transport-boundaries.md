# ADR 0012 — P2P v2 transport boundaries

**Status**: Accepted for incremental testnet implementation  
**Related**: [ADR 0007](./0007-p2p-gameplay-only-testnet.md), [ADR 0009](./0009-local-settlement-and-phase-profiles.md)

## Context

Ragnarok already has a working WebSocket relay at `/ws/p2p`. The first P2P v2
increment must preserve that known-good path while allowing native WebRTC to be
introduced incrementally. Transport selection must not become a second
gameplay or matchmaking authority.

## Decision

The client owns one transport boundary, `GameTransport`. Its implementations
deliver validated P2P messages and report lifecycle state; they do not apply
game commands, choose winners, or decide when a battle is ready. The client
resolves a pure capability/policy decision before opening a
transport, passes the resulting plan to `TransportManager`, and persists the
decision in a match-scoped session across reconnects. The manager executes the
plan and owns attempt lifecycle/fallback only.

The current relay remains the baseline implementation:

```text
WebSocketRelayTransport → /ws/p2p
WebRTCTransport         → native DataChannel (implemented, opt-in only)
TransportManager        → initial selection/fallback owner (implemented)
```

Matchmaking remains HTTP/API-owned. The separate `/ws/control` endpoint is
authenticated with the Hive web session and a match ticket. It carries bounded
signaling (`offer`, `answer`, `ICE`), transport lifecycle messages, and the
server-referee protocol for phase checkpoints and poker turn clocks. It never
forwards gameplay frames. New tickets carry a deterministic
`offerer`/`answerer` role; legacy ticket readers remain compatible, but Control
WS rejects tickets without a role.

The following invariants are normative:

```text
SEARCH ≠ SIGN
PAIRING ≠ MATCH
MATCH_COMMITTED ⇔ ACCEPT_A ∧ ACCEPT_B
P2P FAILURE ≠ AI
TRANSPORT_CONNECTED ≠ BATTLE_READY
GAME ENGINE ≠ TRANSPORT
SERVER ≠ GAME STATE AUTHORITY
```

`BATTLE_READY` remains a separate readiness computation. A connected socket or
DataChannel is necessary but never sufficient. The existing acceptance,
ticket, peer identity, seed, army, and initial-state gates stay in force.

## Consequences

- The relay remains usable after each migration step.
- `peerStore` keeps its compatibility event surface while the manager owns
  initial transport selection; `useWireSync` does not choose a transport.
- The policy resolves independent WebRTC and relay budgets. The manager owns
  each selected attempt's timeout and gives relay its full budget after a
  WebRTC failure; the store does not maintain a second connect timer.
- Public transport configuration is served from
  `GET /api/p2p/transport-config`. Server-only `P2P_*` values take precedence
  for active values, with bounded validation and relay-safe defaults.
  The response contains no tickets, SDP, or ICE credentials.
- Browser capabilities include an optional `navigator.connection.type` hint.
  Cellular selects the aggressive WebRTC budget. On shared networks, missing
  ICE servers selects relay-only; local development may still try host-only
  WebRTC candidates.
- A pre-connect WebRTC failure sends `transport_fallback_v1` once. A
  `transport_ready_v1` message is only an advertisement; the server commits a
  transport after both authenticated peers advertise the same kind. Before
  that bilateral commitment, a WebRTC/relay race is resolved by forcing the
  WebRTC member back to relay; the same authenticated room membership (or its
  exact-ticket replacement) may advertise relay again. After
  `transport_committed_v1`, transport switching is forbidden for that match
  session and a failure requires the normal authenticated reconnect.
- For a signed Quick Match, Control WS is part of the active transport
  contract: loss, errors, malformed frames, and `control_error_v1` fail the
  connection so reconnect restores both gameplay and referee channels. Direct
  legacy rooms without a signed role may continue using the relay-compatible
  referee path.
- `isHost` remains a gameplay perspective supplied by match/manual assignment;
  WebRTC `offerer`/`answerer` is never treated as gameplay authority.
- STUN, Control WS signaling, and native WebRTC remain separate opt-in
  capabilities; the relay remains the default gameplay path until the runtime
  policy enables WebRTC and all BattleReady gates pass.
- No new Hive signature is introduced for transport setup or gameplay.
