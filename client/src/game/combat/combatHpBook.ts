import {
	applyCombatHpDelta,
	commitCombatHp,
	growCombatHpMax,
	readCombatHp,
	settleCombatHp,
	uncommitCombatHp,
	type CombatHpAccount,
	type CombatHpTransition,
} from './combatHp';

export type CombatHpChannelId = string;

export type CombatHpBook = {
	readonly channels: Readonly<Record<CombatHpChannelId, CombatHpAccount>>;
};

export type CombatHpChannelWrite = {
	readonly book: CombatHpBook;
	readonly channelId: CombatHpChannelId;
	readonly transition: CombatHpTransition;
};

export function openCombatHpBook(
	participants: readonly { channelId: CombatHpChannelId; account: CombatHpAccount }[],
): CombatHpBook | null {
	const channels: Record<CombatHpChannelId, CombatHpAccount> = {};
	for (const participant of participants) {
		if (!participant.channelId) return null;
		if (channels[participant.channelId]) return null;
		channels[participant.channelId] = readCombatHp(participant.account);
	}
	return { channels };
}

export function readCombatHpChannel(
	book: CombatHpBook,
	channelId: CombatHpChannelId,
): CombatHpAccount | null {
	const account = book.channels[channelId];
	return account ? readCombatHp(account) : null;
}

function writeCombatHpChannel(
	book: CombatHpBook,
	channelId: CombatHpChannelId,
	transition: CombatHpTransition,
): CombatHpChannelWrite | null {
	if (!book.channels[channelId]) return null;
	return {
		book: {
			channels: {
				...book.channels,
				[channelId]: transition.after,
			},
		},
		channelId,
		transition,
	};
}

export function applyCombatHpChannelDelta(
	book: CombatHpBook,
	channelId: CombatHpChannelId,
	delta: number,
): CombatHpChannelWrite | null {
	const account = readCombatHpChannel(book, channelId);
	if (!account) return null;
	return writeCombatHpChannel(book, channelId, applyCombatHpDelta(account, delta));
}

export function commitCombatHpChannel(
	book: CombatHpBook,
	channelId: CombatHpChannelId,
	amount: number,
): CombatHpChannelWrite | null {
	const account = readCombatHpChannel(book, channelId);
	if (!account) return null;
	return writeCombatHpChannel(book, channelId, commitCombatHp(account, amount));
}

export function uncommitCombatHpChannel(
	book: CombatHpBook,
	channelId: CombatHpChannelId,
	amount: number,
): CombatHpChannelWrite | null {
	const account = readCombatHpChannel(book, channelId);
	if (!account) return null;
	return writeCombatHpChannel(book, channelId, uncommitCombatHp(account, amount));
}

export function settleCombatHpChannel(
	book: CombatHpBook,
	channelId: CombatHpChannelId,
	current: number,
): CombatHpChannelWrite | null {
	const account = readCombatHpChannel(book, channelId);
	if (!account) return null;
	return writeCombatHpChannel(book, channelId, settleCombatHp(account, current));
}

export function growCombatHpChannelMax(
	book: CombatHpBook,
	channelId: CombatHpChannelId,
	amount: number,
): CombatHpChannelWrite | null {
	const account = readCombatHpChannel(book, channelId);
	if (!account) return null;
	return writeCombatHpChannel(book, channelId, growCombatHpMax(account, amount));
}
