import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Info, RotateCcw, Wallet } from 'lucide-react';
import { useDailyQuestStore, type DailyQuest, type DailyQuestClaimFeedback } from '../../stores/dailyQuestStore';
import { formatCountdown, useDailyResetCountdown } from '../../hooks/useDailyResetCountdown';
import { invokeClientWalletAction } from '../../../data/wallet/clientWalletInvocation';
import DailyQuestInfoDialog from './DailyQuestInfoDialog';
import CeremonyEvidenceButton from '../CeremonyEvidenceButton';
import { useNFTUsername } from '../../nft/hooks';

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
		<div className="daily-quest-row relative flex items-center gap-4 pl-5 pr-4 py-3.5 rounded-lg border border-obsidian-700 bg-linear-to-r from-obsidian-850 to-obsidian-900/80 transition-[background-color,border-color] hover:border-gold-600/40 hover:bg-obsidian-850">
			<span className={`absolute left-0 top-2 bottom-2 w-[2px] rounded-full ${stripClass}`} />

			<div className="daily-quest-icon shrink-0 w-9 h-9 rounded-md border border-gold-300/25 bg-obsidian-900/60 flex items-center justify-center">
				<span aria-hidden className="w-[7px] h-[7px] rotate-45 bg-gold-300/70" />
			</div>

			<div className="daily-quest-copy min-w-0 flex-1">
				<div className="daily-quest-topline flex items-baseline justify-between gap-3 mb-0.5">
					<h3 className="daily-quest-title font-display text-sm font-bold tracking-[0.06em] uppercase text-ink-0 truncate">
						{quest.title}
					</h3>
					<span className="daily-quest-progress-count font-mono text-[10px] tracking-[0.18em] uppercase text-ink-300 shrink-0">
						{quest.progress} / {quest.goal}
					</span>
				</div>
				<p className="daily-quest-description text-ink-300 text-[12px] leading-tight truncate">
					{quest.description}
				</p>
				<div className="h-[2px] rounded-full bg-obsidian-700 overflow-hidden mt-2">
					<div
						className={`h-full transition-[width] duration-500 ${progressFill}`}
						style={{ width: `${pct}%` }}
					/>
				</div>
			</div>

			<div className="daily-quest-meta shrink-0 flex items-center justify-end gap-4">
				<span className="daily-quest-reward shrink-0 inline-flex items-center gap-1.5 rounded-md border border-gold-300/45 bg-obsidian-900/70 px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-[0.18em] text-gold-300 whitespace-nowrap">
					<span aria-hidden className="w-[5px] h-[5px] rotate-45 bg-gold-300" />
					+{quest.reward.rune}
				</span>

				<div className="daily-quest-action shrink-0 w-[88px] flex justify-end">
					{!quest.completed && canReroll && (
						<button
							onClick={onReroll}
							className="inline-flex min-h-11 items-center gap-1.5 px-2 font-mono text-[10px] tracking-[0.22em] uppercase text-ink-300 hover:text-gold-300 transition-colors"
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
							className="inline-flex min-h-11 items-center gap-1.5 px-2 font-mono text-[10px] tracking-[0.18em] uppercase text-amber-300 transition-colors hover:text-gold-200 disabled:cursor-not-allowed disabled:opacity-50"
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
		</div>
	);
}

