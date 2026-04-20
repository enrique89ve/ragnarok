/**
 * battleHistory/types.ts
 *
 * Types for battle history tracking.
 * 
 * Added from Enrique's fork - Jan 31, 2026
 */

export interface BattleHistoryEntry {
	id: string;
	timestamp: number;
	duration: number;
	turns: number;
	result: 'win' | 'loss' | 'draw' | 'incomplete';
	
	// Player info
	playerHero: string;
	playerHeroClass: string;
	
	// Opponent info
	opponentHero: string;
	opponentHeroClass: string;
	opponentType: 'ai' | 'human';
	
	// Stats
	pokerHandsWon: number;
	pokerHandsLost: number;
	chessPiecesCaptured: number;
	chessPiecesLost: number;
	damageDealt: number;
	damageReceived: number;
	cardsPlayed: number;
	minionsKilled: number;
	
	// Optional metadata
	mode?: 'pvp' | 'pve' | 'practice';
	notes?: string;
}

export interface BattleHistoryState {
	battles: BattleHistoryEntry[];
	currentBattleId: string | null;
}
