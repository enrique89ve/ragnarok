import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import { MetaPageHeader, MetaPageHeaderButton } from '../../../components/navigation/MetaPageHeader';
import { getWarbandEntryRoute } from '../../../lib/warbandRoutes';
import {
	formatBattleMode,
	presentLocalBattleLedger,
	usePracticeRecordStore,
	type BattleLedgerFilter,
	type LocalBattleMode,
	type PracticeMatchRecord,
} from '../../data/practiceRecord';
import { routes } from '../../../lib/routes';
import { useNFTUsername } from '../../nft/hooks';
import { useReplayStore, type MatchRecord } from '../../stores/replayStore';
import ReplayViewer from './ReplayViewer';

const LEDGER_SHELL =
	'overflow-hidden rounded-md border border-obsidian-700 bg-obsidian-950/70';
const FOCUS_RING =
	'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300';

function formatRecordedAt(timestamp: number): string {
	return new Date(timestamp).toLocaleString(undefined, {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

function formatReplayDuration(startedAt: number, endedAt: number): string {
	const duration = Math.max(0, Math.round((endedAt - startedAt) / 1000));
	const minutes = Math.floor(duration / 60);
	const seconds = duration % 60;
	return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const LEDGER_FILTERS: ReadonlyArray<{
	readonly id: BattleLedgerFilter;
	readonly label: string;
}> = [
	{ id: 'all', label: 'All' },
	{ id: 'practice', label: 'Single' },
	{ id: 'campaign', label: 'Campaign' },
	{ id: 'p2p', label: 'PvP' },
];

function countByMode(
	records: ReadonlyArray<PracticeMatchRecord>,
	mode: LocalBattleMode,
): number {
	return records.filter((record) => record.mode === mode).length;
}

function LedgerFilterBar({
	filter,
	onChange,
	records,
}: {
	readonly filter: BattleLedgerFilter;
	readonly onChange: (next: BattleLedgerFilter) => void;
	readonly records: ReadonlyArray<PracticeMatchRecord>;
}) {
	return (
		<div
			role="radiogroup"
			aria-label="Battle category"
			className="flex flex-wrap gap-2"
		>
			{LEDGER_FILTERS.map((option) => {
				const selected = filter === option.id;
				const count = option.id === 'all'
					? records.length
					: countByMode(records, option.id);
				return (
					<button
						key={option.id}
						type="button"
						role="radio"
						aria-checked={selected}
						className={`inline-flex min-h-11 items-center gap-2 rounded-md border px-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em] transition-colors hover:border-gold-500/70 hover:text-gold-200 focus-visible:outline ${
							selected
								? 'border-gold-300 bg-gold-300/10 text-gold-300'
								: 'border-obsidian-700 bg-obsidian-950/60 text-ink-300'
						}`}
						onClick={() => onChange(option.id)}
					>
						{option.label}
						<span className={selected ? 'text-gold-200' : 'text-ink-400'}>
							{count}
						</span>
					</button>
				);
			})}
		</div>
	);
}

function BattleStreakPanel({
	streakLabel,
	wins,
	losses,
	draws,
	filterLabel,
}: {
	readonly streakLabel: string;
	readonly wins: number;
	readonly losses: number;
	readonly draws: number;
	readonly filterLabel: string;
}) {
	return (
		<section
			className="rounded-md border border-gold-300/25 bg-obsidian-950/80 p-5"
			aria-labelledby="battle-streak-title"
		>
			<p className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold-300">
				{filterLabel} · local
			</p>
			<div className="mt-3 flex flex-wrap items-end justify-between gap-4">
				<div>
					<h2
						id="battle-streak-title"
						className="font-display text-2xl font-black uppercase tracking-[0.12em] text-ink-0"
					>
						{streakLabel}
					</h2>
					<p className="mt-1 text-sm text-ink-300">
						Results on this device. Not ranked.
					</p>
				</div>
				<dl className="flex gap-6 font-mono text-sm uppercase tracking-[0.16em]">
					<div>
						<dt className="text-[10px] text-ink-400">Wins</dt>
						<dd className="mt-1 text-gold-300">{wins}</dd>
					</div>
					<div>
						<dt className="text-[10px] text-ink-400">Losses</dt>
						<dd className="mt-1 text-ember-300">{losses}</dd>
					</div>
					<div>
						<dt className="text-[10px] text-ink-400">Draws</dt>
						<dd className="mt-1 text-ink-200">{draws}</dd>
					</div>
				</dl>
			</div>
		</section>
	);
}

function resultCopy(result: PracticeMatchRecord['result']): {
	readonly label: string;
	readonly railClass: string;
	readonly textClass: string;
} {
	if (result === 'win') {
		return { label: 'Victory', railClass: 'bg-gold-300', textClass: 'text-gold-300' };
	}
	if (result === 'draw') {
		return { label: 'Draw', railClass: 'bg-ink-400', textClass: 'text-ink-200' };
	}
	return { label: 'Defeat', railClass: 'bg-blood-500', textClass: 'text-ember-300' };
}

function BattleResultRow({ record }: { readonly record: PracticeMatchRecord }) {
	const copy = resultCopy(record.result);
	return (
		<article className={LEDGER_SHELL}>
			<div className="grid grid-cols-[4px_minmax(0,1fr)]">
				<div className={copy.railClass} aria-hidden />
				<div className="flex min-h-11 items-center justify-between gap-4 px-4 py-3">
					<div className="flex min-w-0 items-center gap-3">
						<p className={`font-display text-sm font-bold uppercase tracking-[0.16em] ${copy.textClass}`}>
							{copy.label}
						</p>
						<span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-400">
							{formatBattleMode(record.mode)}
						</span>
					</div>
					<time
						className="shrink-0 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-400"
						dateTime={new Date(record.endedAt).toISOString()}
					>
						{formatRecordedAt(record.endedAt)}
					</time>
				</div>
			</div>
		</article>
	);
}

function BattleEmptyState({ filter }: { readonly filter: BattleLedgerFilter }) {
	const category = filter === 'all' ? 'battles' : formatBattleMode(filter).toLowerCase();
	return (
		<div className={`${LEDGER_SHELL} px-5 py-8`}>
			<p className="font-display text-sm font-bold uppercase tracking-[0.16em] text-ink-200">
				No {category} recorded
			</p>
			<p className="mt-2 max-w-md text-sm leading-relaxed text-ink-300">
				Finish a match in this category to write a local result for this account.
			</p>
			<Link
				to={getWarbandEntryRoute('single')}
				className={`mt-5 inline-flex min-h-11 items-center justify-center border border-gold-500 bg-obsidian-850 px-4 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-gold-300 hover:border-gold-300 hover:text-gold-200 ${FOCUS_RING}`}
			>
				Enter Single
			</Link>
		</div>
	);
}

function LoginLedgerEmpty() {
	return (
		<div className={`${LEDGER_SHELL} px-5 py-8`}>
			<p className="font-display text-sm font-bold uppercase tracking-[0.16em] text-ink-200">
				Login required
			</p>
			<p className="mt-2 max-w-md text-sm leading-relaxed text-ink-300">
				Battle history stays on this device, scoped to the Hive account that is logged in.
			</p>
			<Link
				to={routes.settings}
				className={`mt-5 inline-flex min-h-11 items-center justify-center border border-gold-500 bg-obsidian-850 px-4 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-gold-300 hover:border-gold-300 hover:text-gold-200 ${FOCUS_RING}`}
			>
				Login
			</Link>
		</div>
	);
}

function ReplayCard({ match, onView }: { match: MatchRecord; onView: () => void }) {
	return (
		<article className={LEDGER_SHELL}>
			<div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="min-w-0">
					<p className="font-display text-sm font-bold uppercase tracking-[0.12em] text-ink-0">
						{match.player1}
						<span className="mx-2 font-mono text-[10px] text-ink-400">vs</span>
						{match.player2}
					</p>
					<p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-400">
						{match.matchType}
						<span className="mx-2 text-obsidian-700">/</span>
						{match.turns} turns
						<span className="mx-2 text-obsidian-700">/</span>
						{formatReplayDuration(match.startedAt, match.endedAt)}
					</p>
				</div>
				<button
					type="button"
					onClick={onView}
					className={`inline-flex min-h-11 shrink-0 items-center justify-center border border-gold-500 bg-obsidian-850 px-4 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-gold-300 hover:border-gold-300 hover:text-gold-200 ${FOCUS_RING}`}
				>
					Watch Replay
				</button>
			</div>
		</article>
	);
}

export default function MatchHistoryPage() {
	const matchHistory = useReplayStore((s) => s.matchHistory);
	const currentReplay = useReplayStore((s) => s.currentReplay);
	const loadReplay = useReplayStore((s) => s.loadReplay);
	const closeReplay = useReplayStore((s) => s.closeReplay);
	const clearHistory = useReplayStore((s) => s.clearHistory);
	const practiceRecords = usePracticeRecordStore((s) => s.records);
	const username = useNFTUsername();
	const [confirmClear, setConfirmClear] = useState(false);
	const [ledgerFilter, setLedgerFilter] = useState<BattleLedgerFilter>('all');

	const ledger = presentLocalBattleLedger({
		account: username,
		records: practiceRecords,
		filter: ledgerFilter,
	});
	const historySecondary = !ledger.signedIn
		? 'Login required'
		: ledger.recordedCount > 0
			? `${ledger.recordedCount} battles`
			: 'No matches';

	if (currentReplay) {
		return <ReplayViewer match={currentReplay} onClose={closeReplay} />;
	}

	return (
		<div className="min-h-dvh w-full overflow-x-hidden overflow-y-auto bg-(image:--bg-cosmos-nav) text-ink-0">
			<MetaPageHeader
				title="History"
				kicker="Records"
				username={username}
				accountSecondary={historySecondary}
				actions={matchHistory.length > 0 && (
					confirmClear ? (
						<>
							<span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ember-300">
								Clear replays?
							</span>
							<MetaPageHeaderButton
								tone="danger"
								onClick={() => {
									clearHistory();
									setConfirmClear(false);
								}}
							>
								Confirm
							</MetaPageHeaderButton>
							<MetaPageHeaderButton onClick={() => setConfirmClear(false)}>
								Cancel
							</MetaPageHeaderButton>
						</>
					) : (
						<MetaPageHeaderButton
							tone="danger"
							onClick={() => setConfirmClear(true)}
						>
							Clear Replays
						</MetaPageHeaderButton>
					)
				)}
			/>

			<main className="n-page-gutter mx-auto w-full max-w-4xl py-8">
				{!ledger.signedIn ? (
					<LoginLedgerEmpty />
				) : (
					<>
				<BattleStreakPanel
					streakLabel={ledger.streakLabel}
					wins={ledger.wins}
					losses={ledger.losses}
					draws={ledger.draws}
					filterLabel={ledger.filterLabel}
				/>

				<section className="mt-8" aria-labelledby="battle-ledger-title">
					<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
						<div>
							<h2
								id="battle-ledger-title"
								className="font-display text-xs font-bold uppercase tracking-[0.22em] text-ink-200"
							>
								Battle ledger
							</h2>
							<p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
								{ledger.recordedCount} recorded
							</p>
						</div>
						<LedgerFilterBar
							filter={ledgerFilter}
							onChange={setLedgerFilter}
							records={practiceRecords}
						/>
					</div>
					{ledger.rows.length === 0 ? (
						<BattleEmptyState filter={ledgerFilter} />
					) : (
						<div className="space-y-2">
							{ledger.rows.map((record) => (
								<BattleResultRow key={record.matchId} record={record} />
							))}
						</div>
					)}
				</section>
					</>
				)}

				{matchHistory.length > 0 ? (
					<section className="mt-10" aria-labelledby="replay-ledger-title">
						<h2
							id="replay-ledger-title"
							className="mb-3 font-display text-xs font-bold uppercase tracking-[0.22em] text-ink-200"
						>
							Replays
						</h2>
						<div className="space-y-2">
							{matchHistory.map((match) => (
								<ReplayCard
									key={match.id}
									match={match}
									onView={() => loadReplay(match.id)}
								/>
							))}
						</div>
					</section>
				) : null}
			</main>
		</div>
	);
}
