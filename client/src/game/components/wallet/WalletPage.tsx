import { useNFTUsername } from '../../nft/hooks';
import { ActivityFeed } from './WalletActivity';
import { BalanceOverview } from './WalletBalance';
import { WalletDuatClaim } from './WalletDuatClaim';
import { WalletHeader } from './WalletHeader';
import { WalletConnectPrompt, WalletError, WalletLoading } from './WalletPrimitives';
import { SeasonStateOverview } from './WalletSeasonState';
import { useWalletData } from './useWalletData';

export default function WalletPage() {
	const loggedInUsername = useNFTUsername();
	const walletAccountName = loggedInUsername && loggedInUsername.length > 0
		? loggedInUsername
		: null;
	const loadState = useWalletData(walletAccountName);

	return (
		<div className="h-dvh w-screen overflow-y-auto overflow-x-hidden bg-(image:--bg-vault-nav) text-ink-0">
			<WalletHeader />

			<main className="mx-auto grid max-w-[1400px] gap-6 px-5 py-6 pb-16">
				{loadState.status === 'disconnected' && <WalletConnectPrompt />}
				{loadState.status === 'loading' && <WalletLoading />}
				{loadState.status === 'error' && <WalletError message={loadState.message} />}
				{loadState.status === 'loaded' && (
					<section className="mx-auto grid w-full max-w-5xl content-start gap-6">
						<BalanceOverview account={loadState.data.selectedAccount} />
						<SeasonStateOverview state={loadState.data.state} />
						<WalletDuatClaim account={loadState.data.selectedAccount.account} />
						<ActivityFeed entries={loadState.data.selectedAccountLedger} />
					</section>
				)}
			</main>
		</div>
	);
}
