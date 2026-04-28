import React, { useEffect } from 'react';
import { CheckCircle2, RotateCcw, Sparkles } from 'lucide-react';
import { useDailyQuestStore, type DailyQuest } from '../../stores/dailyQuestStore';

/**
 * QuestRow — compact horizontal quest entry.
 *
 * Distinct from the route-card pattern above: routes are atmospheric "hero"
 * tiles, quests are operational task rows. Row layout scales linearly when
 * the quest count grows (3 → 6 → ...). All information lives in one band:
 *
 *   [ rune  | TITLE · description · ━━━━ progress 0/30 ] [ +45 RUNE ] [ ↻ ]
 *
 * Left edge has a 2px state strip (gold-300/30 → gold-300 → emerald) so a
 * scanned list reads completion state at a glance.
 */
function QuestRow({ quest, onClaim, onReroll, canReroll }: {
	quest: DailyQuest;
	onClaim: () => void;
	onReroll: () => void;
	canReroll: boolean;
}) {
	const pct = Math.min((quest.progress / quest.goal) * 100, 100);
	const isComplete = quest.completed;
	const isClaimed = quest.claimed;

	const stripClass = isClaimed
		? 'bg-emerald-400/70'
		: isComplete
			? 'bg-gold-300'
			: 'bg-gold-300/25';

	const progressFill = isClaimed
		? 'bg-linear-to-r from-emerald-600 to-emerald-300'
		: isComplete
			? 'bg-linear-to-r from-gold-400 to-gold-200'
			: 'bg-linear-to-r from-gold-600 to-gold-400';

	return (
		<div className="relative group flex items-center gap-4 pl-5 pr-4 py-3.5 rounded-lg border border-obsidian-700 bg-linear-to-r from-obsidian-850 to-obsidian-900/80 transition-all hover:border-gold-600/40 hover:bg-obsidian-850">
			{/* Left-edge state strip — vertical accent indicating progression */}
			<span className={`absolute left-0 top-2 bottom-2 w-[2px] rounded-full ${stripClass}`} />

			{/* Rune icon — small, ceremonial, sits inside its own bordered tile */}
			<div className="shrink-0 w-9 h-9 rounded-md border border-gold-300/25 bg-obsidian-900/60 flex items-center justify-center">
				<span aria-hidden className="w-[7px] h-[7px] rotate-45 bg-gold-300/70" />
			</div>

			{/* Body — title row + description + thin progress bar */}
			<div className="min-w-0 flex-1">
				<div className="flex items-baseline justify-between gap-3 mb-0.5">
					<h3 className="font-display text-sm font-bold tracking-[0.06em] uppercase text-ink-0 truncate">
						{quest.title}
					</h3>
					<span className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-300 shrink-0">
						{quest.progress} / {quest.goal}
					</span>
				</div>
				<p className="text-ink-300 text-[12px] leading-tight truncate">
					{quest.description}
				</p>
				<div className="h-[2px] rounded-full bg-obsidian-700 overflow-hidden mt-2">
					<div
						className={`h-full transition-all duration-500 ${progressFill}`}
						style={{ width: `${pct}%` }}
					/>
				</div>
			</div>

			{/* Reward chip — ornate diamond bullet, matches Button ornate variant */}
			<span className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-gold-300/45 bg-obsidian-900/70 px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-[0.18em] text-gold-300 whitespace-nowrap">
				<span aria-hidden className="w-[5px] h-[5px] rotate-45 bg-gold-300" />
				+{quest.reward.rune}
			</span>

			{/* Action slot — single icon-button per state */}
			<div className="shrink-0 w-[88px] flex justify-end">
				{!isComplete && !isClaimed && canReroll && (
					<button
						onClick={onReroll}
						className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.22em] uppercase text-ink-300 hover:text-gold-300 transition-colors"
					>
						<RotateCcw size={11} strokeWidth={2} />
						Recast
					</button>
				)}
				{!isComplete && !isClaimed && !canReroll && (
					<span className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink-400">
						Active
					</span>
				)}
				{isComplete && !isClaimed && (
					<button
						onClick={onClaim}
						className="inline-flex items-center gap-1.5 font-display text-[10px] font-bold tracking-[0.22em] uppercase text-gold-300 hover:text-gold-100 transition-colors"
					>
						<Sparkles size={11} strokeWidth={2} />
						Claim
					</button>
				)}
				{isClaimed && (
					<span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.22em] uppercase text-emerald-300">
						<CheckCircle2 size={11} strokeWidth={2} />
						Claimed
					</span>
				)}
			</div>
		</div>
	);
}

export default function DailyQuestPanel() {
	const quests = useDailyQuestStore(s => s.quests);
	const rerollsUsed = useDailyQuestStore(s => s.rerollsUsedToday);
	const refreshIfNeeded = useDailyQuestStore(s => s.refreshIfNeeded);
	const claimReward = useDailyQuestStore(s => s.claimReward);
	const rerollQuest = useDailyQuestStore(s => s.rerollQuest);

	useEffect(() => { refreshIfNeeded(); }, [refreshIfNeeded]);

	if (quests.length === 0) return null;

	// Vertical stack of compact rows. Caps at ~6 visible (≈480px) before
	// the list scrolls internally — works for current 3-quest baseline and
	// scales cleanly if the design ever ships weekly/seasonal extras.
	return (
		<div className="flex flex-col gap-2 max-h-[480px] overflow-y-auto pr-1 -mr-1 [scrollbar-width:thin]">
			{quests.map(quest => (
				<QuestRow
					key={quest.id}
					quest={quest}
					onClaim={() => claimReward(quest.id)}
					onReroll={() => rerollQuest(quest.id)}
					canReroll={rerollsUsed < 1}
				/>
			))}
		</div>
	);
}
