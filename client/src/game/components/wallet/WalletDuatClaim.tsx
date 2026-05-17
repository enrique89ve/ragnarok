import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package } from 'lucide-react';
import { useDuatClaimStore } from '../../stores/duatClaimStore';
import { useStarterStore } from '../../stores/starterStore';

/**
 * Compact DUAT claim chip — appears in the wallet only when the user is
 * eligible and hasn't claimed yet. Clicking reopens the global ceremony
 * popup (DuatClaimPopup checks `dismissed`). Hidden once claimed.
 *
 * Temporary surface for the 90-day claim window.
 */
export function WalletDuatClaim({ account }: { account: string }) {
	const eligibilityLoaded = useDuatClaimStore(state => state.eligibilityLoaded);
	const currentUserEntry = useDuatClaimStore(state => state.currentUserEntry);
	const pendingClaimTrxId = useDuatClaimStore(state => state.pendingClaimTrxId);
	const checkAccount = useDuatClaimStore(state => state.checkAccount);
	const openClaimPopup = useDuatClaimStore(state => state.openClaimPopup);
	// Onboarding order — match the DUAT popup gate so the wallet chip does
	// not invite the user to claim DUAT before the starter ceremony runs.
	const starterClaimed = useStarterStore(state => state.hasClaimed(account));

	useEffect(() => {
		void checkAccount(account);
	}, [account, checkAccount]);

	if (!eligibilityLoaded || !currentUserEntry || currentUserEntry.claimed || pendingClaimTrxId || !starterClaimed) return null;

	const claimablePacks = currentUserEntry.packsEarned;
	const claimReady = currentUserEntry.claimReady;

	return (
		<motion.button
			type="button"
			whileHover={{ scale: 1.03 }}
			whileTap={{ scale: 0.97 }}
			onClick={openClaimPopup}
			aria-label={`${claimReady ? 'Claim' : 'View'} ${claimablePacks} DUAT airdrop pack${claimablePacks === 1 ? '' : 's'}`}
			className="inline-flex w-fit items-center gap-2 px-3.5 py-1.5 rounded-md border border-bifrost-300/50 bg-bifrost-500/20 hover:bg-bifrost-500/35 hover:border-bifrost-300 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-bifrost-300"
		>
			<Package
				size={14}
				strokeWidth={2.4}
				aria-hidden="true"
				className="text-bifrost-100"
			/>
			<span className="numeric-display numeric-display--md text-bifrost-100">
				{claimablePacks}
			</span>
			<span className="font-mono text-[10px] tracking-[0.22em] uppercase text-bifrost-300">
				DUAT · {claimReady ? 'Claim' : 'Pending'}
			</span>
		</motion.button>
	);
}
