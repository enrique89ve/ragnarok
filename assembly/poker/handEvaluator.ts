/**
 * Poker hand evaluation for AssemblyScript.
 * Port of client/src/game/combat/modules/HandEvaluator.ts
 * Pure integer math, fully deterministic.
 */

import {
	PokerCard,
	EvaluatedHand,
	HAND_MULTIPLIERS_X100,
	RANK_HIGH_CARD,
	RANK_RUNE_MARK,
	RANK_DUAL_RUNES,
	RANK_THORS_HAMMER,
	RANK_FATES_PATH,
	RANK_ODINS_EYE,
	RANK_VALHALLAS_BLESSING,
	RANK_GODLY_POWER,
	RANK_DIVINE_ALIGNMENT,
	RANK_RAGNAROK,
} from '../types/PokerTypes';

/**
 * Sort cards for tie-breaking: grouped by count (pairs/trips first), then by value
 */
function sortForTiebreak(cards: PokerCard[]): PokerCard[] {
	// Count occurrences of each value
	const valueCounts = new Map<i32, i32>();
	for (let i = 0; i < cards.length; i++) {
		const v = cards[i].numericValue;
		valueCounts.set(v, (valueCounts.has(v) ? valueCounts.get(v) : 0) + 1);
	}

	const result = cards.slice(0);
	// Bubble sort: by count desc, then value desc
	for (let i = 0; i < result.length; i++) {
		for (let j = i + 1; j < result.length; j++) {
			const countI = valueCounts.get(result[i].numericValue);
			const countJ = valueCounts.get(result[j].numericValue);
			let swap = false;
			if (countJ > countI) swap = true;
			else if (countJ == countI && result[j].numericValue > result[i].numericValue) swap = true;
			if (swap) {
				const tmp = result[i];
				result[i] = result[j];
				result[j] = tmp;
			}
		}
	}
	return result;
}

/**
 * Sort cards by numeric value descending
 */
function sortByValueDesc(cards: PokerCard[]): PokerCard[] {
	const result = cards.slice(0);
	for (let i = 0; i < result.length; i++) {
		for (let j = i + 1; j < result.length; j++) {
			if (result[j].numericValue > result[i].numericValue) {
				const tmp = result[i];
				result[i] = result[j];
				result[j] = tmp;
			}
		}
	}
	return result;
}

/**
 * Evaluate a 5-card poker hand
 */
