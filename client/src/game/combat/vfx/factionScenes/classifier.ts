/**
 * classifier.ts
 *
 * Pure, deterministic card -> tribe/faction VFX scene resolver.
 * Never mutates game state or inspects DOM; safe for unit testing and replay.
 */

import { tryAdaptRarity, type Rarity } from '@shared/schemas/rarity';
import { getCardById, getCardByName } from '../../../data/cardRegistry';
import type { CardData } from '../../../types';
import type {
	FactionCardDescriptor,
	FactionVfxSceneId,
	FactionVfxTrigger,
	TribeVfxCategory,
} from './types';

const DRAGON_NAME_PATTERN = /\b(dragon|drake|wyrm|nidhogg|níðhöggr|fafnir|jormungandr|typhon)\b/i;
const TITAN_FROST_PATTERN = /frost|ice|nifl|skadi|jotun|jötun|glacial|winter|cold/i;
const TITAN_MAGMA_PATTERN = /muspel|surtr|magma|flame|infernal|soot|lava|fire|sun|hyperion/i;
const TITAN_VOID_PATTERN = /void|abyss|erebus|helheim|dead|shadow|ginnungagap|tartarus|doom/i;

type ExtendedCardRecord = CardData & {
	readonly faction?: string;
	readonly petFamily?: string;
	readonly petStage?: string;
	readonly element?: string;
};

export interface ClassifiedCardVfx {
	readonly category: TribeVfxCategory;
	readonly rarity: Rarity | null;
	readonly isLegendaryTier: boolean;
	readonly hasFlying: boolean;
	readonly element: string;
}

function lookupRegistryCard(descriptor: FactionCardDescriptor): ExtendedCardRecord | undefined {
	if (descriptor.cardId !== undefined && descriptor.cardId !== '') {
		const numericId = typeof descriptor.cardId === 'number'
			? descriptor.cardId
			: Number(descriptor.cardId);
		if (Number.isFinite(numericId)) {
			const byNum = getCardById(numericId);
			if (byNum) return byNum as ExtendedCardRecord;
		}
		const byRaw = getCardById(descriptor.cardId as CardData['id']);
		if (byRaw) return byRaw as ExtendedCardRecord;
	}
	if (descriptor.cardName) {
		const byName = getCardByName(descriptor.cardName);
		if (byName) return byName as ExtendedCardRecord;
	}
	return undefined;
}

function pickFirst<T>(primary: T | null | undefined, fallback: T | null | undefined): T | null {
	return primary ?? fallback ?? null;
}

export function hydrateCardDescriptor(descriptor: FactionCardDescriptor): FactionCardDescriptor {
	const record = lookupRegistryCard(descriptor);
	if (!record) return descriptor;
	return {
		cardId: descriptor.cardId ?? record.id,
		cardName: descriptor.cardName ?? record.name,
		race: pickFirst(descriptor.race, record.race),
		rarity: pickFirst(descriptor.rarity, record.rarity),
		faction: pickFirst(descriptor.faction, record.faction),
		petFamily: pickFirst(descriptor.petFamily, record.petFamily),
		petStage: pickFirst(descriptor.petStage, record.petStage),
		element: pickFirst(descriptor.element, record.element),
		keywords: pickFirst(descriptor.keywords, record.keywords),
		cardType: pickFirst(descriptor.cardType, record.type),
	};
}

