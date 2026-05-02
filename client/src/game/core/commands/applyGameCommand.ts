import { GAME_COMMAND_TYPES, assertNeverCommand, type GameCommand } from './gameCommandTypes';
import type { CardInstance, GameState } from '../../types';
import { findCardInstance } from '../../utils/cards/cardUtils';
import { hasKeyword } from '../../utils/cards/keywordUtils';
import { getAttack } from '../../utils/cards/typeGuards';
import { processAttack, playCard, endTurn } from '../../utils/gameUtils';
import { executeHeroPower } from '../../utils/heroPowerUtils';
import { confirmMulligan, skipMulligan, toggleCardSelection } from '../../utils/mulliganUtils';
import { getArtifactSpellCostReduction } from '../../utils/artifactTriggerProcessor';
import { MAX_BATTLEFIELD_SIZE } from '../../constants/gameConstants';
import {
	appliedGameCommand,
	ignoredGameCommand,
	rejectedGameCommand,
	type CardPlayedEffect,
	type ApplyGameCommandResult,
	type GameCommandEffect,
} from './gameCommandResult';

export type ApplyGameCommandDeps = {
	readonly isAiSimulationMode?: () => boolean;
};

/**
 * Swap players.player ↔ players.opponent and flip currentTurn.
 * Pure: no winner/mulligan/secret reshuffling — only the symmetric pivot needed
 * so the opponent's command runs through the canonical (player-perspective) handlers.
 *
 * Idempotent: swap(swap(state)) === state structurally.
 */
function swapPlayerOpponent(state: GameState): GameState {
	return {
		...state,
		players: {
			player: state.players.opponent,
			opponent: state.players.player,
		},
		currentTurn:
			state.currentTurn === 'player' ? 'opponent'
			: state.currentTurn === 'opponent' ? 'player'
			: state.currentTurn,
	};
}

/**
 * Translate effects produced under the swapped (opponent-as-player) perspective
 * back into the host's perspective.
 *
 * - `play_sound` → kept as-is (audio cues are perspective-neutral).
 * - `log_activity` → actor is flipped (`player` ↔ `opponent`) so the host's saga
 *   feed correctly attributes the action to the opponent.
 * - `card_played` → dropped: its consumer (`applyCardPlayedEffect`) hard-codes
 *   `'player'` as the activity-log actor. Re-emitting it on the host would
 *   produce a misleading "you summoned X" entry. Audio for the card play
 *   already flows through the implicit `play_sound` paths in the player handler.
 * - `clear_selection`, `schedule_ai_turn`, `show_status` → dropped: these target
 *   the player's UI state (selection, AI scheduler, error banners). The host
 *   wasn't selecting, isn't running AI for a human peer, and shouldn't see
 *   "Not your turn" toasts for opponent's actions.
 */
function flipEffectsToOpponentPerspective(
	effects: readonly GameCommandEffect[],
): readonly GameCommandEffect[] {
	const out: GameCommandEffect[] = [];
	for (const effect of effects) {
		switch (effect.type) {
			case 'play_sound':
				out.push(effect);
				break;
			case 'log_activity':
				out.push({
					...effect,
					actor:
						effect.actor === 'player' ? 'opponent'
						: effect.actor === 'opponent' ? 'player'
						: effect.actor,
				});
				break;
			case 'card_played':
			case 'clear_selection':
			case 'schedule_ai_turn':
			case 'show_status':
				break;
		}
	}
	return out;
}

/**
 * Apply a command issued by the opponent — typically used by the P2P host when
 * it receives a `game_command` envelope from the remote peer.
 *
 * Strategy: swap player/opponent in the state so the opponent's command runs
 * through the canonical (player-perspective) handlers, then swap back. This
 * keeps the core `applyGameCommand` ego-centric while making the boundary
 * explicit: the function name announces the role, no hidden translations
 * leak into call-sites.
 *
 * Effects are translated to the host's perspective: actor labels in
 * `log_activity` are flipped; UI-only effects (selection clears, AI scheduler,
 * status banners) are dropped because the host is not the actor.
 */
