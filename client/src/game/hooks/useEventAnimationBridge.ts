/**
 * useEventAnimationBridge.ts
 *
 * Bridges the GameEventBus AnimationSubscriber queue to the
 * GlobalAnimationQueue that AnimationLayer renders.
 *
 * Subscribes to AnimationSubscriber.onAnimation(), resolves
 * instanceIds to screen positions via DOM queries, and pushes
 * Animation objects into the rendering pipeline.
 */

import { useEffect } from 'react';
import { getAnimationSubscriber } from '../subscribers/AnimationSubscriber';
import { useAnimationStore, Animation } from '../animations/AnimationManager';

function resolvePosition(instanceId?: string): { x: number; y: number } | undefined {
	if (!instanceId) return undefined;
	const el = document.querySelector(`[data-instance-id="${instanceId}"]`) as HTMLElement | null;
	if (!el) return undefined;
	const rect = el.getBoundingClientRect();
	return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function screenCenter(): { x: number; y: number } {
	return { x: window.innerWidth / 2, y: window.innerHeight * 0.4 };
}

export function useEventAnimationBridge() {
	const store = useAnimationStore();

	useEffect(() => {
		const subscriber = getAnimationSubscriber();

		const unsub = subscriber.onAnimation((queued) => {
			const sourcePos = resolvePosition(queued.sourceId);
			const targetPos = resolvePosition(queued.targetId);
			const params = (queued.params || {}) as Record<string, any>;

			const base: Partial<Animation> = {
				id: queued.id,
				startTime: queued.timestamp,
				duration: queued.duration,
			};

			switch (queued.type) {
				case 'card_play': {
					const pos = sourcePos || screenCenter();
					store.getState().addAnimation({
						...base,
						type: 'play',
						position: pos,
						cardName: params.cardName,
						playType: params.cardType === 'spell' ? 'spell' : 'minion',
					} as Animation);
					break;
				}

				case 'mythic_entrance': {
					const pos = sourcePos || screenCenter();
					store.getState().addAnimation({
						...base,
						type: 'play',
						position: pos,
						cardName: params.cardName,
						playType: 'minion',
						intensity: 'critical',
					} as Animation);
					break;
				}

				case 'card_draw': {
					store.getState().addAnimation({
						...base,
						type: 'card_draw_notification',
						playerId: 'player',
						cardName: params.cardName,
						value: 1,
					} as Animation);
					break;
				}

				case 'card_burn': {
					store.getState().addAnimation({
						...base,
						type: 'card_burn',
						playerId: 'player',
						cardName: params.cardName,
					} as Animation);
					break;
				}

				case 'death': {
					const pos = sourcePos || screenCenter();
					store.getState().addAnimation({
						...base,
						type: params.hasDeathrattle ? 'enhanced_death' : 'death',
						position: pos,
						cardName: params.cardName,
					} as Animation);
					break;
				}

				case 'spell_cast': {
					const pos = sourcePos || screenCenter();
					store.getState().addAnimation({
						...base,
						type: 'spell_damage_popup',
						position: pos,
						targetPosition: targetPos,
						spellName: params.cardName,
						spellType: params.effectType,
					} as Animation);
					break;
				}

				case 'battlecry': {
					const pos = sourcePos || screenCenter();
					store.getState().addAnimation({
						...base,
						type: 'battlecry',
						position: pos,
						targetPosition: targetPos,
						cardName: params.sourceName,
						effect: params.effectType,
						value: params.value,
					} as Animation);
					break;
				}

				case 'deathrattle': {
					const pos = sourcePos || screenCenter();
					store.getState().addAnimation({
						...base,
						type: 'deathrattle',
						position: pos,
						cardName: params.sourceName,
						effect: params.effectType,
					} as Animation);
					break;
				}

				case 'summon': {
					const pos = sourcePos || screenCenter();
					store.getState().addAnimation({
						...base,
						type: 'summon',
						position: pos,
						cardName: params.cardName,
					} as Animation);
					break;
				}

				case 'buff': {
					const pos = targetPos || screenCenter();
					store.getState().addAnimation({
						...base,
						type: 'buff',
						position: pos,
						cardName: params.targetName,
						value: (params.attackChange || 0) + (params.healthChange || 0),
					} as Animation);
					break;
				}

				case 'turn_start': {
					store.getState().addAnimation({
						...base,
						type: 'turn_start',
						playerId: params.player,
						value: params.turnNumber,
					} as Animation);
					break;
				}

				case 'pet_ascension': {
					const pos = sourcePos || screenCenter();
					store.getState().addAnimation({
						...base,
						type: 'pet_ascension',
						position: pos,
						cardName: params.cardName,
						effect: params.element,
					} as Animation);
					break;
				}

				case 'pet_apotheosis': {
					const pos = sourcePos || screenCenter();
					store.getState().addAnimation({
						...base,
						type: 'pet_apotheosis',
						position: pos,
						cardName: params.cardName,
						effect: params.element,
					} as Animation);
					break;
				}

				case 'victory':
				case 'defeat':
				case 'game_start': {
					store.getState().addAnimation({
						...base,
						type: queued.type,
						position: screenCenter(),
					} as Animation);
					break;
				}

				default:
					break;
			}
		});

		return unsub;
	}, []);
}
