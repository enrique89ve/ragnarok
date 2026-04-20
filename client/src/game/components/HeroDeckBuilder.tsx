/**
 * HeroDeckBuilder.tsx
 * Main deck builder component - presentation layer only.
 * All state and logic lives in useDeckBuilder hook.
 *
 * Following Feature-First architecture:
 * - Hook: ./deckbuilder/useDeckBuilder.ts
 * - Utils: ./deckbuilder/utils.ts
 * - Tokens: ./deckbuilder/tokens.css
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieceType } from '../stores/heroDeckStore';
import { useDeckBuilder, DECK_SIZE, isClassCard, getMaxCopies } from './deckbuilder';
import type { CardGroup } from './deckbuilder';
import { getCardArtPath } from '../utils/art/artMapping';
import { CardData } from '../types';
import { getSuperMinionForHero, getAllSuperMinionsForHero, isSuperMinion } from '../data/sets/superMinions/heroSuperMinions';
import { useHoloTracking, getHoloTier } from '../hooks/useHoloTracking';
import './deckbuilder/tokens.css';
import './deckbuilder/deckbuilder.css';
import './styles/holoEffect.css';

type RarityFilter = 'all' | 'common' | 'rare' | 'epic' | 'mythic';

interface HeroDeckBuilderProps {
	pieceType: PieceType;
	heroId: string;
	heroClass: string;
	heroName: string;
	heroPortrait?: string;
	onClose: () => void;
	onSave?: () => void;
}

const TYPE_ICONS: Record<string, string> = {
	minion: '\u2694',
	spell: '\u2728',
	weapon: '\uD83D\uDDE1',
	artifact: '\uD83D\uDD31',
	armor: '\uD83D\uDEE1',
};

function getClassColor(heroClass: string): string {
	const colors: Record<string, string> = {
		warrior: '#c2410c',
		mage: '#2563eb',
		hunter: '#16a34a',
		priest: '#e5e7eb',
		rogue: '#6b7280',
		paladin: '#eab308',
		warlock: '#7c3aed',
		druid: '#854d0e',
		shaman: '#0891b2',
		'berserker': '#15803d',
		'death knight': '#6366f1',
		monk: '#65a30d',
	};
	return colors[heroClass.toLowerCase()] || '#6b7280';
}

export const HeroDeckBuilder: React.FC<HeroDeckBuilderProps> = ({
	pieceType,
	heroId,
	heroClass,
	heroName,
	heroPortrait,
	onClose,
	onSave,
}) => {
	const db = useDeckBuilder({ pieceType, heroId, heroClass, onClose, onSave });
	const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all');
	const [hoveredCard, setHoveredCard] = useState<CardData | null>(null);
	const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
	const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const classColor = getClassColor(heroClass);
	const holo = useHoloTracking();

	const [tutorialStep, setTutorialStep] = useState(() => {
		try { return localStorage.getItem('ragnarok-deckbuilder-tutorial-seen') ? -1 : 0; }
		catch { return -1; }
	});
	const showTutorial = tutorialStep >= 0;
	const advanceTutorial = useCallback(() => {
		setTutorialStep(prev => {
			if (prev >= 2) {
				try { localStorage.setItem('ragnarok-deckbuilder-tutorial-seen', '1'); }
				catch { /* private browsing */ }
				return -1;
			}
			return prev + 1;
		});
	}, []);
	const dismissTutorial = useCallback(() => {
		setTutorialStep(-1);
		try { localStorage.setItem('ragnarok-deckbuilder-tutorial-seen', '1'); }
		catch { /* private browsing */ }
	}, []);

	const filteredGroupedCards = useMemo(() => {
		if (rarityFilter === 'all') return db.groupedCards;
		return db.groupedCards.map(g => ({
			...g,
			cards: g.cards.filter(c => (c.rarity || 'common').toLowerCase() === rarityFilter),
		})).filter(g => g.cards.length > 0);
	}, [db.groupedCards, rarityFilter]);

	const handleCardMouseEnter = useCallback((card: CardData, e: React.MouseEvent) => {
		if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		tooltipTimerRef.current = setTimeout(() => {
			setHoveredCard(card);
			setTooltipPos({ x: rect.right + 8, y: rect.top });
		}, 300);
	}, []);

	const handleCardMouseLeave = useCallback(() => {
		if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
		setHoveredCard(null);
	}, []);

	const manaCurve = useMemo(() => {
		const curve: number[] = new Array(8).fill(0);
		for (const { card, count } of db.deckCardsWithCounts) {
			const cost = Math.min(card.manaCost ?? 0, 7);
			curve[cost] += count;
		}
		return curve;
	}, [db.deckCardsWithCounts]);

	const maxCurveValue = Math.max(...manaCurve, 1);

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			className="deck-builder fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm"
			onClick={onClose}
		>
			<motion.div
				initial={{ scale: 0.95, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				exit={{ scale: 0.95, opacity: 0 }}
				transition={{ duration: 0.2 }}
				className="db-main-container w-[96vw] max-w-[1400px] h-[92vh] rounded-xl shadow-2xl flex flex-col overflow-hidden"
				onClick={e => e.stopPropagation()}
			>
				{/* Header */}
				<div className="db-header flex-shrink-0">
					<div className="db-header-portrait">
						{heroPortrait ? (
							<>
								<img src={heroPortrait} alt={heroName} loading="lazy" />
								<div className="db-header-portrait-overlay" />
							</>
						) : (
							<div className="db-header-fallback" style={{ background: `linear-gradient(135deg, ${classColor}40, ${classColor}15)` }}>
								<span className="db-header-fallback-letter" style={{ color: classColor }}>{heroName.charAt(0)}</span>
							</div>
						)}
					</div>
					<div className="db-header-info">
						<div>
							<div className="db-header-title">Build Deck: {heroName}</div>
							<div className="db-header-subtitle">{pieceType} &bull; {heroClass} Class</div>
						</div>
						<div className="db-header-actions">
							<div className={`db-header-counter ${db.isDeckComplete ? 'complete' : 'incomplete'}`}>
								{db.deckCardIds.length}/{DECK_SIZE} Cards
							</div>
							<button type="button" onClick={onClose} className="db-close-btn">&times;</button>
						</div>
					</div>
				</div>

				<AnimatePresence>
				{showTutorial && (
					<motion.div
						className="db-tutorial-overlay"
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: 'auto' }}
						exit={{ opacity: 0, height: 0 }}
						transition={{ duration: 0.35, ease: 'easeOut' }}
					>
						<div className="db-tutorial-inner">
							<div className="db-tutorial-progress">
								{[0, 1, 2].map(i => (
									<div key={i} className={`db-tutorial-pip ${i === tutorialStep ? 'active' : ''} ${i < tutorialStep ? 'done' : ''}`} />
								))}
							</div>
							<AnimatePresence mode="wait">
								<motion.div
									key={tutorialStep}
									className="db-tutorial-card"
									initial={{ opacity: 0, x: 30 }}
									animate={{ opacity: 1, x: 0 }}
									exit={{ opacity: 0, x: -30 }}
									transition={{ duration: 0.2 }}
								>
									{tutorialStep === 0 && (
										<>
											<div className="db-tutorial-icon">
												<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
													<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
												</svg>
											</div>
											<div className="db-tutorial-text">
												<div className="db-tutorial-title">Add Cards</div>
												<div className="db-tutorial-desc"><kbd>Left-click</kbd> any card in the grid to add it to your deck</div>
											</div>
										</>
									)}
									{tutorialStep === 1 && (
										<>
											<div className="db-tutorial-icon">
												<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
													<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
												</svg>
											</div>
											<div className="db-tutorial-text">
												<div className="db-tutorial-title">Inspect Cards</div>
												<div className="db-tutorial-desc"><kbd>Right-click</kbd> a card to flip it and read full details</div>
											</div>
										</>
									)}
									{tutorialStep === 2 && (
										<>
											<div className="db-tutorial-icon">
												<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
													<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
												</svg>
											</div>
											<div className="db-tutorial-text">
												<div className="db-tutorial-title">Find Cards</div>
												<div className="db-tutorial-desc">Use the <strong>search</strong> and <strong>filters</strong> to narrow by type, rarity, or mana cost</div>
											</div>
										</>
									)}
								</motion.div>
							</AnimatePresence>
							<div className="db-tutorial-actions">
								<button type="button" className="db-tutorial-skip" onClick={dismissTutorial}>Skip</button>
								<button type="button" className="db-tutorial-next" onClick={advanceTutorial}>
									{tutorialStep >= 2 ? 'Ready' : 'Next'}
									{tutorialStep < 2 && (
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
											<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
										</svg>
									)}
								</button>
							</div>
						</div>
					</motion.div>
				)}
				</AnimatePresence>

				{/* Main Content */}
				<div className="db-main-split">
					{/* Card Collection / Art Gallery */}
					<div className="db-collection-pane">
						<>
						{/* Filters */}
						<div className="db-filter-bar">
							<div className="db-filter-row">
								<input
									type="text"
									placeholder="Search cards..."
									value={db.searchTerm}
									onChange={e => db.setSearchTerm(e.target.value)}
									className="db-search-input"
								/>
								<select
									value={db.filterType}
									onChange={e => db.setFilterType(e.target.value as any)}
									className="db-filter-select"
									title="Filter by card type"
								>
									<option value="all">All Types</option>
									<option value="minion">Minions</option>
									<option value="spell">Spells</option>
									<option value="weapon">Weapons</option>
									<option value="artifact">Artifacts</option>
									<option value="armor">Armor</option>
								</select>
								<select
									value={rarityFilter}
									onChange={e => setRarityFilter(e.target.value as RarityFilter)}
									className="db-filter-select"
									title="Filter by rarity"
								>
									<option value="all">All Rarities</option>
									<option value="common">Common</option>
									<option value="rare">Rare</option>
									<option value="epic">Epic</option>
									<option value="mythic">Mythic</option>
								</select>
								<select
									value={db.sortBy}
									onChange={e => db.setSortBy(e.target.value as any)}
									className="db-filter-select"
									title="Sort cards"
								>
									<option value="cost">Sort by Cost</option>
									<option value="name">Sort by Name</option>
									<option value="type">Sort by Type</option>
								</select>
							</div>
							<div className="db-filter-mana-row">
								<div className="db-mana-filter">
									{[0, 1, 2, 3, 4, 5, 6, 7].map(cost => (
										<button
											type="button"
											key={cost}
											onClick={() => db.handleManaFilter(cost)}
											className={`db-mana-btn ${(db.minCost === cost || (cost === 7 && db.minCost === 7)) ? 'active' : ''}`}
										>
											{cost === 7 ? '7+' : cost}
										</button>
									))}
								</div>
								{db.minCost !== null && (
									<button type="button" onClick={db.handleClearManaFilter} className="db-clear-mana-btn">
										Clear
									</button>
								)}
								<span className="db-showing-count" style={{ marginLeft: 'auto' }}>
									{db.totalFilteredCards} of {db.totalValidCards} cards
								</span>
							</div>
						</div>

						{/* Card Grid - Grouped by Class */}
						<div className="db-card-scroll">
							{filteredGroupedCards.length === 0 && (
								<div className="db-no-results">No cards found matching your filters</div>
							)}
							{filteredGroupedCards.map(group => (
								<div key={group.label} className="db-card-group">
									<div className="db-group-header">
										<span className="db-group-label">{group.label}</span>
										<span className="db-group-count">{group.cards.length}</span>
									</div>
									<div className="db-card-grid">
										{group.cards.map(card => {
											const cardId = Number(card.id);
											const inDeckCount = db.deckCardCounts[cardId] || 0;
											const canAdd = db.canAddCard(cardId);
											const rarityKey = (card.rarity || 'common').toLowerCase();
											const isMinion = card.type === 'minion';
											const maxCopies = getMaxCopies(card);
											const cardArtPath = getCardArtPath(card.name, cardId);
											const isMaxed = !canAdd && inDeckCount >= maxCopies;
											const isSuper = isSuperMinion(cardId);
											const isLinkedSuper = isSuper && getAllSuperMinionsForHero(db.heroId).includes(cardId);

											return (
												<div
													key={card.id}
													onClick={() => {
														if (canAdd) db.handleAddCard(card);
													}}
													onContextMenu={e => {
														e.preventDefault();
														db.setSelectedCard(card);
													}}
													onMouseEnter={e => handleCardMouseEnter(card, e)}
													onMouseMove={holo.onMouseMove}
													onMouseLeave={e => { holo.onMouseLeave(e); handleCardMouseLeave(); }}
													className={`db-card rarity-${rarityKey} ${getHoloTier(rarityKey) || ''} ${isMaxed ? 'not-playable' : ''} ${isLinkedSuper ? 'super-minion-linked' : ''}`}
													title={canAdd ? 'Click to add \u2022 Right-click for details' : 'Right-click for details'}
												>
													{/* Art Section */}
													<div className="db-card-art">
														{cardArtPath ? (
															<>
																<img src={cardArtPath} alt="" loading="lazy" />
																<div className="db-card-art-overlay" />
															</>
														) : (
															<div className="db-card-art-fallback" style={{ background: `linear-gradient(135deg, ${classColor}25 0%, ${classColor}08 100%)` }}>
																{TYPE_ICONS[card.type] || '\u2726'}
															</div>
														)}

														{rarityKey !== 'common' && rarityKey !== 'basic' && (
														<>
															<div className="holo-foil" />
															<div className="holo-glitter" />
															<div className="holo-glare" />
														</>
													)}

														{/* Mana Badge */}
														<div className="db-mana-badge">{card.manaCost ?? 0}</div>

														{rarityKey !== 'common' && rarityKey !== 'basic' && (
															<span className={`db-rarity-badge rarity-${rarityKey}`}>
																{rarityKey === 'mythic' ? 'MYTHIC' : rarityKey === 'epic' ? 'EPIC' : 'RARE'}
															</span>
														)}

														{/* Super Minion Badge */}
														{isLinkedSuper && (
															<div className="db-super-badge" title="Your Super Minion! Gets +2/+2 when played by this hero">
																{'\u2B50'}
															</div>
														)}

														{/* Count Badge */}
														{inDeckCount > 0 && (
															<div className="db-count-badge">{inDeckCount}/{maxCopies}</div>
														)}
													</div>

													{/* Info Section */}
													<div className="db-card-info">
														<div className="db-card-name">{card.name}</div>
														{card.description && (
															<div className="db-card-desc">{card.description}</div>
														)}
														<div className="db-card-meta">
															<div className="db-card-meta-left">
																<span className="db-card-type">{card.type}</span>
																{isClassCard(card) && <span className="db-class-star">{'\u2605'}</span>}
																{isLinkedSuper && <span className="db-super-tag">SUPER</span>}
															</div>
															{isMinion && (
																<div className="db-stat-row">
																	<span className="db-stat db-stat-attack">
																		<span className="db-stat-icon">{'\u2694'}</span>
																		{(card as any).attack ?? 0}
																	</span>
																	<span className="db-stat db-stat-health">
																		<span className="db-stat-icon">{'\u2665'}</span>
																		{(card as any).health ?? 0}
																	</span>
																</div>
															)}
															{card.type === 'artifact' && (
																<div className="db-stat-row">
																	<span className="db-stat db-stat-attack">
																		<span className="db-stat-icon">{'\u2694'}</span>
																		{(card as any).attack ?? 0}
																	</span>
																</div>
															)}
															{card.type === 'armor' && (
																<div className="db-stat-row">
																	<span className="db-stat db-stat-health">
																		<span className="db-stat-icon">{'\uD83D\uDEE1'}</span>
																		{(card as any).armorValue ?? 0}
																	</span>
																</div>
															)}
														</div>
													</div>

													{/* MAX Overlay */}
													{isMaxed && (
														<div className="db-max-overlay">
															<span className="db-max-text">MAX</span>
														</div>
													)}
												</div>
											);
										})}
									</div>
								</div>
							))}
						</div>
						</>
					</div>

					{/* Deck Sidebar */}
					<div className="db-sidebar">
						<div className="db-sidebar-header">
							<div className="db-sidebar-title">Your Deck</div>
							<div className="db-sidebar-actions">
								<button
									type="button"
									onClick={db.handleAutoFill}
									disabled={db.isDeckComplete}
									className="db-sidebar-btn auto-fill"
								>
									Auto-fill
								</button>
								<button
									type="button"
									onClick={db.handleClearDeck}
									disabled={db.deckCardIds.length === 0}
									className="db-sidebar-btn clear"
								>
									Clear
								</button>
							</div>
						</div>

						{/* Mana Curve */}
						{db.deckCardIds.length > 0 && (
							<div className="db-mana-curve">
								{manaCurve.map((count, i) => (
									<div key={i} className="db-mana-bar-wrap">
										<div className="db-mana-bar-track">
											<div
												className="db-mana-bar"
												style={{ height: count > 0 ? `${Math.max((count / maxCurveValue) * 100, 8)}%` : '0%', opacity: count > 0 ? 1 : 0.15 }}
											/>
										</div>
										<span className="db-mana-bar-label">{i === 7 ? '7+' : i}</span>
									</div>
								))}
							</div>
						)}

						<div className="db-sidebar-list">
							{db.deckCardsWithCounts.length === 0 ? (
								<div className="db-sidebar-empty">Click cards to add them to your deck</div>
							) : (
								db.deckCardsWithCounts.map(({ card, count }) => {
									const rarityKey = (card.rarity || 'common').toLowerCase();
									return (
										<div
											key={card.id}
											onClick={() => db.handleRemoveCard(card)}
											className={`db-deck-card rarity-${rarityKey}`}
										>
											<div className="db-deck-mana">{card.manaCost ?? 0}</div>
											<span className="db-deck-name">{card.name}</span>
											{count > 1 && (
												<div className="db-deck-count">{count}</div>
											)}
										</div>
									);
								})
							)}
						</div>

						<div className="db-sidebar-footer">
							{db.saveError && (
								<div className="db-save-error">{db.saveError}</div>
							)}
							<button
								type="button"
								onClick={db.handleSave}
								className={`db-save-btn ${db.isDeckComplete ? 'complete' : 'incomplete'}`}
							>
								{db.isDeckComplete ? 'Save Complete Deck' : `Save Deck (${db.deckCardIds.length}/30)`}
							</button>
						</div>
					</div>
				</div>
			</motion.div>

			{/* Hover Tooltip */}
			{hoveredCard && (
				<div
					className="db-tooltip"
					style={{
						left: Math.min(tooltipPos.x, window.innerWidth - 300),
						top: Math.min(tooltipPos.y, window.innerHeight - 200),
					}}
				>
					<div className="db-tooltip-name">{hoveredCard.name}</div>
					{hoveredCard.description && (
						<div className="db-tooltip-desc">{hoveredCard.description}</div>
					)}
					{(hoveredCard as any).keywords?.length > 0 && (
						<div className="db-tooltip-keywords">
							{((hoveredCard as any).keywords as string[]).map((kw: string) => (
								<span key={kw} className="db-tooltip-kw">{kw}</span>
							))}
						</div>
					)}
					{(hoveredCard as any).race && (
						<div className="db-tooltip-race">Race: {(hoveredCard as any).race}</div>
					)}
				</div>
			)}

			{/* Card Detail Flip (right-click) */}
			<AnimatePresence>
				{db.selectedCard && (
					<CardDetailFlip
						card={db.selectedCard}
						classColor={classColor}
						onClose={() => db.setSelectedCard(null)}
						canAdd={db.canAddCard(Number(db.selectedCard.id))}
						inDeckCount={db.deckCardCounts[Number(db.selectedCard.id)] || 0}
						maxCopies={getMaxCopies(db.selectedCard)}
						onAddCard={() => db.handleAddCard(db.selectedCard!)}
						onRemoveCard={() => db.handleRemoveCard(db.selectedCard!)}
					/>
				)}
			</AnimatePresence>
		</motion.div>
	);
};

