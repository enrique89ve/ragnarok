import type { CampaignMission } from './campaignTypes';

export interface Realm {
	id: string;
	name: string;
	description: string;
	runeSymbol: string;
	environmentEffect: string;
	environmentDescription: string;
	position: { x: number; y: number };
	connections: string[];
	color: string;
	glowColor: string;
}

export const NINE_REALMS: Realm[] = [
	{
		id: 'ginnungagap',
		name: 'Ginnungagap',
		description: 'The primordial void where ice and fire first collided, birthing Ymir and the cosmos itself.',
		runeSymbol: '\u16C7',
		environmentEffect: 'Primordial Chaos',
		environmentDescription: 'Creation and destruction intertwine',
		position: { x: 50, y: 0 },
		connections: ['niflheim', 'muspelheim'],
		color: '#4b5563',
		glowColor: 'rgba(75, 85, 99, 0.6)',
	},
	{
		id: 'asgard',
		name: 'Asgard',
		description: 'Home of the Aesir gods, connected to Midgard by the Rainbow Bridge Bifrost.',
		runeSymbol: '\u16A0',
		environmentEffect: 'Divine Power',
		environmentDescription: 'The gods grant strength',
		position: { x: 50, y: 8 },
		connections: ['midgard', 'vanaheim', 'alfheim'],
		color: '#fbbf24',
		glowColor: 'rgba(251, 191, 36, 0.6)',
	},
	{
		id: 'vanaheim',
		name: 'Vanaheim',
		description: 'Verdant realm of the Vanir, gods of nature, fertility, and foresight.',
		runeSymbol: '\u16B7',
		environmentEffect: "Nature's Grace",
		environmentDescription: 'Life flourishes',
		position: { x: 20, y: 22 },
		connections: ['asgard', 'midgard', 'alfheim'],
		color: '#22c55e',
		glowColor: 'rgba(34, 197, 94, 0.6)',
	},
	{
		id: 'alfheim',
		name: 'Alfheim',
		description: 'Realm of the Light Elves, where magic flows as naturally as breath.',
		runeSymbol: '\u16D2',
		environmentEffect: 'Elven Arcana',
		environmentDescription: 'Magic flows freely',
		position: { x: 80, y: 22 },
		connections: ['asgard', 'midgard', 'vanaheim'],
		color: '#a78bfa',
		glowColor: 'rgba(167, 139, 250, 0.6)',
	},
	{
		id: 'jotunheim',
		name: 'Jotunheim',
		description: 'Land of the Frost Giants, where mountains touch the sky and ice never melts.',
		runeSymbol: '\u16C1',
		environmentEffect: "Giant's Fury",
		environmentDescription: 'Brute force reigns',
		position: { x: 15, y: 48 },
		connections: ['midgard', 'niflheim', 'muspelheim'],
		color: '#38bdf8',
		glowColor: 'rgba(56, 189, 248, 0.6)',
	},
	{
		id: 'midgard',
		name: 'Midgard',
		description: 'The world of mortals, center of the Nine Realms, encircled by Jormungandr.',
		runeSymbol: '\u16D7',
		environmentEffect: 'Mortal Resolve',
		environmentDescription: 'Balanced ground',
		position: { x: 50, y: 45 },
		connections: ['asgard', 'jotunheim', 'vanaheim', 'alfheim', 'svartalfheim', 'muspelheim'],
		color: '#e5e7eb',
		glowColor: 'rgba(229, 231, 235, 0.5)',
	},
	{
		id: 'muspelheim',
		name: 'Muspelheim',
		description: 'Realm of fire and chaos, ruled by the fire giant Surtr who will burn the world at Ragnarok.',
		runeSymbol: '\u16DE',
		environmentEffect: 'Eternal Flame',
		environmentDescription: 'Fire consumes',
		position: { x: 85, y: 48 },
		connections: ['midgard', 'jotunheim', 'helheim'],
		color: '#ef4444',
		glowColor: 'rgba(239, 68, 68, 0.6)',
	},
	{
		id: 'svartalfheim',
		name: 'Svartalfheim',
		description: 'Underground realm of the Dwarves, master smiths who forged Mjolnir and Gungnir.',
		runeSymbol: '\u16C7',
		environmentEffect: 'Dwarven Craft',
		environmentDescription: 'Forged in darkness',
		position: { x: 50, y: 72 },
		connections: ['midgard', 'niflheim', 'helheim'],
		color: '#d97706',
		glowColor: 'rgba(217, 119, 6, 0.6)',
	},
	{
		id: 'niflheim',
		name: 'Niflheim',
		description: 'Realm of primordial ice, mist, and cold. The dead who die without glory wander here.',
		runeSymbol: '\u16C1',
		environmentEffect: 'Frozen Wastes',
		environmentDescription: 'Ice slows all',
		position: { x: 22, y: 85 },
		connections: ['jotunheim', 'svartalfheim', 'helheim'],
		color: '#67e8f9',
		glowColor: 'rgba(103, 232, 249, 0.5)',
	},
	{
		id: 'helheim',
		name: 'Helheim',
		description: "Domain of Hel, daughter of Loki. The dishonored dead serve her for eternity.",
		runeSymbol: '\u16BA',
		environmentEffect: "Death's Embrace",
		environmentDescription: 'The fallen persist',
		position: { x: 78, y: 85 },
		connections: ['svartalfheim', 'niflheim', 'muspelheim'],
		color: '#a855f7',
		glowColor: 'rgba(168, 85, 247, 0.6)',
	},
];

export const REALM_MAP = new Map(NINE_REALMS.map(r => [r.id, r]));

export const MISSION_REALM_MAP: Record<string, string> = {
	'norse-1': 'ginnungagap',
	'norse-2': 'ginnungagap',
	'norse-3': 'midgard',
	'norse-4': 'midgard',
	'norse-5': 'asgard',
	'norse-6': 'alfheim',
	'norse-7': 'vanaheim',
	'norse-8': 'jotunheim',
	'norse-9': 'midgard',
};

export function getMissionsForRealm(realmId: string, missions: CampaignMission[]): CampaignMission[] {
	return missions.filter(m => MISSION_REALM_MAP[m.id] === realmId);
}

export function getRealmProgress(
	realmId: string,
	missions: CampaignMission[],
	completedMissions: Record<string, unknown>,
): { completed: number; total: number } {
	const realmMissions = getMissionsForRealm(realmId, missions);
	const completed = realmMissions.filter(m => !!completedMissions[m.id]).length;
	return { completed, total: realmMissions.length };
}
