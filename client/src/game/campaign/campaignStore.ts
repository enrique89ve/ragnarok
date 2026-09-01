import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Difficulty } from './campaignTypes';
import { accountScopedStorage, registerAccountScopedStore } from '../../lib/storage/accountScopedStorage';
import { getNFTBridge } from '../nft';
import { debug } from '../config/debugConfig';
import { triggerAutoSave } from '../stores/saveStateManager';
import { createCampaignRunDraft, saveCampaignRunDraft } from './campaignResultAdapter';
import {
	abandonStartedCampaignRuns,
	getLocalCampaignSettlementsByAccount,
	type LocalCampaignSettlementRecord,
} from '../../data/blockchain/replayDB';
import { commitProgressAccountId } from '../auth/progressAccount';
import { getRagnarokNetworkConfig } from '../config/networkConfig';
import { buildRagnarokRuntimeEvidence } from '@shared/runtimeConfig';
import { CAMPAIGN_ID } from '@shared/campaign/constants';
import {
	createCampaignRewardFeedback,
	type CampaignRewardFeedback,
	type CampaignRewardFeedbackInput,
} from './campaignRewardFeedback';

interface MissionCompletion {
	difficulty: Difficulty;
	completedAt: number;
	bestTurns: number;
	bestDifficulty: Difficulty;
}

type CampaignProgressStatus = 'idle' | 'loading' | 'ready' | 'error';

const DIFFICULTY_ORDER: Record<Difficulty, number> = { normal: 0, heroic: 1, mythic: 2 };

function deriveCampaignCompletions(
	records: readonly LocalCampaignSettlementRecord[],
): Record<string, MissionCompletion> {
	const completions: Record<string, MissionCompletion> = {};

	for (const record of records) {
		if (record.campaignId !== CAMPAIGN_ID) continue;
		const existing = completions[record.missionId];
		const latestDifficulty = !existing || record.timestamp >= existing.completedAt
			? record.difficulty
			: existing.difficulty;
		const existingBestDifficulty = existing?.bestDifficulty ?? existing?.difficulty ?? 'normal';
		completions[record.missionId] = {
			difficulty: latestDifficulty,
			completedAt: Math.max(existing?.completedAt ?? 0, record.timestamp),
			bestTurns: Math.min(existing?.bestTurns ?? Number.POSITIVE_INFINITY, record.turnCount),
			bestDifficulty: DIFFICULTY_ORDER[record.difficulty] > DIFFICULTY_ORDER[existingBestDifficulty]
				? record.difficulty
				: existingBestDifficulty,
		};
	}

	return completions;
}

let progressHydrationRequest = 0;

interface CampaignState {
	completedMissions: Record<string, MissionCompletion>;
	campaignProgressStatus: CampaignProgressStatus;
	campaignProgressError: string | null;
	currentMission: string | null;
	currentRunId: string | null;
	currentDifficulty: Difficulty;
	seenCinematics: string[];
	// Transient per-mission runtime state — never persisted. Resets on
	// startMission/clearCurrent so a fresh mission boots clean.
	bossRulesApplied: boolean;
	// Transient result feedback for the last campaign ceremony. Excluded
	// from persistence because replay/chain projection remains authoritative.
	lastRewardFeedback: CampaignRewardFeedback | null;
}

interface CampaignActions {
	startMission: (missionId: string, difficulty: Difficulty) => Promise<void>;
	completeMission: (missionId: string, difficulty: Difficulty, turns: number) => void;
	hydrateLocalProgress: (account: string | null) => Promise<void>;
	isMissionCompleted: (missionId: string) => boolean;
	isMissionUnlocked: (missionId: string, prerequisites: string[]) => boolean;
	getChapterProgress: (chapterId: string, missionIds: string[]) => number;
	isAllBaseChaptersComplete: (chapterMissionIds: Record<string, string[]>) => boolean;
	markCinematicSeen: (chapterId: string) => void;
	hasCinematicBeenSeen: (chapterId: string) => boolean;
	clearCurrent: () => void;
	reset: () => void;
	markBossRulesApplied: () => void;
	resetBossRulesApplied: () => void;
	recordRewardFeedback: (input: CampaignRewardFeedbackInput) => void;
}

