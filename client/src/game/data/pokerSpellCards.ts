/**
 * Poker Spell Cards
 * 
 * New card subtype that affects poker combat during the Spell/Pet phase.
 * These spells focus on bluffing, info asymmetry, and variance control.
 * They do NOT affect pot odds or damage calculations directly.
 * 
 * ID Range: 9100-9199 (reserved for Poker Spells)
 * 
 * Distribution:
 * - Neutral (9100-9109): Core poker utility spells anyone can use
 * - Rogue (9110-9119): Deception and trickery (Trickster archetype)
 * - Mage (9120-9129): Variance control and foresight (Foresight archetype)
 * - Warlock (9130-9139): Punishing and debuffs (Hel, Hades archetype)
 * - Legendary (9140-9149): High-impact game changers (Neutral)
 */

import { PokerSpellCard } from '../types/CardTypes';

export const pokerSpellCards: PokerSpellCard[] = [
  // ==================== NEUTRAL POKER SPELLS (9100-9109) ====================
  {
    id: 9100,
    name: 'Bluff Rune',
    description: 'Gain a Bluff token. During betting, spend it to fake a raise. Opponent sees pot increase but your actual commitment is unchanged.',
    manaCost: 2,
    type: 'poker_spell',
    rarity: 'common',
    heroClass: 'neutral',
    keywords: ['poker_spell'],
    flavorText: 'The trickster smiles behind empty hands.',
    collectible: true,
    pokerSpellEffect: {
      effectType: 'bluff_rune',
      timing: 'pre_deal',
      duration: 'this_combat',
      targetSelf: true,
      targetOpponent: false
    }
  },
  {
    // Changed from 9101 to 9151 to avoid conflict with Berserker card ID
    id: 9151,
    name: 'Fate Peek',
    description: 'Reveal 1 of your opponent\'s hole cards for the duration of this combat.',
    manaCost: 1,
    type: 'poker_spell',
    rarity: 'common',
    heroClass: 'neutral',
    keywords: ['poker_spell'],
    flavorText: 'The Allfather\'s ravens see all.',
    collectible: true,
    pokerSpellEffect: {
      effectType: 'fate_peek',
      timing: 'pre_deal',
      duration: 'this_combat',
      targetSelf: false,
      targetOpponent: true,
      value: 1
    }
  },
  {
    // Changed from 9102 to 9152 to avoid conflict with Berserker card ID
    id: 9152,
    name: 'Stamina Shield',
    description: 'Your next fold this combat costs 1 less STA.',
    manaCost: 1,
    type: 'poker_spell',
    rarity: 'common',
    heroClass: 'neutral',
    keywords: ['poker_spell'],
    flavorText: 'The shield-bearer\'s oath protects even in retreat.',
    collectible: true,
    pokerSpellEffect: {
      effectType: 'stamina_shield',
      timing: 'pre_deal',
      duration: 'this_combat',
      targetSelf: true,
      targetOpponent: false,
      value: 1
    }
  },

  // ==================== ROGUE POKER SPELLS (9110-9119) ====================
  {
    id: 9110,
    name: 'Hole Swap',
    description: 'Swap one of your hole cards with one of your opponent\'s hole cards (random selection).',
    manaCost: 2,
    type: 'poker_spell',
    rarity: 'rare',
    heroClass: 'rogue',
    keywords: ['poker_spell'],
    flavorText: 'The swift one moves faster than the eye can follow.',
    collectible: true,
    pokerSpellEffect: {
      effectType: 'hole_swap',
      timing: 'pre_deal',
      duration: 'instant',
      targetSelf: true,
      targetOpponent: true,
      value: 1
    }
  },
  {
    // Changed from 9111 to 9161 to avoid conflict with Berserker card ID
    id: 9161,
    name: 'Echo Bet',
    description: 'Your next bet action this combat is repeated for free.',
    manaCost: 2,
    type: 'poker_spell',
    rarity: 'common',
    heroClass: 'rogue',
    keywords: ['poker_spell'],
    flavorText: 'The echo carries the same weight as the cry.',
    collectible: true,
    pokerSpellEffect: {
      effectType: 'echo_bet',
      timing: 'pre_deal',
      duration: 'next_action',
      targetSelf: true,
      targetOpponent: false
    }
  },
  {
    // Changed from 9112 to 9162 to avoid conflict with Berserker card ID
    id: 9162,
    name: 'Shadow Fold',
    description: 'If you fold this combat, your hand remains hidden from your opponent.',
    manaCost: 1,
    type: 'poker_spell',
    rarity: 'common',
    heroClass: 'rogue',
    keywords: ['poker_spell'],
    flavorText: 'Some secrets are best kept in darkness.',
    collectible: true,
    pokerSpellEffect: {
      effectType: 'shadow_fold',
      timing: 'pre_deal',
      duration: 'this_combat',
      targetSelf: true,
      targetOpponent: false
    }
  },

  // ==================== MAGE POKER SPELLS (9120-9129) ====================
  {
    id: 9120,
    name: 'Run It Twice',
    description: 'If an all-in is called this combat, deal community cards twice. Resolve with average hand strength.',
    manaCost: 3,
    type: 'poker_spell',
    rarity: 'rare',
    heroClass: 'mage',
    keywords: ['poker_spell'],
    flavorText: 'The Norns weave two threads of fate.',
    collectible: true,
    pokerSpellEffect: {
      effectType: 'run_twice',
      timing: 'on_all_in',
      duration: 'this_combat',
      targetSelf: true,
      targetOpponent: true
    }
  },
  {
    id: 9121,
    name: 'River Rewrite',
    description: 'After the River is revealed, you may reroll it once.',
    manaCost: 4,
    type: 'poker_spell',
    rarity: 'rare',
    heroClass: 'mage',
    keywords: ['poker_spell'],
    flavorText: 'Yggdrasil\'s roots can redirect even destiny.',
    collectible: true,
    pokerSpellEffect: {
      effectType: 'river_rewrite',
      timing: 'on_river',
      duration: 'instant',
      targetSelf: true,
      targetOpponent: false,
      value: 1
    }
  },
  {
    id: 9122,
    name: 'Norns\' Glimpse',
    description: 'Peek at the next community card before it is revealed.',
    manaCost: 2,
    type: 'poker_spell',
    rarity: 'common',
    heroClass: 'mage',
    keywords: ['poker_spell'],
    flavorText: 'Past, present, and future are one to those who weave them.',
    collectible: true,
    pokerSpellEffect: {
      effectType: 'norns_glimpse',
      timing: 'pre_deal',
      duration: 'this_combat',
      targetSelf: true,
      targetOpponent: false
    }
  },

  // ==================== WARLOCK POKER SPELLS (9130-9139) ====================
  {
    id: 9130,
    name: 'Fold Curse',
    description: 'If your opponent folds this combat, they lose 1 additional STA.',
    manaCost: 3,
    type: 'poker_spell',
    rarity: 'common',
    heroClass: 'warlock',
    keywords: ['poker_spell'],
    flavorText: 'Hel claims more than her due.',
    collectible: true,
    pokerSpellEffect: {
      effectType: 'fold_curse',
      timing: 'on_fold',
      duration: 'this_combat',
      targetSelf: false,
      targetOpponent: true,
      value: 1
    }
  },
  {
    id: 9131,
    name: 'Blood Bet',
    description: 'Pay 1 STA: Force your opponent to match your current bet or fold immediately.',
    manaCost: 2,
    type: 'poker_spell',
    rarity: 'rare',
    heroClass: 'warlock',
    keywords: ['poker_spell'],
    flavorText: 'Blood calls for blood.',
    collectible: true,
    pokerSpellEffect: {
      effectType: 'blood_bet',
      timing: 'on_bet',
      duration: 'instant',
      targetSelf: true,
      targetOpponent: true,
      value: 1
    }
  },
  {
    id: 9132,
    name: 'Void Stare',
    description: 'Nullify your opponent\'s next Bluff token activation this combat.',
    manaCost: 2,
    type: 'poker_spell',
    rarity: 'common',
    heroClass: 'warlock',
    keywords: ['poker_spell'],
    flavorText: 'The void sees through all illusions.',
    collectible: true,
    pokerSpellEffect: {
      effectType: 'void_stare',
      timing: 'pre_deal',
      duration: 'this_combat',
      targetSelf: false,
      targetOpponent: true
    }
  },

  // ==================== LEGENDARY POKER SPELLS (9140-9149) ====================
  {
    id: 9140,
    name: 'All-In Aura',
    description: 'Your next all-in deals +5 bonus damage if you win the showdown.',
    manaCost: 5,
    type: 'poker_spell',
    rarity: 'rare',
    heroClass: 'neutral',
    keywords: ['poker_spell'],
    flavorText: 'Muspelheim\'s flames burn brightest in the final gambit.',
    collectible: true,
    pokerSpellEffect: {
      effectType: 'all_in_aura',
      timing: 'on_all_in',
      duration: 'this_combat',
      targetSelf: true,
      targetOpponent: false,
      value: 5
    }
  },
  {
    id: 9141,
    name: 'Ragnarok Gambit',
    description: 'Reveal all hole cards for both players. Skip remaining betting phases and go directly to showdown.',
    manaCost: 4,
    type: 'poker_spell',
    rarity: 'rare',
    heroClass: 'neutral',
    keywords: ['poker_spell'],
    flavorText: 'When gods clash, there is no room for deception.',
    collectible: true,
    pokerSpellEffect: {
      effectType: 'ragnarok_gambit',
      timing: 'pre_deal',
      duration: 'instant',
      targetSelf: true,
      targetOpponent: true
    }
  },
  {
    id: 9142,
    name: 'Destiny Override',
    description: 'Choose the River card from 3 random options.',
    manaCost: 5,
    type: 'poker_spell',
    rarity: 'rare',
    heroClass: 'neutral',
    keywords: ['poker_spell'],
    flavorText: 'Even the Norns bow to the will of the Allfather.',
    collectible: true,
    pokerSpellEffect: {
      effectType: 'destiny_override',
      timing: 'on_river',
      duration: 'instant',
      targetSelf: true,
      targetOpponent: false,
      value: 3
    }
  }
];

export const getPokerSpellCards = (): PokerSpellCard[] => pokerSpellCards;

export const getPokerSpellById = (id: number): PokerSpellCard | undefined => {
  return pokerSpellCards.find(card => card.id === id);
};

export const getPokerSpellsByClass = (heroClass: string): PokerSpellCard[] => {
  return pokerSpellCards.filter(card => card.heroClass === heroClass);
};

export default pokerSpellCards;
