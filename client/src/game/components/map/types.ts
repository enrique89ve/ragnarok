import type { NineRealm } from '../../types/NorseTypes';

export type MapRealmId = NineRealm;
export type MapCardSectionId = 'characters' | 'spells' | 'arms' | 'pets';

export interface MapPoint {
	x: number;
	y: number;
}

export interface RealmShiftSummary {
	cardName: string;
	cardClass: string;
	cost: number;
	effect: string;
}

export interface MapCardReference {
	id: string;
	name: string;
	typeLabel: string;
	sourceLabel: string;
	costLabel: string;
	rarityLabel: string;
	description: string;
	statLine?: string;
}

export interface MapCardSection {
	id: MapCardSectionId;
	title: string;
	count: number;
	cards: readonly MapCardReference[];
}

export interface MapRealmLegend {
	id: MapRealmId;
	name: string;
	description: string;
	runeSymbol: string;
	environmentEffect: string;
	environmentDescription: string;
	campaignArc: string;
	connections: readonly MapRealmId[];
	color: string;
	glow: string;
	realmShift: RealmShiftSummary;
}
