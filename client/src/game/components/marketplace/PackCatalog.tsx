/**
 * PackCatalog — sealed pack store, lives inside MarketplacePage as a tab.
 * Owns: pack catalog fetch, supply stats, RUNE balance, buy + open animation.
 *
 * Buying a pack triggers PackOpeningAnimation in-place. Sealed packs you
 * already own are managed in /packs (vault), not here.
 */

import { debug } from '../../config/debugConfig';
import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import { Zap } from 'lucide-react';
import PackOpeningAnimation from '../packs/PackOpeningAnimation';
import { getRarityColor } from '../../utils/rarityUtils';
import { NumericRitual, OrnateCorners, SigilBackplate, type Tier } from '../../../components/ornaments/RunicSigils';
import { RichTooltip } from '../../../components/ornaments/RichTooltip';
import { SplashBackdrop } from '../../../components/ornaments/SplashBackdrop';
import { getNFTBridge } from '../../nft';
import { useNFTUsername, useNFTTokenBalance } from '../../nft/hooks';
import { HBD_CURRENCY_CODE, formatHbdPrice, formatHbdThousandths } from '@shared/protocol-core';
import { RAGNAROK_ACCOUNT } from '../../../data/blockchain/hiveConfig';
import { derivePackCards } from '../../../data/blockchain/packDerivation';
import { forceSync } from '../../../data/blockchain/replayEngine';
import { cardRegistry } from '../../data/cardRegistry';
import { cryptoRng, cryptoIdGen } from '../../utils/seededRng';
import { RuneExchangeModal } from './RuneExchangeModal';
import { formatPackUnit } from './runePackExchange';
import { useRunePackExchange } from './useRunePackExchange';
import {
	RARITY_COLORS,
	RARITY_ORDER,
	FALLBACK_PACKS,
	apiPackToUiPack,
	getPackGuarantees,
	getScarcityInfo,
	formatNumber,
	openPackLocally,
	parseNum,
} from '../packs/sharedHelpers';

// Maps a canonical pack key to a hex-frame ornament variant.
// Cosmology: bifrost = mystic standard, gold = Odin premium,
// ember = Muspelheim mythic. Starter is filtered out elsewhere.
const PACK_HEX_VARIANT: Record<string, string> = {
	standard: 'hex-frame--bifrost',
	premium: 'hex-frame--gold',
	mythic: 'hex-frame--ember',
};

const PACK_ICON: Record<string, string> = {
	standard: '盾',
	premium: '冠',
	mythic: '龍',
};

const PACK_TIER: Record<string, Tier> = {
	standard: 'standard',
	premium: 'premium',
	mythic: 'mythic',
};

const PACK_INSCRIPTION: Record<string, string> = {
	standard: 'Tier · Standard',
	premium: 'Order · Premium',
	mythic: 'Mythic Seal',
};

const PACK_NUMERIC_TIER: Record<string, 'gold' | 'bifrost' | 'ember'> = {
	standard: 'bifrost',
	premium: 'gold',
	mythic: 'ember',
};

const PACK_SURFACE_VAR: Record<string, string> = {
	standard: 'var(--surface-mystic-standard)',
	premium: 'var(--surface-mystic-premium)',
	mythic: 'var(--surface-mystic-mythic)',
};

const PACK_GLOW_CLASS: Record<string, string> = {
	standard: 'mystic-tile--bifrost',
	premium: 'mystic-tile--gold',
	mythic: 'mystic-tile--ember',
};

function packHexVariantFor(packKey: string): string {
	return PACK_HEX_VARIANT[packKey] ?? 'hex-frame--obsidian';
}

function packIconFor(packKey: string): string {
	return PACK_ICON[packKey] ?? '盾';
}

function packTierFor(packKey: string): Tier {
	return PACK_TIER[packKey] ?? 'obsidian';
}
import type {
	PackType,
	PackTypeResponse,
	PackOpenResponse,
	OpenedCard,
	RarityStats,
	RevealedCard,
	SupplyStats,
	SupplyStatsResponse,
} from '../packs/types';

