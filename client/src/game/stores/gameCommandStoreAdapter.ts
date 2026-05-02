import { showStatus } from '../components/ui/GameStatusBanner';
import type { ApplyGameCommandResult, GameCommand, GameCommandEffect } from '../core/commands';
import type { CardInstance, GameState } from '../types';
import { debug } from '../config/debugConfig';
import { useAudio } from '../../lib/stores/useAudio';
import { logActivity } from './activityLogStore';
import { useTargetingStore } from './targetingStore';

export type GameCommandStorePatch = {
	readonly gameState?: GameState;
	readonly selectedCard?: CardInstance | null;
	readonly attackingCard?: CardInstance | null;
	readonly heroTargetMode?: boolean;
};

export type ApplyGameCommandToStoreContext = {
	readonly command: GameCommand;
	readonly beforeState: GameState;
	readonly result: ApplyGameCommandResult;
	readonly setState: (patch: GameCommandStorePatch) => void;
};

const VISIBLE_REJECTION_MESSAGES: Readonly<Record<string, string>> = {
	'not player turn': 'Not your turn',
	'not enough mana': 'Not enough mana',
	'not enough health for blood price': 'Not enough health to pay Blood Price',
	'battlefield full': 'Battlefield is full',
	'no attacks left': 'This minion already attacked this turn!',
	'hero power already used': 'Hero power already used this turn',
};

const CLEAR_SELECTION_REJECTION_REASONS = new Set([
	'not player turn',
	'not enough mana',
	'not enough health for blood price',
	'battlefield full',
]);

export function applyGameCommandToStore({
	command,
	beforeState,
	result,
	setState,
}: ApplyGameCommandToStoreContext): void {
	if (result.status === 'applied') {
		setState({ gameState: result.state });
		applyGameCommandEffects(result.effects, setState);
		return;
	}

	if (result.status === 'rejected') {
		applyRejectedCommand(result.reason, setState);
		applyGameCommandEffects(result.effects, setState);
		debug.warn(`[GameCommand] Rejected ${command.type}: ${result.reason}`);
		return;
	}

	if (result.reason) {
		applyIgnoredCommand(result.reason, setState);
		debug.warn(`[GameCommand] Ignored ${command.type}: ${result.reason}`);
	}

	if (result.state !== beforeState) {
		setState({ gameState: result.state });
	}

	applyGameCommandEffects(result.effects, setState);
}

function applyGameCommandEffects(
	effects: readonly GameCommandEffect[],
	setState: (patch: GameCommandStorePatch) => void,
): void {
	for (const effect of effects) {
		applyGameCommandEffect(effect, setState);
	}
}

function applyGameCommandEffect(
	effect: GameCommandEffect,
	setState: (patch: GameCommandStorePatch) => void,
): void {
	switch (effect.type) {
		case 'card_played':
			applyCardPlayedEffect(effect);
			return;
		case 'play_sound':
			useAudio.getState().playSoundEffect(effect.sound);
			return;
		case 'show_status':
			showStatus(effect.message, effect.level);
			return;
		case 'clear_selection':
			clearSelection(effect.selection, setState);
			return;
		case 'log_activity':
			logActivity(effect.activityType, effect.actor, effect.message, effect.metadata);
			return;
		case 'schedule_ai_turn':
			return;
	}
}

function applyCardPlayedEffect(effect: Extract<GameCommandEffect, { readonly type: 'card_played' }>): void {
	const audioStore = useAudio.getState();

	if (effect.causedDiscovery) {
		audioStore.playSoundEffect('discover');
	} else if (effect.rarity === 'mythic') {
		audioStore.playSoundEffect('legendary');
	} else if (effect.cardType === 'minion' && effect.keywords.includes('battlecry') && effect.battlecryType === 'damage') {
		audioStore.playSoundEffect('damage');
	} else {
		audioStore.playSoundEffect('card_play');
	}

	if (effect.cardType === 'spell') {
		logActivity('spell_cast', 'player', `Cast ${effect.cardName}`, {
			cardName: effect.cardName,
			cardId: typeof effect.cardId === 'number' ? effect.cardId : undefined,
			value: effect.spellEffectValue,
		});
		return;
	}

	if (effect.cardType === 'minion') {
		logActivity('minion_summoned', 'player', `Summoned ${effect.cardName} (${effect.attack}/${effect.health})`, {
			cardName: effect.cardName,
			cardId: typeof effect.cardId === 'number' ? effect.cardId : undefined,
		});
	}
}

function applyRejectedCommand(reason: string, setState: (patch: GameCommandStorePatch) => void): void {
	const message = VISIBLE_REJECTION_MESSAGES[reason];
	if (message) {
		showStatus(message, 'error');
	}

	if (CLEAR_SELECTION_REJECTION_REASONS.has(reason)) {
		clearSelection('selected_card', setState);
	}
}

function applyIgnoredCommand(reason: string, setState: (patch: GameCommandStorePatch) => void): void {
	if (reason === 'play card produced no state change' || reason === 'card not found in hand') {
		clearSelection('selected_card', setState);
	}
}

function clearSelection(
	selection: Extract<GameCommandEffect, { readonly type: 'clear_selection' }>['selection'],
	setState: (patch: GameCommandStorePatch) => void,
): void {
	switch (selection) {
		case 'selected_card':
			setState({ selectedCard: null });
			return;
		case 'attacking_card':
			useTargetingStore.getState().cancelTargeting();
			setState({ attackingCard: null });
			return;
		case 'hero_target_mode':
			setState({ heroTargetMode: false });
			return;
		case 'all':
			useTargetingStore.getState().cancelTargeting();
			setState({ selectedCard: null, attackingCard: null, heroTargetMode: false });
			return;
	}
}
