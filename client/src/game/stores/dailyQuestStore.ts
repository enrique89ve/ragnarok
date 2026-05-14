import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TESTNET_RUNE_ECONOMY } from '@shared/protocol-core/runeEconomy';
import { pickRandomQuests, type DailyQuestType, type QuestTemplate } from '../data/dailyQuestPool';
import { getNFTBridge } from '../nft';
import { debug } from '../config/debugConfig';

export interface DailyQuest {
	id: string;
	slot: number;
	ymdUtc: string;
	type: DailyQuestType;
	title: string;
	description: string;
	progress: number;
	goal: number;
	completed: boolean;
	claimed: boolean;
	reward: { rune: number; xp: number };
}

interface DailyQuestState {
	quests: DailyQuest[];
	lastRefreshDate: string;
	totalCompleted: number;
	rerollsUsedToday: number;
}

interface DailyQuestActions {
	refreshIfNeeded: () => void;
	updateProgress: (type: DailyQuestType, increment: number) => void;
	rerollQuest: (questId: string) => void;
}

const DAILY_QUEST_RUNE_REWARD = TESTNET_RUNE_ECONOMY.dailyQuestRunePerSlot;

function todayUtcString(): string {
	return new Date().toISOString().slice(0, 10);
}

function templateToQuest(template: QuestTemplate, slot: number, ymdUtc: string): DailyQuest {
	return {
		id: `dq-${ymdUtc}-${slot}`,
		slot,
		ymdUtc,
		type: template.type,
		title: template.title,
		description: template.description.replace('{goal}', String(template.goal)),
		progress: 0,
		goal: template.goal,
		completed: false,
		claimed: false,
		reward: { rune: DAILY_QUEST_RUNE_REWARD, xp: template.xp },
	};
}

function broadcastDailyQuestClaim(quest: DailyQuest): void {
	const bridge = getNFTBridge();
	if (!bridge.isHiveMode()) return;
	bridge.claimDailyQuest(quest.ymdUtc, quest.slot, quest.type)
		.then(r => { if (r.success && r.trxId) bridge.emitTransactionConfirmed(r.trxId); })
		.catch(err => debug.warn('[DailyQuest] Claim broadcast error:', err));
}

export const useDailyQuestStore = create<DailyQuestState & DailyQuestActions>()(
	persist(
		(set, get) => ({
			quests: [],
			lastRefreshDate: '',
			totalCompleted: 0,
			rerollsUsedToday: 0,

			refreshIfNeeded: () => {
				const today = todayUtcString();
				if (get().lastRefreshDate === today && get().quests.length > 0) return;

				const templates = pickRandomQuests(TESTNET_RUNE_ECONOMY.dailyQuestSlotsPerDay);
				const quests = templates.map((t, i) => templateToQuest(t, i, today));
				set({ quests, lastRefreshDate: today, rerollsUsedToday: 0 });
			},

			updateProgress: (type, increment) => {
				const claims: DailyQuest[] = [];
				set(state => {
					let changed = false;
					const quests = state.quests.map(q => {
						if (q.type !== type || q.completed) return q;
						changed = true;
						const newProgress = Math.min(q.progress + increment, q.goal);
						const isNowComplete = newProgress >= q.goal;
						const next: DailyQuest = {
							...q,
							progress: newProgress,
							completed: isNowComplete,
							claimed: isNowComplete ? true : q.claimed,
						};
						if (isNowComplete) claims.push(next);
						return next;
					});
					if (!changed) return {};
					return {
						quests,
						totalCompleted: state.totalCompleted + claims.length,
					};
				});
				for (const claim of claims) {
					broadcastDailyQuestClaim(claim);
				}
			},

			rerollQuest: (questId) => {
				const current = get();
				if (current.rerollsUsedToday >= 1) return;

				const existingTitles = current.quests.map(q => q.title);
				const newTemplates = pickRandomQuests(1, existingTitles);
				if (newTemplates.length === 0) return;

				set(state => {
					const questIndex = state.quests.findIndex(q => q.id === questId);
					if (questIndex === -1) return {};
					const slot = state.quests[questIndex].slot;
					const ymdUtc = state.quests[questIndex].ymdUtc;
					const newQuest = templateToQuest(newTemplates[0], slot, ymdUtc);
					return {
						quests: state.quests.map((q, i) => i === questIndex ? newQuest : q),
						rerollsUsedToday: state.rerollsUsedToday + 1,
					};
				});
			},
		}),
		{
			name: 'ragnarok-daily-quests',
			partialize: (state) => {
				const { refreshIfNeeded: _a, updateProgress: _b, rerollQuest: _c, ...data } = state;
				return data;
			},
		},
	),
);
