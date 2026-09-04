import { sha256 as nobleSha256 } from '@noble/hashes/sha2.js';
import type { CombatResolution } from '../../types/PokerCombatTypes';
import type { GameState } from '../../types';
import type { GrantPokerHandRewardsCommand } from './gameCommandTypes';

const TEXT_ENCODER = new TextEncoder();
const HEX = '0123456789abcdef';

export type PokerRewardCommitRegistration = 'already_applied' | 'pending';

export type PokerRewardAuthorityValues = Readonly<{
	readonly wagerDrawPlayer: number;
	readonly wagerDrawOpponent: number;
	readonly wagerAoeDamagePlayer: number;
	readonly wagerAoeDamageOpponent: number;
	readonly allInShowdown: boolean;
}>;

type PokerRewardResolutionSnapshot = Readonly<{
	readonly combatId: string;
	readonly handIndex: number;
	readonly allInShowdown: boolean;
	readonly resolution: Pick<CombatResolution, 'wagerDrawPlayer' | 'wagerDrawOpponent' | 'wagerAoeDamagePlayer' | 'wagerAoeDamageOpponent'>;
}>;

export function derivePokerRewardAuthority(
	resolution: Pick<CombatResolution, 'wagerDrawPlayer' | 'wagerDrawOpponent' | 'wagerAoeDamagePlayer' | 'wagerAoeDamageOpponent'>,
	allInShowdown: boolean,
): PokerRewardAuthorityValues {
	return {
		wagerDrawPlayer: resolution.wagerDrawPlayer ?? 0,
		wagerDrawOpponent: resolution.wagerDrawOpponent ?? 0,
		wagerAoeDamagePlayer: resolution.wagerAoeDamagePlayer ?? 0,
		wagerAoeDamageOpponent: resolution.wagerAoeDamageOpponent ?? 0,
		allInShowdown,
	};
}

/** Compare a wire reward to the locally resolved Poker hand. */
export function validatePokerRewardAuthority(
	command: GrantPokerHandRewardsCommand,
	resolvedHand: PokerRewardResolutionSnapshot | null,
): string | null {
	if (!resolvedHand) return 'local poker resolution unavailable';
	if (command.combatId !== resolvedHand.combatId || command.handIndex !== resolvedHand.handIndex) {
		return 'poker reward resolution identity mismatch';
	}
	const expected = derivePokerRewardAuthority(resolvedHand.resolution, resolvedHand.allInShowdown);
	if (
		command.wagerDrawPlayer !== expected.wagerDrawPlayer
		|| command.wagerDrawOpponent !== expected.wagerDrawOpponent
		|| command.wagerAoeDamagePlayer !== expected.wagerAoeDamagePlayer
		|| command.wagerAoeDamageOpponent !== expected.wagerAoeDamageOpponent
		|| command.allInShowdown !== expected.allInShowdown
	) return 'poker reward values do not match local resolution';
	return null;
}

/** Replace transport-provided reward values with the verified local values. */
export function applyPokerRewardAuthority(
	command: GrantPokerHandRewardsCommand,
	resolvedHand: PokerRewardResolutionSnapshot,
): GrantPokerHandRewardsCommand {
	return {
		...command,
		...derivePokerRewardAuthority(resolvedHand.resolution, resolvedHand.allInShowdown),
	};
}

/**
 * Register the remote callback only while the canonical reward is genuinely
 * absent. A local state update can win the race before the remote receipt is
 * delivered, in which case the callback must settle immediately.
 */
export function registerPokerRewardCommit(input: {
	readonly rewardId: string;
	readonly gameState: Pick<GameState, 'pokerRewardIds'> | null;
	readonly pending: Map<string, () => void>;
	readonly onCommitted: () => void;
}): PokerRewardCommitRegistration {
	if (input.gameState?.pokerRewardIds?.includes(input.rewardId)) {
		input.onCommitted();
		return 'already_applied';
	}
	input.pending.set(input.rewardId, input.onCommitted);
	return 'pending';
}

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
		...derivePokerRewardAuthority(input.resolution, input.allInShowdown),
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