export function applyOpponentCommand(
	state: GameState,
	command: GameCommand,
	deps: ApplyGameCommandDeps = {},
): ApplyGameCommandResult {
	const swapped = swapPlayerOpponent(state);
	const result = applyGameCommand(swapped, command, deps);
	const restoredState = swapPlayerOpponent(result.state);
	const flippedEffects = flipEffectsToOpponentPerspective(result.effects);

	if (result.status === 'applied') {
		return { status: 'applied', state: restoredState, effects: flippedEffects };
	}
	if (result.status === 'rejected') {
		return { status: 'rejected', state: restoredState, reason: result.reason, effects: flippedEffects };
	}
	return { status: 'ignored', state: restoredState, reason: result.reason, effects: flippedEffects };
}

const isPlayerCommandAllowed = (state: GameState, deps: ApplyGameCommandDeps): boolean => (
	state.currentTurn === 'player' || deps.isAiSimulationMode?.() === true
);

export function applyGameCommand(
	state: GameState,
	command: GameCommand,
	deps: ApplyGameCommandDeps = {},
): ApplyGameCommandResult {
	switch (command.type) {
		case GAME_COMMAND_TYPES.playCard:
			return applyPlayCardCommand(state, command, deps);
		case GAME_COMMAND_TYPES.attack:
			return applyAttackCommand(state, command, deps);
		case GAME_COMMAND_TYPES.endTurn:
			return applyEndTurnCommand(state);
		case GAME_COMMAND_TYPES.useHeroPower:
			return applyUseHeroPowerCommand(state, command, deps);
		case GAME_COMMAND_TYPES.toggleMulliganCard:
			return applyToggleMulliganCardCommand(state, command.cardId);
		case GAME_COMMAND_TYPES.confirmMulligan:
			return applyConfirmMulliganCommand(state);
		case GAME_COMMAND_TYPES.skipMulligan:
			return applySkipMulliganCommand(state);
		case GAME_COMMAND_TYPES.selectDiscoveryOption:
			return ignoredGameCommand(state, 'discovery callbacks are client-adapter owned');
		default:
			assertNeverCommand(command);
	}
}

function applyPlayCardCommand(
	state: GameState,
	command: Extract<GameCommand, { type: typeof GAME_COMMAND_TYPES.playCard }>,
	deps: ApplyGameCommandDeps,
): ApplyGameCommandResult {
	if (!isPlayerCommandAllowed(state, deps)) {
		return rejectedGameCommand(state, 'not player turn');
	}

	const player = state.players.player;
	const cardResult = findCardInstance(player.hand, command.cardId);
	if (!cardResult) {
		return ignoredGameCommand(state, 'card not found in hand');
	}

	const cardInstance = cardResult.card;
	const playCardRejection = getPlayCardRejection(state, cardInstance, command, cardResult.index);
	if (playCardRejection) {
		return rejectedGameCommand(state, playCardRejection);
	}

	if (cardInstance.card.type === 'minion'
		&& hasKeyword(cardInstance, 'battlecry')
		&& cardInstance.card.battlecry?.requiresTarget
		&& !command.targetId) {
		return ignoredGameCommand(state, 'battlecry target required');
	}

	const newState = playCard(
		state,
		command.cardId,
		command.targetId,
		command.targetType,
		command.insertionIndex,
		command.payWithBlood,
	);

	if (newState === state) {
		return ignoredGameCommand(state, 'play card produced no state change');
	}

	return appliedGameCommand(newState, [
		getCardPlayedEffect(cardInstance, newState),
		{ type: 'clear_selection', selection: 'selected_card' },
	]);
}

