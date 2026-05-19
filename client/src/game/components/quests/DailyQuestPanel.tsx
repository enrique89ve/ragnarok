import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Info, RotateCcw, Wallet } from 'lucide-react';
import { useDailyQuestStore, type DailyQuest } from '../../stores/dailyQuestStore';
import { formatCountdown, useDailyResetCountdown } from '../../hooks/useDailyResetCountdown';
import { invokeClientWalletAction } from '../../../data/wallet/clientWalletInvocation';
import DailyQuestInfoDialog from './DailyQuestInfoDialog';

/**
 * QuestRow — compact horizontal quest entry.
 *
 * State machine has three visible states. Completion is detected mid-match,
 * but the chain broadcast is deferred (so Keychain doesn't pop during combat).
 *
 *   in_progress -> awaiting_claim -> claimed
 *
 *   [ rune  | TITLE · description · ━━━━ progress 0/30 ] [ +N RUNE ] [ ↻ ]
 *
 * The "+N RUNE" chip reads from quest.reward.rune, which the store sets from
 * TESTNET_RUNE_ECONOMY.dailyQuestRunePerSlot — changing the canonical constant
 * automatically reflects in every existing quest row on the next refresh.
 *
 * Left edge has a 2px state strip:
 *   gold     -> in progress
 *   amber    -> completed, broadcast pending (Keychain not yet confirmed)
 *   emerald  -> chain has acknowledged the claim
 */
function QuestRow({ quest, onReroll, onClaim, canReroll, claiming }: {
	quest: DailyQuest;
	onReroll: () => void;
	onClaim: () => void;
	canReroll: boolean;
	claiming: boolean;
}) {
	const pct = Math.min((quest.progress / quest.goal) * 100, 100);
	const isClaimed = quest.claimed;
	const isAwaitingClaim = quest.completed && !quest.claimed;

	const stripClass = isClaimed
		? 'bg-emerald-400/70'
		: isAwaitingClaim
			? 'bg-amber-400/65'
			: 'bg-gold-300/25';

	const progressFill = isClaimed
		? 'bg-linear-to-r from-emerald-600 to-emerald-300'
		: isAwaitingClaim
			? 'bg-linear-to-r from-amber-600 to-amber-300'
			: 'bg-linear-to-r from-gold-600 to-gold-400';

	return (
		<div className="relative group flex items-center gap-4 pl-5 pr-4 py-3.5 rounded-lg border border-obsidian-700 bg-linear-to-r from-obsidian-850 to-obsidian-900/80 transition-all hover:border-gold-600/40 hover:bg-obsidian-850">
			<span className={`absolute left-0 top-2 bottom-2 w-[2px] rounded-full ${stripClass}`} />

			<div className="shrink-0 w-9 h-9 rounded-md border border-gold-300/25 bg-obsidian-900/60 flex items-center justify-center">
				<span aria-hidden className="w-[7px] h-[7px] rotate-45 bg-gold-300/70" />
			</div>

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

			<span className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-gold-300/45 bg-obsidian-900/70 px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-[0.18em] text-gold-300 whitespace-nowrap">
				<span aria-hidden className="w-[5px] h-[5px] rotate-45 bg-gold-300" />
				+{quest.reward.rune}
			</span>

			<div className="shrink-0 w-[88px] flex justify-end">
				{!quest.completed && canReroll && (
					<button
						onClick={onReroll}
						className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.22em] uppercase text-ink-300 hover:text-gold-300 transition-colors"
					>
						<RotateCcw size={11} strokeWidth={2} />
						Recast
					</button>
				)}
				{!quest.completed && !canReroll && (
					<span className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink-400">
						Active
					</span>
				)}
				{isAwaitingClaim && (
					<button
						type="button"
						onClick={onClaim}
						disabled={claiming}
						className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.18em] uppercase text-amber-300 transition-colors hover:text-gold-200 disabled:cursor-not-allowed disabled:opacity-50"
						title="Sign the next custom_json in Hive Keychain to credit the reward."
					>
						<Wallet size={11} strokeWidth={2} />
						{claiming ? 'Wait' : 'Claim'}
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
	const claiming = useDailyQuestStore(s => s.flushing);
	const refreshIfNeeded = useDailyQuestStore(s => s.refreshIfNeeded);
	const rerollQuest = useDailyQuestStore(s => s.rerollQuest);
	const flushPendingClaims = useDailyQuestStore(s => s.flushPendingClaims);
	const [infoOpen, setInfoOpen] = useState(false);

	useEffect(() => { void refreshIfNeeded(); }, [refreshIfNeeded]);

	const claimPending = () => {
		void invokeClientWalletAction(
			{
				kind: 'daily_quest_claim',
				authority: 'Posting',
				label: 'Claim daily quest rewards',
			},
			flushPendingClaims,
		);
	};

	if (quests.length === 0) return null;

	return (
		<>
			<div className="flex flex-col gap-2 max-h-[480px] overflow-y-auto pr-1 -mr-1 [scrollbar-width:thin]">
				<ResetCountdownChip onOpenInfo={() => setInfoOpen(true)} />
				{quests.map(quest => (
					<QuestRow
						key={quest.id}
						quest={quest}
						onReroll={() => rerollQuest(quest.id)}
						onClaim={claimPending}
						canReroll={rerollsUsed < 1}
						claiming={claiming}
					/>
				))}
			</div>
			{infoOpen && <DailyQuestInfoDialog onClose={() => setInfoOpen(false)} />}
		</>
	);
}

function ResetCountdownChip({ onOpenInfo }: { onOpenInfo: () => void }) {
	const { remainingMs, sourceIsHive } = useDailyResetCountdown();
	const sourceLabel = sourceIsHive ? 'Hive UTC' : 'Local clock';
	const sourceTint = sourceIsHive ? 'text-bifrost-200' : 'text-ink-400';

	return (
		<div className="flex items-center justify-between rounded-md border border-obsidian-700 bg-obsidian-950/60 px-3.5 py-2">
			<div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.22em] uppercase text-ink-300">
				<Clock size={11} strokeWidth={2} aria-hidden />
				Next rotation
				<button
					type="button"
					onClick={onOpenInfo}
					aria-label="How daily quests work"
					title="How daily quests work"
					className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-obsidian-700 bg-obsidian-900/70 text-ink-300 transition-colors hover:border-gold-500/60 hover:text-gold-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300"
				>
					<Info size={12} strokeWidth={2.2} aria-hidden />
				</button>
			</div>
			<div className="flex items-baseline gap-2">
				<span className="font-mono text-sm font-bold tracking-wide text-ink-0 tabular-nums">
					{formatCountdown(remainingMs)}
				</span>
				<span
					className={`font-mono text-[9px] tracking-[0.22em] uppercase ${sourceTint}`}
					title={sourceIsHive
						? 'Synced to Hive head-block timestamp.'
						: 'Hive RPC unreachable — countdown uses your device clock.'}
				>
					{sourceLabel}
				</span>
			</div>
		</div>
	);
}
