/**
 * PackCatalog — sealed pack store, lives inside MarketplacePage as a tab.
 * Owns: pack catalog fetch, supply stats, RUNE balance, and pack purchase flows.
 *
 * Sealed packs you already own are managed in /packs (vault), not here.
 */

import { debug } from '../../config/debugConfig';
import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import { Zap, X } from 'lucide-react';
import { getRarityColor, getRarityCssColor } from '../../utils/rarityUtils';
import { NumericRitual, OrnateCorners, SigilBackplate, type Tier } from '../../../components/ornaments/RunicSigils';
import { RichTooltip } from '../../../components/ornaments/RichTooltip';
import { SplashBackdrop } from '../../../components/ornaments/SplashBackdrop';
import { useNFTUsername, useNFTTokenBalance } from '../../nft/hooks';
import { HBD_CURRENCY_CODE, formatHbdPrice, formatHbdThousandths } from '@shared/protocol-core';
import { forceSync } from '../../../data/blockchain/replayEngine';
import { RuneExchangeModal } from './RuneExchangeModal';
import { formatPackUnit } from './runePackExchange';
import { useRunePackExchange } from './useRunePackExchange';
import { recordCeremonyFeedbackEvent } from '../../protocol/ceremonyFeedback';
import { HbdPurchaseModal } from './HbdPurchaseModal';
import { useHbdPackPurchase } from './useHbdPackPurchase';
import {
	RARITY_ORDER,
	FALLBACK_PACKS,
	apiPackToUiPack,
	getPackGuarantees,
	getScarcityInfo,
	formatNumber,
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
	RarityStats,
	SupplyStats,
	SupplyStatsResponse,
} from '../packs/types';

