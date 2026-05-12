import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { routes } from '../../../lib/routes';
import { getRarityColor, getRarityBorder, getRarityGlow, getRarityBackground, getTypeIcon } from '../../utils/rarityUtils';
import { getCardArtPath } from '../../utils/art/artMapping';
import TreasureChestSVG from './TreasureChestSVG';
import { OrnateCorners, SigilBackplate, NumericRitual, type Tier } from '../../../components/ornaments/RunicSigils';

interface RevealedCard {
	id: number;
	name: string;
	rarity: string;
	type: string;
	heroClass: string;
	imageUrl?: string;
}

interface PackOpeningAnimationProps {
	packName: string;
	cards: RevealedCard[];
	onClose: () => void;
	onOpenAnother: () => void;
	/** True for one-shot ceremonies (e.g. starter pack). Hides "Open Another". */
	oneShot?: boolean;
	/**
	 * In sequential ceremonies (e.g. opening many DUAT packs back-to-back) the
	 * "Collection" exit pulls the user out of the flow before they finish.
	 * Set to true to hide the secondary link and keep them on the queue.
	 */
	hideCollectionLink?: boolean;
	/**
	 * Single-class packs (e.g. DUAT airdrop, all neutral) don't need the class
	 * nav strip and per-section header — those make sense for the 45-card
	 * starter set spread across 5 classes. With compactLayout the reveal area
	 * is just: small title bar + centered grid + footer. Cards become the
	 * dominant element instead of competing with stacked chrome.
	 */
	compactLayout?: boolean;
}

type RevealColor = 'bifrost' | 'ember' | 'gold' | 'rune' | 'ink';

interface RevealSection {
	readonly key: string;
	readonly label: string;
	readonly glyph: string;
	readonly color: RevealColor;
}

// Section definitions for the batch-reveal layout. Order matches the canonical
// starter entitlement (Mage / Warrior / Priest / Rogue / Neutral). Glyphs are
// plain Unicode kanji to avoid icon dependencies.
const REVEAL_SECTIONS: readonly RevealSection[] = [
	{ key: 'mage',    label: 'Mage',    glyph: '星', color: 'bifrost' },
	{ key: 'warrior', label: 'Warrior', glyph: '剣', color: 'ember' },
	{ key: 'priest',  label: 'Priest',  glyph: '祈', color: 'gold' },
	{ key: 'rogue',   label: 'Rogue',   glyph: '影', color: 'rune' },
	{ key: 'neutral', label: 'Neutral', glyph: '森', color: 'ink' },
];

// SigilBackplate accepts only standard|premium|mythic|obsidian. Map class color to nearest tier.
const SECTION_TIER: Record<string, Tier> = {
	mage:    'standard',
	warrior: 'mythic',
	priest:  'premium',
	rogue:   'obsidian',
	neutral: 'obsidian',
};

// NumericRitual accepts only gold|bifrost|ember. Map class color to nearest accent.
const SECTION_NUMERIC_TIER: Record<string, 'gold' | 'bifrost' | 'ember'> = {
	mage:    'bifrost',
	warrior: 'ember',
	priest:  'gold',
	rogue:   'gold',
	neutral: 'gold',
};

// hex-frame variants exposed in CSS — `ink` color falls back to `obsidian` frame.
function hexFrameVariant(color: RevealColor): string {
	if (color === 'ink') return 'obsidian';
	return color;
}

// Per-rarity glow overlay. Common cards get nothing (visual calm).
function rarityToMysticTile(rarity: string): string {
	switch (rarity) {
		case 'mythic': return 'mystic-tile mystic-tile--ember';
		case 'epic':   return 'mystic-tile mystic-tile--gold';
		case 'rare':   return 'mystic-tile mystic-tile--bifrost';
		default:       return '';
	}
}

