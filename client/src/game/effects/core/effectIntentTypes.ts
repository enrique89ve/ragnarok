import type {
	GameEffectDomain,
	GameEffectChannel,
	GameEffectIntent,
	GameFeedbackTone,
} from './gameEffectTypes';
import { createEffectRandom } from './effectRandom';

export type EffectAnchor =
	| 'center'
	| 'hero-body'
	| 'health-bar'
	| 'card-body'
	| 'board-slot';

export type AttackMotion = 'melee' | 'projectile' | 'instant';
export type AttackImpact = 'damage' | 'blocked' | 'critical' | 'miss';
export type EffectPriority = 'normal' | 'high' | 'critical';
export type AttackVisualPath = 'straight' | 'arc' | 'lance';
export type AttackVisualImpact = 'burst' | 'shards' | 'rune';

export type AttackVisualProfile = {
	readonly path: AttackVisualPath;
	readonly impact: AttackVisualImpact;
	readonly direction: 'left' | 'right';
	readonly intensity: 'soft' | 'strong';
	readonly sourceJitter: number;
	readonly targetJitter: number;
};

export interface EffectEndpoint {
	readonly entityId: string;
	readonly anchor: EffectAnchor;
}

export interface AttackEffectIntent {
	readonly id: string;
	readonly domain: GameEffectDomain;
	readonly channel: GameEffectChannel;
	readonly intent: GameEffectIntent;
	readonly kind: 'attack';
	readonly source: EffectEndpoint;
	readonly target: EffectEndpoint;
	readonly impact: {
		readonly type: AttackImpact;
		readonly amount: number;
		readonly lethal: boolean;
	};
	readonly motion: {
		readonly type: AttackMotion;
		readonly durationMs: number;
	};
	readonly visual: AttackVisualProfile;
	readonly priority: EffectPriority;
	readonly timestamp: number;
}

export interface AttackEffectInput {
	readonly id: string;
	readonly domain?: GameEffectDomain;
	readonly sourceId: string;
	readonly targetId: string;
	readonly damage: number;
	readonly sourceAnchor?: EffectAnchor;
	readonly targetAnchor?: EffectAnchor;
	readonly motion?: AttackMotion;
	readonly durationMs?: number;
	readonly lethal?: boolean;
	readonly priority?: EffectPriority;
	readonly timestamp?: number;
}

export type FeedbackPresentation = 'feedback-stack' | 'toast' | 'banner' | 'silent';

export interface GameFeedbackEffectIntent {
	readonly id: string;
	readonly domain: GameEffectDomain;
	readonly channel: 'feedback';
	readonly intent: GameEffectIntent;
	readonly kind: 'feedback';
	readonly messageId: string;
	readonly text: string;
	readonly tone: GameFeedbackTone;
	readonly presentation: FeedbackPresentation;
	readonly durationMs: number;
	readonly priority: EffectPriority;
	readonly timestamp: number;
}

export const EFFECT_TIMING = {
	minAttackTravelMs: 120,
	maxAttackTravelMs: 900,
	defaultAttackTravelMs: 420,
} as const;

function boundedDuration(durationMs: number | undefined): number {
	const duration = durationMs ?? EFFECT_TIMING.defaultAttackTravelMs;
	return Math.min(EFFECT_TIMING.maxAttackTravelMs, Math.max(EFFECT_TIMING.minAttackTravelMs, duration));
}

function createAttackVisualProfile(seed: string, impact: AttackImpact): AttackVisualProfile {
	const random = createEffectRandom(`poker-attack:${seed}`);
	return {
		path: random.weightedPick([
			{ value: 'straight', weight: 5 },
			{ value: 'arc', weight: 3 },
			{ value: 'lance', weight: 2 },
		]),
		impact: impact === 'critical'
			? 'shards'
			: random.pick(['burst', 'shards', 'rune'] as const),
		direction: random.pick(['left', 'right'] as const),
		intensity: impact === 'critical' ? 'strong' : random.pick(['soft', 'strong'] as const),
		sourceJitter: random.jitter(0.08),
		targetJitter: random.jitter(0.06),
	};
}

export function createAttackEffectIntent(input: AttackEffectInput): AttackEffectIntent {
	const amount = Math.max(0, input.damage);
	return {
		id: input.id,
		domain: input.domain ?? 'shared',
		channel: 'motion',
		intent: 'target-impact',
		kind: 'attack',
		source: {
			entityId: input.sourceId,
			anchor: input.sourceAnchor ?? 'center',
		},
		target: {
			entityId: input.targetId,
			anchor: input.targetAnchor ?? 'center',
		},
		impact: {
			type: amount > 0 ? (input.lethal ? 'critical' : 'damage') : 'miss',
			amount,
			lethal: input.lethal ?? false,
		},
		motion: {
			type: input.motion ?? 'projectile',
			durationMs: boundedDuration(input.durationMs),
		},
		visual: createAttackVisualProfile(input.id, amount > 0
			? (input.lethal ? 'critical' : 'damage')
			: 'miss'),
		priority: input.priority ?? 'normal',
		timestamp: input.timestamp ?? Date.now(),
	};
}
