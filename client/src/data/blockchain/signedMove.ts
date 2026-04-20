/**
 * signedMove.ts - Game move records for Merkle transcript proof
 *
 * During gameplay, every action (playCard, attack, endTurn, useHeroPower)
 * is recorded as a GameMove. At game end the TranscriptBuilder hashes all
 * moves into a Merkle tree whose root is embedded in the match_result.
 *
 * Individual moves are NOT signed via Keychain (that would require a popup
 * per move). Instead the Merkle root is signed once at game end as part of
 * the dual-signature match result flow.
 */

export interface GameMove {
	moveNumber: number;
	action: string;
	payload: Record<string, unknown>;
	playerId: string;
	timestamp: number;
}

export interface MoveRecord extends GameMove {
	hash: string;
	stateHashAfter?: string;
	hiveBlockRef?: string;
}

export interface MerkleProof {
	leafHash: string;
	siblings: Array<{ hash: string; position: 'left' | 'right' }>;
	root: string;
}
