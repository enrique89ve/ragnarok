import {
	ArrowDownLeft,
	ArrowUpRight,
	CalendarCheck,
	Coins,
	PackageOpen,
	Sparkles,
	Trophy,
	type LucideIcon,
} from 'lucide-react';
import type { RuneDirection, RuneLedgerEntryView, RuneSourceType } from '../../../data/runeAPI';
import { compactId, formatBlock, formatNumber, formatTimestamp, SOURCE_LABELS } from './walletFormatting';

const SOURCE_ICONS: Record<RuneSourceType, LucideIcon> = {
	p2p_ranked: Trophy,
	campaign_first_clear: Sparkles,
	reward_claim: Coins,
	daily_quest_claim: CalendarCheck,
	rune_exchange: PackageOpen,
};

const DIRECTION_THEME: Record<RuneDirection, {
	label: string;
	sign: string;
	icon: LucideIcon;
	className: string;
}> = {
	credit: {
		label: 'Earned',
		sign: '+',
		icon: ArrowDownLeft,
		className: 'border-emerald-300/35 bg-emerald-400/10 text-emerald-200',
	},
	debit: {
		label: 'Claimed',
		sign: '-',
		icon: ArrowUpRight,
		className: 'border-gold-300/35 bg-gold-400/10 text-gold-200',
	},
};

export function ActivityFeed({ entries }: { entries: RuneLedgerEntryView[] }) {
	return (
		<section className="runic-panel texture-grain relative border border-obsidian-700 bg-obsidian-900/80 p-5">
			<span className="runic-corners runic-corners--bifrost" aria-hidden="true" />
			<span className="runic-corners-extra" aria-hidden="true" />
			<header className="relative z-10 mb-5 flex items-center justify-between gap-4">
				<div>
					<p className="font-mono text-[10px] uppercase tracking-[0.28em] text-bifrost-200">Battle ledger</p>
					<h2 className="mt-1 font-display text-xl font-black uppercase tracking-[0.12em] text-ink-0">
						RUNE movement
					</h2>
				</div>
				<span className="rounded border border-obsidian-700 bg-obsidian-950/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-300">
					{entries.length} entries
				</span>
			</header>

			<div className="relative z-10 grid gap-2">
				{entries.length === 0 && (
					<div className="border-l border-bifrost-300/35 bg-obsidian-950/65 p-5 text-sm leading-6 text-ink-300">
						No RUNE activity for this wallet yet.
					</div>
				)}
				{entries.map(entry => (
					<ActivityItem key={entry.entryId} entry={entry} />
				))}
			</div>
		</section>
	);
}

function ActivityItem({ entry }: { entry: RuneLedgerEntryView }) {
	const direction = DIRECTION_THEME[entry.direction];
	const DirectionIcon = direction.icon;
	const SourceIcon = SOURCE_ICONS[entry.sourceType];

	return (
		<article className="border-l border-obsidian-600 bg-obsidian-950/55 px-4 py-3 transition-colors hover:border-gold-300/45">
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div className="flex min-w-0 items-start gap-3">
					<span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center border ${direction.className}`}>
						<DirectionIcon className="h-4 w-4" aria-hidden="true" />
					</span>
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2">
							<h3 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-ink-0">
								{direction.label}
							</h3>
							<span className="inline-flex items-center gap-1 rounded border border-obsidian-700 bg-obsidian-900 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-300">
								<SourceIcon className="h-3 w-3" aria-hidden="true" />
								{SOURCE_LABELS[entry.sourceType]}
							</span>
						</div>
						<p className="mt-2 truncate font-mono text-xs text-ink-400">{compactId(entry.sourceKey)}</p>
						<p className="mt-1 text-xs text-ink-500">{formatTimestamp(entry.timestamp)} at {formatBlock(entry.blockNum)}</p>
					</div>
				</div>
				<div className="flex items-end justify-between gap-6 border-t border-obsidian-700 pt-3 text-right md:min-w-[220px] md:border-t-0 md:pt-0">
					<div>
						<p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-500">Amount</p>
						<p className={`mt-1 font-mono text-sm font-bold ${entry.direction === 'credit' ? 'text-emerald-200' : 'text-gold-200'}`}>
							{direction.sign}{formatNumber(entry.amount)}
						</p>
					</div>
					<div>
						<p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-500">Balance</p>
						<p className="mt-1 font-mono text-sm font-bold text-gold-200">{formatNumber(entry.balanceAfter)}</p>
					</div>
				</div>
			</div>
		</article>
	);
}
