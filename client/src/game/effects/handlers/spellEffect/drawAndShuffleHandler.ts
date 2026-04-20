/**
 * Draw And Shuffle Effect Handler
 * 
 * This handler implements the spellEffect:draw_and_shuffle effect.
 * Draws cards and shuffles another card into the deck.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeDrawAndShuffle(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing spellEffect:draw_and_shuffle for ${sourceCard.name}`);
    
    const drawCount = effect.value || 1;
    const shuffleCardId = effect.shuffleCardId;
    const shuffleCardName = effect.shuffleCardName;
    const shuffleCount = effect.shuffleCount || 1;
    
    const drawnCards = context.drawCards(drawCount);
    context.logGameEvent(`Drew ${drawnCards.length} card(s)`);
    
    if (shuffleCardId || shuffleCardName) {
      for (let i = 0; i < shuffleCount; i++) {
        const newCard: any = {
          instanceId: 'shuffle-' + Date.now() + '-' + i + '-' + Math.random().toString(36).substring(7),
          card: {
            id: shuffleCardId || 0,
            name: shuffleCardName || 'Unknown Card',
            description: effect.shuffleCardDescription || '',
            manaCost: effect.shuffleCardCost || 0,
            type: effect.shuffleCardType || 'spell',
            rarity: 'token',
            heroClass: 'neutral'
          },
          canAttack: false,
          isPlayed: false,
          isSummoningSick: true,
          attacksPerformed: 0
        };
        
        context.currentPlayer.deck.push(newCard);
      }
      
      context.currentPlayer.deck.sort(() => Math.random() - 0.5);
      context.logGameEvent(`Shuffled ${shuffleCount} ${shuffleCardName || 'card(s)'} into deck`);
    }
    
    return { 
      success: true,
      additionalData: {
        cardsDrawn: drawnCards.length,
        drawnCardNames: drawnCards.map(c => c.card.name),
        cardsShuffled: shuffleCount,
        shuffledCardName: shuffleCardName
      }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:draw_and_shuffle:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:draw_and_shuffle: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
