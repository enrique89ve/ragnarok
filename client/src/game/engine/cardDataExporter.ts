/**
 * cardDataExporter.ts — Export card definitions to WASM
 *
 * Strips the full card registry to game-mechanical fields only
 * (no descriptions, flavor text, art URLs) and loads them into
 * the WASM module via the per-card loading API.
 */

import type { CardData, BattlecryEffect, DeathrattleEffect, SpellEffect } from '../types';
import { parseEffect } from '../data/effects/effectSchema';
import { debug } from '../config/debugConfig';

type EffectSlot = 'battlecry' | 'deathrattle' | 'spellEffect';
type MalformedEffectIssue = {
	readonly cardId: number;
	readonly slot: EffectSlot;
	readonly effectType: string;
	readonly reason: string;
};

const MAX_MALFORMED_TYPE_GROUPS = 5;
const MAX_MALFORMED_SAMPLES = 3;
const MAX_DIAGNOSTIC_TEXT_LENGTH = 80;

const STARTER_LIVE_ONLY_EFFECTS: Readonly<Record<number, Partial<Record<EffectSlot, string>>>> = {
	102: { battlecry: 'conditional_buff_self' },
	107: { spellEffect: 'damage_and_freeze' },
	118: { spellEffect: 'damage_based_on_armor' },
	119: { spellEffect: 'draw_per_damaged' },
	129: { spellEffect: 'heal_all_friendly' },
	138: { spellEffect: 'buff_weapon' },
	139: { spellEffect: 'damage_all_and_draw' },
	142: { battlecry: 'discover' },
	143: { spellEffect: 'heal_and_draw' },
};

const CARD_TYPE_MAP: Record<string, number> = {
	minion: 0, spell: 1, weapon: 2, hero: 3,
	secret: 4, location: 5, poker_spell: 6, artifact: 7, armor: 8,
};

const HERO_CLASS_MAP: Record<string, number> = {
	neutral: 0, druid: 1, hunter: 2, mage: 3, paladin: 4,
	priest: 5, rogue: 6, shaman: 7, warlock: 8, warrior: 9,
	necromancer: 10, berserker: 11, deathknight: 12,
	Neutral: 0, Druid: 1, Hunter: 2, Mage: 3, Paladin: 4,
	Priest: 5, Rogue: 6, Shaman: 7, Warlock: 8, Warrior: 9,
	Necromancer: 10, Berserker: 11, DeathKnight: 12,
};

function diagnosticText(value: string): string {
	return value.length <= MAX_DIAGNOSTIC_TEXT_LENGTH
		? value
		: `${value.slice(0, MAX_DIAGNOSTIC_TEXT_LENGTH - 1)}…`;
}

function createMalformedEffectReporter(): {
	report(issue: MalformedEffectIssue): void;
	emit(): void;
} {
	let total = 0;
	let otherTypeCount = 0;
	const typeCounts = new Map<string, number>();
	const samples: MalformedEffectIssue[] = [];

	return {
		report(issue) {
			total += 1;
			const knownCount = typeCounts.get(issue.effectType);
			if (knownCount !== undefined) {
				typeCounts.set(issue.effectType, knownCount + 1);
			} else if (typeCounts.size < MAX_MALFORMED_TYPE_GROUPS) {
				typeCounts.set(issue.effectType, 1);
			} else {
				otherTypeCount += 1;
			}
			if (samples.length < MAX_MALFORMED_SAMPLES) samples.push(issue);
		},
		emit() {
			if (total === 0) return;
			const typeSummary = [
				...Array.from(typeCounts, ([effectType, count]) => `${diagnosticText(effectType)}:${count}`),
				...(otherTypeCount > 0 ? [`other:${otherTypeCount}`] : []),
			].join(',');
			const sampleSummary = samples.map(issue =>
				`card=${issue.cardId} slot=${issue.slot} type=${diagnosticText(issue.effectType)} reason=${diagnosticText(issue.reason)}`,
			).join(' | ');
			debug.warn(
				`[cardDataExporter] Skipped ${total} malformed legacy effect${total === 1 ? '' : 's'} during WASM export; cards were committed without those effects. types=${typeSummary}; samples=${sampleSummary}`,
			);
		},
	};
}

