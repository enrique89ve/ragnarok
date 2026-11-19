/**
 * cardSymbolAttackContract.ts
 *
 * Canonical Card-Symbol -> Attack Choreography Contract.
 *
 * Maps every card's visible gameplay symbols (`NorseElement`, `keywords`, `race`)
 * to a distinct, modern PixiJS v8 2D choreography so different units and magic
 * families feel unmistakably unique on the board while remaining 100% faithful
 * to gameplay truth (never altering targets or faking damage).
 */

import type { NorseElement } from '../../types/NorseTypes';
import type { ParticleColor } from '../../animations/PixiParticleCanvas';
import type { ImpactLevel } from '@/game/effects/presentation/types';

export type AttackTravelStyle = 'ribbon' | 'tunnel';

export type AttackImpactSignature =
	| 'chromatic-slash'
	| 'glacial-shatter'
	| 'lightning-burst'
	| 'shadow-vortex'
	| 'celestial-flare'
	| 'tidal-wave'
	| 'nature-strike'
	| 'poison-vortex';

export interface SymbolAttackChoreography {
	readonly element: NorseElement;
	readonly palette: ParticleColor;
	readonly travelStyle: AttackTravelStyle;
	readonly ribbonStrands: 1 | 2 | 3;
	readonly ribbonArcFactor: number;
	readonly tunnelRings: number;
	readonly travelSpeedMultiplier: number;
	readonly impactSignature: AttackImpactSignature;
	readonly slashScale: number;
	readonly shardCount: number;
	readonly spawnEmbers: boolean;
	readonly spawnStarburst: boolean;
	readonly spawnVortex: boolean;
	/** Optional secondary return ribbon (e.g. Lifesteal draining back to caster hero). */
	readonly returnRibbonPalette?: ParticleColor;
}

const SYMBOL_BASE_CHOREOGRAPHY: Record<NorseElement, SymbolAttackChoreography> = {
	fire: {
		element: 'fire',
		palette: { primary: '#ff5500', secondary: '#ffd700', glow: 'rgba(255,85,0,0.62)' },
		travelStyle: 'ribbon',
		ribbonStrands: 3,
		ribbonArcFactor: 0.2,
		tunnelRings: 7,
		travelSpeedMultiplier: 1.0,
		impactSignature: 'chromatic-slash',
		slashScale: 1.15,
		shardCount: 8,
		spawnEmbers: true,
		spawnStarburst: true,
		spawnVortex: false,
	},
	ice: {
		element: 'ice',
		palette: { primary: '#38bdf8', secondary: '#e0f2fe', glow: 'rgba(56,189,248,0.62)' },
		travelStyle: 'tunnel',
		ribbonStrands: 2,
		ribbonArcFactor: 0.08,
		tunnelRings: 7,
		travelSpeedMultiplier: 0.96,
		impactSignature: 'glacial-shatter',
		slashScale: 1.0,
		shardCount: 12,
		spawnEmbers: false,
		spawnStarburst: true,
		spawnVortex: false,
	},
	electric: {
		element: 'electric',
		palette: { primary: '#facc15', secondary: '#ffffff', glow: 'rgba(250,204,21,0.65)' },
		travelStyle: 'tunnel',
		ribbonStrands: 3,
		ribbonArcFactor: 0.05,
		tunnelRings: 9,
		travelSpeedMultiplier: 0.82,
		impactSignature: 'lightning-burst',
		slashScale: 1.2,
		shardCount: 10,
		spawnEmbers: false,
		spawnStarburst: true,
		spawnVortex: false,
	},
	dark: {
		element: 'dark',
		palette: { primary: '#8b5cf6', secondary: '#00f0d8', glow: 'rgba(139,92,246,0.62)' },
		travelStyle: 'tunnel',
		ribbonStrands: 2,
		ribbonArcFactor: 0.14,
		tunnelRings: 8,
		travelSpeedMultiplier: 1.0,
		impactSignature: 'shadow-vortex',
		slashScale: 1.05,
		shardCount: 10,
		spawnEmbers: false,
		spawnStarburst: false,
		spawnVortex: true,
	},
	light: {
		element: 'light',
		palette: { primary: '#ffe27a', secondary: '#ffffff', glow: 'rgba(255,226,122,0.65)' },
		travelStyle: 'tunnel',
		ribbonStrands: 3,
		ribbonArcFactor: 0.1,
		tunnelRings: 8,
		travelSpeedMultiplier: 0.94,
		impactSignature: 'celestial-flare',
		slashScale: 1.15,
		shardCount: 10,
		spawnEmbers: true,
		spawnStarburst: true,
		spawnVortex: false,
	},
	water: {
		element: 'water',
		palette: { primary: '#0ea5e9', secondary: '#bae6fd', glow: 'rgba(14,165,233,0.6)' },
		travelStyle: 'ribbon',
		ribbonStrands: 3,
		ribbonArcFactor: 0.22,
		tunnelRings: 7,
		travelSpeedMultiplier: 1.0,
		impactSignature: 'tidal-wave',
		slashScale: 1.05,
		shardCount: 9,
		spawnEmbers: false,
		spawnStarburst: false,
		spawnVortex: false,
	},
	grass: {
		element: 'grass',
		palette: { primary: '#22c55e', secondary: '#bbf7d0', glow: 'rgba(34,197,94,0.6)' },
		travelStyle: 'ribbon',
		ribbonStrands: 2,
		ribbonArcFactor: 0.18,
		tunnelRings: 7,
		travelSpeedMultiplier: 0.98,
		impactSignature: 'nature-strike',
		slashScale: 1.05,
		shardCount: 8,
		spawnEmbers: true,
		spawnStarburst: false,
		spawnVortex: false,
	},
	neutral: {
		element: 'neutral',
		palette: { primary: '#fbbf24', secondary: '#e2e8f0', glow: 'rgba(251,191,36,0.55)' },
		travelStyle: 'ribbon',
		ribbonStrands: 2,
		ribbonArcFactor: 0.14,
		tunnelRings: 7,
		travelSpeedMultiplier: 1.0,
		impactSignature: 'chromatic-slash',
		slashScale: 0.96,
		shardCount: 6,
		spawnEmbers: false,
		spawnStarburst: false,
		spawnVortex: false,
	},
};

