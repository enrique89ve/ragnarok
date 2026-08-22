import {
	getActiveRuneSeasonId,
	getRuneEconomy,
	projectRuneSeason,
	readRuneSeasonAccount,
	type RuneLedgerEntry,
	type RuneLedgerEntryQuery,
	type RuneSeasonAccountView,
	type RuneSeasonProjection,
} from '@shared/protocol-core/types';
import { getRuntimeExecutionMode } from '../game/config/featureFlags';
import { clientStateAdapter } from './blockchain/clientStateAdapter';

export type LocalRuneSeasonState = RuneSeasonProjection & {
	readonly totalCap: number;
	readonly p2pCap: number;
	readonly campaignCap: number;
	readonly dailyQuestCap: number;
};

export type LocalRuneSeasonReadModel = {
	readonly state: LocalRuneSeasonState;
	readonly account: RuneSeasonAccountView;
	readonly entries: readonly RuneLedgerEntry[];
};

export type LocalRuneLedgerQuery = Omit<RuneLedgerEntryQuery, 'seasonId'> & {
	readonly seasonId?: string;
};

export function getClientRuneSeasonId(): string {
	return getActiveRuneSeasonId(getRuntimeExecutionMode());
}

export async function readLocalRuneLedger(
	query: LocalRuneLedgerQuery = {},
): Promise<readonly RuneLedgerEntry[]> {
	const seasonId = query.seasonId ?? getClientRuneSeasonId();
	const entries = await clientStateAdapter.getRuneLedgerEntries({ ...query, seasonId });
	return sortLedgerEntries(entries);
}

export async function readLocalRuneSeasonAccount(
	account: string,
	seasonId = getClientRuneSeasonId(),
): Promise<RuneSeasonAccountView> {
	return readRuneSeasonAccount(clientStateAdapter, { account, seasonId });
}

export async function readLocalRuneSeason(
	account: string,
	seasonId = getClientRuneSeasonId(),
): Promise<LocalRuneSeasonReadModel> {
	const [accountView, seasonEntries] = await Promise.all([
		readRuneSeasonAccount(clientStateAdapter, { account, seasonId }),
		clientStateAdapter.getRuneLedgerEntries({ seasonId }),
	]);
	const economy = getRuneEconomy(getRuntimeExecutionMode());
	const stateProjection = projectRuneSeason(seasonEntries, seasonId);

	return {
		account: accountView,
		entries: sortLedgerEntries(seasonEntries.filter(entry => entry.account === account)),
		state: {
			...stateProjection,
			totalCap: economy.totalCap,
			p2pCap: economy.p2pCap,
			campaignCap: economy.campaignCap,
			dailyQuestCap: economy.dailyQuestCap,
		},
	};
}

function sortLedgerEntries(entries: readonly RuneLedgerEntry[]): readonly RuneLedgerEntry[] {
	return [...entries].sort((left, right) =>
		right.blockNum - left.blockNum
		|| right.timestamp - left.timestamp
		|| right.entryId.localeCompare(left.entryId),
	);
}
