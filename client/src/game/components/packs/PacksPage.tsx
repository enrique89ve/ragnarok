import { debug } from '../../config/debugConfig';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { routes } from '../../../lib/routes';
import PackOpeningAnimation from './PackOpeningAnimation';
import { getRarityColor } from '../../utils/rarityUtils';
import { cardRegistry } from '../../data/cardRegistry';
import { getNFTBridge } from '../../nft';
import { useNFTUsername, useNFTTokenBalance } from '../../nft/hooks';
import { RAGNAROK_ACCOUNT } from '../../../data/blockchain/hiveConfig';
import { derivePackCards } from '../../../data/blockchain/packDerivation';
import { forceSync } from '../../../data/blockchain/replayEngine';
import { toast } from 'sonner';
import type {
	PackType,
	PackTypeResponse,
	SupplyStatsResponse,
	SupplyStats,
	ProcessedRarityStats,
	RevealedCard,
	PackOpenResponse,
	OpenedCard,
	RarityStats
} from './types';
import './packs.css';

const RARITY_ORDER = ['mythic', 'epic', 'rare', 'common'] as const;

const RUNE_COST: Record<string, number> = {
	starter:   50,
	booster:  100,
	premium:  250,
	mythic:   500,
};

const RARITY_COLORS: Record<string, string> = {
	mythic: '#ec4899',
	epic: '#a855f7',
	rare: '#3b82f6',
	common: '#9ca3af',
};

const PACK_THEMES: Record<string, { seal: string; btn: string; card: string; icon: string }> = {
	'Starter Pack': { seal: 'pack-seal-starter', btn: 'open-btn-starter', card: 'pack-card-starter', icon: '石' },
	'Booster Pack': { seal: 'pack-seal-booster', btn: 'open-btn-booster', card: 'pack-card-booster', icon: '盾' },
	'Premium Pack': { seal: 'pack-seal-premium', btn: 'open-btn-premium', card: 'pack-card-premium', icon: '冠' },
	'Mythic Pack': { seal: 'pack-seal-mythic', btn: 'open-btn-mythic', card: 'pack-card-mythic', icon: '龍' },
};

function getPackTheme(name: string) {
	return PACK_THEMES[name] || PACK_THEMES['Starter Pack'];
}

const FALLBACK_PACKS: PackType[] = [
	{ id: 1, name: 'Starter Pack', description: '5 cards with guaranteed rare or better', price: 100, cardCount: 5, rarityOdds: { common: 60, rare: 25, epic: 10, mythic: 5 } },
	{ id: 2, name: 'Booster Pack', description: '5 cards with improved rare odds', price: 200, cardCount: 5, rarityOdds: { common: 45, rare: 30, epic: 15, mythic: 10 } },
	{ id: 3, name: 'Premium Pack', description: '7 cards with guaranteed epic or better', price: 500, cardCount: 7, rarityOdds: { common: 30, rare: 30, epic: 25, mythic: 15 } },
	{ id: 4, name: 'Mythic Pack', description: '7 cards with guaranteed mythic', price: 1000, cardCount: 7, rarityOdds: { common: 15, rare: 25, epic: 30, mythic: 30 } },
];

const CARD_POOL = cardRegistry.filter(c => c.rarity && c.name && Number(c.id) >= 1000);

function openPackLocally(pack: PackType): RevealedCard[] {
	const byRarity: Record<string, typeof CARD_POOL> = {};
	for (const c of CARD_POOL) {
		const r = (c.rarity ?? 'common').toLowerCase();
		(byRarity[r] ??= []).push(c);
	}
	const pick = (rarity: string) => {
		const pool = byRarity[rarity] ?? byRarity['common'] ?? [];
		if (pool.length === 0) return null;
		return pool[Math.floor(Math.random() * pool.length)];
	};
	const odds = pack.rarityOdds;
	const totalWeight = odds.common + odds.rare + odds.epic + odds.mythic;
	const rollRarity = () => {
		let roll = Math.random() * totalWeight;
		if ((roll -= odds.mythic) < 0) return 'mythic';
		if ((roll -= odds.epic) < 0) return 'epic';
		if ((roll -= odds.rare) < 0) return 'rare';
		return 'common';
	};
	const cards: RevealedCard[] = [];
	for (let i = 0; i < pack.cardCount; i++) {
		const rarity = rollRarity();
		const card = pick(rarity);
		if (card) {
			cards.push({
				id: Number(card.id), name: card.name,
				rarity: (card.rarity ?? 'common').toLowerCase(),
				type: card.type ?? 'minion', heroClass: card.heroClass ?? 'neutral',
			});
		}
	}
	return cards;
}