export function normalizeNorseElement(raw?: string): NorseElement {
	if (!raw) return 'neutral';
	const key = raw.toLowerCase().trim();
	switch (key) {
		case 'fire':
			return 'fire';
		case 'ice':
		case 'frost':
			return 'ice';
		case 'electric':
		case 'lightning':
		case 'wind':
			return 'electric';
		case 'dark':
		case 'shadow':
		case 'void':
			return 'dark';
		case 'light':
		case 'holy':
		case 'divine':
			return 'light';
		case 'water':
		case 'arcane':
			return 'water';
		case 'grass':
		case 'nature':
		case 'earth':
			return 'grass';
		default:
			return 'neutral';
	}
}

export interface CardSymbolChoreographyInput {
	readonly element?: string;
	readonly keywords?: readonly string[];
	readonly race?: string;
	readonly level: ImpactLevel;
	readonly lethal?: boolean | null;
}

const LIFESTEAL_RETURN_PALETTE: ParticleColor = {
	primary: '#22c55e',
	secondary: '#fca5a5',
	glow: 'rgba(34,197,94,0.6)',
};

const POISON_PALETTE: ParticleColor = {
	primary: '#84cc16',
	secondary: '#22c55e',
	glow: 'rgba(132,204,22,0.62)',
};

const TUNNEL_RACES = new Set(['dragon', 'elemental', 'titan', 'demon']);

/**
 * Resolves the complete 2D PixiJS v8 attack choreography from a card's real
 * symbols (`element`, `keywords`, `race`) and resolved impact intensity.
 */
export function resolveCardSymbolAttackChoreography(
	input: CardSymbolChoreographyInput,
): SymbolAttackChoreography {
	const element = normalizeNorseElement(input.element);
	const base = SYMBOL_BASE_CHOREOGRAPHY[element];
	const keywordSet = new Set((input.keywords ?? []).map(k => k.toLowerCase()));
	const race = (input.race ?? '').toLowerCase();
	const isHeavyOrLethal = input.level === 'heavy' || input.lethal === true;

	let travelStyle: AttackTravelStyle = base.travelStyle;
	let palette: ParticleColor = base.palette;
	let ribbonStrands: 1 | 2 | 3 = base.ribbonStrands;
	let tunnelRings = base.tunnelRings;
	let travelSpeedMultiplier = base.travelSpeedMultiplier;
	let impactSignature: AttackImpactSignature = base.impactSignature;
	let slashScale = base.slashScale;
	let shardCount = base.shardCount;
	let spawnStarburst = base.spawnStarburst;
	let spawnVortex = base.spawnVortex;
	let returnRibbonPalette: ParticleColor | undefined;

	// Heavy / lethal blows or mythic tribes escalate to a dramatic Magic Tunnel
	if (isHeavyOrLethal || TUNNEL_RACES.has(race)) {
		travelStyle = 'tunnel';
		tunnelRings = Math.min(10, tunnelRings + (input.lethal === true ? 2 : 1));
		spawnStarburst = true;
		slashScale += input.lethal === true ? 0.28 : 0.16;
		shardCount += input.lethal === true ? 4 : 2;
	}

	// Fast striker keywords (Rush / Charge / Windfury) snap quicker with triple strands
	if (keywordSet.has('rush') || keywordSet.has('charge') || keywordSet.has('windfury')) {
		travelSpeedMultiplier = Math.min(travelSpeedMultiplier, 0.82);
		ribbonStrands = 3;
	}

	// Poisonous cards deliver a corrosive emerald-lime arcane vortex
	if (keywordSet.has('poisonous')) {
		palette = POISON_PALETTE;
		impactSignature = 'poison-vortex';
		spawnVortex = true;
	}

	// Lifesteal cards draw a visible translucent vitality ribbon back to the caster hero
	if (keywordSet.has('lifesteal')) {
		returnRibbonPalette = LIFESTEAL_RETURN_PALETTE;
	}

	return {
		element,
		palette,
		travelStyle,
		ribbonStrands,
		ribbonArcFactor: base.ribbonArcFactor,
		tunnelRings,
		travelSpeedMultiplier,
		impactSignature,
		slashScale: Number(slashScale.toFixed(2)),
		shardCount,
		spawnEmbers: base.spawnEmbers,
		spawnStarburst,
		spawnVortex,
		...(returnRibbonPalette ? { returnRibbonPalette } : {}),
	};
}

export { SYMBOL_BASE_CHOREOGRAPHY };
