/**
 * PersistentEffect Battlecry Handler
 * 
 * Implements the "persistent_effect" battlecry effect.
 * Applies a persistent effect to the game state that triggers on conditions.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

/**
 * Execute a persistent_effect battlecry effect
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executePersistentEffect(
  context: GameContext, 
  effect: BattlecryEffect, 
  sourceCard: Card
): EffectResult {
  const sourceCardInstance: any = {
    instanceId: 'temp-' + Date.now(),
    card: sourceCard,
    canAttack: false,
    isPlayed: true,
    isSummoningSick: false,
    attacksPerformed: 0
  };

  try {
    context.logGameEvent(`Executing battlecry:persistent_effect for ${sourceCard.name}`);
    
    const triggerCondition = effect.triggerCondition || 'on_minion_death';
    const effectType = effect.effectType || 'damage';
    const damage = effect.damage || effect.value || 0;
    const targetType2 = effect.targetType2 || 'random_enemy_minion';
    const duration = effect.duration || 'while_alive';
    
    const persistentEffectData = {
      id: `persistent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sourceCardId: sourceCard.id,
      sourceCardName: sourceCard.name,
      sourceInstanceId: sourceCardInstance.instanceId,
      triggerCondition,
      effectType,
      value: damage,
      targetType: targetType2,
      duration,
      turnApplied: context.turnCount,
      isActive: true,
      timesTriggered: 0
    };
    
    context.activeEffects.push(persistentEffectData);
    
    let triggerDescription = '';
    switch (triggerCondition) {
      case 'on_minion_death':
        triggerDescription = 'whenever a minion dies';
        break;
      case 'on_friendly_death':
        triggerDescription = 'whenever a friendly minion dies';
        break;
      case 'on_enemy_death':
        triggerDescription = 'whenever an enemy minion dies';
        break;
      case 'on_damage_taken':
        triggerDescription = 'whenever this takes damage';
        break;
      case 'on_heal':
        triggerDescription = 'whenever a character is healed';
        break;
      case 'on_spell_cast':
        triggerDescription = 'whenever a spell is cast';
        break;
      case 'end_of_turn':
        triggerDescription = 'at the end of each turn';
        break;
      case 'start_of_turn':
        triggerDescription = 'at the start of each turn';
        break;
      default:
        triggerDescription = triggerCondition;
    }
    
    let effectDescription = '';
    switch (effectType) {
      case 'damage':
        effectDescription = `deal ${damage} damage to ${formatTargetType(targetType2)}`;
        break;
      case 'heal':
        effectDescription = `restore ${damage} health to ${formatTargetType(targetType2)}`;
        break;
      case 'buff':
        effectDescription = `give +${effect.buffAttack || 0}/+${effect.buffHealth || 0} to ${formatTargetType(targetType2)}`;
        break;
      case 'summon':
        effectDescription = `summon a minion`;
        break;
      case 'draw':
        effectDescription = `draw ${damage || 1} card(s)`;
        break;
      default:
        effectDescription = `apply ${effectType} effect`;
    }
    
    context.logGameEvent(`${sourceCard.name} created persistent effect: ${triggerDescription}, ${effectDescription}`);
    
    return { 
      success: true, 
      additionalData: { 
        effectId: persistentEffectData.id,
        triggerCondition,
        effectType,
        value: damage,
        targetType: targetType2,
        duration
      } 
    };
  } catch (error) {
    debug.error(`Error executing battlecry:persistent_effect:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:persistent_effect: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

function formatTargetType(targetType: string): string {
  switch (targetType) {
    case 'random_enemy_minion':
      return 'a random enemy minion';
    case 'random_friendly_minion':
      return 'a random friendly minion';
    case 'all_minions':
      return 'all minions';
    case 'all_enemy_minions':
    case 'enemy_minions':
      return 'all enemy minions';
    case 'all_friendly_minions':
    case 'friendly_minions':
      return 'all friendly minions';
    case 'enemy_hero':
      return 'the enemy hero';
    case 'friendly_hero':
      return 'your hero';
    case 'self':
      return 'this minion';
    default:
      return targetType;
  }
}
