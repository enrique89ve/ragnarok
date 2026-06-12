/**
 * SimpleCardCompat — drop-in <SimpleCard> replacement backed by <CardFrame>.
 *
 * Kept the same public prop surface so the 5 SimpleCard call sites
 * (MulliganCard, CardDragLayer, Graveyard, DiscoveryModal, MythicEntrance)
 * migrate with one import-path swap. Internally renders <CardFrame>
 * with the matching slot children.
 *
 * Re-exports the SimpleCard type family so consumers (FrameSvgOnly,
 * card lab types) keep importing the same names.
 */

import React from 'react';
import {
	CardFrame,
	CardArt,
	CardHolo,
	CardManaGem,
	CardStatGems,
	CardNamePlate,
	CardTribeLine,
	CardDescription,
	CardBloodPrice,
	CardEvolutionStars,
	CardElementBadge,
	CardPetStageBadge,
	CardKeywordTooltip,
} from './index';
import type {
	CardType as CardFrameType,
	CardKind as CardFrameKind,
	EvolutionLevel,
	StatView,
	StatGemTone,
} from './types';
import type { Rarity } from '@shared/schemas/rarity';
import { parseNorseElement, type NorseElement } from '../../types/NorseTypes';
import { normalizeRarityKey } from '../../utils/rarityUtils';
import { getCardArtPath } from '../../utils/art/artMapping';

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
	einpieces?: number;
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

export type SimpleCardStatsMode = 'frame' | 'battlefield' | 'hidden';

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
	size?: 'small' | 'medium' | 'large' | 'preview';
	showDescription?: boolean;
	className?: string;
	style?: React.CSSProperties;
	attackBuff?: number;
	healthBuff?: number;
	statView?: SimpleCardStatView;
	statsMode?: SimpleCardStatsMode;
	owned?: boolean;
	disableTooltips?: boolean;
}

const TYPE_TO_FRAME: Record<SimpleCardType, CardFrameType> = {
	minion: 'minion',
	spell: 'spell',
	weapon: 'weapon',
	artifact: 'artifact',
	armor: 'armor',
	hero: 'hero',
	secret: 'spell',
	location: 'spell',
	poker_spell: 'spell',
};

const TYPE_TO_KIND: Record<SimpleCardType, CardFrameKind> = {
	minion: null,
	spell: null,
	weapon: null,
	artifact: null,
	armor: null,
	hero: null,
	secret: 'secret',
	location: 'location',
	poker_spell: 'poker_spell',
};

const toneToFrame = (tone: SimpleCardStatTone | undefined): StatGemTone => {
	switch (tone) {
		case 'buffed': return 'buffed';
		case 'damaged': return 'damaged';
		case 'unknown': return 'unknown';
		default: return 'base';
	}
};

export const SimpleCardCompat: React.FC<SimpleCardCompatProps> = ({
	card,
	isPlayable = true,
	isHighlighted = false,
	onClick,
	onMouseEnter,
	onMouseLeave,
	size = 'medium',
	showDescription = false,
	className = '',
	style,
	attackBuff = 0,
	healthBuff = 0,
	statView,
	statsMode = 'frame',
	owned = true,
	disableTooltips = false,
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

	const cardType = TYPE_TO_FRAME[card.type];
	const cardKind = TYPE_TO_KIND[card.type];
	const evolutionLevel: EvolutionLevel = card.evolutionLevel ?? null;
	const rarity: Rarity = card.rarity ?? 'common';
	const element: NorseElement = card.element ?? 'neutral';
	const artPath = getCardArtPath(card.id) ?? undefined;
	const showArt = Boolean(artPath) && owned;

	const statViewForGems: StatView | undefined = showCombatStats
		? {
			attack: { value: typeof attackStat.value === 'string' ? '?' : attackStat.value, tone: toneToFrame(attackStat.tone) },
			health: { value: typeof healthStat.value === 'string' ? '?' : healthStat.value, tone: toneToFrame(healthStat.tone) },
		}
		: undefined;

	return (
		<CardFrame
			shape={size === 'preview' ? 'portrait' : 'tile'}
			rarity={rarity}
			element={element}
			size={size}
			cardType={cardType}
			cardKind={cardKind}
			evolutionLevel={evolutionLevel}
			statsMode={statsMode}
			isPlayable={isPlayable}
			isHighlighted={isHighlighted}
			disableTooltips={disableTooltips}
			onClick={onClick}
			className={className}
			style={style}
		>
			{showArt && <CardArt src={artPath} alt={card.name} />}
			<CardHolo />
			<CardManaGem cost={card.manaCost} />
			{card.evolutionLevel && <CardEvolutionStars level={card.evolutionLevel} />}
			{card.element && <CardElementBadge element={element} />}
			{card.petStage && (
				<CardPetStageBadge
					stage={card.petStage === 'adept' ? 2 : card.petStage === 'master' ? 3 : 1}
				/>
			)}
			{card.bloodPrice && card.bloodPrice > 0 && <CardBloodPrice value={card.bloodPrice} />}
			<CardNamePlate name={card.name} />
			{card.tribe && <CardTribeLine tribe={card.tribe} />}
			<CardDescription
				description={showDescription ? card.description : undefined}
				keywords={card.keywords}
			/>
			{statViewForGems && <CardStatGems statView={statViewForGems} />}
			<CardKeywordTooltip keywords={card.keywords} />
		</CardFrame>
	);
};

export default SimpleCardCompat;
export { SimpleCardCompat as SimpleCard };
