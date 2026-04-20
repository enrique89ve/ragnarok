/**
 * SummonFromSpellCost Battlecry Handler
 * 
 * Implements the "summon_from_spell_cost" battlecry effect.
 * Reveals a spell from the deck and summons a random minion with cost equal to the spell's cost.
 * Example card: Spiteful Summoner (ID: 30017)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_BATTLEFIELD_SIZE } from '../../../constants/gameConstants';
import cardDatabase from '../../../services/cardDatabase';
import { v4 as uuidv4 } from 'uuid';
import { isMinion, getAttack, getHealth } from '../../../utils/cards/typeGuards';


/**
 * Execute a summon_from_spell_cost battlecry effect
 * 
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeSummonFromSpellCost(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing summon_from_spell_cost battlecry for ${sourceCard.name}`);
    
    const currentBoardSize = context.currentPlayer.board.length;
    const availableSlots = MAX_BATTLEFIELD_SIZE - currentBoardSize;
    
    if (availableSlots <= 0) {
      context.logGameEvent(`Board is full, cannot summon minion`);
      return { success: true, additionalData: { summonedCount: 0 } };
    }
    
    const spellsInDeck = context.currentPlayer.deck.filter(
      cardInstance => cardInstance.card.type === 'spell'
    );
    
    if (spellsInDeck.length === 0) {
      context.logGameEvent(`No spells in deck to reveal`);
      return { success: true, additionalData: { noSpellsInDeck: true, summonedCount: 0 } };
    }
    
    const randomIndex = Math.floor(Math.random() * spellsInDeck.length);
    const revealedSpell = spellsInDeck[randomIndex];
    const spellCost = revealedSpell.card.manaCost;
    
    context.logGameEvent(`Revealed ${revealedSpell.card.name} (Cost: ${spellCost})`);
    
    const deckIndex = context.currentPlayer.deck.findIndex(
      c => c.instanceId === revealedSpell.instanceId
    );
    if (deckIndex !== -1) {
      context.currentPlayer.deck.splice(deckIndex, 1);
      context.currentPlayer.graveyard.push(revealedSpell);
    }
    
    const minionsWithCost = cardDatabase.getCardsByType('minion').filter(
      card => card.manaCost === spellCost && isMinion(card)
    );
    
    if (minionsWithCost.length === 0) {
      context.logGameEvent(`No minions found with cost ${spellCost}`);
      return { 
        success: true, 
        additionalData: { 
          revealedSpell: revealedSpell.card.name,
          spellCost,
          noMinionsAtCost: true,
          summonedCount: 0 
        } 
      };
    }
    
    const randomMinionIndex = Math.floor(Math.random() * minionsWithCost.length);
    const selectedMinion = minionsWithCost[randomMinionIndex];
    
    const selectedMinionAttack = getAttack(selectedMinion);
    const selectedMinionHealth = getHealth(selectedMinion);
    
    const minionInstance: CardInstance = {
      instanceId: uuidv4(),
      card: {
        id: typeof selectedMinion.id === 'number' ? selectedMinion.id : parseInt(selectedMinion.id as string, 10),
        name: selectedMinion.name,
        description: selectedMinion.description || '',
        manaCost: selectedMinion.manaCost || 0,
        type: 'minion',
        rarity: selectedMinion.rarity || 'common',
        heroClass: selectedMinion.heroClass || (selectedMinion as any).class || 'neutral',
        attack: selectedMinionAttack || 1,
        health: selectedMinionHealth || 1,
        keywords: selectedMinion.keywords || []
      },
      currentHealth: selectedMinionHealth || 1,
      currentAttack: selectedMinionAttack || 1,
      canAttack: false,
      isPlayed: true,
      isSummoningSick: true,
      attacksPerformed: 0
    };
    
    context.currentPlayer.board.push(minionInstance);
    
    context.logGameEvent(`Summoned ${selectedMinion.name} (${selectedMinionAttack}/${selectedMinionHealth}) - Cost ${spellCost}`);
    
    return { 
      success: true, 
      additionalData: { 
        revealedSpell: revealedSpell.card.name,
        spellCost,
        summonedCount: 1,
        summonedMinion: minionInstance
      } 
    };
  } catch (error) {
    debug.error(`Error executing summon_from_spell_cost:`, error);
    return { 
      success: false, 
      error: `Error executing summon_from_spell_cost: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
