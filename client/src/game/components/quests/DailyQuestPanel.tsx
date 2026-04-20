import React, { useEffect } from 'react';
import { CheckCircle2, RotateCcw, ScrollText, Sparkles } from 'lucide-react';
import { useDailyQuestStore, type DailyQuest } from '../../stores/dailyQuestStore';

function QuestCard({ quest, onClaim, onReroll, canReroll }: {
	quest: DailyQuest;
	onClaim: () => void;
	onReroll: () => void;
	canReroll: boolean;
}) {
	const pct = Math.min((quest.progress / quest.goal) * 100, 100);

	return (
		<div className="rounded-xl border border-white/8 bg-gray-900/55 p-3.5 space-y-3 shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
			<div className="flex items-start justify-between">
				<div>
					<p className="text-[15px] font-semibold text-gray-100">{quest.title}</p>
					<p className="text-sm text-gray-400 leading-relaxed">{quest.description}</p>
				</div>
				<span className="rounded-full border border-amber-400/15 bg-amber-400/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-200 whitespace-nowrap ml-2">
					+{quest.reward.rune} RUNE
				</span>
			</div>

			<div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
				<div
					className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${quest.completed ? 'bg-green-500' : 'bg-amber-500'}`}
					style={{ width: `${pct}%` }}
				/>
			</div>

			<div className="flex items-center justify-between">
				<span className="text-xs font-medium text-gray-500">
					{quest.progress}/{quest.goal}
				</span>
				<div className="flex gap-2">
					{!quest.completed && !quest.claimed && canReroll && (
						<button
							onClick={onReroll}
							className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-200 transition-colors"
						>
							<RotateCcw size={12} strokeWidth={2} />
							Recast
						</button>
					)}
					{quest.completed && !quest.claimed && (
						<button
							onClick={onClaim}
							className="inline-flex items-center gap-1 rounded-full bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-amber-500"
						>
							<Sparkles size={12} strokeWidth={2} />
							Claim
						</button>
					)}
					{quest.claimed && (
						<span className="inline-flex items-center gap-1 text-xs font-medium text-green-300">
							<CheckCircle2 size={12} strokeWidth={2} />
							Claimed
						</span>
					)}
				</div>
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

	return (
		<div className="w-72 space-y-3">
			<div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
				<ScrollText size={15} strokeWidth={2} className="text-amber-300" />
				<h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-200/80">
					Daily Quests
				</h3>
			</div>
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
