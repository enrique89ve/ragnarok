import React, { useEffect } from 'react';
import { CheckCircle2, RotateCcw, Sparkles } from 'lucide-react';
import { useDailyQuestStore, type DailyQuest } from '../../stores/dailyQuestStore';

/**
 * QuestCard — Norse-voiced quest tile.
 *
 * Visual language matches the route cards (Ranked/Campaign/Collection):
 *   - obsidian gradient body, gold-300 accent border-strip at bottom
 *   - Cinzel display title (uppercase tracked)
 *   - mono kicker labels and metric readouts
 *   - ornate reward chip with diamond bullet (cf. Button ornate variant)
 *   - hover lifts a subtle radial gold glow from top-right
 *
 * State affordances:
 *   - in-progress: gold strip at 30% opacity, progress bar gold gradient, "Recast" link
 *   - completed (unclaimed): full gold strip, "Claim Reward" CTA
 *   - claimed: emerald strip + emerald progress bar + "Claimed" badge
 */
function QuestCard({ quest, onClaim, onReroll, canReroll }: {
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
			: 'bg-gold-300/30';

	const progressFill = isClaimed
		? 'bg-linear-to-r from-emerald-600 to-emerald-300'
		: isComplete
			? 'bg-linear-to-r from-gold-400 to-gold-200'
			: 'bg-linear-to-r from-gold-600 to-gold-400';

	return (
		<div className="relative group flex flex-col min-h-[200px] p-5 rounded-xl border border-obsidian-700 bg-linear-to-b from-obsidian-850 to-obsidian-950 overflow-hidden transition-all duration-300 hover:border-gold-600/40">
			{/* Atmospheric gold glow — only visible on hover, anchored top-right */}
			<div
				className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
				style={{ background: 'radial-gradient(circle at top right, rgba(217,168,68,0.08), transparent 65%)' }}
			/>

			{/* Header: kicker + ornate reward chip */}
			<div className="relative z-10 flex items-start justify-between gap-3 mb-3">
				<span className="font-mono text-[10px] tracking-[0.32em] uppercase text-ink-300 font-semibold mt-1">
					Quest
				</span>
				<span className="inline-flex items-center gap-1.5 rounded-md border border-gold-300/45 bg-obsidian-900/70 backdrop-blur-sm px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-[0.18em] text-gold-300 whitespace-nowrap shrink-0">
					<span aria-hidden className="w-[5px] h-[5px] rotate-45 bg-gold-300" />
					+{quest.reward.rune} Rune
				</span>
			</div>

			{/* Title + description */}
			<div className="relative z-10 mb-4 flex-1">
				<h3 className="font-display text-base font-bold tracking-[0.06em] uppercase text-ink-0 mb-1.5 leading-tight">
					{quest.title}
				</h3>
				<p className="text-ink-200 text-[13px] leading-[1.55]">
					{quest.description}
				</p>
			</div>

			{/* Progress readout */}
			<div className="relative z-10 mb-3">
				<div className="flex items-center justify-between mb-1.5">
					<span className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-300">Progress</span>
					<span className="font-mono text-[10px] tracking-[0.18em] uppercase text-gold-300">
						{quest.progress} / {quest.goal}
					</span>
				</div>
				<div className="h-[3px] rounded-full bg-obsidian-700 overflow-hidden">
					<div
						className={`h-full transition-all duration-500 ${progressFill}`}
						style={{ width: `${pct}%` }}
					/>
				</div>
			</div>

			{/* Action footer */}
			<div className="relative z-10 flex items-center justify-between pt-3 border-t border-obsidian-700/80 min-h-[28px]">
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
						In Progress
					</span>
				)}
				{isComplete && !isClaimed && (
					<button
						onClick={onClaim}
						className="inline-flex items-center gap-1.5 font-display text-[11px] font-bold tracking-[0.22em] uppercase text-gold-300 hover:text-gold-100 transition-colors"
					>
						<Sparkles size={12} strokeWidth={2} />
						Claim Reward
					</button>
				)}
				{isClaimed && (
					<span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.22em] uppercase text-emerald-300">
						<CheckCircle2 size={11} strokeWidth={2} />
						Claimed
					</span>
				)}
				{!isClaimed && (
					<span className={`font-mono text-[10px] tracking-[0.18em] uppercase ${isComplete ? 'text-gold-300' : 'text-ink-400'}`}>
						{isComplete ? 'Ready' : `${Math.round(pct)}%`}
					</span>
				)}
			</div>

			{/* Bottom accent strip — semantic state indicator */}
			<span className={`absolute bottom-0 left-0 right-0 h-[2px] ${stripClass}`} />
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

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
			{quests.map(quest => (
				<QuestCard
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
