# Spell Utilities Modular Structure

## Overview

This directory contains the modular refactoring of `spellUtils.ts` (5665 lines, 80+ functions).
The goal is to meet production-quality code standards by organizing spell functions into logical categories.

## Target Structure

```
spells/
├── index.ts          # Re-exports all modules
├── types.ts          # Shared types and interfaces
├── damageSpells.ts   # executeDamageSpell, executeAoEDamageSpell, etc.
├── healSpells.ts     # executeHealSpell, executeSetHealthSpell, etc.
├── buffSpells.ts     # executeBuffSpell, executeDebuffSpell, etc.
├── summonSpells.ts   # executeSummonSpell, executeResurrectSpell, etc.
├── transformSpells.ts # executeTransformSpell, executeTransformCopySpell, etc.
├── drawSpells.ts     # executeDrawSpell, executeShuffleIntoDeckSpell, etc.
├── controlSpells.ts  # executeDestroySpell, executeSilenceSpell, etc.
└── utilitySpells.ts  # executeManaSpell, executeQuestSpell, etc.
```

## Function Categories

### Damage Spells (~15 functions)
- executeDamageSpell
- executeAoEDamageSpell
- applyAoEDamage
- executeCleaveSpell
- executeCleaveWithFreezeSpell
- executeConditionalDamageSpell
- executeDamageBasedOnArmorSpell
- executeRandomDamageSpell
- executeSplitDamageSpell
- executeDrawAndDamageSpell
- executeDamageAndShuffleSpell
- executeSelfDamageSpell
- executeSelfDamageBuffSpell
- executeSacrificeAndAoEDamageSpell
- executeSilenceAndDamageSpell

### Heal Spells (~5 functions)
- executeHealSpell
- executeSetHealthSpell
- executeSetHeroHealthSpell
- executeTransformHealingToDamageSpell

### Buff/Debuff Spells (~8 functions)
- executeBuffSpell
- executeDebuffSpell
- executeBuffWeaponSpell
- executeGrantKeywordSpell
- executeGrantDeathrattleSpell
- executeCostReductionSpell
- executeSetAttackSpell

### Summon Spells (~12 functions)
- executeSummonSpell
- executeSummonJadeGolemSpell
- executeSummonRandomSpell
- executeSummonCopiesSpell
- executeSummonTokenSpell
- executeSummonFromGraveyardSpell
- executeSummonHighestCostFromGraveyardSpell
- executeSummonRushMinionsSpell
- executeSummonStoredSpell
- executeResurrectMultipleSpell
- executeResurrectDeathrattleSpell

### Transform Spells (~8 functions)
- executeTransformSpell
- executeTransformRandomSpell
- executeTransformCopySpell
- executeTransformRandomInHandSpell
- executeTransformAndSilenceSpell
- executeTransformDeckSpell
- executeTransformCopyFromDeckSpell

### Draw Spells (~5 functions)
- executeDrawSpell
- executeDrawBothPlayersSpell
- executeShuffleIntoDeckSpell
- executeSwapDecksSpell

### Control Spells (~10 functions)
- executeDestroySpell
- executeDestroyRandomSpell
- executeMindControlSpell
- executeReturnToHandSpell
- executeReturnToHandNextTurnSpell
- executeSilenceSpell
- executeSilenceAllSpell
- executeSacrificeSpell
- executeFreezeSpell
- applyFreezeEffect
- executeConditionalFreezeOrDestroySpell

### Utility Spells (~15 functions)
- executeManaSpell
- executeExtraTurnSpell
- executeCrystalCoreSpell
- executeCastAllSpellsSpell
- executeEquipWeaponSpell
- executeAddCardSpell
- executeGainManaSpell
- executeSwapHeroPowerSpell
- executeReduceDeckCostSpell
- executeReduceNextSpellCostSpell
- executeReduceOpponentManaSpell
- executeReduceSpellCostSpell
- executeReplaceHeroPowerSpell
- executeReplayBattlecriesSpell
- executeDiscoverSpell
- executeQuestSpell

## Migration Strategy

1. **Phase 1 (Current)**: Create directory structure and types
2. **Phase 2**: Extract one category (damage spells) to validate pattern
3. **Phase 3**: Migrate remaining categories incrementally
4. **Phase 4**: Update main spellUtils.ts to re-export from modules
5. **Phase 5**: Remove duplicated code from spellUtils.ts

## Backward Compatibility

The main `spellUtils.ts` file will continue to export all functions during migration.
Once all functions are moved, it becomes a thin re-export layer.
