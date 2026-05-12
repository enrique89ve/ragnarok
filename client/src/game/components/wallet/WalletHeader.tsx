import { Link } from 'react-router-dom';
import { routes } from '../../../lib/routes';
import { useNFTUsername } from '../../nft/hooks';
import { AccountSlot } from '../../../components/account/AccountSlot';

export function WalletHeader() {
	const username = useNFTUsername();

	return (
		<header className="border-b border-obsidian-700 bg-obsidian-950/85 backdrop-blur-md sticky top-0 z-40">
			<div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
				<div className="flex items-center gap-4 min-w-0">
					<Link
						to={routes.home}
						className="inline-flex items-center h-8 px-3 rounded-full border border-obsidian-700 bg-obsidian-850 text-ink-200 hover:text-gold-300 hover:border-gold-600 font-display text-[11px] tracking-[0.18em] uppercase font-bold transition-colors"
					>
						Home
					</Link>
					<div>
						<div className="font-mono text-[10px] tracking-[0.32em] uppercase text-ink-300">Testnet · RUNE</div>
						<h1 className="font-display text-xl font-black tracking-[0.10em] uppercase text-gold-300">
							Wallet
						</h1>
					</div>
				</div>
				<AccountSlot
					username={username}
					tier="premium"
					to={routes.settings}
					secondary="Wallet"
					showSettings
				/>
			</div>
		</header>
	);
}
