import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { toast } from 'sonner';
import { TESTNET_RUNE_ECONOMY, MAINNET_RUNE_ECONOMY, getRuneEconomy, createDailyQuestRuneSourceKey, createRuneLedgerEntryId } from '@shared/protocol-core/runeEconomy';
import { getRuntimeExecutionMode } from '../config/featureFlags';
import { accountScopedStorage, registerAccountScopedStore } from '../../lib/storage/accountScopedStorage';
import { pickRandomQuests, type DailyQuestType, type QuestTemplate } from '../data/dailyQuestPool';
import { getNFTBridge } from '../nft';
import { debug } from '../config/debugConfig';
import { readLocalRuneLedger } from '../../data/runeSeasonReadModel';
import { claimedSlotsFromLedger } from './dailyQuestLedger';
import {
	assertClientWalletInvocation,
	type ClientWalletInvocation,
} from '../../data/wallet/clientWalletInvocation';
import { recordCeremonyFeedbackEvent } from '../protocol/ceremonyFeedback';
import { getRagnarokNetworkConfig } from '../config/networkConfig';
import { getActiveRuneSeasonId } from '@shared/protocol-core/runeSeasonView';
import { getRuneLedgerEntry, getTokenBalance, commitLocalDailyQuestLedger } from '../../data/blockchain/replayDB';
import { createLocalDailyQuestLedgerEntry } from '@shared/protocol-core/localDailyQuestSettlement';
import { buildRagnarokRuntimeEvidence } from '@shared/runtimeConfig';
import { getCurrentHiveUsername } from '../../data/HiveSessionIdentity';
import { isSharedProgressStage, resolveProgressAccountId } from '../auth/progressAccount';

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
	status: 'claimed' | 'already_claimed' | 'partial' | 'rejected' | 'unavailable' | 'awaiting_replay';
	claimedCount: number;
	alreadyClaimedCount: number;
	runeEarned: number;
	errors: string[];
	awaitingReplayCount?: number;
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
	flushPendingClaims: (invocation: ClientWalletInvocation | null) => Promise<void>;
}

const getActiveEconomy = () => getRuneEconomy(getRuntimeExecutionMode());

const DAILY_QUEST_RUNE_REWARD = () => getActiveEconomy().dailyQuestRunePerSlot;
const DAILY_QUEST_SLOTS_PER_DAY = () => getActiveEconomy().dailyQuestSlotsPerDay;

function rejectSharedDailyQuestWithoutAccount(): void {
	const feedback = buildClaimFeedback({
		status: 'rejected',
		claimedCount: 0,
		alreadyClaimedCount: 0,
		runeEarned: 0,
		errors: ['Hive account required to record daily quests on shared testnet.'],
	});
	useDailyQuestStore.setState({ lastClaimFeedback: feedback });
	recordCeremonyFeedbackEvent('daily_quest_claim', 'missing_account', {
		status: feedback.status,
		errors: feedback.errors,
	});
}

export function resolveDailyQuestAccount(input?: {
	readonly username?: string | null;
	readonly sharedNetwork?: boolean;
}): string | null {
	return resolveProgressAccountId({
		username: input?.username ?? getCurrentHiveUsername() ?? getNFTBridge().getUsername(),
		sharedNetwork: input?.sharedNetwork ?? isSharedProgressStage(getRagnarokNetworkConfig().stage),
	});
}

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

async function broadcastDailyQuestClaim(quest: DailyQuest): Promise<{ readonly success: boolean; readonly trxId?: string }> {
	const bridge = getNFTBridge();
	if (!bridge.isHiveMode()) return { success: false };
	try {
		const result = await bridge.claimDailyQuest(quest.slot, quest.type);
		if (!result.success) {
			debug.warn('[DailyQuest] Claim broadcast rejected:', result.error);
			return { success: false };
		}
		if (result.trxId) bridge.emitTransactionConfirmed(result.trxId);
		return { success: true, trxId: result.trxId };
	} catch (err) {
		debug.warn('[DailyQuest] Claim broadcast error:', err);
		return { success: false };
	}
}

export function awaitingReplayHistory(trxId: string): string { return `awaiting-replay:${trxId}`; }

