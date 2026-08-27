import {
	ChevronRight,
	X,
	PawPrint,
	ScrollText,
	Swords,
	Users,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { MapCardReference, MapCardSection, MapCardSectionId, MapRealmLegend } from './types';
import { REALM_ART_URLS, REALM_SYMBOLS } from './realmVisuals';

interface MapCardDossierProps {
	activeSectionId: MapCardSectionId;
	contextColor: string;
	contextLabel: string;
	realm: MapRealmLegend;
	sections: readonly MapCardSection[];
	onClose: () => void;
	onSelectSection: (id: MapCardSectionId) => void;
}

const SECTION_ICONS: Record<MapCardSectionId, LucideIcon> = {
	characters: Users,
	spells: ScrollText,
	arms: Swords,
	pets: PawPrint,
};

const readableAccent = (color: string) => `color-mix(in srgb, ${color} 62%, var(--ink-0) 38%)`;

export default function MapCardDossier({
	activeSectionId,
	contextColor,
	contextLabel,
	realm,
	sections,
	onClose,
	onSelectSection,
}: MapCardDossierProps) {
	const indexedCards = sections.reduce((total, section) => total + section.count, 0);
	const activeSection = sections.find(section => section.id === activeSectionId) ?? sections[0];
	const featuredCard = activeSection.cards[0];
	const closeButtonRef = useRef<HTMLButtonElement>(null);
	const cardsScrollRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		closeButtonRef.current?.focus();
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') onClose();
		};
		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [onClose]);

	useEffect(() => {
		cardsScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
	}, [activeSection.id]);

	const RealmIcon = REALM_SYMBOLS[realm.id];

	return (
		<section
			aria-modal="true"
			role="dialog"
			aria-labelledby="atlas-dossier-title"
			aria-describedby="atlas-dossier-description"
			className="absolute left-1/2 top-1/2 z-40 grid max-h-[min(42rem,calc(100%-1rem))] w-[min(64rem,calc(100%-1rem))] grid-rows-[auto_minmax(0,1fr)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border border-gold-300/28 bg-[#06161d]/95 text-ink-0 shadow-[0_28px_90px_-38px_rgba(0,0,0,0.95)] backdrop-blur-md"
			style={{ boxShadow: `0 0 0 1px ${realm.color}22, 0 30px 90px -40px rgba(0,0,0,0.95)` }}
			onPointerDown={event => event.stopPropagation()}
			onWheel={event => event.stopPropagation()}
		>
			<header className="grid gap-2 border-b border-obsidian-700/80 bg-obsidian-950/64 p-2.5">
				<p id="atlas-dossier-description" className="sr-only">Browse the indexed cards and the featured card for {realm.name}.</p>
				<div className="flex min-w-0 items-start justify-between gap-3">
					<div className="min-w-0">
						<p className="font-mono text-[9px] font-semibold uppercase tracking-[0.24em]" style={{ color: readableAccent(contextColor) }}>
							{contextLabel}
						</p>
						<div className="mt-1 flex min-w-0 items-center gap-2">
							{REALM_ART_URLS[realm.id] ? (
								<img
									src={REALM_ART_URLS[realm.id]}
									alt=""
									width={72}
									height={48}
									fetchPriority="high"
									className="h-10 w-14 shrink-0 rounded-md border border-obsidian-600 object-cover opacity-80"
								/>
							) : null}
							<span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border" style={{ borderColor: `${realm.color}77`, color: realm.color }}>
								<RealmIcon className="h-4 w-4" aria-hidden="true" />
								<span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-sm border border-current/50 bg-obsidian-950 font-mono text-[8px] font-bold" aria-hidden="true">{realm.runeSymbol}</span>
							</span>
							<h2 id="atlas-dossier-title" className="min-w-0 font-display text-base font-black uppercase leading-tight tracking-[0.12em] text-ink-0 md:text-lg">
								{realm.name} regional cards
							</h2>
						</div>
					</div>

					<button
						type="button"
						aria-label="Close regional cards"
						onClick={onClose}
						ref={closeButtonRef}
						className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-obsidian-700 bg-obsidian-900/80 text-ink-300 transition-colors motion-reduce:transition-none hover:border-gold-300/45 hover:text-gold-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300"
					>
						<X className="h-4 w-4" aria-hidden="true" />
					</button>
				</div>

				<nav className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Regional card sections">
					{sections.map(section => (
						<SectionTab
							key={section.id}
							active={section.id === activeSection.id}
							section={section}
							color={realm.color}
							onSelect={() => onSelectSection(section.id)}
						/>
					))}
				</nav>
			</header>

			<div className="grid min-h-0 grid-cols-[3.75rem_minmax(0,1fr)] md:grid-cols-[4.5rem_minmax(0,1fr)_minmax(15rem,0.46fr)]">
				<nav className="grid content-start gap-2 border-r border-obsidian-700/80 bg-obsidian-950/52 p-2" aria-label="Regional card categories">
					{sections.map(section => {
						const Icon = SECTION_ICONS[section.id];
						const active = section.id === activeSection.id;

						return (
							<button
								key={section.id}
								type="button"
								aria-label={section.title}
								aria-pressed={active}
								title={section.title}
								onClick={() => onSelectSection(section.id)}
								className="grid h-11 place-items-center rounded-md border border-obsidian-700 bg-obsidian-900/70 text-ink-300 transition-colors motion-reduce:transition-none hover:border-obsidian-500 hover:text-ink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300"
								style={active ? { borderColor: 'rgba(246,196,83,0.7)', backgroundColor: 'rgba(246,196,83,0.14)', color: '#fff1b8' } : undefined}
							>
								<Icon className="h-4 w-4" aria-hidden="true" />
							</button>
						);
					})}
				</nav>

				<div ref={cardsScrollRef} className="min-h-0 overflow-y-auto p-3 [scrollbar-width:thin]">
					<div className="mb-3 flex items-center justify-between gap-3">
						<div className="min-w-0">
							<p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-200">{indexedCards} indexed matches</p>
							<h3 className="mt-1 truncate font-display text-sm font-black uppercase tracking-[0.1em] text-ink-0">
								{activeSection.title}
							</h3>
						</div>
						<span className="shrink-0 rounded border border-obsidian-600 bg-obsidian-950/80 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-100">
							{activeSection.count} total
						</span>
					</div>

					<ul className="grid grid-cols-1 gap-2 xl:grid-cols-2">
						{activeSection.cards.map(card => (
							<TerrainCard key={card.id} card={card} color={realm.color} sectionId={activeSection.id} />
						))}
					</ul>
				</div>

				<aside className="hidden min-h-0 border-l border-obsidian-700/80 bg-obsidian-950/50 p-3 md:block">
					{featuredCard ? (
						<FeaturedCard card={featuredCard} color={realm.color} sectionId={activeSection.id} />
					) : (
						<div className="grid h-full place-items-center rounded-md border border-dashed border-obsidian-700 text-center text-[11px] leading-4 text-ink-200">
							No registered cards are indexed for this category.
						</div>
					)}
				</aside>
			</div>
		</section>
	);
}

