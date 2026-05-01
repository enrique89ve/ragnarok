import type { CardRarity, CardType, SoundEffectType } from '../../types';
import type { GameState } from '../../types';
import type { ActivityEventType } from '../../types/ActivityTypes';

export type CardPlayedEffect = {
	readonly type: 'card_played';
	readonly instanceId: string;
	readonly cardId?: number | string;
	readonly cardName: string;
	readonly cardType: CardType;
	readonly rarity?: CardRarity;
	readonly attack?: number;
	readonly health?: number;
	readonly spellEffectType?: string;
	readonly spellEffectValue?: number;
	readonly battlecryType?: string;
	readonly keywords: readonly string[];
	readonly causedDiscovery: boolean;
};

export type GameCommandEffect =
	| CardPlayedEffect
	| {
		readonly type: 'play_sound';
		readonly sound: SoundEffectType;
	}
	| {
		readonly type: 'show_status';
		readonly level: 'info' | 'success' | 'error';
		readonly message: string;
	}
	| {
		readonly type: 'clear_selection';
		readonly selection: 'selected_card' | 'attacking_card' | 'hero_target_mode' | 'all';
	}
	| {
		readonly type: 'log_activity';
		readonly activityType: ActivityEventType;
		readonly actor: 'player' | 'opponent' | 'system';
		readonly message: string;
		readonly metadata?: Record<string, unknown>;
	}
	| {
		readonly type: 'schedule_ai_turn';
		readonly turnNumber: number;
	};

export type ApplyGameCommandResult =
	| {
		readonly status: 'applied';
		readonly state: GameState;
		readonly effects: readonly GameCommandEffect[];
	}
	| {
		readonly status: 'rejected';
		readonly state: GameState;
		readonly reason: string;
		readonly effects: readonly GameCommandEffect[];
	}
	| {
		readonly status: 'ignored';
		readonly state: GameState;
		readonly reason?: string;
		readonly effects: readonly GameCommandEffect[];
	};

export function appliedGameCommand(
	state: GameState,
	effects: readonly GameCommandEffect[] = [],
): ApplyGameCommandResult {
	return { status: 'applied', state, effects };
}

export function rejectedGameCommand(
	state: GameState,
	reason: string,
	effects: readonly GameCommandEffect[] = [],
): ApplyGameCommandResult {
	return { status: 'rejected', state, reason, effects };
}

export function ignoredGameCommand(
	state: GameState,
	reason?: string,
	effects: readonly GameCommandEffect[] = [],
): ApplyGameCommandResult {
	return { status: 'ignored', state, reason, effects };
}
