/**
 * gameIcons.ts — Centralized icon map for game UI
 *
 * All game icons in one place. Currently uses Unicode characters styled via CSS.
 * To upgrade to SVGs later, change this file only — all 34+ consumers import from here.
 */

// Combat & card type icons
export const ICON = {
	// Card types
	SPELL: '◆',
	WEAPON: '†',
	ARTIFACT: '✦',
	ARMOR: '◈',
	MINION: '♟',

	// Resources
	MANA: '◇',
	STAMINA: '⚡',
	ARMOR_STAT: '◈',
	HEALTH: '♥',
	ATTACK: '⚔',

	// Poker
	CARD_BACK: '▣',
	HAND_STRENGTH: '★',

	// Gear slots
	HELM: '⛑',
	CHEST: '⬡',
	GREAVES: '▽',

	// Elements
	FIRE: '🔥',
	WATER: '💧',
	GRASS: '🌿',
	ELECTRIC: '⚡',
	LIGHT: '✦',
	DARK: '◆',
	ICE: '❄',

	// Actions
	FIRST_STRIKE: '⚔',
	REALM_EFFECT: '◎',

	// Misc
	LOCK: '🔒',
	RUNE: '᛭',
} as const;

export type GameIcon = typeof ICON[keyof typeof ICON];
