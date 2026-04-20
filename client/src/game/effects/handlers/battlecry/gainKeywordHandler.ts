/**
 * GainKeyword Battlecry Handler
 * 
 * Implements the "gain_keyword" battlecry effect.
 * Grants keywords (Taunt, Windfury, Lifesteal, etc.) to target minion(s).
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { addKeyword } from '../../../utils/cards/keywordUtils';

/**
 * Execute a gain_keyword battlecry effect
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeGainKeyword(
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
    context.logGameEvent(`Executing battlecry:gain_keyword for ${sourceCard.name}`);
    
    const requiresTarget = effect.requiresTarget === true;
    const targetType = effect.targetType || 'self';
    const keywords = effect.keywords || [];
    const condition = effect.condition;
    
    if (keywords.length === 0) {
      context.logGameEvent(`No keywords specified for gain_keyword effect`);
      return { success: true };
    }
    
    if (condition) {
      const conditionMet = evaluateCondition(context, condition);
      if (!conditionMet) {
        context.logGameEvent(`Condition "${condition}" not met for gain_keyword effect`);
        return { success: true };
      }
    }
    
    const targets = context.getTargets(targetType, sourceCardInstance);
    
    if (requiresTarget && targets.length === 0) {
      context.logGameEvent(`No valid targets for battlecry:gain_keyword`);
      return { success: false, error: 'No valid targets' };
    }
    
    if (targets.length === 0) {
      context.logGameEvent(`No targets available for gain_keyword effect`);
      return { success: true };
    }
    
    let modifiedCount = 0;
    
    targets.forEach(target => {
      if (target.card.type === 'minion') {
        keywords.forEach((keyword: string) => {
          addKeyword(target, keyword);
          
          applyKeywordEffect(target, keyword);
        });
        
        modifiedCount++;
        context.logGameEvent(`${sourceCard.name} granted [${keywords.join(', ')}] to ${target.card.name}`);
      }
    });
    
    return { success: true, additionalData: { modifiedCount, keywordsGranted: keywords } };
  } catch (error) {
    debug.error(`Error executing battlecry:gain_keyword:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:gain_keyword: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

function applyKeywordEffect(target: any, keyword: string): void {
  const lowerKeyword = keyword.toLowerCase();
  
  switch (lowerKeyword) {
    case 'taunt':
      target.hasTaunt = true;
      break;
    case 'divine_shield':
      target.hasDivineShield = true;
      break;
    case 'lifesteal':
      target.hasLifesteal = true;
      break;
    case 'rush':
      target.isRush = true;
      target.canAttack = true;
      break;
    case 'charge':
      target.canAttack = true;
      target.isSummoningSick = false;
      break;
    case 'poisonous':
      target.isPoisonous = true;
      break;
    case 'windfury':
      target.hasWindfury = true;
      break;
    case 'stealth':
      target.hasStealth = true;
      break;
    case 'immune':
      target.isImmune = true;
      break;
    case 'reborn':
      target.hasReborn = true;
      break;
    case 'elusive':
      target.hasElusive = true;
      break;
  }
}

function evaluateCondition(context: GameContext, condition: string): boolean {
  switch (condition) {
    case 'no_duplicates':
      const handCardIds = context.currentPlayer.hand.map(c => c.card.id);
      const deckCardIds = context.currentPlayer.deck.map(c => c.card.id);
      const allCardIds = [...handCardIds, ...deckCardIds];
      return new Set(allCardIds).size === allCardIds.length;
    case 'has_weapon':
      return context.currentPlayer.hero && (context.currentPlayer.hero as any).weapon !== undefined;
    case 'combo':
      return context.currentPlayer.cardsPlayedThisTurn > 0;
    default:
      return true;
  }
}
