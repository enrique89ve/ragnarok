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
game commands, choose winners, or decide when a battle is ready.

The current relay remains the baseline implementation:

```text
WebSocketRelayTransport → /ws/p2p
WebRTCTransport         → native DataChannel (implemented, opt-in only)
TransportManager        → initial selection/fallback owner (implemented)
```

Matchmaking remains HTTP/API-owned. The separate `/ws/control` endpoint is
authenticated with the Hive web session and a match ticket, and carries only
bounded signaling (`offer`, `answer`, `ICE`) plus transport lifecycle messages.
It never forwards gameplay frames. New tickets carry a deterministic
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
- STUN, Control WS signaling, and native WebRTC remain separate opt-in
  capabilities; the relay remains the default gameplay path until the build
  flag enables WebRTC and all BattleReady gates pass.
- No new Hive signature is introduced for transport setup or gameplay.
