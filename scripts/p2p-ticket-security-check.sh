#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

TEST_FILES=(
  "shared/p2pAvailability.securityBoundary.test.ts"
  "shared/p2pMatchmakingAuth.test.ts"
  "shared/starterClaimAuth.test.ts"
  "server/services/p2pMatchTicketSigner.securityBoundary.test.ts"
  "server/services/p2pRelayOrigin.securityBoundary.test.ts"
  "server/services/p2pRelayProtocol.securityBoundary.test.ts"
  "server/routes/p2pRelay.securityBoundary.test.ts"
  "server/routes/p2pRelay.loggingBoundary.test.ts"
  "server/routes/matchmakingRelay.integration.test.ts"
  "server/routes/matchmakingRoutes.ticketBoundary.test.ts"
  "server/routes/starterClaimRoutes.test.ts"
  "server/routes/socialRoutes.starterGate.test.ts"
  "server/routes/socialRoutes.ticketBoundary.test.ts"
  "client/src/game/auth/protectedFlowAccess.test.ts"
  "client/src/game/data/starterClaim.test.ts"
  "client/src/game/hooks/useMatchmaking.test.ts"
  "client/src/game/components/multiplayer/MultiplayerLobby.test.ts"
  "client/src/game/components/social/FriendsPanel.test.ts"
  "client/src/game/components/social/SocialPresenceHeartbeat.test.ts"
  "client/src/game/p2p/messageSchemas.test.ts"
  "client/src/game/stores/wsTransport.securityBoundary.test.ts"
  "client/src/game/stores/wsTransport.loggingBoundary.test.ts"
  "client/src/game/stores/peerStore.test.ts"
  "client/src/game/p2p/sessionAuthChallenge.securityBoundary.test.ts"
  "client/src/game/match/modes/p2p/wireSync/pokerP2PCombatAdapter.securityBoundary.test.ts"
  "client/src/game/match/modes/p2p/wireSync/useWireSync.globalBoundary.test.ts"
)

if [[ -f pnpm-lock.yaml ]]; then
  exec pnpm exec vitest run "${TEST_FILES[@]}"
fi

if [[ -f bun.lockb ]]; then
  exec bun test "${TEST_FILES[@]}"
fi

if [[ -f yarn.lock ]]; then
  exec yarn test "${TEST_FILES[@]}"
fi

if [[ -f package-lock.json ]]; then
  exec pnpm test -- "${TEST_FILES[@]}"
fi

cat >&2 <<'EOF'
Could not detect package manager lockfile.

Expected one of:
- pnpm-lock.yaml
- bun.lockb
- yarn.lock
- package-lock.json

Run the focused P2P ticket security tests with this repo's active test command.
EOF
exit 1
