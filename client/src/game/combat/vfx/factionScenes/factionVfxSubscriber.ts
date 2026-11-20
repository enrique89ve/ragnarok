/**
 * factionVfxSubscriber.ts
 *
 * Strictly decoupled, read-only visual bridge for tribe/faction 2D PixiJS scenes.
 *
 * Architectural guarantees:
 * - Never writes to game stores, never blocks input, never alters combat/poker timers.
 * - Subscribes passively to GameEventBus + VisualEventEmitter + battlefield arrivals.
 * - Deduplicates triggers by instanceId so player plays, AI plays, P2P remote plays,
 *   and token summons each trigger at most ONE entrance scene.
 * - Cleans up all subscriptions, scheduled micro-delays, and active Pixi scenes on unmount.
 */

import { useEffect, useRef } from 'react';
import { GameEventBus } from '@/core/events/GameEventBus';
import type {
	BattlecryTriggeredEvent,
	CardPlayedEvent,
	MinionSummonedEvent,
	PetEvolvedEvent,
	SpellCastEvent,
} from '@/core/events/GameEvents';
import { gameEffectCoordinator } from '@/game/effects/core/gameEffectCoordinator';
import type { CardInstance } from '../../../types';
import type { ArenaVfxOwner } from '../../arenaVfxTargets';
import { isVisualEventRendererEnabled, subscribeVisualEvent } from '../emitter';
import {
	vfxOrchestrationDirector,
	type VfxCascadeWeight,
	type VfxFocalZone,
} from '../vfxOrchestrationDirector';
import type { CombatImpactEvent, WagerActivatedEvent } from '../events';
import { hydrateCardDescriptor, resolveFactionVfxScene } from './classifier';
import { cancelAllFactionVfxScenes, playFactionVfxScene } from './sceneRegistry';
import { preloadDragonShadowFrames } from './runtime/gpuAssetPool';
import type {
	FactionCardDescriptor,
	FactionVfxSceneId,
	FactionVfxTrigger,
} from './types';

interface IndexedBattlefieldUnit {
	readonly side: ArenaVfxOwner;
	readonly descriptor: FactionCardDescriptor;
}

const ENTER_DEDUPE_WINDOW_MS = 1_500;
const DOM_SETTLE_DELAY_MS = 40;

const battlefieldIndex = new Map<string, IndexedBattlefieldUnit>();
const recentEnterTriggers = new Map<string, number>();

type ExtendedCard = CardInstance['card'] & {
	readonly faction?: string;
	readonly petFamily?: string;
	readonly petStage?: string;
	readonly element?: string;
};

function descriptorFromCardInstance(instance: CardInstance): FactionCardDescriptor {
	const card = instance.card as ExtendedCard;
	return hydrateCardDescriptor({
		cardId: card.id,
		cardName: card.name,
		race: card.race ?? null,
		rarity: card.rarity ?? null,
		faction: card.faction ?? null,
		petFamily: card.petFamily ?? null,
		petStage: card.petStage ?? null,
		element: card.element ?? null,
		keywords: card.keywords ?? null,
		cardType: card.type ?? null,
	});
}

function pruneDedupeCache(nowMs: number): void {
	for (const [key, timestamp] of recentEnterTriggers.entries()) {
		if (nowMs - timestamp > ENTER_DEDUPE_WINDOW_MS) {
			recentEnterTriggers.delete(key);
		}
	}
}

function claimEnterTrigger(instanceId: string | undefined): boolean {
	if (!instanceId) return true;
	const nowMs = Date.now();
	pruneDedupeCache(nowMs);
	const previous = recentEnterTriggers.get(instanceId);
	if (previous !== undefined && nowMs - previous < ENTER_DEDUPE_WINDOW_MS) {
		return false;
	}
	recentEnterTriggers.set(instanceId, nowMs);
	return true;
}

function dispatchSceneForDescriptor(params: {
	readonly descriptor: FactionCardDescriptor;
	readonly trigger: FactionVfxTrigger;
	readonly side: ArenaVfxOwner;
	readonly seed: string;
	readonly sourceId?: string;
	readonly targetId?: string;
	readonly delayMs?: number;
}): void {
	if (!isVisualEventRendererEnabled()) return;

	const resolved = resolveFactionVfxScene(params.descriptor, params.trigger, {
		hasTarget: Boolean(params.targetId),
	});
	if (!resolved) return;

	const runScene = (): void => {
		playFactionVfxScene({
			sceneId: resolved.sceneId,
			category: resolved.classification.category,
			trigger: params.trigger,
			side: params.side,
			seed: params.seed,
			sourceId: params.sourceId,
			targetId: params.targetId,
			element: resolved.classification.element,
			cardName: params.descriptor.cardName,
			rarity: resolved.classification.rarity,
		});
	};

	const isCriticalScene = resolved.sceneId === 'dragon-shadow-flight'
		|| resolved.sceneId === 'titan-pantheon-descent';
	const weight: VfxCascadeWeight = isCriticalScene ? 'critical' : 'heavy';
	const zone: VfxFocalZone = isCriticalScene
		? 'fullscreen'
		: params.targetId === 'player-hero'
			? 'playerHero'
			: params.targetId === 'opponent-hero'
				? 'opponentHero'
				: 'board';
	const slot = vfxOrchestrationDirector.reserveCascadeSlot({ weight, zone });
	if (slot.skipped) return;

	const delay = (params.delayMs ?? 0) + slot.delayMs;
	if (delay <= 0) {
		runScene();
		return;
	}

	gameEffectCoordinator.schedule({
		owner: 'faction-vfx',
		lane: resolved.sceneId,
		key: `${resolved.sceneId}:${params.seed}`,
		priority: isCriticalScene ? 'high' : 'normal',
		delayMs: delay,
		run: runScene,
	});
}

