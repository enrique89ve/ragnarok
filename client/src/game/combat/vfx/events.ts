import {
	ARENA_VFX_TARGETS,
	type ArenaVfxLayer,
	type ArenaVfxOwner,
	type ArenaVfxTarget,
} from '../arenaVfxTargets';
import { emitVisualEvent } from './emitter';
import type { PokerSpellEffectType } from '../../types/CardTypes';
import type { CombatAction, CombatPhase, PokerCard, PokerHandRank } from '../../types/PokerCombatTypes';
import type { AttackEffectIntent, EffectAnchor, EffectEndpoint } from '@/game/effects/core/effectIntentTypes';
import type { CombatPresentation } from '@/game/effects/presentation/types';
import type { ResolvedAttack } from '@/game/services/AttackResolutionService';

export type WagerType =
	| 'all_in_bonus_with_cost'
	| 'all_in_buff_minions'
	| 'betting_round_damage'
	| 'double_blinds_bonus_multiplier'
	| 'double_showdown_multiplier'
	| 'fold_penalty_to_healing'
	| 'hand_rank_upgrade'
	| 'hide_bet_actions'
	| 'increase_min_bet'
	| 'on_opponent_fold_heal'
	| 'peek_next_community_card'
	| 'reduce_fold_penalty'
	| 'reveal_opponent_hole_cards'
	| 'showdown_aoe_damage'
	| 'showdown_coin_flip'
	| 'showdown_hand_rank_draw'
	| 'showdown_win_armor'
	| 'showdown_win_draw_and_damage'
	| 'showdown_win_rank_damage';

export const WAGER_TYPES: readonly WagerType[] = [
	'all_in_bonus_with_cost',
	'all_in_buff_minions',
	'betting_round_damage',
	'double_blinds_bonus_multiplier',
	'double_showdown_multiplier',
	'fold_penalty_to_healing',
	'hand_rank_upgrade',
	'hide_bet_actions',
	'increase_min_bet',
	'on_opponent_fold_heal',
	'peek_next_community_card',
	'reduce_fold_penalty',
	'reveal_opponent_hole_cards',
	'showdown_aoe_damage',
	'showdown_coin_flip',
	'showdown_hand_rank_draw',
	'showdown_win_armor',
	'showdown_win_draw_and_damage',
	'showdown_win_rank_damage',
];

export function isWagerType(value: unknown): value is WagerType {
	return typeof value === 'string' && WAGER_TYPES.some(type => type === value);
}

export interface VisualEventBase {
	id: string;
	timestamp: number;
	layer?: ArenaVfxLayer;
}

export interface PhaseEnteredEvent extends VisualEventBase {
	type: 'phaseEntered';
	phase: CombatPhase;
}

export interface CommunityCardRevealedEvent extends VisualEventBase {
	type: 'communityCardRevealed';
	phase: CombatPhase;
	slotIndex: number;
	card: PokerCard;
}

export interface BettingActionEvent extends VisualEventBase {
	type: 'bettingAction';
	phase: CombatPhase;
	action: CombatAction;
	side: ArenaVfxOwner;
	hpCommitment?: number;
}

export interface HandRankAnnouncedEvent extends VisualEventBase {
	type: 'handRankAnnounced';
	side: ArenaVfxOwner;
	rank: PokerHandRank;
	winner: ArenaVfxOwner | 'draw';
}

export interface ShowdownDamageEvent extends VisualEventBase {
	type: 'showdownDamage';
	winner: ArenaVfxOwner;
	target: ArenaVfxTarget;
	damage: number;
	isLethal?: boolean;
	/** True when ShowdownCelebration/PokerCombatAnimation owns the non-lethal strike. */
	handledByCelebration?: boolean;
}

export interface RagnarokTriggeredEvent extends VisualEventBase {
	type: 'ragnarokTriggered';
	side: ArenaVfxOwner;
}

export interface StreakAnnouncedEvent extends VisualEventBase {
	type: 'streakAnnounced';
	side: ArenaVfxOwner;
	streak: number;
	kind: 'win' | 'last_stand';
}

export interface HandImprovedEvent extends VisualEventBase {
	type: 'handImproved';
	tier: 'low' | 'mid' | 'high' | 'godly';
	rank: PokerHandRank;
	side: ArenaVfxOwner;
}

export interface SpellCastEvent extends VisualEventBase {
	type: 'spellCast';
	effectType: PokerSpellEffectType;
	side: ArenaVfxOwner;
	sourceInstanceId?: string;
	source?: EffectEndpoint;
}

export interface WagerActivatedEvent extends VisualEventBase {
	type: 'wagerActivated';
	wagerType: WagerType;
	side: ArenaVfxOwner;
	sourceInstanceId?: string;
	source?: EffectEndpoint;
	target?: EffectEndpoint;
}