export function evaluateFiveCardHand(cards: PokerCard[]): EvaluatedHand {
	assert(cards.length == 5, 'Expected exactly 5 cards');

	const sorted = sortByValueDesc(cards);
	const values: i32[] = [];
	for (let i = 0; i < sorted.length; i++) {
		values.push(sorted[i].numericValue);
	}

	// Check flush
	let isFlush = true;
	const firstSuit = cards[0].suit;
	for (let i = 1; i < cards.length; i++) {
		if (cards[i].suit != firstSuit) {
			isFlush = false;
			break;
		}
	}

	// Check straight
	let isRegularStraight = true;
	for (let i = 1; i < values.length; i++) {
		if (values[i - 1] - values[i] != 1) {
			isRegularStraight = false;
			break;
		}
	}

	const isWheelStraight = values[0] == 14
		&& values[1] == 5
		&& values[2] == 4
		&& values[3] == 3
		&& values[4] == 2;

	const isStraight = isRegularStraight || isWheelStraight;

	// Count value occurrences
	const valueCounts = new Map<i32, i32>();
	for (let i = 0; i < cards.length; i++) {
		const v = cards[i].numericValue;
		valueCounts.set(v, (valueCounts.has(v) ? valueCounts.get(v) : 0) + 1);
	}

	// Get sorted counts (descending)
	const countVals = valueCounts.values();
	const counts: i32[] = [];
	for (let i = 0; i < countVals.length; i++) {
		counts.push(countVals[i]);
	}
	counts.sort((a: i32, b: i32): i32 => b - a);

	// Determine rank
	let rank: i32;
	if (isFlush && isStraight && values[0] == 14 && values[4] == 10) {
		rank = RANK_RAGNAROK;
	} else if (isFlush && isStraight) {
		rank = RANK_DIVINE_ALIGNMENT;
	} else if (counts[0] == 4) {
		rank = RANK_GODLY_POWER;
	} else if (counts[0] == 3 && counts[1] == 2) {
		rank = RANK_VALHALLAS_BLESSING;
	} else if (isFlush) {
		rank = RANK_ODINS_EYE;
	} else if (isStraight) {
		rank = RANK_FATES_PATH;
	} else if (counts[0] == 3) {
		rank = RANK_THORS_HAMMER;
	} else if (counts[0] == 2 && counts.length >= 2 && counts[1] == 2) {
		rank = RANK_DUAL_RUNES;
	} else if (counts[0] == 2) {
		rank = RANK_RUNE_MARK;
	} else {
		rank = RANK_HIGH_CARD;
	}

	// Effective high card (wheel straight → 5, not Ace)
	let highCardValue = sorted[0].numericValue;
	if (isWheelStraight) {
		highCardValue = 5;
	}

	// Build tiebreakers by count/value
	const tiebreakEntries: i32[][] = [];
	const keys = valueCounts.keys();
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		const entry: i32[] = [key, valueCounts.get(key)];
		tiebreakEntries.push(entry);
	}
	// Sort: by count desc, then value desc
	for (let i = 0; i < tiebreakEntries.length; i++) {
		for (let j = i + 1; j < tiebreakEntries.length; j++) {
			let swap = false;
			if (tiebreakEntries[j][1] > tiebreakEntries[i][1]) swap = true;
			else if (tiebreakEntries[j][1] == tiebreakEntries[i][1]
				&& tiebreakEntries[j][0] > tiebreakEntries[i][0]) swap = true;
			if (swap) {
				const tmp = tiebreakEntries[i];
				tiebreakEntries[i] = tiebreakEntries[j];
				tiebreakEntries[j] = tmp;
			}
		}
	}

	let tieBreakers: i32[] = [];

	if (rank == RANK_RAGNAROK || rank == RANK_DIVINE_ALIGNMENT) {
		tieBreakers = [isWheelStraight ? 5 : values[0]];
	} else if (rank == RANK_GODLY_POWER) {
		tieBreakers = [tiebreakEntries[0][0], tiebreakEntries[1][0]];
	} else if (rank == RANK_VALHALLAS_BLESSING) {
		tieBreakers = [tiebreakEntries[0][0], tiebreakEntries[1][0]];
	} else if (rank == RANK_ODINS_EYE) {
		tieBreakers = values.slice(0);
	} else if (rank == RANK_FATES_PATH) {
		tieBreakers = [isWheelStraight ? 5 : values[0]];
	} else if (rank == RANK_THORS_HAMMER) {
		tieBreakers = [tiebreakEntries[0][0]];
		for (let i = 1; i < tiebreakEntries.length; i++) {
			tieBreakers.push(tiebreakEntries[i][0]);
		}
	} else if (rank == RANK_DUAL_RUNES) {
		// Find the two pairs and kicker
		const pairs: i32[] = [];
		let kicker: i32 = 0;
		for (let i = 0; i < tiebreakEntries.length; i++) {
			if (tiebreakEntries[i][1] == 2) pairs.push(tiebreakEntries[i][0]);
			else kicker = tiebreakEntries[i][0];
		}
		pairs.sort((a: i32, b: i32): i32 => b - a);
		tieBreakers = [pairs[0], pairs[1], kicker];
	} else if (rank == RANK_RUNE_MARK) {
		tieBreakers = [tiebreakEntries[0][0]];
		for (let i = 1; i < tiebreakEntries.length; i++) {
			tieBreakers.push(tiebreakEntries[i][0]);
		}
	} else {
		// High card: all values descending
		tieBreakers = values.slice(0);
	}

	const tiebreakSorted = sortForTiebreak(cards);

	const hand = new EvaluatedHand();
	hand.rank = rank;
	hand.cards = tiebreakSorted;
	hand.highCardValue = highCardValue;
	hand.multiplierX100 = rank >= 1 && rank <= 10 ? HAND_MULTIPLIERS_X100[rank] : 100;
	hand.tieBreakers = tieBreakers;
	return hand;
}

/**
 * Internal compare: positive if hand1 > hand2, negative if hand1 < hand2, 0 if equal
 */
function compareHandsInternal(hand1: EvaluatedHand, hand2: EvaluatedHand): i32 {
	if (hand1.rank != hand2.rank) {
		return hand1.rank - hand2.rank;
	}

	// Straights/straight flushes: compare only by high card
	if (hand1.rank == RANK_FATES_PATH || hand1.rank == RANK_DIVINE_ALIGNMENT) {
		return hand1.highCardValue - hand2.highCardValue;
	}

	// Compare tiebreak-sorted cards
	const cards1 = hand1.cards;
	const cards2 = hand2.cards;
	const len = cards1.length < cards2.length ? cards1.length : cards2.length;
	for (let i = 0; i < len; i++) {
		if (cards1[i].numericValue != cards2[i].numericValue) {
			return cards1[i].numericValue - cards2[i].numericValue;
		}
	}
	return 0;
}

/**
 * Find best 5-card hand from hole cards + community cards (typically 7 total)
 */