export async function settleLocalDailyQuestClaimsToLedger(
	pending: ReadonlyArray<DailyQuest>, account: string, now = Date.now,
): Promise<{ readonly claimedIds: ReadonlyArray<string>; readonly history: Record<string, string>; readonly runeEarned: number; readonly alreadyClaimedCount: number }> {
	const seasonId = getActiveRuneSeasonId(getRagnarokNetworkConfig());
	let runeEarned = 0;
	let alreadyClaimedCount = 0;
	const claimedIds: string[] = [];
	const history: Record<string, string> = {};
	const entries = [];
	let balanceBefore = (await getTokenBalance(account, seasonId)).RUNE;
	for (const quest of pending) {
		const sourceKey = createDailyQuestRuneSourceKey(account, quest.ymdUtc, quest.slot, seasonId);
		const entryId = createRuneLedgerEntryId({ seasonId, direction: 'credit', sourceType: 'daily_quest_claim', sourceKey });
		const existing = await getRuneLedgerEntry(entryId);
		if (existing) {
			entries.push(existing);
		} else {
			const entry = createLocalDailyQuestLedgerEntry({ account, ymdUtc: quest.ymdUtc, slot: quest.slot, seasonId, stage: getRagnarokNetworkConfig().stage, balanceBefore, timestamp: now() });
			entries.push(entry);
			balanceBefore = entry.balanceAfter;
		}
		claimedIds.push(quest.id);
		history[`${quest.ymdUtc}:${quest.slot}`] = entryId;
	}
	const committed = await commitLocalDailyQuestLedger(entries);
	if (committed.conflictingIds.length > 0) {
		throw new Error(`local_daily_settlement_conflict:${committed.conflictingIds.join(',')}`);
	}
	runeEarned = entries.filter(entry => committed.appliedIds.includes(entry.entryId)).reduce((sum, entry) => sum + entry.amount, 0);
	alreadyClaimedCount = committed.alreadyAppliedIds.length;
	return { claimedIds, history, runeEarned, alreadyClaimedCount };
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

function markQuestsClaimedFromSlots(
	quests: DailyQuest[],
	claimedSlots: ReadonlySet<number>,
	ymdUtc: string,
): DailyQuest[] {
	if (claimedSlots.size === 0) return quests;
	return quests.map(quest => {
		if (quest.ymdUtc !== ymdUtc || !claimedSlots.has(quest.slot)) return quest;
		return {
			...quest,
			claimed: true,
			completed: true,
			progress: Math.max(quest.progress, quest.goal),
		};
	});
}

async function syncClaimedSlotsFromLocalLedger(ymdUtc: string): Promise<void> {
	const account = resolveDailyQuestAccount();
	if (!account) return;

	try {
		const entries = await readLocalRuneLedger({
			account,
			sourceType: 'daily_quest_claim',
		});
		const claimed = claimedSlotsFromLedger(entries, account, ymdUtc);
		if (claimed.slots.size === 0) return;
		useDailyQuestStore.setState(state => ({
			quests: markQuestsClaimedFromSlots(state.quests, claimed.slots, ymdUtc),
			claimHistory: { ...state.claimHistory, ...claimed.history },
		}));
	} catch (err) {
		debug.warn('[DailyQuest] Ledger sync failed:', err);
	}
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
					await syncClaimedSlotsFromLocalLedger(today);
					return;
				}

				const account = resolveDailyQuestAccount();
				if (!account) return;
				const economy = getActiveEconomy();
				const templates = pickRandomQuests(
					economy.dailyQuestSlotsPerDay,
					[],
					`daily:${account}:${today}`,
				);
				const quests = templates.map((t, i) => templateToQuest(t, i, today, current.clientSalt));
				set({ quests, lastRefreshDate: today, rerollsUsedToday: 0 });
				await syncClaimedSlotsFromLocalLedger(today);
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
				const localPhase = buildRagnarokRuntimeEvidence(getRagnarokNetworkConfig()).phasePolicy.localSettlement;
				if (localPhase) {
					const account = resolveDailyQuestAccount();
					if (!account) {
						rejectSharedDailyQuestWithoutAccount();
						return;
					}
					const ledger = await settleLocalDailyQuestClaimsToLedger(pending, account);
					const settled = {
						...ledger,
						feedback: buildClaimFeedback({
							status: ledger.alreadyClaimedCount === pending.length ? 'already_claimed' : 'claimed',
							claimedCount: ledger.claimedIds.length - ledger.alreadyClaimedCount,
							alreadyClaimedCount: ledger.alreadyClaimedCount,
							runeEarned: ledger.runeEarned,
							errors: [],
						}),
					};
					const claimed = new Set(settled.claimedIds);
					set((state) => ({
						quests: state.quests.map((quest) => (
							claimed.has(quest.id) ? { ...quest, claimed: true } : quest
						)),
						totalCompleted: state.totalCompleted + settled.feedback.claimedCount,
						claimHistory: { ...state.claimHistory, ...settled.history },
						lastClaimFeedback: settled.feedback,
					}));
					recordCeremonyFeedbackEvent('daily_quest_claim', 'local_recorded', {
						status: settled.feedback.status,
						claimedCount: settled.feedback.claimedCount,
						runeEarned: settled.feedback.runeEarned,
					});
					toast.info('Daily quests recorded locally.', {
						description: `${settled.feedback.runeEarned} RUNE committed locally. Duplicate claim is a no-op.`,
					});
					return;
				}

				assertClientWalletInvocation(invocation, 'daily_quest_claim', 'Posting');

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
							if (!get().claimHistory[claimKey].startsWith('awaiting-replay:')) {
								set(state => ({ quests: state.quests.map(q => q.id === quest.id ? { ...q, claimed: true } : q) }));
							}
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
						if (!ok.success) {
							errors.push(`Slot ${quest.slot + 1}: broadcast rejected.`);
							recordCeremonyFeedbackEvent('daily_quest_claim', 'broadcast_rejected', {
								ymdUtc: quest.ymdUtc,
								slot: quest.slot,
								questType: quest.type,
								rune: quest.reward.rune,
							});
							continue;
						}

						set(state => ({ claimHistory: { ...state.claimHistory, [claimKey]: awaitingReplayHistory(ok.trxId ?? 'pending') } }));
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
						: claimedCount > 0 ? 'claimed' : pending.some(quest => get().claimHistory[`${quest.ymdUtc}:${quest.slot}`]?.startsWith('awaiting-replay:')) ? 'awaiting_replay' : 'already_claimed';
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
				const account = resolveDailyQuestAccount();
				if (!account) return;
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
