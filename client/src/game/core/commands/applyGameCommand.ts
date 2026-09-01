import { GAME_COMMAND_TYPES, assertNeverCommand, type GameCommand } from './gameCommandTypes';
import type { CardInstance, GameState } from '../../types';
import { findCardInstance } from '../../utils/cards/cardUtils';
import { hasKeyword } from '../../utils/cards/keywordUtils';
import { getEffectiveAttack } from '../../utils/effects/statusEffectUtils';
import { autoAttackWithAllCards, processAttack, playCard, endTurn } from '../../utils/gameUtils';
import { executeHeroPower } from '../../utils/heroPowerUtils';
import { applyWeaponUpgrade, executeNorseHeroPower, getNorseHeroById, withNorseHeroPowerRandomness } from '../../utils/norseHeroPowerUtils';
import { confirmMulligan, skipMulligan, toggleCardSelection, type MulliganActor } from '../../utils/mulliganUtils';
import { getArtifactSpellCostReduction } from '../../utils/artifactTriggerProcessor';
import { MAX_BATTLEFIELD_SIZE } from '../../constants/gameConstants';
import { validateResourceInvariants, type ResourceInvariantViolation } from '@shared/protocol-core/gameLimits';
import { createSeededIdGen, cryptoRng } from '../../utils/seededRng';
import { withCardsIdGen, withCardsRng } from '../../utils/cardsCommandRng';
import {
	appliedGameCommand,
	ignoredGameCommand,
	rejectedGameCommand,
	type CardPlayedEffect,
	type ApplyGameCommandResult,
	type GameCommandEffect,
} from './gameCommandResult';
import { canActInPokerWindow, canPlayCardInPokerWindow, type PokerCardTimingContext } from './pokerCardTiming';

export type ApplyGameCommandDeps = {
	readonly isAiSimulationMode?: () => boolean;
	readonly rng?: () => number;
	/**
	 * Deterministic id stream for materialized card/effect instances. P2P
	 * callers provide one per logical command; local/AI callers omit it and
	 * retain CSPRNG ids. The scope also covers legacy handlers that call
	 * `cryptoIdGen()` directly.
	 */
	readonly idGen?: () => string;
	readonly pokerCombat?: PokerCardTimingContext | null;
	readonly nowMs?: number;
	/**
	 * Viewer-relative actor that maps to canonical seat p1. Mulligan replacement
	 * consumes one shared RNG/id stream and therefore must process p1 before p2
	 * on both peers, even after the opponent perspective swap.
	 */
	readonly canonicalMulliganFirstActor?: MulliganActor;
};

/**
 * Swap players.player ↔ players.opponent and flip currentTurn.
 * Pure: no winner/mulligan/secret reshuffling — only the symmetric pivot needed
 * so the opponent's command runs through the canonical (player-perspective) handlers.
 *
 * Idempotent: swap(swap(state)) === state structurally.
 */
function swapPlayerOpponent(state: GameState): GameState {
	const mulligan = state.mulligan;
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
		mulligan: mulligan
			? {
				...mulligan,
				playerSelections: mulligan.opponentSelections ?? {},
				opponentSelections: mulligan.playerSelections ?? {},
				playerReady: mulligan.opponentReady,
				opponentReady: mulligan.playerReady,
			}
			: mulligan,
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
	const commandState = deps.pokerCombat
		? { ...swapped, currentTurn: 'player' as const }
		: swapped;
	const swappedDeps: ApplyGameCommandDeps = {
		...deps,
		...(deps.pokerCombat
			? {
				pokerCombat: {
					...deps.pokerCombat,
					playerId: deps.pokerCombat.opponentId,
					opponentId: deps.pokerCombat.playerId,
				},
			}
			: {}),
		...(deps.canonicalMulliganFirstActor
			? { canonicalMulliganFirstActor: invertMulliganActor(deps.canonicalMulliganFirstActor) }
			: {}),
	};
	const result = applyGameCommand(commandState, command, swappedDeps);
	const restoredState = result.state === commandState
		? state
		: swapPlayerOpponent(result.state);
	const perspectiveRestoredState = deps.pokerCombat && restoredState !== state
		? { ...restoredState, currentTurn: state.currentTurn }
		: restoredState;
	const flippedEffects = flipEffectsToOpponentPerspective(result.effects);

	if (result.status === 'applied') {
		return { status: 'applied', state: perspectiveRestoredState, effects: flippedEffects };
	}
	if (result.status === 'rejected') {
		return { status: 'rejected', state: perspectiveRestoredState, reason: result.reason, effects: flippedEffects };
	}
	return { status: 'ignored', state: perspectiveRestoredState, reason: result.reason, effects: flippedEffects };
}

