import type { PlayerCombatState, PokerCombatState } from '../types/PokerCombatTypes';
import { combatHpFromPlayer, playerWithCombatHp } from './playerCombatHp';
import {
	applyCombatHpChannelDelta,
	commitCombatHpChannel,
	growCombatHpChannelMax,
	openCombatHpBook,
	readCombatHpChannel,
	settleCombatHpChannel,
	uncommitCombatHpChannel,
	type CombatHpBook,
	type CombatHpChannelId,
	type CombatHpChannelWrite,
} from './combatHpBook';
import type { CombatHpTransition } from './combatHp';

export type PokerHpSlot = 'player' | 'opponent';

export type PokerHpWrite = {
	readonly state: PokerCombatState;
	readonly channelId: CombatHpChannelId;
	readonly transition: CombatHpTransition;
};

export function pokerHpChannelId(
	state: PokerCombatState,
	slot: PokerHpSlot,
): CombatHpChannelId {
	return slot === 'player' ? state.player.playerId : state.opponent.playerId;
}

export function openPokerHpBook(state: PokerCombatState): CombatHpBook | null {
	if (state.player.playerId === state.opponent.playerId) return null;
	return openCombatHpBook([
		{ channelId: state.player.playerId, account: combatHpFromPlayer(state.player) },
		{ channelId: state.opponent.playerId, account: combatHpFromPlayer(state.opponent) },
	]);
}

function participantForChannel(
	state: PokerCombatState,
	channelId: CombatHpChannelId,
): PlayerCombatState | null {
	if (state.player.playerId === channelId && state.opponent.playerId !== channelId) {
		return state.player;
	}
	if (state.opponent.playerId === channelId && state.player.playerId !== channelId) {
		return state.opponent;
	}
	return null;
}

export function writePokerHpBook(
	state: PokerCombatState,
	book: CombatHpBook,
): PokerCombatState | null {
	const playerAccount = readCombatHpChannel(book, state.player.playerId);
	const opponentAccount = readCombatHpChannel(book, state.opponent.playerId);
	if (!playerAccount || !opponentAccount) return null;
	if (state.player.playerId === state.opponent.playerId) return null;
	return {
		...state,
		player: playerWithCombatHp(state.player, playerAccount),
		opponent: playerWithCombatHp(state.opponent, opponentAccount),
	};
}

function applyPokerHpWrite(
	state: PokerCombatState,
	write: CombatHpChannelWrite | null,
): PokerHpWrite | null {
	if (!write) return null;
	if (!participantForChannel(state, write.channelId)) return null;
	const next = writePokerHpBook(state, write.book);
	if (!next) return null;
	return {
		state: next,
		channelId: write.channelId,
		transition: write.transition,
	};
}

export function applyPokerHpDelta(
	state: PokerCombatState,
	channelId: CombatHpChannelId,
	delta: number,
): PokerHpWrite | null {
	const book = openPokerHpBook(state);
	if (!book) return null;
	return applyPokerHpWrite(state, applyCombatHpChannelDelta(book, channelId, delta));
}

export function commitPokerHp(
	state: PokerCombatState,
	channelId: CombatHpChannelId,
	amount: number,
): PokerHpWrite | null {
	const book = openPokerHpBook(state);
	if (!book) return null;
	return applyPokerHpWrite(state, commitCombatHpChannel(book, channelId, amount));
}

export function uncommitPokerHp(
	state: PokerCombatState,
	channelId: CombatHpChannelId,
	amount: number,
): PokerHpWrite | null {
	const book = openPokerHpBook(state);
	if (!book) return null;
	return applyPokerHpWrite(state, uncommitCombatHpChannel(book, channelId, amount));
}

export function settlePokerHp(
	state: PokerCombatState,
	channelId: CombatHpChannelId,
	current: number,
): PokerHpWrite | null {
	const book = openPokerHpBook(state);
	if (!book) return null;
	return applyPokerHpWrite(state, settleCombatHpChannel(book, channelId, current));
}

export function growPokerHpMax(
	state: PokerCombatState,
	channelId: CombatHpChannelId,
	amount: number,
): PokerHpWrite | null {
	const book = openPokerHpBook(state);
	if (!book) return null;
	return applyPokerHpWrite(state, growCombatHpChannelMax(book, channelId, amount));
}

export function applyPokerHpDeltaOnSlot(
	state: PokerCombatState,
	slot: PokerHpSlot,
	delta: number,
): PokerHpWrite | null {
	return applyPokerHpDelta(state, pokerHpChannelId(state, slot), delta);
}

export function isOpponentHpChannel(
	state: PokerCombatState,
	channelId: CombatHpChannelId,
): boolean {
	return state.opponent.playerId === channelId && state.player.playerId !== channelId;
}

export function settleResolvedPokerHp(
	state: PokerCombatState,
	playerCurrent: number,
	opponentCurrent: number,
): PokerCombatState {
	const playerWrite = settlePokerHp(state, state.player.playerId, playerCurrent);
	const mid = playerWrite?.state ?? state;
	const opponentWrite = settlePokerHp(mid, mid.opponent.playerId, opponentCurrent);
	return opponentWrite?.state ?? mid;
}
