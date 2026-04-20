# Ragnarok Poker - Element Weakness System

## Overview

The Element Weakness System adds a strategic layer to chess combat by giving pieces elemental types. When a piece attacks an opponent whose element they are **strong against**, that piece gains a combat buff.

## Element Types

### Core Elements (Cycle)
The four core elements follow a circular weakness pattern:

```
Fire → Earth → Wind → Water → Fire
```

| Element | Strong Against | Weak To |
|---------|---------------|---------|
| Fire    | Earth         | Water   |
| Water   | Fire          | Wind    |
| Wind    | Water         | Earth   |
| Earth   | Wind          | Fire    |

### Special Elements

| Element | Strong Against | Weak To     |
|---------|---------------|-------------|
| Holy    | Shadow        | Shadow      |
| Shadow  | Holy          | Holy        |
| Neutral | -             | -           |

## Combat Buff System

When a chess piece fights an opponent they are **strong against**, they receive:

- **+2 Attack** (added to base attack stat)
- **+2 Health** (added to current HP for that combat)
- **+20 Hero Armor** (absorbs damage before HP)

### Armor Mechanics

Armor is a damage buffer:
- Armor absorbs damage BEFORE HP is reduced
- Armor is consumed as it absorbs damage
- **Armor applies to**: losing poker hands, fold penalties, ability damage
- **Armor does NOT affect betting** (HP is still deducted when committing to pot)
- Displayed with a shield icon next to health in poker combat UI
- **Armor is combat-scoped**: Armor from elemental advantage is granted at the START of each combat and persists within that combat. It does NOT carry over between separate combat encounters.

### Important Notes

1. **Poker Unaffected**: The poker hand evaluation is NOT affected by elements. Only the chess piece's base stats and armor receive the buff.

2. **Buff Duration**: The buff applies only during that specific combat encounter. After combat resolves, stats return to normal. Armor is granted per-combat and does not persist between separate combat encounters.

3. **When Buff Applies**: 
   - The ATTACKER gets the buff if they are strong vs the defender
   - The DEFENDER also gets the buff if they are strong vs the attacker
   - Both pieces can potentially get buffs if they counter each other (impossible with the cycle, but possible with special elements)

4. **Stamina Unaffected**: The +2 HP buff does not convert to stamina. It's a temporary combat bonus.

## Element Assignments

### By Chess Piece Type

| Piece  | Player Element | Opponent Element |
|--------|---------------|------------------|
| King   | Holy          | Shadow           |
| Queen  | Fire          | Water            |
| Rook   | Earth         | Wind             |
| Bishop | Wind          | Earth            |
| Knight | Water         | Fire             |
| Pawn   | Neutral       | Neutral          |

This creates asymmetric matchups where:
- Player Queen (Fire) is strong vs Opponent Bishop (Earth) → Fire beats Earth (+2/+2)
- Opponent Queen (Water) is strong vs Player Queen (Fire) → Water beats Fire (+2/+2)
- Player Rook (Earth) is strong vs Opponent Rook (Wind) → Earth beats Wind (+2/+2)
- Player Knight (Water) is strong vs Opponent Knight (Fire) → Water beats Fire (+2/+2)
- Player King (Holy) is strong vs Opponent King (Shadow) → Holy beats Shadow (+2/+2)
- No advantage when elements don't match the weakness cycle

## Visual Indicators

Elements are displayed on chess pieces with colored borders/icons:

- **Fire**: Orange/Red glow
- **Water**: Blue glow  
- **Wind**: Green glow
- **Earth**: Brown glow
- **Holy**: Gold glow
- **Shadow**: Purple glow
- **Neutral**: Gray (no glow)

## Strategic Implications

1. **Piece Selection**: Choose which piece to move into combat based on elemental advantage
2. **Defense**: Avoid letting enemy pieces with advantage attack your weak pieces
3. **Trading**: An element-advantaged piece with low HP can still win against a healthy piece due to the +2/+2 buff
4. **King Safety**: Holy Kings are naturally strong vs Shadow opponents but weak to Shadow attacks

## Implementation Details

The element system is implemented in:
- `client/src/game/types/ChessTypes.ts` - Element type definitions, ELEMENT_STRENGTHS, PIECE_ELEMENTS assignments
- `client/src/game/types/PokerCombatTypes.ts` - PlayerCombatState includes heroArmor property
- `client/src/game/stores/ChessBoardStore.ts` - Assigns element to pieces on creation and pawn promotion
- `client/src/game/combat/PokerCombatStore.ts` - applyElementalPetBuffs() applies +2/+2 stat buff and +20 armor at combat initialization, applyDamageWithArmor() handles armor absorption