function getScarcityInfo(percentRemaining: number): { label: string; class: string } {
	if (percentRemaining <= 0) return { label: 'SOLD OUT', class: 'scarcity-badge-soldout' };
	if (percentRemaining <= 10) return { label: 'ALMOST GONE', class: 'scarcity-badge-critical' };
	if (percentRemaining <= 25) return { label: 'LOW SUPPLY', class: 'scarcity-badge-low' };
	return { label: 'AVAILABLE', class: 'scarcity-badge-fresh' };
}

function formatNumber(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
	return n.toLocaleString();
}

function getPackGuarantees(pack: any): string[] {
	const guarantees: string[] = [];
	if (pack.rarityOdds.epic > 0) guarantees.push('Epic');
	if (pack.cardCount >= 7) guarantees.push(`${pack.cardCount} Cards`);
	return guarantees;
}

function parseNum(v: string | number): number {
	return typeof v === 'string' ? parseInt(v, 10) || 0 : v || 0;
}

// ============================================================
// v1.1: Sealed Packs Inventory
// ============================================================

function SealedPacksSection() {
	const packs = getNFTBridge().getPackCollection().filter(p => p.sealed);
	const [sendingPack, setSendingPack] = useState<string | null>(null);
	const [recipient, setRecipient] = useState('');
	const [sending, setSending] = useState(false);

	if (packs.length === 0) return null;

	const handleBurnPack = async (packUid: string) => {
		const salt = Array.from(crypto.getRandomValues(new Uint8Array(32)))
			.map(b => b.toString(16).padStart(2, '0')).join('');
		const result = await getNFTBridge().burnPack(packUid, salt);
		if (result.success) {
			getNFTBridge().removePack(packUid);
			toast.success('Pack opened! Check your collection.');
		} else {
			toast.error(result.error || 'Failed to open pack');
		}
	};

	const handleSendPack = async () => {
		if (!sendingPack || !recipient.trim()) return;
		setSending(true);
		const result = await getNFTBridge().transferPack(sendingPack, recipient.trim());
		if (result.success) {
			getNFTBridge().removePack(sendingPack);
			toast.success(`Pack sent to @${recipient.trim()}`);
			setSendingPack(null);
			setRecipient('');
		} else {
			toast.error(result.error || 'Failed to send pack');
		}
		setSending(false);
	};

	// Group by pack type
	const grouped = new Map<string, typeof packs>();
	for (const p of packs) {
		const list = grouped.get(p.packType) ?? [];
		list.push(p);
		grouped.set(p.packType, list);
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			className="mb-12"
		>
			<h2 className="text-lg font-bold text-amber-300 mb-4 uppercase tracking-wider text-center">
				Your Sealed Packs
			</h2>
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				{[...grouped.entries()].map(([packType, typePacks]) => (
					<div
						key={packType}
						className="bg-gradient-to-b from-amber-900/20 to-gray-900/40 rounded-xl p-4 border border-amber-600/30"
					>
						<div className="text-center mb-3">
							<div className="text-2xl mb-1">
								{packType === 'mythic' ? '龍' : packType === 'premium' ? '冠' : packType === 'standard' ? '盾' : '石'}
							</div>
							<div className="text-amber-300 font-bold capitalize">{packType}</div>
							<div className="text-gray-400 text-sm">x{typePacks.length}</div>
						</div>
						<div className="flex gap-2">
							<button
								type="button"
								onClick={() => handleBurnPack(typePacks[0].uid)}
								className="flex-1 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm rounded-lg transition-colors"
							>
								Open
							</button>
							<button
								type="button"
								onClick={() => setSendingPack(typePacks[0].uid)}
								className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
							>
								Send
							</button>
						</div>
					</div>
				))}
			</div>

			{/* Send Pack Modal */}
			{sendingPack && (
				<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
					<div className="bg-gray-900 border border-amber-600/40 rounded-xl p-6 w-96 max-w-[90vw]">
						<h3 className="text-amber-300 font-bold text-lg mb-4">Send Sealed Pack</h3>
						<p className="text-gray-400 text-sm mb-4">
							This will transfer the sealed pack to another player via Hive Keychain (0.001 HIVE atomic transfer).
						</p>
						<input
							type="text"
							placeholder="Recipient username"
							value={recipient}
							onChange={e => setRecipient(e.target.value.toLowerCase())}
							className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white mb-4 focus:border-amber-500 focus:outline-none"
						/>
						<div className="flex gap-3">
							<button
								type="button"
								onClick={() => { setSendingPack(null); setRecipient(''); }}
								className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleSendPack}
								disabled={sending || !recipient.trim()}
								className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg transition-colors"
							>
								{sending ? 'Sending...' : 'Confirm Send'}
							</button>
						</div>
					</div>
				</div>
			)}
		</motion.div>
	);
}

