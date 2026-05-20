/**
 * DuatClaimPopup.tsx — DUAT holder airdrop claim overlay
 *
 * Shows when a logged-in user is eligible for the DUAT airdrop and hasn't
 * claimed yet. The UI shows entitlement and chain status, not raw holder data.
 */

import React, { lazy, Suspense, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDuatClaimStore } from '../stores/duatClaimStore';
import { useStarterStore } from '../stores/starterStore';
import { useNFTUsername } from '../nft/hooks';
import { getDuatPopupVisibility } from './duatClaimVisibility';
import { invokeClientWalletAction } from '../../data/wallet/clientWalletInvocation';
import CeremonyEvidenceButton from './CeremonyEvidenceButton';

// Lazy — ceremony is only mounted after a successful claim.
const DuatPackCeremony = lazy(() => import('./DuatPackCeremony'));

export default function DuatClaimPopup() {
	const username = useNFTUsername();
	const eligibilityLoaded = useDuatClaimStore(s => s.eligibilityLoaded);
	const currentUserEntry = useDuatClaimStore(s => s.currentUserEntry);
	const dismissed = useDuatClaimStore(s => s.dismissed);
	const claimPromptOpen = useDuatClaimStore(s => s.claimPromptOpen);
	const claiming = useDuatClaimStore(s => s.claiming);
	const pendingClaimTrxId = useDuatClaimStore(s => s.pendingClaimTrxId);
	const checkAccount = useDuatClaimStore(s => s.checkAccount);
	const claimPacks = useDuatClaimStore(s => s.claimPacks);
	const dismiss = useDuatClaimStore(s => s.dismiss);

	// Onboarding order: the starter ceremony must complete before the DUAT
	// popup interrupts. Otherwise the gold-themed overlay races the "Claim
	// Your Birthright" CTA on /home and the new player sees DUAT first.
	const starterClaimed = useStarterStore(s => s.hasClaimed(username));

	const [showCeremony, setShowCeremony] = useState(false);

	const earnedPacks = currentUserEntry?.packsEarned ?? 0;
	const eligible = currentUserEntry?.eligible ?? false;
	const claimConfirmed = Boolean(currentUserEntry?.claimed && pendingClaimTrxId);
	const claimPending = Boolean(pendingClaimTrxId && !currentUserEntry?.claimed);
	const activeClaimTrxId = currentUserEntry?.claimTrxId ?? pendingClaimTrxId;
	const claimBlockedReason = currentUserEntry?.claimBlockedReason ?? null;
	const claimDisabled = claiming || !eligible || Boolean(claimBlockedReason);

	const handleClaimPacks = () => {
		void invokeClientWalletAction(
			{
				kind: 'duat_airdrop_claim',
				authority: 'Posting',
				label: 'Claim DUAT airdrop packs',
			},
			claimPacks,
		);
	};

	// Check account when username changes
	useEffect(() => {
		if (!username) return;
		void checkAccount(username);
	}, [username, checkAccount]);

	// DUAT is an explicit wallet/vault action. Starter completion alone must
	// never open this overlay over the starter reveal or first-mode decision.
	const { visible, statusVisible } = getDuatPopupVisibility({
		username,
		eligibilityLoaded,
		currentUserEntry,
		dismissed,
		claimPromptOpen,
		pendingClaimTrxId,
		starterClaimed,
	});

	if (showCeremony && username) {
		return (
			<Suspense fallback={null}>
				<DuatPackCeremony
					accountId={username}
					expectedPacks={earnedPacks}
					packSource="duat_airdrop"
					onComplete={() => {
						setShowCeremony(false);
						dismiss();
					}}
				/>
			</Suspense>
		);
	}

	return (
		<AnimatePresence>
			{(visible || statusVisible) && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="fixed inset-0 z-[9999] flex items-center justify-center"
					style={{ background: 'rgba(0, 0, 0, 0.85)' }}
				>
					<motion.div
						initial={{ scale: 0.85, opacity: 0, y: 20 }}
						animate={{ scale: 1, opacity: 1, y: 0 }}
						exit={{ scale: 0.9, opacity: 0 }}
						transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
						className="relative max-w-md w-full mx-4 rounded-xl modal-landscape-safe"
						style={{
							background: 'linear-gradient(180deg, #1a1510 0%, #0d0a06 100%)',
							border: '1px solid rgba(201, 164, 76, 0.3)',
							boxShadow: '0 0 60px rgba(201, 164, 76, 0.15), 0 20px 60px rgba(0, 0, 0, 0.5)',
						}}
					>
						{/* Gold shimmer top edge */}
						<div
							className="absolute top-0 left-0 right-0 h-px"
							style={{ background: 'linear-gradient(90deg, transparent, #c9a44c, transparent)' }}
						/>

						<div className="p-8 text-center">
							{statusVisible ? (
								<>
									<motion.div
										initial={{ scale: 0 }}
										animate={{ scale: 1 }}
										transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
										className="text-5xl mb-4"
									>
										{claimConfirmed ? '\u2728' : '\u23F3'}
									</motion.div>
									<h2 className="text-2xl font-bold mb-2" style={{ color: '#c9a44c' }}>
										{claimConfirmed ? 'Packs Confirmed' : 'Claim Submitted'}
									</h2>
									<p className="text-gray-400 text-sm mb-4">
										{claimConfirmed
											? `${earnedPacks} sealed pack${earnedPacks === 1 ? '' : 's'} confirmed in your vault.`
											: `${earnedPacks} sealed pack${earnedPacks === 1 ? '' : 's'} will appear after chain confirmation.`}
									</p>
									{activeClaimTrxId && (
										<p className="text-xs text-gray-600 mb-6 font-mono">
											tx: {activeClaimTrxId.slice(0, 16)}...
										</p>
									)}
									<div className="flex gap-3">
										<button
											onClick={dismiss}
											className="flex-1 px-4 py-2.5 rounded-lg text-sm transition-colors"
											style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'rgba(255, 255, 255, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
										>
											{claimConfirmed ? 'Open Later' : 'Close'}
										</button>
										<CeremonyEvidenceButton
											ceremony="duat_airdrop_claim"
											account={username}
											context={{
												eligible,
												packsEarned: earnedPacks,
												claimConfirmed,
												claimPending,
												claimTrxId: activeClaimTrxId ?? null,
											}}
											className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm transition-colors border border-white/10 bg-white/5 text-white/60 hover:text-white/90"
										/>
										{claimConfirmed && (
											<button
												onClick={() => setShowCeremony(true)}
												className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all"
												style={{
													background: 'linear-gradient(135deg, #c9a44c, #a07830)',
													color: '#fff',
													boxShadow: '0 0 20px rgba(201, 164, 76, 0.3)',
												}}
											>
												Open Packs
											</button>
										)}
									</div>
								</>
							) : (
								<>
									{/* Claim state */}
									<motion.div
										animate={{ rotate: [0, 5, -5, 0] }}
										transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
										className="text-5xl mb-4"
									>
										&#x1F4E6;
									</motion.div>

									<h2 className="text-2xl font-bold mb-1" style={{ color: '#c9a44c', letterSpacing: '0.05em' }}>
										{eligible ? 'DUAT Packs Ready' : 'No DUAT Packs Assigned'}
									</h2>

									<p className="text-gray-500 text-xs uppercase tracking-widest mb-6">
										Welcome back, @{username}
									</p>

									<div
										className="rounded-lg p-5 mb-6"
										style={{ background: 'rgba(201, 164, 76, 0.06)', border: '1px solid rgba(201, 164, 76, 0.15)' }}
									>
										<div className="flex justify-between items-center mb-3">
											<span className="text-gray-500 text-sm">Eligibility</span>
											<span className="text-lg font-bold" style={{ color: '#c9a44c' }}>
												{eligible ? 'Verified' : 'Not eligible'}
											</span>
										</div>
										<div
											className="h-px mb-3"
											style={{ background: 'linear-gradient(90deg, transparent, rgba(201, 164, 76, 0.2), transparent)' }}
										/>
										<div className="flex justify-between items-center">
											<span className="text-gray-500 text-sm">Packs Earned</span>
											<span className="text-xl font-bold text-white">
												{earnedPacks} <span className="text-sm text-gray-400">Standard Packs</span>
											</span>
										</div>
									</div>

									<p className="text-gray-500 text-xs mb-6 leading-relaxed">
										{claimBlockedReason ?? 'Claim once with Hive Keychain. Packs appear after chain confirmation.'}
									</p>

									<div className="flex gap-3">
										<button
											onClick={dismiss}
											className="flex-1 px-4 py-2.5 rounded-lg text-sm transition-colors"
											style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'rgba(255, 255, 255, 0.4)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
										>
											Maybe Later
										</button>
										<CeremonyEvidenceButton
											ceremony="duat_airdrop_claim"
											account={username}
											context={{
												eligible,
												packsEarned: earnedPacks,
												claimReady: currentUserEntry?.claimReady ?? false,
												claimBlockedReason,
											}}
											className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm transition-colors border border-white/10 bg-white/5 text-white/60 hover:text-white/90"
										/>
										<button
											onClick={handleClaimPacks}
											disabled={claimDisabled}
											className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
											style={{
												background: claimDisabled ? 'rgba(201, 164, 76, 0.2)' : 'linear-gradient(135deg, #c9a44c, #a07830)',
												color: '#fff',
												boxShadow: claimDisabled ? 'none' : '0 0 20px rgba(201, 164, 76, 0.3)',
											}}
										>
											{claiming ? 'Claiming...' : !eligible ? 'Not Eligible' : claimBlockedReason ? 'Collection Pending' : 'Claim Packs'}
										</button>
									</div>
								</>
							)}
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