function invertMulliganActor(actor: MulliganActor): MulliganActor {
	return actor === 'player' ? 'opponent' : 'player';
}

const isPlayerCommandAllowed = (state: GameState, deps: ApplyGameCommandDeps): boolean => {
	if (deps.pokerCombat) {
		return deps.pokerCombat.activePlayerId === deps.pokerCombat.playerId;
	}
	return state.currentTurn === 'player' || deps.isAiSimulationMode?.() === true;
};

function toPokerCommandPerspective(state: GameState, deps: ApplyGameCommandDeps): GameState {
	return deps.pokerCombat && state.currentTurn !== 'player'
		? { ...state, currentTurn: 'player' }
		: state;
}

function restorePokerCommandPerspective(
	originalState: GameState,
	commandState: GameState,
	result: ApplyGameCommandResult,
	deps: ApplyGameCommandDeps,
): ApplyGameCommandResult {
	if (!deps.pokerCombat || commandState === originalState) return result;
	if (result.state === commandState) return { ...result, state: originalState };
	return {
		...result,
		state: { ...result.state, currentTurn: originalState.currentTurn },
	};
}

export function applyGameCommand(
	state: GameState,
	command: GameCommand,
	deps: ApplyGameCommandDeps = {},
): ApplyGameCommandResult {
	const beforeViolation = findGameStateResourceViolation(state);
	if (beforeViolation) {
		return rejectedGameCommand(state, formatResourceViolation(beforeViolation));
	}
	const rng = deps.rng ?? cryptoRng;
	const apply = () => applyGameCommandUnbound(state, command, { ...deps, rng });
	// Keep local/AI ids random, but make every P2P command's materialized
	// instances deterministic across the two browser perspectives. `idGen`
	// is supplied by the P2P store and this synchronous scope reaches all
	// nested battlecry/spell/deathrattle helpers.
	const result = withCardsRng(
		rng,
		deps.idGen ? () => withCardsIdGen(deps.idGen!, apply) : apply,
	);
	if (result.status !== 'applied') return result;
	const afterViolation = findGameStateResourceViolation(result.state);
	return afterViolation
		? rejectedGameCommand(state, formatResourceViolation(afterViolation))
		: result;
}

function findGameStateResourceViolation(state: GameState): ResourceInvariantViolation | null {
	for (const player of [state.players.player, state.players.opponent]) {
		const violation = validateResourceInvariants({
			battlefieldCount: player.battlefield.length,
			handCount: player.hand.length,
			manaCurrent: player.mana.current,
			manaMax: player.mana.max,
			armor: player.heroArmor ?? player.armor ?? 0,
			currentHealth: player.heroHealth ?? player.health,
			maxHealth: player.maxHealth,
		});
		if (violation) return violation;
	}
	return null;
}

function formatResourceViolation(violation: ResourceInvariantViolation): string {
	return `resource invariant violated: ${violation.code} (${violation.value}${violation.maximum === undefined ? '' : ` > ${violation.maximum}`})`;
}

function applyGameCommandUnbound(
	state: GameState,
	command: GameCommand,
	deps: ApplyGameCommandDeps,
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
		case GAME_COMMAND_TYPES.frontlineAttack:
			return applyFrontlineAttackCommand(state, command, deps);
		case GAME_COMMAND_TYPES.norseHeroPower:
			return applyNorseHeroPowerCommand(state, command, deps);
		case GAME_COMMAND_TYPES.weaponUpgrade:
			return applyWeaponUpgradeCommand(state, command, deps);
		case GAME_COMMAND_TYPES.toggleMulliganCard:
			return applyToggleMulliganCardCommand(state, command.cardId);
		case GAME_COMMAND_TYPES.confirmMulligan:
			return applyConfirmMulliganCommand(state, deps);
		case GAME_COMMAND_TYPES.skipMulligan:
			return applySkipMulliganCommand(state, deps);
		case GAME_COMMAND_TYPES.selectDiscoveryOption:
			return applySelectDiscoveryOptionCommand(state, command, deps);
		default:
			assertNeverCommand(command);
	}
}