export function findBestHand(holeCards: PokerCard[], communityCards: PokerCard[]): EvaluatedHand {
	const allCards: PokerCard[] = [];
	for (let i = 0; i < holeCards.length; i++) allCards.push(holeCards[i]);
	for (let i = 0; i < communityCards.length; i++) allCards.push(communityCards[i]);

	if (allCards.length < 5) {
		const sorted = sortByValueDesc(allCards);
		const hand = new EvaluatedHand();
		hand.rank = RANK_HIGH_CARD;
		hand.cards = sorted;
		hand.highCardValue = sorted.length > 0 ? sorted[0].numericValue : 0;
		hand.multiplierX100 = 100;
		const tb: i32[] = [];
		for (let i = 0; i < sorted.length; i++) tb.push(sorted[i].numericValue);
		hand.tieBreakers = tb;
		return hand;
	}

	let bestHand: EvaluatedHand | null = null;

	// Iterate all C(n,5) combinations
	for (let i = 0; i < allCards.length - 4; i++) {
		for (let j = i + 1; j < allCards.length - 3; j++) {
			for (let k = j + 1; k < allCards.length - 2; k++) {
				for (let l = k + 1; l < allCards.length - 1; l++) {
					for (let m = l + 1; m < allCards.length; m++) {
						const combo: PokerCard[] = [
							allCards[i], allCards[j], allCards[k], allCards[l], allCards[m]
						];
						const evaluated = evaluateFiveCardHand(combo);

						if (bestHand == null) {
							bestHand = evaluated;
						} else {
							if (compareHandsInternal(evaluated, bestHand!) > 0) {
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
 * Compare two hands: 1 if hand1 wins, -1 if hand2 wins, 0 for tie
 */
export function compareHands(hand1: EvaluatedHand, hand2: EvaluatedHand): i32 {
	if (hand1.rank > hand2.rank) return 1;
	if (hand1.rank < hand2.rank) return -1;

	// Straights: compare only high card
	if (hand1.rank == RANK_FATES_PATH || hand1.rank == RANK_DIVINE_ALIGNMENT) {
		if (hand1.highCardValue > hand2.highCardValue) return 1;
		if (hand1.highCardValue < hand2.highCardValue) return -1;
		return 0;
	}

	// Compare tiebreak-sorted cards
	const cards1 = hand1.cards;
	const cards2 = hand2.cards;
	const len = cards1.length < cards2.length ? cards1.length : cards2.length;
	for (let i = 0; i < len; i++) {
		if (cards1[i].numericValue > cards2[i].numericValue) return 1;
		if (cards1[i].numericValue < cards2[i].numericValue) return -1;
	}
	return 0;
}

/**
 * Hand strength as integer 0-100 (used for AI decisions)
 */
export function calculateHandStrength(holeCards: PokerCard[], communityCards: PokerCard[]): i32 {
	if (holeCards.length < 2) return 0;

	const allCards: PokerCard[] = [];
	for (let i = 0; i < holeCards.length; i++) allCards.push(holeCards[i]);
	for (let i = 0; i < communityCards.length; i++) allCards.push(communityCards[i]);

	// Post-flop: evaluate actual hand
	if (allCards.length >= 5) {
		const hand = findBestHand(holeCards, communityCards);
		// Lookup table for base strength (0-100 scale)
		const STRENGTH_MAP: i32[] = [
			0,   // index 0
			10,  // HIGH_CARD
			25,  // RUNE_MARK
			40,  // DUAL_RUNES
			55,  // THORS_HAMMER
			65,  // FATES_PATH
			75,  // ODINS_EYE
			85,  // VALHALLAS_BLESSING
			92,  // GODLY_POWER
			97,  // DIVINE_ALIGNMENT
			100, // RAGNAROK
		];
		const base = hand.rank >= 1 && hand.rank <= 10 ? STRENGTH_MAP[hand.rank] : 10;
		const kickerBonus = ((hand.highCardValue - 2) * 5) / 12;
		const total = base + kickerBonus;
		return total > 100 ? 100 : total;
	}

	// Pre-flop: modified Chen formula
	const c1 = holeCards[0].numericValue;
	const c2 = holeCards[1].numericValue;
	let strength: i32 = 0;

	const highCard = c1 > c2 ? c1 : c2;
	strength += ((highCard - 2) * 30) / 12;

	// Pocket pair bonus
	if (c1 == c2) {
		strength += 40 + (c1 * 20) / 14;
	}

	// Suited bonus
	if (holeCards[0].suit == holeCards[1].suit) {
		strength += 12;
	}

	// Connected bonus
	let gap = c1 - c2;
	if (gap < 0) gap = -gap;
	if (gap == 1) strength += 10;
	else if (gap == 2) strength += 6;
	else if (gap == 3) strength += 3;

	return strength > 100 ? 100 : strength;
}