export default function PacksPage() {
	const tokenBalance = useNFTTokenBalance();
	const hiveUsername = useNFTUsername();
	const runeBalance = tokenBalance?.RUNE ?? 0;

	const [packTypes, setPackTypes] = useState<PackType[]>(FALLBACK_PACKS);
	const [supplyStats, setSupplyStats] = useState<SupplyStats | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [openingPack, setOpeningPack] = useState<PackType | null>(null);
	const [revealedCards, setRevealedCards] = useState<RevealedCard[]>([]);
	const [isOpening, setIsOpening] = useState(false);
	const [packError, setPackError] = useState<string | null>(null);
	const [runeOpening, setRuneOpening] = useState<string | null>(null);
	const [testMinting, setTestMinting] = useState(false);

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
				const card = pool[Math.floor(Math.random() * pool.length)];
				testCards.push({
					nft_id: `test-${Date.now()}-${i}`,
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

				forceSync(hiveUsername!).catch(err => debug.warn('[Packs] Sync error:', err));
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

	useEffect(() => {
		fetchData();
	}, []);

	const fetchData = async () => {
		try {
			setLoading(true);
			setError(null);
			const [typesRes, statsRes] = await Promise.all([
				fetch('/api/packs/types'),
				fetch('/api/packs/supply-stats')
			]);

			if (typesRes.ok) {
				const typesData: PackTypeResponse = await typesRes.json();
				const mappedPacks = (typesData.packs || []).map((pack: any) => ({
					id: pack.id,
					name: pack.name,
					description: pack.description || '',
					price: pack.price,
					cardCount: pack.card_count,
					rarityOdds: {
						common: pack.common_slots * 10,
						rare: pack.rare_slots * 10,
						epic: pack.epic_slots * 10,
						mythic: (pack.legendary_chance ?? 0) + (pack.mythic_chance ?? 0),
					}
				}));
				setPackTypes(mappedPacks);
			} else {
				setPackTypes(FALLBACK_PACKS);
			}

			if (statsRes.ok) {
				const statsData: SupplyStatsResponse = await statsRes.json();
				const overall = statsData.overall || {
					total_max_supply: 0, total_remaining_supply: 0,
					total_reward_reserve: 0, total_pack_supply: 0, total_pack_remaining: 0
				};
				const rarityList = statsData.byRarity || [];

				const totalMaxSupply = parseNum(overall.total_max_supply);
				const totalPackSupply = parseNum(overall.total_pack_supply);
				const totalPackRemaining = parseNum(overall.total_pack_remaining);
				const totalRewardReserve = parseNum(overall.total_reward_reserve);
				const totalPulled = totalPackSupply - totalPackRemaining;

				const mythicStats = rarityList.find((r: RarityStats) => r.nft_rarity === 'mythic');

				const mythicPulled = mythicStats
					? parseNum(mythicStats.pack_supply) - parseNum(mythicStats.pack_remaining)
					: 0;

				const mythicRate = totalPulled > 0 ? ((mythicPulled / totalPulled) * 100) : 0;

				const byRarity: ProcessedRarityStats[] = [];
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
					totalMaxSupply: totalMaxSupply,
					totalPackSupply: totalPackSupply,
					totalPackRemaining: totalPackRemaining,
					totalRewardReserve: totalRewardReserve,
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
			setError(null);
		} finally {
			setLoading(false);
		}
	};

	const handleOpenPack = async (pack: PackType) => {
		setOpeningPack(pack);
		setIsOpening(true);
		setPackError(null);

		const packKey = pack.name.split(' ')[0].toLowerCase();

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

				forceSync(hiveUsername!).catch(err => debug.warn('[Packs] Sync error:', err));
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
				body: JSON.stringify({ packTypeId: pack.id, userId: 1 })
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

	const handleOpenWithRune = async (pack: PackType) => {
		const packKey = pack.name.split(' ')[0].toLowerCase();
		const cost = RUNE_COST[packKey] ?? 100;
		if (runeBalance < cost) return;
		if (!hiveUsername) return;

		setRuneOpening(pack.id.toString());
		setOpeningPack(pack);
		setIsOpening(true);
		setPackError(null);

		const result = await getNFTBridge().openPack(packKey, 1);
		setRuneOpening(null);

		if (result.success && result.trxId) {
			getNFTBridge().updateTokenBalance({ RUNE: runeBalance - cost });

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

			forceSync(hiveUsername!).catch(err => debug.warn('[Packs] Sync error:', err));
			toast.success(`Opened ${derived.length} cards with RUNE!`);
		} else {
			setPackError(result.error ?? 'RUNE pack open failed. Please try again.');
			setIsOpening(false);
			setOpeningPack(null);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-950 to-gray-900 flex items-center justify-center">
				<motion.div
					animate={{ rotate: 360 }}
					transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
					className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full"
				/>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-950 to-gray-900 flex items-center justify-center">
				<div className="text-center">
					<p className="text-red-400 text-xl mb-4">{error}</p>
					<motion.button
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						onClick={fetchData}
						className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors"
					>
						Retry
					</motion.button>
				</div>
			</div>
		);
	}

	const packPercentRemaining = supplyStats && supplyStats.totalPackSupply > 0
		? (supplyStats.totalPackRemaining / supplyStats.totalPackSupply) * 100
		: 100;
	const scarcity = getScarcityInfo(packPercentRemaining);

	return (
		<div className="h-full overflow-y-auto bg-gradient-to-b from-gray-900 via-purple-950 to-gray-900 p-8 pb-16">
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
					className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg"
				>
					{packError}
					<button
						type="button"
						onClick={() => setPackError(null)}
						className="ml-4 text-white/80 hover:text-white"
					>
						✕
					</button>
				</motion.div>
			)}

			<div className="max-w-7xl mx-auto">
				{/* Navigation */}
				<div className="flex justify-between items-center mb-8">
					<Link to={routes.home}>
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							className="px-6 py-3 bg-gray-800/80 hover:bg-gray-700/80 text-white rounded-lg border border-gray-600 flex items-center gap-2 transition-colors"
						>
							<span>←</span>
							<span>Back to Home</span>
						</motion.button>
					</Link>
					<div className="flex items-center gap-3">
						{hiveUsername && (
							<div className="flex items-center gap-2 px-4 py-2 bg-amber-900/40 border border-amber-600/40 rounded-lg text-sm">
								<span className="text-amber-400">⚡</span>
								<span className="text-amber-200 font-bold">{runeBalance.toLocaleString()}</span>
								<span className="text-amber-500 text-xs">RUNE</span>
							</div>
						)}
						{getNFTBridge().isHiveMode() && hiveUsername && hiveUsername! === RAGNAROK_ACCOUNT && (
							<motion.button
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								onClick={handleTestMint}
								disabled={testMinting}
								className="px-6 py-3 bg-green-700 hover:bg-green-600 text-white rounded-lg border border-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{testMinting ? 'Minting...' : 'Test Mint 5 NFTs'}
							</motion.button>
						)}
						<Link to={routes.collection}>
							<motion.button
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg border border-indigo-400 transition-colors"
							>
								View Collection →
							</motion.button>
						</Link>
					</div>
				</div>

				{/* Title */}
				<motion.h1
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					className="text-5xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400"
					style={{ textShadow: '0 0 40px rgba(251, 191, 36, 0.4)' }}
				>
					Norse Mythos Card Packs
				</motion.h1>
				<motion.p
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.2 }}
					className="text-gray-400 text-center mb-8 text-lg"
				>
					Limited supply — once they're gone, they're gone forever
				</motion.p>

				{/* ========== GLOBAL SUPPLY BANNER ========== */}
				{supplyStats && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.3 }}
						className="supply-banner mb-8"
					>
						<div className="relative z-10">
							{/* Main supply numbers */}
							<div className="flex items-center justify-between mb-4">
								<div>
									<div className="text-xs uppercase tracking-widest text-gray-500 mb-1">Pack Supply</div>
									<div className="flex items-baseline gap-3">
										<span className="supply-number supply-number-large text-amber-400">
											{supplyStats.totalPackRemaining.toLocaleString()}
										</span>
										<span className="text-gray-500 text-lg">/</span>
										<span className="supply-number supply-number-medium text-gray-400">
											{supplyStats.totalPackSupply.toLocaleString()}
										</span>
										<span className="text-gray-500 text-sm ml-1">available in packs</span>
									</div>
								</div>
								<div className="text-right">
									<div className={`scarcity-badge ${scarcity.class} mb-1`}>
										{scarcity.label}
									</div>
									<div className="text-gray-400 text-sm">
										{packPercentRemaining.toFixed(1)}% remaining
									</div>
								</div>
							</div>

							{/* Supply progress bar */}
							<div className="supply-bar mb-5">
								<div
									className="supply-bar-fill"
									style={{ width: `${packPercentRemaining}%` }}
								/>
							</div>

							{/* Rarity breakdown */}
							<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
								{supplyStats.byRarity.map(rs => {
									const color = RARITY_COLORS[rs.rarity] || '#9ca3af';
									const percentRemaining = rs.packSupply > 0
										? (rs.packRemaining / rs.packSupply) * 100
										: 0;
									return (
										<div
											key={rs.rarity}
											className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.06]"
										>
											<div className="flex items-center justify-between mb-1">
												<span
													className={`text-xs font-bold uppercase ${getRarityColor(rs.rarity)}`}
												>
													{rs.rarity}
												</span>
												<span className="text-gray-500 text-[10px]">
													{rs.uniqueCards} cards
												</span>
											</div>
											<div className="supply-number text-sm mb-1" style={{ color }}>
												{formatNumber(rs.packRemaining)}
												<span className="text-gray-500 text-xs ml-1">
													/ {formatNumber(rs.packSupply)}
												</span>
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

							{/* Reward reserve info */}
							<div className="reward-reserve-badge">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
									<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
								</svg>
								<span>
									{supplyStats.totalRewardReserve.toLocaleString()} cards reserved for in-game rewards
								</span>
								<span className="text-teal-400/50 text-xs ml-1">(not available in packs)</span>
							</div>
						</div>
					</motion.div>
				)}

				{/* ========== PACK GRID ========== */}
				{packTypes.length === 0 ? (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className="text-center py-20"
					>
						<p className="text-gray-400 text-xl mb-4">No packs available at the moment.</p>
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={fetchData}
							className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors"
						>
							Refresh
						</motion.button>
					</motion.div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
						{packTypes.map((pack, index) => {
							const theme = getPackTheme(pack.name);
							const guarantees = getPackGuarantees(pack);

							return (
								<motion.div
									key={pack.id}
									initial={{ opacity: 0, y: 30 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.1 * index }}
									className={`pack-card ${theme.card}`}
								>
									<div className="p-6">
										{/* Pack Seal */}
										<div className={`pack-seal ${theme.seal} mb-4 rounded-xl`}>
											<div className="pack-seal-glow" />
											<div className="pack-seal-icon">
												<span className="text-3xl font-black text-white/90 select-none">
													{theme.icon}
												</span>
											</div>
										</div>

										{/* Pack Info */}
										<h3 className="text-xl font-bold text-white mb-1">{pack.name}</h3>
										<p className="text-gray-400 text-sm mb-3 h-10 leading-tight">{pack.description}</p>

										{/* Guarantees */}
										{guarantees.length > 0 && (
											<div className="flex flex-wrap gap-1.5 mb-3">
												{guarantees.map(g => (
													<span key={g} className="guarantee-tag">{g}</span>
												))}
											</div>
										)}

										{/* Price + Card Count */}
										<div className="flex justify-between items-center mb-4">
											<span className="pack-price text-amber-400">
												{pack.price.toLocaleString()}
											</span>
											<span className="text-gray-400 text-sm font-medium">
												{pack.cardCount} cards
											</span>
										</div>

										{/* Rarity Odds Bars */}
										<div className="space-y-1.5 mb-5">
											<div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
												Rarity Odds
											</div>
											{Object.entries(pack.rarityOdds)
												.filter(([, odds]) => odds > 0)
												.map(([rarity, odds]) => (
													<div key={rarity} className="flex items-center gap-2">
														<span className={`text-[10px] w-14 text-right capitalize ${getRarityColor(rarity)}`}>
															{rarity}
														</span>
														<div className="odds-bar flex-1">
															<div
																className={`odds-bar-fill odds-bar-fill-${rarity}`}
																style={{ width: `${Math.min(odds, 100)}%` }}
															/>
														</div>
														<span className="text-gray-400 text-[10px] w-8 text-right">
															{odds}%
														</span>
													</div>
												))
											}
										</div>

										{/* Open Button */}
										<motion.button
											whileHover={{ scale: 1.02 }}
											whileTap={{ scale: 0.98 }}
											onClick={() => handleOpenPack(pack)}
											className={`open-btn ${theme.btn}`}
										>
											Open Pack
										</motion.button>

										{/* Open with RUNE */}
										{hiveUsername && (() => {
											const packKey = pack.name.split(' ')[0].toLowerCase();
											const cost = RUNE_COST[packKey] ?? 100;
											const canAfford = runeBalance >= cost;
											const isLoading = runeOpening === pack.id.toString();
											return (
												<motion.button
													whileHover={{ scale: canAfford ? 1.02 : 1 }}
													whileTap={{ scale: canAfford ? 0.98 : 1 }}
													onClick={() => canAfford && !isLoading && handleOpenWithRune(pack)}
													disabled={!canAfford || isLoading}
													className={`w-full mt-2 py-2 rounded-lg text-sm font-semibold transition-all border ${
														canAfford
															? 'bg-amber-900/50 hover:bg-amber-800/60 text-amber-300 border-amber-600/50'
															: 'bg-gray-800/30 text-gray-500 border-gray-700/30 cursor-not-allowed'
													}`}
												>
													{isLoading ? '···' : `⚡ ${cost} RUNE`}
												</motion.button>
											);
										})()}
									</div>
								</motion.div>
							);
						})}
					</div>
				)}

				{/* ========== SEALED PACKS INVENTORY (v1.1) ========== */}
				<SealedPacksSection />

				{/* ========== COMMUNITY STATS (only when packs opened) ========== */}
				{supplyStats && supplyStats.totalCardsOpened > 0 && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.5 }}
					>
						<h2 className="text-lg font-bold text-gray-300 mb-4 text-center uppercase tracking-wider">
							Community Stats
						</h2>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							<div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/50 text-center">
								<div className="text-2xl font-bold text-amber-400">
									{supplyStats.totalPacksOpened.toLocaleString()}
								</div>
								<div className="text-gray-400 text-sm">Packs Opened</div>
							</div>
							<div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/50 text-center">
								<div className="text-2xl font-bold text-blue-400">
									{supplyStats.totalCardsOpened.toLocaleString()}
								</div>
								<div className="text-gray-400 text-sm">Cards Collected</div>
							</div>
							<div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/50 text-center">
								<div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
									{supplyStats.mythicDropRate}%
								</div>
								<div className="text-gray-400 text-sm">Mythic Rate</div>
							</div>
						</div>
					</motion.div>
				)}
			</div>
		</div>
	);
}