export const WAGER_TYPES_RESOLVED_AT_SHOWDOWN = [
	'showdown_win_armor',
	'showdown_coin_flip',
	'showdown_win_rank_damage',
	'showdown_aoe_damage',
	'showdown_hand_rank_draw',
	'showdown_win_draw_and_damage',
	'double_showdown_multiplier',
	'all_in_bonus_with_cost',
] as const satisfies readonly WagerType[];

export function isShowdownResolvedWagerType(wagerType: WagerType): boolean {
	return WAGER_TYPES_RESOLVED_AT_SHOWDOWN.some(type => type === wagerType);
}

function heroEntityIdForOwner(owner: ArenaVfxOwner): string {
	return owner === 'player' ? ARENA_VFX_TARGETS.playerHero : ARENA_VFX_TARGETS.opponentHero;
}

function heroEndpoint(owner: ArenaVfxOwner, anchor: EffectAnchor): EffectEndpoint {
	return { entityId: heroEntityIdForOwner(owner), anchor };
}

export function wagerMinionSource(instanceId: string): EffectEndpoint {
	return { entityId: instanceId, anchor: 'card-body' };
}

/** Default hero-anchored target for a wager VFX beat (presentation only). */
export function resolveWagerActivatedTarget(
	wagerType: WagerType,
	side: ArenaVfxOwner,
): EffectEndpoint | undefined {
	switch (wagerType) {
		case 'betting_round_damage':
		case 'showdown_win_rank_damage':
		case 'showdown_aoe_damage':
		case 'showdown_win_draw_and_damage':
			return heroEndpoint(side === 'player' ? 'opponent' : 'player', 'health-bar');
		case 'on_opponent_fold_heal':
		case 'fold_penalty_to_healing':
		case 'showdown_win_armor':
		case 'showdown_hand_rank_draw':
			return heroEndpoint(side, 'health-bar');
		case 'showdown_coin_flip':
		case 'all_in_bonus_with_cost':
			return heroEndpoint(side === 'player' ? 'opponent' : 'player', 'health-bar');
		case 'double_showdown_multiplier':
			return heroEndpoint(side, 'hero-body');
		default:
			return undefined;
	}
}

export type StaminaChangeReason =
	| 'bet'
	| 'raise'
	| 'defend'
	| 'fold'
	| 'fold_curse'
	| 'shield_absorbed'
	| 'spell_cost'
	| 'spell_drain';

export interface StaminaChangedEvent extends VisualEventBase {
	type: 'staminaChanged';
	side: ArenaVfxOwner;
	delta: number;
	reason: StaminaChangeReason;
	absorbed?: number;
}

export interface CombatImpactEvent extends VisualEventBase {
	type: 'combatImpact';
	attackerId: string;
	targetId: string;
	damage: number;
	kind: 'hit' | 'counter';
	intent?: AttackEffectIntent;
	presentation?: CombatPresentation;
	/** The gameplay result remains available at the visual boundary. */
	resolvedAttack?: ResolvedAttack;
}

export interface VisualEventMap {
	phaseEntered: PhaseEnteredEvent;
	communityCardRevealed: CommunityCardRevealedEvent;
	bettingAction: BettingActionEvent;
	handRankAnnounced: HandRankAnnouncedEvent;
	showdownDamage: ShowdownDamageEvent;
	ragnarokTriggered: RagnarokTriggeredEvent;
	streakAnnounced: StreakAnnouncedEvent;
	handImproved: HandImprovedEvent;
	spellCast: SpellCastEvent;
	wagerActivated: WagerActivatedEvent;
	staminaChanged: StaminaChangedEvent;
	combatImpact: CombatImpactEvent;
}

export type VisualEventType = keyof VisualEventMap;
export type VisualEvent = VisualEventMap[VisualEventType];

let visualEventIdCounter = 0;

function nextVisualEventId(): string {
	visualEventIdCounter += 1;
	return `vfx_${Date.now()}_${visualEventIdCounter}`;
}

function baseEventFields(): VisualEventBase {
	return { id: nextVisualEventId(), timestamp: Date.now() };
}

function opponentOf(owner: ArenaVfxOwner): ArenaVfxOwner {
	return owner === 'player' ? 'opponent' : 'player';
}

function heroTargetForOwner(owner: ArenaVfxOwner): ArenaVfxTarget {
	return owner === 'player' ? ARENA_VFX_TARGETS.playerHero : ARENA_VFX_TARGETS.opponentHero;
}