function applyPlayCardCommand(
	state: GameState,
	command: Extract<GameCommand, { type: typeof GAME_COMMAND_TYPES.playCard }>,
	deps: ApplyGameCommandDeps,
): ApplyGameCommandResult {
	const commandState = toPokerCommandPerspective(state, deps);
	const finish = (result: ApplyGameCommandResult) => restorePokerCommandPerspective(state, commandState, result, deps);
	return applyPlayCardCommandInPerspective(commandState, command, deps, finish);
}

function applyPlayCardCommandInPerspective(
	state: GameState,
	command: Extract<GameCommand, { type: typeof GAME_COMMAND_TYPES.playCard }>,
	deps: ApplyGameCommandDeps,
	finish: (result: ApplyGameCommandResult) => ApplyGameCommandResult,
): ApplyGameCommandResult {
	if (!isPlayerCommandAllowed(state, deps)) {
		return finish(rejectedGameCommand(state, 'not player turn'));
	}

	const player = state.players.player;
	const cardResult = findCardInstance(player.hand, command.cardId);
	if (!cardResult) {
		return finish(ignoredGameCommand(state, 'card not found in hand'));
	}

	const cardInstance = cardResult.card;
	if (deps.pokerCombat) {
		const pokerTiming = canPlayCardInPokerWindow({
			combatState: deps.pokerCombat,
			card: cardInstance,
			actor: deps.pokerCombat.playerId,
			nowMs: deps.nowMs,
		});
		if (!pokerTiming.ok) {
			return finish(rejectedGameCommand(state, pokerTiming.reason));
		}
	}
	const playCardRejection = getPlayCardRejection(state, cardInstance, command, cardResult.index);
	if (playCardRejection) {
		return finish(rejectedGameCommand(state, playCardRejection));
	}

	if (cardInstance.card.type === 'minion'
		&& hasKeyword(cardInstance, 'battlecry')
		&& cardInstance.card.battlecry?.requiresTarget
		&& !command.targetId) {
		return finish(ignoredGameCommand(state, 'battlecry target required'));
	}

	const newState = playCard(
		state,
		command.cardId,
		command.targetId,
		command.targetType,
		command.insertionIndex,
		command.payWithBlood,
		deps.rng,
	);

	if (newState === state) {
		return finish(ignoredGameCommand(state, 'play card produced no state change'));
	}

	return finish(appliedGameCommand(newState, [
		getCardPlayedEffect(cardInstance, newState),
		{ type: 'clear_selection', selection: 'selected_card' },
	]));
}

function applyAttackCommand(
	state: GameState,
	command: Extract<GameCommand, { type: typeof GAME_COMMAND_TYPES.attack }>,
	deps: ApplyGameCommandDeps,
): ApplyGameCommandResult {
	const commandState = toPokerCommandPerspective(state, deps);
	const finish = (result: ApplyGameCommandResult) => restorePokerCommandPerspective(state, commandState, result, deps);
	return applyAttackCommandInPerspective(commandState, command, deps, finish);
}

