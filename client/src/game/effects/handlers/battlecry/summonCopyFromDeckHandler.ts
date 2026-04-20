/**
 * SummonCopyFromDeck Battlecry Handler
 * 
 * Implements the "summon_copy_from_deck" battlecry effect.
 * Summons a copy of a random minion from the player's deck (with optional stat overrides).
 * Example card: Barnes (ID: 20105) - summons a 1/1 copy
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_BATTLEFIELD_SIZE } from '../../../constants/gameConstants';
import { v4 as uuidv4 } from 'uuid';


/**
 * Execute a summon_copy_from_deck battlecry effect
 * 
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeSummonCopyFromDeck(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing summon_copy_from_deck battlecry for ${sourceCard.name}`);
    
    const count = effect.value || effect.count || 1;
    const statOverride = effect.statOverride as boolean | undefined;
    const overrideAttack = effect.attack as number | undefined;
    const overrideHealth = effect.health as number | undefined;
    
    const currentBoardSize = context.currentPlayer.board.length;
    const availableSlots = MAX_BATTLEFIELD_SIZE - currentBoardSize;
    
    if (availableSlots <= 0) {
      context.logGameEvent(`Board is full, cannot summon minion from deck`);
      return { success: true, additionalData: { summonedCount: 0 } };
    }
    
    const minionsInDeck = context.currentPlayer.deck.filter(
      cardInstance => cardInstance.card.type === 'minion'
    );
    
    if (minionsInDeck.length === 0) {
      context.logGameEvent(`No minions in deck to copy`);
      return { success: true, additionalData: { noMinionsInDeck: true, summonedCount: 0 } };
    }
    
    const actualCount = Math.min(count, availableSlots, minionsInDeck.length);
    const summonedMinions: CardInstance[] = [];
    
    const shuffledMinions = [...minionsInDeck].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < actualCount; i++) {
      const deckMinion = shuffledMinions[i];
      const originalCard = deckMinion.card;
      
      let finalAttack = originalCard.attack || 1;
      let finalHealth = originalCard.health || 1;
      
      if (statOverride) {
        finalAttack = overrideAttack !== undefined ? overrideAttack : 1;
        finalHealth = overrideHealth !== undefined ? overrideHealth : 1;
      }
      
      const copyInstance: CardInstance = {
        instanceId: uuidv4(),
        card: {
          ...originalCard,
          attack: finalAttack,
          health: finalHealth
        },
        currentHealth: finalHealth,
        currentAttack: finalAttack,
        canAttack: false,
        isPlayed: true,
        isSummoningSick: true,
        attacksPerformed: 0,
        hasDivineShield: originalCard.keywords?.includes('divine_shield'),
        hasLifesteal: originalCard.keywords?.includes('lifesteal'),
        isPoisonous: originalCard.keywords?.includes('poisonous')
      };
      
      context.currentPlayer.board.push(copyInstance);
      summonedMinions.push(copyInstance);
      
      const statDisplay = statOverride 
        ? `${finalAttack}/${finalHealth}` 
        : `${originalCard.attack}/${originalCard.health}`;
      context.logGameEvent(`Summoned copy of ${originalCard.name} as ${statDisplay} from deck`);
    }
    
    return { 
      success: true, 
      additionalData: { 
        summonedCount: summonedMinions.length,
        summonedMinions 
      } 
    };
  } catch (error) {
    debug.error(`Error executing summon_copy_from_deck:`, error);
    return { 
      success: false, 
      error: `Error executing summon_copy_from_deck: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
