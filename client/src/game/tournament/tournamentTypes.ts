export type TournamentFormat = 'swiss' | 'single_elimination' | 'double_elimination';
export type TournamentStatus = 'registration' | 'in_progress' | 'completed' | 'cancelled';
export type MatchStatus = 'pending' | 'in_progress' | 'completed';

export interface TournamentPlayer {
	username: string;
	elo: number;
	wins: number;
	losses: number;
	draws: number;
	buchholz: number;
	dropped: boolean;
}

export interface TournamentMatch {
	id: string;
	round: number;
	player1: string;
	player2: string | null;
	winner: string | null;
	status: MatchStatus;
	scheduledAt: number;
	completedAt?: number;
}

export interface TournamentRound {
	number: number;
	matches: TournamentMatch[];
	startedAt: number;
	completedAt?: number;
}

export interface Tournament {
	id: string;
	name: string;
	format: TournamentFormat;
	status: TournamentStatus;
	maxPlayers: number;
	entryFee: number;
	prizePool: number;
	rounds: TournamentRound[];
	players: TournamentPlayer[];
	currentRound: number;
	totalRounds: number;
	createdAt: number;
	startsAt: number;
	completedAt?: number;
}

export interface TournamentListItem {
	id: string;
	name: string;
	format: TournamentFormat;
	status: TournamentStatus;
	playerCount: number;
	maxPlayers: number;
	entryFee: number;
	prizePool: number;
	startsAt: number;
}
