import { debug } from '../../config/debugConfig';
import { showStatus } from '../ui/GameStatusBanner';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { routes } from '../../../lib/routes';
import { getRarityColor, getRarityBackground, getTypeIcon } from '../../utils/rarityUtils';
import { getCardArtPath } from '../../utils/art/artMapping';
import { getHoloTier, applyHoloVars, resetHoloVars } from '../../hooks/useHoloTracking';
import type { OwnedCard, InventoryResponse, InventoryCard } from '../packs/types';
import { getMasteryTier } from '../../../data/blockchain/cardXPSystem';
import { useCraftingStore } from '../../crafting/craftingStore';
import { getEitrValue, getCraftCost } from '../../crafting/craftingConstants';
import { cardRegistry } from '../../data/cardRegistry';
import { getNFTBridge } from '../../nft';
import { useNFTCollection } from '../../nft/hooks';
import NFTProvenanceViewer from './NFTProvenanceViewer';
import SendCardModal from './SendCardModal';
import { useCollectionMilestoneStore } from '../../stores/collectionMilestoneStore';
import './collection.css';
import '../styles/holoEffect.css';

type FilterRarity = 'all' | 'basic' | 'common' | 'rare' | 'epic' | 'mythic';
type FilterType = 'all' | 'hero' | 'minion' | 'spell' | 'weapon';
type SortBy = 'recent' | 'name' | 'rarity' | 'mint';

interface CollectionStats {
	uniqueCards: number;
	totalCards: number;
	completionPercentage: number;
	totalInGame: number;
	byRarity: { rarity: string; uniqueCards: number; totalCards: number }[];
	byType: { type: string; uniqueCards: number; totalCards: number }[];
}

const RARITY_ORDER: Record<string, number> = { mythic: 0, epic: 1, rare: 2, common: 3, basic: 4 };

const RARITY_PILLS: { value: FilterRarity; label: string; color: string; activeColor: string }[] = [
	{ value: 'all', label: 'All', color: 'rgba(255,255,255,0.06)', activeColor: 'rgba(139,92,246,0.5)' },
	{ value: 'mythic', label: 'Mythic', color: 'rgba(236,72,153,0.15)', activeColor: 'rgba(236,72,153,0.6)' },
	{ value: 'epic', label: 'Epic', color: 'rgba(147,51,234,0.15)', activeColor: 'rgba(147,51,234,0.5)' },
	{ value: 'rare', label: 'Rare', color: 'rgba(59,130,246,0.15)', activeColor: 'rgba(59,130,246,0.5)' },
	{ value: 'common', label: 'Common', color: 'rgba(107,114,128,0.15)', activeColor: 'rgba(107,114,128,0.5)' },
	{ value: 'basic', label: 'Basic', color: 'rgba(156,163,175,0.15)', activeColor: 'rgba(156,163,175,0.5)' },
];

const TYPE_PILLS: { value: FilterType; label: string; icon: string }[] = [
	{ value: 'all', label: 'All', icon: '' },
	{ value: 'hero', label: 'Heroes', icon: '👑' },
	{ value: 'minion', label: 'Minions', icon: '⚔️' },
	{ value: 'spell', label: 'Spells', icon: '✨' },
	{ value: 'weapon', label: 'Weapons', icon: '🗡️' },
];

function getClassGradient(heroClass: string): string {
	switch (heroClass) {
		case 'warrior': return 'linear-gradient(135deg, #92400e 0%, #78350f 100%)';
		case 'mage': return 'linear-gradient(135deg, #1e3a5f 0%, #172554 100%)';
		case 'priest': return 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)';
		case 'paladin': return 'linear-gradient(135deg, #a16207 0%, #854d0e 100%)';
		case 'hunter': return 'linear-gradient(135deg, #166534 0%, #14532d 100%)';
		case 'druid': return 'linear-gradient(135deg, #713f12 0%, #422006 100%)';
		case 'warlock': return 'linear-gradient(135deg, #581c87 0%, #3b0764 100%)';
		case 'shaman': return 'linear-gradient(135deg, #1e3a5f 0%, #0c4a6e 100%)';
		case 'rogue': return 'linear-gradient(135deg, #1c1917 0%, #292524 100%)';
		case 'death_knight': case 'deathknight': return 'linear-gradient(135deg, #164e63 0%, #0e7490 100%)';
		case 'berserker': return 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)';
		default: return 'linear-gradient(135deg, #374151 0%, #1f2937 100%)';
	}
}

function getFrameClass(rarity: string): string {
	if (rarity === 'mythic') return 'card-frame card-frame-mythic mythic-card-frame';
	return `card-frame card-frame-${rarity}`;
}

function getShimmerClass(rarity: string): string {
	switch (rarity) {
		case 'rare': return 'foil-shimmer foil-shimmer-rare';
		case 'epic': return 'foil-shimmer foil-shimmer-epic';
		case 'mythic': return 'foil-shimmer foil-shimmer-mythic';
		default: return '';
	}
}

