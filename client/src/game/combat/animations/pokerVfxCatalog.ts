import type { ParticleColor } from '../../animations/PixiParticleCanvas';
import {
	ARENA_VFX_TARGETS,
	getArenaVfxCommunitySlot,
	getArenaVfxSpellTrayCards,
	getArenaVfxTarget,
	getArenaVfxWagerTargets,
	getBoundArenaVfxQueryRoot,
	getElementCenter,
	type ArenaVfxOwner,
	type QueryRoot,
} from '../arenaVfxTargets';
import { resolveArenaEffectPoint } from '@/game/effects/presentation';
import type { PokerSpellEffectType } from '../../types/CardTypes';
import { CombatAction } from '../../types/PokerCombatTypes';
import type { SpellCastEvent, WagerActivatedEvent, WagerType } from '../vfx/events';
import { resolveWagerActivatedTarget } from '../vfx/events';
import type { EffectEndpoint } from '@/game/effects/core/effectIntentTypes';

export type PokerVfxMotionKind = 'local-pulse' | 'travel-impact' | 'stake-to-pot';

export interface PokerVfxPoint {
	readonly x: number;
	readonly y: number;
}

export interface PokerVfxResolvedIntent {
	readonly motion: PokerVfxMotionKind;
	readonly sourcePoint: PokerVfxPoint | null;
	readonly targetPoint: PokerVfxPoint | null;
	readonly side: ArenaVfxOwner;
	readonly palette: ParticleColor;
	readonly sourceInstanceId?: string;
}

const GOLD_PALETTE: ParticleColor = {
	primary: '#fbbf24',
	secondary: '#fde68a',
	glow: 'rgba(251,191,36,0.6)',
};

const WHITE_PALETTE: ParticleColor = {
	primary: '#ffffff',
	secondary: '#e2e8f0',
	glow: 'rgba(255,255,255,0.6)',
};

export const POKER_SPELL_PALETTES: Record<PokerSpellEffectType, ParticleColor> = {
	bluff_rune: { primary: '#38bdf8', secondary: '#7dd3fc', glow: 'rgba(56,189,248,0.55)' },
	fate_peek: { primary: '#38bdf8', secondary: '#e5e7eb', glow: 'rgba(56,189,248,0.55)' },
	stamina_shield: { primary: '#38bdf8', secondary: '#7dd3fc', glow: 'rgba(56,189,248,0.55)' },
	hole_swap: { primary: '#f5c542', secondary: '#b7791f', glow: 'rgba(245,197,66,0.5)' },
	echo_bet: { primary: '#38bdf8', secondary: '#7dd3fc', glow: 'rgba(56,189,248,0.5)' },
	shadow_fold: { primary: '#334155', secondary: '#111827', glow: 'rgba(51,65,85,0.55)' },
	run_twice: { primary: '#38bdf8', secondary: '#e5e7eb', glow: 'rgba(56,189,248,0.45)' },
	river_rewrite: { primary: '#38bdf8', secondary: '#7dd3fc', glow: 'rgba(56,189,248,0.55)' },
	norns_glimpse: { primary: '#f5c542', secondary: '#f59e0b', glow: 'rgba(245,197,66,0.5)' },
	fold_curse: { primary: '#dc2626', secondary: '#fca5a5', glow: 'rgba(220,38,38,0.55)' },
	blood_bet: { primary: '#dc2626', secondary: '#fca5a5', glow: 'rgba(220,38,38,0.6)' },
	void_stare: { primary: '#05070d', secondary: '#38bdf8', glow: 'rgba(56,189,248,0.4)' },
	all_in_aura: { primary: '#f5c542', secondary: '#fde68a', glow: 'rgba(245,197,66,0.55)' },
	ragnarok_gambit: { primary: '#dc2626', secondary: '#fca5a5', glow: 'rgba(220,38,38,0.6)' },
	destiny_override: { primary: '#f5c542', secondary: '#fef3c7', glow: 'rgba(245,197,66,0.55)' },
};