function applyAttackCommand(
	state: GameState,
	command: Extract<GameCommand, { type: typeof GAME_COMMAND_TYPES.attack }>,
	deps: ApplyGameCommandDeps,
): ApplyGameCommandResult {
	if (!isPlayerCommandAllowed(state, deps)) {
		return rejectedGameCommand(state, 'not player turn');
	}

	const attacker = state.players.player.battlefield.find(card => card.instanceId === command.attackerId);
	if (!attacker) {
		return ignoredGameCommand(state, 'attacker not found');
	}

	const maxAttacks = hasKeyword(attacker, 'mega_windfury') ? 4 : hasKeyword(attacker, 'windfury') ? 2 : 1;
	if ((attacker.attacksPerformed ?? 0) >= maxAttacks) {
		return rejectedGameCommand(state, 'no attacks left', [
			{ type: 'clear_selection', selection: 'attacking_card' },
		]);
	}

	const newState = processAttack(state, command.attackerId, command.defenderId);
	if (newState === state) {
		return ignoredGameCommand(state, 'attack produced no state change', [
			{ type: 'clear_selection', selection: 'attacking_card' },
		]);
	}

	const targetName = !command.defenderId || command.defenderId === 'opponent-hero'
		? 'enemy hero'
		: state.players.opponent.battlefield.find(card => card.instanceId === command.defenderId)?.card.name ?? 'enemy minion';

	return appliedGameCommand(newState, [
		{ type: 'play_sound', sound: 'attack' },
		{
			type: 'log_activity',
			activityType: 'attack',
			actor: 'player',
			message: `${attacker.card.name} attacked ${targetName}`,
			metadata: {
				cardName: attacker.card.name,
				targetName,
				value: getAttack(attacker.card),
			},
		},
		{ type: 'clear_selection', selection: 'all' },
	]);
}

function applyEndTurnCommand(state: GameState): ApplyGameCommandResult {
	const newState = endTurn(state, true);
	if (newState === state) {
		return ignoredGameCommand(state, 'end turn produced no state change');
	}

	return appliedGameCommand(newState, [
		{
			type: 'log_activity',
			activityType: 'turn_end',
			actor: 'player',
			message: `Turn ${state.turnNumber} ended`,
		},
		{
			type: 'log_activity',
			activityType: 'turn_start',
			actor: 'opponent',
			message: `Turn ${newState.turnNumber} - Opponent's turn`,
		},
		{ type: 'play_sound', sound: 'turn_end' },
		{ type: 'clear_selection', selection: 'selected_card' },
		{ type: 'schedule_ai_turn', turnNumber: newState.turnNumber },
	]);
}

function applyUseHeroPowerCommand(
	state: GameState,
	command: Extract<GameCommand, { type: typeof GAME_COMMAND_TYPES.useHeroPower }>,
	deps: ApplyGameCommandDeps,
): ApplyGameCommandResult {
	if (!isPlayerCommandAllowed(state, deps)) {
		return rejectedGameCommand(state, 'not player turn');
	}

	const player = state.players.player;
	if (player.heroPower.used) {
		return rejectedGameCommand(state, 'hero power already used');
	}

	if (player.mana.current < player.heroPower.cost) {
		return rejectedGameCommand(state, 'not enough mana');
	}

	const newState = executeHeroPower(state, 'player', command.targetId, command.targetType);
	if (newState === state) {
		return ignoredGameCommand(state, 'hero power produced no state change');
	}

	return appliedGameCommand(newState, [
		{ type: 'play_sound', sound: 'hero_power' },
		{
			type: 'log_activity',
			activityType: 'buff',
			actor: 'player',
			message: `Used ${player.heroPower.name}`,
		},
		{ type: 'clear_selection', selection: 'hero_target_mode' },
	]);
}

function applyToggleMulliganCardCommand(state: GameState, cardId: string): ApplyGameCommandResult {
	if (state.gamePhase !== 'mulligan' || !state.mulligan?.active) {
		return rejectedGameCommand(state, 'not in mulligan phase');
	}

	const newState = toggleCardSelection(state, cardId);
	if (newState === state) {
		return ignoredGameCommand(state, 'mulligan toggle produced no state change');
	}

	return appliedGameCommand(newState);
}

function applyConfirmMulliganCommand(state: GameState): ApplyGameCommandResult {
	if (state.gamePhase !== 'mulligan' || !state.mulligan?.active) {
		return rejectedGameCommand(state, 'not in mulligan phase');
	}

	const newState = confirmMulligan(state);
	if (newState === state) {
		return ignoredGameCommand(state, 'confirm mulligan produced no state change');
	}

	return appliedGameCommand(newState, [{ type: 'play_sound', sound: 'button_click' }]);
}

function applySkipMulliganCommand(state: GameState): ApplyGameCommandResult {
	if (state.gamePhase !== 'mulligan' || !state.mulligan?.active) {
		return rejectedGameCommand(state, 'not in mulligan phase');
	}

	const newState = skipMulligan(state);
	if (newState === state) {
		return ignoredGameCommand(state, 'skip mulligan produced no state change');
	}

	return appliedGameCommand(newState, [{ type: 'play_sound', sound: 'button_click' }]);
}

