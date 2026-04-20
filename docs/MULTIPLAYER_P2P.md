# P2P Multiplayer Implementation

## Overview

The game now supports **fully client-side peer-to-peer (P2P) multiplayer** using WebRTC via PeerJS. No game server is required during play—players connect directly to each other.

## Architecture

### Components

1. **`peerStore.ts`** - Zustand store managing PeerJS connections
   - Handles host/join logic
   - Manages connection state
   - Uses PeerJS public broker (`0.peerjs.com`) for signaling

2. **`useP2PSync.ts`** - Hook that syncs game actions over P2P
   - Host executes actions locally and syncs state
   - Client sends actions to host, receives state updates
   - Handles message routing and state synchronization

3. **`MultiplayerLobby.tsx`** - UI for hosting/joining games
   - Host: Creates game, shares ID
   - Join: Enter friend's ID to connect

4. **`MultiplayerGame.tsx`** - Wrapper component
   - Shows lobby when disconnected
   - Shows game when connected
   - Provides P2P context to game components

5. **`P2PContext.tsx`** - React context providing P2P-wrapped actions
   - Components can use `useP2PActions()` to get P2P-aware actions
   - Falls back to local actions when not connected

## How It Works

### Host Flow
1. Player clicks "Host Game"
2. PeerJS creates peer connection via public broker
3. Player gets a unique ID (e.g., `"ODIN-7742"`)
4. Player shares ID with opponent (chat, DM, etc.)
5. When opponent joins, connection established
6. Host executes all game actions locally
7. Host syncs game state to client every 500ms

### Client Flow
1. Player enters host's game ID
2. PeerJS connects to host via broker
3. Connection established
4. Client sends action messages (playCard, attack, endTurn)
5. Host executes actions and syncs state back
6. Client receives state updates and renders

### Message Types

```typescript
type P2PMessage =
  | { type: 'init'; gameState: GameState; isHost: boolean }
  | { type: 'playCard'; cardId: string; targetId?: string; targetType?: 'minion' | 'hero' }
  | { type: 'attack'; attackerId: string; defenderId: string }
  | { type: 'endTurn' }
  | { type: 'useHeroPower'; targetId?: string }
  | { type: 'gameState'; gameState: GameState }
  | { type: 'ping' }
  | { type: 'pong' };
```

## Usage

### For Players

#### Quick Match (Automatic)
1. Navigate to `/multiplayer` route
2. Click **"Quick Match"**
3. System automatically finds an opponent (first-come, first-served)
4. Once matched, connection established automatically
5. Game starts immediately

#### Manual Match (Friend vs Friend)
1. Navigate to `/multiplayer` route
2. **Host**: Click "Host Game" → Copy ID → Share with friend
3. **Join**: Enter friend's ID → Click "Join Game"
4. Once connected, game starts automatically

### For Developers

The P2P system integrates transparently with existing game code:

- Game components continue using `useGameStore()` as before
- P2P sync happens automatically when connected
- No changes needed to existing game logic

To use P2P-aware actions in a component:

```tsx
import { useP2PActions } from '../context/P2PContext';

function MyComponent() {
  const { playCard, attackWithCard, isConnected, isHost } = useP2PActions();
  
  // Actions automatically route through P2P when connected
  playCard(cardId, targetId);
}
```

## Technical Details

### Signaling
- Uses PeerJS public broker (`0.peerjs.com:443`)
- No custom server needed for signaling
- Broker only used for initial connection setup
- All game traffic is direct P2P (WebRTC data channels)

### State Synchronization
- Host is authoritative (executes all actions)
- State synced every 500ms from host to client
- Client actions sent immediately to host
- Host executes and syncs back

### Error Handling
- Connection errors shown in UI
- Automatic reconnection attempts
- Disconnect handling with cleanup

## Limitations & Future Improvements

### Matchmaking System
- **Quick Match**: Automatic first-come-first-served queue
- Players join queue → System pairs first 2 players
- Matchmaking API endpoint: `/api/matchmaking/queue`
- No database required (in-memory queue)
- Polls every 2 seconds for match status

### Distance & Quality

**Does distance affect quality?**

**Short answer**: Minimal impact for turn-based games.

**Details**:
- **Latency**: WebRTC typically adds 50-200ms latency depending on distance
  - Same country: ~50-100ms
  - Cross-continent: ~150-300ms
  - For turn-based card games, this is negligible (players don't notice)
- **Connection Quality**: More affected by:
  - **Network conditions** (WiFi vs wired, bandwidth)
  - **NAT/Firewall complexity** (affects initial connection)
  - **ISP routing** (not pure distance)
- **WebRTC Features**:
  - Uses STUN servers for NAT traversal (works for most cases)
  - Falls back to TURN servers if direct connection fails
  - Automatically selects best path (not always shortest distance)
- **For Your Game**: 
  - Turn-based = latency doesn't matter much
  - Small JSON payloads (~1KB per action) = bandwidth not an issue
  - WebRTC handles quality automatically

**Bottom line**: Distance has minimal impact. Network quality and NAT setup matter more, but WebRTC handles this automatically.

### Current Limitations
- Host must be online for entire game
- No reconnection handling (disconnect = game over)
- Matchmaking uses in-memory queue (resets on server restart)
- Single game per connection (no rooms/lobbies)

### Future Enhancements
- Reconnection logic with state recovery
- Persistent matchmaking queue (Redis/database)
- Skill-based matchmaking (ELO/MMR)
- Regional matchmaking (prefer closer players)
- Multiple concurrent games
- Spectator mode
- Game replays/logs

## Files Created

```
client/src/game/
├── stores/
│   ├── peerStore.ts                    # P2P connection management
│   └── matchmakingStore.ts             # Matchmaking queue state
├── hooks/
│   ├── useP2PSync.ts                   # Game action synchronization
│   └── useMatchmaking.ts               # Matchmaking queue management
├── components/multiplayer/
│   ├── MultiplayerLobby.tsx            # Host/Join/Quick Match UI
│   └── MultiplayerGame.tsx             # Game wrapper
└── context/
    └── P2PContext.tsx                   # P2P action provider

server/routes/
└── matchmakingRoutes.ts                # Matchmaking API (first-come-first-served)
```

## Dependencies

- `peerjs` (already in package.json)
- Uses existing Zustand stores
- No additional dependencies required

## Testing

1. Open two browser windows/tabs
2. Navigate both to `/multiplayer`
3. Host game in one window
4. Copy ID and join in second window
5. Play game and verify actions sync correctly

---

**Note**: This implementation uses PeerJS's free public broker. For production, consider self-hosting a PeerJS server for better reliability and privacy.
