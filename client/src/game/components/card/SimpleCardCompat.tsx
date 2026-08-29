/**
 * SimpleCardCompat — drop-in <SimpleCard> replacement backed by <CardFrame>.
 *
 * Kept the same public prop surface so the 5 SimpleCard call sites
 * (MulliganCard, CardDragLayer, Graveyard, DiscoveryModal, MythicEntrance)
 * migrate with one import-path swap. Internally renders <CardFrame>
 * with the matching slot children.
 *
 * Re-exports the SimpleCard type family so legacy dev/test consumers keep
 * importing the same names.
 */

import React from 'react';
import type {
	StatGemTone,
	CardSize,
	CardShape,
	CardStatsMode,
} from './types';
import {
	resolveSimpleCardFrameLayoutAdapter,
	type CardFrameLayoutSurface,
} from './cardFrameLayoutAdapter';
import {
	CollectionCardTile,
	type CollectionTileCard,
	type CollectionTileRenderedFields,
	type CollectionTileSemanticMode,
	type CollectionTileStats,
	type CollectionTileStatTone,
} from '../collection/CollectionCardTile';
import type { Rarity } from '@shared/schemas/rarity';
import { parseNorseElement, type NorseElement } from '../../types/NorseTypes';
import { normalizeRarityKey } from '../../utils/rarityUtils';
import { getCardArtPath } from '../../utils/art/artMapping';
import {
	cardFrameSurfaceToPresentationSurface,
	getCardKeywordsForSurface,
} from './cardPresentationContract';

export type SimpleCardType =
	| 'minion'
	| 'spell'
	| 'weapon'
	| 'artifact'
	| 'armor'
	| 'hero'
	| 'secret'
	| 'location'
	| 'poker_spell';

export type SimpleCardRarity = Rarity;

export interface SimpleCardData {
	id: number | string;
	name: string;
	manaCost: number;
	attack?: number;
	health?: number;
	description?: string;
	type: SimpleCardType;
	rarity?: SimpleCardRarity;
	tribe?: string;
	cardClass?: string;
	keywords?: string[];
	evolutionLevel?: 1 | 2 | 3;
	element?: NorseElement;
	petStage?: string;
	petFamily?: string;
	evolvesFrom?: number;
	evolvesFromName?: string;
	evolutionCondition?: { trigger: string; description: string };
	hasStage3Variants?: boolean;
	bloodPrice?: number;
	chainPartner?: number;
}

export type SimpleCardStatTone = StatGemTone;

export interface SimpleCardStatValue {
	value: number | string;
	tone?: SimpleCardStatTone;
}

export interface SimpleCardStatView {
	attack?: SimpleCardStatValue;
	health?: SimpleCardStatValue;
}

export type SimpleCardStatsMode = CardStatsMode;

export const normalizeSimpleCardRarity = normalizeRarityKey;
export const normalizeSimpleCardElement = parseNorseElement;

export const normalizeSimpleCardType = (type?: string): SimpleCardType => {
	switch (type) {
		case 'spell':
		case 'weapon':
		case 'artifact':
		case 'armor':
		case 'hero':
		case 'secret':
		case 'location':
		case 'poker_spell':
			return type;
		default:
			return 'minion';
	}
};

interface SimpleCardCompatProps {
	card: SimpleCardData;
	isPlayable?: boolean;
	isHighlighted?: boolean;
	onClick?: () => void;
	onMouseEnter?: (e: React.MouseEvent) => void;
	onMouseLeave?: (e: React.MouseEvent) => void;
	size?: CardSize;
	showDescription?: boolean;
	showName?: boolean;
	keywordLabelMode?: 'full' | 'compact';
	className?: string;
	style?: React.CSSProperties;
	attackBuff?: number;
	healthBuff?: number;
	statView?: SimpleCardStatView;
	statsMode?: SimpleCardStatsMode;
	shape?: CardShape;
	surface?: CardFrameLayoutSurface;
	owned?: boolean;
	disableTooltips?: boolean;
	semanticMode?: CollectionTileSemanticMode;
}

const toneToTile = (tone: SimpleCardStatTone | undefined): CollectionTileStatTone => {
	switch (tone) {
		case 'buffed': return 'buffed';
		case 'damaged': return 'damaged';
		case 'unknown': return 'unknown';
		default: return 'base';
	}
};

const toNumberId = (id: number | string): number => {
	const numericId = Number(id);
	return Number.isFinite(numericId) ? numericId : 0;
};

const toCollectionTileCard = (card: SimpleCardData): CollectionTileCard => ({
	id: toNumberId(card.id),
	name: card.name,
	manaCost: card.manaCost,
	rarity: card.rarity ?? 'common',
	type: card.type,
	heroClass: card.cardClass ?? 'neutral',
	quantity: 1,
	collectionSource: 'qa_full_catalog',
	...(card.description !== undefined ? { description: card.description } : {}),
	...(card.element !== undefined ? { element: card.element } : {}),
	...(card.attack !== undefined ? { attack: card.attack } : {}),
	...(card.health !== undefined ? { health: card.health } : {}),
});