export default function DailyQuestPanel() {
	const quests = useDailyQuestStore(s => s.quests);
	const rerollsUsed = useDailyQuestStore(s => s.rerollsUsedToday);
	const claiming = useDailyQuestStore(s => s.flushing);
	const claimFeedback = useDailyQuestStore(s => s.lastClaimFeedback);
	const refreshIfNeeded = useDailyQuestStore(s => s.refreshIfNeeded);
	const rerollQuest = useDailyQuestStore(s => s.rerollQuest);
	const flushPendingClaims = useDailyQuestStore(s => s.flushPendingClaims);
	const account = useNFTUsername();
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
			<div className="daily-quest-landscape-list flex flex-col gap-2 max-h-[480px] overflow-y-auto pr-1 -mr-1 [scrollbar-width:thin]">
				<ResetCountdownChip onOpenInfo={() => setInfoOpen(true)} />
				<DailyQuestClaimSummary
					account={account}
					quests={quests}
					claimFeedback={claimFeedback}
				/>
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

function DailyQuestClaimSummary({
	account,
	quests,
	claimFeedback,
}: {
	account: string | null;
	quests: DailyQuest[];
	claimFeedback: DailyQuestClaimFeedback | null;
}) {
	const completed = quests.filter(quest => quest.completed);
	const claimable = completed.filter(quest => !quest.claimed);
	const claimed = completed.filter(quest => quest.claimed);
	const claimableRune = claimable.reduce((total, quest) => total + quest.reward.rune, 0);
	const claimedRune = claimed.reduce((total, quest) => total + quest.reward.rune, 0);
	const totalEarnedRune = claimableRune + claimedRune;
	const statusCopy = getDailyQuestStatusCopy({
		claimableCount: claimable.length,
		claimedCount: claimed.length,
		totalEarnedRune,
		claimFeedback,
	});

	return (
		<section className="rounded-md border border-obsidian-700 bg-obsidian-950/60 px-3.5 py-3">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400">
						Daily reward feedback
					</div>
					<p className="mt-1 text-sm font-semibold text-ink-100">
						{statusCopy.title}
					</p>
					<p className="mt-1 text-[12px] leading-snug text-ink-300">
						{statusCopy.detail}
					</p>
				</div>
				<CeremonyEvidenceButton
					ceremony="daily_quest_claim"
					account={account}
					context={{
						claimableCount: claimable.length,
						claimedCount: claimed.length,
						claimableRune,
						claimedRune,
						totalEarnedRune,
						lastFeedbackStatus: claimFeedback?.status ?? null,
						lastFeedbackErrors: claimFeedback?.errors ?? [],
					}}
					className="shrink-0 inline-flex min-h-11 items-center gap-1.5 rounded-md border border-obsidian-700 bg-obsidian-900/70 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-300 transition-colors hover:border-gold-500/60 hover:text-gold-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300"
				/>
			</div>
		</section>
	);
}

function getDailyQuestStatusCopy(input: {
	claimableCount: number;
	claimedCount: number;
	totalEarnedRune: number;
	claimFeedback: DailyQuestClaimFeedback | null;
}): { title: string; detail: string } {
	if (input.claimFeedback?.status === 'unavailable') {
		return {
			title: 'Claim unavailable in this runtime',
			detail: input.claimFeedback.errors[0] ?? 'Daily quest RUNE claims require Hive testnet mode.',
		};
	}
	if (input.claimFeedback?.status === 'rejected' || input.claimFeedback?.status === 'partial') {
		return {
			title: input.claimFeedback.status === 'partial' ? 'Some daily rewards need attention' : 'Daily claim rejected',
			detail: input.claimFeedback.errors[0] ?? 'Download evidence and retry after checking Keychain/replay state.',
		};
	}
	if (input.claimableCount > 0) {
		return {
			title: `${input.totalEarnedRune} RUNE earned today`,
			detail: `${input.claimableCount} completed slot${input.claimableCount === 1 ? '' : 's'} ready for a Posting-key claim. ${input.claimedCount} already claimed.`,
		};
	}
	if (input.claimedCount > 0) {
		return {
			title: `${input.totalEarnedRune} RUNE already claimed`,
			detail: 'All completed daily quest slots are marked claimed for this reset day.',
		};
	}
	return {
		title: 'No daily RUNE ready yet',
		detail: 'Complete a listed quest, then claim from the row to broadcast the reward.',
	};
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
			</div>
			<div className="flex items-center gap-2">
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
				<button
					type="button"
					onClick={onOpenInfo}
					aria-label="How daily quests work"
					title="How daily quests work"
					className="inline-flex h-12 w-12 items-center justify-center rounded-md border border-obsidian-700 bg-obsidian-900/70 text-ink-300 transition-colors hover:border-gold-500/60 hover:text-gold-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300"
				>
					<Info size={12} strokeWidth={2.2} aria-hidden />
				</button>
			</div>
		</div>
	);
}