export const WAGER_PALETTES: Record<WagerType, ParticleColor> = {
	showdown_win_armor: { primary: '#fbbf24', secondary: '#fde68a', glow: 'rgba(251,191,36,0.6)' },
	showdown_coin_flip: { primary: '#facc15', secondary: '#fef9c3', glow: 'rgba(250,204,21,0.6)' },
	showdown_win_rank_damage: { primary: '#fbbf24', secondary: '#fde68a', glow: 'rgba(251,191,36,0.6)' },
	showdown_aoe_damage: { primary: '#f59e0b', secondary: '#fcd34d', glow: 'rgba(245,158,11,0.6)' },
	showdown_hand_rank_draw: { primary: '#fbbf24', secondary: '#fde68a', glow: 'rgba(251,191,36,0.6)' },
	showdown_win_draw_and_damage: { primary: '#fbbf24', secondary: '#fde68a', glow: 'rgba(251,191,36,0.6)' },
	double_showdown_multiplier: { primary: '#fde047', secondary: '#fef08a', glow: 'rgba(253,224,71,0.6)' },
	all_in_bonus_with_cost: { primary: '#dc2626', secondary: '#fca5a5', glow: 'rgba(220,38,38,0.6)' },
	on_opponent_fold_heal: { primary: '#84cc16', secondary: '#bef264', glow: 'rgba(132,204,22,0.6)' },
	fold_penalty_to_healing: { primary: '#84cc16', secondary: '#bef264', glow: 'rgba(132,204,22,0.6)' },
	all_in_buff_minions: { primary: '#fbbf24', secondary: '#fde68a', glow: 'rgba(251,191,36,0.6)' },
	reveal_opponent_hole_cards: { primary: '#fbbf24', secondary: '#fde68a', glow: 'rgba(251,191,36,0.6)' },
	peek_next_community_card: { primary: '#fbbf24', secondary: '#fde68a', glow: 'rgba(251,191,36,0.6)' },
	hide_bet_actions: { primary: '#fbbf24', secondary: '#fde68a', glow: 'rgba(251,191,36,0.6)' },
	increase_min_bet: { primary: '#fbbf24', secondary: '#fde68a', glow: 'rgba(251,191,36,0.6)' },
	reduce_fold_penalty: { primary: '#fbbf24', secondary: '#fde68a', glow: 'rgba(251,191,36,0.6)' },
	double_blinds_bonus_multiplier: { primary: '#fbbf24', secondary: '#fde68a', glow: 'rgba(251,191,36,0.6)' },
	betting_round_damage: { primary: '#fbbf24', secondary: '#fde68a', glow: 'rgba(251,191,36,0.6)' },
	hand_rank_upgrade: { primary: '#facc15', secondary: '#fef9c3', glow: 'rgba(250,204,21,0.6)' },
};

function arenaQueryRoot(): QueryRoot | null {
	return getBoundArenaVfxQueryRoot();
}

function heroCastPoint(side: ArenaVfxOwner): PokerVfxPoint | null {
	return resolveArenaEffectPoint({ entityId: `${side}-hero`, anchor: 'hero-body' }, arenaQueryRoot());
}

function stakeSinkPoint(): PokerVfxPoint | null {
	const sink = getArenaVfxTarget(ARENA_VFX_TARGETS.stakeSink, arenaQueryRoot());
	if (sink) return getElementCenter(sink, 0.5);
	const centerSlot = getArenaVfxCommunitySlot(2, arenaQueryRoot());
	return centerSlot ? getElementCenter(centerSlot, 0.5) : null;
}

function primaryWagerCardPoint(side: ArenaVfxOwner): PokerVfxPoint | null {
	const wager = getArenaVfxWagerTargets(side, arenaQueryRoot())[0];
	return wager ? getElementCenter(wager, 0.5) : null;
}

function primarySpellTrayPoint(): PokerVfxPoint | null {
	const spell = getArenaVfxSpellTrayCards(arenaQueryRoot())[0];
	return spell ? getElementCenter(spell, 0.5) : null;
}

