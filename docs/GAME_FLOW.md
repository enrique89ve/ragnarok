# Ragnarok Combat Arena - Game Flow Documentation

This document details the complete game flow, state management, and system interactions.

## Game Flow Diagram

```
┌─────────────┐
│  Main Menu  │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│  Mode Selection  │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌──────────┐  ┌────────────────┐
│ Ragnarok │  │ Standard Match │
│  Chess   │  └───────┬────────┘
└────┬─────┘          │
     │                ▼
     ▼         ┌──────────────┐
┌──────────┐   │Hero Selection│
│  Army    │   └──────┬───────┘
│Selection │          │
└────┬─────┘          ▼
     │         ┌──────────────┐
     ▼         │Deck Building │
┌──────────┐   └──────┬───────┘
│  Chess   │          │
│  Board   │          ▼
└────┬─────┘   ┌──────────────┐
     │         │Combat Arena  │
┌────┴────┐    └──────┬───────┘
│         │           │
▼         ▼           ▼
Attack  Winner ┌──────────────┐
 │             │Mulligan Phase│
 ▼             └──────┬───────┘
┌──────────┐          │
│  Poker   │          ▼
│ Combat   │   ┌──────────────┐
└────┬─────┘   │  Turn Loop   │◄────┐
     │         └──────┬───────┘     │
     ▼                │             │
Hero Death            ▼             │
     │         ┌──────────────┐     │
     ▼         │Victory/Defeat│─────┘
┌──────────┐   └──────────────┘   (if not)
│  Chess   │
│ Victory  │
└──────────┘
```

---

## Core State Management

### State Stores

| Store | File | Purpose |
|-------|------|---------|
| **gameStore** | `gameStore.ts` | Card game state, turns, attacks |
| **PokerCombatStore** | `PokerCombatStore.ts` | Poker phases, betting, resolution |
| **ChessBoardStore** | `ChessBoardStore.ts` | Chess positions, moves, collisions |
| **heroDeckStore** | `heroDeckStore.ts` | User-built decks per hero (NFT ownership enforcement in Hive mode) |
| **animationStore** | `animationStore.ts` | Animation state orchestration |
| **sharedDeckStore** | `sharedDeckStore.ts` | Shared deck for Ragnarok Chess |
| **activityLogStore** | `activityLogStore.ts` | Event logging/history |
| **HiveDataStore** | `HiveDataLayer.ts` | NFT collection, stats, tokens (chain-derived) |
| **campaignStore** | `campaignStore.ts` | Campaign progress + chain reward claims |
| **dailyQuestStore** | `dailyQuestStore.ts` | Daily quest progress + chain reward claims |
| **tradeStore** | `tradeStore.ts` | Trade offers + chain transfers on accept |
| **craftingStore** | `craftingStore.ts` | Eitr balance (forge/dissolve) |
| **settingsStore** | `settingsStore.ts` | Audio, visual, gameplay preferences |
| **starterStore** | `starterStore.ts` | New player starter pack claim tracking |

### Current Implementation Notes
	