function applyAttackCommandInPerspective(
	state: GameState,
	command: Extract<GameCommand, { type: typeof GAME_COMMAND_TYPES.attack }>,
	deps: ApplyGameCommandDeps,
	finish: (result: ApplyGameCommandResult) => ApplyGameCommandResult,
): ApplyGameCommandResult {
	if (!isPlayerCommandAllowed(state, deps)) {
		return finish(rejectedGameCommand(state, 'not player turn'));
	}
	if (deps.pokerCombat) {
		const timing = canActInPokerWindow({ combatState: deps.pokerCombat, actor: deps.pokerCombat.playerId, nowMs: deps.nowMs });
		if (!timing.ok) return finish(rejectedGameCommand(state, timing.reason));
	}

	const attacker = state.players.player.battlefield.find(card => card.instanceId === command.attackerId);
	if (!attacker) {
		return finish(ignoredGameCommand(state, 'attacker not found'));
	}

	const maxAttacks = hasKeyword(attacker, 'mega_windfury') ? 4 : hasKeyword(attacker, 'windfury') ? 2 : 1;
	if ((attacker.attacksPerformed ?? 0) >= maxAttacks) {
		return finish(rejectedGameCommand(state, 'no attacks left', [
			{ type: 'clear_selection', selection: 'attacking_card' },
		]));
	}

	// Attack effects can materialize new card instances (for example Overkill
	// summons/copies).  The command wire does not need another identity field:
	// the pre-command canonical state plus target/attack ordinal already names
	// this logical action on both peers.  Thread a deterministic generator into
	// the legacy combat resolver so those instance ids cannot diverge after a
	// VPN/reconnect or from different browser CSPRNG streams.
	const attackEffectIdGen = createSeededIdGen(
		[command.attackerId, command.defenderId ?? 'opponent-hero', state.turnNumber, attacker.attacksPerformed ?? 0].join(':'),
		'attack-effects',
	);
	const newState = processAttack(state, command.attackerId, command.defenderId, deps.rng, attackEffectIdGen);
	if (newState === state) {
		return finish(ignoredGameCommand(state, 'attack produced no state change', [
			{ type: 'clear_selection', selection: 'attacking_card' },
		]));
	}

	const targetName = !command.defenderId || command.defenderId === 'opponent-hero'
		? 'enemy hero'
		: state.players.opponent.battlefield.find(card => card.instanceId === command.defenderId)?.card.name ?? 'enemy minion';

	return finish(appliedGameCommand(newState, [
		{ type: 'play_sound', sound: 'attack' },
		{
			type: 'log_activity',
			activityType: 'attack',
			actor: 'player',
			message: `${attacker.card.name} attacked ${targetName}`,
			metadata: {
				cardName: attacker.card.name,
				targetName,
					value: getEffectiveAttack(attacker),
			},
		},
		{ type: 'clear_selection', selection: 'all' },
	]));
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
	const commandState = toPokerCommandPerspective(state, deps);
	const finish = (result: ApplyGameCommandResult) => restorePokerCommandPerspective(state, commandState, result, deps);
	return applyUseHeroPowerCommandInPerspective(commandState, command, deps, finish);
}

function applyUseHeroPowerCommandInPerspective(
	state: GameState,
	command: Extract<GameCommand, { type: typeof GAME_COMMAND_TYPES.useHeroPower }>,
	deps: ApplyGameCommandDeps,
	finish: (result: ApplyGameCommandResult) => ApplyGameCommandResult,
): ApplyGameCommandResult {
	if (!isPlayerCommandAllowed(state, deps)) {
		return finish(rejectedGameCommand(state, 'not player turn'));
	}
	if (deps.pokerCombat) {
		const timing = canActInPokerWindow({ combatState: deps.pokerCombat, actor: deps.pokerCombat.playerId, nowMs: deps.nowMs });
		if (!timing.ok) return finish(rejectedGameCommand(state, timing.reason));
	}

	const player = state.players.player;
	if (player.heroPower.used) {
		return finish(rejectedGameCommand(state, 'hero power already used'));
	}

	if (player.mana.current < player.heroPower.cost) {
		return finish(rejectedGameCommand(state, 'not enough mana'));
	}

	const newState = executeHeroPower(state, 'player', command.targetId, command.targetType);
	if (newState === state) {
		return finish(ignoredGameCommand(state, 'hero power produced no state change'));
	}

	return finish(appliedGameCommand(newState, [
		{ type: 'play_sound', sound: 'hero_power' },
		{
			type: 'log_activity',
			activityType: 'buff',
			actor: 'player',
			message: `Used ${player.heroPower.name}`,
		},
		{ type: 'clear_selection', selection: 'hero_target_mode' },
	]));
}

function pokerTimingRejection(
	state: GameState,
	deps: ApplyGameCommandDeps,
): string | null {
	if (!deps.pokerCombat) return null;
	const timing = canActInPokerWindow({
		combatState: deps.pokerCombat,
		actor: deps.pokerCombat.playerId,
		nowMs: deps.nowMs,
	});
	return timing.ok ? null : timing.reason;
}

function applyFrontlineAttackCommand(
	state: GameState,
	command: Extract<GameCommand, { type: typeof GAME_COMMAND_TYPES.frontlineAttack }>,
	deps: ApplyGameCommandDeps,
): ApplyGameCommandResult {
	const commandState = toPokerCommandPerspective(state, deps);
	const finish = (result: ApplyGameCommandResult) => restorePokerCommandPerspective(state, commandState, result, deps);
	if (!isPlayerCommandAllowed(commandState, deps)) return finish(rejectedGameCommand(commandState, 'not player turn'));
	const timingRejection = pokerTimingRejection(commandState, deps);
	if (timingRejection) return finish(rejectedGameCommand(commandState, timingRejection));

	const newState = autoAttackWithAllCards(
		commandState,
		command.mode,
		deps.rng,
		createSeededIdGen(command.actionId, 'frontline-attack-effects'),
	);
	if (newState === commandState) return finish(ignoredGameCommand(commandState, 'frontline attack produced no state change'));
	return finish(appliedGameCommand(newState, [
		{ type: 'play_sound', sound: 'attack' },
		{ type: 'clear_selection', selection: 'all' },
	]));
}

