import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { pickRandomQuests, type DailyQuestType, type QuestTemplate } from '../data/dailyQuestPool';
import { getNFTBridge } from '../nft';
import { debug } from '../config/debugConfig';

export interface DailyQuest {
	id: string;
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
	claimReward: (questId: string) => { rune: number; xp: number } | null;
	rerollQuest: (questId: string) => void;
}

function todayString(): string {
	const d = new Date();
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function templateToQuest(template: QuestTemplate, index: number): DailyQuest {
	return {
		id: `dq-${todayString()}-${index}`,
		type: template.type,
		title: template.title,
		description: template.description.replace('{goal}', String(template.goal)),
		progress: 0,
		goal: template.goal,
		completed: false,
		claimed: false,
		reward: template.reward,
	};
}

export const useDailyQuestStore = create<DailyQuestState & DailyQuestActions>()(
	persist(
		(set, get) => ({
			quests: [],
			lastRefreshDate: '',
			totalCompleted: 0,
			rerollsUsedToday: 0,

			refreshIfNeeded: () => {
				const today = todayString();
				if (get().lastRefreshDate === today && get().quests.length > 0) return;

				const templates = pickRandomQuests(3);
				const quests = templates.map((t, i) => templateToQuest(t, i));
				set({ quests, lastRefreshDate: today, rerollsUsedToday: 0 });
			},

			updateProgress: (type, increment) => {
				set(state => {
					let changed = false;
					const quests = state.quests.map(q => {
						if (q.type === type && !q.completed) {
							changed = true;
							const newProgress = Math.min(q.progress + increment, q.goal);
							return {
								...q,
								progress: newProgress,
								completed: newProgress >= q.goal,
							};
						}
						return q;
					});
					return changed ? { quests } : {};
				});
			},

			claimReward: (questId) => {
				const quest = get().quests.find(q => q.id === questId);
				if (!quest || !quest.completed || quest.claimed) return null;

				set(state => ({
					quests: state.quests.map(q =>
						q.id === questId ? { ...q, claimed: true } : q
					),
					totalCompleted: state.totalCompleted + 1,
				}));

				if (getNFTBridge().isHiveMode()) {
					getNFTBridge().claimReward(`daily_quest:${questId}`)
					.then(r => { if (r.success && r.trxId) getNFTBridge().emitTransactionConfirmed(r.trxId); })
					.catch(err => debug.warn('[DailyQuest] Reward claim error:', err));
				}

				return quest.reward;
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
					const newQuest = templateToQuest(newTemplates[0], questIndex);
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
				const { refreshIfNeeded: _a, updateProgress: _b, claimReward: _c, rerollQuest: _d, ...data } = state;
				return data;
			},
		}
	)
);
