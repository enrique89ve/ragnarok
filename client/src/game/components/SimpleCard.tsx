/**
 * SimpleCard.tsx — deprecated stub.
 *
 * The component has been replaced by <SimpleCardCompat> in
 * `./card/SimpleCardCompat.tsx`, which renders <CardFrame> with
 * matching slot children. This file remains only to re-export the
 * SimpleCard type family so legacy type-only imports continue to
 * compile until commit (d6) deletes this shim entirely.
 *
 * New code MUST import from `./card/SimpleCardCompat` instead.
 */

import { normalizeRarityKey } from '../utils/rarityUtils';
import { parseNorseElement } from '../types/NorseTypes';
import { SimpleCardCompat } from './card/SimpleCardCompat';
import type {
	SimpleCardType,
	SimpleCardRarity,
	SimpleCardData,
	SimpleCardStatTone,
	SimpleCardStatValue,
	SimpleCardStatView,
	SimpleCardStatsMode,
} from './card/SimpleCardCompat';

export const normalizeSimpleCardRarity = normalizeRarityKey;
export const normalizeSimpleCardElement = parseNorseElement;
export const normalizeSimpleCardType = (type?: string): SimpleCardType => {
	switch (type) {
		case 'spell': case 'weapon': case 'artifact': case 'armor':
		case 'hero': case 'secret': case 'location': case 'poker_spell':
			return type;
		default: return 'minion';
	}
};

export type {
	SimpleCardType,
	SimpleCardRarity,
	SimpleCardData,
	SimpleCardStatTone,
	SimpleCardStatValue,
	SimpleCardStatView,
	SimpleCardStatsMode,
};

export const SimpleCard = SimpleCardCompat;
export default SimpleCardCompat;