- **Home shell**: `App.tsx` is the current funnel entry. Daily quests, friends, wallet, primary mode cards, and utility links all mount there, so browser QA should validate that the primary "continue playing" action stays dominant on both desktop and mobile.
- **Starter handoff**: `StarterPackCeremony.tsx` now returns first-time players to `routes.campaign` after the reveal instead of dropping them back on the home shell. The intended first-run path is home → starter ceremony → campaign theater → mission briefing → army staging → battle.
- **Campaign navigation**: `CampaignPage.tsx` now stages the campaign as a chapter-theater funnel instead of a flat mission picker. Chapter prologues can autoplay from the campaign shell, Norse/Greek maps now sit over a live cosmic canvas, realm panels surface the next authored route, and the mission briefing is structured as a launch sequence rather than a loose settings card.
- **Army staging**: `ArmySelection.tsx` now reads as a launch surface instead of a raw picker: command, loadout, and launch states are surfaced explicitly, and the footer CTA language follows the same route that starts on the campaign shell.
- **Combat feel**: `RagnarokCombatArena.tsx` now uses a shared phase director for setup and wagering instead of separate loose cards. Disabled wagering controls are hidden when the opponent owns the decision window, so each phase exposes fewer active controls at once and the cadence reads more deliberately during live play.
- **Protocol-backed sync**: `shared/protocol-core/apply.ts` remains the deterministic replay path for both browser and server. Gameplay/UI changes that depend on rewards, packs, match results, or marketplace state should be validated against shared replay behavior rather than client-only assumptions.
- **Marketplace settlement**: Marketplace buy/accept replay now validates the actual payment sender, recipient, currency, and amount instead of trusting a loose transfer lookup. The current UI handoff still uses a manual payment transaction ID prompt until bundled wallet settlement is implemented.
- **Legacy pack endpoint**: `server/routes/packRoutes.ts` now requires a signed pack-open request, chooses cards deterministically per opening record, and stores pack history as richer card records rather than raw card IDs.

---

## Mode 1: Ragnarok Chess Flow

### 1. Army Selection

```typescript
interface ArmySelection {
  king: ChessPieceHero;    // Choose from 9 Kings
  queen: ChessPieceHero;   // Mage/Warlock/Necromancer
  rook: ChessPieceHero;    // Warrior/Paladin
  bishop: ChessPieceHero;  // Priest/Druid
  knight: ChessPieceHero;  // Rogue/Hunter
}
```

**UI Component**: `ArmySelection.tsx`

### 2. Chess Board Initialization

```typescript
// Board: 7 rows × 5 columns
const BOARD_ROWS = 7;
const BOARD_COLS = 5;

// Player positions (rows 0-1)
const PLAYER_INITIAL_POSITIONS = [
  { type: 'knight', col: 0, row: 0 },
  { type: 'queen', col: 1, row: 0 },
  { type: 'king', col: 2, row: 0 },
  { type: 'bishop', col: 3, row: 0 },
  { type: 'rook', col: 4, row: 0 },
  { type: 'pawn', col: 0, row: 1 },
  // ... 5 pawns total
];

// Opponent positions (rows 5-6) - mirrored
```

**UI Component**: `RagnarokChessGame.tsx`, `ChessBoard.tsx`

### 3. Piece Movement

```typescript
// Movement patterns
PIECE_MOVEMENT_PATTERNS = {
  queen: { type: 'line', directions: [all 8 directions] },
  king: { type: 'surround', maxDistance: 1 },
  rook: { type: 'line', directions: [horizontal, vertical] },
  bishop: { type: 'line', directions: [diagonal] },
  knight: { type: 'l_shape' },
  pawn: { type: 'point', direction: forward, maxDistance: 1 }
}
```

### 4. Collision Detection

When piece moves to occupied square:

```typescript
interface ChessCollision {
  attacker: ChessPiece;
  defender: ChessPiece;
  attackerPosition: ChessBoardPosition;
  defenderPosition: ChessBoardPosition;
  instantKill?: boolean;  // Pawn attacks or King attacks
}
```

**Instant Kill Conditions:**
- Pawn attacks any piece → Instant kill
- Any piece attacks King → Instant kill
- All other collisions → Poker Combat

### 5. Poker Combat Flow

```
┌────────────┐
│  Mulligan  │ ← Replace hole cards
└─────┬──────┘
      ▼
┌────────────┐
│ Spell/Pet  │ ← Cast spells, use abilities, stage board state
└─────┬──────┘
      ▼
┌────────────┐
│ First Blood│ ← Pre-flop wager opens
│ (Pre-Flop) │   Betting round
└─────┬──────┘
      ▼
┌────────────┐
│   Faith    │ ← 3 community cards (Flop)
│  (Flop)    │   Betting round
└─────┬──────┘
      ▼
┌────────────┐
│ Foresight  │ ← 4th card (Turn)
│  (Turn)    │   Betting round
└─────┬──────┘
      ▼
┌────────────┐
│  Destiny   │ ← 5th card (River)
│  (River)   │   Betting round
└─────┬──────┘
      ▼
┌────────────┐
│ Resolution │ ← Compare hands
│ (Showdown) │   Apply damage
└────────────┘
```