export const SimpleCardCompat: React.FC<SimpleCardCompatProps> = ({
	card,
	isPlayable = true,
	isHighlighted = false,
	onClick,
	onMouseEnter,
	onMouseLeave,
	size = 'medium',
	showDescription = false,
	showName,
	keywordLabelMode,
	className = '',
	style,
	attackBuff = 0,
	healthBuff = 0,
	statView,
	statsMode = 'frame',
	shape,
	surface,
	owned = true,
	disableTooltips = false,
	semanticMode = 'content',
}) => {
	const isMinion = card.type === 'minion';
	const isWeapon = card.type === 'weapon';
	const isArtifact = card.type === 'artifact';
	const showCombatStats = statsMode !== 'hidden' && (isMinion || isWeapon || isArtifact);

	const defaultStatsAreUnknown = card.petStage === 'master' && card.hasStage3Variants;
	const attackStat: SimpleCardStatValue = statView?.attack ?? {
		value: defaultStatsAreUnknown ? '?' : (card.attack ?? 0) + attackBuff,
		tone: defaultStatsAreUnknown ? 'unknown' : attackBuff > 0 ? 'buffed' : 'base',
	};
	const healthStat: SimpleCardStatValue = statView?.health ?? {
		value: defaultStatsAreUnknown ? '?' : (card.health ?? 0) + healthBuff,
		tone: defaultStatsAreUnknown ? 'unknown' : healthBuff > 0 ? 'buffed' : 'base',
	};

	const rarity: Rarity = card.rarity ?? 'common';
	const artPath = getCardArtPath(card.id) ?? undefined;
	const showArt = Boolean(artPath) && owned;
	const layoutAdapter = resolveSimpleCardFrameLayoutAdapter({
		size,
		statsMode,
		cardType: card.type,
		showDescription,
		...(surface !== undefined ? { surface } : {}),
	});
	const presentationSurface = cardFrameSurfaceToPresentationSurface(layoutAdapter.surface);
	const renderedKeywords = getCardKeywordsForSurface(card.keywords, presentationSurface);

	const tileStats: CollectionTileStats | undefined = showCombatStats
		? {
			attack: { value: attackStat.value, tone: toneToTile(attackStat.tone) },
			health: { value: healthStat.value, tone: toneToTile(healthStat.tone) },
		}
		: undefined;

	const fields: CollectionTileRenderedFields = {
		showArt,
		showCount: false,
		showName: showName ?? layoutAdapter.showName,
		showStats: showCombatStats,
		...(layoutAdapter.showTribeLine && card.tribe ? { tribe: card.tribe } : {}),
		...(layoutAdapter.showDescriptionText && card.description ? { description: card.description } : {}),
		...(layoutAdapter.showKeywords && renderedKeywords.length > 0 ? { keywords: renderedKeywords } : {}),
		showElementBadge: layoutAdapter.showElementBadge,
		showBloodPrice: layoutAdapter.showBloodPrice,
		showEvolution: layoutAdapter.showEvolution,
		...(card.bloodPrice !== undefined ? { bloodPrice: card.bloodPrice } : {}),
		...(card.evolutionLevel !== undefined ? { evolutionLevel: card.evolutionLevel } : {}),
		...(card.petStage !== undefined ? { petStage: card.petStage } : {}),
		keywordLimit: layoutAdapter.keywordLimit,
		keywordLabelMode: keywordLabelMode ?? layoutAdapter.keywordLabelMode,
	};

	const frameClassName = [
		'simple-card',
		size,
		shape !== undefined ? `simple-card--shape-${shape}` : '',
		className,
	].filter(Boolean).join(' ');

	return (
		<CollectionCardTile
			card={{
				...toCollectionTileCard(card),
				rarity,
			}}
			dataCardSurface={layoutAdapter.surface}
			disableTooltips={disableTooltips}
			fields={fields}
		frameClassName={frameClassName}
		frameAsset={layoutAdapter.frameAsset}
		frameRender={layoutAdapter.frameRender}
			frameSize={size}
			frameStyle={{
				maxWidth: 'none',
				...style,
			}}
			isPlayable={isPlayable}
			isHighlighted={isHighlighted}
			semanticMode={semanticMode}
			onClick={onClick}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
			shellClassName={`simple-card-shell simple-card-shell--${size}`}
			shellStyle={{ maxWidth: 'none' }}
			stats={tileStats}
			statsMode={statsMode}
		/>
	);
};

export default SimpleCardCompat;
export { SimpleCardCompat as SimpleCard };
