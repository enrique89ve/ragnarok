import { useEffect, useState } from 'react';
import { readLocalRuneSeasonAccount } from '../../data/runeSeasonReadModel';
import { useNFTTokenBalance } from '../nft/hooks';

export function useLocalRuneBalance(account: string | null): number {
	// The bridge balance only invalidates this read after replay hydration;
	// the displayed value always comes from the season ledger projection below.
	const tokenBalance = useNFTTokenBalance();
	const [balance, setBalance] = useState(0);

	useEffect(() => {
		if (!account) {
			setBalance(0);
			return;
		}

		let active = true;
		void readLocalRuneSeasonAccount(account)
			.then(view => {
				if (active) setBalance(view.balance);
			})
			.catch(() => {
				if (active) setBalance(0);
			});

		return () => {
			active = false;
		};
	}, [account, tokenBalance?.RUNE]);

	return balance;
}
