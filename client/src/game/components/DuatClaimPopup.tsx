/**
 * DuatClaimPopup.tsx — DUAT holder airdrop claim overlay
 *
 * Shows when a logged-in user is in the DUAT snapshot and hasn't claimed yet.
 * Gold-themed popup with balance display, pack count, and one-click claim.
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDuatClaimStore } from '../stores/duatClaimStore';
import { useNFTUsername } from '../nft/hooks';

const DUAT_PRECISION = 1000;

export default function DuatClaimPopup() {
	const username = useNFTUsername();
	const snapshotLoaded = useDuatClaimStore(s => s.snapshotLoaded);
	const currentUserEntry = useDuatClaimStore(s => s.currentUserEntry);
	const claimed = useDuatClaimStore(s => s.claimed);
	const dismissed = useDuatClaimStore(s => s.dismissed);
	const loading = useDuatClaimStore(s => s.loading);
	const claimTrxId = useDuatClaimStore(s => s.claimTrxId);
	const loadSnapshot = useDuatClaimStore(s => s.loadSnapshot);
	const checkAccount = useDuatClaimStore(s => s.checkAccount);
	const claimPacks = useDuatClaimStore(s => s.claimPacks);
	const dismiss = useDuatClaimStore(s => s.dismiss);

	// Load snapshot on mount
	useEffect(() => {
		loadSnapshot();
	}, [loadSnapshot]);

	// Check account when username changes
	useEffect(() => {
		if (username && snapshotLoaded) {
			checkAccount(username);
		}
	}, [username, snapshotLoaded, checkAccount]);

	// Don't show if: no user, not loaded, not eligible, already claimed, dismissed
	const visible = username && snapshotLoaded && currentUserEntry && !claimed && !dismissed;

	// Success state (just claimed)
	const justClaimed = claimed && claimTrxId && !dismissed;

	return (
		<AnimatePresence>
			{(visible || justClaimed) && (
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
						className="relative max-w-md w-full mx-4 rounded-xl overflow-hidden"
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
							{justClaimed ? (
								<>
									{/* Success state */}
									<motion.div
										initial={{ scale: 0 }}
										animate={{ scale: 1 }}
										transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
										className="text-5xl mb-4"
									>
										&#x2728;
									</motion.div>
									<h2 className="text-2xl font-bold mb-2" style={{ color: '#c9a44c' }}>
										Packs Claimed!
									</h2>
									<p className="text-gray-400 text-sm mb-4">
										{currentUserEntry?.packs} sealed packs have been added to your collection.
									</p>
									<p className="text-xs text-gray-600 mb-6 font-mono">
										tx: {claimTrxId?.slice(0, 16)}...
									</p>
									<button
										onClick={dismiss}
										className="px-8 py-2.5 rounded-lg text-sm font-semibold transition-colors"
										style={{ background: 'rgba(201, 164, 76, 0.15)', color: '#c9a44c', border: '1px solid rgba(201, 164, 76, 0.3)' }}
									>
										Continue to Game
									</button>
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
										DUAT Holder Detected
									</h2>

									<p className="text-gray-500 text-xs uppercase tracking-widest mb-6">
										Welcome back, @{username}
									</p>

									<div
										className="rounded-lg p-5 mb-6"
										style={{ background: 'rgba(201, 164, 76, 0.06)', border: '1px solid rgba(201, 164, 76, 0.15)' }}
									>
										<div className="flex justify-between items-center mb-3">
											<span className="text-gray-500 text-sm">Your DUAT Balance</span>
											<span className="text-lg font-bold" style={{ color: '#c9a44c' }}>
												{((currentUserEntry?.duatRaw ?? 0) / DUAT_PRECISION).toLocaleString()} DUAT
											</span>
										</div>
										<div
											className="h-px mb-3"
											style={{ background: 'linear-gradient(90deg, transparent, rgba(201, 164, 76, 0.2), transparent)' }}
										/>
										<div className="flex justify-between items-center">
											<span className="text-gray-500 text-sm">Packs Earned</span>
											<span className="text-xl font-bold text-white">
												{currentUserEntry?.packs} <span className="text-sm text-gray-400">Standard Packs</span>
											</span>
										</div>
									</div>

									<p className="text-gray-500 text-xs mb-6 leading-relaxed">
										Each pack contains 5 random cards from the Ragnarok Alpha collection.
										Claim within 90 days of genesis or packs return to the treasury.
									</p>

									<div className="flex gap-3">
										<button
											onClick={dismiss}
											className="flex-1 px-4 py-2.5 rounded-lg text-sm transition-colors"
											style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'rgba(255, 255, 255, 0.4)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
										>
											Maybe Later
										</button>
										<button
											onClick={claimPacks}
											disabled={loading}
											className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
											style={{
												background: loading ? 'rgba(201, 164, 76, 0.2)' : 'linear-gradient(135deg, #c9a44c, #a07830)',
												color: '#fff',
												boxShadow: loading ? 'none' : '0 0 20px rgba(201, 164, 76, 0.3)',
											}}
										>
											{loading ? 'Claiming...' : 'Claim Your Packs'}
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
