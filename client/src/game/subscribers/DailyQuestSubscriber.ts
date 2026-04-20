import { GameEventBus } from '../../core/events/GameEventBus';
import type { GameEvent } from '../../core/events/GameEvents';
import { CombatEventBus } from '../services/CombatEventBus';
import type { DamageResolvedEvent } from '../services/CombatEventBus';
import { useDailyQuestStore } from '../stores/dailyQuestStore';

type UnsubscribeFn = () => void;

export function initializeDailyQuestSubscriber(): UnsubscribeFn {
	const unsubscribes: UnsubscribeFn[] = [];

	useDailyQuestStore.getState().refreshIfNeeded();

	unsubscribes.push(
		GameEventBus.subscribe<GameEvent>('GAME_ENDED', (event) => {
			const data = event as GameEvent & { winner?: string };
			if (data.winner === 'player') {
				useDailyQuestStore.getState().updateProgress('win_games', 1);
			}
		}, 5)
	);

	unsubscribes.push(
		GameEventBus.subscribe<GameEvent>('CARD_PLAYED', (event) => {
			const data = event as GameEvent & { player?: string; cardType?: string; rarity?: string };
			if (data.player !== 'player') return;

			useDailyQuestStore.getState().updateProgress('play_cards', 1);

			if (data.cardType === 'minion') {
				useDailyQuestStore.getState().updateProgress('play_minions', 1);
			}
			if (data.cardType === 'spell') {
				useDailyQuestStore.getState().updateProgress('play_spells', 1);
			}
			if (data.cardType === 'weapon') {
				useDailyQuestStore.getState().updateProgress('play_weapons', 1);
			}
			if (data.rarity === 'mythic') {
				useDailyQuestStore.getState().updateProgress('play_mythic', 1);
			}
		})
	);

	unsubscribes.push(
		GameEventBus.subscribe<GameEvent>('MINION_DESTROYED', (event) => {
			const data = event as GameEvent & { player?: string };
			if (data.player === 'opponent') {
				useDailyQuestStore.getState().updateProgress('destroy_minions', 1);
			}
		})
	);

	unsubscribes.push(
		GameEventBus.subscribe<GameEvent>('HERO_POWER_USED', (event) => {
			const data = event as GameEvent & { player?: string };
			if (data.player === 'player') {
				useDailyQuestStore.getState().updateProgress('use_hero_power', 1);
			}
		})
	);

	unsubscribes.push(
		CombatEventBus.subscribe<DamageResolvedEvent>('DAMAGE_RESOLVED', (event) => {
			if (event.attackerOwner === 'player' && event.actualDamage > 0) {
				useDailyQuestStore.getState().updateProgress('deal_damage', event.actualDamage);
			}
		})
	);

	return () => {
		unsubscribes.forEach(unsub => unsub());
	};
}

export default initializeDailyQuestSubscriber;