function handleCardPlayed(event: CardPlayedEvent): void {
	if (event.cardType === 'minion') {
		if (!claimEnterTrigger(event.instanceId)) return;
	}

	const descriptor = hydrateCardDescriptor({
		cardId: event.cardId,
		cardName: event.cardName,
		rarity: event.rarity ?? null,
		cardType: event.cardType,
	});

	const trigger: FactionVfxTrigger = event.cardType === 'minion' ? 'enter' : 'activate';
	dispatchSceneForDescriptor({
		descriptor,
		trigger,
		side: event.player,
		seed: event.id,
		sourceId: event.instanceId,
		targetId: event.targetId,
		delayMs: event.cardType === 'minion' ? DOM_SETTLE_DELAY_MS : 0,
	});
}

function handleMinionSummoned(event: MinionSummonedEvent): void {
	if (!claimEnterTrigger(event.instanceId)) return;

	const descriptor = hydrateCardDescriptor({
		cardId: event.cardId,
		cardName: event.cardName,
		cardType: 'minion',
	});

	dispatchSceneForDescriptor({
		descriptor,
		trigger: 'enter',
		side: event.player,
		seed: event.id,
		sourceId: event.instanceId,
		delayMs: DOM_SETTLE_DELAY_MS,
	});
}

function handleBattlecryTriggered(event: BattlecryTriggeredEvent): void {
	const indexed = battlefieldIndex.get(event.sourceId);
	const descriptor = indexed?.descriptor ?? hydrateCardDescriptor({
		cardName: event.sourceName,
	});

	dispatchSceneForDescriptor({
		descriptor,
		trigger: 'activate',
		side: event.player,
		seed: event.id,
		sourceId: event.sourceId,
		targetId: event.targetId,
	});
}

function handleSpellCast(event: SpellCastEvent): void {
	const descriptor = hydrateCardDescriptor({
		cardId: event.cardId,
		cardName: event.cardName,
		cardType: 'spell',
	});

	dispatchSceneForDescriptor({
		descriptor,
		trigger: 'activate',
		side: event.player,
		seed: event.id,
		targetId: event.targetId,
	});
}

function handlePetEvolved(event: PetEvolvedEvent): void {
	const descriptor = hydrateCardDescriptor({
		cardName: event.cardName,
		petFamily: event.familyName,
		petStage: event.toStage === 3 ? 'master' : 'adept',
		element: event.element ?? null,
	});

	dispatchSceneForDescriptor({
		descriptor,
		trigger: 'evolve',
		side: event.player,
		seed: event.id,
		sourceId: event.instanceId,
		delayMs: DOM_SETTLE_DELAY_MS,
	});
}

function handleCombatImpact(event: CombatImpactEvent): void {
	if (event.kind !== 'hit') return;
	const indexed = battlefieldIndex.get(event.attackerId);
	if (!indexed) return;

	dispatchSceneForDescriptor({
		descriptor: indexed.descriptor,
		trigger: 'attack',
		side: indexed.side,
		seed: event.id,
		sourceId: event.attackerId,
		targetId: event.targetId,
	});
}

function handleWagerActivated(event: WagerActivatedEvent): void {
	if (!event.sourceInstanceId) return;
	const indexed = battlefieldIndex.get(event.sourceInstanceId);
	if (!indexed) return;

	dispatchSceneForDescriptor({
		descriptor: indexed.descriptor,
		trigger: 'activate',
		side: event.side,
		seed: event.id,
		sourceId: event.sourceInstanceId,
		targetId: event.target?.entityId,
	});
}

/**
 * Synchronizes the read-only battlefield index and fires entrance scenes for
 * any newly arrived units (covers AI plays, P2P opponent plays, and token
 * summons that bypass `CARD_PLAYED`).
 *
 * When `seedOnly` is true (initial mount / reconnect), units are indexed
 * silently without replaying entrance scenes.
 */
