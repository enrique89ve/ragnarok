# Game Utils Module

This directory contains modular game utility functions extracted from `gameUtils.ts` (2576 lines).

## Migration Status

| Category | File | Functions | Status |
|----------|------|-----------|--------|
| Types/Adapters | `types.ts` | Type adapters, PlayerId utilities | ✅ Complete |
| Initialization | `initialization.ts` | `initializeGame` | 🔜 Planned |
| Card Play | `cardPlay.ts` | `playCard` | 🔜 Planned |
| Card Draw | `cardDraw.ts` | `drawCard` | 🔜 Planned |
| Turn Management | `turnManagement.ts` | `endTurn` | 🔜 Planned |
| Combat | `combat.ts` | `processAttack` | 🔜 Planned |
| AI Targeting | `aiTargeting.ts` | `findOptimalAttackTargets`, `autoAttackWithCard`, etc. | 🔜 Planned |
| Damage | `damage.ts` | `applyDamage` | 🔜 Planned |

## Function Inventory

### initializeGame (Lines 57-185, ~128 lines)
- Creates initial game state
- Sets up player/opponent decks and heroes
- Dependencies: createStartingDeck, createClassDeck, drawCards, getDefaultHeroPower

### drawCard (Lines 186-267, ~81 lines)
- Handles card draw with fatigue
- Dependencies: drawCardFromDeck, logCardDraw

### playCard (Lines 268-741, ~473 lines)
- **LARGEST FUNCTION** - Handles all card play logic
- Minion placement, spell casting, weapon equipping
- Dependencies: Many (battlecry, spells, secrets, weapons, combos, etc.)

### endTurn (Lines 742-1929, ~1187 lines)
- **SECOND LARGEST** - Turn ending and AI turn logic
- Dependencies: Many (turn effects, status effects, AI logic)

### processAttack (Lines 1930-2188, ~258 lines)
- Combat resolution between minions/heroes
- Dependencies: damage utils, attack effects, divine shield, etc.

### findOptimalAttackTargets (Lines 2189-2372, ~183 lines)
- AI targeting logic
- Dependencies: status effect utils, minion evaluation

### autoAttackWithCard (Lines 2373-2412, ~39 lines)
- Auto-attack single card
- Dependencies: findOptimalAttackTargets, processAttack

### autoAttackOnPlace (Lines 2413-2490, ~77 lines)
- Auto-attack when minion placed
- Dependencies: rush utils, processAttack

### applyDamage (Lines 2491-2542, ~51 lines)
- Apply damage to target
- Dependencies: damage calculation

### autoAttackWithAllCards (Lines 2543-2576, ~33 lines)
- Batch auto-attack
- Dependencies: autoAttackWithCard

## Type Compatibility

The `types.ts` file provides adapters for bridging:
- Legacy types (`types.ts`): `CardData.id: string | number`
- Effect system types (`types/CardTypes.ts`): `Card.id: number`

Use `adaptCardInstanceForEffects()` when calling EffectRegistry handlers.
Use `adaptEffectCardInstanceToLegacy()` when returning to legacy code.
