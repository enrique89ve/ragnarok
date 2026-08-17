import type { CardRenderImportance } from './cardPresentationContract';

/**
 * Visual accents for keyword chips.
 *
 * The card surface is intentionally very dark, so these accents stay in a
 * bright range and are used for borders, icon marks, and subtle text mixing.
 * Gameplay meaning still comes from `data-tone`; this palette only improves
 * recognition and variety.
 */

export const CARD_KEYWORD_ACCENT_COLORS: Readonly<Record<string, string>> = {
	artifact: '#f6bd60',
	adapt: '#a78bfa',
	adapt_option: '#818cf8',
	aura: '#5eead4',
	battlecry: '#fb7185',
	blood_price: '#ff6b6b',
	blood_echo: '#fb7185',
	cant_attack: '#94a3b8',
	charge: '#38bdf8',
	cleave: '#f97316',
	coil: '#a78bfa',
	colossal: '#c084fc',
	combo: '#f472b6',
	choose_one: '#60a5fa',
	corrupt: '#a3e635',
	deathrattle: '#f43f5e',
	discover: '#60a5fa',
	divine_shield: '#fde68a',
	dormant: '#818cf8',
	dual_class: '#cbd5e1',
	echo: '#22d3ee',
	einherjar: '#34d399',
	elusive: '#67e8f9',
	enrage: '#fb923c',
	fateweave: '#e879f9',
	flying: '#93c5fd',
	freeze: '#7dd3fc',
	freeze_on_damage: '#22d3ee',
	frenzy: '#facc15',
	frozen: '#38bdf8',
	immune: '#d8b4fe',
	inspire: '#f9a8d4',
	lifesteal: '#fda4af',
	magnetic: '#2dd4bf',
	mega_windfury: '#f0abfc',
	outcast: '#fdba74',
	overkill: '#fb7185',
	overload: '#2dd4bf',
	poker_spell: '#f9a8d4',
	poisonous: '#bef264',
	prophecy: '#c4b5fd',
	quest: '#fcd34d',
	reborn: '#86efac',
	recruit: '#4ade80',
	rush: '#38bdf8',
	secret: '#a5b4fc',
	sidequest: '#fcd34d',
	silence: '#94a3b8',
	spell_damage: '#fb923c',
	spellburst: '#f0abfc',
	spell_trigger: '#e879f9',
	spellDamage: '#fb923c',
	stealth: '#94a3b8',
	pet_evolution: '#a3e635',
	master_evolution: '#bef264',
	submerge: '#67e8f9',
	taunt: '#fbbf24',
	tradeable: '#5eead4',
	wager: '#f9a8d4',
	windfury: '#67e8f9',
	yggdrasil_golem: '#86efac',
};

const FALLBACK_ACCENT_BY_TONE: Readonly<Record<string, string>> = {
	combat: '#fb7185',
	choice: '#60a5fa',
	filter: '#cbd5e1',
	poker: '#f9a8d4',
	progression: '#a3e635',
	resource: '#5eead4',
	state: '#a78bfa',
	summon: '#c084fc',
	theme: '#f472b6',
	trigger: '#e879f9',
};

const MUTED_KEYWORD_ACCENT = '#94a3b8';

export const getCardKeywordAccent = (
	keyword: string,
	tone: string,
	importance: CardRenderImportance,
): string => {
	if (importance === 'filter-only' || importance === 'metadata' || importance === 'hidden') {
		return MUTED_KEYWORD_ACCENT;
	}
	if (importance === 'contextual') return '#7dd3fc';
	return CARD_KEYWORD_ACCENT_COLORS[keyword] ?? FALLBACK_ACCENT_BY_TONE[tone] ?? '#60a5fa';
};

export const CARD_KEYWORD_ACCENT_BACKGROUND = '#030810';