function SectionTab({
	active,
	section,
	color,
	onSelect,
}: {
	active: boolean;
	section: MapCardSection;
	color: string;
	onSelect: () => void;
}) {
	const Icon = SECTION_ICONS[section.id];

	return (
		<button
			type="button"
			aria-pressed={active}
			onClick={onSelect}
			className="grid min-h-10 grid-cols-[1.5rem_1fr] items-center gap-2 rounded-md border border-obsidian-700 bg-obsidian-900/60 px-2 py-1 text-left text-ink-200 transition-colors motion-reduce:transition-none hover:border-obsidian-500 hover:text-ink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300"
			style={active ? { borderColor: 'rgba(246,196,83,0.65)', backgroundColor: 'rgba(246,196,83,0.12)', color: '#f8f3e7', boxShadow: `inset 0 1px 0 ${color}44` } : undefined}
		>
			<Icon className="h-3.5 w-3.5" aria-hidden="true" />
			<span className="min-w-0">
				<span className="block truncate font-display text-[10px] font-black uppercase tracking-[0.08em]">{section.title}</span>
				<span className="mt-0.5 block font-mono text-[8px] uppercase tracking-[0.12em] text-ink-200">{section.count}</span>
			</span>
		</button>
	);
}

function TerrainCard({ card, color, sectionId }: { card: MapCardReference; color: string; sectionId: MapCardSectionId }) {
	const FallbackIcon = SECTION_ICONS[sectionId];

	return (
		<li className={`grid min-h-[8.25rem] items-start gap-2 rounded-md border border-obsidian-700/85 bg-[#0a2028]/86 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors motion-reduce:transition-none hover:border-gold-300/45 ${card.costLabel === 'Hero' ? 'grid-cols-[3rem_minmax(0,1fr)]' : 'grid-cols-[auto_3rem_minmax(0,1fr)]'}`}>
			{card.costLabel !== 'Hero' && <CostBadge value={card.costLabel} />}
			<CardArtwork card={card} color={color} fallbackIcon={FallbackIcon} className="h-16 w-12" />
			<div className="min-w-0">
				<div className="flex min-w-0 items-start gap-1">
					<span className="min-h-8 min-w-0 flex-1 break-words line-clamp-2 font-display text-[12px] font-black uppercase leading-tight tracking-[0.08em] text-ink-0">
						{card.name}
					</span>
					{card.statLine && (
						<span className="max-w-[3.25rem] shrink-0 truncate rounded border border-obsidian-600 bg-obsidian-950/70 px-1.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-100">
							{card.statLine}
						</span>
					)}
				</div>
				<span className="mt-1 block truncate font-mono text-[8px] uppercase tracking-[0.16em]" style={{ color: readableAccent(color) }}>
					{card.typeLabel} / {card.rarityLabel}
				</span>
				<p className="mt-2 min-w-0 break-words line-clamp-3 text-[11px] leading-4 text-ink-200">{card.description}</p>
				<p className="mt-2 truncate font-mono text-[8px] uppercase tracking-[0.16em] text-ink-200">{card.sourceLabel}</p>
			</div>
		</li>
	);
}

