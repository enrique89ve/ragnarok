import { describe, expect, it } from 'vitest';
import cardRegistry from '../../data/cardRegistry';
import {
	CARD_ELEMENT_CONTRACTS,
	CARD_KEYWORD_SEMANTICS,
	CARD_PRESENTATION_SURFACES,
	getCardElementSurfaceContract,
	getCardKeywordsForSurface,
	shouldRenderCardKeywordOnSurface,
} from './cardPresentationContract';
import {
	CARD_LAYOUT_SLOT_IDS,
	createDefaultCardLayoutDraft,
	updateCardLayoutRenderField,
} from './cardLayoutDraft';
import { KEYWORD_ICON_MAP } from '../ui/CardIconsSVG';

const readKeywords = (value: unknown): readonly string[] => {
	if (!Array.isArray(value)) return [];
	return value.filter((entry): entry is string => typeof entry === 'string');
};

describe('card presentation contract', () => {
	it('covers every layout slot on every surface', () => {
		expect(Object.keys(CARD_ELEMENT_CONTRACTS).sort()).toEqual([...CARD_LAYOUT_SLOT_IDS].sort());
		for (const slotId of CARD_LAYOUT_SLOT_IDS) {
			for (const surface of CARD_PRESENTATION_SURFACES) {
				const contract = getCardElementSurfaceContract(slotId, surface);
				expect(contract.render).toBeTruthy();
				expect(contract.purpose.length).toBeGreaterThan(0);
				expect(contract.rationale.length).toBeGreaterThan(0);
			}
		}
	});

	it('classifies every keyword currently present in the registry', () => {
		const registryKeywords = Array.from(
			new Set(cardRegistry.flatMap((card) => readKeywords(card.keywords))),
		).sort();
		const knownKeywords = new Set(Object.keys(CARD_KEYWORD_SEMANTICS));
		const missing = registryKeywords.filter((keyword) => !knownKeywords.has(keyword));
		expect(missing).toEqual([]);
	});

	it('has a custom icon for every classified keyword', () => {
		const missing = Object.keys(CARD_KEYWORD_SEMANTICS)
			.filter((keyword) => !Object.prototype.hasOwnProperty.call(KEYWORD_ICON_MAP, keyword))
			.sort();
		expect(missing).toEqual([]);
	});

	it('updates render field rules by surface without mutating other surfaces', () => {
		const draft = createDefaultCardLayoutDraft();
		const updated = updateCardLayoutRenderField(draft, 'gameplay', 'keywords', {
			enabled: false,
			priority: 'hidden',
			rarities: ['epic', 'mythic'],
		});
		const gameplayKeywords = updated.surfaces
			.find((surface) => surface.surface === 'gameplay')
			?.renderFields.find((rule) => rule.id === 'keywords');
		const collectionKeywords = updated.surfaces
			.find((surface) => surface.surface === 'collection')
			?.renderFields.find((rule) => rule.id === 'keywords');

		expect(gameplayKeywords).toMatchObject({
			enabled: false,
			priority: 'hidden',
			rarities: ['epic', 'mythic'],
		});
		expect(collectionKeywords?.enabled).toBe(true);
		expect(draft.surfaces.find((surface) => surface.surface === 'gameplay')?.renderFields.find((rule) => rule.id === 'keywords')?.enabled).toBe(true);
	});

	it('keeps filter-only keywords out of gameplay card chrome', () => {
		expect(shouldRenderCardKeywordOnSurface('artifact', 'collection')).toBe(true);
		expect(shouldRenderCardKeywordOnSurface('artifact', 'gameplay')).toBe(false);
		expect(getCardKeywordsForSurface(['artifact', 'dual_class'], 'gameplay')).toEqual([]);
	});

	it('prioritizes gameplay-decisive keywords before setup-only text', () => {
		expect(getCardKeywordsForSurface(['battlecry', 'taunt', 'rush', 'artifact'], 'gameplay')).toEqual([
			'taunt',
			'rush',
		]);
		expect(getCardKeywordsForSurface(['battlecry', 'rush', 'artifact'], 'pregame')).toEqual([
			'battlecry',
			'rush',
		]);
	});

	it('treats unclassified future keywords as searchable metadata until classified', () => {
		expect(shouldRenderCardKeywordOnSurface('future_keyword', 'collection')).toBe(true);
		expect(shouldRenderCardKeywordOnSurface('future_keyword', 'gameplay')).toBe(false);
	});
});
