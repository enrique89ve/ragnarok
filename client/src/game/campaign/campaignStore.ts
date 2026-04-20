import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Difficulty } from './campaignTypes';
import { getNFTBridge } from '../nft';
import { debug } from '../config/debugConfig';
import { triggerAutoSave } from '../stores/saveStateManager';

interface MissionCompletion {
	difficulty: Difficulty;
	completedAt: number;
	bestTurns: number;
	bestDifficulty: Difficulty;
}

interface CampaignState {
	completedMissions: Record<string, MissionCompletion>;
	currentMission: string | null;
	currentDifficulty: Difficulty;
	rewardsClaimed: string[];
	seenCinematics: string[];
}

interface CampaignActions {
	startMission: (missionId: string, difficulty: Difficulty) => void;
	completeMission: (missionId: string, difficulty: Difficulty, turns: number) => void;
	claimReward: (missionId: string) => void;
	isMissionCompleted: (missionId: string) => boolean;
	isMissionUnlocked: (missionId: string, prerequisites: string[]) => boolean;
	getChapterProgress: (chapterId: string, missionIds: string[]) => number;
	isAllBaseChaptersComplete: (chapterMissionIds: Record<string, string[]>) => boolean;
	markCinematicSeen: (chapterId: string) => void;
	hasCinematicBeenSeen: (chapterId: string) => boolean;
	clearCurrent: () => void;
	reset: () => void;
}

export const useCampaignStore = create<CampaignState & CampaignActions>()(
	persist(
		(set, get) => ({
			completedMissions: {},
			currentMission: null,
			currentDifficulty: 'normal',
			rewardsClaimed: [],
			seenCinematics: [],

			startMission: (missionId, difficulty) => {
				set({ currentMission: missionId, currentDifficulty: difficulty });
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
				}));
				triggerAutoSave();
			},

			claimReward: (missionId) => {
				if (get().rewardsClaimed.includes(missionId)) return;
				set(state => ({
					rewardsClaimed: [...state.rewardsClaimed, missionId],
				}));
				if (getNFTBridge().isHiveMode()) {
					getNFTBridge().claimReward(`campaign:${missionId}`)
					.then(r => { if (r.success && r.trxId) getNFTBridge().emitTransactionConfirmed(r.trxId); })
					.catch(err => debug.warn('[campaignStore] Reward claim failed:', err));
				}
			},

			isMissionCompleted: (missionId) => {
				return !!get().completedMissions[missionId];
			},

			isMissionUnlocked: (missionId, prerequisites) => {
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

			clearCurrent: () => set({ currentMission: null }),

			reset: () => set({
				completedMissions: {},
				currentMission: null,
				currentDifficulty: 'normal',
				rewardsClaimed: [],
				seenCinematics: [],
			}),
		}),
		{
			name: 'ragnarok-campaign',
			partialize: (state) => ({
				completedMissions: state.completedMissions,
				rewardsClaimed: state.rewardsClaimed,
				seenCinematics: state.seenCinematics,
			}),
		}
	)
);
