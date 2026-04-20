/**
 * gameActions.ts
 *
 * Bridge module that connects game logic actions with the GameEventBus.
 * Use these functions to trigger game actions with proper event emission.
 * 
 * This decouples game logic from UI concerns (audio, notifications, animations).
 * The subscribers handle all UI side effects based on emitted events.
 * 
 * Added from Enrique's fork - Jan 31, 2026
 */

import { GameEventBus } from '@/core/events/GameEventBus';

// ============================================
// Card Action Helpers
// ============================================

/**
 * Emit event when a card is played from hand
 */
export function emitCardPlayed(params: {
	instanceId: string;
	cardId: string;
	cardName: string;
	cardType: 'minion' | 'spell' | 'weapon' | 'hero' | 'secret' | 'location';
	manaCost: number;
	player: 'player' | 'opponent';
	position?: number;
	rarity?: string;
	targetId?: string;
}): void {
	GameEventBus.emitCardPlayed({
		instanceId: params.instanceId,
		cardId: params.cardId,
		cardName: params.cardName,
		cardType: params.cardType,
		manaCost: params.manaCost,
		player: params.player,
		position: params.position,
		rarity: params.rarity,
		targetId: params.targetId,
	});
}

/**
 * Emit event when a card is drawn
 */
export function emitCardDrawn(params: {
	cardId: string;
	cardName: string;
	player: 'player' | 'opponent';
	fromFatigue?: boolean;
	fatigueDamage?: number;
	burned?: boolean;
}): void {
	GameEventBus.emitCardDrawn({
		cardId: params.cardId,
		cardName: params.cardName,
		player: params.player,
		fromFatigue: params.fromFatigue ?? false,
		burned: params.burned,
		fatigueDamage: params.fatigueDamage,
	});
}

/**
 * Emit event when a minion is summoned
 */
export function emitMinionSummoned(params: {
	instanceId: string;
	cardId: string;
	cardName: string;
	player: 'player' | 'opponent';
	position: number;
	attack: number;
	health: number;
	source: 'played' | 'battlecry' | 'deathrattle' | 'spell' | 'effect';
}): void {
	GameEventBus.emitMinionSummoned({
		instanceId: params.instanceId,
		cardId: params.cardId,
		cardName: params.cardName,
		player: params.player,
		position: params.position,
		attack: params.attack,
		health: params.health,
		source: params.source,
	});
}

/**
 * Emit event when a minion is destroyed
 */
export function emitMinionDestroyed(params: {
	instanceId: string;
	cardId: string;
	cardName: string;
	player: 'player' | 'opponent';
	hasDeathrattle?: boolean;
}): void {
	GameEventBus.emitMinionDestroyed({
		instanceId: params.instanceId,
		cardId: params.cardId,
		cardName: params.cardName,
		player: params.player,
		hasDeathrattle: params.hasDeathrattle ?? false,
	});
}

// ============================================
// Spell Action Helpers
// ============================================

/**
 * Emit event when a spell is cast
 */
export function emitSpellCast(params: {
	cardId: string;
	cardName: string;
	player: 'player' | 'opponent';
	targetId?: string;
	effectType: string;
}): void {
	GameEventBus.emitSpellCast({
		cardId: params.cardId,
		cardName: params.cardName,
		player: params.player,
		targetId: params.targetId,
		effectType: params.effectType,
	});
}

// ============================================
// Effect Action Helpers
// ============================================

/**
 * Emit event when a battlecry triggers
 */
export function emitBattlecryTriggered(params: {
	sourceId: string;
	sourceName: string;
	effectType: string;
	player: 'player' | 'opponent';
	targetId?: string;
	value?: number;
}): void {
	GameEventBus.emitBattlecryTriggered({
		sourceId: params.sourceId,
		sourceName: params.sourceName,
		effectType: params.effectType,
		player: params.player,
		targetId: params.targetId,
		value: params.value,
	});
}

/**
 * Emit event when a deathrattle triggers
 */
export function emitDeathrattleTriggered(params: {
	sourceId: string;
	sourceName: string;
	effectType: string;
	player: 'player' | 'opponent';
}): void {
	GameEventBus.emitDeathrattleTriggered({
		sourceId: params.sourceId,
		sourceName: params.sourceName,
		effectType: params.effectType,
		player: params.player,
	});
}

/**
 * Emit event when a buff is applied
 */
export function emitBuffApplied(params: {
	targetId: string;
	targetName: string;
	sourceId?: string;
	attackChange?: number;
	healthChange?: number;
	keywords?: string[];
}): void {
	GameEventBus.emitBuffApplied({
		targetId: params.targetId,
		targetName: params.targetName,
		sourceId: params.sourceId,
		attackChange: params.attackChange,
		healthChange: params.healthChange,
		keywords: params.keywords,
	});
}

// ============================================
// Hero Power Action Helpers
// ============================================

/**
 * Emit event when hero power is used
 */
export function emitHeroPowerUsed(params: {
	player: 'player' | 'opponent';
	heroPowerName: string;
	targetId?: string;
	cost: number;
}): void {
	GameEventBus.emitHeroPowerUsed({
		player: params.player,
		heroPowerName: params.heroPowerName,
		targetId: params.targetId,
		cost: params.cost,
	});
}

