/**
 * Gameplay effects are consequences of game state, not interface motion.
 * Keep this vocabulary small: every new effect must belong to a domain and a
 * delivery channel before an adapter can render it.
 */
export const GAME_EFFECT_DOMAINS = {
	shared: 'shared',
	poker: 'poker',
	chess: 'chess',
} as const;

export type GameEffectDomain = (typeof GAME_EFFECT_DOMAINS)[keyof typeof GAME_EFFECT_DOMAINS];

export const GAME_EFFECT_CHANNELS = {
	motion: 'motion',
	audio: 'audio',
	feedback: 'feedback',
} as const;

export type GameEffectChannel = (typeof GAME_EFFECT_CHANNELS)[keyof typeof GAME_EFFECT_CHANNELS];

export type GameFeedbackTone = 'info' | 'success' | 'warning' | 'error';

export type GameEffectIntent =
	| 'state-change'
	| 'action-result'
	| 'resource-change'
	| 'target-impact'
	| 'phase-reveal'
	| 'resolution';

export type GameEffectDescriptor = {
	readonly domain: GameEffectDomain;
	readonly channel: GameEffectChannel;
	readonly intent: GameEffectIntent;
	readonly key: string;
};
