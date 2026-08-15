import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { toast } from 'sonner';
import { TESTNET_RUNE_ECONOMY, MAINNET_RUNE_ECONOMY, getRuneEconomy } from '@shared/protocol-core/runeEconomy';
import { getRuntimeExecutionMode } from '../config/featureFlags';
import { accountScopedStorage, registerAccountScopedStore } from '../../lib/storage/accountScopedStorage';
import { pickRandomQuests, type DailyQuestType, type QuestTemplate } from '../data/dailyQuestPool';
import { getNFTBridge } from '../nft';
import { debug } from '../config/debugConfig';
import {
	assertClientWalletInvocation,
	type ClientWalletInvocation,
} from '../../data/wallet/clientWalletInvocation';
import { recordCeremonyFeedbackEvent } from '../protocol/ceremonyFeedback';

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
	verificationHash?: string;
}

export interface DailyQuestClaimFeedback {
	status: 'claimed' | 'already_claimed' | 'partial' | 'rejected' | 'unavailable';
	claimedCount: number;
	alreadyClaimedCount: number;
	runeEarned: number;
	errors: string[];
	updatedAt: number;
}

interface DailyQuestState {
	quests: DailyQuest[];
	lastRefreshDate: string;
	totalCompleted: number;
	rerollsUsedToday: number;
	flushing: boolean;
	lastClaimFeedback: DailyQuestClaimFeedback | null;
	claimHistory: Record<string, string>; // Map of "ymdUtc:slot" -> "trxId" to prevent redundant broadcasts
	clientSalt: string;
}

interface DailyQuestActions {
	refreshIfNeeded: () => Promise<void>;
	updateProgress: (type: DailyQuestType, increment: number) => void;
	rerollQuest: (questId: string) => void;
	flushPendingClaims: (invocation: ClientWalletInvocation) => Promise<void>;
}

const getActiveEconomy = () => getRuneEconomy(getRuntimeExecutionMode());

const DAILY_QUEST_RUNE_REWARD = () => getActiveEconomy().dailyQuestRunePerSlot;
const DAILY_QUEST_SLOTS_PER_DAY = () => getActiveEconomy().dailyQuestSlotsPerDay;

function todayUtcString(): string {
	return new Date().toISOString().slice(0, 10);
}

function computeQuestHash(quest: Partial<DailyQuest>, salt: string): string {
	const data = `${quest.ymdUtc}|${quest.slot}|${quest.type}|${salt}`;
	let hash = 0;
	for (let i = 0; i < data.length; i++) {
		const char = data.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash |= 0; // Convert to 32bit integer
	}
	return hash.toString(16);
}

function templateToQuest(template: QuestTemplate, slot: number, ymdUtc: string, salt: string): DailyQuest {
	const quest: Partial<DailyQuest> = {
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
		reward: { rune: DAILY_QUEST_RUNE_REWARD(), xp: template.xp },
	};
	
	return {
		...quest,
		verificationHash: computeQuestHash(quest, salt),
	} as DailyQuest;
}

