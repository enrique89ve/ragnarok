import { create } from 'zustand';
import { getNFTBridge } from '../nft';
import type { Tournament, TournamentListItem } from './tournamentTypes';

interface TournamentState {
	tournaments: TournamentListItem[];
	activeTournament: Tournament | null;
	loading: boolean;
	error: string | null;
}

interface TournamentActions {
	fetchTournaments: () => Promise<void>;
	fetchTournament: (id: string) => Promise<void>;
	register: (tournamentId: string, username: string) => Promise<boolean>;
	reportResult: (tournamentId: string, matchId: string, winner: string) => Promise<boolean>;
	drop: (tournamentId: string, username: string) => Promise<boolean>;
}

export const useTournamentStore = create<TournamentState & TournamentActions>()((set) => ({
	tournaments: [],
	activeTournament: null,
	loading: false,
	error: null,

	fetchTournaments: async () => {
		set({ loading: true, error: null });
		try {
			const res = await fetch('/api/tournaments');
			if (res.ok) {
				const data = await res.json();
				set({ tournaments: data.tournaments || [], loading: false });
			} else {
				set({ error: 'Failed to load tournaments', loading: false });
			}
		} catch {
			set({ error: 'Network error', loading: false });
		}
	},

	fetchTournament: async (id) => {
		set({ loading: true, error: null });
		try {
			const res = await fetch(`/api/tournaments/${id}`);
			if (res.ok) {
				const data = await res.json();
				set({ activeTournament: data.tournament, loading: false });
			} else {
				set({ error: 'Tournament not found', loading: false });
			}
		} catch {
			set({ error: 'Network error', loading: false });
		}
	},

	register: async (tournamentId, username) => {
		try {
			const body = getNFTBridge().isHiveMode()
				? await getNFTBridge().buildAuthBody(username, 'tournament-register', { username })
				: { username };
			const res = await fetch(`/api/tournaments/${tournamentId}/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			if (res.ok) {
				const data = await res.json();
				set({ activeTournament: data.tournament });
				return true;
			}
			return false;
		} catch {
			return false;
		}
	},

	reportResult: async (tournamentId, matchId, winner) => {
		try {
			const body = getNFTBridge().isHiveMode()
				? await getNFTBridge().buildAuthBody(winner, 'tournament-result', { matchId, winner })
				: { matchId, winner };
			const res = await fetch(`/api/tournaments/${tournamentId}/result`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			if (res.ok) {
				const data = await res.json();
				set({ activeTournament: data.tournament });
				return true;
			}
			return false;
		} catch {
			return false;
		}
	},

	drop: async (tournamentId, username) => {
		try {
			const body = getNFTBridge().isHiveMode()
				? await getNFTBridge().buildAuthBody(username, 'tournament-drop', { username })
				: { username };
			const res = await fetch(`/api/tournaments/${tournamentId}/drop`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			if (res.ok) {
				const data = await res.json();
				set({ activeTournament: data.tournament });
				return true;
			}
			return false;
		} catch {
			return false;
		}
	},
}));