function groupCardsByClass(cards: readonly RevealedCard[]): Record<string, RevealedCard[]> {
	const groups: Record<string, RevealedCard[]> = {
		mage: [], warrior: [], priest: [], rogue: [], neutral: [],
	};
	for (const c of cards) {
		const key = c.heroClass.toLowerCase();
		if (key in groups) groups[key].push(c);
		else groups.neutral.push(c);
	}
	return groups;
}

export default function PackOpeningAnimation({
	packName,
	cards,
	onClose,
	onOpenAnother,
	oneShot = false,
	hideCollectionLink = false,
	compactLayout = false,
}: PackOpeningAnimationProps) {
	const [phase, setPhase] = useState<'intro' | 'opening' | 'reveal' | 'complete'>('intro');
	const [currentCardIndex, setCurrentCardIndex] = useState(-1);
	const [showAllCards, setShowAllCards] = useState(false);
	const reducedMotion = useReducedMotion();

	// Sequential reveal is delightful for 5-7-card packs but becomes a wall of
	// 30+ seconds for the 45-card starter set. Above this threshold we land
	// directly on the "complete" state and let the grid stagger-in instead.
	//
	// For testnet/dev flow the sequential per-card flip on a 5-card pack made
	// the reveal feel like "no cards appeared" — the per-card opacity 0→1
	// chain across 4s + AnimatePresence mode="wait" delay made cards barely
	// noticeable. Threshold lowered to 3 so any pack ≥4 cards stagger-in as
	// a complete grid (visible from t=0 of the reveal phase).
	const BATCH_REVEAL_THRESHOLD = 3;
	const useBatchReveal = cards.length === 0 || cards.length > BATCH_REVEAL_THRESHOLD;

	useEffect(() => {
		const introTimer = setTimeout(() => setPhase('opening'), 1000);
		const openingTimer = setTimeout(() => {
			if (useBatchReveal) {
				setPhase('complete');
				setShowAllCards(true);
			} else {
				setPhase('reveal');
				setCurrentCardIndex(0);
			}
		}, 2500);

		return () => {
			clearTimeout(introTimer);
			clearTimeout(openingTimer);
		};
	}, [useBatchReveal]);

	useEffect(() => {
		if (phase === 'reveal' && currentCardIndex >= 0 && currentCardIndex < cards.length && !showAllCards) {
			const timer = setTimeout(() => {
				if (currentCardIndex < cards.length - 1) {
					setCurrentCardIndex(currentCardIndex + 1);
				} else {
					setPhase('complete');
					setShowAllCards(true);
				}
			}, 800);
			return () => clearTimeout(timer);
		}
		return undefined;
	}, [phase, currentCardIndex, cards.length, showAllCards]);

	const handleSkipToResults = () => {
		setShowAllCards(true);
		setPhase('complete');
	};

	const grouped = useBatchReveal ? groupCardsByClass(cards) : null;

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden bg-obsidian-950"
			style={{
				backgroundImage:
					'radial-gradient(ellipse 80% 50% at 50% 0%, color-mix(in srgb, var(--gold-300) 6%, transparent) 0%, transparent 60%), radial-gradient(ellipse 120% 80% at 50% 100%, color-mix(in srgb, var(--obsidian-700) 40%, transparent) 0%, transparent 60%)',
			}}
		>
			{/* Subtle aura at top — desktop only, gentle ceremonial halo */}
			{(phase === 'reveal' || phase === 'complete') && (
				<span
					className="aura-mystic hidden md:block fixed top-0 left-1/2 -translate-x-1/2 z-0 pointer-events-none opacity-40"
					aria-hidden="true"
				/>
			)}

			<button
				type="button"
				onClick={onClose}
				aria-label="Close pack opening"
				className="absolute top-4 right-4 z-40 grid h-11 w-11 place-items-center rounded-full border border-obsidian-700 bg-obsidian-900/80 text-ink-300 hover:text-gold-300 hover:border-gold-600 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300"
			>
				<X size={20} aria-hidden="true" />
			</button>

			<AnimatePresence mode="wait">
				{phase === 'intro' && (
					<motion.div
						key="intro"
						initial={{ scale: 0.5, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						exit={{ scale: 1.2, opacity: 0 }}
						className="min-h-screen flex flex-col items-center justify-center text-center"
					>
						<motion.div
							animate={{ y: [0, -12, 0] }}
							transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
							className="mb-4 flex justify-center"
						>
							<TreasureChestSVG state="closed" size={240} />
						</motion.div>
						<h2 className="font-display text-3xl font-black tracking-[0.10em] uppercase text-ink-0">{packName}</h2>
					</motion.div>
				)}

				{phase === 'opening' && (
					<motion.div
						key="opening"
						className="min-h-screen flex items-center justify-center"
					>
						<div className="relative flex items-center justify-center">
							<motion.div
								initial={{ scale: 1 }}
								animate={{
									scale: [1, 1.05, 1.1, 1.15, 0],
								}}
								transition={{ duration: 1.5 }}
								className="relative"
							>
								<TreasureChestSVG state="open" size={280} />
							</motion.div>

							<motion.div
								initial={{ scale: 0, opacity: 0 }}
								animate={{ scale: [0, 3], opacity: [1, 0] }}
								transition={{ delay: 1.2, duration: 0.5 }}
								className="absolute inset-0 bg-gold-300/30 rounded-full"
							/>

							{[...Array(20)].map((_, i) => (
								<motion.div
									key={i}
									initial={{ x: 0, y: 0, opacity: 1 }}
									animate={{
										x: Math.cos(i * 18 * Math.PI / 180) * 200,
										y: Math.sin(i * 18 * Math.PI / 180) * 200,
										opacity: 0,
										scale: 0,
									}}
									transition={{ delay: 1.3, duration: 0.6 }}
									className="absolute left-1/2 top-1/2 w-4 h-4 bg-gold-300 rounded-full"
									style={{ boxShadow: '0 0 20px color-mix(in srgb, var(--gold-300) 80%, transparent)' }}
								/>
							))}
						</div>
					</motion.div>
				)}

				{(phase === 'reveal' || phase === 'complete') && (
					<motion.div
						key="reveal"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className="min-h-screen flex flex-col relative z-10"
					>
						{/* ── Header — full in ceremonial mode, single-line in compact ─ */}
						{compactLayout ? (
							<header className="relative bg-obsidian-950/60 border-b border-gold-300/15 px-6 py-3 flex items-center justify-center gap-3">
								<span className="font-mono text-[10px] sm:text-[11px] tracking-[0.32em] uppercase text-gold-300/80">
									{packName}
								</span>
								<span aria-hidden className="text-gold-300/30">·</span>
								<span className="font-mono text-[10px] sm:text-[11px] tracking-[0.22em] uppercase text-ink-200">
									{cards.length} card{cards.length === 1 ? '' : 's'}
								</span>
							</header>
						) : (
							<header className="relative bg-obsidian-950/40 ornate-corners-host">
								<OrnateCorners />
								<div className="max-w-6xl mx-auto px-6 py-8 sm:py-12 flex items-center justify-between gap-6 relative z-10">
									<div className="sigil-host shrink-0 hidden sm:block">
										<SigilBackplate tier="premium" />
										<div className="hex-frame hex-frame--gold hex-frame--sm" aria-hidden="true">
											<div className="hex-frame-inner">
												<span className="text-2xl text-gold-300/95 select-none">天</span>
											</div>
										</div>
									</div>

									<div className="text-center min-w-0 flex-1 overflow-hidden">
										<div className="font-mono text-[9px] sm:text-[10px] tracking-[0.22em] sm:tracking-[0.32em] uppercase text-gold-300/80 truncate">
											{phase === 'complete' ? 'Birthright · Revealed' : 'Birthright · Revealing'}
										</div>
										<h2
											id="reveal-title"
											className="font-display text-xl sm:text-3xl font-black tracking-[0.12em] sm:tracking-[0.18em] uppercase text-transparent bg-clip-text bg-linear-to-b from-gold-100 via-gold-300 to-gold-500 mt-1"
										>
											Your Cards
										</h2>
									</div>

									<div className="text-center shrink-0">
										<NumericRitual tier="gold">
											<span className="numeric-display numeric-display--lg">{cards.length}</span>
										</NumericRitual>
										<div className="tier-inscription tier-inscription--premium mt-1">cards</div>
									</div>
								</div>
							</header>
						)}

						{/* ── Class nav strip sticky at top (batch reveal only) ─ */}
						{!compactLayout && useBatchReveal && phase === 'complete' && grouped && (
							<nav
								aria-label="Jump to class section"
								className="sticky top-0 z-30 bg-obsidian-950/95 backdrop-blur-xl border-b border-gold-300/15"
							>
								<div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3 overflow-x-auto snap-x snap-mandatory sm:justify-center">
									{REVEAL_SECTIONS.map(section => {
										const count = grouped[section.key]?.length ?? 0;
										if (count === 0) return null;
										return (
											<button
												key={section.key}
												type="button"
												onClick={() => document.getElementById(`reveal-${section.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
												aria-label={`Jump to ${section.label} cards`}
												className={`reveal-chip reveal-chip--${section.color} snap-start inline-flex items-center gap-2 px-5 py-3 rounded-full border bg-obsidian-900/70 transition-all whitespace-nowrap`}
											>
												<span aria-hidden="true" className="text-base leading-none">{section.glyph}</span>
												<span className="font-mono text-[10px] tracking-[0.22em] uppercase">{section.label}</span>
												<span className="font-mono text-[10px] tracking-[0.22em] uppercase opacity-60" aria-hidden="true">·</span>
												<span className="font-mono text-[10px] tracking-[0.22em] uppercase">{count}</span>
											</button>
										);
									})}
								</div>
							</nav>
						)}

						{/* ── Body ───────────────────────────────────────────── */}
						<div className="flex-1">
							{phase === 'reveal' && !showAllCards && (
								<div className="flex justify-center pt-6">
									<button
										type="button"
										onClick={handleSkipToResults}
										className="px-5 py-2 bg-obsidian-700/80 hover:bg-obsidian-600 text-ink-0 rounded-md border border-obsidian-500 font-display text-xs tracking-[0.18em] uppercase transition-all"
									>
										Skip to Results →
									</button>
								</div>
							)}

							{useBatchReveal && grouped ? (
								// Sectioned layout — one section per class with ornate divider.
								// In compactLayout the section header (sigil + dividers) is skipped
								// and the grid is centered in viewport, so the cards dominate the
								// reveal area rather than competing with stacked chrome.
								REVEAL_SECTIONS.map((section, sectionIndex) => {
									const sectionCards = grouped[section.key];
									if (!sectionCards || sectionCards.length === 0) return null;

									const sectionDelay = reducedMotion ? 0 : (compactLayout ? 0 : sectionIndex * 0.4);
									const numericTier = SECTION_NUMERIC_TIER[section.key];
									const hexVariant = hexFrameVariant(section.color);

									if (compactLayout) {
										return (
											<section
												key={section.key}
												className="min-h-[70vh] flex items-center justify-center px-6 py-8"
											>
												<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 justify-items-center max-w-6xl">
													{sectionCards.map((card, cardIdx) => (
														<CardTile
															key={`${card.id}-${cardIdx}`}
															card={card}
															revealed
															delay={reducedMotion ? 0 : 0.15 + cardIdx * 0.08}
															reducedMotion={reducedMotion}
														/>
													))}
												</div>
											</section>
										);
									}

									return (
										<section
											key={section.key}
											id={`reveal-${section.key}`}
											className="scroll-mt-[80px] max-w-6xl mx-auto px-6 my-12"
										>
											<motion.div
												initial={{ opacity: 0, y: 20 }}
												animate={{ opacity: 1, y: 0 }}
												transition={{ duration: 0.5, delay: sectionDelay }}
												className="flex items-center gap-4 mb-8 max-w-3xl mx-auto"
											>
												<div className="ornament-divider flex-1" role="separator" aria-hidden="true">
													<span className="ornament-divider-mark-trio">
														<span className="ornament-divider-mark ornament-divider-mark--small" />
														<span className="ornament-divider-mark" />
														<span className="ornament-divider-mark ornament-divider-mark--small" />
													</span>
												</div>

												<div className="flex items-center gap-3 shrink-0">
													<div className="sigil-host">
														<SigilBackplate tier={SECTION_TIER[section.key]} />
														<div className={`hex-frame hex-frame--${hexVariant} hex-frame--md`} aria-hidden="true">
															<div className="hex-frame-inner">
																<span className="text-2xl text-ink-0/95 select-none">{section.glyph}</span>
															</div>
														</div>
													</div>
													<div className="text-center">
														<div className={`font-display text-base font-bold tracking-[0.32em] uppercase text-${section.color}-300`}>
															{section.label}
														</div>
														<div className="mt-1">
															<NumericRitual tier={numericTier}>
																<span className="numeric-display">{sectionCards.length}</span>
															</NumericRitual>
														</div>
													</div>
												</div>

												<div className="ornament-divider flex-1" role="separator" aria-hidden="true">
													<span className="ornament-divider-mark-trio">
														<span className="ornament-divider-mark ornament-divider-mark--small" />
														<span className="ornament-divider-mark" />
														<span className="ornament-divider-mark ornament-divider-mark--small" />
													</span>
												</div>
											</motion.div>

											<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 justify-items-center">
												{sectionCards.map((card, cardIdx) => (
													<CardTile
														key={`${card.id}-${cardIdx}`}
														card={card}
														revealed
														delay={reducedMotion ? 0 : sectionDelay + 0.3 + cardIdx * 0.05}
														reducedMotion={reducedMotion}
													/>
												))}
											</div>
										</section>
									);
								})
							) : (
								// Sequential reveal — small packs (≤10 cards), centered grid
								<div className="min-h-[60vh] flex items-center justify-center px-6 py-10">
									<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 justify-items-center max-w-6xl">
										{cards.map((card, index) => (
											<CardTile
												key={`${card.id}-${index}`}
												card={card}
												revealed={showAllCards || index <= currentCardIndex}
												delay={reducedMotion ? 0 : (showAllCards ? index * 0.05 : 0)}
												reducedMotion={reducedMotion}
											/>
										))}
									</div>
								</div>
							)}
						</div>

						{/* ── Footer sticky (only at complete) ───────────────── */}
						{phase === 'complete' && (
							<motion.div
								initial={{ y: 50, opacity: 0 }}
								animate={{ y: 0, opacity: 1 }}
								transition={{ delay: reducedMotion ? 0 : 0.5 }}
								className="sticky bottom-0 z-30 bg-obsidian-950/95 backdrop-blur-xl border-t border-gold-300/15 px-6 py-4"
							>
								<div className="max-w-6xl mx-auto flex items-center justify-center gap-3 flex-wrap">
									<button
										type="button"
										onClick={onClose}
										className="btn-runic btn-runic--gold btn-runic--lg"
									>
										<span className="btn-runic-stud" aria-hidden />
										Continue
										<span className="btn-runic-stud" aria-hidden />
									</button>

									{!hideCollectionLink && (
										<Link to={routes.collection} className="btn-runic btn-runic--bifrost">
											<span className="btn-runic-stud" aria-hidden />
											Collection
											<span className="btn-runic-stud" aria-hidden />
										</Link>
									)}

									{!oneShot && (
										<button
											type="button"
											onClick={onOpenAnother}
											className="btn-runic btn-runic--obsidian"
										>
											<span className="btn-runic-stud" aria-hidden />
											Open Another
											<span className="btn-runic-stud" aria-hidden />
										</button>
									)}
								</div>
							</motion.div>
						)}
					</motion.div>
				)}
			</AnimatePresence>
		</motion.div>
	);
}

interface CardTileProps {
	card: RevealedCard;
	revealed: boolean;
	delay: number;
	reducedMotion: boolean | null;
}

function CardTile({ card, revealed, delay, reducedMotion }: CardTileProps) {
	const mysticTile = rarityToMysticTile(card.rarity);

	return (
		<motion.article
			initial={reducedMotion ? { opacity: 0 } : { rotateY: 180, scale: 0.5, opacity: 0 }}
			animate={
				revealed
					? (reducedMotion ? { opacity: 1 } : { rotateY: 0, scale: 1, opacity: 1 })
					: (reducedMotion ? { opacity: 0 } : { rotateY: 180, scale: 0.5, opacity: 0 })
			}
			transition={
				reducedMotion
					? { duration: 0.3, delay }
					: { duration: 0.6, delay, type: 'spring', stiffness: 120, damping: 15 }
			}
			whileHover={reducedMotion ? undefined : { y: -8, scale: 1.04, zIndex: 10 }}
			aria-label={`${card.rarity} ${card.heroClass} ${card.type}: ${card.name}`}
			className={`group relative w-full max-w-[180px] aspect-[5/7] rounded-xl border-2 ornate-corners-host ${getRarityBorder(card.rarity)} ${getRarityGlow(card.rarity)} ${getRarityBackground(card.rarity)} ${mysticTile} overflow-hidden cursor-default`}
			style={{ perspective: 1000, transformStyle: 'preserve-3d' }}
		>
			<OrnateCorners />
			{card.rarity === 'mythic' && <span className="aura-mystic" aria-hidden="true" />}

			{/* Art layer — fills the card; name + meta float on top via gradient scrim */}
			<div className="absolute inset-0 z-0">
				{(() => {
					const artPath = getCardArtPath(card.id);
					return artPath ? (
						<img
							src={artPath}
							alt={card.name}
							className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
							loading="lazy"
						/>
					) : (
						<div className="w-full h-full flex items-center justify-center bg-obsidian-900">
							<span className="text-5xl text-ink-300" aria-hidden="true">{getTypeIcon(card.type)}</span>
						</div>
					);
				})()}
			</div>

			{/* Bottom scrim gradient — readable name without crowding the art */}
			<div className="absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-obsidian-950 via-obsidian-950/85 to-transparent pointer-events-none z-10" />

			{/* Top meta — type icon (left) + rarity tag (right). No background plate. */}
			<div className="absolute inset-x-0 top-0 px-2.5 pt-2.5 flex justify-between items-start z-20 pointer-events-none">
				<span
					className="text-lg leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]"
					aria-hidden="true"
				>
					{getTypeIcon(card.type)}
				</span>
				<span className={`text-[9px] font-bold tracking-[0.18em] uppercase ${getRarityColor(card.rarity)} drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]`}>
					{card.rarity}
				</span>
			</div>

			{/* Bottom name + class */}
			<div className="absolute inset-x-0 bottom-0 px-2.5 pb-2.5 z-20 text-center">
				<h3 className="font-display text-[13px] font-bold text-ink-0 truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
					{card.name}
				</h3>
				<p className="font-mono text-[9px] tracking-[0.14em] uppercase text-ink-200 mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
					{card.heroClass}
				</p>
			</div>

			{card.rarity === 'mythic' && (
				<motion.div
					animate={{ opacity: [0.2, 0.5, 0.2] }}
					transition={{ duration: 2.5, repeat: Infinity }}
					className="absolute inset-0 bg-linear-to-t from-transparent via-white/10 to-transparent pointer-events-none z-10"
				/>
			)}
		</motion.article>
	);
}
