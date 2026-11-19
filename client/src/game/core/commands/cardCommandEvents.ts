import { GameEventBus } from '@/core/events/GameEventBus';
import type { GameEvent, GameEventBase } from '@/core/events/GameEvents';
import { CombatEventBus, type CombatEventBase, type DamageResolvedEvent, type HealResolvedEvent } from '../../services/CombatEventBus';

type Payload<T> = Omit<T, keyof CombatEventBase | 'type'>;
type CardRuleEventType = 'PET_EVOLVED' | 'SPELL_CAST' | 'CARD_PLAYED' | 'TURN_STARTED'
	| 'CARD_DRAWN' | 'MINION_DESTROYED' | 'BUFF_APPLIED' | 'BATTLECRY_TRIGGERED';
type CardRuleEvent = { [K in CardRuleEventType]: Omit<Extract<GameEvent, { type: K }>, keyof GameEventBase> }[CardRuleEventType];

export type CardCommandEvent =
	| { readonly type: 'card_rule_event'; readonly data: CardRuleEvent }
	| { readonly type: 'damage_resolved'; readonly data: Payload<DamageResolvedEvent> }
	| { readonly type: 'heal_resolved'; readonly data: Payload<HealResolvedEvent> };

export function reportCardRuleEvent(data: CardRuleEvent): void {
	reportCardCommandEvent({ type: 'card_rule_event', data });
}

let collecting: CardCommandEvent[] | null = null;

/** Legacy card helpers run synchronously. A command owns its notifications until accepted. */
export function collectCardCommandEvents<T>(run: () => T): { result: T; effects: CardCommandEvent[] } {
	const outer = collecting;
	const effects: CardCommandEvent[] = [];
	collecting = effects;
	try {
		return { result: run(), effects };
	} finally {
		collecting = outer;
	}
}

export function reportCardCommandEvent(event: CardCommandEvent): void {
	if (collecting) collecting.push(event);
	else publishCardCommandEvent(event);
}

export function publishCardCommandEvent(event: CardCommandEvent): void {
	switch (event.type) {
		case 'heal_resolved':
			CombatEventBus.emitHealResolved(event.data);
			return;
		case 'damage_resolved':
			CombatEventBus.emitDamageResolved(event.data);
			return;
		case 'card_rule_event': {
			const data = event.data;
			if (data.type === 'TURN_STARTED') GameEventBus.setCurrentTurn(data.turnNumber);
			GameEventBus.emit({
				...data,
				id: GameEventBus.generateEventId(),
				timestamp: Date.now(),
				turn: GameEventBus.getCurrentTurn(),
			});
		}
	}
}
