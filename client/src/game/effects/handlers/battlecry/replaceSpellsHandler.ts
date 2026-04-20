/**
 * ReplaceSpells Battlecry Handler
 * 
 * Replaces all spells in hand with random spells from another class.
 * Example card: Lilian Voss (ID: 20708)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeReplaceSpells(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing replace_spells battlecry for ${sourceCard.name}`);
    
    const replaceWith = effect.replaceWith || 'random_class_spell';
    const targetClass = effect.targetClass;
    
    const spellsInHand = context.currentPlayer.hand.filter(
      card => card.card.type === 'spell'
    );
    
    if (spellsInHand.length === 0) {
      context.logGameEvent('No spells in hand to replace.');
      return { success: true, additionalData: { replacedCount: 0 } };
    }
    
    const genericSpellPool: Partial<Card>[] = [
      { id: 70001, name: 'Fireball', manaCost: 4, description: 'Deal 6 damage.', heroClass: 'mage' },
      { id: 70002, name: 'Swipe', manaCost: 4, description: 'Deal 4 damage to an enemy and 1 to all others.', heroClass: 'druid' },
      { id: 70003, name: 'Eviscerate', manaCost: 2, description: 'Deal 2 damage. Combo: Deal 4 instead.', heroClass: 'rogue' },
      { id: 70004, name: 'Holy Light', manaCost: 2, description: 'Restore 8 Health.', heroClass: 'paladin' },
      { id: 70005, name: 'Hex', manaCost: 4, description: 'Transform a minion into a 0/1 Frog.', heroClass: 'shaman' },
      { id: 70006, name: 'Deadly Shot', manaCost: 3, description: 'Destroy a random enemy minion.', heroClass: 'hunter' },
      { id: 70007, name: 'Execute', manaCost: 1, description: 'Destroy a damaged enemy minion.', heroClass: 'warrior' },
      { id: 70008, name: 'Shadow Word: Death', manaCost: 3, description: 'Destroy a minion with 5+ Attack.', heroClass: 'priest' }
    ];
    
    const replacedSpells: { original: Card; replacement: Card }[] = [];
    
    for (const spellCard of spellsInHand) {
      const handIndex = context.currentPlayer.hand.indexOf(spellCard);
      if (handIndex === -1) continue;
      
      let filteredPool = genericSpellPool;
      if (targetClass) {
        filteredPool = genericSpellPool.filter(s => s.heroClass === targetClass);
        if (filteredPool.length === 0) filteredPool = genericSpellPool;
      }
      
      const randomSpell = filteredPool[Math.floor(Math.random() * filteredPool.length)];
      const originalCost = spellCard.card.manaCost;
      
      const newSpellCard: CardInstance = {
        instanceId: `replaced-spell-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        card: {
          id: randomSpell.id || 70000,
          name: randomSpell.name || 'Random Spell',
          description: randomSpell.description || '',
          manaCost: effect.keepManaCost ? originalCost : (randomSpell.manaCost || originalCost),
          type: 'spell',
          rarity: 'rare',
          heroClass: (randomSpell.heroClass as any) || 'neutral'
        } as Card,
        canAttack: false,
        isPlayed: false,
        isSummoningSick: false,
        attacksPerformed: 0
      };
      
      context.currentPlayer.hand[handIndex] = newSpellCard;
      replacedSpells.push({
        original: spellCard.card,
        replacement: newSpellCard.card
      });
      
      context.logGameEvent(`Replaced ${spellCard.card.name} with ${newSpellCard.card.name}.`);
    }
    
    return { 
      success: true, 
      additionalData: { 
        replacedCount: replacedSpells.length,
        replacedSpells
      }
    };
  } catch (error) {
    debug.error('Error executing replace_spells:', error);
    return { success: false, error: `Failed to execute replace_spells: ${error}` };
  }
}