function getPlayCardRejection(
	state: GameState,
	cardInstance: CardInstance,
	command: Extract<GameCommand, { type: typeof GAME_COMMAND_TYPES.playCard }>,
	handIndex: number,
): string | null {
	const player = state.players.player;

	if (cardInstance.card.type === 'minion') {
		if (player.battlefield.length >= MAX_BATTLEFIELD_SIZE) {
			return 'battlefield full';
		}
	}

	const bloodCost = cardInstance.card.bloodPrice;
	const isBloodPayment = command.payWithBlood === true && bloodCost !== undefined && bloodCost > 0;
	if (isBloodPayment) {
		const heroHealth = player.heroHealth ?? player.health ?? 100;
		if (heroHealth <= bloodCost) {
			return 'not enough health for blood price';
		}
		return null;
	}

	const effectiveManaCost = getEffectiveManaCost(state, cardInstance, handIndex);
	if (effectiveManaCost > player.mana.current) {
		return 'not enough mana';
	}

	return null;
}

function getEffectiveManaCost(state: GameState, cardInstance: CardInstance, handIndex: number): number {
	let effectiveManaCost = cardInstance.card.manaCost ?? 0;
	const player = state.players[state.currentTurn];

	if (cardInstance.card.type === 'spell') {
		effectiveManaCost = Math.max(0, effectiveManaCost - getArtifactSpellCostReduction(state, state.currentTurn));
	}

	const outcastEffect = getOutcastManaDiscount(cardInstance, player.hand.length, handIndex);
	if (outcastEffect > 0) {
		effectiveManaCost = Math.max(0, effectiveManaCost - outcastEffect);
	}

	if (state.activeRealm && cardInstance.card.type === 'spell' && state.currentTurn !== state.activeRealm.owner) {
		for (const effect of state.activeRealm.effects) {
			if (effect.type === 'cost_increase' && effect.target === 'enemy') {
				effectiveManaCost += effect.value;
			}
		}
	}

	if (cardInstance.card.type === 'spell' && state.prophecies && state.prophecies.length > 0) {
		const hasFateweave = player.battlefield.some(minion => minion.card.keywords?.includes('fateweave') === true);
		if (hasFateweave) {
			effectiveManaCost = Math.max(0, effectiveManaCost - 1);
		}
	}

	return effectiveManaCost;
}

function getOutcastManaDiscount(cardInstance: CardInstance, handLength: number, handIndex: number): number {
	if (!hasKeyword(cardInstance, 'outcast')) {
		return 0;
	}

	if (handIndex !== 0 && handIndex !== handLength - 1) {
		return 0;
	}

	const cardRecord = cardInstance.card as unknown as Record<string, unknown>;
	const outcastEffect = cardRecord.outcastEffect;
	if (!isManaDiscountOutcastEffect(outcastEffect)) {
		return 0;
	}

	return outcastEffect.manaDiscount;
}

function isManaDiscountOutcastEffect(value: unknown): value is { readonly type: 'mana_discount'; readonly manaDiscount: number } {
	if (typeof value !== 'object' || value === null) {
		return false;
	}

	const record = value as Record<string, unknown>;
	return record.type === 'mana_discount' && typeof record.manaDiscount === 'number';
}

function getCardPlayedEffect(cardInstance: CardInstance, newState: GameState): CardPlayedEffect {
	const { card } = cardInstance;
	const baseEffect = {
		type: 'card_played',
		instanceId: cardInstance.instanceId,
		cardId: card.id,
		cardName: card.name,
		cardType: card.type,
		rarity: card.rarity,
		keywords: card.keywords ?? [],
		causedDiscovery: newState.discovery?.active === true,
	} satisfies Omit<CardPlayedEffect, 'attack' | 'health' | 'spellEffectType' | 'spellEffectValue' | 'battlecryType'>;

	if (card.type === 'spell') {
		return {
			...baseEffect,
			spellEffectType: card.spellEffect?.type,
			spellEffectValue: card.spellEffect?.value,
		};
	}

	if (card.type === 'minion') {
		return {
			...baseEffect,
			attack: card.attack,
			health: card.health,
			battlecryType: card.battlecry?.type,
		};
	}

	return baseEffect;
}