export function visualEventTypeOf(event: VisualEvent): VisualEventType {
	switch (event.type) {
		case 'phaseEntered':
		case 'communityCardRevealed':
		case 'bettingAction':
		case 'handRankAnnounced':
		case 'showdownDamage':
		case 'ragnarokTriggered':
		case 'streakAnnounced':
		case 'handImproved':
		case 'spellCast':
		case 'wagerActivated':
		case 'staminaChanged':
		case 'combatImpact':
			return event.type;
		default: {
			const unhandled: never = event;
			throw new Error(`Unhandled VisualEvent type: ${JSON.stringify(unhandled)}`);
		}
	}
}

export function emitPhaseEntered(data: Omit<PhaseEnteredEvent, 'type' | 'id' | 'timestamp'>): PhaseEnteredEvent {
	const event: PhaseEnteredEvent = { type: 'phaseEntered', ...baseEventFields(), ...data };
	emitVisualEvent(event);
	return event;
}

export function emitCommunityCardRevealed(
	data: Omit<CommunityCardRevealedEvent, 'type' | 'id' | 'timestamp'>
): CommunityCardRevealedEvent {
	const event: CommunityCardRevealedEvent = { type: 'communityCardRevealed', ...baseEventFields(), ...data };
	emitVisualEvent(event);
	return event;
}

export function emitBettingAction(data: Omit<BettingActionEvent, 'type' | 'id' | 'timestamp'>): BettingActionEvent {
	const event: BettingActionEvent = { type: 'bettingAction', ...baseEventFields(), ...data };
	emitVisualEvent(event);
	return event;
}

export function emitHandRankAnnounced(
	data: Omit<HandRankAnnouncedEvent, 'type' | 'id' | 'timestamp'>
): HandRankAnnouncedEvent {
	const event: HandRankAnnouncedEvent = { type: 'handRankAnnounced', ...baseEventFields(), ...data };
	emitVisualEvent(event);
	return event;
}

export function emitShowdownDamage(
	data: Omit<ShowdownDamageEvent, 'type' | 'id' | 'timestamp' | 'target'>
): ShowdownDamageEvent {
	const event: ShowdownDamageEvent = {
		type: 'showdownDamage',
		...baseEventFields(),
		...data,
		target: heroTargetForOwner(opponentOf(data.winner)),
	};
	emitVisualEvent(event);
	return event;
}

export function emitRagnarokTriggered(
	data: Omit<RagnarokTriggeredEvent, 'type' | 'id' | 'timestamp'>
): RagnarokTriggeredEvent {
	const event: RagnarokTriggeredEvent = { type: 'ragnarokTriggered', ...baseEventFields(), ...data };
	emitVisualEvent(event);
	return event;
}

export function emitStreakAnnounced(
	data: Omit<StreakAnnouncedEvent, 'type' | 'id' | 'timestamp'>
): StreakAnnouncedEvent {
	const event: StreakAnnouncedEvent = { type: 'streakAnnounced', ...baseEventFields(), ...data };
	emitVisualEvent(event);
	return event;
}

export function emitHandImproved(
	data: Omit<HandImprovedEvent, 'type' | 'id' | 'timestamp'>
): HandImprovedEvent {
	const event: HandImprovedEvent = { type: 'handImproved', ...baseEventFields(), ...data };
	emitVisualEvent(event);
	return event;
}

export function emitSpellCast(data: Omit<SpellCastEvent, 'type' | 'id' | 'timestamp'>): SpellCastEvent {
	const event: SpellCastEvent = { type: 'spellCast', ...baseEventFields(), ...data };
	emitVisualEvent(event);
	return event;
}

export function emitWagerActivated(data: Omit<WagerActivatedEvent, 'type' | 'id' | 'timestamp'>): WagerActivatedEvent {
	const event: WagerActivatedEvent = { type: 'wagerActivated', ...baseEventFields(), ...data };
	emitVisualEvent(event);
	return event;
}

export function emitWagerActivatedFromMinion(
	wagerType: WagerType,
	side: ArenaVfxOwner,
	sourceInstanceId: string,
): WagerActivatedEvent {
	const target = resolveWagerActivatedTarget(wagerType, side);
	return emitWagerActivated({
		wagerType,
		side,
		sourceInstanceId,
		source: wagerMinionSource(sourceInstanceId),
		...(target ? { target } : {}),
	});
}

export function emitStaminaChanged(
	data: Omit<StaminaChangedEvent, 'type' | 'id' | 'timestamp'>,
): StaminaChangedEvent {
	const event: StaminaChangedEvent = { type: 'staminaChanged', ...baseEventFields(), ...data };
	emitVisualEvent(event);
	return event;
}

export function emitCombatImpact(
	data: Omit<CombatImpactEvent, 'type' | 'id' | 'timestamp'>,
): CombatImpactEvent {
	const event: CombatImpactEvent = { type: 'combatImpact', ...baseEventFields(), ...data };
	emitVisualEvent(event);
	return event;
}
