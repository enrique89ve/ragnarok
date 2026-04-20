import type { CampaignMission } from './campaignTypes';

export interface GreekRealm {
	id: string;
	name: string;
	description: string;
	symbol: string;
	environmentEffect: string;
	environmentDescription: string;
	position: { x: number; y: number };
	connections: string[];
	color: string;
	glowColor: string;
}

export const GREEK_REALMS: GreekRealm[] = [
	{
		id: 'olympus',
		name: 'Mount Olympus',
		description: 'Throne of the gods, wreathed in clouds and lightning. Zeus rules all from its peak.',
		symbol: '\u26A1',
		environmentEffect: 'Divine Lightning',
		environmentDescription: 'Thunder echoes above',
		position: { x: 50, y: 8 },
		connections: ['athens', 'delphi'],
		color: '#fbbf24',
		glowColor: 'rgba(251, 191, 36, 0.6)',
	},
	{
		id: 'athens',
		name: 'Athens',
		description: 'City of wisdom and strategy, blessed by Athena. Knowledge is the sharpest weapon.',
		symbol: '\u039B',
		environmentEffect: "Athena's Wisdom",
		environmentDescription: 'Strategy prevails',
		position: { x: 25, y: 25 },
		connections: ['olympus', 'sparta', 'aegean'],
		color: '#93c5fd',
		glowColor: 'rgba(147, 197, 253, 0.6)',
	},
	{
		id: 'delphi',
		name: 'Delphi',
		description: 'Seat of the Oracle, where Apollo speaks through prophecy. The future is revealed to the worthy.',
		symbol: '\u2609',
		environmentEffect: "Apollo's Sight",
		environmentDescription: 'Foresight is granted',
		position: { x: 75, y: 25 },
		connections: ['olympus', 'labyrinth', 'aegean'],
		color: '#a78bfa',
		glowColor: 'rgba(167, 139, 250, 0.6)',
	},
	{
		id: 'sparta',
		name: 'Sparta',
		description: 'The war-forged city where only the strongest survive. Ares walks its blood-soaked fields.',
		symbol: '\u2694',
		environmentEffect: "Ares' Fury",
		environmentDescription: 'Strength rules',
		position: { x: 20, y: 48 },
		connections: ['athens', 'aegean', 'underworld'],
		color: '#ef4444',
		glowColor: 'rgba(239, 68, 68, 0.6)',
	},
	{
		id: 'aegean',
		name: 'Aegean Sea',
		description: 'Poseidon\'s domain, where storms and sea monsters guard the deep. Ships break on his whims.',
		symbol: '\u2248',
		environmentEffect: "Poseidon's Tides",
		environmentDescription: 'Currents shift',
		position: { x: 50, y: 48 },
		connections: ['athens', 'delphi', 'sparta', 'labyrinth', 'underworld', 'elysium'],
		color: '#22d3ee',
		glowColor: 'rgba(34, 211, 238, 0.6)',
	},
	{
		id: 'labyrinth',
		name: 'The Labyrinth',
		description: 'Daedalus\' masterwork on Crete. The Minotaur stalks its corridors. Enter, and you may never leave.',
		symbol: '\u2318',
		environmentEffect: 'Maze of Madness',
		environmentDescription: 'Paths deceive',
		position: { x: 80, y: 48 },
		connections: ['delphi', 'aegean', 'elysium'],
		color: '#d97706',
		glowColor: 'rgba(217, 119, 6, 0.6)',
	},
	{
		id: 'underworld',
		name: 'The Underworld',
		description: 'Hades\' realm beneath the earth. The dead gather here, guarded by Cerberus at the gate.',
		symbol: '\u263D',
		environmentEffect: "Hades' Shadow",
		environmentDescription: 'Death lingers',
		position: { x: 35, y: 78 },
		connections: ['sparta', 'aegean', 'elysium'],
		color: '#7c3aed',
		glowColor: 'rgba(124, 58, 237, 0.6)',
	},
	{
		id: 'elysium',
		name: 'Elysium',
		description: 'The blessed fields where heroes rest eternal. Only the greatest warriors earn passage.',
		symbol: '\u2726',
		environmentEffect: 'Heroic Light',
		environmentDescription: 'Glory endures',
		position: { x: 65, y: 78 },
		connections: ['aegean', 'labyrinth', 'underworld'],
		color: '#4ade80',
		glowColor: 'rgba(74, 222, 128, 0.6)',
	},
];

export const GREEK_REALM_MAP = new Map(GREEK_REALMS.map(r => [r.id, r]));

export const GREEK_MISSION_REALM_MAP: Record<string, string> = {
	'greek-1': 'underworld',
	'greek-2': 'labyrinth',
	'greek-3': 'athens',
	'greek-4': 'aegean',
	'greek-5': 'sparta',
	'greek-6': 'aegean',
	'greek-7': 'underworld',
	'greek-8': 'athens',
	'greek-9': 'delphi',
	'greek-10': 'olympus',
};

export function getGreekMissionsForRealm(realmId: string, missions: CampaignMission[]): CampaignMission[] {
	return missions.filter(m => GREEK_MISSION_REALM_MAP[m.id] === realmId);
}

export function getGreekRealmProgress(
	realmId: string,
	missions: CampaignMission[],
	completedMissions: Record<string, unknown>,
): { completed: number; total: number } {
	const realmMissions = getGreekMissionsForRealm(realmId, missions);
	const completed = realmMissions.filter(m => !!completedMissions[m.id]).length;
	return { completed, total: realmMissions.length };
}
