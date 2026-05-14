import {
	CalendarCheck,
	Gauge,
	Sparkles,
	Trophy,
	type LucideIcon,
} from 'lucide-react';
import type { RuneStateSnapshot } from '../../../data/runeAPI';
import { formatNumber } from './walletFormatting';

type CapRow = {
	key: 'p2p_ranked' | 'campaign_first_clear' | 'daily_quest_claim';
	label: string;
	icon: LucideIcon;
	cap: number;
	issued: number;
};

function buildRows(state: RuneStateSnapshot): CapRow[] {
	return [
		{
			key: 'p2p_ranked',
			label: 'Ranked reward',
			icon: Trophy,
			cap: state.p2pCap,
			issued: state.p2pCreditTotal,
		},
		{
			key: 'campaign_first_clear',
			label: 'Campaign clear',
			icon: Sparkles,
			cap: state.campaignCap,
			issued: state.campaignCreditTotal,
		},
		{
			key: 'daily_quest_claim',
			label: 'Daily quest',
			icon: CalendarCheck,
			cap: state.dailyQuestCap,
			issued: state.dailyQuestCreditTotal,
		},
	];
}

function ratio(issued: number, cap: number): number {
	if (cap <= 0) return 0;
	const pct = (issued / cap) * 100;
	return Math.max(0, Math.min(100, pct));
}

function formatPercent(issued: number, cap: number): string {
	if (cap <= 0) return '0%';
	return `${ratio(issued, cap).toFixed(1)}%`;
}

export function SeasonStateOverview({ state }: { state: RuneStateSnapshot }) {
	const rows = buildRows(state);

	return (
		<section className="runic-panel texture-grain relative border border-obsidian-700 bg-obsidian-900/80 p-5">
			<span className="runic-corners runic-corners--bifrost" aria-hidden="true" />
			<span className="runic-corners-extra" aria-hidden="true" />
			<header className="relative z-10 mb-5 flex items-center justify-between gap-4">
				<div className="flex items-start gap-3">
					<span className="hex-frame hex-frame--gold h-10 w-9 shrink-0">
						<span className="hex-frame-inner text-gold-200">
							<Gauge className="h-4 w-4" aria-hidden="true" />
						</span>
					</span>
					<div>
						<p className="font-mono text-[10px] uppercase tracking-[0.28em] text-bifrost-200">
							Season {state.seasonId}
						</p>
						<h2 className="mt-1 font-display text-xl font-black uppercase tracking-[0.12em] text-ink-0">
							RUNE caps
						</h2>
					</div>
				</div>
				<span className="rounded border border-obsidian-700 bg-obsidian-950/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-300">
					{formatNumber(state.totalCap)} total
				</span>
			</header>

			<div className="relative z-10 grid gap-2">
				{rows.map(row => (
					<CapRowItem key={row.key} row={row} />
				))}
			</div>
		</section>
	);
}

function CapRowItem({ row }: { row: CapRow }) {
	const Icon = row.icon;
	const pct = ratio(row.issued, row.cap);

	return (
		<article className="border-l border-obsidian-600 bg-obsidian-950/55 px-4 py-3">
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div className="flex min-w-0 items-center gap-3">
					<span className="grid h-9 w-9 shrink-0 place-items-center border border-bifrost-300/35 bg-bifrost-500/10 text-bifrost-200">
						<Icon className="h-4 w-4" aria-hidden="true" />
					</span>
					<div className="min-w-0">
						<h3 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-ink-0">
							{row.label}
						</h3>
						<p className="mt-1 font-mono text-xs text-ink-400">
							{formatNumber(row.issued)} / {formatNumber(row.cap)} RUNE
						</p>
					</div>
				</div>
				<div className="flex items-center gap-3 md:min-w-50">
					<div
						className="h-2 flex-1 overflow-hidden rounded-full bg-obsidian-800"
						role="progressbar"
						aria-valuenow={Math.round(pct)}
						aria-valuemin={0}
						aria-valuemax={100}
						aria-label={`${row.label} issued`}
					>
						<div
							className="h-full bg-linear-to-r from-bifrost-500 to-gold-300"
							style={{ width: `${pct}%` }}
						/>
					</div>
					<p className="w-12 text-right font-mono text-xs font-bold text-gold-200">
						{formatPercent(row.issued, row.cap)}
					</p>
				</div>
			</div>
		</article>
	);
}
