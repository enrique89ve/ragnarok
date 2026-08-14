# P2P Ticket Security Validation

This checklist closes the focused P2P relay-ticket hardening scope:

- `P2PMatchTicket` is a per-peer bearer credential for the WebSocket relay.
- Browser relay upgrades validate `Origin`.
- Relay credentials travel through WebSocket subprotocols, not URLs, app-wire messages, or logs.
- Client stores that hold relay tickets or queue tokens are memory-only and are not published through `globalThis`.
- Poker P2P uses an explicit adapter seam instead of `globalThis` combat-store access.

## Focused evidence

Detect the active package manager from the repo lockfile before running scripts.
The recommended runner is:

```bash
bash scripts/p2p-ticket-security-check.sh
```

If this checkout uses `package-lock.json`, the expanded command is:

```bash
pnpm test -- \
  shared/p2pAvailability.securityBoundary.test.ts \
  server/services/p2pMatchTicketSigner.securityBoundary.test.ts \
  server/services/p2pRelayOrigin.securityBoundary.test.ts \
  server/services/p2pRelayProtocol.securityBoundary.test.ts \
  server/routes/p2pRelay.securityBoundary.test.ts \
  server/routes/p2pRelay.loggingBoundary.test.ts \
  server/routes/matchmakingRoutes.ticketBoundary.test.ts \
  server/routes/socialRoutes.ticketBoundary.test.ts \
  client/src/game/p2p/messageSchemas.test.ts \
  client/src/game/stores/wsTransport.securityBoundary.test.ts \
  client/src/game/stores/wsTransport.loggingBoundary.test.ts \
  client/src/game/p2p/sessionAuthChallenge.securityBoundary.test.ts \
  client/src/game/match/modes/p2p/wireSync/pokerP2PCombatAdapter.securityBoundary.test.ts \
  client/src/game/match/modes/p2p/wireSync/useWireSync.globalBoundary.test.ts
```

## Expected invariants

- `P2PMatchTicket` tokens are subprotocol-safe, length-capped, signed, expiring, and bound to one `roomId` plus one `peerId`.
- Production ticket signing fails closed unless `P2P_CHALLENGE_SIGNING_SECRET`
  is configured with enough entropy for HMAC signing.
- `/ws/p2p` rejects production upgrades without allowed `Origin`.
- `X-Forwarded-Host` is ignored unless explicitly trusted.
- Clients always request `ragnarok-p2p-v1`.
- Ticket-bearing subprotocols do not replace the public relay protocol.
- Ticket tokens do not appear in WebSocket URLs or relay query params.
- Ticket tokens do not appear in transport or relay logs.
- Ticket-bearing client state is cleared when the authenticated Hive Keychain session changes or disappears.
- `/api/matchmaking/leave` invalidates both queued entries and already-created active matches when the peer presents its own queue token.
- Social challenge and matchmaking responses return only the caller's own ticket.
- `session_authorize` strips relay tickets before signing/sending.
- `pokerP2PCombatAdapter` and `useWireSync` do not reach the combat store through `globalThis`.

## Non-goals

- This checklist does not prove full two-browser P2P gameplay.
- This checklist does not enable ranked P2P RUNE, ELO, or Season Score.
- This checklist does not authorize `match_anchor`, `match_result` or any
  match-driven Keychain prompt.
- Winner arbitration is future settlement work; the real two-browser
  gameplay-only smoke remains a separate current gate.
