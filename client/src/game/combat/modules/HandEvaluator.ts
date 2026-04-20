/**
 * HandEvaluator.ts
 * 
 * Modular poker hand evaluation system.
 * Evaluates 5-card hands and finds best hand from 7 cards.
 */

import {
  PokerCard,
  EvaluatedHand,
  PokerHandRank,
  HAND_RANK_NAMES
} from '../../types/PokerCombatTypes';
import { debug } from '../../config/debugConfig';

/**
 * Evaluate a 5-card poker hand and return its rank
 */
/**
 * Sort cards for proper tie-breaking: grouped by count (pairs/trips first), then by value
 * This ensures pair of Queens beats pair of 7s even if 7s has Ace kicker
 */
function sortForTiebreak(cards: PokerCard[]): PokerCard[] {
  const valueCounts: Record<number, number> = {};
  for (const card of cards) {
    valueCounts[card.numericValue] = (valueCounts[card.numericValue] || 0) + 1;
  }
  
  return [...cards].sort((a, b) => {
    const countA = valueCounts[a.numericValue];
    const countB = valueCounts[b.numericValue];
    if (countA !== countB) return countB - countA;
    return b.numericValue - a.numericValue;
  });
}

export function evaluateFiveCardHand(cards: PokerCard[]): EvaluatedHand {
  if (cards.length !== 5) {
    throw new Error(`Expected 5 cards, got ${cards.length}`);
  }
  
  const sorted = [...cards].sort((a, b) => b.numericValue - a.numericValue);
  
  const isFlush = cards.every(c => c.suit === cards[0].suit);
  const values = sorted.map(c => c.numericValue);
  
  const isRegularStraight = values.every((v, i) => i === 0 || values[i - 1] - v === 1);
  const isWheelStraight = values[0] === 14 && 
    values[1] === 5 && 
    values[2] === 4 && 
    values[3] === 3 && 
    values[4] === 2;
  
  const isStraight = isRegularStraight || isWheelStraight;
  
  const valueCounts: Record<number, number> = {};
  for (const card of cards) {
    valueCounts[card.numericValue] = (valueCounts[card.numericValue] || 0) + 1;
  }
  const counts = Object.values(valueCounts).sort((a, b) => b - a);
  
  let rank: PokerHandRank;
  
  if (isFlush && isStraight && values[0] === 14 && values[4] === 10) {
    rank = PokerHandRank.RAGNAROK;
  } else if (isFlush && isStraight) {
    rank = PokerHandRank.DIVINE_ALIGNMENT;
  } else if (counts[0] === 4) {
    rank = PokerHandRank.GODLY_POWER;
  } else if (counts[0] === 3 && counts[1] === 2) {
    rank = PokerHandRank.VALHALLAS_BLESSING;
  } else if (isFlush) {
    rank = PokerHandRank.ODINS_EYE;
  } else if (isStraight) {
    rank = PokerHandRank.FATES_PATH;
  } else if (counts[0] === 3) {
    rank = PokerHandRank.THORS_HAMMER;
  } else if (counts[0] === 2 && counts[1] === 2) {
    rank = PokerHandRank.DUAL_RUNES;
  } else if (counts[0] === 2) {
    rank = PokerHandRank.RUNE_MARK;
  } else {
    rank = PokerHandRank.HIGH_CARD;
  }
  
  // For wheel straights (A-2-3-4-5), the high card should be 5, not Ace
  // This ensures correct tie-breaking where 6-high straight beats 5-high (wheel)
  let effectiveHighCard = sorted[0];
  if (isWheelStraight) {
    effectiveHighCard = sorted.find(c => c.numericValue === 5) || sorted[0];
  }
  
  // Sort cards for proper tie-breaking: pairs/trips first, then kickers by value
  const tiebreakSorted = sortForTiebreak(cards);
  
  // Build tiebreakers based on hand type
  const tiebreakValuesByCount = Object.entries(valueCounts)
    .map(([val, cnt]) => ({ value: parseInt(val), count: cnt }))
    .sort((a, b) => b.count - a.count || b.value - a.value);
  
  let tieBreakers: number[] = [];
  const tiebreakValues = sorted.map(c => c.numericValue);
  
  if (rank === PokerHandRank.RAGNAROK || rank === PokerHandRank.DIVINE_ALIGNMENT) {
    tieBreakers = [isWheelStraight ? 5 : tiebreakValues[0]];
  } else if (rank === PokerHandRank.GODLY_POWER) {
    tieBreakers = [tiebreakValuesByCount[0].value, tiebreakValuesByCount[1].value];
  } else if (rank === PokerHandRank.VALHALLAS_BLESSING) {
    tieBreakers = [tiebreakValuesByCount[0].value, tiebreakValuesByCount[1].value];
  } else if (rank === PokerHandRank.ODINS_EYE) {
    tieBreakers = tiebreakValues;
  } else if (rank === PokerHandRank.FATES_PATH) {
    tieBreakers = [isWheelStraight ? 5 : tiebreakValues[0]];
  } else if (rank === PokerHandRank.THORS_HAMMER) {
    tieBreakers = [tiebreakValuesByCount[0].value, ...tiebreakValuesByCount.slice(1).map(v => v.value)];
  } else if (rank === PokerHandRank.DUAL_RUNES) {
    const pairs = tiebreakValuesByCount.filter(v => v.count === 2).map(v => v.value).sort((a, b) => b - a);
    const kicker = tiebreakValuesByCount.find(v => v.count === 1)?.value || 0;
    tieBreakers = [pairs[0], pairs[1], kicker];
  } else if (rank === PokerHandRank.RUNE_MARK) {
    tieBreakers = [tiebreakValuesByCount[0].value, ...tiebreakValuesByCount.slice(1).map(v => v.value)];
  } else {
    tieBreakers = tiebreakValues;
  }
  
  return {
    rank,
    cards: tiebreakSorted,
    highCard: effectiveHighCard,
    multiplier: 1,
    displayName: HAND_RANK_NAMES[rank],
    tieBreakers
  };
}

