/**
 * DuatPackCeremony — sequential opening flow for DUAT airdrop packs.
 *
 * After a holder claims their N airdrop packs, this ceremony burns and
 * reveals them one-by-one using the shared PackOpeningAnimation.
 *
 * Only canonical chain packs (uid prefix `duat_${trxId}:`) are openable.
 * While chain replay catches up, the ceremony can show a "Confirming
 * on-chain" state and polls `forceSync` until canonical packs land.
 *
 * "Skip all" exits the ceremony; remaining sealed packs stay in /packs.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { routes } from '../../lib/routes';
import { getNFTBridge } from '../nft';
import { derivePackCards } from '../../data/blockchain/packDerivation';
import { forceSync } from '../../data/blockchain/replayEngine';
import { ensureCardDataRuntime } from '../runtime/cardDataRuntime';
import { debug } from '../config/debugConfig';
import PackOpeningAnimation from './packs/PackOpeningAnimation';

const CANONICAL_DUAT_PREFIX = 'duat_';

function isCanonicalDuatPack(uid: string): boolean {
	return uid.startsWith(CANONICAL_DUAT_PREFIX);
}

interface DuatPackCeremonyProps {
	accountId: string;
	expectedPacks?: number;
	onComplete: () => void;
}

interface RevealedCard {
	id: number;
	name: string;
	rarity: string;
	type: string;
	heroClass: string;
}

function generateSalt(): string {
	return Array.from(crypto.getRandomValues(new Uint8Array(32)))
		.map(b => b.toString(16).padStart(2, '0'))
		.join('');
}

function findOpenableDuatPacks(): string[] {
	return getNFTBridge()
		.getPackCollection()
		.filter(p => p.sealed && isCanonicalDuatPack(p.uid))
		.map(p => p.uid);
}

const CHAIN_POLL_INTERVAL_MS = 5_000;
const CHAIN_POLL_MAX_ATTEMPTS = 12; // ~60s before we stop polling and let user retry

export default function DuatPackCeremony({ accountId, expectedPacks = 0, onComplete }: DuatPackCeremonyProps) {
	const navigate = useNavigate();
	const [hiveMode] = useState(() => getNFTBridge().isHiveMode());
	const [queue, setQueue] = useState<string[]>(() => findOpenableDuatPacks());
	const [opening, setOpening] = useState(false);
	const [revealed, setRevealed] = useState<RevealedCard[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [pollAttempts, setPollAttempts] = useState(0);
	// Initial pack count is captured ONCE at mount so the "N / total" counter
	// stays anchored to the ceremony start. The previous derivation from
	// queue.length + (revealed?1:0) decremented `totalPacks` after each open,
	// producing "1/97 → 1/96 → 1/95 → …" instead of "1/97 → 2/97 → …".
	const [initialPackCount] = useState(() => Math.max(queue.length, expectedPacks));
	const awaitingChain = queue.length === 0 && expectedPacks > 0 && !revealed;
	const opensCompleted = initialPackCount - queue.length;
	const currentIndex = revealed ? opensCompleted : Math.min(opensCompleted + 1, initialPackCount);
	const totalPacks = initialPackCount;

	const burnNext = useCallback(async () => {
		const next = queue[0];
		if (!next) return;

		setOpening(true);
		setError(null);
		setRevealed(null);

		try {
			// Card data may not be initialized — `DuatPackCeremony` mounts from
			// the global popup (outside `CardDataRuntimeBoundary`) and local-mode
			// bridges skip startSync. Without this, `derivePackCards` throws
			// `'Card data provider not initialized'` and the spinner hangs.
			await ensureCardDataRuntime();

			const result = await getNFTBridge().burnPack(next, generateSalt());
			if (!result.success || !result.trxId) {
				setOpening(false);
				setError(result.error ?? 'Failed to open pack — check Keychain');
				return;
			}

			const derived = derivePackCards(result.trxId, 'standard', 1);
			debug.log('[DuatCeremony] Pack burned', {
				uid: next,
				trxId: result.trxId,
				cardsDerived: derived.length,
				firstCard: derived[0],
			});
			if (derived.length === 0) {
				setOpening(false);
				setError('No cards derived — pack catalog may be empty for this type.');
				return;
			}
			const mappedCards: RevealedCard[] = derived.map(c => ({
				id: c.cardId,
				name: c.name,
				rarity: c.rarity,
				type: c.type,
				heroClass: 'neutral',
			}));

			derived.forEach(c => {
				getNFTBridge().addCard({
					uid: c.uid,
					cardId: c.cardId,
					ownerId: accountId,
					ownershipSource: 'nft',
					edition: 'alpha',
					foil: c.foil,
					rarity: c.rarity,
					level: 1,
					xp: 0,
					lastTransferBlock: result.blockNum,
					lastTransferTrxId: result.trxId,
					mintBlockNum: result.blockNum,
					mintTrxId: result.trxId,
					name: c.name,
					type: c.type,
					race: c.race,
				});
			});

			getNFTBridge().removePack(next);
			// Only converge against chain history when there is a chain replay
			// running. Local-stage bridges have no replay; calling forceSync
			// here would query Hive RPC and then `hydrateStore` would wipe the
			// freshly minted cards from Zustand (IDB is empty in local).
			if (hiveMode) {
				forceSync(accountId).catch(err => debug.warn('[DuatCeremony] sync error:', err));
			}

			setQueue(prev => prev.slice(1));
			setRevealed(mappedCards);
			setOpening(false);
		} catch (err) {
			debug.warn('[DuatCeremony] burnNext error:', err);
			setOpening(false);
			setError(err instanceof Error ? err.message : 'Failed to open pack');
		}
	}, [accountId, queue, hiveMode]);

	useEffect(() => {
		if (queue.length > 0 && !revealed && !opening && !error) {
			void burnNext();
		}
	}, [queue.length, revealed, opening, error, burnNext]);

	// Poll for canonical packs while the chain replay catches up. Each tick
	// forceSync's IDB → Zustand, then we re-read both queues. As soon as a
	// canonical pack appears, awaitingChain flips false and the burn loop
	// above takes over. Only runs in hive mode — local-stage builds have no
	// replay engine to converge against.
	useEffect(() => {
		if (!hiveMode) return;
		if (!awaitingChain) return;
		if (pollAttempts >= CHAIN_POLL_MAX_ATTEMPTS) return;

		const timer = setTimeout(async () => {
			try {
				await forceSync(accountId);
			} catch (err) {
				debug.warn('[DuatCeremony] poll forceSync error:', err);
			}
			setQueue(findOpenableDuatPacks());
			setPollAttempts(n => n + 1);
		}, CHAIN_POLL_INTERVAL_MS);

		return () => clearTimeout(timer);
	}, [hiveMode, awaitingChain, pollAttempts, accountId]);

	const handleRetryPoll = useCallback(async () => {
		setPollAttempts(0);
		try {
			await forceSync(accountId);
		} catch (err) {
			debug.warn('[DuatCeremony] retry forceSync error:', err);
		}
		setQueue(findOpenableDuatPacks());
	}, [accountId, hiveMode]);

	const handleOpenAnother = useCallback(() => {
		if (queue.length === 0) {
			toast.success('All airdrop packs opened!');
			onComplete();
			navigate(routes.collection);
			return;
		}
		setRevealed(null);
	}, [navigate, onComplete, queue.length]);

	const handleSkipAll = useCallback(() => {
		toast.info(`${queue.length} pack${queue.length === 1 ? '' : 's'} kept sealed in your vault`);
		onComplete();
		navigate(routes.packs);
	}, [navigate, onComplete, queue.length]);

	const handleClose = useCallback(() => {
		onComplete();
		if (queue.length === 0) {
			navigate(routes.collection);
		} else {
			navigate(routes.packs);
		}
	}, [navigate, onComplete, queue.length]);

	if (initialPackCount === 0) {
		onComplete();
		return null;
	}

	if (awaitingChain) {
		const exhausted = pollAttempts >= CHAIN_POLL_MAX_ATTEMPTS;
		return (
			<div className="fixed inset-0 z-[10000] flex items-center justify-center bg-obsidian-950/95 backdrop-blur-sm p-6">
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					className="text-center max-w-md w-full"
				>
					{!exhausted ? (
						<motion.div
							animate={{ rotate: 360 }}
							transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
							className="w-12 h-12 mx-auto mb-5 border-2 border-bifrost-300/30 border-t-bifrost-300 rounded-full"
						/>
					) : (
						<div className="text-5xl mb-5">&#x23F3;</div>
					)}
					<h2 className="font-display text-xl font-bold tracking-[0.10em] uppercase text-bifrost-200 mb-3">
						{exhausted ? 'Still confirming on-chain' : 'Sealing on the Hive chain'}
					</h2>
					<p className="text-ink-200 text-sm mb-6 leading-relaxed">
						{expectedPacks} airdrop pack{expectedPacks === 1 ? '' : 's'} {expectedPacks === 1 ? 'is' : 'are'} waiting for chain confirmation.
						{!exhausted && ' Opening will start automatically when the indexer reaches your claim.'}
					</p>
					<div className="flex gap-3 justify-center">
						{exhausted && (
							<button
								type="button"
								onClick={handleRetryPoll}
								className="px-4 py-2 rounded-md border border-bifrost-300/40 bg-bifrost-500/20 hover:bg-bifrost-500/35 hover:border-bifrost-300 font-display text-xs tracking-[0.18em] uppercase font-bold text-bifrost-100 transition-colors"
							>
								Check again
							</button>
						)}
						<button
							type="button"
							onClick={handleSkipAll}
							className="px-4 py-2 rounded-md border border-obsidian-700 bg-obsidian-900/60 hover:border-gold-600 hover:text-gold-300 font-display text-xs tracking-[0.18em] uppercase font-bold text-ink-300 transition-colors"
						>
							Open later
						</button>
					</div>
				</motion.div>
			</div>
		);
	}

	return (
		<div className="fixed inset-0 z-[10000]">
			{/* Progress + skip overlay */}
			<motion.div
				initial={{ opacity: 0, y: -10 }}
				animate={{ opacity: 1, y: 0 }}
				className="absolute top-4 left-1/2 -translate-x-1/2 z-[10001] flex items-center gap-4 px-5 py-2 rounded-full border border-bifrost-300/40 bg-obsidian-950/85 backdrop-blur-sm"
			>
				<span className="font-mono text-[10px] tracking-[0.22em] uppercase text-bifrost-200">
					DUAT · {currentIndex} / {totalPacks}
				</span>
				{queue.length > 0 && (
					<button
						type="button"
						onClick={handleSkipAll}
						className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-300 hover:text-gold-300 transition-colors"
					>
						Skip all →
					</button>
				)}
			</motion.div>

			{error && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className="absolute top-20 left-1/2 -translate-x-1/2 z-[10002] flex items-center gap-4 px-5 py-3 rounded-md border border-ember-300/50 bg-ember-500/95 text-ink-0"
				>
					<span className="text-sm">{error}</span>
					<button
						type="button"
						onClick={burnNext}
						className="font-display text-xs tracking-[0.18em] uppercase font-bold underline hover:no-underline"
					>
						Retry
					</button>
					<button
						type="button"
						onClick={handleSkipAll}
						className="font-display text-xs tracking-[0.18em] uppercase font-bold underline hover:no-underline"
					>
						Skip
					</button>
				</motion.div>
			)}

			{opening && !revealed && !error && (
				<div className="absolute inset-0 flex items-center justify-center bg-obsidian-950/90">
					<div className="text-center">
						<motion.div
							animate={{ rotate: 360 }}
							transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
							className="w-12 h-12 mx-auto mb-4 border-2 border-bifrost-300/30 border-t-bifrost-300 rounded-full"
						/>
						<p className="font-mono text-[10px] tracking-[0.22em] uppercase text-bifrost-200">
							Sealing the rite · Sign in Keychain
						</p>
					</div>
				</div>
			)}

			{revealed && (
				<PackOpeningAnimation
					packName={`Airdrop Pack ${currentIndex} / ${totalPacks}`}
					cards={revealed}
					onClose={handleClose}
					onOpenAnother={handleOpenAnother}
					hideCollectionLink
					compactLayout
				/>
			)}
		</div>
	);
}
