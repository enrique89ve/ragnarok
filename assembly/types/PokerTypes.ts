/**
 * Poker combat types for AssemblyScript.
 * Mirrors client/src/game/types/PokerCombatTypes.ts
 */

// Card suits as integer constants
export const SUIT_SPADES: i32 = 0;
export const SUIT_HEARTS: i32 = 1;
export const SUIT_DIAMONDS: i32 = 2;
export const SUIT_CLUBS: i32 = 3;

export class PokerCard {
	suit: i32;         // 0=spades, 1=hearts, 2=diamonds, 3=clubs
	numericValue: i32; // 2-14 (A=14)

	constructor(suit: i32, numericValue: i32) {
		this.suit = suit;
		this.numericValue = numericValue;
	}
}

// Hand ranks (matches PokerHandRank enum)
export const RANK_HIGH_CARD: i32 = 1;
export const RANK_RUNE_MARK: i32 = 2;          // One Pair
export const RANK_DUAL_RUNES: i32 = 3;         // Two Pair
export const RANK_THORS_HAMMER: i32 = 4;       // Three of a Kind
export const RANK_FATES_PATH: i32 = 5;         // Straight
export const RANK_ODINS_EYE: i32 = 6;          // Flush
export const RANK_VALHALLAS_BLESSING: i32 = 7; // Full House
export const RANK_GODLY_POWER: i32 = 8;        // Four of a Kind
export const RANK_DIVINE_ALIGNMENT: i32 = 9;   // Straight Flush
export const RANK_RAGNAROK: i32 = 10;          // Royal Flush

/**
 * Damage multipliers × 100 (integer math to avoid floating point).
 * Index by hand rank (1-10). Index 0 unused.
 */
export const HAND_MULTIPLIERS_X100: i32[] = [
	0,    // index 0 (unused)
	100,  // HIGH_CARD       = 1.0×
	105,  // RUNE_MARK       = 1.05×
	110,  // DUAL_RUNES      = 1.1×
	115,  // THORS_HAMMER    = 1.15×
	120,  // FATES_PATH      = 1.2×
	130,  // ODINS_EYE       = 1.3×
	140,  // VALHALLAS_BLESSING = 1.4×
	160,  // GODLY_POWER     = 1.6×
	180,  // DIVINE_ALIGNMENT = 1.8×
	200,  // RAGNAROK        = 2.0×
];

export class EvaluatedHand {
	rank: i32;
	cards: PokerCard[];
	highCardValue: i32;
	multiplierX100: i32;
	tieBreakers: i32[];

	constructor() {
		this.rank = RANK_HIGH_CARD;
		this.cards = [];
		this.highCardValue = 0;
		this.multiplierX100 = 100;
		this.tieBreakers = [];
	}
}

// Combat phases
export const PHASE_FIRST_STRIKE: i32 = 0;
export const PHASE_MULLIGAN: i32 = 1;
export const PHASE_SPELL_PET: i32 = 2;
export const PHASE_PRE_FLOP: i32 = 3;
export const PHASE_FAITH: i32 = 4;     // Flop (3 cards)
export const PHASE_FORESIGHT: i32 = 5; // Turn (4th card)
export const PHASE_DESTINY: i32 = 6;   // River (5th card)
export const PHASE_RESOLUTION: i32 = 7;

// Combat actions
export const ACTION_ATTACK: i32 = 0;         // Bet
export const ACTION_COUNTER_ATTACK: i32 = 1; // Raise
export const ACTION_ENGAGE: i32 = 2;         // Call
export const ACTION_BRACE: i32 = 3;          // Fold
export const ACTION_DEFEND: i32 = 4;         // Check

// Betting round types
export const ROUND_PREFLOP: i32 = 0;
export const ROUND_FLOP: i32 = 1;
export const ROUND_TURN: i32 = 2;
export const ROUND_RIVER: i32 = 3;

export class BettingState {
	pot: i32;
	playerBet: i32;
	opponentBet: i32;
	minBet: i32;
	lastAggressor: i32; // -1=none, 0=player, 1=opponent
	roundComplete: bool;
	playerActed: bool;
	opponentActed: bool;

	constructor() {
		this.pot = 0;
		this.playerBet = 0;
		this.opponentBet = 0;
		this.minBet = 5;
		this.lastAggressor = -1;
		this.roundComplete = false;
		this.playerActed = false;
		this.opponentActed = false;
	}
}

/** Calculate final damage using integer math (no floating point) */
export function calculateFinalDamage(
	baseAttack: i32,
	hpBet: i32,
	handRank: i32,
	extraDamage: i32
): i32 {
	const multiplier = handRank >= 1 && handRank <= 10
		? HAND_MULTIPLIERS_X100[handRank]
		: 100;
	return ((baseAttack + hpBet) * multiplier) / 100 + extraDamage;
}

/** Create a standard 52-card poker deck */
export function createPokerDeck(): PokerCard[] {
	const deck: PokerCard[] = [];
	for (let suit: i32 = 0; suit < 4; suit++) {
		for (let value: i32 = 2; value <= 14; value++) {
			deck.push(new PokerCard(suit, value));
		}
	}
	return deck;
}