### 6. Hand Evaluation

```typescript
// Pure NLH — best hand wins the pot, no damage multipliers
enum PokerHandRank {
  HIGH_CARD = 1,           // High Card
  RUNE_MARK = 2,           // One Pair
  DUAL_RUNES = 3,          // Two Pair
  THORS_HAMMER = 4,        // Three of a Kind
  FATES_PATH = 5,          // Straight
  ODINS_EYE = 6,           // Flush
  VALHALLAS_BLESSING = 7,  // Full House
  GODLY_POWER = 8,         // Four of a Kind
  DIVINE_ALIGNMENT = 9,    // Straight Flush
  RAGNAROK = 10            // Royal Flush
}
// All HAND_DAMAGE_MULTIPLIERS are 1.0 — you lose only what you bet
```

### 7. Combat Resolution

```typescript
interface CombatResolution {
  winner: 'player' | 'opponent' | 'draw';
  resolutionType: 'fold' | 'showdown';
  playerHand: EvaluatedHand;
  opponentHand: EvaluatedHand;
  playerDamage: number;
  opponentDamage: number;
  playerFinalHealth: number;
  opponentFinalHealth: number;
  foldPenalty?: number;      // 3 HP if folded
  whoFolded?: 'player' | 'opponent';
}
```

### 8. Chess Victory

- Capture enemy King
- Eliminate all enemy pieces
- Enemy cannot make legal move (stalemate = draw)

---

## Mode 2: Standard Match Flow

### 1. Hero Selection

Choose from 77 heroes across 12 classes.

**UI Component**: `HeroDetailPopup.tsx`

### 2. Deck Building

```typescript
// Deck constraints
const DECK_SIZE = 30;
const MAX_COPIES = 2;           // Per card
const MAX_MYTHIC_COPIES = 1;    // Mythics only
const MAX_HAND_SIZE = 9;
const MAX_BOARD_SIZE = 7;
```

**UI Component**: `HeroDeckBuilder.tsx`

### 3. Mulligan Phase

- Draw initial hand (3 cards first, 4 cards second)
- Going second receives The Coin (0-cost, +1 mana)
- Replace unwanted cards

### 4. Turn Loop

```typescript
// Turn structure
interface TurnPhase {
  drawCard: boolean;           // Draw 1 card
  gainManaCrystal: boolean;    // +1 mana (max 10)
  refreshMana: boolean;        // Restore all mana
  unfreezeMinions: boolean;    // Thaw frozen minions
  mainPhase: boolean;          // Play cards, attack
  endOfTurn: boolean;          // Trigger effects
}
```

### 5. Combat System

```typescript
// Attack resolution
function resolveAttack(attacker: Minion, defender: Minion) {
  // Check for Stealth
  if (defender.hasKeyword('stealth')) {
    throw new Error('Cannot target stealthed minion');
  }
  
  // Check for Taunt
  if (boardHasTaunt() && !defender.hasKeyword('taunt')) {
    throw new Error('Must attack Taunt first');
  }
  
  // Deal damage
  defender.health -= attacker.attack;
  attacker.health -= defender.attack;
  
  // Lifesteal
  if (attacker.hasKeyword('lifesteal')) {
    healHero(attacker.owner, attacker.attack);
  }
  
  // Poisonous
  if (attacker.hasKeyword('poisonous') && defender.health > 0) {
    defender.health = 0;
  }
  
  // Divine Shield
  if (defender.hasKeyword('divine_shield')) {
    defender.health += attacker.attack; // Negate damage
    defender.removeKeyword('divine_shield');
  }
  
  // Check deaths
  if (defender.health <= 0) triggerDeathrattle(defender);
  if (attacker.health <= 0) triggerDeathrattle(attacker);
}
```

