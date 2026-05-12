import {
	Box,
	ChevronRight,
	X,
	PawPrint,
	ScrollText,
	Swords,
	Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { MapCardReference, MapCardSection, MapCardSectionId, MapRealmLegend } from './types';

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

	return (
		<section
			aria-modal="true"
			role="dialog"
			className="absolute left-1/2 top-1/2 z-40 grid w-[min(58rem,calc(100%-2rem))] max-h-[min(34rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border border-gold-300/28 bg-[#06161d]/92 text-ink-0 shadow-[0_28px_90px_-38px_rgba(0,0,0,0.95)] backdrop-blur-md"
			style={{ boxShadow: `0 0 0 1px ${realm.color}22, 0 30px 90px -40px rgba(0,0,0,0.95)` }}
			onPointerDown={event => event.stopPropagation()}
			onWheel={event => event.stopPropagation()}
		>
			<header className="grid gap-3 border-b border-obsidian-700/80 bg-obsidian-950/64 p-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
				<div className="min-w-0">
					<p className="font-mono text-[9px] font-semibold uppercase tracking-[0.24em]" style={{ color: contextColor }}>
						{contextLabel}
					</p>
					<div className="mt-1 flex min-w-0 items-center gap-2">
						<span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border font-display text-sm font-black" style={{ borderColor: `${realm.color}77`, color: realm.color }}>
							{realm.runeSymbol}
						</span>
						<h2 className="truncate font-display text-base font-black uppercase leading-tight tracking-[0.12em] text-ink-0 md:text-lg">
							{realm.name} regional cards
						</h2>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
					{sections.map(section => (
						<SectionTab
							key={section.id}
							active={section.id === activeSection.id}
							section={section}
							color={realm.color}
							onSelect={() => onSelectSection(section.id)}
						/>
					))}
				</div>

				<button
					type="button"
					aria-label="Close regional cards"
					onClick={onClose}
					className="grid h-10 w-10 place-items-center rounded-md border border-obsidian-700 bg-obsidian-900/80 text-ink-300 transition-colors hover:border-gold-300/45 hover:text-gold-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300"
				>
					<X className="h-4 w-4" aria-hidden="true" />
				</button>
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
								className={`grid h-10 place-items-center rounded-md border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300 ${
									active
										? 'border-gold-300/70 bg-gold-300/14 text-gold-100'
										: 'border-obsidian-700 bg-obsidian-900/70 text-ink-300 hover:border-obsidian-500 hover:text-ink-0'
								}`}
							>
								<Icon className="h-4 w-4" aria-hidden="true" />
							</button>
						);
					})}
				</nav>

				<div className="min-h-0 overflow-y-auto p-3 [scrollbar-width:thin]">
					<div className="mb-3 flex items-center justify-between gap-3">
						<div className="min-w-0">
							<p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-400">{indexedCards} indexed matches</p>
							<h3 className="mt-1 truncate font-display text-sm font-black uppercase tracking-[0.1em] text-ink-0">
								{activeSection.title}
							</h3>
						</div>
						<span className="shrink-0 rounded border border-obsidian-600 bg-obsidian-950/80 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-300">
							{activeSection.count} total
						</span>
					</div>

					<ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-3">
						{activeSection.cards.map(card => (
							<TerrainCard key={card.id} card={card} color={realm.color} />
						))}
					</ul>
				</div>

				<aside className="hidden min-h-0 border-l border-obsidian-700/80 bg-obsidian-950/50 p-3 md:block">
					{featuredCard ? (
						<FeaturedCard card={featuredCard} color={realm.color} />
					) : (
						<div className="grid h-full place-items-center rounded-md border border-dashed border-obsidian-700 text-center text-[11px] leading-4 text-ink-400">
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
			className={`grid min-h-10 grid-cols-[1.5rem_1fr] items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300 ${
				active
					? 'border-gold-300/65 bg-gold-300/12 text-ink-0'
					: 'border-obsidian-700 bg-obsidian-900/60 text-ink-300 hover:border-obsidian-500 hover:text-ink-0'
			}`}
			style={active ? { boxShadow: `inset 0 1px 0 ${color}44` } : undefined}
		>
			<Icon className="h-3.5 w-3.5" aria-hidden="true" />
			<span className="min-w-0">
				<span className="block truncate font-display text-[10px] font-black uppercase tracking-[0.08em]">{section.title}</span>
				<span className="mt-0.5 block font-mono text-[8px] uppercase tracking-[0.12em] text-ink-400">{section.count}</span>
			</span>
		</button>
	);
}

