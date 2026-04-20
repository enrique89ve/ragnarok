/**
 * ShuffleSpecial Battlecry Handler
 * 
 * Shuffles special cards (like bombs, mines, map pieces) into deck.
 * Example card: Elise the Trailblazer (ID: 32007)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeShuffleSpecial(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing shuffle_special battlecry for ${sourceCard.name}`);
    
    const cardName = effect.cardName || 'Special Card';
    const specialType = effect.specialType || effect.type || 'pack';
    const count = effect.count || 1;
    const shuffleIntoOpponentDeck = effect.shuffleIntoOpponentDeck || false;
    
    const targetDeck = shuffleIntoOpponentDeck 
      ? context.opponentPlayer.deck 
      : context.currentPlayer.deck;
    
    const shuffledCards: CardInstance[] = [];
    
    const specialCardTemplates: Record<string, Partial<Card>> = {
      'bomb': {
        name: 'Bomb',
        description: 'When drawn, deal 5 damage to your hero.',
        manaCost: 0,
        type: 'spell'
      },
      'mine': {
        name: 'Iron Juggernaut Mine',
        description: 'When drawn, deal 10 damage to your hero.',
        manaCost: 0,
        type: 'spell'
      },
      'pack': {
        name: "Un'Goro Pack",
        description: 'Add 5 Journey to Un\'Goro cards to your hand.',
        manaCost: 2,
        type: 'spell'
      },
      'ambush': {
        name: 'Ambush!',
        description: 'When drawn, summon a 4/4 Nerubian for your opponent.',
        manaCost: 0,
        type: 'spell'
      },
      'corrupted_blood': {
        name: 'Corrupted Blood',
        description: 'Deal 3 damage to your hero. Shuffle 2 copies into your deck.',
        manaCost: 0,
        type: 'spell'
      }
    };
    
    const template = specialCardTemplates[specialType] || specialCardTemplates['pack'];
    
    for (let i = 0; i < count; i++) {
      const newCard: CardInstance = {
        instanceId: `special-${specialType}-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
        card: {
          id: effect.cardId || 99997,
          name: template.name || cardName,
          description: template.description || '',
          manaCost: template.manaCost || 0,
          type: template.type || 'spell',
          rarity: 'mythic',
          heroClass: 'neutral',
          ...effect.cardData
        } as Card,
        canAttack: false,
        isPlayed: false,
        isSummoningSick: false,
        attacksPerformed: 0
      };
      
      const randomIndex = Math.floor(Math.random() * (targetDeck.length + 1));
      targetDeck.splice(randomIndex, 0, newCard);
      shuffledCards.push(newCard);
      
      context.logGameEvent(`Shuffled ${newCard.card.name} into ${shuffleIntoOpponentDeck ? "opponent's" : 'your'} deck.`);
    }
    
    return { 
      success: true, 
      additionalData: { shuffledCards, specialType, count: shuffledCards.length }
    };
  } catch (error) {
    debug.error('Error executing shuffle_special:', error);
    return { success: false, error: `Failed to execute shuffle_special: ${error}` };
  }
}
