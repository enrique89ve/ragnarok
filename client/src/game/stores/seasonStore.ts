import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getCurrentSeasonNumber, calculateSoftReset } from '../utils/seasonUtils';

interface SeasonState {
	lastResetSeason: number;
	seasonElo: number;
	seasonWins: number;
	seasonLosses: number;
	peakSeasonElo: number;
}

interface SeasonActions {
	checkAndApplyReset: (allTimeElo: number) => number;
	recordSeasonMatch: (isWin: boolean, newElo: number) => void;
}

export const useSeasonStore = create<SeasonState & SeasonActions>()(
	persist(
		(set, get) => ({
			lastResetSeason: 0,
			seasonElo: 1000,
			seasonWins: 0,
			seasonLosses: 0,
			peakSeasonElo: 1000,

			checkAndApplyReset: (allTimeElo: number) => {
				const currentSeason = getCurrentSeasonNumber();
				const state = get();

				if (currentSeason === 0) return allTimeElo;

				if (state.lastResetSeason < currentSeason) {
					const resetElo = state.lastResetSeason === 0
						? allTimeElo
						: calculateSoftReset(state.seasonElo);

					set({
						lastResetSeason: currentSeason,
						seasonElo: resetElo,
						seasonWins: 0,
						seasonLosses: 0,
						peakSeasonElo: resetElo,
					});
					return resetElo;
				}

				return state.seasonElo;
			},

			recordSeasonMatch: (isWin, newElo) => {
				set(state => ({
					seasonElo: newElo,
					seasonWins: state.seasonWins + (isWin ? 1 : 0),
					seasonLosses: state.seasonLosses + (isWin ? 0 : 1),
					peakSeasonElo: Math.max(state.peakSeasonElo, newElo),
				}));
			},
		}),
		{
			name: 'ragnarok-season',
			partialize: (state) => ({
				lastResetSeason: state.lastResetSeason,
				seasonElo: state.seasonElo,
				seasonWins: state.seasonWins,
				seasonLosses: state.seasonLosses,
				peakSeasonElo: state.peakSeasonElo,
			}),
		}
	)
);
