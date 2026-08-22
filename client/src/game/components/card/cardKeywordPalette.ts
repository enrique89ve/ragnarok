import type { CardRenderImportance } from './cardPresentationContract';

/**
 * Visual accents for keyword chips.
 *
 * The card surface is intentionally very dark, so these accents stay in a
 * bright range for surfaces that need a per-keyword accent. Card chrome uses
 * `data-tone` for the visible role color so visual meaning stays consistent.
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
	dormant: '#b9a6ff',
	dual_class: '#d7e0ed',
	echo: '#76e6f4',
	einherjar: '#34d399',
	elusive: '#67e8f9',
	enrage: '#fb923c',
	fateweave: '#e879f9',
	flying: '#93c5fd',
	freeze: '#8fe4ff',
	freeze_on_damage: '#22d3ee',
	frenzy: '#facc15',
	frozen: '#8fe4ff',
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
	secret: '#ffd166',
	sidequest: '#fcd34d',
	silence: '#d7e0ed',
	spell_damage: '#fb923c',
	spellburst: '#f0abfc',
	spell_trigger: '#e879f9',
	stealth: '#d7e0ed',
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
	combat: '#ff7b84',
	choice: '#79cfff',
	filter: '#d7e0ed',
	poker: '#ff8bd4',
	progression: '#b9f36f',
	resource: '#65e1d2',
	state: '#b9a6ff',
	summon: '#d8b4ff',
	theme: '#f5acd8',
	trigger: '#ffd166',
};

const MUTED_KEYWORD_ACCENT = '#d7e0ed';

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
