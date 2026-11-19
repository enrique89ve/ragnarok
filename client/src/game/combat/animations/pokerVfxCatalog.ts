import type { ParticleColor } from '../../animations/PixiParticleCanvas';
import {
	ARENA_VFX_TARGETS,
	getArenaVfxCommunitySlot,
	getArenaVfxHoleCardsTarget,
	getArenaVfxNextUnrevealedCommunitySlot,
	getArenaVfxSpellTrayCards,
	getArenaVfxStaminaTarget,
	getArenaVfxTarget,
	getArenaVfxWagerTargets,
	getBoundArenaVfxQueryRoot,
	getElementCenter,
	type ArenaVfxOwner,
	type QueryRoot,
} from '../arenaVfxTargets';
import { resolveArenaEffectPoint } from '@/game/effects/presentation';
import {
	resolveContractViewportPoint,
	resolveHostileArenaZoneTarget,
} from '../vfx/arenaCoordinateContract';
import type { PokerSpellEffectType } from '../../types/CardTypes';
import { CombatAction } from '../../types/PokerCombatTypes';
import type { SpellCastEvent, WagerActivatedEvent, WagerType } from '../vfx/events';
import { resolveWagerActivatedTarget } from '../vfx/events';
import type { EffectEndpoint } from '@/game/effects/core/effectIntentTypes';

export type PokerVfxMotionKind = 'local-pulse' | 'travel-impact' | 'stake-to-pot';

export type PokerSpellSignature =
	| 'prophecy'
	| 'ward'
	| 'curse'
	| 'board-macro'
	| 'swap-arc';

export type PokerSpellTargetKind =
	| 'caster-hole-cards'
	| 'opponent-hole-cards'
	| 'both-hole-cards'
	| 'caster-stamina'
	| 'opponent-stamina'
	| 'opponent-hero'
	| 'stake-sink'
	| 'next-community-slot'
	| 'river-slot'
	| 'all-community-slots'
	| 'board-center';

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
	readonly targetInstanceId?: string | null;
	readonly targetHasCards?: boolean;
	readonly opposingCardCount?: number;
	readonly stakeAmount?: number;
	readonly echoTargets?: readonly {
		readonly point: PokerVfxPoint;
		readonly instanceId: string | null;
	}[];
	readonly signature?: PokerSpellSignature;
	readonly targetKind?: PokerSpellTargetKind;
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
	stamina_shield: { primary: '#38bdf8', secondary: '#bae6fd', glow: 'rgba(56,189,248,0.6)' },
	hole_swap: { primary: '#f5c542', secondary: '#fde68a', glow: 'rgba(245,197,66,0.55)' },
	echo_bet: { primary: '#f5c542', secondary: '#7dd3fc', glow: 'rgba(245,197,66,0.55)' },
	shadow_fold: { primary: '#64748b', secondary: '#94a3b8', glow: 'rgba(100,116,139,0.55)' },
	run_twice: { primary: '#38bdf8', secondary: '#e5e7eb', glow: 'rgba(56,189,248,0.5)' },
	river_rewrite: { primary: '#38bdf8', secondary: '#7dd3fc', glow: 'rgba(56,189,248,0.58)' },
	norns_glimpse: { primary: '#f5c542', secondary: '#fde68a', glow: 'rgba(245,197,66,0.55)' },
	fold_curse: { primary: '#dc2626', secondary: '#fca5a5', glow: 'rgba(220,38,38,0.6)' },
	blood_bet: { primary: '#dc2626', secondary: '#fca5a5', glow: 'rgba(220,38,38,0.65)' },
	void_stare: { primary: '#38bdf8', secondary: '#a78bfa', glow: 'rgba(56,189,248,0.5)' },
	all_in_aura: { primary: '#f5c542', secondary: '#fde68a', glow: 'rgba(245,197,66,0.6)' },
	ragnarok_gambit: { primary: '#dc2626', secondary: '#f5c542', glow: 'rgba(220,38,38,0.65)' },
	destiny_override: { primary: '#f5c542', secondary: '#fef3c7', glow: 'rgba(245,197,66,0.6)' },
};

export interface PokerSpellSpatialSpec {
	readonly signature: PokerSpellSignature;
	readonly motion: PokerVfxMotionKind;
	readonly targetKind: PokerSpellTargetKind;
}

/**
 * Spatial Intentionality Map for all 15 Poker Spells:
 * Every spell aims directly at the physical arena element it mechanically alters.
 */
