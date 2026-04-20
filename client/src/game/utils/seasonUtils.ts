const SEASON_START = new Date('2026-03-01T00:00:00Z').getTime();
const SEASON_DURATION_MS = 90 * 24 * 60 * 60 * 1000;

const SEASON_NAMES = [
	'Season of the Wolf',
	'Season of the Serpent',
	'Season of the Raven',
	'Season of the Eagle',
];

export interface SeasonInfo {
	seasonNumber: number;
	seasonName: string;
	startDate: number;
	endDate: number;
	timeRemainingMs: number;
	isActive: boolean;
}

export function getCurrentSeasonNumber(now: number = Date.now()): number {
	if (now < SEASON_START) return 0;
	return Math.floor((now - SEASON_START) / SEASON_DURATION_MS) + 1;
}

export function getSeasonInfo(now: number = Date.now()): SeasonInfo {
	const seasonNumber = getCurrentSeasonNumber(now);
	if (seasonNumber === 0) {
		return {
			seasonNumber: 0,
			seasonName: 'Pre-Season',
			startDate: 0,
			endDate: SEASON_START,
			timeRemainingMs: Math.max(0, SEASON_START - now),
			isActive: false,
		};
	}
	const nameIndex = (seasonNumber - 1) % SEASON_NAMES.length;
	const startDate = SEASON_START + (seasonNumber - 1) * SEASON_DURATION_MS;
	const endDate = startDate + SEASON_DURATION_MS;
	return {
		seasonNumber,
		seasonName: SEASON_NAMES[nameIndex],
		startDate,
		endDate,
		timeRemainingMs: Math.max(0, endDate - now),
		isActive: now >= startDate && now < endDate,
	};
}

export function calculateSoftReset(currentElo: number): number {
	return Math.round(1000 + (currentElo - 1000) * 0.5);
}

export function formatTimeRemaining(ms: number): string {
	const days = Math.floor(ms / (24 * 60 * 60 * 1000));
	const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
	if (days > 0) return `${days}d ${hours}h`;
	const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
	return `${hours}h ${minutes}m`;
}