export function syncBattlefieldForFactionVfx(
	playerCards: readonly CardInstance[],
	opponentCards: readonly CardInstance[],
	seedOnly = false,
): void {
	const currentIds = new Set<string>();

	const processSide = (cards: readonly CardInstance[], side: ArenaVfxOwner): void => {
		for (const card of cards) {
			if (!card?.instanceId) continue;
			currentIds.add(card.instanceId);
			const existed = battlefieldIndex.has(card.instanceId);
			const descriptor = descriptorFromCardInstance(card);
			battlefieldIndex.set(card.instanceId, { side, descriptor });

			if (!seedOnly && !existed && claimEnterTrigger(card.instanceId)) {
				dispatchSceneForDescriptor({
					descriptor,
					trigger: 'enter',
					side,
					seed: `bf-enter:${card.instanceId}`,
					sourceId: card.instanceId,
					delayMs: DOM_SETTLE_DELAY_MS,
				});
			}
		}
	};

	processSide(playerCards, 'player');
	processSide(opponentCards, 'opponent');

	for (const existingId of Array.from(battlefieldIndex.keys())) {
		if (!currentIds.has(existingId)) {
			battlefieldIndex.delete(existingId);
		}
	}
}

/**
 * Read-only React hook mounted inside the combat arena to observe battlefield
 * arrivals on both player and opponent rows without touching gameplay state.
 */
export function useFactionBattlefieldVfx(
	playerCards: readonly CardInstance[],
	opponentCards: readonly CardInstance[],
	enabled = true,
): void {
	const seededRef = useRef(false);

	useEffect(() => {
		if (!enabled) return;
		const isFirstSync = !seededRef.current;
		seededRef.current = true;
		syncBattlefieldForFactionVfx(playerCards, opponentCards, isFirstSync);
	}, [playerCards, opponentCards, enabled]);

	useEffect(() => {
		return () => {
			seededRef.current = false;
			battlefieldIndex.clear();
		};
	}, []);
}

export function registerFactionVfxSubscriber(): () => void {
	if (typeof window !== 'undefined') {
		void preloadDragonShadowFrames();
	}
	const unsubs = [
		GameEventBus.subscribePresentation('CARD_PLAYED', handleCardPlayed),
		GameEventBus.subscribePresentation('MINION_SUMMONED', handleMinionSummoned),
		GameEventBus.subscribePresentation('BATTLECRY_TRIGGERED', handleBattlecryTriggered),
		GameEventBus.subscribePresentation('SPELL_CAST', handleSpellCast),
		GameEventBus.subscribePresentation('PET_EVOLVED', handlePetEvolved),
		subscribeVisualEvent('combatImpact', handleCombatImpact, 10),
		subscribeVisualEvent('wagerActivated', handleWagerActivated, 10),
	];

	return () => {
		gameEffectCoordinator.cancelOwner('faction-vfx');
		cancelAllFactionVfxScenes();
		recentEnterTriggers.clear();
		for (const unsub of unsubs) unsub();
	};
}

export function clearFactionVfxSubscriberState(): void {
	battlefieldIndex.clear();
	recentEnterTriggers.clear();
}

// Dev-only console preview helpers so any Dragon or Titan scene can be triggered on demand:
//   `__playDragonVfxDemo('dragon-shadow-flight' | 'dragon-flame-ignition' | 'dragon-fire-breath')`
//   `__playTitanVfxDemo('titan-pantheon-descent' | 'titan-earth-slam' | 'titan-colossus-quake', 'player', 'ulduar' | 'frost' | 'magma' | 'void')`
if (typeof window !== 'undefined' && import.meta.env?.DEV) {
	const devWin = window as unknown as Record<string, unknown>;
	devWin.__playDragonVfxDemo = (
		sceneId: Extract<FactionVfxSceneId, `dragon-${string}`> = 'dragon-shadow-flight',
		side: ArenaVfxOwner = 'player',
	) => playFactionVfxScene({
		sceneId,
		category: 'dragon',
		trigger: sceneId === 'dragon-fire-breath' ? 'attack' : 'enter',
		side,
		seed: `dragon-demo-${Date.now()}`,
		element: 'fire',
		cardName: sceneId === 'dragon-shadow-flight' ? 'Níðhöggr, Root-Gnawer' : 'Magma Drake',
		rarity: sceneId === 'dragon-shadow-flight' ? 'mythic' : 'rare',
	});

	devWin.__playTitanVfxDemo = (
		sceneId: Extract<FactionVfxSceneId, `titan-${string}`> = 'titan-pantheon-descent',
		side: ArenaVfxOwner = 'player',
		element: 'ulduar' | 'frost' | 'magma' | 'void' = 'ulduar',
	) => playFactionVfxScene({
		sceneId,
		category: 'titan',
		trigger: sceneId === 'titan-colossus-quake' ? 'attack' : 'enter',
		side,
		seed: `titan-demo-${Date.now()}`,
		element,
		cardName: sceneId === 'titan-pantheon-descent' ? 'Primordial Frost-Mother' : 'Atlas, World-Bearer',
		rarity: sceneId === 'titan-pantheon-descent' ? 'mythic' : 'epic',
	});
}