export const useCampaignStore = create<CampaignState & CampaignActions>()(
	persist(
		(set, get) => ({
			completedMissions: {},
			campaignProgressStatus: 'idle',
			campaignProgressError: null,
			currentMission: null,
			currentRunId: null,
			currentDifficulty: 'normal',
			seenCinematics: [],
			bossRulesApplied: false,
			lastRewardFeedback: null,

			startMission: async (missionId, difficulty) => {
				const account = getNFTBridge().getUsername();
				const run = createCampaignRunDraft({ account, missionId, difficulty });
				if (run) {
					await saveCampaignRunDraft(run);
				}
				set({
					currentMission: missionId,
					currentRunId: run?.localRunId ?? null,
					currentDifficulty: difficulty,
					bossRulesApplied: false,
					lastRewardFeedback: null,
				});
			},

			hydrateLocalProgress: async (account) => {
				const requestId = ++progressHydrationRequest;
				set({ campaignProgressStatus: 'loading', campaignProgressError: null });
				const runtimeConfig = getRagnarokNetworkConfig();
				const runtimeEvidence = buildRagnarokRuntimeEvidence(runtimeConfig);
				if (!runtimeEvidence.phasePolicy.localSettlement) {
					if (requestId === progressHydrationRequest) {
						set({ campaignProgressStatus: 'ready', campaignProgressError: null });
					}
					return;
				}

				const progressAccount = commitProgressAccountId(account, runtimeConfig.stage);
				if (!progressAccount) {
					if (requestId === progressHydrationRequest) {
						set({
							campaignProgressStatus: 'error',
							campaignProgressError: 'A local campaign account could not be resolved.',
						});
					}
					return;
				}

				try {
					await abandonStartedCampaignRuns(progressAccount);
					const settlements = await getLocalCampaignSettlementsByAccount(progressAccount);
					if (requestId !== progressHydrationRequest) return;
					set({
						completedMissions: deriveCampaignCompletions(settlements),
						campaignProgressStatus: 'ready',
						campaignProgressError: null,
					});
				} catch (error) {
					debug.warn('[campaignStore] Failed to hydrate local campaign progress:', error);
					if (requestId === progressHydrationRequest) {
						set({
							campaignProgressStatus: 'error',
							campaignProgressError: 'Local campaign progress could not be loaded.',
						});
					}
				}
			},

			completeMission: (missionId, difficulty, turns) => {
				const existing = get().completedMissions[missionId];
				const better = !existing || turns < existing.bestTurns;
				const diffOrder: Record<Difficulty, number> = { normal: 0, heroic: 1, mythic: 2 };
				const existingDiff = existing?.bestDifficulty ?? existing?.difficulty ?? 'normal';
				const bestDiff = diffOrder[difficulty] > diffOrder[existingDiff] ? difficulty : existingDiff;
				set(state => ({
					completedMissions: {
						...state.completedMissions,
						[missionId]: {
							difficulty,
							completedAt: Date.now(),
							bestTurns: better ? turns : (existing?.bestTurns ?? turns),
							bestDifficulty: bestDiff,
						},
					},
					currentMission: null,
					currentRunId: null,
				}));
				triggerAutoSave();
			},

			isMissionCompleted: (missionId) => {
				return !!get().completedMissions[missionId];
			},

			isMissionUnlocked: (_missionId, prerequisites) => {
				if (prerequisites.length === 0) return true;
				const completed = get().completedMissions;
				return prerequisites.every(id => !!completed[id]);
			},

			getChapterProgress: (_chapterId, missionIds) => {
				const completed = get().completedMissions;
				return missionIds.filter(id => !!completed[id]).length;
			},

			isAllBaseChaptersComplete: (chapterMissionIds) => {
				const completed = get().completedMissions;
				return Object.values(chapterMissionIds).every(
					ids => ids.every(id => !!completed[id])
				);
			},

			markCinematicSeen: (chapterId) => {
				if (get().seenCinematics.includes(chapterId)) return;
				set(state => ({ seenCinematics: [...state.seenCinematics, chapterId] }));
			},

			hasCinematicBeenSeen: (chapterId) => {
				return get().seenCinematics.includes(chapterId);
			},

			clearCurrent: () => set({
				currentMission: null,
				currentRunId: null,
				bossRulesApplied: false,
			}),

			reset: () => set({
				completedMissions: {},
				currentMission: null,
				currentRunId: null,
				currentDifficulty: 'normal',
				seenCinematics: [],
				bossRulesApplied: false,
				lastRewardFeedback: null,
			}),

			markBossRulesApplied: () => set({ bossRulesApplied: true }),
			resetBossRulesApplied: () => set({ bossRulesApplied: false }),
			recordRewardFeedback: (input) => set({
				lastRewardFeedback: createCampaignRewardFeedback(input),
			}),
		}),
		{
			name: 'ragnarok-campaign',
			storage: createJSONStorage(() => accountScopedStorage),
			partialize: (state) => ({
				completedMissions: buildRagnarokRuntimeEvidence(getRagnarokNetworkConfig()).phasePolicy.localSettlement
					? {}
					: state.completedMissions,
				seenCinematics: state.seenCinematics,
			}),
		}
	)
);

registerAccountScopedStore(useCampaignStore);