function mapEffectToPattern(
	effect: BattlecryEffect | DeathrattleEffect | SpellEffect | undefined,
	cardId: number,
	slot: EffectSlot,
	reportMalformed: (issue: MalformedEffectIssue) => void,
): {
	pattern: string; value: number; value2: number;
	targetType: string; condition: string; cardId: number; count: number;
} | null {
	if (!effect || !effect.type) return null;

	// Validate against the EffectSchema canon. A typo in the dispatcher key
	// (e.g. `type: 'damge'`) would today silently fall into the AS dispatcher's
	// "unknown pattern → no-op" branch, breaking peer state-hash convergence
	// in P2P matches. Surfacing it at boot with card context prevents the bug
	// from ever reaching a ranked match. Behavior on failure is unchanged
	// (skip the effect) — the warn raises visibility without a hard break.
	const parsed = parseEffect(effect);
	if (!parsed.ok) {
		// The generic WASM effect interpreter is an export boundary, not the live
		// cards dispatcher. These exact starter composites have deterministic live
		// utility coverage and stay out of EffectSchema until AssemblyScript gains
		// equivalent semantics.
		if (STARTER_LIVE_ONLY_EFFECTS[cardId]?.[slot] === effect.type) {
			debug.verbose(`[cardDataExporter] Starter live-only effect omitted from WASM export (card=${cardId} slot=${slot})`);
			return null;
		}
		reportMalformed({
			cardId,
			slot,
			effectType: effect.type,
			reason: parsed.reason,
		});
		return null;
	}

	return {
		pattern: parsed.effect.type,
		value: parsed.effect.value ?? 0,
		value2: parsed.effect.value2 ?? 0,
		targetType: parsed.effect.targetType ?? 'none',
		condition: parsed.effect.condition ?? '',
		cardId: parsed.effect.cardId ?? 0,
		count: parsed.effect.count ?? 1,
	};
}

export interface WasmCardLoader {
	beginCard(id: number, name: string, cardType: number, manaCost: number): void;
	setCardStats(attack: number, health: number, heroClass: number, overload: number, spellDamage: number): void;
	setCardMeta(rarity: string, race: string, heroId: string, armorSlot: string): void;
	addCardKeyword(keyword: string): void;
	setCardBattlecry(pattern: string, value: number, value2: number, targetType: string, condition: string, cardId: number, count: number): void;
	setCardDeathrattle(pattern: string, value: number, value2: number, targetType: string, condition: string, cardId: number, count: number): void;
	setCardSpellEffect(pattern: string, value: number, value2: number, targetType: string, condition: string, cardId: number, count: number): void;
	commitCard(): void;
	clearCardData(): void;
	getCardCount(): number;
}

export function exportCardDataToWasm(cards: CardData[], loader: WasmCardLoader): number {
	loader.clearCardData();
	const malformedEffects = createMalformedEffectReporter();

	for (const card of cards) {
		const id = typeof card.id === 'number' ? card.id : parseInt(String(card.id), 10);
		if (isNaN(id)) continue;

		const cardType = CARD_TYPE_MAP[card.type] ?? 0;
		const manaCost = card.manaCost ?? 0;

		loader.beginCard(id, card.name, cardType, manaCost);

		const attack = ('attack' in card && typeof card.attack === 'number') ? card.attack : 0;
		const health = ('health' in card && typeof card.health === 'number') ? card.health :
			('durability' in card && typeof card.durability === 'number') ? card.durability : 0;
		const heroClass = HERO_CLASS_MAP[card.heroClass ?? card.class ?? 'neutral'] ?? 0;
		const overload = ('overload' in card && card.overload && typeof card.overload === 'object')
			? (card.overload as { amount: number }).amount : 0;
		const spellDamage = ('spellDamage' in card && typeof card.spellDamage === 'number') ? card.spellDamage : 0;

		loader.setCardStats(attack, health, heroClass, overload, spellDamage);

		const rarity = card.rarity ?? 'free';
		const race = card.race ?? '';
		const heroId = ('heroId' in card && typeof card.heroId === 'string') ? card.heroId : '';
		const armorSlot = ('armorSlot' in card && typeof card.armorSlot === 'string') ? card.armorSlot : '';

		loader.setCardMeta(rarity, race, heroId, armorSlot);

		if (card.keywords) {
			for (const kw of card.keywords) {
				loader.addCardKeyword(kw);
			}
		}

		if ('battlecry' in card) {
			const bc = mapEffectToPattern(card.battlecry as BattlecryEffect, id, 'battlecry', malformedEffects.report);
			if (bc) loader.setCardBattlecry(bc.pattern, bc.value, bc.value2, bc.targetType, bc.condition, bc.cardId, bc.count);
		}

		if ('deathrattle' in card) {
			const dr = mapEffectToPattern(card.deathrattle as DeathrattleEffect, id, 'deathrattle', malformedEffects.report);
			if (dr) loader.setCardDeathrattle(dr.pattern, dr.value, dr.value2, dr.targetType, dr.condition, dr.cardId, dr.count);
		}

		if ('spellEffect' in card) {
			const se = mapEffectToPattern(card.spellEffect as SpellEffect, id, 'spellEffect', malformedEffects.report);
			if (se) loader.setCardSpellEffect(se.pattern, se.value, se.value2, se.targetType, se.condition, se.cardId, se.count);
		}

		loader.commitCard();
	}
	malformedEffects.emit();

	return loader.getCardCount();
}
