import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { toast } from 'sonner';
import { TESTNET_RUNE_ECONOMY } from '@shared/protocol-core/runeEconomy';
import { accountScopedStorage, registerAccountScopedStore } from '../../lib/storage/accountScopedStorage';
import { pickRandomQuests, type DailyQuestType, type QuestTemplate } from '../data/dailyQuestPool';
import { getNFTBridge } from '../nft';
import { debug } from '../config/debugConfig';
import {
	assertClientWalletInvocation,
	type ClientWalletInvocation,
} from '../../data/wallet/clientWalletInvocation';

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
	flushing: boolean;
}

interface DailyQuestActions {
	refreshIfNeeded: () => Promise<void>;
	updateProgress: (type: DailyQuestType, increment: number) => void;
	rerollQuest: (questId: string) => void;
	flushPendingClaims: (invocation: ClientWalletInvocation) => Promise<void>;
}

const DAILY_QUEST_RUNE_REWARD = TESTNET_RUNE_ECONOMY.dailyQuestRunePerSlot;

function todayUtcString(): string {
	return new Date().toISOString().slice(0, 10);
}

/**
 * The chain accepts daily_quest_claim ops whose `ymd_utc` is within ±48h
 * of `op.timestamp`. Past that window a deferred claim cannot land, so
 * holding the UI hostage for that quest only frustrates the player.
 * After 2 days a held set is allowed to rotate.
 */
