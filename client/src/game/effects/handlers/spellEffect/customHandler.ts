/**
 * Custom Effect Handler
 * 
 * This handler implements the spellEffect:custom effect.
 * Executes a generic custom effect based on the customAction property.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeCustom(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing spellEffect:custom for ${sourceCard.name}`);
    
    const customAction = effect.customAction || effect.action;
    const value = effect.value || 0;
    
    if (!customAction) {
      context.logGameEvent(`Custom effect with no action specified`);
      return { 
        success: true,
        additionalData: { message: 'No custom action specified' }
      };
    }
    
    switch (customAction) {
      case 'gain_armor':
        context.currentPlayer.armor += value;
        context.logGameEvent(`Gained ${value} armor`);
        break;
        
      case 'gain_mana':
        context.currentPlayer.mana.current += value;
        if (context.currentPlayer.mana.current > context.currentPlayer.mana.max) {
          context.currentPlayer.mana.current = context.currentPlayer.mana.max;
        }
        context.logGameEvent(`Gained ${value} mana`);
        break;
        
      case 'draw_cards':
        context.drawCards(value);
        break;
        
      case 'restore_health':
        context.healTarget(context.currentPlayer.hero, value);
        break;
        
      case 'shuffle_hand':
        const handCards = [...context.currentPlayer.hand];
        context.currentPlayer.deck.push(...handCards);
        context.currentPlayer.hand = [];
        context.currentPlayer.deck.sort(() => Math.random() - 0.5);
        context.logGameEvent(`Shuffled hand into deck`);
        break;
        
      case 'discard_random':
        if (context.currentPlayer.hand.length > 0) {
          const randomIndex = Math.floor(Math.random() * context.currentPlayer.hand.length);
          const discarded = context.currentPlayer.hand.splice(randomIndex, 1)[0];
          context.logGameEvent(`Discarded ${discarded.card.name}`);
        }
        break;
        
      default:
        context.logGameEvent(`Unknown custom action: ${customAction}`);
        return { 
          success: true,
          additionalData: { 
            message: `Unknown custom action: ${customAction}`,
            effectData: effect
          }
        };
    }
    
    return { 
      success: true,
      additionalData: {
        action: customAction,
        value
      }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:custom:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:custom: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
