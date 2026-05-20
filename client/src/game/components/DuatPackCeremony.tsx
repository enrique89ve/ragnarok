/**
 * DuatPackCeremony — sequential opening flow for sealed chain packs.
 *
 * After a holder claims their N airdrop packs, this ceremony burns and
 * reveals them one-by-one using the shared PackOpeningAnimation.
 *
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
import { deriveSealedPackBurnCards } from '../../data/blockchain/packDerivation';
import { forceSync } from '../../data/blockchain/replayEngine';
import { HIVE_NODES } from '../../data/blockchain/hiveConfig';
import { recordSessionEvent } from '../../data/blockchain/transcriptBuilder';
import {
	assertClientWalletInvocation,
	invokeClientWalletAction,
	type ClientWalletInvocation,
} from '../../data/wallet/clientWalletInvocation';
import { ensureCardDataRuntime } from '../runtime/cardDataRuntime';
import { debug } from '../config/debugConfig';
import PackOpeningAnimation from './packs/PackOpeningAnimation';
import CeremonyEvidenceButton from './CeremonyEvidenceButton';
import {
	createDuatCardAcquisition,
	isDuatAcquisitionProvenance,
} from '@shared/protocol-core/acquisitionProvenance';
import { PACK_ENTROPY_DELAY_BLOCKS, type PackAsset } from '@shared/protocol-core/types';
import {
	recordCeremonyFeedbackEvent,
	type CeremonyKind,
} from '../protocol/ceremonyFeedback';

interface DuatPackCeremonyProps {
	accountId: string;
	expectedPacks?: number;
	packType?: string;
	packSource?: PackCeremonySource;
	onComplete: () => void;
}

type PackCeremonySource = 'duat_airdrop' | 'rune_exchange' | 'hbd_purchase' | 'vault';

interface PackQueueFilter {
	readonly packType?: string;
	readonly packSource?: PackCeremonySource;
}

interface RevealedCard {
	id: number;
	name: string;
	rarity: string;
	type: string;
	heroClass: string;
}

interface PackCeremonyCopy {
	readonly progressLabel: string;
	readonly confirmingTitle: string;
	readonly confirmingSubject: string;
	readonly readyTitle: string;
	readonly readyBody: string;
	readonly revealName: string;
	readonly completeToast: string;
	readonly keptSealedNoun: string;
}

function generateSalt(): string {
	return Array.from(crypto.getRandomValues(new Uint8Array(32)))
		.map(b => b.toString(16).padStart(2, '0'))
		.join('');
}

function getPackCeremonySource(pack: PackAsset): PackCeremonySource {
	if (isDuatAcquisitionProvenance(pack.acquisition)) return 'duat_airdrop';
	if (pack.uid.includes(':rune:')) return 'rune_exchange';
	if (pack.uid.includes(':hbd:')) return 'hbd_purchase';
	return 'vault';
}

function getOpeningCeremonyKind(source: PackCeremonySource): CeremonyKind {
	if (source === 'duat_airdrop') return 'duat_pack_opening';
	if (source === 'rune_exchange') return 'rune_pack_opening';
	return 'vault_pack_opening';
}

function getPackCeremonyCopy(source: PackCeremonySource): PackCeremonyCopy {
	if (source === 'duat_airdrop') {
		return {
			progressLabel: 'DUAT',
			confirmingTitle: 'Sealing on the Hive chain',
			confirmingSubject: 'DUAT airdrop pack',
			readyTitle: 'Open DUAT pack',
			readyBody: 'Burning this DUAT-derived pack uses your Active key and creates the reveal entropy on Hive.',
			revealName: 'DUAT Airdrop Pack',
			completeToast: 'All DUAT airdrop packs opened.',
			keptSealedNoun: 'DUAT pack',
		};
	}
	if (source === 'rune_exchange') {
		return {
			progressLabel: 'RUNE',
			confirmingTitle: 'Indexing RUNE exchange',
			confirmingSubject: 'RUNE exchange pack',
			readyTitle: 'Open RUNE pack',
			readyBody: 'Burning this RUNE exchange pack uses your Active key and creates the reveal entropy on Hive.',
			revealName: 'RUNE Pack',
			completeToast: 'All RUNE exchange packs opened.',
			keptSealedNoun: 'RUNE pack',
		};
	}
	if (source === 'hbd_purchase') {
		return {
			progressLabel: 'HBD',
			confirmingTitle: 'Indexing pack purchase',
			confirmingSubject: 'purchased pack',
			readyTitle: 'Open purchased pack',
			readyBody: 'Burning this purchased pack uses your Active key and creates the reveal entropy on Hive.',
			revealName: 'Purchased Pack',
			completeToast: 'All purchased packs opened.',
			keptSealedNoun: 'purchased pack',
		};
	}
	return {
		progressLabel: 'Vault',
		confirmingTitle: 'Indexing sealed pack',
		confirmingSubject: 'sealed pack',
		readyTitle: 'Open sealed pack',
		readyBody: 'Burning this sealed pack uses your Active key and creates the reveal entropy on Hive.',
		revealName: 'Vault Pack',
		completeToast: 'All selected packs opened.',
		keptSealedNoun: 'sealed pack',
	};
}

function matchesPackQueueFilter(pack: PackAsset, filter: PackQueueFilter): boolean {
	if (filter.packType && pack.packType !== filter.packType) return false;
	if (filter.packSource && getPackCeremonySource(pack) !== filter.packSource) return false;
	return true;
}

function findOpenablePacks(filter: PackQueueFilter = {}): PackAsset[] {
	return getNFTBridge()
		.getPackCollection()
		.filter(p => p.sealed && p.packType !== 'starter' && matchesPackQueueFilter(p, filter));
}

const CHAIN_POLL_INTERVAL_MS = 5_000;
const CHAIN_POLL_MAX_ATTEMPTS = 12; // ~60s before we stop polling and let user retry
const ENTROPY_POLL_INTERVAL_MS = 3_000;
const ENTROPY_POLL_MAX_ATTEMPTS = 30;

interface HiveRpcResponse<T> {
	result?: T;
	error?: { message: string };
}

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

async function callHive<T>(method: string, params: unknown[]): Promise<T> {
	let lastError: Error = new Error('No Hive nodes configured');
	for (const node of HIVE_NODES) {
		try {
			const res = await fetch(node, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
			});
			const data = await res.json() as HiveRpcResponse<T>;
			if (data.result !== undefined) return data.result;
			if (data.error) throw new Error(data.error.message);
		} catch (err) {
			lastError = err instanceof Error ? err : new Error(String(err));
		}
	}
	throw lastError;
}

async function getLastIrreversibleBlock(): Promise<number> {
	const props = await callHive<{ last_irreversible_block_num: number }>(
		'condenser_api.get_dynamic_global_properties',
		[],
	);
	return props.last_irreversible_block_num;
}

async function getBlockId(blockNum: number): Promise<string | null> {
	const block = await callHive<{ block_id: string } | null>('condenser_api.get_block', [blockNum]);
	return block?.block_id ?? null;
}

async function waitForEntropyBlockId(blockNum: number): Promise<string> {
	for (let attempt = 0; attempt < ENTROPY_POLL_MAX_ATTEMPTS; attempt++) {
		const lib = await getLastIrreversibleBlock();
		if (lib >= blockNum) {
			const blockId = await getBlockId(blockNum);
			if (blockId) return blockId;
		}
		await sleep(ENTROPY_POLL_INTERVAL_MS);
	}
	throw new Error('Pack entropy block is not irreversible yet. Try again in a minute.');
}

export default function DuatPackCeremony({
	accountId,
	expectedPacks = 0,
	packType,
	packSource,
	onComplete,
}: DuatPackCeremonyProps) {
	const navigate = useNavigate();
	const queueFilter: PackQueueFilter = { packType, packSource };
	const [hiveMode] = useState(() => getNFTBridge().isHiveMode());
	const [queue, setQueue] = useState<PackAsset[]>(() => findOpenablePacks(queueFilter));
	const [opening, setOpening] = useState(false);
	const [revealed, setRevealed] = useState<RevealedCard[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [pollAttempts, setPollAttempts] = useState(0);
	const activeSource = packSource ?? (queue[0] ? getPackCeremonySource(queue[0]) : 'vault');
	const openingCeremony = getOpeningCeremonyKind(activeSource);
	const ceremonyCopy = getPackCeremonyCopy(activeSource);
	// Initial pack count is captured ONCE at mount so the "N / total" counter
	// stays anchored to the ceremony start. The previous derivation from
	// queue.length + (revealed?1:0) decremented `totalPacks` after each open,
	// producing "1/97 → 1/96 → 1/95 → …" instead of "1/97 → 2/97 → …".
	const [initialPackCount] = useState(() => Math.max(queue.length, expectedPacks));
	const awaitingChain = queue.length === 0 && expectedPacks > 0 && !revealed;
	const opensCompleted = initialPackCount - queue.length;
	const currentIndex = revealed ? opensCompleted : Math.min(opensCompleted + 1, initialPackCount);
	const totalPacks = initialPackCount;

	const burnNext = useCallback(async (invocation: ClientWalletInvocation) => {
		assertClientWalletInvocation(invocation, 'pack_burn', 'Active');
		const next = queue[0];
		if (!next) return;
		const nextSource = getPackCeremonySource(next);
		const nextCeremony = getOpeningCeremonyKind(nextSource);

		setOpening(true);
		setError(null);
		setRevealed(null);

		try {
			// Card data may not be initialized — `DuatPackCeremony` mounts from
			// the global popup (outside `CardDataRuntimeBoundary`) and local-mode
			// bridges skip startSync. Without this, sealed pack derivation throws
			// `'Card data provider not initialized'` and the spinner hangs.
			await ensureCardDataRuntime();

			const salt = generateSalt();
			const result = await getNFTBridge().burnPack(next.uid, salt);
			if (!result.success || !result.trxId) {
				setOpening(false);
				const message = result.error ?? 'Failed to open pack - check Keychain';
				setError(message);
				recordCeremonyFeedbackEvent(nextCeremony, 'burn_rejected', {
					account: accountId,
					packUid: next.uid,
					packType: next.packType,
					packSource: nextSource,
					error: message,
				});
				return;
			}
			if (hiveMode && !result.blockNum) {
				setOpening(false);
				const message = 'Pack burn did not return a block number.';
				setError(message);
				recordCeremonyFeedbackEvent(nextCeremony, 'burn_rejected', {
					account: accountId,
					packUid: next.uid,
					packType: next.packType,
					packSource: nextSource,
					burnTrxId: result.trxId,
					error: message,
				});
				return;
			}
			recordCeremonyFeedbackEvent(nextCeremony, 'burn_broadcasted', {
				account: accountId,
				packUid: next.uid,
				packType: next.packType,
				packSource: nextSource,
				burnTrxId: result.trxId,
				burnBlockNum: result.blockNum ?? null,
			});

			const entropyBlockId = hiveMode
				? await waitForEntropyBlockId((result.blockNum ?? 0) + PACK_ENTROPY_DELAY_BLOCKS)
				: `local-entropy-${next.uid}`;
			const derived = await deriveSealedPackBurnCards({
				pack: next,
				trxId: result.trxId,
				salt,
				entropyBlockId,
			});
			debug.log('[DuatCeremony] Pack burned', {
				uid: next.uid,
				packType: next.packType,
				trxId: result.trxId,
				cardsDerived: derived.length,
				firstCard: derived[0],
			});
			if (derived.length === 0) {
				setOpening(false);
				const message = 'No cards derived - pack catalog may be empty for this type.';
				setError(message);
				recordCeremonyFeedbackEvent(nextCeremony, 'reveal_rejected', {
					account: accountId,
					packUid: next.uid,
					packType: next.packType,
					packSource: nextSource,
					burnTrxId: result.trxId,
					error: message,
				});
				return;
			}
			const acquisition = createDuatCardAcquisition({
				packAcquisition: next.acquisition,
				fallbackPackUid: next.uid,
				burnTrxId: result.trxId,
				burnBlockNum: result.blockNum ?? 0,
			});
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
					...(acquisition ? { acquisition } : {}),
				});
			});
			recordSessionEvent(nextSource === 'duat_airdrop' ? 'duat_pack_opened' : 'pack_opened', {
				account: accountId,
				packUid: next.uid,
				packType: next.packType,
				packSource: nextSource,
				claimTrxId: acquisition?.claimTrxId ?? null,
				burnTrxId: result.trxId,
				burnBlockNum: result.blockNum ?? null,
				cardCount: derived.length,
				cardIds: derived.map(card => card.cardId),
			});
			recordCeremonyFeedbackEvent(nextCeremony, 'revealed', {
				account: accountId,
				packUid: next.uid,
				packType: next.packType,
				packSource: nextSource,
				claimTrxId: acquisition?.claimTrxId ?? null,
				burnTrxId: result.trxId,
				burnBlockNum: result.blockNum ?? null,
				cardCount: derived.length,
				cardIds: derived.map(card => card.cardId),
				cardNames: derived.map(card => card.name),
			});

			getNFTBridge().removePack(next.uid);
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
			const message = err instanceof Error ? err.message : 'Failed to open pack';
			setOpening(false);
			setError(message);
			recordCeremonyFeedbackEvent(nextCeremony, 'open_failed', {
				account: accountId,
				packUid: next.uid,
				packType: next.packType,
				packSource: nextSource,
				error: message,
			});
		}
	}, [accountId, queue, hiveMode]);

	const handleOpenCurrentPack = useCallback(() => {
		void invokeClientWalletAction(
			{
				kind: 'pack_burn',
				authority: 'Active',
				label: ceremonyCopy.readyTitle,
			},
			burnNext,
		);
	}, [burnNext, ceremonyCopy.readyTitle]);

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
			setQueue(findOpenablePacks(queueFilter));
			setPollAttempts(n => n + 1);
		}, CHAIN_POLL_INTERVAL_MS);

		return () => clearTimeout(timer);
	}, [hiveMode, awaitingChain, pollAttempts, accountId, packSource, packType]);

	const handleRetryPoll = useCallback(async () => {
		setPollAttempts(0);
		try {
			await forceSync(accountId);
		} catch (err) {
			debug.warn('[DuatCeremony] retry forceSync error:', err);
		}
		setQueue(findOpenablePacks(queueFilter));
	}, [accountId, hiveMode, packSource, packType]);

	const handleOpenAnother = useCallback(() => {
		if (queue.length === 0) {
			toast.success(ceremonyCopy.completeToast);
			onComplete();
			navigate(routes.collection);
			return;
		}
		setRevealed(null);
	}, [ceremonyCopy.completeToast, navigate, onComplete, queue.length]);

	const handleSkipAll = useCallback(() => {
		toast.info(`${queue.length} ${ceremonyCopy.keptSealedNoun}${queue.length === 1 ? '' : 's'} kept sealed in your vault`);
		onComplete();
		navigate(routes.packs);
	}, [ceremonyCopy.keptSealedNoun, navigate, onComplete, queue.length]);

	const handleClose = useCallback(() => {
		onComplete();
		if (queue.length === 0) {
			navigate(routes.collection);
		} else {
			navigate(routes.packs);
		}
	}, [navigate, onComplete, queue.length]);

	const evidenceContext = {
		packType: packType ?? queue[0]?.packType ?? null,
		packSource: activeSource,
		expectedPacks,
		totalPacks,
		currentIndex,
		remainingPacks: queue.length,
	};

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
						{exhausted ? 'Still confirming on-chain' : ceremonyCopy.confirmingTitle}
					</h2>
					<p className="text-ink-200 text-sm mb-6 leading-relaxed">
						{expectedPacks} {ceremonyCopy.confirmingSubject}{expectedPacks === 1 ? '' : 's'} {expectedPacks === 1 ? 'is' : 'are'} waiting for chain confirmation.
						{!exhausted && ' When the indexer reaches your claim, choose Open pack to sign the burn.'}
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
						<CeremonyEvidenceButton
							ceremony={openingCeremony}
							account={accountId}
							context={evidenceContext}
							className="px-4 py-2 rounded-md border border-obsidian-700 bg-obsidian-900/60 hover:border-bifrost-300 hover:text-bifrost-200 font-display text-xs tracking-[0.18em] uppercase font-bold text-ink-300 transition-colors"
						/>
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
					{ceremonyCopy.progressLabel} · {currentIndex} / {totalPacks}
				</span>
				{queue.length > 0 && (
					<button
						type="button"
						onClick={handleSkipAll}
						className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-300 hover:text-gold-300 transition-colors"
					>
						Skip all
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
						onClick={handleOpenCurrentPack}
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
					<CeremonyEvidenceButton
						ceremony={openingCeremony}
						account={accountId}
						context={{
							...evidenceContext,
							error,
						}}
						className="font-display text-xs tracking-[0.18em] uppercase font-bold underline hover:no-underline"
					/>
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

			{!opening && !revealed && !error && queue.length > 0 && (
				<div className="absolute inset-0 flex items-center justify-center bg-obsidian-950/95 px-6">
					<div className="max-w-md text-center">
						<div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-lg border border-bifrost-300/35 bg-bifrost-500/15">
							<span aria-hidden className="h-4 w-4 rotate-45 bg-bifrost-200/80" />
						</div>
						<h2 className="font-display text-xl font-bold tracking-[0.10em] uppercase text-bifrost-100 mb-3">
							{ceremonyCopy.readyTitle}
						</h2>
						<p className="text-ink-200 text-sm leading-relaxed mb-6">
							Pack {currentIndex} of {totalPacks} is ready. {ceremonyCopy.readyBody}
						</p>
						<div className="flex justify-center gap-3">
							<button
								type="button"
								onClick={handleOpenCurrentPack}
								className="px-5 py-2.5 rounded-md border border-bifrost-300/45 bg-bifrost-500/25 hover:bg-bifrost-500/40 font-display text-xs tracking-[0.18em] uppercase font-bold text-bifrost-100 transition-colors"
							>
								Open pack
							</button>
							<button
								type="button"
								onClick={handleSkipAll}
								className="px-5 py-2.5 rounded-md border border-obsidian-700 bg-obsidian-900/65 hover:border-gold-600 hover:text-gold-300 font-display text-xs tracking-[0.18em] uppercase font-bold text-ink-300 transition-colors"
							>
								Open later
							</button>
						</div>
					</div>
				</div>
			)}

			{revealed && (
				<PackOpeningAnimation
					packName={`${ceremonyCopy.revealName} ${currentIndex} / ${totalPacks}`}
					cards={revealed}
					onClose={handleClose}
					onOpenAnother={handleOpenAnother}
					hideCollectionLink
					compactLayout
					evidence={{
						ceremony: openingCeremony,
						account: accountId,
						context: {
							...evidenceContext,
							revealedCards: revealed.map(card => ({
								id: card.id,
								name: card.name,
								rarity: card.rarity,
								type: card.type,
							})),
						},
					}}
				/>
			)}
		</div>
	);
}