function applyNorseHeroPowerCommand(
	state: GameState,
	command: Extract<GameCommand, { type: typeof GAME_COMMAND_TYPES.norseHeroPower }>,
	deps: ApplyGameCommandDeps,
): ApplyGameCommandResult {
	const commandState = toPokerCommandPerspective(state, deps);
	const finish = (result: ApplyGameCommandResult) => restorePokerCommandPerspective(state, commandState, result, deps);
	if (!isPlayerCommandAllowed(commandState, deps)) return finish(rejectedGameCommand(commandState, 'not player turn'));
	const timingRejection = pokerTimingRejection(commandState, deps);
	if (timingRejection) return finish(rejectedGameCommand(commandState, timingRejection));

	const hero = getNorseHeroById(command.norseHeroId);
	if (!hero) return finish(rejectedGameCommand(commandState, 'norse hero not found'));
	const player = commandState.players.player;
	if (player.heroPower.used) return finish(rejectedGameCommand(commandState, 'hero power already used'));
	if (player.mana.current < hero.heroPower.cost) return finish(rejectedGameCommand(commandState, 'not enough mana'));

	const minionAffectingEffects = new Set([
		'damage_aoe', 'damage_random', 'buff_aoe', 'buff_single', 'debuff_aoe',
		'debuff_single', 'summon', 'freeze', 'stealth', 'draw', 'copy', 'scry',
		'reveal', 'grant_keyword', 'self_damage_and_summon', 'draw_and_damage',
	]);
	const shouldResolveGameState = command.targetType === 'minion'
		|| minionAffectingEffects.has(hero.heroPower.effectType);
	const resolved = shouldResolveGameState
		? withNorseHeroPowerRandomness({
			rng: deps.rng ?? cryptoRng,
			idGen: createSeededIdGen(command.actionId, 'norse-hero-power'),
		}, () => executeNorseHeroPower(
			commandState,
			'player',
			command.norseHeroId,
			command.targetType === 'minion' ? command.targetId : undefined,
			false,
		))
		: commandState;
	const newState: GameState = {
		...resolved,
		players: {
			...resolved.players,
			player: {
				...resolved.players.player,
				mana: { ...resolved.players.player.mana, current: resolved.players.player.mana.current - hero.heroPower.cost },
				heroPower: { ...resolved.players.player.heroPower, used: true },
			},
		},
	};
	return finish(appliedGameCommand(newState, [
		{ type: 'play_sound', sound: 'hero_power' },
		{ type: 'clear_selection', selection: 'hero_target_mode' },
		{
			type: 'log_activity',
			activityType: 'buff',
			actor: 'player',
			message: `Used ${hero.heroPower.name}`,
		},
	]));
}

