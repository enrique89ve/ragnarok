/**
 * Quest Utility Functions
 * Pure functions for quest detection, progress calculation, and condition checking
 */

import { CardData, SpellCardData } from '../../types';
import { QuestConditionType, QuestActivationData, ActiveQuest } from './types';

/**
 * Type guard to check if card is a spell card with spellEffect
 */
function isSpellCard(card: CardData): card is SpellCardData {
  return card.type === 'spell';
}

/**
 * Check if a card is a quest card
 * Quest cards have the 'quest' keyword and spellEffect.type === 'quest'
 */
export function isQuestCard(card: CardData): boolean {
  if (!card) return false;
  
  const hasQuestKeyword = card.keywords?.includes('quest') ?? false;
  const hasQuestSpellEffect = isSpellCard(card) && card.spellEffect?.type === 'quest';
  
  return hasQuestKeyword || hasQuestSpellEffect;
}

/**
 * Extract quest activation data from a quest card
 * Returns null if the card is not a valid quest card
 */
export function extractQuestData(card: CardData, rewardCardName?: string): QuestActivationData | null {
  if (!isQuestCard(card)) return null;
  if (!isSpellCard(card)) return null;
  
  const questData = card.spellEffect?.questData;
  if (!questData) return null;
  
  const conditionType = mapQuestTypeToCondition(questData.type);
  
  return {
    cardId: typeof card.id === 'number' ? card.id : parseInt(card.id, 10),
    name: card.name,
    description: card.description || '',
    conditionType,
    goal: questData.target || 0,
    rewardCardId: typeof questData.rewardCardId === 'number' ? questData.rewardCardId : 0,
    rewardCardName: rewardCardName || 'Quest Reward'
  };
}

/**
 * Map internal quest type string to QuestConditionType
 */
export function mapQuestTypeToCondition(type: string): QuestConditionType {
  switch (type) {
    case 'summon_minions':
      return 'summon_minion';
    case 'summon_deathrattle_minions':
      return 'summon_deathrattle_minions';
    case 'play_taunt_minions':
      return 'play_taunt_minions';
    case 'cast_generated_spells':
      return 'cast_generated_spells';
    case 'play_minions_same_name':
      return 'play_minions_same_name';
    case 'summon_minions_with_attack':
      return 'summon_minions_with_attack';
    case 'play_minions_cost_1':
      return 'play_minions_cost_1';
    case 'generic':
      return 'generic';
    default:
      return 'generic';
  }
}

/**
 * Get human-readable description of quest condition
 */
export function getQuestConditionDescription(conditionType: QuestConditionType, goal: number): string {
  switch (conditionType) {
    case 'summon_minion':
      return `Summon ${goal} minions`;
    case 'summon_deathrattle_minions':
      return `Summon ${goal} Deathrattle minions`;
    case 'play_taunt_minions':
      return `Play ${goal} Taunt minions`;
    case 'cast_generated_spells':
      return `Cast ${goal} spells that didn't start in your deck`;
    case 'play_minions_same_name':
      return `Play ${goal} minions with the same name`;
    case 'summon_minions_with_attack':
      return `Summon ${goal} minions with 5+ Attack`;
    case 'play_minions_cost_1':
      return `Play ${goal} minions that cost (1)`;
    case 'generic':
      return `Complete ${goal} tasks`;
    default:
      return `Complete ${goal} tasks`;
  }
}

/**
 * Check if an action should increment quest progress
 */
export function shouldIncrementQuest(
  quest: ActiveQuest,
  actionType: 'play_minion' | 'summon_minion' | 'cast_spell',
  cardData: CardData,
  metadata?: { targetCardName?: string }
): boolean {
  if (quest.completed) return false;
  
  switch (quest.conditionType) {
    case 'summon_minion':
      return (actionType === 'play_minion' || actionType === 'summon_minion') &&
             cardData.type === 'minion';
    
    case 'summon_deathrattle_minions':
      return (actionType === 'play_minion' || actionType === 'summon_minion') &&
             cardData.type === 'minion' &&
             (cardData.keywords?.includes('deathrattle') ?? false);
    
    case 'play_taunt_minions':
      return actionType === 'play_minion' &&
             cardData.type === 'minion' &&
             (cardData.keywords?.includes('taunt') ?? false);
    
    case 'cast_generated_spells':
      return actionType === 'cast_spell' &&
             cardData.type === 'spell';
    
    case 'play_minions_same_name':
      if (actionType !== 'play_minion' || cardData.type !== 'minion') return false;
      const targetName = quest.metadata?.targetCardName || metadata?.targetCardName;
      if (!targetName) return true;
      return cardData.name === targetName;
    
    case 'play_minions_cost_1':
      return actionType === 'play_minion' &&
             cardData.type === 'minion' &&
             cardData.manaCost === 1;
    
    case 'summon_minions_with_attack':
      return (actionType === 'play_minion' || actionType === 'summon_minion') &&
             cardData.type === 'minion' &&
             (cardData.attack ?? 0) >= 5;
    
    case 'generic':
      return true;
    
    default:
      return false;
  }
}

/**
 * Calculate quest progress percentage
 */
export function getQuestProgressPercent(quest: ActiveQuest): number {
  if (quest.goal === 0) return 0;
  return Math.min(100, Math.round((quest.current / quest.goal) * 100));
}

/**
 * Check if quest is complete
 */
export function isQuestComplete(quest: ActiveQuest): boolean {
  return quest.current >= quest.goal;
}

/**
 * Generate unique quest ID
 */
export function generateQuestId(cardId: number): string {
  return `quest_${cardId}_${Date.now()}`;
}
