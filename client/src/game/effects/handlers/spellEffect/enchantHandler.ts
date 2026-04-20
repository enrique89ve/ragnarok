/**
 * Enchant SpellEffect Handler
 * 
 * Implements the "enchant" spellEffect effect.
 * Applies an enchantment to target cards that modifies their stats or abilities.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { addKeyword } from '../../../utils/cards/keywordUtils';

export default function executeEnchant(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing spellEffect:enchant for ${sourceCard.name}`);
    
    const enchantEffect = effect.enchantEffect || {};
    const buffAttack = enchantEffect.buffAttack || effect.buffAttack || 0;
    const buffHealth = enchantEffect.buffHealth || effect.buffHealth || 0;
    const grantKeywords = enchantEffect.keywords || effect.grantKeywords || [];
    const targetType = effect.targetType || 'friendly_minion';
    const requiresTarget = effect.requiresTarget !== false;
    
    const sourceCardInstance: any = {
      instanceId: 'temp-' + Date.now(),
      card: sourceCard,
      canAttack: false,
      isPlayed: true
    };
    
    const targets = context.getTargets(targetType, sourceCardInstance);
    
    if (targets.length === 0 && requiresTarget) {
      context.logGameEvent(`No valid targets for enchant effect`);
      return { success: false, error: 'No valid targets' };
    }
    
    let enchantedCount = 0;
    
    targets.forEach(target => {
      if (target.card.type === 'minion') {
        if (buffAttack !== 0) {
          target.card.attack = (target.card.attack || 0) + buffAttack;
          context.logGameEvent(`Enchanted ${target.card.name}: +${buffAttack} attack`);
        }
        
        if (buffHealth !== 0) {
          target.card.health = (target.card.health || 0) + buffHealth;
          if (target.currentHealth !== undefined) {
            target.currentHealth += buffHealth;
          }
          context.logGameEvent(`Enchanted ${target.card.name}: +${buffHealth} health`);
        }
        
        if (grantKeywords.length > 0) {
          grantKeywords.forEach((keyword: string) => {
            addKeyword(target, keyword);
            context.logGameEvent(`Enchanted ${target.card.name} with ${keyword}`);
          });
        }
        
        const targetWithEnchants = target as any;
        targetWithEnchants.enchantments = targetWithEnchants.enchantments || [];
        targetWithEnchants.enchantments.push({
          source: sourceCard.name,
          buffAttack,
          buffHealth,
          keywords: grantKeywords
        });
        
        enchantedCount++;
      }
    });
    
    return { 
      success: true,
      additionalData: { enchantedCount }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:enchant:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:enchant: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