export default function PackCatalog() {
	const tokenBalance = useNFTTokenBalance();
	const hiveUsername = useNFTUsername();
	const runeBalance = tokenBalance?.RUNE ?? 0;
	const runeExchange = useRunePackExchange({ hiveUsername, runeBalance });
	const hbdPurchase = useHbdPackPurchase();

	const [packTypes, setPackTypes] = useState<PackType[]>(FALLBACK_PACKS);
	const [supplyStats, setSupplyStats] = useState<SupplyStats | null>(null);
	const [loading, setLoading] = useState(true);
	const [packError, setPackError] = useState<string | null>(null);

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

	const handleBuyPackHbd = (pack: PackType) => {
		// Starter is filtered out at the catalog level — defensive guard.
		if (pack.key === 'starter') return;

		if (!hiveUsername) {
			const message = 'Connect Hive Keychain before buying sealed packs.';
			setPackError(message);
			toast.error(message);
			return;
		}

		if (pack.hbdPriceThousandths === null) {
			const message = `${pack.name} is not available through the HBD sale.`;
			setPackError(message);
			toast.error(message);
			return;
		}

		setPackError(null);
		hbdPurchase.openPurchase(pack);
	};

	const handleOpenRuneExchange = (pack: PackType) => {
		if (pack.key === 'starter') return;

		if (!hiveUsername) {
			const message = 'Connect Hive Keychain before exchanging RUNE for sealed packs.';
			setPackError(message);
			toast.error(message);
			return;
		}

		if (!pack.isRuneRedeemable || pack.runeCost === null) {
			const message = `${pack.name} is not available through the testnet RUNE exchange.`;
			setPackError(message);
			toast.error(message);
			return;
		}

		setPackError(null);
		runeExchange.openExchange(pack);
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
				recordCeremonyFeedbackEvent('rune_pack_exchange', 'confirmed', {
					account: hiveUsername,
					packType: runeExchange.selectedPack?.key ?? null,
					quantity,
					trxId,
				});
				toast.success(`${quantity.toLocaleString()} ${formatPackUnit(quantity)} submitted for ${selectedPackName}.`);
				window.setTimeout(() => runeExchange.closeExchange(), 900);
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : 'Indexer validation failed.';
				debug.warn('[Catalog] Sync error:', err);
				runeExchange.markFailed(errorMessage, trxId);
				recordCeremonyFeedbackEvent('rune_pack_exchange', 'indexing_failed', {
					account: hiveUsername,
					packType: runeExchange.selectedPack?.key ?? null,
					quantity,
					trxId,
					error: errorMessage,
				});
				setPackError(errorMessage);
			}
		} else {
			const errorMessage = result.error ?? 'RUNE exchange did not return a transaction id.';
			runeExchange.markFailed(errorMessage, result.trxId);
			recordCeremonyFeedbackEvent('rune_pack_exchange', 'failed', {
				account: hiveUsername,
				packType: runeExchange.selectedPack?.key ?? null,
				quantity,
				trxId: result.trxId ?? null,
				error: errorMessage,
			});
			setPackError(errorMessage);
		}
	};

	const handleSubmitHbdPurchase = async () => {
		const quantity = hbdPurchase.quote?.quantity ?? 0;
		const selectedPackName = hbdPurchase.selectedPack?.name ?? 'pack';
		const result = await hbdPurchase.submitPurchase();

		if (result.success && result.trxId) {
			const trxId = result.trxId;
			hbdPurchase.markIndexerValidation(trxId);
			try {
				if (!hiveUsername) {
					throw new Error('Hive username missing during indexer validation.');
				}

				await forceSync(hiveUsername);
				hbdPurchase.markIndexed(trxId);
				await fetchData();
				hbdPurchase.markConfirmed(trxId);
				toast.success(`${quantity.toLocaleString()} ${formatPackUnit(quantity)} purchased for ${selectedPackName}.`);
				window.setTimeout(() => hbdPurchase.closePurchase(), 900);
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : 'Indexer validation failed.';
				debug.warn('[Catalog] HBD purchase sync error:', err);
				hbdPurchase.markFailed(errorMessage, trxId);
				setPackError(errorMessage);
			}
		} else {
			const errorMessage = result.error ?? 'HBD purchase did not return a transaction id.';
			hbdPurchase.markFailed(errorMessage, result.trxId);
			setPackError(errorMessage);
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
						<X size={16} aria-hidden={true} />
					</button>
				</motion.div>
			)}

				{runeExchange.selectedPack && runeExchange.quote && (
					<RuneExchangeModal
					pack={runeExchange.selectedPack}
					quote={runeExchange.quote}
					quantityInput={runeExchange.quantityInput}
					account={hiveUsername}
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

				{hbdPurchase.selectedPack && hbdPurchase.quote && (
					<HbdPurchaseModal
						pack={hbdPurchase.selectedPack}
						quote={hbdPurchase.quote}
						quantityInput={hbdPurchase.quantityInput}
						isSubmitting={hbdPurchase.isSubmitting}
						confirmation={hbdPurchase.confirmation}
						onQuantityInputChange={hbdPurchase.setQuantityInput}
						onSetQuantity={hbdPurchase.setQuantity}
						onClose={hbdPurchase.closePurchase}
						onSubmit={handleSubmitHbdPurchase}
					/>
				)}

			{/* Wallet chips row moved into the catalog heading for visual rhythm
			    (RUNE pairs with purchase intent, not with the supply banner). */}

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
							<div className="self-start">
								<div className={`scarcity-badge ${scarcity.class}`}>{scarcity.label}</div>
							</div>
						</div>

						<div className="supply-bar mb-5">
							<div className="supply-bar-fill" style={{ width: `${packPercentRemaining}%` }} />
						</div>

						<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
							{supplyStats.byRarity.map(rs => {
								const color = getRarityCssColor(rs.rarity);
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

						{supplyStats.totalRewardReserve > 0 && (
							<RichTooltip
								label="What does this mean?"
								width={280}
							>
								<div
									className="reward-reserve-badge"
									tabIndex={0}
									aria-label={`${supplyStats.totalRewardReserve.toLocaleString()} cards locked for in-game rewards`}
								>
									<span className="reward-reserve-dot" aria-hidden="true" />
									<span className="numeric-display numeric-display--sm text-frost-200">
										{supplyStats.totalRewardReserve.toLocaleString()}
									</span>
									<span className="font-mono text-[10px] tracking-[0.22em] uppercase text-frost-300/90">
										locked · in-game rewards
									</span>
								</div>
							</RichTooltip>
						)}
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
					<header className="section-heading mb-6 flex items-center justify-between flex-wrap gap-3">
						<div id="catalog-heading" className="section-heading-kicker">Catalog · Sealed Packs</div>
						{hiveUsername && (
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
						)}
					</header>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12 max-w-5xl mx-auto">
						{visiblePackTypes.map((pack, index) => (
							<PackTile
									key={pack.id}
									pack={pack}
									index={index}
									onBuyHbd={() => handleBuyPackHbd(pack)}
									onExchangeRune={() => handleOpenRuneExchange(pack)}
									isHbdBuying={hbdPurchase.isSubmitting && hbdPurchase.selectedPack?.id === pack.id}
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
	onBuyHbd,
	onExchangeRune,
	isHbdBuying,
	isRuneOpening,
}: {
	pack: PackType;
	index: number;
	onBuyHbd: () => void;
	onExchangeRune: () => void;
	isHbdBuying: boolean;
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

		{/* Hero numeric: HBD price is the anchor of sale intent */}
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

		<div className="relative z-10 mt-auto grid gap-2">
			<button
				type="button"
				onClick={onBuyHbd}
				disabled={isHbdBuying || pack.hbdPriceThousandths === null}
				className="btn-runic btn-runic--gold w-full"
			>
				<span className="btn-runic-stud" aria-hidden />
				{isHbdBuying ? 'Confirming...' : pack.hbdPriceThousandths === null ? 'Unavailable' : `Buy · ${hbdPriceLabel}`}
				<span className="btn-runic-stud" aria-hidden />
			</button>

			<button
				type="button"
				onClick={onExchangeRune}
				disabled={isRuneOpening || runeCost === null}
				className="h-11 rounded-lg border border-rune-300/35 bg-rune-500/12 px-4 font-mono text-[11px] uppercase tracking-[0.18em] text-rune-200 transition-colors hover:border-rune-200 hover:bg-rune-500/20 disabled:cursor-not-allowed disabled:opacity-45"
			>
				{isRuneOpening ? 'Confirming...' : runeCost === null ? 'RUNE unavailable' : `Exchange · ${runeCost} RUNE`}
			</button>
		</div>
	</motion.article>
	);
}