async function broadcastDailyQuestClaim(quest: DailyQuest): Promise<boolean> {
	const bridge = getNFTBridge();
	if (!bridge.isHiveMode()) return false;
	try {
		const result = await bridge.claimDailyQuest(quest.slot, quest.type);
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

function buildClaimFeedback(input: Omit<DailyQuestClaimFeedback, 'updatedAt'>): DailyQuestClaimFeedback {
	return {
		...input,
		updatedAt: Date.now(),
	};
}

export const useDailyQuestStore = create<DailyQuestState & DailyQuestActions>()(
	persist(
		(set, get) => ({
			quests: [],
			lastRefreshDate: '',
			totalCompleted: 0,
			rerollsUsedToday: 0,
			flushing: false,
			lastClaimFeedback: null,
			claimHistory: {},
			clientSalt: Math.random().toString(36).substring(2),

			refreshIfNeeded: async () => {
				const today = todayUtcString();
				const current = get();

				if (current.lastRefreshDate === today && current.quests.length > 0) {
					// Same UTC day: keep progress but normalize reward.rune to the
					// current canon constant in case it shifted under persisted
					// quests (e.g. pre-flat-rate quests stored under reward.rune:50).
					const reward = DAILY_QUEST_RUNE_REWARD();
					const needsRewardSync = current.quests.some(q => q.reward.rune !== reward);
					if (needsRewardSync) {
						set(state => ({
							quests: state.quests.map(q => ({
								...q,
								reward: { ...q.reward, rune: reward },
							})),
						}));
					}
					return;
				}

				const account = getNFTBridge().getUsername() ?? 'guest';
				const economy = getActiveEconomy();
				const templates = pickRandomQuests(
					economy.dailyQuestSlotsPerDay,
					[],
					`daily:${account}:${today}`,
				);
				const quests = templates.map((t, i) => templateToQuest(t, i, today, current.clientSalt));
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
				if (pending.length === 0) {
					const alreadyClaimed = get().quests.filter(q => q.completed && q.claimed);
					const runeEarned = alreadyClaimed.reduce((total, quest) => total + quest.reward.rune, 0);
					const feedback = buildClaimFeedback({
						status: alreadyClaimed.length > 0 ? 'already_claimed' : 'rejected',
						claimedCount: 0,
						alreadyClaimedCount: alreadyClaimed.length,
						runeEarned,
						errors: alreadyClaimed.length > 0 ? [] : ['No completed daily quest is ready to claim.'],
					});
					set({ lastClaimFeedback: feedback });
					recordCeremonyFeedbackEvent('daily_quest_claim', 'no_pending', {
						status: feedback.status,
						alreadyClaimedCount: feedback.alreadyClaimedCount,
						runeEarned: feedback.runeEarned,
						errors: feedback.errors,
					});
					if (alreadyClaimed.length > 0) {
						toast.info('Daily quest rewards already claimed.', {
							description: `${runeEarned} RUNE recorded across ${alreadyClaimed.length} slot${alreadyClaimed.length === 1 ? '' : 's'}.`,
						});
					}
					return;
				}
				const bridge = getNFTBridge();
				if (!bridge.isHiveMode()) {
					const feedback = buildClaimFeedback({
						status: 'unavailable',
						claimedCount: 0,
						alreadyClaimedCount: 0,
						runeEarned: 0,
						errors: ['Daily quest RUNE claims require Hive testnet mode.'],
					});
					set({ lastClaimFeedback: feedback });
					recordCeremonyFeedbackEvent('daily_quest_claim', 'unavailable', {
						status: feedback.status,
						errors: feedback.errors,
					});
					toast.error('Daily quest RUNE claims require Hive testnet mode.');
					return;
				}

				set({ flushing: true });
				let claimedCount = 0;
				let alreadyClaimedCount = 0;
				const errors: string[] = [];
				try {
					for (const quest of pending) {
						// Anti-Double Claim Protection: check local history
						const claimKey = `${quest.ymdUtc}:${quest.slot}`;
						if (get().claimHistory[claimKey]) {
							debug.warn(`[DailyQuest] Claim already in history for ${claimKey}, skipping redundant broadcast.`);
							alreadyClaimedCount++;
							set(state => ({
								quests: state.quests.map(q => q.id === quest.id ? { ...q, claimed: true } : q)
							}));
							recordCeremonyFeedbackEvent('daily_quest_claim', 'already_recorded', {
								ymdUtc: quest.ymdUtc,
								slot: quest.slot,
								questType: quest.type,
								rune: quest.reward.rune,
							});
							continue;
						}

						// Cache Injection Protection: verify the quest integrity
						const expectedHash = computeQuestHash(quest, get().clientSalt);
						if (quest.verificationHash !== expectedHash) {
							debug.error(`[DailyQuest] Cache injection detected! Hash mismatch for quest ${quest.id}. Claim aborted.`);
							errors.push(`Slot ${quest.slot + 1}: quest integrity check failed.`);
							toast.error('Security alert: Daily quest data integrity check failed.');
							continue;
						}

						const ok = await broadcastDailyQuestClaim(quest);
						if (!ok) {
							errors.push(`Slot ${quest.slot + 1}: broadcast rejected.`);
							recordCeremonyFeedbackEvent('daily_quest_claim', 'broadcast_rejected', {
								ymdUtc: quest.ymdUtc,
								slot: quest.slot,
								questType: quest.type,
								rune: quest.reward.rune,
							});
							continue;
						}

						set(state => {
							const quests = state.quests.map(q => q.id === quest.id ? { ...q, claimed: true } : q);
							const claimedToday = quests.filter(q => q.claimed && q.ymdUtc === quest.ymdUtc).length;
							emitClaimToast(quest, claimedToday);
							return {
								quests,
								totalCompleted: state.totalCompleted + 1,
								claimHistory: { ...state.claimHistory, [claimKey]: 'in-flight' },
							};
						});
						claimedCount++;
						recordCeremonyFeedbackEvent('daily_quest_claim', 'broadcasted', {
							ymdUtc: quest.ymdUtc,
							slot: quest.slot,
							questType: quest.type,
							rune: quest.reward.rune,
						});
					}
				} finally {
					const runeEarned = pending
						.filter(quest => get().quests.some(current => current.id === quest.id && current.claimed))
						.reduce((total, quest) => total + quest.reward.rune, 0);
					const status: DailyQuestClaimFeedback['status'] = errors.length > 0
						? claimedCount > 0 || alreadyClaimedCount > 0 ? 'partial' : 'rejected'
						: claimedCount > 0 ? 'claimed' : 'already_claimed';
					const feedback = buildClaimFeedback({
						status,
						claimedCount,
						alreadyClaimedCount,
						runeEarned,
						errors,
					});
					set({ flushing: false, lastClaimFeedback: feedback });
					recordCeremonyFeedbackEvent('daily_quest_claim', 'finished', {
						status: feedback.status,
						claimedCount,
						alreadyClaimedCount,
						runeEarned,
						errors,
					});
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
					const newQuest = templateToQuest(newTemplates[0], target.slot, target.ymdUtc, state.clientSalt);
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
					lastClaimFeedback: _f,
					...data
				} = state;
				return data;
			},
		},
	),
);

registerAccountScopedStore(useDailyQuestStore);