function normalizeText(value: string | null | undefined): string {
	return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function resolveCanonicalRarity(raw: string | null | undefined): Rarity | null {
	if (!raw) return null;
	const trimmed = raw.trim();
	const direct = tryAdaptRarity(trimmed);
	if (direct) return direct;
	return tryAdaptRarity(trimmed.toLowerCase());
}

export function isDragonCard(descriptor: FactionCardDescriptor): boolean {
	const hydrated = hydrateCardDescriptor(descriptor);
	const race = normalizeText(hydrated.race);
	if (race === 'dragon') return true;
	const petFamily = normalizeText(hydrated.petFamily);
	if (petFamily === 'drakes' || petFamily === 'dragon') return true;
	const name = hydrated.cardName ?? '';
	if (DRAGON_NAME_PATTERN.test(name)) return true;
	return false;
}

export function isTitanCard(descriptor: FactionCardDescriptor): boolean {
	const hydrated = hydrateCardDescriptor(descriptor);
	const race = normalizeText(hydrated.race);
	if (race === 'titan' || race === 'giant') return true;
	const faction = normalizeText(hydrated.faction);
	if (faction === 'jotnar') return true;
	return false;
}

export function inferTitanRealmElement(descriptor: FactionCardDescriptor): string {
	const explicit = normalizeText(descriptor.element);
	if (explicit === 'fire' || explicit === 'ice' || explicit === 'water' || explicit === 'dark' || explicit === 'shadow') {
		if (explicit === 'fire') return 'magma';
		if (explicit === 'ice' || explicit === 'water') return 'frost';
		return 'void';
	}
	const name = descriptor.cardName ?? '';
	if (TITAN_FROST_PATTERN.test(name)) return 'frost';
	if (TITAN_MAGMA_PATTERN.test(name)) return 'magma';
	if (TITAN_VOID_PATTERN.test(name)) return 'void';
	return 'ulduar';
}

export function classifyCardForFactionVfx(descriptor: FactionCardDescriptor): ClassifiedCardVfx | null {
	const hydrated = hydrateCardDescriptor(descriptor);
	const rarity = resolveCanonicalRarity(hydrated.rarity);
	const keywords = (hydrated.keywords ?? []).map(k => normalizeText(k));
	const hasFlying = keywords.includes('flying');
	const petStage = normalizeText(hydrated.petStage);
	const isLegendaryTier = rarity === 'mythic' || petStage === 'master';
	const element = normalizeText(hydrated.element) || 'fire';

	if (isDragonCard(hydrated)) {
		return {
			category: 'dragon',
			rarity,
			isLegendaryTier,
			hasFlying,
			element,
		};
	}

	if (isTitanCard(hydrated)) {
		return {
			category: 'titan',
			rarity,
			isLegendaryTier,
			hasFlying,
			element: inferTitanRealmElement(hydrated),
		};
	}

	const race = normalizeText(hydrated.race);
	if (race === 'beast') {
		return { category: 'beast', rarity, isLegendaryTier, hasFlying, element };
	}
	if (race === 'undead') {
		return { category: 'undead', rarity, isLegendaryTier, hasFlying, element };
	}
	if (race === 'elemental') {
		return { category: 'elemental', rarity, isLegendaryTier, hasFlying, element };
	}
	if (normalizeText(hydrated.faction) === 'pets' || petStage.length > 0) {
		return { category: 'pet', rarity, isLegendaryTier, hasFlying, element };
	}

	return null;
}

function resolveDragonSceneId(
	classification: ClassifiedCardVfx,
	trigger: FactionVfxTrigger,
	hasTarget: boolean,
): FactionVfxSceneId | null {
	if (trigger === 'enter' || trigger === 'evolve') {
		const isMythicFlight = classification.isLegendaryTier
			|| (classification.hasFlying && classification.rarity === 'epic');
		return isMythicFlight ? 'dragon-shadow-flight' : 'dragon-flame-ignition';
	}
	if (trigger === 'attack') return 'dragon-fire-breath';
	if (trigger === 'activate') return hasTarget ? 'dragon-fire-breath' : 'dragon-flame-ignition';
	return null;
}

function resolveTitanSceneId(
	classification: ClassifiedCardVfx,
	trigger: FactionVfxTrigger,
	hasTarget: boolean,
): FactionVfxSceneId | null {
	if (trigger === 'enter' || trigger === 'evolve') {
		return classification.isLegendaryTier ? 'titan-pantheon-descent' : 'titan-earth-slam';
	}
	if (trigger === 'attack') return 'titan-colossus-quake';
	if (trigger === 'activate') return hasTarget ? 'titan-colossus-quake' : 'titan-earth-slam';
	return null;
}

/**
 * Selects which 2D VFX scene (if any) should play for a card & trigger moment.
 */
export function resolveFactionVfxScene(
	descriptor: FactionCardDescriptor,
	trigger: FactionVfxTrigger,
	options: { readonly hasTarget?: boolean } = {},
): { readonly sceneId: FactionVfxSceneId; readonly classification: ClassifiedCardVfx } | null {
	const classification = classifyCardForFactionVfx(descriptor);
	if (!classification) return null;

	const hasTarget = Boolean(options.hasTarget);
	let sceneId: FactionVfxSceneId | null = null;
	if (classification.category === 'dragon') {
		sceneId = resolveDragonSceneId(classification, trigger, hasTarget);
	} else if (classification.category === 'titan') {
		sceneId = resolveTitanSceneId(classification, trigger, hasTarget);
	}

	return sceneId ? { sceneId, classification } : null;
}