// ============================================
// Game Flow Action Helpers
// ============================================

/**
 * Emit event when a turn starts
 */
export function emitTurnStarted(player: 'player' | 'opponent', turnNumber: number): void {
	GameEventBus.emitTurnStarted(player, turnNumber);
}

/**
 * Emit event when a turn ends
 */
export function emitTurnEnded(player: 'player' | 'opponent', turnNumber: number): void {
	GameEventBus.emitTurnEnded(player, turnNumber);
}

/**
 * Emit event when the game starts
 */
export function emitGameStarted(params: {
	playerHeroClass: string;
	opponentHeroClass: string;
	startingPlayer: 'player' | 'opponent';
}): void {
	GameEventBus.emitGameStarted({
		playerHeroClass: params.playerHeroClass,
		opponentHeroClass: params.opponentHeroClass,
		startingPlayer: params.startingPlayer,
	});
}

/**
 * Emit event when the game ends
 */
export function emitGameEnded(params: {
	winner: 'player' | 'opponent' | null;
	reason: 'hero_death' | 'concede' | 'fatigue' | 'draw';
	finalTurn: number;
}): void {
	GameEventBus.emitGameEnded({
		winner: params.winner,
		reason: params.reason,
		finalTurn: params.finalTurn,
	});
}

// ============================================
// Discovery Action Helpers
// ============================================

/**
 * Emit event when discovery starts
 */
export function emitDiscoveryStarted(params: {
	player: 'player' | 'opponent';
	sourceId: string;
	options: Array<{ id: string; name: string }>;
}): void {
	GameEventBus.emitDiscoveryStarted({
		player: params.player,
		sourceId: params.sourceId,
		options: params.options,
	});
}

/**
 * Emit event when discovery completes
 */
export function emitDiscoveryCompleted(params: {
	player: 'player' | 'opponent';
	sourceId: string;
	chosenCardId: string;
	chosenCardName: string;
}): void {
	GameEventBus.emitDiscoveryCompleted({
		player: params.player,
		sourceId: params.sourceId,
		chosenCardId: params.chosenCardId,
		chosenCardName: params.chosenCardName,
	});
}

// ============================================
// Poker Combat Action Helpers
// ============================================

/**
 * Emit event when a poker hand is revealed
 */
export function emitPokerHandRevealed(params: {
	player: 'player' | 'opponent';
	handRank: string;
	value: number;
	cards: string[];
}): void {
	GameEventBus.emitPokerHandRevealed({
		player: params.player,
		handRank: params.handRank,
		value: params.value,
		cards: params.cards,
	});
}

/**
 * Emit event for showdown result
 */
export function emitShowdownResult(params: {
	winner: 'player' | 'opponent' | 'tie';
	playerHand: string;
	opponentHand: string;
	damageDealt: number;
	damageReceived: number;
}): void {
	GameEventBus.emitShowdownResult({
		winner: params.winner,
		playerHand: params.playerHand,
		opponentHand: params.opponentHand,
		damageDealt: params.damageDealt,
		damageReceived: params.damageReceived,
	});
}

// ============================================
// UI Action Helpers
// ============================================

/**
 * Emit notification event (will be handled by NotificationSubscriber)
 */
export function emitNotification(params: {
	message: string;
	level?: 'info' | 'success' | 'warning' | 'error';
	duration?: number;
}): void {
	GameEventBus.emitNotification({
		message: params.message,
		level: params.level ?? 'info',
		duration: params.duration,
	});
}

/**
 * Emit sound request event (will be handled by AudioSubscriber)
 */
export function emitSoundRequest(params: {
	soundId: string;
	volume?: number;
	loop?: boolean;
}): void {
	GameEventBus.emitSoundRequest({
		soundId: params.soundId,
		volume: params.volume,
		loop: params.loop,
	});
}

/**
 * Emit animation request event (will be handled by AnimationSubscriber)
 */
export function emitAnimationRequest(params: {
	animationType: string;
	sourceId?: string;
	targetId?: string;
	duration?: number;
	params?: Record<string, unknown>;
}): void {
	GameEventBus.emitAnimationRequest({
		animationType: params.animationType,
		sourceId: params.sourceId,
		targetId: params.targetId,
		duration: params.duration,
		params: params.params,
	});
}

// Export as namespace for convenience
export const GameActions = {
	emitCardPlayed,
	emitCardDrawn,
	emitMinionSummoned,
	emitMinionDestroyed,
	emitSpellCast,
	emitBattlecryTriggered,
	emitDeathrattleTriggered,
	emitBuffApplied,
	emitHeroPowerUsed,
	emitTurnStarted,
	emitTurnEnded,
	emitGameStarted,
	emitGameEnded,
	emitDiscoveryStarted,
	emitDiscoveryCompleted,
	emitPokerHandRevealed,
	emitShowdownResult,
	emitNotification,
	emitSoundRequest,
	emitAnimationRequest,
};

export default GameActions;