---

## Effect System

### Effect Handlers

```
client/src/game/effects/handlers/
├── battlecry/     # 96 handlers
├── deathrattle/   # 16 handlers
└── spellEffect/   # 70 handlers
```

### Battlecry Examples

```typescript
// Example battlecry types
type BattlecryType =
  | 'damage'           // Deal damage to target
  | 'heal'             // Heal target
  | 'buff'             // Give +Attack/+Health
  | 'summon'           // Summon minion(s)
  | 'draw'             // Draw card(s)
  | 'discover'         // Discover a card
  | 'silence'          // Silence a minion
  | 'freeze'           // Freeze target(s)
  | 'mind_control'     // Take control of minion
  | 'transform'        // Transform minion
  | 'conditional_full_heal'  // Reno effect
  | 'kazakus_potion';        // Kazakus effect
```

### Deathrattle Examples

```typescript
type DeathrattleType =
  | 'summon'            // Summon on death
  | 'draw'              // Draw on death
  | 'damage'            // Deal damage on death
  | 'heal'              // Heal on death
  | 'buff'              // Buff friendly minions
  | 'give_divine_shield'// Grant divine shield
  | 'mind_control';     // N'Zoth style effects
```

---

## Animation System

### Animation Orchestrator

```typescript
interface AnimationState {
  activeAnimations: Animation[];
  pendingEffects: Effect[];
  isBlocked: boolean;
}

// Animation types
type AnimationType =
  | 'card_play'
  | 'attack'
  | 'damage'
  | 'heal'
  | 'death'
  | 'summon'
  | 'spell_cast'
  | 'poker_card_reveal'
  | 'showdown';
```

### Animation Flow

1. Action triggers animation
2. AnimationOverlay renders visual
3. Animation completes
4. State updates
5. Next animation or unlock

---

## Treasury Governance Flow

### Overview

The treasury page (`/treasury`) provides a management interface for the Hive L1 multisig treasury. Only authenticated Hive users who are treasury signers (or vouched candidates) can perform actions.

### State Machine

```
┌──────────────┐
│  Not Logged  │ ← View-only: status, signers, balance
│    In        │
└──────┬───────┘
       │ Keychain Login
       ▼
┌──────────────┐     ┌────────────────┐
│   Eligible   │────►│  Join Request  │ (top-150 witness = direct join)
│   Visitor    │     │   (WoT Vouch)  │ (non-witness = need 3+ vouches)
└──────────────┘     └───────┬────────┘
                             │ Approved
                             ▼
                     ┌────────────────┐
                     │  Active Signer │
                     └───────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────────┐
        │  Sign    │  │  Freeze  │  │  Leave       │
        │  Pending │  │  (any    │  │  (7/30-day   │
        │  Tx      │  │  signer) │  │   cooldown)  │
        └──────────┘  └────┬─────┘  └──────────────┘
                           │
                           ▼
                     ┌──────────────┐
                     │   Frozen     │ (all ops blocked)
                     │  Unfreeze:   │
                     │  80% vote    │
                     └──────────────┘
```

### Data Flow

```
TreasuryPage.tsx
  ├── GET /api/treasury/status     (10s polling)
  ├── GET /api/treasury/signers    (10s polling)
  ├── GET /api/treasury/transactions
  ├── GET /api/treasury/pending-signing
  └── POST /api/treasury/...       (mutations via Keychain auth)
        │
        ▼
  treasuryRoutes.ts (auth middleware: X-Hive-Username + Signature)
        │
        ▼
  treasuryCoordinator.ts
        ├── treasuryHive.ts          (Hive L1 queries + broadcast)
        ├── treasuryAnomalyDetector.ts (burst/spike/rapid detection)
        └── shared/schema.ts         (Drizzle ORM: 5 treasury tables)
```