const CHAIN_CLAIM_GRACE_DAYS = 2;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function isWithinChainAcceptanceWindow(refreshDate: string, today: string): boolean {
	const refresh = Date.parse(`${refreshDate}T00:00:00Z`);
	const now = Date.parse(`${today}T00:00:00Z`);
	if (!Number.isFinite(refresh) || !Number.isFinite(now)) return false;
	return (now - refresh) <= CHAIN_CLAIM_GRACE_DAYS * MS_PER_DAY;
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

async function broadcastDailyQuestClaim(quest: DailyQuest): Promise<boolean> {
	const bridge = getNFTBridge();
	if (!bridge.isHiveMode()) return false;
	try {
		const result = await bridge.claimDailyQuest(quest.ymdUtc, quest.slot, quest.type);
		if (!result.success) {
			debug.warn('[DailyQuest] Claim broadcast rejected:', result.error);
			return false;
		}
		if (result.trxId) bridge.emitTransactionConfirmed(result.trxId);
		return true;
	} catch (err) {
		debug.warn('[DailyQuest] Claim broadcast error:', err);
		return false;
	}
}

function emitClaimToast(quest: DailyQuest, slotOrdinal: number): void {
	toast.success(quest.title, {
		description: `+${quest.reward.rune} RUNE · Slot ${slotOrdinal} of ${TESTNET_RUNE_ECONOMY.dailyQuestSlotsPerDay} today`,
		duration: 4000,
	});
}

export const useDailyQuestStore = create<DailyQuestState & DailyQuestActions>()(
	persist(
		(set, get) => ({
			quests: [],
			lastRefreshDate: '',
			totalCompleted: 0,
			rerollsUsedToday: 0,
			flushing: false,

			refreshIfNeeded: async () => {
				const today = todayUtcString();
				const current = get();

				if (current.lastRefreshDate === today && current.quests.length > 0) {
					// Same UTC day: keep progress but normalize reward.rune to the
					// current canon constant in case it shifted under persisted
					// quests (e.g. pre-flat-rate quests stored under reward.rune:50).
					const needsRewardSync = current.quests.some(q => q.reward.rune !== DAILY_QUEST_RUNE_REWARD);
					if (needsRewardSync) {
						set(state => ({
							quests: state.quests.map(q => ({
								...q,
								reward: { ...q.reward, rune: DAILY_QUEST_RUNE_REWARD },
							})),
						}));
					}
					return;
				}

				// Day rolled over. Completed-but-unclaimed quests are held, but
				// refresh never opens Keychain. The wallet prompt belongs to the
				// explicit Claim button in the quest panel.
				// If anything is still pending (not yet claimed, Keychain rejected,
				// guest mode), hold the rotation. The chain validates ymd_utc
				// within ±48h of op.timestamp, so a held quest can still claim
				// for up to 2 days; after that the player has effectively lost
				// the reward but we stop blocking the daily quest UI by
				// allowing the next refreshIfNeeded call to force-rotate.
				const stillPending = get().quests.some(q => q.completed && !q.claimed);
				const refreshDate = current.lastRefreshDate || today;
				const isStale = !isWithinChainAcceptanceWindow(refreshDate, today);
				if (stillPending && !isStale) return;

				const account = getNFTBridge().getUsername() ?? 'guest';
				const templates = pickRandomQuests(
					TESTNET_RUNE_ECONOMY.dailyQuestSlotsPerDay,
					[],
					`daily:${account}:${today}`,
				);
				const quests = templates.map((t, i) => templateToQuest(t, i, today));
				set({ quests, lastRefreshDate: today, rerollsUsedToday: 0 });
			},

			updateProgress: (type, increment) => {
				set(state => {
					let changed = false;
					const quests = state.quests.map(q => {
						if (q.type !== type || q.completed) return q;
						changed = true;
						const newProgress = Math.min(q.progress + increment, q.goal);
						const isNowComplete = newProgress >= q.goal;
						return {
							...q,
							progress: newProgress,
							completed: isNowComplete,
						};
					});
					if (!changed) return {};
					return { quests };
				});
				// Broadcast is deferred to flushPendingClaims so a mid-combat
				// completion does not trigger a Keychain confirmation dialog
				// while the player is making a decision. See file header.
			},

			flushPendingClaims: async (invocation) => {
				assertClientWalletInvocation(invocation, 'daily_quest_claim', 'Posting');
				if (get().flushing) return;
				const pending = get().quests.filter(q => q.completed && !q.claimed);
				if (pending.length === 0) return;
				const bridge = getNFTBridge();
				if (!bridge.isHiveMode()) return;

				set({ flushing: true });
				try {
					for (const quest of pending) {
						const ok = await broadcastDailyQuestClaim(quest);
						if (!ok) continue;

						set(state => {
							const quests = state.quests.map(q => q.id === quest.id ? { ...q, claimed: true } : q);
							const claimedToday = quests.filter(q => q.claimed && q.ymdUtc === quest.ymdUtc).length;
							emitClaimToast(quest, claimedToday);
							return {
								quests,
								totalCompleted: state.totalCompleted + 1,
							};
						});
					}
				} finally {
					set({ flushing: false });
				}
			},

			rerollQuest: (questId) => {
				const current = get();
				if (current.rerollsUsedToday >= 1) return;

				const targetIndex = current.quests.findIndex(q => q.id === questId);
				if (targetIndex === -1) return;

				const target = current.quests[targetIndex];
				const existingTitles = current.quests.map(q => q.title);
				const account = getNFTBridge().getUsername() ?? 'guest';
				const newTemplates = pickRandomQuests(
					1,
					existingTitles,
					`daily:${account}:${target.ymdUtc}:reroll:${target.slot}`,
				);
				if (newTemplates.length === 0) return;

				set(state => {
					const idx = state.quests.findIndex(q => q.id === questId);
					if (idx === -1) return {};
					const newQuest = templateToQuest(newTemplates[0], target.slot, target.ymdUtc);
					return {
						quests: state.quests.map((q, i) => i === idx ? newQuest : q),
						rerollsUsedToday: state.rerollsUsedToday + 1,
					};
				});
			},
		}),
		{
			name: 'ragnarok-daily-quests',
			storage: createJSONStorage(() => accountScopedStorage),
			partialize: (state) => {
				const {
					refreshIfNeeded: _a,
					updateProgress: _b,
					rerollQuest: _c,
					flushPendingClaims: _d,
					flushing: _e,
					...data
				} = state;
				return data;
			},
		},
	),
);

registerAccountScopedStore(useDailyQuestStore);