/**
 * Find the best 5-card hand from any number of cards (typically 7)
 */
export function findBestHand(holeCards: PokerCard[], communityCards: PokerCard[]): EvaluatedHand {
  const allCards = [...holeCards, ...communityCards];
  
  if (allCards.length < 5) {
    const sortedCards = allCards.sort((a, b) => b.numericValue - a.numericValue);
    if (sortedCards.length === 0) {
      debug.warn('[HandEvaluator] findBestHand called with 0 cards — returning fallback High Card');
      return {
        rank: PokerHandRank.HIGH_CARD,
        cards: [],
        highCard: { suit: 'hearts', value: '2', numericValue: 2 } as PokerCard,
        multiplier: 1.0,
        displayName: 'High Card',
        tieBreakers: []
      };
    }
    return {
      rank: PokerHandRank.HIGH_CARD,
      cards: sortedCards,
      highCard: sortedCards[0],
      multiplier: 1.0,
      displayName: 'High Card',
      tieBreakers: sortedCards.map(c => c.numericValue)
    };
  }
  
  let bestHand: EvaluatedHand | null = null;
  
  for (let i = 0; i < allCards.length - 4; i++) {
    for (let j = i + 1; j < allCards.length - 3; j++) {
      for (let k = j + 1; k < allCards.length - 2; k++) {
        for (let l = k + 1; l < allCards.length - 1; l++) {
          for (let m = l + 1; m < allCards.length; m++) {
            const hand = [allCards[i], allCards[j], allCards[k], allCards[l], allCards[m]];
            const evaluated = evaluateFiveCardHand(hand);
            
            if (!bestHand) {
              bestHand = evaluated;
            } else {
              // Use full kicker comparison for accurate tie-breaking
              const comparison = compareHandsInternal(evaluated, bestHand);
              if (comparison > 0) {
                bestHand = evaluated;
              }
            }
          }
        }
      }
    }
  }
  
  return bestHand!;
}

/**
 * Internal compare function to avoid circular dependency
 * Returns positive if hand1 > hand2, negative if hand1 < hand2, 0 if equal
 */
function compareHandsInternal(hand1: EvaluatedHand, hand2: EvaluatedHand): number {
  if (hand1.rank !== hand2.rank) {
    return hand1.rank - hand2.rank;
  }
  
  // For straights and straight flushes, compare only by the effective high card
  const straightRanks = [PokerHandRank.FATES_PATH, PokerHandRank.DIVINE_ALIGNMENT];
  if (straightRanks.includes(hand1.rank)) {
    return hand1.highCard.numericValue - hand2.highCard.numericValue;
  }
  
  // Cards are already sorted for tiebreak (pairs/trips first, then kickers by value)
  const cards1 = hand1.cards;
  const cards2 = hand2.cards;
  
  for (let i = 0; i < Math.min(cards1.length, cards2.length); i++) {
    if (cards1[i].numericValue !== cards2[i].numericValue) {
      return cards1[i].numericValue - cards2[i].numericValue;
    }
  }
  
  return 0;
}