### Key Interactions

| Action | Endpoint | Quorum | Delay |
|--------|----------|--------|-------|
| Transfer ≤$1 | POST /submit-signature | 60% | None |
| Transfer >$1 | POST /submit-signature | 60% | 1 hour |
| Authority update | POST /submit-signature | 80% | 6 hours |
| Emergency freeze | POST /freeze | 1 signer | Instant |
| Unfreeze | POST /unfreeze | 80% | Instant |
| Veto pending tx | POST /transactions/:id/veto | 1 signer | During delay |

---

## New Player Starter Experience

### Flow

```
First Visit → HomePage
  │
  ▼ (starterStore.claimed === false)
"Claim Starter Deck" button shown
  │
  ▼ Click
StarterPackCeremony.tsx
  │
  ├── Phase 1: Welcome Screen
  │   "The Norns have foreseen your arrival"
  │   "Claim Your Birthright" button
  │
  ▼ Click
  ├── Phase 2: Pack Opening Animation
  │   45 class-matched base cards revealed (PackOpeningAnimation reuse)
  │   Cards added to HiveDataStore
  │   4 starter card pools saved to localStorage
  │   starterStore.markClaimed()
  │
  ▼ Animation complete
  ceremony closes → /campaign
  player lands on the campaign lead card / mission briefing path
```

### Starter Set

- 45 base cards: 10 Mage + 10 Warrior + 10 Priest + 10 Rogue + 5 neutral
- Each class set matched to default hero (Erik, Ragnar, Brynhild, Sigurd, Leif)
- Base cards are infinite supply (NOT NFTs, don't count toward 2.7M cap)
- Slightly below common power level with "value gem" cards for competitiveness
- Stored in `starterSet.ts` + `baseCards.ts`, tracked via `starterStore.ts`
- To play: only 1 King + 4 Heroes required. Cards are optional bonus firepower.

---

## Activity Logging

### Event Types

```typescript
type ActivityEventType =
  | 'spell_cast'
  | 'minion_played'
  | 'minion_summoned'
  | 'minion_attack'
  | 'minion_death'
  | 'hero_attack'
  | 'hero_damage'
  | 'hero_power'
  | 'card_draw'
  | 'card_burn'
  | 'battlecry'
  | 'deathrattle'
  | 'poker_bet'
  | 'poker_check'
  | 'poker_fold'
  | 'poker_phase'
  | 'poker_resolution'
  | 'heal'
  | 'buff'
  | 'secret_triggered'
  | 'weapon_equipped'
  | 'turn_start'
  | 'turn_end';
```

### Event Categories

- **Minion Events**: Card game actions
- **Poker Events**: Poker combat actions

---

## File Structure Reference

```
client/src/
├── core/                       # Pure game logic module
│   └── index.ts                # Re-exports for separation
├── game/
│   ├── components/             # UI Components
│   │   ├── chess/              # Chess board, pieces
│   │   ├── 3D/                 # 3D card effects
│   │   ├── packs/              # Pack opening
│   │   ├── treasury/           # Treasury multisig management
│   │   └── ui/                 # Tooltips, buttons
│   ├── stores/                 # Zustand state
│   ├── data/                   # Card/hero definitions
│   │   ├── allCards.ts         # 1,400+ cards
│   │   └── norseHeroes/        # 77 heroes
│   ├── combat/                 # Combat system
│   │   ├── RagnarokCombatArena.tsx
│   │   ├── PokerCombatStore.ts
│   │   └── styles/             # CSS architecture
│   ├── effects/                # Effect handlers
│   ├── types/                  # TypeScript types
│   └── utils/                  # Game utilities
└── pages/                      # Route pages
```

---

*This document is part of the Ragnarok Combat Arena open-source project.*
