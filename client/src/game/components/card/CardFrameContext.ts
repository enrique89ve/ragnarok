/**
 * <CardFrame> — internal context.
 *
 * Slot children read shape / size / rarity / element / rootRef from
 * here. Keeps the parent JSX clean (no prop drilling per slot) and
 * lets slots like CardHolo wire DOM handlers onto the frame root
 * without owning the root themselves.
 *
 * The hook throws when used outside <CardFrame> — slots have no
 * sensible default and silent fall-through would mask integration
 * bugs.
 */

import { createContext, useContext, type RefObject } from 'react';
import type {
	CardShape,
	CardSize,
	ResolvedCardDims,
	CardStatsMode,
	CardType,
	CardKind,
	EvolutionLevel,
} from './types';
import type { Rarity } from '@shared/schemas/rarity';
import type { NorseElement } from '../../types/NorseTypes';

export interface CardFrameContextValue {
	rootRef: RefObject<HTMLDivElement | null>;
	shape: CardShape;
	size: CardSize;
	rarity: Rarity;
	element: NorseElement;
	dims: ResolvedCardDims;
	pngFailed: boolean;
	isPlayable: boolean;
	isHighlighted: boolean;
	statsMode: CardStatsMode;
	cardType: CardType;
	cardKind: CardKind;
	evolutionLevel: EvolutionLevel;
	disableTooltips: boolean;
}

export const CardFrameContext = createContext<CardFrameContextValue | null>(null);

export function useCardFrame(): CardFrameContextValue {
	const value = useContext(CardFrameContext);
	if (value === null) {
		throw new Error('Slot component must be rendered inside <CardFrame>');
	}
	return value;
}
