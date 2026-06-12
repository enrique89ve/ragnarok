/**
 * cardDataAdapter — normalizes CardInstance / CardData / CardInstanceWithCardData
 * into the SimpleCardData shape that <SimpleCardCompat> consumes.
 *
 * The conversion was previously inlined inside two <CardRenderer>
 * shim files. Centralizing it lets the 6 CardRenderer call sites
 * render <SimpleCardCompat> directly without keeping the renderer
 * as a permanent facade.
 */

import type { CardData, CardInstance } from '../../types';
import type { CardInstanceWithCardData } from '../../types/interfaceExtensions';
import { getCardDataSafely } from '../../utils/cards/cardInstanceAdapter';
import { getCardById } from '../../data/allCards';
import {
	normalizeSimpleCardRarity,
	normalizeSimpleCardElement,
	normalizeSimpleCardType,
} from './SimpleCardCompat';
import type { SimpleCardData, SimpleCardStatView } from './SimpleCardCompat';

type CardSource = CardInstance | CardInstanceWithCardData | CardData;

function readNumberProperty(source: object, key: string): number | undefined {
	const value = (source as Record<string, unknown>)[key];
	return typeof value === 'number' ? value : undefined;
}

function readStringProperty(source: object, key: string): string | undefined {
	const value = (source as Record<string, unknown>)[key];
	return typeof value === 'string' ? value : undefined;
}

function readStringArrayProperty(source: object, key: string): string[] | undefined {
	const value = (source as Record<string, unknown>)[key];
	if (!Array.isArray(value)) return undefined;
	return value.filter((entry): entry is string => typeof entry === 'string');
}

function readEvolutionLevel(source: object): SimpleCardData['evolutionLevel'] {
	const value = readNumberProperty(source, 'evolutionLevel');
	return value === 1 || value === 2 || value === 3 ? value : undefined;
}

function readEvolutionCondition(source: object): SimpleCardData['evolutionCondition'] {
	const value = (source as Record<string, unknown>).evolutionCondition;
	if (!value || typeof value !== 'object') return undefined;
	const record = value as Record<string, unknown>;
	if (typeof record.trigger !== 'string' || typeof record.description !== 'string') return undefined;
	return { trigger: record.trigger, description: record.description };
}

function hasStage3Variants(source: object): boolean {
	return Array.isArray((source as Record<string, unknown>).stage3Variants);
}

export function toSimpleCardData(card: CardSource): SimpleCardData | null {
	const processedCard = getCardDataSafely(card);
	if (!processedCard) return null;

	const cardAny = processedCard as Record<string, unknown>;
	const evolvesFrom = readNumberProperty(processedCard, 'evolvesFrom');
	const evolvesFromCard = evolvesFrom ? getCardById(evolvesFrom) : undefined;

	return {
		id: processedCard.id || 0,
		name: processedCard.name || 'Unknown',
		manaCost: processedCard.manaCost || 0,
		attack: readNumberProperty(processedCard, 'attack'),
		health: readNumberProperty(processedCard, 'health'),
		description: processedCard.description || '',
		type: normalizeSimpleCardType(processedCard.type),
		rarity: normalizeSimpleCardRarity(processedCard.rarity),
		tribe: readStringProperty(processedCard, 'race') ?? readStringProperty(processedCard, 'tribe'),
		cardClass: processedCard.class || processedCard.heroClass,
		keywords: readStringArrayProperty(processedCard, 'keywords') || [],
		evolutionLevel: readEvolutionLevel(processedCard),
		element: normalizeSimpleCardElement(readStringProperty(processedCard, 'element')),
		petStage: readStringProperty(processedCard, 'petStage'),
		petFamily: readStringProperty(processedCard, 'petFamily'),
		evolvesFrom,
		evolvesFromName: evolvesFromCard?.name ?? readStringProperty(processedCard, 'evolvesFromName'),
		evolutionCondition: readEvolutionCondition(processedCard),
		hasStage3Variants: hasStage3Variants(processedCard),
		bloodPrice: readNumberProperty(processedCard, 'bloodPrice'),
		chainPartner: readNumberProperty(processedCard, 'chainPartner'),
		einpieces: readNumberProperty(processedCard, 'einpieces'),
		...(cardAny.cardClass !== undefined && typeof cardAny.cardClass !== 'string' ? {} : {}),
	};
}

export type { SimpleCardData, SimpleCardStatView };