function midpoint(a: PokerVfxPoint, b: PokerVfxPoint): PokerVfxPoint {
	return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function withFallback(point: PokerVfxPoint | null, fallback: PokerVfxPoint | null): PokerVfxPoint | null {
	return point ?? fallback;
}

function pointForEndpoint(endpoint: EffectEndpoint | undefined): PokerVfxPoint | null {
	if (!endpoint) return null;
	return resolveArenaEffectPoint(endpoint, arenaQueryRoot());
}

function endpointsDiffer(
	source: EffectEndpoint | undefined,
	target: EffectEndpoint | undefined,
): boolean {
	if (!source || !target) return false;
	return source.entityId !== target.entityId || source.anchor !== target.anchor;
}

/** Presentation-only motion when event carries explicit endpoints. */
export function wagerMotionForType(wagerType: WagerType): PokerVfxMotionKind {
	switch (wagerType) {
		case 'betting_round_damage':
		case 'showdown_win_rank_damage':
		case 'showdown_aoe_damage':
		case 'showdown_win_draw_and_damage':
		case 'showdown_coin_flip':
		case 'all_in_bonus_with_cost':
		case 'on_opponent_fold_heal':
		case 'fold_penalty_to_healing':
			return 'travel-impact';
		default:
			return 'local-pulse';
	}
}

const OPPONENT_HERO_SPELLS = new Set<PokerSpellEffectType>([
	'fold_curse',
	'blood_bet',
	'void_stare',
]);

export function spellMotionForType(effectType: PokerSpellEffectType): PokerVfxMotionKind {
	if (OPPONENT_HERO_SPELLS.has(effectType)) return 'travel-impact';
	return 'travel-impact';
}

export function resolvePokerVfxIntentFromWagerEvent(
	event: WagerActivatedEvent,
): PokerVfxResolvedIntent {
	const palette = WAGER_PALETTES[event.wagerType] ?? WAGER_PALETTES.showdown_win_armor;
	const sourceEndpoint =
		event.source
		?? (event.sourceInstanceId
			? { entityId: event.sourceInstanceId, anchor: 'card-body' as const }
			: undefined);
	const targetEndpoint = event.target ?? resolveWagerActivatedTarget(event.wagerType, event.side);

	const sourcePoint = pointForEndpoint(sourceEndpoint)
		?? primaryWagerCardPoint(event.side);
	const targetPoint = pointForEndpoint(targetEndpoint)
		?? (wagerMotionForType(event.wagerType) === 'local-pulse' ? sourcePoint : null);

	const motion: PokerVfxMotionKind = endpointsDiffer(sourceEndpoint, targetEndpoint)
		? 'travel-impact'
		: wagerMotionForType(event.wagerType);

	return {
		motion,
		sourcePoint,
		targetPoint: motion === 'local-pulse' ? sourcePoint : targetPoint,
		side: event.side,
		palette,
		sourceInstanceId: event.sourceInstanceId,
	};
}

export function resolvePokerVfxIntentFromSpellEvent(
	event: SpellCastEvent,
): PokerVfxResolvedIntent {
	const palette = POKER_SPELL_PALETTES[event.effectType] ?? POKER_SPELL_PALETTES.bluff_rune;
	const opponentHero: EffectEndpoint = {
		entityId: event.side === 'player' ? 'opponent-hero' : 'player-hero',
		anchor: OPPONENT_HERO_SPELLS.has(event.effectType) ? 'health-bar' : 'hero-body',
	};
	const sourceEndpoint = event.source
		?? (event.sourceInstanceId
			? { entityId: event.sourceInstanceId, anchor: 'card-body' as const }
			: undefined);

	let targetEndpoint: EffectEndpoint | undefined;
	if (OPPONENT_HERO_SPELLS.has(event.effectType)) {
		targetEndpoint = opponentHero;
	} else if (event.effectType === 'fate_peek' || event.effectType === 'norns_glimpse') {
		targetEndpoint = opponentHero;
	} else if (event.effectType === 'hole_swap') {
		targetEndpoint = { entityId: `${event.side}-hero`, anchor: 'hero-body' };
	}

	const sourcePoint = pointForEndpoint(sourceEndpoint)
		?? heroCastPoint(event.side)
		?? primarySpellTrayPoint();
	const targetPoint = pointForEndpoint(targetEndpoint)
		?? withFallback(primarySpellTrayPoint(), sourcePoint);

	return {
		motion: spellMotionForType(event.effectType),
		sourcePoint,
		targetPoint,
		side: event.side,
		palette,
		sourceInstanceId: event.sourceInstanceId,
	};
}

export function resolvePokerVfxIntentForWager(
	wagerType: WagerType,
	side: ArenaVfxOwner,
): PokerVfxResolvedIntent {
	const palette = WAGER_PALETTES[wagerType] ?? WAGER_PALETTES.showdown_win_armor;
	const cardPoint = primaryWagerCardPoint(side);
	return {
		motion: 'local-pulse',
		sourcePoint: cardPoint,
		targetPoint: cardPoint,
		side,
		palette,
	};
}

export function resolvePokerVfxIntentForSpell(
	effectType: PokerSpellEffectType,
	side: ArenaVfxOwner,
): PokerVfxResolvedIntent {
	const palette = POKER_SPELL_PALETTES[effectType] ?? POKER_SPELL_PALETTES.bluff_rune;
	const sourcePoint = heroCastPoint(side);
	const targetPoint = withFallback(primarySpellTrayPoint(), sourcePoint);
	return {
		motion: 'travel-impact',
		sourcePoint,
		targetPoint,
		side,
		palette,
	};
}

export function resolvePokerVfxIntentForRaise(side: ArenaVfxOwner): PokerVfxResolvedIntent {
	return {
		motion: 'stake-to-pot',
		sourcePoint: heroCastPoint(side),
		targetPoint: stakeSinkPoint(),
		side,
		palette: GOLD_PALETTE,
	};
}

export function resolvePokerVfxIntentForReraise(side: ArenaVfxOwner): PokerVfxResolvedIntent {
	return resolvePokerVfxIntentForRaise(side);
}

export interface CallClashEndpoints {
	readonly player: PokerVfxPoint | null;
	readonly opponent: PokerVfxPoint | null;
	readonly center: PokerVfxPoint | null;
}

export function resolveCallClashEndpoints(): CallClashEndpoints {
	const player = heroCastPoint('player');
	const opponent = heroCastPoint('opponent');
	const center = player && opponent ? midpoint(player, opponent) : player ?? opponent;
	return { player, opponent, center };
}

export function resolvePokerVfxIntentForCall(): PokerVfxResolvedIntent {
	const { player, center } = resolveCallClashEndpoints();
	return {
		motion: 'travel-impact',
		sourcePoint: player,
		targetPoint: center,
		side: 'player',
		palette: WHITE_PALETTE,
	};
}

export function resolvePokerVfxIntentForBettingAction(
	action: CombatAction,
	side: ArenaVfxOwner,
): PokerVfxResolvedIntent | null {
	switch (action) {
		case CombatAction.ATTACK:
			return resolvePokerVfxIntentForRaise(side);
		case CombatAction.COUNTER_ATTACK:
			return resolvePokerVfxIntentForReraise(side);
		case CombatAction.ENGAGE:
			return resolvePokerVfxIntentForCall();
		default:
			return null;
	}
}

/** Stable entry for handlers once event payloads carry optional overrides. */
export function resolvePokerVfxIntent(
	kind: 'wager' | 'spell' | 'betting',
	input:
		| WagerActivatedEvent
		| SpellCastEvent
		| { wagerType: WagerType; side: ArenaVfxOwner }
		| { effectType: PokerSpellEffectType; side: ArenaVfxOwner }
		| { action: CombatAction; side: ArenaVfxOwner },
): PokerVfxResolvedIntent | null {
	if (kind === 'wager') {
		if ('type' in input && input.type === 'wagerActivated') {
			return resolvePokerVfxIntentFromWagerEvent(input);
		}
		if ('wagerType' in input) {
			return resolvePokerVfxIntentForWager(input.wagerType, input.side);
		}
	}
	if (kind === 'spell') {
		if ('type' in input && input.type === 'spellCast') {
			return resolvePokerVfxIntentFromSpellEvent(input);
		}
		if ('effectType' in input) {
			return resolvePokerVfxIntentForSpell(input.effectType, input.side);
		}
	}
	if (kind === 'betting' && 'action' in input) {
		return resolvePokerVfxIntentForBettingAction(input.action, input.side);
	}
	return null;
}

export { GOLD_PALETTE, WHITE_PALETTE };