function applyWeaponUpgradeCommand(
	state: GameState,
	command: Extract<GameCommand, { type: typeof GAME_COMMAND_TYPES.weaponUpgrade }>,
	deps: ApplyGameCommandDeps,
): ApplyGameCommandResult {
	const commandState = toPokerCommandPerspective(state, deps);
	const finish = (result: ApplyGameCommandResult) => restorePokerCommandPerspective(state, commandState, result, deps);
	if (!isPlayerCommandAllowed(commandState, deps)) return finish(rejectedGameCommand(commandState, 'not player turn'));
	const timingRejection = pokerTimingRejection(commandState, deps);
	if (timingRejection) return finish(rejectedGameCommand(commandState, timingRejection));

	const hero = getNorseHeroById(command.norseHeroId);
	if (!hero) return finish(rejectedGameCommand(commandState, 'norse hero not found'));
	const player = commandState.players.player as typeof commandState.players.player & { heroPowerUpgraded?: boolean };
	if (player.heroPowerUpgraded) return finish(rejectedGameCommand(commandState, 'weapon already upgraded'));
	if (player.mana.current < hero.weaponUpgrade.manaCost) return finish(rejectedGameCommand(commandState, 'not enough mana'));

	const newState = withNorseHeroPowerRandomness({
		rng: deps.rng ?? cryptoRng,
		idGen: createSeededIdGen(command.actionId, 'norse-weapon-upgrade'),
	}, () => applyWeaponUpgrade(commandState, 'player', command.norseHeroId));
	if (newState === commandState) return finish(ignoredGameCommand(commandState, 'weapon upgrade produced no state change'));
	return finish(appliedGameCommand(newState, [
		{ type: 'play_sound', sound: 'weapon_equip' },
		{ type: 'clear_selection', selection: 'hero_target_mode' },
		{
			type: 'log_activity',
			activityType: 'buff',
			actor: 'player',
			message: `Equipped ${hero.weaponUpgrade.name}`,
		},
	]));
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

function applyConfirmMulliganCommand(state: GameState, deps: ApplyGameCommandDeps): ApplyGameCommandResult {
	if (state.gamePhase !== 'mulligan' || !state.mulligan?.active) {
		return rejectedGameCommand(state, 'not in mulligan phase');
	}

	const actorOrder = deps.canonicalMulliganFirstActor
		? [deps.canonicalMulliganFirstActor, invertMulliganActor(deps.canonicalMulliganFirstActor)] as const
		: undefined;
	const newState = confirmMulligan(state, actorOrder);
	if (newState === state) {
		return ignoredGameCommand(state, 'confirm mulligan produced no state change');
	}

	return appliedGameCommand(newState, [{ type: 'play_sound', sound: 'button_click' }]);
}

function applySkipMulliganCommand(state: GameState, deps: ApplyGameCommandDeps): ApplyGameCommandResult {
	if (state.gamePhase !== 'mulligan' || !state.mulligan?.active) {
		return rejectedGameCommand(state, 'not in mulligan phase');
	}

	const actorOrder = deps.canonicalMulliganFirstActor
		? [deps.canonicalMulliganFirstActor, invertMulliganActor(deps.canonicalMulliganFirstActor)] as const
		: undefined;
	const newState = skipMulligan(state, actorOrder);
	if (newState === state) {
		return ignoredGameCommand(state, 'skip mulligan produced no state change');
	}

	return appliedGameCommand(newState, [{ type: 'play_sound', sound: 'button_click' }]);
}

function applySelectDiscoveryOptionCommand(
	state: GameState,
	command: Extract<GameCommand, { type: typeof GAME_COMMAND_TYPES.selectDiscoveryOption }>,
	deps: ApplyGameCommandDeps,
): ApplyGameCommandResult {
	const discovery = state.discovery;
	if (!discovery?.active) return rejectedGameCommand(state, 'discovery is not active');
	if (typeof discovery.callback !== 'function') {
		return rejectedGameCommand(state, 'discovery resolver unavailable');
	}

	// The wire carries the selected card for the local UI contract, but the
	// receiver must resolve it from its own deterministic option list. This
	// prevents a peer from injecting an arbitrary card into a hand.
	const requestedCard = command.card;
	const selectedCard = requestedCard === null
		? null
		: discovery.options.find(option => String(option.id) === String(requestedCard.id)) ?? null;
	if (requestedCard !== null && !selectedCard) {
		return rejectedGameCommand(state, 'discovery option is not available');
	}

	try {
		const resolved = discovery.callback(selectedCard, state, deps.idGen);
		if (!resolved) return rejectedGameCommand(state, 'discovery resolver returned no state');
		// A resolver must consume the modal. Legacy callbacks that leave the
		// marker active are normalized here so one signed choice cannot be replayed
		// against the same discovery window.
		const nextState = resolved.discovery?.active === true
			? {
				...resolved,
				discovery: { ...resolved.discovery, active: false, options: [] },
			}
			: resolved;
		return appliedGameCommand(nextState, [{ type: 'play_sound', sound: 'card_draw' }]);
	} catch {
		return rejectedGameCommand(state, 'discovery resolver failed');
	}
}

function getPlayCardRejection(
	state: GameState,
	cardInstance: CardInstance,
	command: Extract<GameCommand, { type: typeof GAME_COMMAND_TYPES.playCard }>,
	handIndex: number,
): string | null {
	const player = state.players.player;

	if (cardInstance.card.type === 'minion') {
		// Hard five-slot invariant: timing and available mana never create a
		// sixth battlefield slot. Keep this guard at the command boundary.
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
