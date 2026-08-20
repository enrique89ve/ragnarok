import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import { MetaPageHeader, MetaPageHeaderButton } from '../../../components/navigation/MetaPageHeader';
import { getWarbandEntryRoute } from '../../../lib/warbandRoutes';
import {
	derivePracticeStreak,
	formatPracticeStreak,
	usePracticeRecordStore,
	type PracticeMatchRecord,
} from '../../data/practiceRecord';
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

function countSingleResults(records: ReadonlyArray<PracticeMatchRecord>): {
	readonly wins: number;
	readonly losses: number;
} {
	let wins = 0;
	let losses = 0;
	for (const record of records) {
		if (record.result === 'win') wins += 1;
		else losses += 1;
	}
	return { wins, losses };
}

function formatReplayDuration(startedAt: number, endedAt: number): string {
	const duration = Math.max(0, Math.round((endedAt - startedAt) / 1000));
	const minutes = Math.floor(duration / 60);
	const seconds = duration % 60;
	return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function SingleStreakPanel({
	streakLabel,
	wins,
	losses,
}: {
	readonly streakLabel: string;
	readonly wins: number;
	readonly losses: number;
}) {
	return (
		<section
			className="rounded-md border border-gold-300/25 bg-obsidian-950/80 p-5"
			aria-labelledby="single-streak-title"
		>
			<p className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold-300">
				Single · local
			</p>
			<div className="mt-3 flex flex-wrap items-end justify-between gap-4">
				<div>
					<h2
						id="single-streak-title"
						className="font-display text-2xl font-black uppercase tracking-[0.12em] text-ink-0"
					>
						{streakLabel}
					</h2>
					<p className="mt-1 text-sm text-ink-300">
						Consecutive single results on this device. Not ranked.
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
				</dl>
			</div>
		</section>
	);
}

function SingleResultRow({ record }: { readonly record: PracticeMatchRecord }) {
	const won = record.result === 'win';
	return (
		<article className={LEDGER_SHELL}>
			<div className="grid grid-cols-[4px_minmax(0,1fr)]">
				<div
					className={won ? 'bg-gold-300' : 'bg-blood-500'}
					aria-hidden
				/>
				<div className="flex min-h-11 items-center justify-between gap-4 px-4 py-3">
					<p className={`font-display text-sm font-bold uppercase tracking-[0.16em] ${won ? 'text-gold-300' : 'text-ember-300'}`}>
						{won ? 'Victory' : 'Defeat'}
					</p>
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

function SingleEmptyState() {
	return (
		<div className={`${LEDGER_SHELL} px-5 py-8`}>
			<p className="font-display text-sm font-bold uppercase tracking-[0.16em] text-ink-200">
				No single results
			</p>
			<p className="mt-2 max-w-md text-sm leading-relaxed text-ink-300">
				Finish a single match to write a local victory or defeat. Campaign and PvP stay off this ledger.
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

	const practiceStreak = formatPracticeStreak(derivePracticeStreak(practiceRecords));
	const { wins, losses } = countSingleResults(practiceRecords);
	const historySecondary = practiceRecords.length > 0
		? `Single ${practiceStreak}`
		: matchHistory.length === 0
			? 'No matches'
			: `${matchHistory.length} replay${matchHistory.length === 1 ? '' : 's'}`;

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
				<SingleStreakPanel
					streakLabel={practiceStreak === '—' ? 'No streak' : practiceStreak}
					wins={wins}
					losses={losses}
				/>

				<section className="mt-8" aria-labelledby="single-ledger-title">
					<div className="mb-3 flex items-end justify-between gap-3">
						<h2
							id="single-ledger-title"
							className="font-display text-xs font-bold uppercase tracking-[0.22em] text-ink-200"
						>
							Single ledger
						</h2>
						<span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
							{practiceRecords.length} recorded
						</span>
					</div>
					{practiceRecords.length === 0 ? (
						<SingleEmptyState />
					) : (
						<div className="space-y-2">
							{practiceRecords.map((record) => (
								<SingleResultRow key={record.matchId} record={record} />
							))}
						</div>
					)}
				</section>

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