function TerrainCard({ card, color }: { card: MapCardReference; color: string }) {
	return (
		<li className="min-h-[8.25rem] rounded-md border border-obsidian-700/85 bg-[#0a2028]/86 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors hover:border-gold-300/45">
			<div className="grid grid-cols-[2.25rem_1fr_auto] items-start gap-2">
				<span className="grid h-8 w-8 place-items-center rounded-md border border-obsidian-600 bg-obsidian-950/85 font-display text-xs font-black text-ink-100">
					{card.costLabel}
				</span>
				<span className="min-w-0">
					<span className="block truncate font-display text-[12px] font-black uppercase leading-tight tracking-[0.08em] text-ink-0">
						{card.name}
					</span>
					<span className="mt-1 block truncate font-mono text-[8px] uppercase tracking-[0.16em]" style={{ color }}>
						{card.typeLabel} / {card.rarityLabel}
					</span>
				</span>
				{card.statLine && (
					<span className="rounded border border-obsidian-600 bg-obsidian-950/70 px-1.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-300">
						{card.statLine}
					</span>
				)}
			</div>
			<p className="mt-2 line-clamp-3 text-[11px] leading-4 text-ink-200">{card.description}</p>
			<p className="mt-2 truncate font-mono text-[8px] uppercase tracking-[0.16em] text-ink-500">{card.sourceLabel}</p>
		</li>
	);
}

function FeaturedCard({ card, color }: { card: MapCardReference; color: string }) {
	return (
		<article className="grid h-full grid-rows-[auto_1fr_auto] gap-3 rounded-md border border-obsidian-700 bg-[#071b22]/82 p-3">
			<header className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em]" style={{ color }}>Featured</p>
					<h3 className="mt-1 font-display text-base font-black uppercase leading-tight tracking-[0.1em] text-ink-0">{card.name}</h3>
				</div>
				<span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-gold-300/40 bg-gold-300/10 font-display text-sm font-black text-gold-100">
					{card.costLabel}
				</span>
			</header>

			<div className="min-h-0">
				<div className="grid min-h-28 place-items-center rounded-md border border-obsidian-700 bg-obsidian-950/55">
					<Box className="h-8 w-8" style={{ color }} aria-hidden="true" />
				</div>
				<p className="mt-3 text-xs leading-5 text-ink-200">{card.description}</p>
			</div>

			<footer className="grid gap-2">
				<div className="grid grid-cols-2 gap-2">
					<MetaPill label="Type" value={card.typeLabel} />
					<MetaPill label="Rarity" value={card.rarityLabel} />
					{card.statLine && <MetaPill label="Stats" value={card.statLine} />}
					<MetaPill label="Source" value={card.sourceLabel} />
				</div>
				<div className="flex items-center gap-2 rounded-md border border-obsidian-700 bg-obsidian-950/54 px-2.5 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-400">
					<ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
					<span className="truncate">Regional association</span>
				</div>
			</footer>
		</article>
	);
}

function MetaPill({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-md border border-obsidian-700 bg-obsidian-950/54 px-2 py-1.5">
			<p className="font-mono text-[8px] uppercase tracking-[0.16em] text-ink-500">{label}</p>
			<p className="mt-1 truncate font-display text-[11px] font-black uppercase tracking-[0.08em] text-ink-100">{value}</p>
		</div>
	);
}
