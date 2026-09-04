import { sha256 as nobleSha256 } from '@noble/hashes/sha2.js';
import type { CombatResolution } from '../../types/PokerCombatTypes';
import type { GrantPokerHandRewardsCommand } from './gameCommandTypes';

const TEXT_ENCODER = new TextEncoder();
const HEX = '0123456789abcdef';

export function createPokerHandRewardsCommand(input: {
	readonly matchId: string;
	readonly combatId: string;
	readonly handIndex: number;
	readonly resolution: Pick<CombatResolution, 'wagerDrawPlayer' | 'wagerDrawOpponent' | 'wagerAoeDamagePlayer' | 'wagerAoeDamageOpponent'>;
	readonly allInShowdown: boolean;
}): GrantPokerHandRewardsCommand {
	return {
		type: 'grant_poker_hand_rewards',
		combatId: input.combatId,
		handIndex: input.handIndex,
		rewardId: derivePokerHandRewardId(input.matchId, input.combatId, input.handIndex),
		wagerDrawPlayer: input.resolution.wagerDrawPlayer ?? 0,
		wagerDrawOpponent: input.resolution.wagerDrawOpponent ?? 0,
		wagerAoeDamagePlayer: input.resolution.wagerAoeDamagePlayer ?? 0,
		wagerAoeDamageOpponent: input.resolution.wagerAoeDamageOpponent ?? 0,
		allInShowdown: input.allInShowdown,
	};
}

export function derivePokerHandRewardId(matchId: string, combatId: string, handIndex: number): string {
	return sha256Hex(`${matchId}:${combatId}:${handIndex}:poker-reward-v1`);
}

function sha256Hex(value: string): string {
	const bytes = nobleSha256(TEXT_ENCODER.encode(value));
	let result = '';
	for (const byte of bytes) result += HEX[(byte >>> 4) & 0xf] + HEX[byte & 0xf];
	return result;
}
