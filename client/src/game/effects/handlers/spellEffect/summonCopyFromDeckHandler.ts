/**
 * SummonCopyFromDeck SpellEffect Handler
 * 
 * Implements the "summon_copy_from_deck" spellEffect effect.
 * Summons a copy of a minion from the player's deck.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_BATTLEFIELD_SIZE } from '../../../constants/gameConstants';

export default function executeSummonCopyFromDeck(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing spellEffect:summon_copy_from_deck for ${sourceCard.name}`);
    
    const count = effect.value || 1;
    const statOverride = effect.statOverride === true;
    const overrideAttack = effect.attack;
    const overrideHealth = effect.health;
    const filterType = effect.filterType || 'minion';
    
    const currentPlayer = context.currentPlayer;
    
    const minionsInDeck = currentPlayer.deck.filter((cardInstance: any) => 
      cardInstance.card.type === filterType
    );
    
    if (minionsInDeck.length === 0) {
      context.logGameEvent(`No minions in deck to summon`);
      return { 
        success: true, 
        additionalData: { summonedCount: 0 }
      };
    }
    
    let summonedCount = 0;
    
    for (let i = 0; i < count && minionsInDeck.length > 0; i++) {
      if (currentPlayer.board.length >= MAX_BATTLEFIELD_SIZE) {
        context.logGameEvent(`Board is full, cannot summon more minions`);
        break;
      }
      
      const randomIndex = Math.floor(Math.random() * minionsInDeck.length);
      const selectedMinion = minionsInDeck[randomIndex];
      
      const copyInstance: any = {
        instanceId: `copy-${Date.now()}-${i}`,
        card: { ...selectedMinion.card },
        canAttack: false,
        isPlayed: true,
        isSummoningSick: true,
        attacksPerformed: 0,
        currentHealth: selectedMinion.card.health
      };
      
      if (statOverride) {
        if (overrideAttack !== undefined) {
          copyInstance.card.attack = overrideAttack;
        }
        if (overrideHealth !== undefined) {
          copyInstance.card.health = overrideHealth;
          copyInstance.currentHealth = overrideHealth;
        }
      }
      
      currentPlayer.board.push(copyInstance);
      summonedCount++;
      
      context.logGameEvent(`Summoned copy of ${copyInstance.card.name} from deck`);
      
      minionsInDeck.splice(randomIndex, 1);
    }
    
    return { 
      success: true,
      additionalData: { summonedCount }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:summon_copy_from_deck:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:summon_copy_from_deck: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
