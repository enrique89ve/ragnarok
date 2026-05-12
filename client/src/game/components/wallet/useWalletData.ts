import { useEffect, useState } from 'react';
import {
	fetchRuneAccount,
	fetchRuneLedger,
	fetchRuneState,
	type AccountRuneSummary,
	type RuneLedgerEntryView,
	type RuneStateSnapshot,
} from '../../../data/runeAPI';

export type WalletData = {
	state: RuneStateSnapshot;
	selectedAccount: AccountRuneSummary;
	selectedAccountLedger: RuneLedgerEntryView[];
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

		Promise.all([
			fetchRuneState('S01', controller.signal),
			fetchRuneAccount(accountName, 'S01', controller.signal),
			fetchRuneLedger({ seasonId: 'S01', account: accountName, limit: 25 }, controller.signal),
		])
			.then(([state, selectedAccount, selectedLedger]) => {
				if (controller.signal.aborted) return;

				setLoadState({
					status: 'loaded',
					data: {
						state,
						selectedAccount,
						selectedAccountLedger: selectedLedger.entries,
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