const RARITY_LABELS: Record<string, string> = {
	mythic: 'MYTHIC',
	epic: 'EPIC',
	rare: 'RARE',
	common: 'COMMON',
	basic: 'BASIC',
};

const CardDetailFlip: React.FC<{
	card: CardData;
	classColor: string;
	onClose: () => void;
	canAdd: boolean;
	inDeckCount: number;
	maxCopies: number;
	onAddCard: () => void;
	onRemoveCard: () => void;
}> = ({ card, classColor, onClose, canAdd, inDeckCount, maxCopies, onAddCard, onRemoveCard }) => {
	const [isFlipped, setIsFlipped] = useState(false);
	const [isFlipping, setIsFlipping] = useState(false);
	const holo = useHoloTracking();

	const rarityKey = (card.rarity || 'common').toLowerCase();
	const holoTier = getHoloTier(rarityKey);
	const cardArtPath = getCardArtPath(card.name, card.id);
	const isMinion = card.type === 'minion';
	const keywords = (card as any).keywords as string[] | undefined;
	const flavorText = (card as any).flavorText as string | undefined;

	const handleFlip = useCallback((e: React.MouseEvent) => {
		e.stopPropagation();
		e.preventDefault();
		if (isFlipping) return;
		setIsFlipping(true);
		setIsFlipped(prev => !prev);
		setTimeout(() => setIsFlipping(false), 700);
	}, [isFlipping]);

	const flipTransition = isFlipping
		? 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)'
		: 'none';

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			className="fixed inset-0 z-[210] db-detail-backdrop"
			onClick={onClose}
		>
			<div className="cd-scene">
				<div
					className="cd-inner"
					style={{
						transform: `rotateY(${isFlipped ? 180 : 0}deg)`,
						transition: flipTransition,
					}}
					onClick={e => e.stopPropagation()}
					onContextMenu={handleFlip}
				>
					{/* FRONT FACE */}
					<div
						className={`cd-front rarity-${rarityKey} ${holoTier || ''}`}
						onMouseMove={holo.onMouseMove}
						onMouseLeave={holo.onMouseLeave}
					>
						<div className="cd-front-art">
							{cardArtPath ? (
								<img src={cardArtPath} alt="" loading="lazy" />
							) : (
								<div className="cd-front-art-fallback" style={{ background: `linear-gradient(135deg, ${classColor}25, ${classColor}08)` }}>
									{TYPE_ICONS[card.type] || '\u2726'}
								</div>
							)}

							{holoTier && (
								<>
									<div className="holo-foil" />
									<div className="holo-glitter" />
									<div className="holo-glare" />
								</>
							)}
						</div>

						{/* Mana gem */}
						<div className="cd-front-mana"><span>{card.manaCost ?? 0}</span></div>

						{/* Rarity badge */}
						{rarityKey !== 'common' && rarityKey !== 'basic' && (
							<span className={`cd-front-badge rarity-${rarityKey}`}>
								{RARITY_LABELS[rarityKey] || rarityKey.toUpperCase()}
							</span>
						)}

						{/* Name plate */}
						<div className="cd-front-plate">
							<div className="cd-front-name">{card.name}</div>
							<div className="cd-front-type">
								{card.type}{isClassCard(card) ? ` \u2605 Class` : ''}
							</div>
						</div>

						{/* Stat gems for minions */}
						{isMinion && (
							<>
								<div className="cd-front-stat attack">{(card as any).attack ?? 0}</div>
								<div className="cd-front-stat health">{(card as any).health ?? 0}</div>
							</>
						)}

						{/* Flip hint */}
						<div className="cd-front-hint">Right-click to flip</div>

						{/* Deck action buttons */}
						<div className="cd-deck-actions" onClick={e => e.stopPropagation()}>
							{canAdd && (
								<button
									type="button"
									className="cd-add-btn"
									onClick={onAddCard}
								>
									+ Add to Deck {inDeckCount > 0 ? `(${inDeckCount}/${maxCopies})` : ''}
								</button>
							)}
							{!canAdd && inDeckCount > 0 && (
								<span className="cd-maxed-label">{inDeckCount}/{maxCopies} in deck</span>
							)}
							{inDeckCount > 0 && (
								<button
									type="button"
									className="cd-remove-btn"
									onClick={onRemoveCard}
								>
									- Remove
								</button>
							)}
						</div>
					</div>

					{/* BACK FACE */}
					<div className="cd-back">
						<div className="cd-back-header">
							<div>
								<div className="cd-back-name">{card.name}</div>
								<div className="cd-back-subtitle">
									{card.type}{(card as any).race ? ` \u2022 ${(card as any).race}` : ''}
									{isClassCard(card) ? ' \u2022 Class Card' : ''}
								</div>
							</div>
							<button type="button" className="cd-back-flip-btn" onClick={handleFlip} title="Flip back">
								&#x21BB;
							</button>
						</div>

						<div className="cd-back-scroll">
							{/* Stats */}
							{isMinion && (
								<div className="cd-back-stats">
									<div className="cd-back-stat">
										<span className="cd-back-stat-val" style={{ color: '#2563eb' }}>{card.manaCost ?? 0}</span>
										<span className="cd-back-stat-label">Mana</span>
									</div>
									<div className="cd-back-stat">
										<span className="cd-back-stat-val" style={{ color: '#fbbf24' }}>{(card as any).attack ?? 0}</span>
										<span className="cd-back-stat-label">Attack</span>
									</div>
									<div className="cd-back-stat">
										<span className="cd-back-stat-val" style={{ color: '#f87171' }}>{(card as any).health ?? 0}</span>
										<span className="cd-back-stat-label">Health</span>
									</div>
								</div>
							)}

							{card.type === 'spell' && (
								<div className="cd-back-stats">
									<div className="cd-back-stat">
										<span className="cd-back-stat-val" style={{ color: '#2563eb' }}>{card.manaCost ?? 0}</span>
										<span className="cd-back-stat-label">Mana</span>
									</div>
									<div className="cd-back-stat">
										<span className={`cd-back-rarity rarity-${rarityKey}`}>{RARITY_LABELS[rarityKey] || rarityKey}</span>
									</div>
								</div>
							)}

							{card.type === 'artifact' && (
								<div className="cd-back-stats">
									<div className="cd-back-stat">
										<span className="cd-back-stat-val" style={{ color: '#2563eb' }}>{card.manaCost ?? 0}</span>
										<span className="cd-back-stat-label">Mana</span>
									</div>
									<div className="cd-back-stat">
										<span className="cd-back-stat-val" style={{ color: '#fbbf24' }}>{(card as any).attack ?? 0}</span>
										<span className="cd-back-stat-label">Attack</span>
									</div>
								</div>
							)}

							{card.type === 'armor' && (
								<div className="cd-back-stats">
									<div className="cd-back-stat">
										<span className="cd-back-stat-val" style={{ color: '#60a5fa' }}>{(card as any).armorValue ?? 0}</span>
										<span className="cd-back-stat-label">Armor</span>
									</div>
									<div className="cd-back-stat">
										<span className="cd-back-stat-val" style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{(card as any).armorSlot || '?'}</span>
										<span className="cd-back-stat-label">Slot</span>
									</div>
								</div>
							)}

							{/* Description */}
							{card.description && (
								<>
									<div className="cd-back-divider">Effect</div>
									<div className="cd-back-desc">{card.description}</div>
								</>
							)}

							{/* Keywords */}
							{keywords && keywords.length > 0 && (
								<>
									<div className="cd-back-divider">Keywords</div>
									<div className="cd-back-keywords">
										{keywords.map((kw: string) => (
											<span key={kw} className="cd-back-keyword">{kw}</span>
										))}
									</div>
								</>
							)}

							{/* Flavor text */}
							{flavorText && (
								<div className="cd-back-flavor">"{flavorText}"</div>
							)}
						</div>
					</div>
				</div>

				{/* Close button */}
				<button
					type="button"
					className="cd-close"
					onClick={(e) => { e.stopPropagation(); onClose(); }}
					title="Close"
				>
					&#x2715;
				</button>
			</div>
		</motion.div>
	);
};

export default HeroDeckBuilder;