export default function PackCatalog() {
	const tokenBalance = useNFTTokenBalance();
	const hiveUsername = useNFTUsername();
	const runeBalance = tokenBalance?.RUNE ?? 0;
	const runeExchange = useRunePackExchange({ hiveUsername, runeBalance });

	const [packTypes, setPackTypes] = useState<PackType[]>(FALLBACK_PACKS);
	const [supplyStats, setSupplyStats] = useState<SupplyStats | null>(null);
	const [loading, setLoading] = useState(true);
	const [openingPack, setOpeningPack] = useState<PackType | null>(null);
	const [revealedCards, setRevealedCards] = useState<RevealedCard[]>([]);
	const [isOpening, setIsOpening] = useState(false);
	const [packError, setPackError] = useState<string | null>(null);
	const [testMinting, setTestMinting] = useState(false);

	// Starter is a free per-account claim and lives in /packs (vault), not here.
	// Defense in depth: exclude by key AND by free-claim flag — no free-claim
	// product should ever surface in the marketplace catalog.
	const visiblePackTypes = packTypes.filter(pack => pack.key !== 'starter' && !pack.isFreeClaim);

	useEffect(() => {
		fetchData();
	}, []);

	async function fetchData() {
		try {
			setLoading(true);
			const [typesRes, statsRes] = await Promise.all([
				fetch('/api/packs/types'),
				fetch('/api/packs/supply-stats'),
			]);

			if (typesRes.ok) {
				const typesData: PackTypeResponse = await typesRes.json();
				const mappedPacks = (typesData.packs || []).map(apiPackToUiPack);
				setPackTypes(mappedPacks);
			} else {
				setPackTypes(FALLBACK_PACKS);
			}

			if (statsRes.ok) {
				const statsData: SupplyStatsResponse = await statsRes.json();
				const overall = statsData.overall || {
					total_max_supply: 0,
					total_remaining_supply: 0,
					total_reward_reserve: 0,
					total_pack_supply: 0,
					total_pack_remaining: 0,
				};
				const rarityList = statsData.byRarity || [];

				const totalPackSupply = parseNum(overall.total_pack_supply);
				const totalPackRemaining = parseNum(overall.total_pack_remaining);
				const totalRewardReserve = parseNum(overall.total_reward_reserve);
				const totalPulled = totalPackSupply - totalPackRemaining;

				const mythicStats = rarityList.find((r: RarityStats) => r.nft_rarity === 'mythic');
				const mythicPulled = mythicStats
					? parseNum(mythicStats.pack_supply) - parseNum(mythicStats.pack_remaining)
					: 0;
				const mythicRate = totalPulled > 0 ? (mythicPulled / totalPulled) * 100 : 0;

				const byRarity = [];
				for (const rarity of RARITY_ORDER) {
					const stat = rarityList.find((r: RarityStats) => r.nft_rarity === rarity);
					if (!stat) continue;
					const ps = parseNum(stat.pack_supply);
					const pr = parseNum(stat.pack_remaining);
					const claimed = ps - pr;
					byRarity.push({
						rarity,
						packSupply: ps,
						packRemaining: pr,
						percentClaimed: ps > 0 ? (claimed / ps) * 100 : 0,
						uniqueCards: parseNum(stat.card_count),
					});
				}

				setSupplyStats({
					totalMaxSupply: parseNum(overall.total_max_supply),
					totalPackSupply,
					totalPackRemaining,
					totalRewardReserve,
					totalCardsOpened: totalPulled,
					totalPacksOpened: Math.floor(totalPulled / 5),
					mythicDropRate: parseFloat(mythicRate.toFixed(1)),
					byRarity,
				});
			} else {
				setSupplyStats(null);
			}
		} catch (err) {
			debug.warn('Pack API unavailable, using client-side packs:', err);
			setPackTypes(FALLBACK_PACKS);
			setSupplyStats(null);
		} finally {
			setLoading(false);
		}
	}

	const handleOpenPack = async (pack: PackType) => {
		// Starter is filtered out at the catalog level — defensive guard.
		if (pack.key === 'starter') return;

		setOpeningPack(pack);
		setIsOpening(true);
		setPackError(null);

		const packKey = pack.key;

		if (getNFTBridge().isHiveMode() && hiveUsername) {
			const result = await getNFTBridge().openPack(packKey, 1);

			if (result.success && result.trxId) {
				const derived = derivePackCards(result.trxId, packKey, 1);
				const mappedCards: RevealedCard[] = derived.map(c => ({
					id: c.cardId,
					name: c.name,
					rarity: c.rarity,
					type: c.type,
					heroClass: 'neutral',
				}));
				setRevealedCards(mappedCards);

				derived.forEach(c => {
					getNFTBridge().addCard({
						uid: c.uid,
						cardId: c.cardId,
						ownerId: hiveUsername!,
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

				forceSync(hiveUsername!).catch(err => debug.warn('[Catalog] Sync error:', err));
				toast.success(`Opened ${derived.length} cards on-chain!`);
				return;
			}

			setPackError(result.error ?? 'Pack open failed — check Keychain');
			setIsOpening(false);
			setOpeningPack(null);
			return;
		}

		try {
			const res = await fetch('/api/packs/open', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ packTypeId: pack.id, userId: 1 }),
			});

			if (res.ok) {
				const data: PackOpenResponse = await res.json();
				const mappedCards: RevealedCard[] = (data.cards || []).map((card: OpenedCard) => ({
					id: card.cardId,
					name: card.cardName,
					rarity: card.nftRarity,
					type: card.cardType,
					heroClass: card.heroClass,
					imageUrl: card.imageUrl,
				}));
				if (mappedCards.length > 0) {
					setRevealedCards(mappedCards);
					return;
				}
			}
			const localCards = openPackLocally(pack);
			if (localCards.length > 0) {
				setRevealedCards(localCards);
			} else {
				setPackError('Could not generate pack. Please try again.');
				setIsOpening(false);
				setOpeningPack(null);
			}
		} catch {
			const localCards = openPackLocally(pack);
			if (localCards.length > 0) {
				setRevealedCards(localCards);
			} else {
				setPackError('Could not generate pack. Please try again.');
				setIsOpening(false);
				setOpeningPack(null);
			}
		}
	};

	const handleCloseAnimation = () => {
		setOpeningPack(null);
		setRevealedCards([]);
		setIsOpening(false);
		fetchData();
	};

	const handleSubmitRuneExchange = async () => {
		const quantity = runeExchange.quote?.quantity ?? 0;
		const selectedPackName = runeExchange.selectedPack?.name ?? 'pack';
		const result = await runeExchange.submitExchange();

		if (result.success && result.trxId) {
			const trxId = result.trxId;
			runeExchange.markIndexerValidation(trxId);
			try {
				if (!hiveUsername) {
					throw new Error('Hive username missing during indexer validation.');
				}

				await forceSync(hiveUsername);
				runeExchange.markIndexed(trxId);
				await fetchData();
				runeExchange.markConfirmed(trxId);
				toast.success(`${quantity.toLocaleString()} ${formatPackUnit(quantity)} submitted for ${selectedPackName}.`);
				window.setTimeout(() => runeExchange.closeExchange(), 900);
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : 'Indexer validation failed.';
				debug.warn('[Catalog] Sync error:', err);
				runeExchange.markFailed(errorMessage, trxId);
				setPackError(errorMessage);
			}
		} else {
			const errorMessage = result.error ?? 'RUNE exchange did not return a transaction id.';
			runeExchange.markFailed(errorMessage, result.trxId);
			setPackError(errorMessage);
		}
	};

	const handleTestMint = async () => {
		if (!hiveUsername || testMinting) return;
		setTestMinting(true);
		try {
			const { getGenesisState } = await import('../../../data/blockchain/replayDB');
			const { broadcastGenesis, broadcastMint } = await import('../../../data/blockchain/genesisAdmin');

			const genesis = await getGenesisState();
			if (!genesis.version) {
				toast.info('Broadcasting genesis (one-time setup)...');
				const genesisResult = await broadcastGenesis();
				if (!genesisResult.success) {
					toast.error(`Genesis failed: ${genesisResult.error}`);
					return;
				}
				toast.success('Genesis broadcast complete!');
			}

			const testCards = [];
			const pool = cardRegistry.filter(c => c.rarity && Number(c.id) >= 1000);
			for (let i = 0; i < 5; i++) {
				const card = pool[Math.floor(cryptoRng() * pool.length)];
				testCards.push({
					nft_id: `test-${cryptoIdGen()}-${i}`,
					card_id: Number(card.id),
					rarity: (card.rarity ?? 'common').toLowerCase(),
					name: card.name,
					type: card.type ?? 'minion',
					race: card.race,
				});
			}

			const mintResult = await broadcastMint({ to: hiveUsername!, cards: testCards });
			if (mintResult.success) {
				const mapped: RevealedCard[] = testCards.map(c => ({
					id: c.card_id,
					name: c.name ?? `Card #${c.card_id}`,
					rarity: c.rarity,
					type: c.type,
					heroClass: 'neutral',
				}));

				testCards.forEach(c => {
					getNFTBridge().addCard({
						uid: c.nft_id,
						cardId: c.card_id,
						ownerId: hiveUsername!,
						ownershipSource: 'nft',
						edition: 'alpha',
						foil: 'standard',
						rarity: c.rarity,
						level: 1,
						xp: 0,
						lastTransferBlock: mintResult.blockNum,
						lastTransferTrxId: mintResult.trxId,
						mintBlockNum: mintResult.blockNum,
						mintTrxId: mintResult.trxId,
						name: c.name ?? '',
						type: c.type,
						race: c.race,
					});
				});

				setOpeningPack(FALLBACK_PACKS[0]);
				setRevealedCards(mapped);
				setIsOpening(true);

				forceSync(hiveUsername!).catch(err => debug.warn('[Catalog] Sync error:', err));
				toast.success(`Minted ${testCards.length} test NFTs on-chain!`);
			} else {
				toast.error(`Mint failed: ${mintResult.error}`);
			}
		} catch (err) {
			toast.error(`Test mint error: ${err instanceof Error ? err.message : 'unknown'}`);
		} finally {
			setTestMinting(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<motion.div
					animate={{ rotate: 360 }}
					transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
					className="w-12 h-12 border-4 border-gold-300 border-t-transparent rounded-full"
				/>
			</div>
		);
	}

	const packPercentRemaining = supplyStats && supplyStats.totalPackSupply > 0
		? (supplyStats.totalPackRemaining / supplyStats.totalPackSupply) * 100
		: 100;
	const scarcity = getScarcityInfo(packPercentRemaining);

	return (
		<div>
			{isOpening && openingPack && revealedCards.length > 0 && (
				<PackOpeningAnimation
					packName={openingPack.name}
					cards={revealedCards}
					onClose={handleCloseAnimation}
					onOpenAnother={() => handleOpenPack(openingPack)}
				/>
			)}

			{packError && (
				<motion.div
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-ember-500/95 border border-ember-300/50 text-ink-0 px-6 py-3 rounded-lg shadow-lg backdrop-blur-sm"
				>
					{packError}
					<button
						type="button"
						aria-label="Dismiss error"
						onClick={() => setPackError(null)}
						className="ml-4 text-ink-0/80 hover:text-ink-0"
					>
						✕
					</button>
				</motion.div>
			)}

			{runeExchange.selectedPack && runeExchange.quote && (
				<RuneExchangeModal
					pack={runeExchange.selectedPack}
					quote={runeExchange.quote}
					quantityInput={runeExchange.quantityInput}
					runeBalance={runeBalance}
					ledgerStatus={runeExchange.ledgerStatus}
					ledgerError={runeExchange.ledgerError}
					isSubmitting={runeExchange.isSubmitting}
					confirmation={runeExchange.confirmation}
					onQuantityInputChange={runeExchange.setQuantityInput}
					onSetQuantity={runeExchange.setQuantity}
					onSetMaxQuantity={runeExchange.setMaxQuantity}
					onClose={runeExchange.closeExchange}
					onSubmit={handleSubmitRuneExchange}
				/>
			)}

			{/* Wallet chips row: balances on the left, admin actions on the right */}
			{hiveUsername && (
				<div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
					<div className="flex items-center gap-2 flex-wrap">
						{/* RUNE balance — dim when zero, full gold when funded */}
						<div
							role="status"
							aria-label={`${runeBalance.toLocaleString()} RUNE balance`}
							className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md border transition-colors ${
								runeBalance > 0
									? 'bg-gold-700/40 border-gold-500/40'
									: 'bg-obsidian-800/60 border-obsidian-700'
							}`}
						>
							<Zap
								size={14}
								strokeWidth={2.4}
								aria-hidden="true"
								className={runeBalance > 0 ? 'text-gold-300' : 'text-ink-400'}
							/>
							<span className={`numeric-display numeric-display--md ${runeBalance > 0 ? 'text-gold-200' : 'text-ink-300'}`}>
								{runeBalance.toLocaleString()}
							</span>
							<span className={`font-mono text-[10px] tracking-[0.22em] uppercase ${runeBalance > 0 ? 'text-gold-400' : 'text-ink-400'}`}>
								RUNE
							</span>
						</div>

					</div>

					{getNFTBridge().isHiveMode() && hiveUsername === RAGNAROK_ACCOUNT && (
						<motion.button
							whileHover={{ scale: 1.03 }}
							whileTap={{ scale: 0.97 }}
							onClick={handleTestMint}
							disabled={testMinting}
							className="px-5 py-2 bg-rune-500 hover:bg-rune-300 disabled:opacity-50 disabled:cursor-not-allowed text-ink-0 rounded-md border border-rune-300 font-display text-xs font-bold tracking-[0.18em] uppercase transition-colors"
						>
							{testMinting ? 'Minting...' : 'Test Mint 5 NFTs'}
						</motion.button>
					)}
				</div>
			)}

			{/* Supply Banner — Runic Forge */}
			{supplyStats && (
				<motion.section
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					aria-labelledby="supply-heading"
					className="runic-panel ornate-corners-host ornate-corners-host--premium relative supply-banner mb-8"
				>
					<OrnateCorners />
					<div className="relative z-10">
						<div className="flex items-start justify-between mb-5 flex-wrap gap-4">
							<div className="flex flex-col items-start">
								<div id="supply-heading" className="tier-inscription tier-inscription--neutral mb-2">
									Realm · Supply
								</div>
								<NumericRitual tier="gold">
									<span className="supply-number supply-number-large numeric-display">
										{supplyStats.totalPackRemaining.toLocaleString()}
									</span>
								</NumericRitual>
								<div className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink-400 mt-2">
									of {supplyStats.totalPackSupply.toLocaleString()} sealed packs · forged
								</div>
							</div>
							<div className="text-right">
								<div className={`scarcity-badge ${scarcity.class} mb-2`}>{scarcity.label}</div>
								<div className="font-mono text-[11px] tracking-[0.18em] uppercase text-ink-300">
									{packPercentRemaining.toFixed(1)}% remaining
								</div>
							</div>
						</div>

						<div className="supply-bar mb-5">
							<div className="supply-bar-fill" style={{ width: `${packPercentRemaining}%` }} />
						</div>

						<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
							{supplyStats.byRarity.map(rs => {
								const color = RARITY_COLORS[rs.rarity] || 'var(--rarity-common-color)';
								const percentRemaining = rs.packSupply > 0 ? (rs.packRemaining / rs.packSupply) * 100 : 0;
								return (
									<div
										key={rs.rarity}
										className="runic-panel bg-obsidian-900/50 rounded-lg p-3 border border-obsidian-700/60"
									>
										<span className="runic-corners" aria-hidden="true" />
										<div className="flex items-center justify-between mb-1">
											<span className={`font-mono text-[10px] tracking-[0.22em] font-bold uppercase ${getRarityColor(rs.rarity)}`}>
												{rs.rarity}
											</span>
											<span className="text-ink-400 text-[10px]">{rs.uniqueCards} cards</span>
										</div>
										<div className="supply-number text-sm mb-1" style={{ color }}>
											{formatNumber(rs.packRemaining)}
											<span className="text-ink-400 text-xs ml-1">/ {formatNumber(rs.packSupply)}</span>
										</div>
										<div className="rarity-meter">
											<div
												className={`rarity-meter-fill rarity-meter-fill-${rs.rarity}`}
												style={{ width: `${percentRemaining}%` }}
											/>
										</div>
									</div>
								);
							})}
						</div>

						<div className="reward-reserve-badge">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
								<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
							</svg>
							<span>{supplyStats.totalRewardReserve.toLocaleString()} cards reserved for in-game rewards</span>
							<span className="text-frost-400/60 text-xs ml-1">(not available in packs)</span>
						</div>
					</div>
				</motion.section>
			)}

			{/* Pack grid */}
			{visiblePackTypes.length === 0 ? (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className="text-center py-20"
				>
					<p className="text-ink-300 text-xl mb-4">No packs available at the moment.</p>
					<button
						type="button"
						onClick={fetchData}
						className="btn-runic btn-runic--gold"
					>
						<span className="btn-runic-stud" aria-hidden />
						Refresh
						<span className="btn-runic-stud" aria-hidden />
					</button>
				</motion.div>
			) : (
				<section aria-labelledby="catalog-heading">
					<header className="section-heading mb-6 text-center items-center">
						<div id="catalog-heading" className="section-heading-kicker mx-auto">Catalog · Sealed Packs</div>
					</header>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12 max-w-5xl mx-auto">
						{visiblePackTypes.map((pack, index) => (
							<PackTile
								key={pack.id}
								pack={pack}
								index={index}
								onBuy={() => handleOpenPack(pack)}
								onRuneExchange={hiveUsername && pack.isRuneRedeemable ? () => {
									setPackError(null);
									runeExchange.openExchange(pack);
								} : undefined}
								isRuneOpening={runeExchange.isSubmitting && runeExchange.selectedPack?.id === pack.id}
							/>
						))}
					</div>
				</section>
			)}

			{/* Community Stats */}
			{supplyStats && supplyStats.totalCardsOpened > 0 && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.5 }}
				>
					<h3 className="font-display text-lg font-bold text-ink-0 mb-4 text-center uppercase tracking-[0.22em] inline-flex items-center gap-2 justify-center w-full">
						<span className="w-1 h-3 rounded-sm bg-gold-300" />
						Community Stats
					</h3>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						<div className="bg-obsidian-800/40 rounded-xl p-4 border border-obsidian-700/50 text-center">
							<div className="text-2xl font-bold text-gold-300">
								{supplyStats.totalPacksOpened.toLocaleString()}
							</div>
							<div className="text-ink-300 text-sm">Packs Opened</div>
						</div>
						<div className="bg-obsidian-800/40 rounded-xl p-4 border border-obsidian-700/50 text-center">
							<div className="text-2xl font-bold text-bifrost-300">
								{supplyStats.totalCardsOpened.toLocaleString()}
							</div>
							<div className="text-ink-300 text-sm">Cards Collected</div>
						</div>
						<div className="bg-obsidian-800/40 rounded-xl p-4 border border-obsidian-700/50 text-center">
							<div className="text-2xl font-bold text-transparent bg-clip-text bg-linear-to-r from-gold-300 to-ember-400">
								{supplyStats.mythicDropRate}%
							</div>
							<div className="text-ink-300 text-sm">Mythic Rate</div>
						</div>
					</div>
				</motion.div>
			)}
		</div>
	);
}

/**
 * Mystical pack tile — Runic Forge spec.
 * Layered: tier-tinted surface gradient → texture → ornate corners →
 * sigil backplate → hex icon → ritual numerics → CTA.
 */
function PackTile({
	pack,
	index,
	onBuy,
	onRuneExchange,
	isRuneOpening,
}: {
	pack: PackType;
	index: number;
	onBuy: () => void;
	onRuneExchange?: () => void;
	isRuneOpening: boolean;
}) {
	const hexVariant = packHexVariantFor(pack.key);
	const icon = packIconFor(pack.key);
	const tier = packTierFor(pack.key);
	const guarantees = getPackGuarantees(pack);
	const runeCost = pack.runeCost;
	const hbdPriceAmount = pack.hbdPriceThousandths === null
		? 'Unavailable'
		: formatHbdThousandths(pack.hbdPriceThousandths);
	const hbdPriceLabel = pack.hbdPriceThousandths === null
		? `${pack.name} HBD price unavailable`
		: formatHbdPrice(pack.hbdPriceThousandths);

	const isMythic = pack.key === 'mythic';
	const inscription = PACK_INSCRIPTION[pack.key] ?? 'Tier · Sealed';
	const numericTier = PACK_NUMERIC_TIER[pack.key] ?? 'gold';
	const surface = PACK_SURFACE_VAR[pack.key] ?? 'var(--surface-mystic-obsidian)';
	const glowClass = PACK_GLOW_CLASS[pack.key] ?? 'mystic-tile--gold';

	const stampVariant = pack.key === 'standard'
		? 'runic-stamp--standard'
		: pack.key === 'mythic'
			? 'runic-stamp--ember'
			: '';

	const reducedMotion = useReducedMotion();
	const oddsList = Object.entries(pack.rarityOdds).filter(([, odds]) => odds > 0);

	const rarityFillVar: Record<string, string> = {
		common: 'var(--rarity-common-color)',
		rare: 'var(--rarity-rare-color)',
		epic: 'var(--rarity-epic-color)',
		mythic: 'var(--rarity-mythic-color)',
	};

	return (
		<motion.article
			initial={reducedMotion ? false : { opacity: 0, y: 24 }}
			animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
			transition={reducedMotion ? { duration: 0.15 } : { delay: 0.08 * index }}
			aria-label={`${pack.name} — ${hbdPriceLabel}, ${pack.cardCount} cards`}
			className={`runic-panel ornate-corners-host ornate-corners-host--${tier} mystic-tile ${glowClass} ${isMythic ? 'texture-etched' : ''} relative rounded-xl p-6 flex flex-col overflow-hidden`}
			style={{ background: surface }}
		>
			<SplashBackdrop packKey={pack.key} count={3} />
			<OrnateCorners />
			{isMythic && <span className="aura-mystic" aria-hidden="true" />}

			{/* Hero: large hex with sigil — single anchor of the tile */}
			<div className="relative z-10 flex justify-center mb-4">
				<div className="sigil-host">
					<SigilBackplate tier={tier} />
					<div className={`hex-frame ${hexVariant} hex-frame--lg`} aria-hidden="true">
						<div className="hex-frame-inner">
							<span className="text-5xl text-ink-0/95 select-none">{icon}</span>
						</div>
					</div>
				</div>
			</div>

			{/* Tier inscription */}
			<div className={`relative z-10 tier-inscription tier-inscription--${tier} mb-2 self-center`}>
				{inscription}
			</div>

			{/* Pack name + Info trigger — same baseline */}
			<div className="relative z-10 flex items-center justify-center gap-2 mb-5">
				<h3 className="font-display text-xl font-bold tracking-[0.10em] uppercase text-ink-0 text-center">
					{pack.name}
				</h3>
				<RichTooltip label={`About ${pack.name}`} width={320}>
					<div className="rich-tooltip-section">
						<p className="m-0 text-ink-0 leading-relaxed">{pack.description}</p>
					</div>

					{guarantees.length > 0 && (
						<div className="rich-tooltip-section">
							<div className="rich-tooltip-section-label">Guarantees</div>
							<div className="rich-tooltip-stamp-row">
								{guarantees.map(g => (
									<span key={g} className={`runic-stamp ${stampVariant}`}>{g}</span>
								))}
							</div>
						</div>
					)}

					<div className="rich-tooltip-section">
						<div className="rich-tooltip-section-label">Rarity Odds</div>
						{oddsList.map(([rarity, odds]) => (
							<div key={rarity} className="rich-tooltip-row">
								<span className={`rich-tooltip-row-label ${getRarityColor(rarity)}`}>
									{rarity}
								</span>
								<span className="rich-tooltip-row-bar">
									<span
										className="rich-tooltip-row-fill"
										style={{
											width: `${Math.min(odds, 100)}%`,
											background: rarityFillVar[rarity] ?? 'var(--rarity-common-color)',
										}}
									/>
								</span>
								<span className="rich-tooltip-row-value">{odds}%</span>
							</div>
						))}
					</div>
				</RichTooltip>
			</div>

			{/* Hero numeric: price is the anchor of intent */}
			<div className="relative z-10 flex flex-col items-center mb-6">
				<NumericRitual tier={numericTier}>
					<span className="numeric-display numeric-display--xl">
						{hbdPriceAmount}
					</span>
				</NumericRitual>
				<span className="font-mono text-xs tracking-[0.22em] uppercase text-ink-300 mt-2">
					{HBD_CURRENCY_CODE} · {pack.cardCount === 1 ? 'one card' : `${pack.cardCount} cards`}
				</span>
			</div>

			<button
				type="button"
				onClick={onBuy}
				className="btn-runic btn-runic--gold w-full mt-auto relative z-10"
			>
				<span className="btn-runic-stud" aria-hidden />
				Buy Pack
				<span className="btn-runic-stud" aria-hidden />
			</button>

			{onRuneExchange && runeCost !== null && (
				<button
					type="button"
					onClick={() => !isRuneOpening && onRuneExchange()}
					disabled={isRuneOpening}
					aria-label={`Open RUNE exchange for ${pack.name} at ${runeCost} RUNE each`}
					className="btn-runic btn-runic--obsidian btn-runic--sm w-full mt-2 relative z-10"
				>
					{isRuneOpening ? 'Confirming...' : `Exchange · ${runeCost} RUNE`}
				</button>
			)}
		</motion.article>
	);
}
