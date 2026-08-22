import { useEffect, useState } from 'react';
import type { RuneLedgerEntry, RuneSeasonAccountView } from '@shared/protocol-core/types';
import {
	readLocalRuneSeason,
	type LocalRuneSeasonState,
} from '../../../data/runeSeasonReadModel';

export type WalletData = {
	state: LocalRuneSeasonState;
	selectedAccount: RuneSeasonAccountView;
	selectedAccountLedger: readonly RuneLedgerEntry[];
};

export type WalletLoadState =
	| { status: 'disconnected' }
	| { status: 'loading' }
	| { status: 'loaded'; data: WalletData }
	| { status: 'error'; message: string };

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export function useWalletData(accountName: string | null): WalletLoadState {
	const [loadState, setLoadState] = useState<WalletLoadState>({ status: 'disconnected' });

	useEffect(() => {
		if (!accountName) {
			setLoadState({ status: 'disconnected' });
			return;
		}

		const controller = new AbortController();
		setLoadState({ status: 'loading' });

		readLocalRuneSeason(accountName)
			.then(({ state, account, entries }) => {
				if (controller.signal.aborted) return;

				setLoadState({
					status: 'loaded',
					data: {
						state,
						selectedAccount: account,
						selectedAccountLedger: entries.slice(0, 25),
					},
				});
			})
			.catch(error => {
				if (controller.signal.aborted) return;
				setLoadState({ status: 'error', message: getErrorMessage(error) });
			});

		return () => controller.abort();
	}, [accountName]);

	return loadState;
}
