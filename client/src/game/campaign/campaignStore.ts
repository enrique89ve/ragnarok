import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Difficulty } from './campaignTypes';
import { getNFTBridge } from '../nft';
import { debug } from '../config/debugConfig';
import { triggerAutoSave } from '../stores/saveStateManager';
import { createCampaignRunDraft, saveCampaignRunDraft } from './campaignResultAdapter';

interface MissionCompletion {
	difficulty: Difficulty;
	completedAt: number;
	bestTurns: number;
	bestDifficulty: Difficulty;
}

interface CampaignState {
	completedMissions: Record<string, MissionCompletion>;
	currentMission: string | null;
	currentRunId: string | null;
	currentDifficulty: Difficulty;
	seenCinematics: string[];
	// Transient per-mission runtime state — never persisted. Resets on
	// startMission/clearCurrent so a fresh mission boots clean.
	bossRulesApplied: boolean;
}

interface CampaignActions {
	startMission: (missionId: string, difficulty: Difficulty) => void;
	completeMission: (missionId: string, difficulty: Difficulty, turns: number) => void;
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
}

export const useCampaignStore = create<CampaignState & CampaignActions>()(
	persist(
		(set, get) => ({
			completedMissions: {},
			currentMission: null,
			currentRunId: null,
			currentDifficulty: 'normal',
			seenCinematics: [],
			bossRulesApplied: false,

			startMission: (missionId, difficulty) => {
				const account = getNFTBridge().getUsername();
				const run = createCampaignRunDraft({ account, missionId, difficulty });
				saveCampaignRunDraft(run)
					.catch(err => debug.warn('[campaignStore] Failed to record campaign run:', err));
				set({
					currentMission: missionId,
					currentRunId: run.localRunId,
					currentDifficulty: difficulty,
					bossRulesApplied: false,
				});
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
			}),

			markBossRulesApplied: () => set({ bossRulesApplied: true }),
			resetBossRulesApplied: () => set({ bossRulesApplied: false }),
		}),
		{
			name: 'ragnarok-campaign',
			partialize: (state) => ({
				completedMissions: state.completedMissions,
				seenCinematics: state.seenCinematics,
			}),
		}
	)
);