export default function CollectionPage() {
	const hiveCards = useNFTCollection();
	const eitr = useCraftingStore(s => s.eitr);
	const addEitr = useCraftingStore(s => s.addEitr);
	const spendEitr = useCraftingStore(s => s.spendEitr);
	const [craftConfirm, setCraftConfirm] = useState<'craft' | 'disenchant' | null>(null);
	const [provenanceNft, setProvenanceNft] = useState<typeof hiveCards[0] | null>(null);
	const [sendNft, setSendNft] = useState<typeof hiveCards[0] | null>(null);

	const [cards, setCards] = useState<OwnedCard[]>([]);
	const [stats, setStats] = useState<CollectionStats | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [filterRarity, setFilterRarity] = useState<FilterRarity>('all');
	const [filterType, setFilterType] = useState<FilterType>('all');
	const [searchQuery, setSearchQuery] = useState('');
	const [sortBy, setSortBy] = useState<SortBy>('rarity');
	const [selectedCard, setSelectedCard] = useState<OwnedCard | null>(null);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [totalCards, setTotalCards] = useState(0);
	const [isLoadingMore, setIsLoadingMore] = useState(false);

	useEffect(() => {
		const controller = new AbortController();
		fetchInventory(1, controller.signal);
		fetchStats(controller.signal);
		return () => { controller.abort(); };
	}, []);

	useEffect(() => {
		setPage(1);
	}, [filterRarity, filterType, searchQuery]);

	// Collection milestone check — runs when cards change
	const checkMilestones = useCollectionMilestoneStore(s => s.checkMilestones);
	useEffect(() => {
		if (cards.length === 0) return;
		const mythicCount = cards.filter(c => c.rarity === 'mythic').length;
		const epicCount = cards.filter(c => c.rarity === 'epic').length;
		const newlyEarned = checkMilestones(cards.length, mythicCount, epicCount);
		for (const m of newlyEarned) {
			showStatus(`${m.icon} ${m.name} — ${m.description}`, 'success', 5000);
		}
	}, [cards.length, checkMilestones]);

	const loadLocalCollection = () => {
		const allCards = cardRegistry.filter(c => c.collectible !== false);
		const localCards: OwnedCard[] = allCards.map(c => ({
			id: typeof c.id === 'string' ? parseInt(c.id, 10) : c.id,
			name: c.name,
			rarity: c.rarity || 'common',
			type: c.type,
			heroClass: (c as any).class || (c as any).heroClass || (c as any).cardClass || 'neutral',
			quantity: 1,
			description: (c as any).description,
			attack: 'attack' in c ? (c as any).attack : undefined,
			health: 'health' in c ? (c as any).health : undefined,
			manaCost: (c as any).manaCost,
		}));
		setCards(localCards);
		setTotalCards(localCards.length);
		setTotalPages(1);
		setPage(1);
		setError(null);
		setLoading(false);
	};

	const fetchInventory = async (pageNum: number, signal?: AbortSignal) => {
		try {
			if (pageNum === 1) setLoading(true);
			else setIsLoadingMore(true);
			setError(null);

			const res = await fetch(`/api/inventory/1?page=${pageNum}&limit=30`, { signal });

			if (res.ok) {
				const data: InventoryResponse = await res.json();
				const mappedCards = (data.inventory || []).map((card: InventoryCard) => ({
					id: card.card_id,
					name: card.card_name,
					rarity: card.nft_rarity,
					type: card.card_type,
					heroClass: card.hero_class,
					quantity: card.quantity,
					mintNumber: card.mint_number,
					maxSupply: card.max_supply,
					imageUrl: card.imageUrl,
				}));
				setCards(mappedCards);

				if (data.pagination) {
					setPage(data.pagination.page);
					setTotalPages(data.pagination.totalPages);
					setTotalCards(data.pagination.total);
				}
			} else {
				loadLocalCollection();
			}
		} catch (err) {
			if (err instanceof DOMException && err.name === 'AbortError') return;
			debug.warn('API unavailable, using local collection:', err);
			loadLocalCollection();
		} finally {
			setLoading(false);
			setIsLoadingMore(false);
		}
	};

	const fetchStats = async (signal?: AbortSignal) => {
		try {
			const res = await fetch('/api/inventory/1/stats', { signal });
			if (res.ok) {
				const data = await res.json();
				if (data.success && data.stats) {
					const s = data.stats;
					setStats({
						uniqueCards: s.overall.uniqueCards,
						totalCards: s.overall.totalCards,
						completionPercentage: s.overall.completionPercentage,
						totalInGame: Math.round(s.overall.uniqueCards / (s.overall.completionPercentage / 100)) || 0,
						byRarity: s.byRarity || [],
						byType: s.byType || [],
					});
				}
			}
		} catch (err) {
			if (err instanceof DOMException && err.name === 'AbortError') return;
			debug.error('Error fetching stats:', err);
		}
	};

	const hiveCardMap = useMemo(
		() => new Map(hiveCards.map(c => [c.cardId, c])),
		[hiveCards],
	);

	const filteredAndSorted = useMemo(() => {
		let result = cards.filter(card => {
			if (filterRarity !== 'all' && card.rarity !== filterRarity) return false;
			if (filterType !== 'all' && card.type !== filterType) return false;
			if (searchQuery && !card.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
			return true;
		});

		result.sort((a, b) => {
			switch (sortBy) {
				case 'name': return a.name.localeCompare(b.name);
				case 'rarity': return (RARITY_ORDER[a.rarity] ?? 5) - (RARITY_ORDER[b.rarity] ?? 5);
				case 'mint': return (a.mintNumber ?? 99999) - (b.mintNumber ?? 99999);
				case 'recent': default: return 0;
			}
		});

		return result;
	}, [cards, filterRarity, filterType, searchQuery, sortBy]);

	const parentRef = useRef<HTMLDivElement>(null);
	const COLUMNS = 6;
	const rows = useMemo(() => {
		const result: OwnedCard[][] = [];
		for (let i = 0; i < filteredAndSorted.length; i += COLUMNS) {
			result.push(filteredAndSorted.slice(i, i + COLUMNS));
		}
		return result;
	}, [filteredAndSorted]);

	const rowVirtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => 280,
		overscan: 3,
	});

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

	return (
		<div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-950 to-gray-900 p-6 md:p-8">
			<div className="max-w-7xl mx-auto">
				{/* Header Nav */}
				<div className="flex justify-between items-center mb-6">
					<Link to={routes.home}>
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							className="px-5 py-2.5 bg-gray-800/80 hover:bg-gray-700/80 text-white rounded-lg border border-gray-600 flex items-center gap-2 text-sm transition-colors"
						>
							<span>←</span> Back to Home
						</motion.button>
					</Link>
					<div className="flex items-center gap-2 px-4 py-2 bg-blue-900/30 border border-blue-700/40 rounded-lg">
						<span className="text-blue-400 font-bold text-sm">{eitr}</span>
						<span className="text-gray-400 text-xs">Eitr</span>
					</div>
					<Link to={routes.packs}>
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded-lg text-sm font-semibold transition-colors"
						>
							Open Packs →
						</motion.button>
					</Link>
				</div>

				{/* Title */}
				<motion.h1
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					className="text-4xl md:text-5xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400"
					style={{ textShadow: '0 0 40px rgba(99, 102, 241, 0.4)' }}
				>
					My Collection
				</motion.h1>

				{/* Stats Dashboard */}
				{stats && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.1 }}
						className="mt-6 mb-8"
					>
						{/* Completion Bar */}
						<div className="mb-4">
							<div className="flex justify-between items-baseline mb-2">
								<span className="text-gray-400 text-sm">Collection Progress</span>
								<span className="text-white font-bold text-lg">
									{stats.uniqueCards}
									<span className="text-gray-500 font-normal text-sm"> / {stats.totalInGame || '???'}</span>
									<span className="text-purple-400 ml-2 text-sm font-semibold">({stats.completionPercentage}%)</span>
								</span>
							</div>
							<div className="completion-bar">
								<div
									className="completion-bar-fill"
									style={{ width: `${Math.min(stats.completionPercentage, 100)}%` }}
								/>
							</div>
						</div>

						{/* Rarity + Type Breakdown */}
						<div className="grid grid-cols-2 gap-4">
							{/* Rarity Breakdown */}
							<div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/50">
								<div className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">By Rarity</div>
								<div className="flex flex-wrap gap-2">
									{(['mythic', 'epic', 'rare', 'common', 'basic'] as const).map(rarity => {
										const rs = stats.byRarity.find(r => r.rarity === rarity);
										return (
											<div key={rarity} className="rarity-stat-card" style={{ background: `rgba(255,255,255,0.03)` }}>
												<div className={`text-lg font-bold ${getRarityColor(rarity)}`}>
													{rs?.uniqueCards ?? 0}
												</div>
												<div className="text-gray-500 text-[10px] uppercase">{rarity}</div>
											</div>
										);
									})}
								</div>
							</div>

							{/* Type Breakdown */}
							<div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/50">
								<div className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">By Type</div>
								<div className="flex flex-wrap gap-2">
									{(['hero', 'minion', 'spell', 'weapon'] as const).map(type => {
										const ts = stats.byType.find(t => t.type === type);
										return (
											<div key={type} className="rarity-stat-card" style={{ background: `rgba(255,255,255,0.03)` }}>
												<div className="text-lg font-bold text-white">
													{getTypeIcon(type)} {ts?.uniqueCards ?? 0}
												</div>
												<div className="text-gray-500 text-[10px] uppercase">{type}s</div>
											</div>
										);
									})}
								</div>
							</div>
						</div>
					</motion.div>
				)}

				{/* Filter Bar */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2 }}
					className="bg-gray-800/40 rounded-xl p-4 mb-6 border border-gray-700/50"
				>
					{/* Search + Sort Row */}
					<div className="flex gap-3 mb-3">
						<div className="flex-1 relative">
							<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
							<input
								type="text"
								placeholder="Search cards..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-full pl-9 pr-4 py-2 bg-gray-900/60 border border-gray-600/50 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
							/>
						</div>
						<select
							value={sortBy}
							onChange={(e) => setSortBy(e.target.value as SortBy)}
							title="Sort cards by"
							className="px-3 py-2 bg-gray-900/60 border border-gray-600/50 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500/50"
						>
							<option value="rarity">Sort: Rarity</option>
							<option value="name">Sort: Name A-Z</option>
							<option value="mint">Sort: Mint # (Low)</option>
							<option value="recent">Sort: Recent</option>
						</select>
					</div>

					{/* Rarity Pills */}
					<div className="flex flex-wrap gap-2 mb-2">
						{RARITY_PILLS.map(pill => (
							<button
								key={pill.value}
								onClick={() => setFilterRarity(pill.value)}
								className={`filter-pill ${filterRarity === pill.value ? 'filter-pill-active' : 'filter-pill-inactive'}`}
								style={filterRarity === pill.value ? { background: pill.activeColor, borderColor: pill.activeColor } : {}}
							>
								{pill.label}
							</button>
						))}
					</div>

					{/* Type Pills */}
					<div className="flex flex-wrap gap-2">
						{TYPE_PILLS.map(pill => (
							<button
								key={pill.value}
								onClick={() => setFilterType(pill.value)}
								className={`filter-pill ${filterType === pill.value ? 'filter-pill-active' : 'filter-pill-inactive'}`}
								style={filterType === pill.value ? { background: 'rgba(139,92,246,0.5)', borderColor: 'rgba(139,92,246,0.5)' } : {}}
							>
								{pill.icon && <span className="mr-1">{pill.icon}</span>}
								{pill.label}
							</button>
						))}
					</div>
				</motion.div>

				{/* Error State */}
				{error && (
					<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8 mb-8">
						<p className="text-red-400 text-lg mb-4">{error}</p>
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={() => fetchInventory(1)}
							className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors"
						>
							Retry
						</motion.button>
					</motion.div>
				)}

				{/* Empty Collection */}
				{cards.length === 0 && !error ? (
					<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
						<p className="text-gray-400 text-xl mb-4">Your collection is empty</p>
						<p className="text-gray-500 mb-8">Open some packs to start building your collection!</p>
						<Link to={routes.packs}>
							<motion.button
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								className="px-8 py-4 bg-gradient-to-r from-amber-600 to-amber-500 text-white font-bold rounded-xl"
							>
								Open Packs to Get Cards
							</motion.button>
						</Link>
					</motion.div>
				) : filteredAndSorted.length === 0 ? (
					<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
						<p className="text-gray-400 text-xl mb-4">No cards match your filters</p>
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={() => { setFilterRarity('all'); setFilterType('all'); setSearchQuery(''); }}
							className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
						>
							Clear Filters
						</motion.button>
					</motion.div>
				) : (
					<>
						<div ref={parentRef} style={{ height: '70vh', overflow: 'auto' }}>
							<div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
								{rowVirtualizer.getVirtualItems().map((virtualRow) => (
									<div
										key={virtualRow.key}
										style={{
											position: 'absolute',
											top: 0,
											left: 0,
											width: '100%',
											height: `${virtualRow.size}px`,
											transform: `translateY(${virtualRow.start}px)`,
										}}
									>
										<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
											{rows[virtualRow.index].map((card, colIndex) => {
												const hiveAsset = hiveCardMap.get(card.id);
												const masteryTier = hiveAsset ? getMasteryTier(hiveAsset.xp, card.rarity) : 0;
												return (
													<motion.div
														key={`${card.id}-${colIndex}`}
														initial={{ opacity: 0, scale: 0.9 }}
														animate={{ opacity: 1, scale: 1 }}
														onClick={() => setSelectedCard(card)}
														className={`relative cursor-pointer rounded-xl overflow-hidden ${getFrameClass(card.rarity)}`}
														style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #16162a 100%)', aspectRatio: '3 / 4' }}
													>
														{card.rarity !== 'common' && (
															<div className={getShimmerClass(card.rarity)} />
														)}

														{masteryTier >= 2 && (
															<div className={`mastery-badge mastery-tier-${masteryTier}`}>
																{'★'.repeat(masteryTier)}
															</div>
														)}

														{/* Card art area with holo */}
														{(() => {
															const artPath = getCardArtPath(card.name, card.id);
															const holoTier = getHoloTier(card.rarity);
															return (
																<div
																	className={`relative h-full ${holoTier ?? ''}`}
																	onMouseMove={holoTier ? (e) => { applyHoloVars(e.currentTarget as HTMLElement, e); } : undefined}
																	onMouseLeave={holoTier ? (e) => { resetHoloVars(e.currentTarget as HTMLElement); } : undefined}
																>
																	{/* Art image */}
																	<div className="relative w-full h-full overflow-hidden rounded-xl">
																		{artPath ? (
																			<img
																				src={artPath}
																				alt={card.name}
																				className="w-full h-full object-cover"
																				loading="lazy"
																				draggable={false}
																			/>
																		) : (
																			<div
																				className="w-full h-full flex items-center justify-center"
																				style={{ background: getClassGradient(card.heroClass) }}
																			>
																				<span className="text-4xl opacity-80">{getTypeIcon(card.type)}</span>
																			</div>
																		)}

																		{/* Dark gradient overlay for text readability */}
																		<div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

																		{/* Holo layers */}
																		{holoTier && (
																			<>
																				<div className="holo-foil" />
																				<div className="holo-glitter" />
																				<div className="holo-glare" />
																			</>
																		)}
																	</div>

																	{/* Overlaid card info */}
																	<div className="absolute inset-0 p-2.5 flex flex-col pointer-events-none">
																		{/* Top row: mana cost + quantity */}
																		<div className="flex justify-between items-start">
																			{card.manaCost != null ? (
																				<div className="w-6 h-6 rounded-full bg-blue-600/90 border border-blue-300/60 flex items-center justify-center text-white font-bold text-[11px] shadow-lg">
																					{card.manaCost}
																				</div>
																			) : (
																				<span className="text-base drop-shadow-lg" title={card.type}>{getTypeIcon(card.type)}</span>
																			)}
																			{card.quantity > 1 && (
																				<div className="w-6 h-6 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold text-[10px] border border-amber-400 shadow-lg">
																					x{card.quantity}
																				</div>
																			)}
																		</div>

																		{/* Bottom: name + rarity + stats */}
																		<div className="mt-auto">
																			<h3 className="text-xs font-bold text-white truncate drop-shadow-lg mb-0.5">{card.name}</h3>
																			<div className="flex items-center justify-between">
																				<span className={`text-[10px] font-semibold uppercase ${getRarityColor(card.rarity)}`} style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
																					{card.rarity}
																				</span>
																				{card.attack != null && card.health != null && (
																					<span className="text-[10px] font-bold text-gray-200" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
																						{card.attack}/{card.health}
																					</span>
																				)}
																			</div>
																			{card.mintNumber != null && (
																				<div className="text-center mt-1">
																					<span className="mint-badge text-[9px]">
																						#{card.mintNumber}
																						<span className="text-gray-500 mx-0.5">/</span>
																						{card.maxSupply?.toLocaleString() ?? '???'}
																					</span>
																				</div>
																			)}
																		</div>
																	</div>
																</div>
															);
														})()}
													</motion.div>
												);
											})}
										</div>
									</div>
								))}
							</div>
						</div>

						{/* Pagination */}
						{totalPages > 1 && (
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								className="flex justify-center items-center gap-4 mt-8"
							>
								<motion.button
									whileHover={{ scale: page === 1 ? 1 : 1.05 }}
									whileTap={{ scale: page === 1 ? 1 : 0.95 }}
									onClick={() => page > 1 && fetchInventory(page - 1)}
									disabled={page === 1 || isLoadingMore}
									className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
										page === 1
											? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
											: 'bg-gray-700 hover:bg-gray-600 text-white'
									}`}
								>
									← Previous
								</motion.button>

								<div className="flex items-center gap-2 text-gray-300">
									{isLoadingMore ? (
										<motion.div
											animate={{ rotate: 360 }}
											transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
											className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full"
										/>
									) : (
										<span className="text-sm font-semibold">
											Page <span className="text-purple-400">{page}</span> of <span className="text-purple-400">{totalPages}</span>
										</span>
									)}
								</div>

								<motion.button
									whileHover={{ scale: page === totalPages ? 1 : 1.05 }}
									whileTap={{ scale: page === totalPages ? 1 : 0.95 }}
									onClick={() => page < totalPages && fetchInventory(page + 1)}
									disabled={page === totalPages || isLoadingMore}
									className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
										page === totalPages
											? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
											: 'bg-gray-700 hover:bg-gray-600 text-white'
									}`}
								>
									Next →
								</motion.button>
							</motion.div>
						)}
					</>
				)}
			</div>

			{/* Card Detail Modal */}
			<AnimatePresence>
				{selectedCard && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={() => { setSelectedCard(null); setCraftConfirm(null); }}
						className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
					>
						<motion.div
							initial={{ scale: 0.8, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.8, opacity: 0 }}
							onClick={(e) => e.stopPropagation()}
							className={`w-[380px] rounded-2xl overflow-hidden ${getFrameClass(selectedCard.rarity)}`}
							style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)' }}
						>
							{/* Foil Shimmer */}
							{selectedCard.rarity !== 'common' && (
								<div className={getShimmerClass(selectedCard.rarity)} />
							)}

							<div className="relative p-6">
								{/* Rarity + Type Header */}
								<div className="flex justify-between items-center mb-4">
									<span className="text-3xl">{getTypeIcon(selectedCard.type)}</span>
									<span className={`text-sm font-bold uppercase tracking-wider ${getRarityColor(selectedCard.rarity)}`}>
										{selectedCard.rarity} {selectedCard.type}
									</span>
								</div>

								{/* Art Area */}
								{(() => {
									const modalArt = getCardArtPath(selectedCard.name, selectedCard.id);
									return (
										<div className="w-full aspect-[4/3] rounded-xl mb-4 overflow-hidden border border-white/15 relative group">
											{modalArt ? (
												<img
													src={modalArt}
													alt={selectedCard.name}
													className="w-full h-full object-cover"
													draggable={false}
												/>
											) : (
												<div
													className="w-full h-full flex items-center justify-center"
													style={{ background: getClassGradient(selectedCard.heroClass) }}
												>
													<span className="text-7xl opacity-80">{getTypeIcon(selectedCard.type)}</span>
												</div>
											)}
											{/* Subtle vignette overlay */}
											<div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.5)]" />
											{/* Mana cost badge */}
											{selectedCard.manaCost != null && (
												<div className="absolute top-2 left-2 w-8 h-8 rounded-full bg-blue-600 border-2 border-blue-300 flex items-center justify-center text-white font-bold text-sm shadow-lg">
													{selectedCard.manaCost}
												</div>
											)}
										</div>
									);
								})()}

								{/* Card Name */}
								<h2 className="text-2xl font-bold text-white text-center mb-1">{selectedCard.name}</h2>
								<p className="text-gray-400 text-sm text-center capitalize mb-1">{selectedCard.heroClass}</p>

								{/* Card Description */}
								{selectedCard.description && (
									<p className="text-gray-300 text-xs text-center leading-relaxed mb-3 px-2 italic">
										{selectedCard.description}
									</p>
								)}

								{/* Mint Number Plate */}
								<div className="text-center mb-4">
									<div className="mint-badge-modal inline-block">
										<span className="text-white/90">
											{selectedCard.mintNumber ? `# ${selectedCard.mintNumber}` : '—'}
										</span>
										<span className="text-gray-500 mx-2">of</span>
										<span className="text-white/90">
											{selectedCard.maxSupply?.toLocaleString() ?? '???'}
										</span>
									</div>
									<div className={`text-xs mt-1 font-semibold uppercase tracking-widest ${getRarityColor(selectedCard.rarity)}`}>
										{selectedCard.rarity} Edition
									</div>
								</div>

								{/* Supply Meter */}
								{selectedCard.maxSupply && (
									<div className="mb-4">
										<div className="flex justify-between text-xs text-gray-500 mb-1">
											<span>Supply Claimed</span>
											<span>
												{selectedCard.mintNumber
													? `~${selectedCard.mintNumber} pulled`
													: 'Unknown'}
												{' / '}{selectedCard.maxSupply.toLocaleString()}
											</span>
										</div>
										<div className="supply-meter">
											<div
												className={`supply-meter-fill supply-meter-fill-${selectedCard.rarity}`}
												style={{
													width: selectedCard.mintNumber
														? `${Math.min((selectedCard.mintNumber / selectedCard.maxSupply) * 100, 100)}%`
														: '0%'
												}}
											/>
										</div>
									</div>
								)}

								{/* Minion Stats */}
								{selectedCard.type === 'minion' && selectedCard.attack !== undefined && selectedCard.health !== undefined && (
									<div className="flex justify-center gap-8 mb-4">
										<div className="text-center">
											<div className="stat-gem stat-gem-attack mb-1">{selectedCard.attack}</div>
											<p className="text-[10px] text-gray-500 uppercase">ATK</p>
										</div>
										<div className="text-center">
											<div className="stat-gem stat-gem-health mb-1">{selectedCard.health}</div>
											<p className="text-[10px] text-gray-500 uppercase">HP</p>
										</div>
									</div>
								)}

								{/* Mastery Tier */}
								{(() => {
									const a = hiveCardMap.get(selectedCard.id);
									const mt = a ? getMasteryTier(a.xp, selectedCard.rarity) : 0;
									if (mt < 2) return null;
									return (
										<div className="text-center mb-3">
											<span className={`mastery-badge-modal mastery-tier-${mt}`}>
												{'★'.repeat(mt)} {mt === 3 ? 'Divine' : 'Ascended'}
											</span>
											<div className="text-[10px] text-gray-500 mt-1">NFT Mastery</div>
										</div>
									);
								})()} 

								{/* Owned Count */}
								<div className="text-center text-gray-400 text-sm mb-4">
									Owned: <span className="text-white font-bold">{selectedCard.quantity}</span>
									{selectedCard.quantity > 1 && <span className="text-gray-500"> copies</span>}
								</div>

								{/* Eitr Forge Actions — forge disabled in v1 (non-canonical until replay-derived) */}
								{(() => {
									const eitrVal = getEitrValue(selectedCard.rarity);
									const craftCostVal = getCraftCost(selectedCard.rarity);
									const canAfford = eitr >= craftCostVal && craftCostVal > 0;

									if (craftConfirm) {
										return (
											<div className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-3 mb-3">
												<p className="text-xs text-gray-400 mb-2 text-center">
													{craftConfirm === 'disenchant'
														? `Dissolve ${selectedCard.name} into ${eitrVal} Eitr?`
														: `Forge a random ${selectedCard.rarity} card for ${craftCostVal} Eitr?`}
												</p>
												<div className="flex gap-2">
													<button
														onClick={() => {
															if (craftConfirm === 'disenchant') {
																const nft = hiveCards.find(c => c.cardId === selectedCard.id);
																const bridge = getNFTBridge();
																if (bridge.isHiveMode() && nft) {
																	import('../../../data/HiveSync').then(({ hiveSync }) => {
																		hiveSync.broadcastCustomJson('rp_burn' as any, { nft_id: nft.uid }).catch(() => { showStatus('On-chain burn failed — Eitr added locally only', 'warning'); });
																	});
																}
																addEitr(eitrVal);
																bridge.emitTokenUpdate('Eitr', eitr + eitrVal, eitrVal);
																setCards(prev => {
																	const idx = prev.findIndex(c => c.id === selectedCard.id);
																	if (idx === -1) return prev;
																	const card = prev[idx];
																	if (card.quantity <= 1) {
																		return prev.filter((_, i) => i !== idx);
																	}
																	return prev.map((c, i) => i === idx ? { ...c, quantity: c.quantity - 1 } : c);
																});
																if (nft?.uid) {
																getNFTBridge().removeCard(nft.uid);
															}
																if (selectedCard.quantity <= 1) setSelectedCard(null);
																else setSelectedCard({ ...selectedCard, quantity: selectedCard.quantity - 1 });
															} else {
																const pool = cardRegistry.filter(c => c.rarity?.toLowerCase() === selectedCard.rarity?.toLowerCase() && c.type !== 'hero' && c.collectible !== false);
																if (pool.length === 0) return;
																if (!spendEitr(craftCostVal)) return;
																getNFTBridge().emitTokenUpdate('Eitr', eitr - craftCostVal, -craftCostVal);
																const pick = pool[Math.floor(Math.random() * pool.length)];
																const pickId = typeof pick.id === 'number' ? pick.id : parseInt(pick.id as string, 10);
																const forgedCard: OwnedCard = {
																	id: pickId,
																	name: pick.name,
																	rarity: pick.rarity || 'common',
																	type: pick.type || 'minion',
																	heroClass: pick.heroClass || 'neutral',
																	quantity: 1,
																	manaCost: pick.manaCost,
																	attack: 'attack' in pick ? pick.attack : undefined,
																	health: 'health' in pick ? pick.health : undefined,
																	description: pick.description,
																};
																setCards(prev => {
																	const existing = prev.findIndex(c => c.id === pickId);
																	if (existing >= 0) {
																		return prev.map((c, i) => i === existing ? { ...c, quantity: c.quantity + 1 } : c);
																	}
																	return [forgedCard, ...prev];
																});
																getNFTBridge().addCard({
																	uid: `forge-${Date.now()}-${pickId}`,
																	cardId: pickId,
																	ownerId: hiveCards.length > 0 ? hiveCards[0].ownerId : 'local',
																	edition: 'alpha',
																	foil: 'standard',
																	rarity: pick.rarity || 'common',
																	level: 1,
																	xp: 0,
																	name: pick.name,
																	type: pick.type || 'minion',
																});
																setSelectedCard(forgedCard);
															}
															setCraftConfirm(null);
														}}
														className="flex-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold transition-colors"
													>
														Confirm
													</button>
													<button
														onClick={() => setCraftConfirm(null)}
														className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs transition-colors"
													>
														Cancel
													</button>
												</div>
											</div>
										);
									}

									return (
										<div className="flex gap-2 mb-3">
											{selectedCard.quantity > 0 && eitrVal > 0 && (
												<button
													onClick={() => setCraftConfirm('disenchant')}
													className="flex-1 px-3 py-2 bg-red-900/50 hover:bg-red-800/60 text-red-300 rounded-lg text-xs font-medium border border-red-700/40 transition-colors"
												>
													Dissolve ({eitrVal} Eitr)
												</button>
											)}
											{/* Forge disabled in v1 — Eitr non-canonical until replay-derived */}
										</div>
									);
								})()}

								{/* NFT Actions */}
							{(() => {
								const nftAsset = hiveCardMap.get(selectedCard.id);
								if (!nftAsset) return null;
								return (
									<div className="flex gap-2 mb-3">
										<button
											onClick={() => setProvenanceNft(nftAsset)}
											className="flex-1 px-3 py-2 bg-gray-800/60 hover:bg-gray-700/60 text-gray-300 rounded-lg text-xs font-medium border border-gray-600/40 transition-colors"
										>
											View on Chain
										</button>
										{getNFTBridge().isHiveMode() && (
											<button
												onClick={() => setSendNft(nftAsset)}
												className="flex-1 px-3 py-2 bg-emerald-900/50 hover:bg-emerald-800/60 text-emerald-300 rounded-lg text-xs font-medium border border-emerald-700/40 transition-colors"
											>
												Send to Friend
											</button>
										)}
									</div>
								);
							})()}

							{/* v1.1: DNA Heritage + Replicate/Merge */}
							{(() => {
								const nft = hiveCardMap.get(selectedCard.id);
								if (!nft) return null;
								const hiveCard = nft as unknown as Record<string, unknown>;
								const originDna = hiveCard.originDna as string | undefined;
								const instanceDna = hiveCard.instanceDna as string | undefined;
								const generation = (hiveCard.generation as number) ?? 0;
								const replicaCount = (hiveCard.replicaCount as number) ?? 0;
								const parentDna = hiveCard.parentInstanceDna as string | undefined;
								const hasDna = !!(originDna || instanceDna);
								const canMerge = (selectedCard.quantity ?? 0) >= 2;

								return (
									<>
										{hasDna && (
											<div className="mb-3 p-3 bg-indigo-900/20 rounded-lg border border-indigo-600/30">
												<div className="text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">Genetic Heritage</div>
												<div className="grid grid-cols-2 gap-2 text-xs">
													<div>
														<span className="text-gray-500">Generation:</span>
														<span className="text-indigo-200 ml-1">{generation}</span>
													</div>
													<div>
														<span className="text-gray-500">Replicas:</span>
														<span className="text-indigo-200 ml-1">{replicaCount}/3</span>
													</div>
													{originDna && (
														<div className="col-span-2">
															<span className="text-gray-500">Origin DNA:</span>
															<span className="text-indigo-300 ml-1 font-mono">{originDna.slice(0, 16)}...</span>
														</div>
													)}
													{parentDna && (
														<div className="col-span-2">
															<span className="text-gray-500">Parent:</span>
															<span className="text-purple-300 ml-1 font-mono">{parentDna.slice(0, 16)}...</span>
														</div>
													)}
												</div>
											</div>
										)}
										<div className="flex gap-2 mb-3">
											<button
												type="button"
												onClick={async () => {
													const result = await getNFTBridge().replicateCard(nft.uid);
													if (result.success) showStatus(`Replicated ${selectedCard.name}!`, 'success');
													else showStatus(result.error || 'Replicate failed', 'error');
												}}
												disabled={replicaCount >= 3 || generation >= 3}
												className="flex-1 px-3 py-2 bg-indigo-900/50 hover:bg-indigo-800/60 disabled:opacity-30 text-indigo-300 rounded-lg text-xs font-medium border border-indigo-700/40 transition-colors"
											>
												Replicate
											</button>
											{canMerge && (
												<button
													type="button"
													onClick={async () => {
														const sameCards = getNFTBridge().getCardCollection().filter(c => c.cardId === selectedCard.id);
														if (sameCards.length < 2) { showStatus('Need 2 copies to merge', 'error'); return; }
														const result = await getNFTBridge().mergeCards([sameCards[0].uid, sameCards[1].uid]);
														if (result.success) showStatus(`Merged into Ascended ${selectedCard.name}!`, 'success');
														else showStatus(result.error || 'Merge failed', 'error');
													}}
													className="flex-1 px-3 py-2 bg-purple-900/50 hover:bg-purple-800/60 text-purple-300 rounded-lg text-xs font-medium border border-purple-700/40 transition-colors"
												>
													Merge (2 → 1)
												</button>
											)}
										</div>
									</>
								);
							})()}

							{/* Close Button */}
								<motion.button
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
									onClick={() => { setSelectedCard(null); setCraftConfirm(null); }}
									className="w-full py-3 bg-gray-700/80 hover:bg-gray-600/80 text-white font-semibold rounded-xl transition-all text-sm"
								>
									Close
								</motion.button>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			<NFTProvenanceViewer
				nft={provenanceNft}
				onClose={() => setProvenanceNft(null)}
				onSend={(nft) => { setProvenanceNft(null); setSendNft(nft); }}
			/>

			<SendCardModal
				nft={sendNft}
				onClose={() => setSendNft(null)}
				onSuccess={() => {
					setSelectedCard(null);
					setSendNft(null);
				}}
			/>
		</div>
	);
}
