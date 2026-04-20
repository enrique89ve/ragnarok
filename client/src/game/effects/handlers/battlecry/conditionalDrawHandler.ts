/**
 * ConditionalDraw Battlecry Handler
 * 
 * Implements the "conditional_draw" battlecry effect.
 * Checks a condition before drawing cards.
 * Example card: Fight Promoter (ID: 30034) - If you control a minion with 6+ Health, draw 2 cards
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_HAND_SIZE } from '../../../constants/gameConstants';


/**
 * Check if the draw condition is met
 */
function checkCondition(
  context: GameContext,
  condition: string,
  value?: number
): boolean {
  switch (condition) {
    case 'combo':
      return context.currentPlayer.cardsPlayedThisTurn > 0;
      
    case 'holding_dragon':
      return context.currentPlayer.hand.some(ci => (ci.card.race || '').toLowerCase() === 'dragon');
      
    case 'holding_spell':
      return context.currentPlayer.hand.some(ci => ci.card.type === 'spell');
      
    case 'holding_minion':
      return context.currentPlayer.hand.some(ci => ci.card.type === 'minion');
      
    case 'minion_health_6_plus':
    case 'control_minion_health_6':
      return context.currentPlayer.board.some(
        ci => (ci.currentHealth || ci.card.health || 0) >= 6
      );
      
    case 'minion_attack_6_plus':
    case 'control_minion_attack_6':
      return context.currentPlayer.board.some(
        ci => (ci.currentAttack || ci.card.attack || 0) >= 6
      );
      
    case 'board_has_minion':
      return context.currentPlayer.board.length > 0;
      
    case 'board_empty':
      return context.currentPlayer.board.length === 0;
      
    case 'opponent_board_empty':
      return context.opponentPlayer.board.length === 0;
      
    case 'hand_size_less_than':
      return context.currentPlayer.hand.length < (value || 3);
      
    case 'hand_empty':
      return context.currentPlayer.hand.length === 0;
      
    case 'deck_has_cards':
      return context.currentPlayer.deck.length > 0;
      
    case 'health_below':
      return context.currentPlayer.health < (value || 15);
      
    case 'enemy_health_below':
      return context.opponentPlayer.health < (value || 15);
      
    case 'mana_crystals':
      return context.currentPlayer.mana.max >= (value || 10);
      
    case 'played_spell_this_turn':
      return context.currentPlayer.cardsPlayedThisTurn > 0;
      
    case 'minions_died_this_game':
      return (context.currentPlayer.graveyard?.length || 0) >= (value || 1);
      
    case 'holding_weapon':
      return context.currentPlayer.hand.some(ci => ci.card.type === 'weapon');
      
    case 'has_weapon_equipped':
      return context.currentPlayer.hand.some(
        ci => ci.card.type === 'weapon' && ci.isPlayed
      );
      
    case 'overloaded':
      return (context.currentPlayer.mana.overloaded || 0) > 0;
      
    case 'control_elemental':
      return context.currentPlayer.board.some(ci => (ci.card.race || '').toLowerCase() === 'elemental');

    case 'control_beast':
      return context.currentPlayer.board.some(ci => (ci.card.race || '').toLowerCase() === 'beast');

    case 'control_mech':
    case 'control_automaton':
      return context.currentPlayer.board.some(ci => {
        const r = (ci.card.race || '').toLowerCase();
        return r === 'automaton' || r === 'mech';
      });

    case 'control_titan':
    case 'control_demon':
      return context.currentPlayer.board.some(ci => {
        const r = (ci.card.race || '').toLowerCase();
        return r === 'titan' || r === 'demon';
      });

    case 'control_murloc':
    case 'control_naga':
      return context.currentPlayer.board.some(ci => {
        const r = (ci.card.race || '').toLowerCase();
        return r === 'naga' || r === 'murloc';
      });

    case 'control_pirate':
    case 'control_einherjar':
      return context.currentPlayer.board.some(ci => {
        const r = (ci.card.race || '').toLowerCase();
        return r === 'einherjar' || r === 'pirate';
      });

    case 'control_totem':
    case 'control_spirit':
      return context.currentPlayer.board.some(ci => {
        const r = (ci.card.race || '').toLowerCase();
        return r === 'spirit' || r === 'totem';
      });
      
    default:
      debug.warn(`Unknown conditional_draw condition: ${condition}`);
      return false;
  }
}

/**
 * Execute a conditional_draw battlecry effect
 * 
 * @param context - The game context
 * @param effect - The effect data containing condition and value properties
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeConditionalDraw(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    const condition = effect.condition || 'always';
    const conditionValue = effect.conditionValue;
    const drawCount = effect.value || effect.count || 1;
    
    context.logGameEvent(`${sourceCard.name} battlecry: Conditional draw (${condition})`);
    
    const conditionMet = checkCondition(context, condition, conditionValue);
    
    if (!conditionMet) {
      context.logGameEvent(`Condition '${condition}' not met - no cards drawn`);
      return {
        success: true,
        additionalData: {
          conditionMet: false,
          drawnCards: [],
          totalDrawn: 0
        }
      };
    }
    
    context.logGameEvent(`Condition '${condition}' met - drawing ${drawCount} card(s)`);
    
    const drawnCards: Card[] = [];
    const burnedCards: Card[] = [];
    
    for (let i = 0; i < drawCount; i++) {
      if (context.currentPlayer.deck.length === 0) {
        context.logGameEvent(`Deck is empty - no more cards to draw`);
        break;
      }
      
      const cardInstance = context.currentPlayer.deck.shift();
      if (!cardInstance) continue;
      
      if (context.currentPlayer.hand.length < MAX_HAND_SIZE) {
        context.currentPlayer.hand.push(cardInstance);
        drawnCards.push(cardInstance.card);
        context.logGameEvent(`Drew ${cardInstance.card.name}`);
      } else {
        burnedCards.push(cardInstance.card);
        context.logGameEvent(`Hand is full! ${cardInstance.card.name} was burned`);
      }
    }
    
    context.currentPlayer.cardsDrawnThisTurn += drawnCards.length;
    
    return {
      success: true,
      additionalData: {
        conditionMet: true,
        drawnCards,
        burnedCards,
        totalDrawn: drawnCards.length,
        totalBurned: burnedCards.length
      }
    };
  } catch (error) {
    debug.error(`Error executing conditional_draw:`, error);
    return {
      success: false,
      error: `Error executing conditional_draw: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