function FeaturedCard({ card, color, sectionId }: { card: MapCardReference; color: string; sectionId: MapCardSectionId }) {
	const FallbackIcon = SECTION_ICONS[sectionId];

	return (
		<article className="grid h-full grid-rows-[auto_minmax(0,1fr)_auto] gap-3 rounded-md border border-obsidian-700 bg-[#071b22]/82 p-3">
			<header className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em]" style={{ color: readableAccent(color) }}>Featured</p>
					<h3 className="mt-1 min-w-0 break-words line-clamp-2 font-display text-base font-black uppercase leading-tight tracking-[0.1em] text-ink-0">{card.name}</h3>
				</div>
				{card.costLabel !== 'Hero' && <CostBadge value={card.costLabel} featured />}
			</header>

			<div className="min-h-0 min-w-0 overflow-hidden">
				<div className="grid aspect-[4/3] min-h-0 min-w-0 place-items-center overflow-hidden rounded-md border border-obsidian-700 bg-obsidian-950/55">
					<CardArtwork card={card} color={color} fallbackIcon={FallbackIcon} className="h-full w-full rounded-none border-0 bg-transparent" loading="eager" iconClassName="h-8 w-8" />
				</div>
				<p className="mt-3 min-w-0 break-words line-clamp-2 text-xs leading-5 text-ink-200">{card.description}</p>
			</div>

			<footer className="grid gap-2">
				<div className="grid grid-cols-2 gap-2">
					<MetaPill label="Type" value={card.typeLabel} />
					<MetaPill label="Rarity" value={card.rarityLabel} />
					{card.statLine && <MetaPill label="Stats" value={card.statLine} />}
					<MetaPill label="Source" value={card.sourceLabel} />
				</div>
				<div className="flex items-center gap-2 rounded-md border border-obsidian-700 bg-obsidian-950/54 px-2.5 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-200">
					<ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
					<span className="truncate">Regional association</span>
				</div>
			</footer>
		</article>
	);
}

function CostBadge({ value, featured = false }: { value: string; featured?: boolean }) {
	return (
		<span className={featured
			? 'grid min-h-9 min-w-9 max-w-full shrink-0 place-items-center whitespace-nowrap rounded-md border border-gold-300/40 bg-gold-300/10 px-2 font-display text-xs font-black text-gold-100'
			: 'grid min-h-8 min-w-8 max-w-full shrink-0 place-items-center whitespace-nowrap rounded-md border border-obsidian-600 bg-obsidian-950/85 px-1 font-display text-xs font-black text-ink-100'}>
			{value}
		</span>
	);
}

function CardArtwork({
	card,
	color,
	fallbackIcon: FallbackIcon,
	className,
	iconClassName = 'h-5 w-5',
	loading = 'lazy',
}: {
	card: MapCardReference;
	color: string;
	fallbackIcon: LucideIcon;
	className: string;
	iconClassName?: string;
	loading?: 'eager' | 'lazy';
}) {
	const [imageFailed, setImageFailed] = useState(false);

	return (
		<div className={`grid min-h-0 min-w-0 place-items-center overflow-hidden rounded-md border border-obsidian-700 bg-obsidian-950/70 ${className}`}>
			{card.artUrl && !imageFailed ? (
				<img
					data-card-art="true"
					src={card.artUrl}
					alt=""
					width={96}
					height={96}
					loading={loading}
					decoding="async"
					className="!h-full !w-full min-h-0 min-w-0 object-contain"
					onError={() => setImageFailed(true)}
				/>
			) : (
				<FallbackIcon className={iconClassName} style={{ color }} aria-hidden="true" />
			)}
		</div>
	);
}

function MetaPill({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-md border border-obsidian-700 bg-obsidian-950/54 px-2 py-1.5">
			<p className="truncate font-mono text-[8px] uppercase tracking-[0.16em] text-ink-200">{label}</p>
			<p className="mt-1 min-w-0 truncate font-display text-[11px] font-black uppercase tracking-[0.08em] text-ink-100">{value}</p>
		</div>
	);
}