export const POKER_SPELL_SPATIAL_MAP: Readonly<Record<PokerSpellEffectType, PokerSpellSpatialSpec>> = {
	// A. Prophecy / Reveal (information — no hit shake)
	fate_peek:        { signature: 'prophecy',    motion: 'travel-impact', targetKind: 'opponent-hole-cards' },
	void_stare:       { signature: 'prophecy',    motion: 'travel-impact', targetKind: 'opponent-hole-cards' },
	norns_glimpse:    { signature: 'prophecy',    motion: 'travel-impact', targetKind: 'next-community-slot' },
	hole_swap:        { signature: 'swap-arc',    motion: 'travel-impact', targetKind: 'both-hole-cards' },

	// B. Shield / Self-Ward / Empower (protective/rising — no recoil)
	stamina_shield:   { signature: 'ward',        motion: 'travel-impact', targetKind: 'caster-stamina' },
	bluff_rune:       { signature: 'ward',        motion: 'travel-impact', targetKind: 'caster-hole-cards' },
	shadow_fold:      { signature: 'ward',        motion: 'travel-impact', targetKind: 'caster-hole-cards' },
	echo_bet:         { signature: 'ward',        motion: 'stake-to-pot',  targetKind: 'stake-sink' },
	all_in_aura:      { signature: 'ward',        motion: 'stake-to-pot',  targetKind: 'stake-sink' },

	// C. Curse / Hostile Pressure
	fold_curse:       { signature: 'curse',       motion: 'travel-impact', targetKind: 'opponent-stamina' },
	blood_bet:        { signature: 'curse',       motion: 'travel-impact', targetKind: 'opponent-hero' },

	// D. Macro Board / Destiny Rewrite
	river_rewrite:    { signature: 'board-macro', motion: 'travel-impact', targetKind: 'river-slot' },
	destiny_override: { signature: 'board-macro', motion: 'travel-impact', targetKind: 'river-slot' },
	run_twice:        { signature: 'board-macro', motion: 'travel-impact', targetKind: 'all-community-slots' },
	ragnarok_gambit:  { signature: 'board-macro', motion: 'travel-impact', targetKind: 'board-center' },
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

function oppositeSide(side: ArenaVfxOwner): ArenaVfxOwner {
	return side === 'player' ? 'opponent' : 'player';
}

function heroCastPoint(side: ArenaVfxOwner): PokerVfxPoint | null {
	return resolveArenaEffectPoint({ entityId: `${side}-hero`, anchor: 'hero-body' }, arenaQueryRoot());
}

function staminaPoint(side: ArenaVfxOwner): PokerVfxPoint | null {
	const rail = getArenaVfxStaminaTarget(side, arenaQueryRoot());
	return rail ? getElementCenter(rail, 0.5) : heroCastPoint(side);
}

function holeCardsPoint(side: ArenaVfxOwner): PokerVfxPoint | null {
	const hole = getArenaVfxHoleCardsTarget(side, arenaQueryRoot());
	return hole ? getElementCenter(hole, 0.5) : heroCastPoint(side);
}

function stakeSinkPoint(): PokerVfxPoint | null {
	const sink = getArenaVfxTarget(ARENA_VFX_TARGETS.stakeSink, arenaQueryRoot());
	if (sink) return getElementCenter(sink, 0.5);
	return resolveContractViewportPoint('clashCenter', arenaQueryRoot());
}

function communitySlotPoint(slotIndex: number): PokerVfxPoint | null {
	const slot = getArenaVfxCommunitySlot(slotIndex, arenaQueryRoot());
	return slot ? getElementCenter(slot, 0.5) : stakeSinkPoint();
}

function nextCommunitySlotPoint(): PokerVfxPoint | null {
	const slot = getArenaVfxNextUnrevealedCommunitySlot(arenaQueryRoot());
	return slot ? getElementCenter(slot, 0.5) : communitySlotPoint(2);
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

function resolveSpellTargetPoint(
	targetKind: PokerSpellTargetKind,
	caster: ArenaVfxOwner,
): PokerVfxPoint | null {
	const foe = oppositeSide(caster);
	switch (targetKind) {
		case 'caster-hole-cards':
			return holeCardsPoint(caster);
		case 'opponent-hole-cards':
		case 'both-hole-cards':
			return holeCardsPoint(foe);
		case 'caster-stamina':
			return staminaPoint(caster);
		case 'opponent-stamina':
			return staminaPoint(foe);
		case 'opponent-hero':
			return heroCastPoint(foe);
		case 'stake-sink':
			return stakeSinkPoint();
		case 'next-community-slot':
			return nextCommunitySlotPoint();
		case 'river-slot':
			return communitySlotPoint(4);
		case 'all-community-slots':
		case 'board-center':
			return communitySlotPoint(2) ?? stakeSinkPoint();
		default: {
			const exhaustive: never = targetKind;
			return exhaustive;
		}
	}
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

export function spellSpatialForType(effectType: PokerSpellEffectType): PokerSpellSpatialSpec {
	return POKER_SPELL_SPATIAL_MAP[effectType] ?? POKER_SPELL_SPATIAL_MAP.bluff_rune;
}

export function spellMotionForType(effectType: PokerSpellEffectType): PokerVfxMotionKind {
	return spellSpatialForType(effectType).motion;
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
	const spatial = spellSpatialForType(event.effectType);

	const sourcePoint = event.effectType === 'hole_swap'
		? holeCardsPoint(event.side)
		: event.effectType === 'ragnarok_gambit'
			? (communitySlotPoint(2) ?? stakeSinkPoint() ?? heroCastPoint(event.side))
			: (heroCastPoint(event.side) ?? primarySpellTrayPoint());

	const targetPoint = resolveSpellTargetPoint(spatial.targetKind, event.side) ?? sourcePoint;

	return {
		motion: spatial.motion,
		sourcePoint,
		targetPoint,
		side: event.side,
		palette,
		sourceInstanceId: event.sourceInstanceId,
		signature: spatial.signature,
		targetKind: spatial.targetKind,
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
	const spatial = spellSpatialForType(effectType);
	const sourcePoint = effectType === 'hole_swap'
		? holeCardsPoint(side)
		: heroCastPoint(side);
	const targetPoint = resolveSpellTargetPoint(spatial.targetKind, side) ?? sourcePoint;
	return {
		motion: spatial.motion,
		sourcePoint,
		targetPoint,
		side,
		palette,
		signature: spatial.signature,
		targetKind: spatial.targetKind,
	};
}

export function resolvePokerVfxIntentForRaise(side: ArenaVfxOwner): PokerVfxResolvedIntent {
	// Directional arena pressure:
	// - Player Hero (bottom-left) -> Opponent's top battlefield zone (rotates across enemy cards)
	// - Opponent Hero (top-left) -> Player's bottom battlefield zone (rotates across player cards)
	// Empty opposing zone -> `targetHasCards: false` for subtle, restrained reception.
	const hostile = resolveHostileArenaZoneTarget(side, arenaQueryRoot());
	return {
		motion: 'stake-to-pot',
		sourcePoint: heroCastPoint(side),
		targetPoint: hostile?.point ?? stakeSinkPoint() ?? resolveContractViewportPoint('clashCenter'),
		side,
		palette: GOLD_PALETTE,
		targetInstanceId: hostile?.instanceId ?? null,
		targetHasCards: hostile?.hasCards ?? false,
		opposingCardCount: hostile?.opposingCardCount ?? 0,
		echoTargets: hostile?.echoTargets.map(t => ({ point: t.point, instanceId: t.instanceId })) ?? [],
	};
}

export function resolvePokerVfxIntentForReraise(side: ArenaVfxOwner): PokerVfxResolvedIntent {
	const hostile = resolveHostileArenaZoneTarget(side, arenaQueryRoot());
	return {
		motion: 'stake-to-pot',
		sourcePoint: heroCastPoint(side),
		targetPoint: hostile?.point ?? stakeSinkPoint() ?? resolveContractViewportPoint('clashCenter'),
		side,
		palette: { primary: '#f59e0b', secondary: '#ef4444', glow: 'rgba(245,158,11,0.65)' },
		targetInstanceId: hostile?.instanceId ?? null,
		targetHasCards: hostile?.hasCards ?? false,
		opposingCardCount: hostile?.opposingCardCount ?? 0,
		echoTargets: hostile?.echoTargets.map(t => ({ point: t.point, instanceId: t.instanceId })) ?? [],
	};
}

export interface CallClashEndpoints {
	readonly player: PokerVfxPoint | null;
	readonly opponent: PokerVfxPoint | null;
	readonly center: PokerVfxPoint | null;
}

export function resolveCallClashEndpoints(): CallClashEndpoints {
	const player = heroCastPoint('player');
	const opponent = heroCastPoint('opponent');
	const center = stakeSinkPoint()
		?? (player && opponent ? midpoint(player, opponent) : player ?? opponent);
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