/**
 * Normalized hand rank strengths (0-1 scale)
 * Based on relative hand frequencies in poker
 */
const HAND_STRENGTH_MAP: Record<PokerHandRank, number> = {
  [PokerHandRank.HIGH_CARD]: 0.10,
  [PokerHandRank.RUNE_MARK]: 0.25,
  [PokerHandRank.DUAL_RUNES]: 0.40,
  [PokerHandRank.THORS_HAMMER]: 0.55,
  [PokerHandRank.FATES_PATH]: 0.65,
  [PokerHandRank.ODINS_EYE]: 0.75,
  [PokerHandRank.VALHALLAS_BLESSING]: 0.85,
  [PokerHandRank.GODLY_POWER]: 0.92,
  [PokerHandRank.DIVINE_ALIGNMENT]: 0.97,
  [PokerHandRank.RAGNAROK]: 1.00
};

/**
 * Calculate hand strength as a percentage (0-1)
 * Used for AI decision making
 * Uses normalized lookup table for made hands, Chen formula for hole cards
 */
export function calculateHandStrength(holeCards: PokerCard[], communityCards: PokerCard[]): number {
  if (holeCards.length < 2) return 0;
  
  const allCards = [...holeCards, ...communityCards];
  
  // If we have 5+ cards, evaluate the actual hand
  if (allCards.length >= 5) {
    const hand = findBestHand(holeCards, communityCards);
    const baseStrength = HAND_STRENGTH_MAP[hand.rank] || 0.1;
    // Add small bonus for high cards within the hand
    const kickerBonus = (hand.highCard.numericValue - 2) / 12 * 0.05;
    return Math.min(1, baseStrength + kickerBonus);
  }
  
  // Pre-flop: Use modified Chen formula for hole card strength
  const card1 = holeCards[0];
  const card2 = holeCards[1];
  
  let strength = 0;
  
  // High card value (A=14 worth more)
  const highCard = Math.max(card1.numericValue, card2.numericValue);
  strength += (highCard - 2) / 12 * 0.3;
  
  // Pocket pairs are very strong pre-flop
  if (card1.numericValue === card2.numericValue) {
    // AA = ~0.85, 22 = ~0.55
    strength += 0.4 + (card1.numericValue / 14) * 0.2;
  }
  
  // Suited cards have flush potential
  if (card1.suit === card2.suit) {
    strength += 0.12;
  }
  
  // Connected cards have straight potential
  const gap = Math.abs(card1.numericValue - card2.numericValue);
  if (gap === 1) {
    strength += 0.10;
  } else if (gap === 2) {
    strength += 0.06;
  } else if (gap === 3) {
    strength += 0.03;
  }
  
  return Math.min(1, strength);
}

/**
 * Compare two hands, return 1 if hand1 wins, -1 if hand2 wins, 0 for tie
 * Uses tiebreak-sorted card order (pairs/trips first, then kickers)
 * Special handling for straights which are compared by their high card only
 */
export function compareHands(hand1: EvaluatedHand, hand2: EvaluatedHand): -1 | 0 | 1 {
  if (hand1.rank > hand2.rank) return 1;
  if (hand1.rank < hand2.rank) return -1;
  
  // For straights and straight flushes, compare only by the effective high card
  // (wheel straights already have highCard set to 5)
  const straightRanks = [PokerHandRank.FATES_PATH, PokerHandRank.DIVINE_ALIGNMENT];
  if (straightRanks.includes(hand1.rank)) {
    if (hand1.highCard.numericValue > hand2.highCard.numericValue) return 1;
    if (hand1.highCard.numericValue < hand2.highCard.numericValue) return -1;
    return 0;
  }
  
  // Cards are already sorted for tiebreak (pairs/trips first, then kickers by value)
  // Just compare them in order
  const cards1 = hand1.cards;
  const cards2 = hand2.cards;
  
  for (let i = 0; i < Math.min(cards1.length, cards2.length); i++) {
    if (cards1[i].numericValue > cards2[i].numericValue) return 1;
    if (cards1[i].numericValue < cards2[i].numericValue) return -1;
  }
  
  return 0;
}
