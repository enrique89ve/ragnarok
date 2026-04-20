/**
 * TransformDeck Battlecry Handler
 * 
 * Transforms all cards in the deck into something else.
 * Example card: Lady Prestor (ID: 20315)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeTransformDeck(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing transform_deck battlecry for ${sourceCard.name}`);
    
    const cardType = effect.cardType || 'minion';
    const transformInto = effect.transformInto || 'dragon';
    const keepManaCost = effect.keepManaCost ?? true;
    
    const cardsToTransform = context.currentPlayer.deck.filter(
      card => card.card.type === cardType
    );
    
    if (cardsToTransform.length === 0) {
      context.logGameEvent('No matching cards in deck to transform');
      return { success: true, additionalData: { transformedCount: 0 } };
    }
    
    const dragonPool: Partial<Card>[] = [
      { id: 90001, name: 'Azure Drake', attack: 4, health: 4, manaCost: 5 },
      { id: 90002, name: 'Twilight Drake', attack: 4, health: 1, manaCost: 4 },
      { id: 90003, name: 'Emerald Drake', attack: 7, health: 6, manaCost: 6 },
      { id: 90004, name: 'Faerie Dragon', attack: 3, health: 2, manaCost: 2 },
      { id: 90005, name: 'Ysera', attack: 4, health: 12, manaCost: 9 }
    ];
    
    let transformedCount = 0;
    
    for (const cardInstance of cardsToTransform) {
      const originalCost = cardInstance.card.manaCost;
      const randomDragon = dragonPool[Math.floor(Math.random() * dragonPool.length)];
      
      const transformedCard: Card = {
        id: randomDragon.id || 90000,
        name: randomDragon.name || 'Dragon',
        description: `Transformed from ${cardInstance.card.name}`,
        manaCost: keepManaCost ? originalCost : (randomDragon.manaCost || originalCost),
        type: 'minion',
        rarity: 'rare',
        heroClass: 'neutral',
        attack: randomDragon.attack || 4,
        health: randomDragon.health || 4,
        race: 'dragon'
      } as Card;
      
      cardInstance.card = transformedCard;
      cardInstance.currentAttack = transformedCard.attack;
      cardInstance.currentHealth = transformedCard.health;
      
      transformedCount++;
    }
    
    context.logGameEvent(`Transformed ${transformedCount} ${cardType}s in deck into ${transformInto}s.`);
    
    return { 
      success: true, 
      additionalData: { transformedCount, transformInto }
    };
  } catch (error) {
    debug.error('Error executing transform_deck:', error);
    return { success: false, error: `Failed to execute transform_deck: ${error}` };
  }
}
