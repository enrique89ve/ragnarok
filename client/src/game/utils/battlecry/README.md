# Battlecry Utils Module

This directory contains modular battlecry utility functions extracted from `battlecryUtils.ts` (1799 lines).

## Migration Status

| Category | File | Functions | Status |
|----------|------|-----------|--------|
| Types | `types.ts` | BattlecryType, BattlecryTarget, etc. | ✅ Complete |
| Execution | `execution.ts` | `executeBattlecry` main switch | 🔜 Planned |
| Targeting | `targeting.ts` | `requiresBattlecryTarget`, `isValidBattlecryTarget` | 🔜 Planned |
| Damage | `damage.ts` | Damage battlecry handlers | 🔜 Planned |
| Heal | `heal.ts` | Heal battlecry handlers | 🔜 Planned |
| Buff | `buff.ts` | Buff/debuff battlecry handlers | 🔜 Planned |
| Summon | `summon.ts` | Summon battlecry handlers | 🔜 Planned |
| Discover | `discover.ts` | Discovery battlecry handlers | 🔜 Planned |
| Transform | `transform.ts` | Transform battlecry handlers | 🔜 Planned |
| Highlander | `highlander.ts` | Reno, Kazakus, etc. handlers | 🔜 Planned |

## Function Inventory

### executeBattlecry (Lines 211-1216, ~1000 lines)
- **LARGEST FUNCTION** - Main battlecry execution with switch on effect type
- Handles 25+ battlecry effect types
- Dependencies: findCardInstance, createCardInstance, dealDamage, drawCards, etc.

### requiresBattlecryTarget (Lines 1217-1712, ~495 lines)
- Determines if a battlecry needs a target
- Returns boolean based on effect type
- Dependencies: None (pure function)

### isValidBattlecryTarget (Lines 1713-1799, ~86 lines)
- Validates if a given target is valid for the battlecry
- Dependencies: None (pure function)

## Battlecry Effect Types (25+)

| Type | Description |
|------|-------------|
| `damage` | Deal damage to target |
| `heal` | Restore health to target |
| `buff` | Give +attack/+health |
| `debuff` | Reduce attack/health |
| `summon` | Summon minion(s) |
| `draw` | Draw card(s) |
| `discover` | Discover card from pool |
| `discover_triclass` | Discover from 3 classes |
| `silence` | Remove text from minion |
| `freeze` | Freeze target |
| `destroy` | Destroy target |
| `transform` | Transform target |
| `copy` | Copy card to hand/board |
| `return` | Return minion to hand |
| `steal` | Take control of minion |
| `mind_control` | Permanent steal |
| `equip_weapon` | Equip a weapon |
| `give_keyword` | Give keyword (taunt, divine shield, etc.) |
| `conditional` | Conditional effect (if X, do Y) |
| `highlander` | No-duplicate deck effects |
| `adaptive` | Choose from adaptation options |
| `recruit` | Summon from deck |
| `combo` | Extra effect if card played this turn |

## Integration with EffectRegistry

The `battlecryBridge.ts` file provides integration between:
- Legacy `battlecryUtils.ts` (handles most battlecries)
- New `EffectRegistry` system (for extensible effect handling)

Type adapters in `../game/types.ts` handle conversion between:
- Legacy types: `CardData.id: string | number`
- Effect types: `Card.id: number`
