import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { emitNotification } from '../actions/gameActions';
import { hasKeyword } from '../utils/cards/keywordUtils';
import {
  initializeGame,
  initializeGameSeeded,
  processAITurn,
  processOpponentSpellPetSetup
} from '../utils/gameUtils';
import { cryptoRng, cryptoIdGen, createSeededRng, createSeededIdGen, seededRngFromString } from '../utils/seededRng';
import type { SeededRng } from '@shared/p2p-wire/rng';
import type { HiveCardAsset } from '../../data/schemas/HiveTypes';
import { useMulliganStore } from './mulliganStore';
import { CardInstance, GameState, CardData } from '../types';
import { CardInstanceWithCardData } from '../types/interfaceExtensions';
import useGame from '../../lib/stores/useGame';
import { useUnifiedUIStore as useAnnouncementStore } from './unifiedUIStore';
import { GameEventBus } from '../../core/events/GameEventBus';
import { isAISimulationMode, debug, getDebugConfig } from '../config/debugConfig';
import { getPokerCombatAdapterState } from '../hooks/usePokerCombatAdapter';
import { CombatAction } from '../types/PokerCombatTypes';
import { useUnifiedCombatStore } from './unifiedCombatStore';
import { useTargetingStore } from './targetingStore';
import { logActivity } from './activityLogStore';
import { CombatEventBus } from '../services/CombatEventBus';
import { getEffectiveAttack } from '../utils/effects/statusEffectUtils';
import { useMatchStore } from '../match/store';
import { computeStateHash } from '../engine/engineBridge';
import { flipGameState } from '../engine/wireHash';
import { serializeGameState } from '../engine/stateSerializer';
import { GAME_COMMAND_TYPES, applyGameCommand, applyOpponentCommand, canActInPokerWindow, appliedGameCommand, ignoredGameCommand, rejectedGameCommand, type ApplyGameCommandResult, type GameCommand, type GrantPokerHandRewardsCommand, type PokerCardTimingContext } from '../core/commands';
import { applyGameCommandToStore } from './gameCommandStoreAdapter';
import { buildHandshakeGameState, type CardsDeckAnnounce } from '../p2p/cardsDeckHandshake';
import { applyPokerAuxiliaryEffects } from '../combat/pokerAuxiliaryEffects';
import type { FrontlineAttackMode } from '../core/commands';
import { createCombatStep, createResolvedAttackFromStates } from '../services/AttackResolutionService';
import { buildCombatPresentationFromResolvedAttack } from '../effects/presentation/CombatPresentation';
import { planEndTurnPokerFold, type EndTurnPokerFoldSide } from '../match/modes/p2p/wireSync/endTurnPokerFold';
import { getCanonicalPokerActionNowMs } from '../../../../shared/p2p-wire/pokerTurnClock';

// ============== BATTLEFIELD DEBUG MONITOR ==============
// Track battlefield changes with stack traces to identify root cause of minion disappearance
// Controlled by debugConfig.logBattlefieldChanges (default: false)
// All debug-only — guarded behind getDebugConfig() checks

function captureStackTrace(): string {
  if (!getDebugConfig().logBattlefieldChanges) return '';
  const err = new Error();
  return err.stack?.split('\n').slice(2, 10).join('\n') || 'Stack not available';
}

function logBattlefieldChange(
  side: 'player' | 'opponent',
  prevCards: string[],
  newCards: string[],
  stack: string
) {
  if (!getDebugConfig().logBattlefieldChanges) return;

  const newSet = new Set(newCards);
  const prevSet = new Set(prevCards);
  const removed = prevCards.filter(c => !newSet.has(c));
  const added = newCards.filter(c => !prevSet.has(c));

  if (removed.length > 0 || added.length > 0) {
    debug.warn(`[BattlefieldDebug] ${side} battlefield CHANGED:`);
    debug.warn(`  Previous (${prevCards.length}):`, prevCards);
    debug.warn(`  New (${newCards.length}):`, newCards);
    if (removed.length > 0) debug.warn(`  REMOVED:`, removed);
    if (added.length > 0) debug.warn(`  Added:`, added);
    debug.warn(`  Stack trace:\n${stack}`);

    if (prevCards.length > 0 && newCards.length === 0) {
      debug.error(`[BattlefieldDebug] CRITICAL: ${side} battlefield CLEARED to empty!`);
    }
  }
}


// Avoid direct import in the store initialization to prevent circular dependencies

interface GameStore {
  // Game state
  gameState: GameState;
  matchSeed: string | null;
  /**
   * Canonical chess side for the local peer — decided at handshake from
   * `matchSeed` parity (see `deriveCanonicalSide` in `shared/p2p-wire/chess.ts`).
   * `'player'` means this peer plays the first-mover side globally;
   * `'opponent'` means second-mover side. SP defaults to `'player'` (human
   * always goes first vs AI). Null until a chess match initializes.
   *
   * UI uses this to translate canonical board state into viewer-relative
   * presentation ("your turn" / "your pieces at bottom"). Game logic
   * (slice, applyChessCommand, hash) does NOT branch on this — it operates
   * on canonical state only.
   */
  myCanonicalSide: 'player' | 'opponent' | null;
  /**
   * P2P session matchId — derived as sha256(matchSeed + myPeerId + remotePeerId)
   * truncated to 16 chars. Set by `useWireSync` after seed_reveal so any other
   * subsystem (e.g. chess wire sender) can read it without depending on
   * useWireSync internals. Null in non-P2P modes.
   */
  matchId: string | null;
  lastStateHash: string | null;
  selectedCard: CardInstance | null;
  // For tracking attack selection
  attackingCard: CardInstance | null;
  // For tracking hero power target selection
  heroTargetMode: boolean;

  // Game actions
  initGame: () => void;
  /**
   * Deterministic init from matchSeed using this browser's local deck only.
   * Not the live P2P path — prefer `initGameFromHandshake`.
   */
  initGameWithSeed: (matchSeed: string) => void;
  /**
   * Live P2P cards init: local + remote `cards_deck` announces, canonical-side id gens.
   */
  initGameFromHandshake: (input: {
    readonly matchSeed: string;
    readonly myCanonicalSide: 'player' | 'opponent';
    readonly localDeck: CardsDeckAnnounce;
    readonly remoteDeck: CardsDeckAnnounce;
  }) => void;
  /**
   * Bind the cards RNG stream from matchSeed without rebuilding gameState.
   * Guest uses this at seed_reveal so later local apply shares the host stream.
   */
  bindCardsRng: (matchSeed: string) => void;
  playCard: (cardId: string, targetId?: string, targetType?: 'minion' | 'hero', insertionIndex?: number, payWithBlood?: boolean) => ApplyGameCommandResult;
  /**
   * Apply a command issued by the opponent (P2P host receiving remote peer's envelope).
   * Goes through the canonical pipeline via state swap so the host's state correctly
   * reflects the opponent's action. Effects are translated to host perspective.
   */
  applyOpponentCommand: (command: GameCommand) => ApplyGameCommandResult;
  attackWithCard: (attackerId: string, defenderId?: string) => ApplyGameCommandResult; // If defenderId is undefined, attack hero
  autoAttackAll: (mode?: 'minion' | 'hero') => void; // Auto-attack with all minions
  frontlineAttack: (mode: FrontlineAttackMode, actionId?: string) => ApplyGameCommandResult;
  selectAttacker: (card: CardInstance | CardInstanceWithCardData | null) => void; // Select card to attack with
  performHeroPower: (targetId?: string, targetType?: 'card' | 'hero') => ApplyGameCommandResult; // Renamed to avoid hook errors
  performNorseHeroPower: (norseHeroId: string, targetId?: string, targetType?: 'minion' | 'hero', actionId?: string) => ApplyGameCommandResult;
  weaponUpgrade: (norseHeroId: string, actionId?: string) => ApplyGameCommandResult;
  toggleHeroTargetMode: () => void; // Toggle hero power targeting mode
  endTurn: () => ApplyGameCommandResult;
  selectCard: (card: CardInstance | CardInstanceWithCardData | null) => void;
  resetGameState: () => void;
  setGameState: (state: Partial<GameState>) => void;
  selectDiscoveryOption: (card: CardData | null) => ApplyGameCommandResult;

  // Mulligan actions
  toggleMulliganCard: (cardId: string) => ApplyGameCommandResult;
  confirmMulligan: () => ApplyGameCommandResult;
  skipMulligan: () => ApplyGameCommandResult;

  // Poker hand rewards - give mana crystal and draw a card
  grantPokerHandRewards: (command: GrantPokerHandRewardsCommand) => ApplyGameCommandResult;
  setupOpponentSpellPetCards: () => void;

  // WASM state hash
  updateStateHash: () => void;

  // UI actions
  setHoveredCard: (card: CardInstance | CardInstanceWithCardData | null) => void;
  hoveredCard: CardInstance | null;
}

let cardsRng: SeededRng | null = null;

function commandRng(): () => number {
	return cardsRng ?? cryptoRng;
}

/**
 * Every canonical P2P command gets an independent deterministic identity
 * stream. The command payload and turn number are the same after the remote
 * perspective swap, while local/AI matches intentionally keep CSPRNG ids.
 */
function commandIdGenFor(
	matchSeed: string | null,
	state: GameState,
	command: GameCommand,
	myCanonicalSide: 'player' | 'opponent' | null = 'player',
): (() => string) | undefined {
	if (!matchSeed) return undefined;
	const canonicalState = myCanonicalSide === 'opponent' ? flipGameState(state) : state;
	return createSeededIdGen(
		`${matchSeed}:${serializeGameState(canonicalState)}:${JSON.stringify(command)}`,
		'game-command-effects',
	);
}

/**
 * Match authority is independent from transport availability. A peer match
 * remains P2P throughout grace, reconnect, disconnect, and error states.
 */
function isPeerOpponentMatch(): boolean {
	return useMatchStore.getState().activeMatch?.opponent.kind === 'peer';
}

function getPokerCardTimingContext(): PokerCardTimingContext | null {
	const combatState = getPokerCombatAdapterState().combatState;
	if (!combatState) return null;
	return {
		combatId: combatState.combatId,
		phase: combatState.phase,
		playerId: combatState.player.playerId,
		opponentId: combatState.opponent.playerId,
		activePlayerId: combatState.activePlayerId,
		turnId: combatState.turnId,
		turnDeadlineAtMs: combatState.turnDeadlineAtMs,
	};
}

function getPokerCommandTiming(): {
	readonly pokerCombat: PokerCardTimingContext | null;
	readonly nowMs?: number;
} {
	const pokerCombat = getPokerCardTimingContext();
	// A peer command is already gated by the signed/notarized Poker window;
	// evaluate its local reducer against that same canonical boundary instead
	// of letting browser wall clocks disagree near the deadline.
	return {
		pokerCombat,
		nowMs: isPeerOpponentMatch()
			? getCanonicalPokerActionNowMs({
				origin: 'player',
				deadlineAtMs: pokerCombat?.turnDeadlineAtMs ?? null,
			})
			: undefined,
	};
}

export type EndTurnPokerFoldResult =
	| { readonly status: 'not_required' }
	| { readonly status: 'applied' }
	| { readonly status: 'rejected'; readonly reason: 'engine_rejected' };

/**
 * Apply the Poker half of the cross-mode End Turn action. The caller supplies
 * the viewer-relative side because the remote cards reducer swaps perspective
 * while the Poker store remains viewer-relative.
 */
export function applyEndTurnPokerFold(side: EndTurnPokerFoldSide): EndTurnPokerFoldResult {
	const adapter = getPokerCombatAdapterState();
	const before = adapter.combatState;
	const plan = planEndTurnPokerFold({
		isActive: adapter.isActive,
		combatState: before,
		isTransitioningHand: useUnifiedCombatStore.getState().isTransitioningHand,
		side,
	});
	if (plan.status === 'not_required') return plan;

	adapter.performAction(
		plan.playerId,
		CombatAction.BRACE,
		undefined,
		'player',
		useMatchStore.getState().activeMatch?.opponent.kind === 'peer'
			? getCanonicalPokerActionNowMs({
				origin: 'player',
				deadlineAtMs: before?.turnDeadlineAtMs ?? null,
			})
			: undefined,
	);
	const after = getPokerCombatAdapterState().combatState;
	return after && after !== before
		? { status: 'applied' }
		: { status: 'rejected', reason: 'engine_rejected' };
}

// Guard: prevents a second attack from being initiated while one is already animating
let isAttackProcessing = false;
let attackWatchdogTimer: ReturnType<typeof setTimeout> | null = null;

// Auto-end-turn timer (declared early so initGame/resetGameState can clear it)
let autoEndTurnTimer: ReturnType<typeof setTimeout> | null = null;

// Guard: prevents double-firing endTurn while AI is thinking
let isAITurnProcessing = false;

/**
 * Lazy read of the player's NFT collection from the Hive data store.
 * Lives behind globalThis to keep the game-engine chunk independent of
 * the blockchain chunk (HiveDataLayer registers itself at creation time
 * via `unifiedCombatStore.ts`-style ambient publishing). Returns
 * `undefined` when the store hasn't been mounted yet — that path is
 * exercised at module-load and during tests.
 */
function readHiveCollection(): HiveCardAsset[] | undefined {
  try {
    const hiveStore = (globalThis as Record<string, unknown>).__ragnarokHiveDataStore as
      { getState: () => { cardCollection?: HiveCardAsset[] } } | undefined;
    return hiveStore?.getState?.()?.cardCollection;
  } catch {
    return undefined;
  }
}

// Create store with subscribeWithSelector middleware for precise battlefield monitoring
export const useGameStore = create<GameStore>()(subscribeWithSelector((set, get) => ({
  gameState: initializeGame(),
  matchSeed: null,
  myCanonicalSide: null,
  matchId: null,
  lastStateHash: null,
  selectedCard: null,
  hoveredCard: null,
  attackingCard: null,
  heroTargetMode: false,

  initGame: () => {
    if (autoEndTurnTimer) { clearTimeout(autoEndTurnTimer); autoEndTurnTimer = null; }
    isAttackProcessing = false;
    isAITurnProcessing = false;
    if (attackWatchdogTimer) { clearTimeout(attackWatchdogTimer); attackWatchdogTimer = null; }

    const { selectedDeck, selectedHero, selectedHeroId } = useGame.getState();
    const hiveCollection = readHiveCollection();
    cardsRng = null;

    set({
      gameState: initializeGameSeeded({
        rng: cryptoRng,
        playerIdGen: cryptoIdGen,
        opponentIdGen: cryptoIdGen,
        selectedDeckId: selectedDeck ?? undefined,
        selectedHeroClass: selectedHero ?? undefined,
        selectedHeroId: selectedHeroId ?? undefined,
        hiveCollection,
      }),
      // SP convention: human is always first-mover globally → 'player'.
      // P2P sets this from `deriveCanonicalSide` after seed_reveal instead;
      // SP never goes through that path.
      matchSeed: null,
      matchId: null,
      myCanonicalSide: 'player',
      selectedCard: null,
      hoveredCard: null,
      attackingCard: null,
      heroTargetMode: false,
    });
  },

  initGameWithSeed: (matchSeed: string) => {
    if (autoEndTurnTimer) { clearTimeout(autoEndTurnTimer); autoEndTurnTimer = null; }
    isAttackProcessing = false;
    isAITurnProcessing = false;
    if (attackWatchdogTimer) { clearTimeout(attackWatchdogTimer); attackWatchdogTimer = null; }

    const { selectedDeck, selectedHero, selectedHeroId } = useGame.getState();
    const hiveCollection = readHiveCollection();

    const rng = createSeededRng(matchSeed);
    const playerIdGen = createSeededIdGen(matchSeed, 'p1');
    const opponentIdGen = createSeededIdGen(matchSeed, 'p2');
    get().bindCardsRng(matchSeed);

    set({
      matchSeed,
      gameState: initializeGameSeeded({
        rng,
        playerIdGen,
        opponentIdGen,
        selectedDeckId: selectedDeck ?? undefined,
        selectedHeroClass: selectedHero ?? undefined,
        selectedHeroId: selectedHeroId ?? undefined,
        hiveCollection,
      }),
      selectedCard: null,
      hoveredCard: null,
      attackingCard: null,
      heroTargetMode: false,
    });
  },

  bindCardsRng: (matchSeed: string) => {
    cardsRng = seededRngFromString(`${matchSeed}:cards`);
  },

  initGameFromHandshake: (input) => {
    if (autoEndTurnTimer) { clearTimeout(autoEndTurnTimer); autoEndTurnTimer = null; }
    isAttackProcessing = false;
    isAITurnProcessing = false;
    if (attackWatchdogTimer) { clearTimeout(attackWatchdogTimer); attackWatchdogTimer = null; }

    get().bindCardsRng(input.matchSeed);
    set({
      matchSeed: input.matchSeed,
      myCanonicalSide: input.myCanonicalSide,
      gameState: buildHandshakeGameState(input),
      selectedCard: null,
      hoveredCard: null,
      attackingCard: null,
      heroTargetMode: false,
    });
  },

	playCard: (cardId: string, targetId?: string, targetType?: 'minion' | 'hero', insertionIndex?: number, payWithBlood?: boolean) => {
	    const { gameState, matchSeed, myCanonicalSide } = get();
	    const pokerTiming = getPokerCommandTiming();
    const command = {
      type: GAME_COMMAND_TYPES.playCard,
      cardId,
      targetId,
      targetType,
      insertionIndex,
      payWithBlood,
    } as const;
	    const result = applyGameCommand(gameState, command, {
	      isAiSimulationMode: isAISimulationMode,
	      rng: commandRng(),
	      idGen: commandIdGenFor(matchSeed, gameState, command, myCanonicalSide),
	      ...pokerTiming,
	    });

	    applyGameCommandToStore({
      command,
      beforeState: gameState,
      result,
	      setState: set,
	    });
	    return result;
	  },

	  applyOpponentCommand: (command: GameCommand) => {
	    const { gameState, matchSeed, myCanonicalSide } = get();
	    const pokerTiming = getPokerCommandTiming();
	    const result = applyOpponentCommand(gameState, command, {
	      isAiSimulationMode: isAISimulationMode,
	      rng: commandRng(),
	      idGen: commandIdGenFor(matchSeed, gameState, command, myCanonicalSide),
	      ...pokerTiming,
	      canonicalMulliganFirstActor: myCanonicalSide === 'opponent' ? 'opponent' : 'player',
	    });

    applyGameCommandToStore({
      command,
      beforeState: gameState,
      result,
      setState: set,
    });
	if (result.status === 'applied'
		&& (command.type === GAME_COMMAND_TYPES.frontlineAttack
			|| command.type === GAME_COMMAND_TYPES.norseHeroPower
			|| command.type === GAME_COMMAND_TYPES.weaponUpgrade)) {
		applyPokerAuxiliaryEffects(command, 'opponent');
	}

    return result;
  },

	  endTurn: () => {
	    // Guard: prevent double-firing while AI is thinking
	    if (isAITurnProcessing) {
	      debug.log('[EndTurn] Blocked — AI turn still processing');
	      return ignoredGameCommand(get().gameState, 'ai_turn_in_progress');
    }

	    const { gameState, matchSeed, myCanonicalSide } = get();

    const command = { type: GAME_COMMAND_TYPES.endTurn } as const;
	    const result = applyGameCommand(gameState, command, {
	      isAiSimulationMode: isAISimulationMode,
	      rng: commandRng(),
	      idGen: commandIdGenFor(matchSeed, gameState, command, myCanonicalSide),
	    });

    applyGameCommandToStore({
      command,
      beforeState: gameState,
      result,
	      setState: set,
	    });

	    if (result.status !== 'applied') return result;

	    // End Turn = Fold in poker, but only after the canonical cards command
	    // has committed. If the cards reducer rejects/ignores the command, a
	    // pre-applied Poker fold would become a local-only mutation and the
	    // remote peer could never reproduce the cross-mode transition.
	    const pokerFold = applyEndTurnPokerFold('player');
	    if (pokerFold.status === 'applied') debug.log('[UnifiedEndTurn] End Turn = Fold');

	    // A peer match must never arm local opponent AI, even if its transport is down.
	    if (isPeerOpponentMatch()) return result;

    // AI delay + AI turn — kept in wrapper so the isAITurnProcessing guard above remains coherent.
    const aiDelay = 1800 + Math.random() * 1000;
    const scheduledTurnNumber = result.state.turnNumber;
    isAITurnProcessing = true;
	    setTimeout(() => {
      try {
        const { gameState: currentState } = get();
        if (currentState.currentTurn !== 'opponent') return;
        if (currentState.gamePhase === 'game_over') return;
        if (currentState.turnNumber !== scheduledTurnNumber) return;
        // Re-check in case the match mode changed while a local-AI timer was pending.
        if (isPeerOpponentMatch()) return;

        const finalState = processAITurn(currentState);
        logActivity('turn_start', 'player', `Turn ${finalState.turnNumber} - Your turn`);
        set({ gameState: finalState });
      } finally {
        isAITurnProcessing = false;
      }
	    }, aiDelay);
	    return result;
  },

  // Select a card as a possible attacker
  selectAttacker: (card: CardInstance | CardInstanceWithCardData | null) => {
    const targetingStore = useTargetingStore.getState();

    // If card is not null, set it as the attacking card
    if (card) {
      // Guard against re-entry — if already targeting this card, skip
      const currentAttacker = get().attackingCard;
      if (currentAttacker && currentAttacker.instanceId === card.instanceId && targetingStore.isTargeting) {
        debug.log('[Targeting] Already targeting this card, skipping re-entry');
        return;
      }
      set({ attackingCard: card as CardInstance });

      // Calculate valid targets for this attacker
	      const { gameState } = get();
      const opponentBattlefield = gameState.players.opponent.battlefield || [];

      // Check if any opponent minion has taunt
      const hasTaunt = opponentBattlefield.some((m: CardInstance) =>
        hasKeyword(m, 'taunt')
      );

      // Build list of valid target IDs
      const validTargetIds: string[] = [];

      if (hasTaunt) {
        // Can only attack taunt minions (stealth doesn't protect a taunt minion)
        opponentBattlefield.forEach((m: CardInstance) => {
          if (hasKeyword(m, 'taunt')) {
            validTargetIds.push(m.instanceId);
          }
        });
      } else {
        // Can attack any non-stealthed opponent minion or hero
        opponentBattlefield.forEach((m: CardInstance) => {
          if (!hasKeyword(m, 'stealth')) {
            validTargetIds.push(m.instanceId);
          }
        });
        validTargetIds.push('opponent-hero');
      }

      debug.log('[Targeting] Starting targeting for', card.instanceId, 'with valid targets:', validTargetIds);
      targetingStore.startTargeting(card.instanceId, validTargetIds);
    } else {
      // Clear the selection and cancel targeting
      set({ attackingCard: null });
      targetingStore.cancelTargeting();
    }
  },

  // Execute an attack with the selected card against a target (or hero if no target)
	  attackWithCard: (attackerId: string, defenderId?: string) => {
	    // Prevent re-entry while a previous attack animation is in flight
	    if (isAttackProcessing) return ignoredGameCommand(get().gameState, 'attack_in_progress');
    isAttackProcessing = true;
    if (attackWatchdogTimer) clearTimeout(attackWatchdogTimer);
    attackWatchdogTimer = setTimeout(() => {
      isAttackProcessing = false;
      attackWatchdogTimer = null;
    }, 5000);

	    try {
	      const { gameState, matchSeed, myCanonicalSide } = get();
      const attackerCard = gameState.players.player.battlefield.find(
        c => c.instanceId === attackerId
      );

      // Asymmetric early-return: when the attacker isn't on our player.battlefield,
      // this is either a P2P host receiving an opponent's attack or a stale ID.
      // Bypass the canonical pipeline so processAttack's player-side checks don't surface as toasts.
	      if (!attackerCard) {
	        useTargetingStore.getState().cancelTargeting();
	        set({ attackingCard: null, selectedCard: null });
	        return ignoredGameCommand(gameState, 'attacker_not_found');
      }

	      const command = {
        type: GAME_COMMAND_TYPES.attack,
        attackerId,
        defenderId,
	      } as const;
	      const pokerTiming = getPokerCommandTiming();
	      const result = applyGameCommand(gameState, command, {
	        isAiSimulationMode: isAISimulationMode,
	        rng: commandRng(),
	        idGen: commandIdGenFor(matchSeed, gameState, command, myCanonicalSide),
	        ...pokerTiming,
	      });

      if (result.status === 'applied') {
        // Keep event data on the same gameplay authority as resolution.
        const damage = getEffectiveAttack(attackerCard);
        const targetMinion = gameState.players.opponent.battlefield.find(c => c.instanceId === defenderId);
        const counterDamage = targetMinion
          ? getEffectiveAttack(targetMinion)
          : 0;
        const isHeroTarget = !defenderId || defenderId === 'opponent-hero';

        const combatStep = createCombatStep(
          attackerId,
          attackerCard.card.name,
          damage,
          defenderId || 'opponent-hero',
          targetMinion?.card.name || 'Opponent Hero',
          isHeroTarget ? 'hero' : 'minion',
          counterDamage,
          attackerCard.hasDivineShield || false,
          targetMinion?.hasDivineShield || false,
          'player',
        );
        const resolvedAttack = createResolvedAttackFromStates(gameState, result.state, combatStep);

        CombatEventBus.emitImpactPhase({
          attackerId,
          targetId: defenderId || 'opponent-hero',
          damageToTarget: resolvedAttack.damageToTarget,
          damageToAttacker: resolvedAttack.damageToAttacker,
          resolvedAttack,
          presentation: buildCombatPresentationFromResolvedAttack(resolvedAttack),
        });

        CombatEventBus.emitDamageResolved({
          sourceId: attackerId,
          sourceType: 'minion',
          targetId: defenderId || 'opponent-hero',
          targetType: isHeroTarget ? 'hero' : 'minion',
          actualDamage: resolvedAttack.healthDamageToTarget,
          damageSource: 'minion_attack',
          attackerOwner: 'player',
          defenderOwner: 'opponent',
          targetHealthBefore: resolvedAttack.targetHealthBefore,
          targetHealthAfter: resolvedAttack.targetHealthAfter,
          targetDied: resolvedAttack.targetLethal,
          shieldConsumed: resolvedAttack.targetShieldConsumed,
          counterDamage: isHeroTarget ? undefined : resolvedAttack.damageToAttacker,
          counterTargetHealthBefore: isHeroTarget ? undefined : resolvedAttack.attackerHealthBefore,
          counterTargetHealthAfter: isHeroTarget ? undefined : resolvedAttack.attackerHealthAfter,
          counterTargetDied: isHeroTarget ? undefined : resolvedAttack.attackerLethal,
          counterShieldConsumed: isHeroTarget ? undefined : resolvedAttack.attackerShieldConsumed,
        });
      }

	      applyGameCommandToStore({
        command,
        beforeState: gameState,
        result,
	        setState: set,
	      });
	      return result;
	    } catch (error) {
	      debug.error('Error processing attack:', error);
	      useTargetingStore.getState().cancelTargeting();
      set({ attackingCard: null, selectedCard: null });
	      return rejectedGameCommand(get().gameState, 'attack_processing_failed');
	    } finally {
      isAttackProcessing = false;
      if (attackWatchdogTimer) { clearTimeout(attackWatchdogTimer); attackWatchdogTimer = null; }
    }
  },

  autoAttackAll: (mode: 'minion' | 'hero' = 'minion') => {
    get().frontlineAttack(mode);
  },

	  frontlineAttack: (mode: FrontlineAttackMode = 'minion', actionId = crypto.randomUUID()) => {
	    const { gameState, matchSeed, myCanonicalSide } = get();
	    const pokerTiming = getPokerCommandTiming();
    const command = { type: GAME_COMMAND_TYPES.frontlineAttack, mode, actionId } as const;
	    const result = applyGameCommand(gameState, command, {
	      isAiSimulationMode: isAISimulationMode,
	      rng: commandRng(),
	      idGen: commandIdGenFor(matchSeed, gameState, command, myCanonicalSide),
	      ...pokerTiming,
	    });
	    applyGameCommandToStore({ command, beforeState: gameState, result, setState: set });
	    if (result.status === 'applied') applyPokerAuxiliaryEffects(command, 'player');
	    return result;
	  },

  selectCard: (card: CardInstance | CardInstanceWithCardData | null) => {
    if (card) {
      set({ selectedCard: card as CardInstance });
    } else {
      set({ selectedCard: null });
    }
  },

  // Reset the game state to initial values
  resetGameState: () => {
    if (autoEndTurnTimer) { clearTimeout(autoEndTurnTimer); autoEndTurnTimer = null; }
    isAITurnProcessing = false;
    debug.log('Resetting game state to initial values');
    cardsRng = null;
    set({
      gameState: initializeGame(),
      matchSeed: null,
      myCanonicalSide: null,
      matchId: null,
      selectedCard: null,
      hoveredCard: null,
      attackingCard: null,
      heroTargetMode: false
    });
  },

  setGameState: (state: Partial<GameState>) => {
    const { gameState } = get();
    set({
      gameState: {
        ...gameState,
        ...state
      }
    });
  },

  selectDiscoveryOption: (card: CardData | null) => {
    const { gameState, matchSeed, myCanonicalSide } = get();
    const command = { type: GAME_COMMAND_TYPES.selectDiscoveryOption, card } as const;
    const result = applyGameCommand(gameState, command, {
      rng: commandRng(),
      idGen: commandIdGenFor(matchSeed, gameState, command, myCanonicalSide),
    });
    applyGameCommandToStore({ command, beforeState: gameState, result, setState: set });
    return result;
  },

  // Directly set the players (useful for AI simulation)
  setPlayers: (players: GameState['players']) => {
    if (process.env.NODE_ENV === 'development') {
      debug.log('Setting players directly');
    }
    const { gameState } = get();

    const shallowEqual = (a: any, b: any) =>
      a.health === b.health &&
      a.heroHealth === b.heroHealth &&
      a.mana?.current === b.mana?.current &&
      a.mana?.max === b.mana?.max &&
      a.hand?.length === b.hand?.length &&
      a.battlefield?.length === b.battlefield?.length &&
      a.deck?.length === b.deck?.length;
    if (
      shallowEqual(gameState.players.player, players.player) &&
      shallowEqual(gameState.players.opponent, players.opponent)
    ) {
      return;
    }

      set({
        gameState: {
          ...gameState,
          players: players as any
        }
      });
  },

  setHoveredCard: (card: CardInstance | CardInstanceWithCardData | null) => {
    if (card) {
      set({ hoveredCard: card as CardInstance });
    } else {
      set({ hoveredCard: null });
    }
  },

  // Toggle hero power targeting mode
  toggleHeroTargetMode: () => {
    const { heroTargetMode, gameState } = get();

    // Can only enter hero power mode if it's player's turn and hero power is not used
    const pokerCombat = getPokerCardTimingContext();
    const canAct = pokerCombat
      ? canActInPokerWindow({ combatState: pokerCombat, actor: pokerCombat.playerId }).ok
      : gameState.currentTurn === 'player';
    if (!heroTargetMode && canAct && !gameState.players.player.heroPower.used) {
      // Check if player has enough mana for hero power
      if (gameState.players.player.mana.current >= gameState.players.player.heroPower.cost) {
        set({
          heroTargetMode: true,
          attackingCard: null  // Clear any attack selection
        });
        debug.log(`Hero power mode activated: ${gameState.players.player.heroPower.name}`);
      } else {
        debug.error('Not enough mana to use hero power');
      }
    } else {
      // Exit hero power mode
      set({ heroTargetMode: false });
      debug.log('Hero power mode deactivated');
    }
  },

  // Toggle a card selection during mulligan phase
  toggleMulliganCard: (cardId: string) => {
    const { gameState } = get();
    const newState = useMulliganStore.getState().toggleMulliganCard(gameState, cardId);
    if (newState) {
      set({ gameState: newState });
      return appliedGameCommand(newState);
    }
    return rejectedGameCommand(gameState, 'mulligan_selection_rejected');
  },

  // Confirm mulligan selections and replace selected cards
  confirmMulligan: () => {
    const { gameState, matchSeed, myCanonicalSide } = get();
    const command = { type: GAME_COMMAND_TYPES.confirmMulligan } as const;
    const result = applyGameCommand(gameState, command, {
      isAiSimulationMode: isAISimulationMode,
      rng: commandRng(),
	      idGen: commandIdGenFor(matchSeed, gameState, command, myCanonicalSide),
	      canonicalMulliganFirstActor: myCanonicalSide === 'opponent' ? 'opponent' : 'player',
    });

    applyGameCommandToStore({
      command,
      beforeState: gameState,
      result,
      setState: set,
    });

    // Only local AI matches complete the opponent half implicitly. P2P must
    // wait for the signed remote confirm/skip command so both peers execute
    // the same deterministic mulligan transition.
	    if (result.status === 'applied' && !isPeerOpponentMatch()) {
      const committedState = result.state;
	      if (!committedState) return result;
      const aiState = useMulliganStore.getState().confirmAiMulligan(committedState);
	      if (aiState && aiState !== committedState) set({ gameState: aiState });
	    }
	    return result;
  },

  // Skip mulligan and keep all cards
  skipMulligan: () => {
	    const { gameState, matchSeed, myCanonicalSide } = get();
    const command = { type: GAME_COMMAND_TYPES.skipMulligan } as const;
    const result = applyGameCommand(gameState, command, {
      isAiSimulationMode: isAISimulationMode,
      rng: commandRng(),
	      idGen: commandIdGenFor(matchSeed, gameState, command, myCanonicalSide),
	      canonicalMulliganFirstActor: myCanonicalSide === 'opponent' ? 'opponent' : 'player',
    });

    applyGameCommandToStore({
      command,
      beforeState: gameState,
      result,
      setState: set,
    });

	    if (result.status === 'applied' && !isPeerOpponentMatch()) {
      const committedState = result.state;
	      if (!committedState) return result;
      const aiState = useMulliganStore.getState().confirmAiMulligan(committedState);
	      if (aiState && aiState !== committedState) set({ gameState: aiState });
	    }
	    return result;
  },

  // Use hero power on a target (or no target for some powers like Armor Up).
  // Note: this covers the GENERIC hero power path (mage fireblast, warrior armor, etc.,
  // including Norse heroes whose powers route through `executeNorseHeroPower` inside
  // the canonical `executeHeroPower`). Poker-combat Norse powers use the separate
  // `norse_hero_power` auxiliary command so their Poker-slot effects can be mirrored
  // deterministically on both peers.
	performHeroPower: (targetId?: string, targetType?: 'card' | 'hero') => {
	    const { gameState, heroTargetMode, matchSeed, myCanonicalSide } = get();
	    const pokerTiming = getPokerCommandTiming();
    const player = gameState.players.player;

    // UX pre-step: some hero powers require a target (e.g. mage Fireblast).
    // If the user clicked the hero-power button without picking a target yet,
    // enter target-selection mode and bail out — the next click will retry.
    const heroClass = player.heroClass.toLowerCase();
    const heroId = player.hero?.id;
    const needsTarget = heroClass === 'mage' && heroId !== 'hero-odin';
	    if (needsTarget && (!targetId || !targetType)) {
      if (!heroTargetMode) {
        set({ heroTargetMode: true });
        emitNotification({ message: 'Select a target for your hero power', level: 'info' });
        return rejectedGameCommand(gameState, 'hero_power_target_required');
      }
      debug.error('[HeroPower] Target required but none provided');
      return rejectedGameCommand(gameState, 'hero_power_target_required');
    }

    const command = {
      type: GAME_COMMAND_TYPES.useHeroPower,
      targetId,
      targetType,
    } as const;
	    const result = applyGameCommand(gameState, command, {
	      isAiSimulationMode: isAISimulationMode,
	      rng: commandRng(),
	      idGen: commandIdGenFor(matchSeed, gameState, command, myCanonicalSide),
	      ...pokerTiming,
	    });

    applyGameCommandToStore({
      command,
      beforeState: gameState,
      result,
      setState: set,
    });

	    if (result.status !== 'applied') return result;

    // Wrapper-only side effects: bespoke UI cues that don't fit the canonical
    // effect vocabulary. Ordered AFTER state apply so they reflect committed action.
    const announcementStoreState = useAnnouncementStore.getState();
    if (announcementStoreState && announcementStoreState.addAnnouncement) {
      announcementStoreState.addAnnouncement({
        type: 'action' as any,
        title: player.heroPower.name,
        subtitle: player.heroPower.description,
        iconName: 'sparkles',
        duration: 2000,
      });
    }

    emitNotification({ message: `Used Hero Power: ${player.heroPower.name}`, level: 'success' });

	    GameEventBus.emitAnimationRequest({
      animationType: 'hero_power_effect',
      sourceId: 'player',
	      params: { heroClass, effectType: player.heroPower.name },
	    });
	    return result;
  },

  performNorseHeroPower: (
		norseHeroId: string,
		targetId?: string,
		targetType?: 'minion' | 'hero',
		actionId = crypto.randomUUID(),
	) => {
			const { gameState, matchSeed, myCanonicalSide } = get();
			const pokerTiming = getPokerCommandTiming();
		const command = {
			type: GAME_COMMAND_TYPES.norseHeroPower,
			norseHeroId,
			targetId,
			targetType,
			actionId,
		} as const;
			const result = applyGameCommand(gameState, command, {
				isAiSimulationMode: isAISimulationMode,
				rng: commandRng(),
				idGen: commandIdGenFor(matchSeed, gameState, command, myCanonicalSide),
				...pokerTiming,
			});
		applyGameCommandToStore({ command, beforeState: gameState, result, setState: set });
		if (result.status === 'applied') applyPokerAuxiliaryEffects(command, 'player');
		return result;
	},

	weaponUpgrade: (norseHeroId: string, actionId = crypto.randomUUID()) => {
		const { gameState, matchSeed, myCanonicalSide } = get();
		const pokerTiming = getPokerCommandTiming();
		const command = { type: GAME_COMMAND_TYPES.weaponUpgrade, norseHeroId, actionId } as const;
		const result = applyGameCommand(gameState, command, {
			isAiSimulationMode: isAISimulationMode,
			rng: commandRng(),
			idGen: commandIdGenFor(matchSeed, gameState, command, myCanonicalSide),
			...pokerTiming,
		});
		applyGameCommandToStore({ command, beforeState: gameState, result, setState: set });
		if (result.status === 'applied') applyPokerAuxiliaryEffects(command, 'player');
		return result;
	},

  grantPokerHandRewards: (command: GrantPokerHandRewardsCommand) => {
    const { gameState, matchSeed, myCanonicalSide } = get();
    const result = applyGameCommand(gameState, command, {
      rng: commandRng(),
      idGen: commandIdGenFor(matchSeed, gameState, command, myCanonicalSide),
    });
    applyGameCommandToStore({ command, beforeState: gameState, result, setState: set });
    return result;
  },

  setupOpponentSpellPetCards: () => {
    const { gameState } = get();
    if (!gameState) return;
    if (isPeerOpponentMatch()) return;

    const newState = processOpponentSpellPetSetup(gameState);
    if (newState !== gameState) {
      set({ gameState: newState });
    }
  },

  updateStateHash: () => {
    const { gameState } = get();
    if (!gameState) return;
    computeStateHash(gameState).then(hash => {
      set({ lastStateHash: hash });
    }).catch(err => {
      debug.error('[gameStore] WASM state hash failed:', err);
    });
  },
})));

// Register on globalThis for lazy access by game-engine chunk (avoids circular import)
(globalThis as Record<string, unknown>).__ragnarokGameStore = useGameStore;

let _gameStoreUnsubs: (() => void)[] = [];

export function initGameStoreSubscriptions() {
	if (_gameStoreUnsubs.length > 0) return;

	_gameStoreUnsubs.push(useGameStore.subscribe((state, prevState) => {
		const currPlayerBattlefield = state.gameState?.players?.player?.battlefield || [];
		const prevPlayerBattlefield = prevState.gameState?.players?.player?.battlefield || [];
		const currOpponentBattlefield = state.gameState?.players?.opponent?.battlefield || [];
		const prevOpponentBattlefield = prevState.gameState?.players?.opponent?.battlefield || [];

		const prevPlayerCards = prevPlayerBattlefield.map((c: any) => c?.card?.name || `id:${c?.instanceId}` || 'unknown');
		const currPlayerCards = currPlayerBattlefield.map((c: any) => c?.card?.name || `id:${c?.instanceId}` || 'unknown');
		const prevOpponentCards = prevOpponentBattlefield.map((c: any) => c?.card?.name || `id:${c?.instanceId}` || 'unknown');
		const currOpponentCards = currOpponentBattlefield.map((c: any) => c?.card?.name || `id:${c?.instanceId}` || 'unknown');

		const stack = captureStackTrace();

		logBattlefieldChange('player', prevPlayerCards, currPlayerCards, stack);
		logBattlefieldChange('opponent', prevOpponentCards, currOpponentCards, stack);
	}));

	_gameStoreUnsubs.push(useGameStore.subscribe((state, _prevState) => {
		if (autoEndTurnTimer) {
			clearTimeout(autoEndTurnTimer);
			autoEndTurnTimer = null;
		}

		const gs = state.gameState;
		if (!gs || gs.currentTurn !== 'player' || gs.gamePhase !== 'playing') return;
		// A peer match must route every canonical turn transition through the
		// P2P command wrapper so it is signed and delivered before either browser
		// mutates its local state. The global auto-end timer has no access to that
		// wrapper; arming it here would create a local-only endTurn during a
		// reconnect or VPN/IP transition. The multiplayer controller can still
		// expose an explicit end-turn action once the transport is ready.
		if (isPeerOpponentMatch()) return;

		const player = gs.players?.player;
		if (!player) return;

		const currentMana = player.mana?.current ?? 0;
		const hand = player.hand || [];
		const battlefield = player.battlefield || [];

		const hasPlayableCard = hand.some((c: CardInstance) => {
			const cost = c.card?.manaCost ?? 999;
			return cost <= currentMana;
		});

		const hasAvailableAttacker = battlefield.some((m: CardInstance) => {
			if (m.hasAttacked || m.isFrozen || m.isSummoningSick) return false;
			const atk = getEffectiveAttack(m);
			return atk > 0;
		});

		const heroPower = player.heroPower;
		const canUseHeroPower = heroPower && !heroPower.used && currentMana >= heroPower.cost;

		if (!hasPlayableCard && !hasAvailableAttacker && !canUseHeroPower) {
			// Only auto-end if the user has opted in via Settings → Gameplay → Auto End Turn
			let autoEndEnabled = false;
			try {
				const { useSettingsStore } = require('./settingsStore');
				autoEndEnabled = useSettingsStore.getState().autoEndTurn;
			} catch { /* settings not available — skip */ }

			if (autoEndEnabled) {
				autoEndTurnTimer = setTimeout(() => {
					if (isPeerOpponentMatch()) return;
					const currentGs = useGameStore.getState().gameState;
					if (currentGs?.currentTurn === 'player' && currentGs?.gamePhase === 'playing') {
						useGameStore.getState().endTurn();
					}
				}, 3000);
			}
		}
	}));
}

export function disposeGameStoreSubscriptions() {
	_gameStoreUnsubs.forEach(unsub => unsub());
	_gameStoreUnsubs = [];
	if (autoEndTurnTimer) { clearTimeout(autoEndTurnTimer); autoEndTurnTimer = null; }
	if (attackWatchdogTimer) { clearTimeout(attackWatchdogTimer); attackWatchdogTimer = null; }
}

// Stable empty fallback for the player-hand selector. A zustand selector
// MUST return the same reference across calls when state hasn't changed —
// otherwise `useSyncExternalStore` sees snapshot drift and loops on
// re-render. Module-scope const gives that stability. Typed as mutable
// (not frozen) because downstream consumers expect `CardInstance[]`; if
// you reach for `.push`/`.splice` here you will be reaching for an empty
// shared singleton — don't.
export const EMPTY_HAND: CardInstance[] = [];

export function selectPlayerHand(state: GameStore): CardInstance[] {
	return state.gameState?.players?.player?.hand ?? EMPTY_HAND;
}

// Zustand slice selectors — subscribe to specific state slices to avoid excess re-renders
export const usePlayerHand = () => useGameStore(s => s.gameState?.players?.player?.hand);
export const usePlayerBattlefield = () => useGameStore(s => s.gameState?.players?.player?.battlefield);
export const useOpponentBattlefield = () => useGameStore(s => s.gameState?.players?.opponent?.battlefield);
export const useGamePhase = () => useGameStore(s => s.gameState?.gamePhase);
export const useCurrentTurn = () => useGameStore(s => s.gameState?.currentTurn);
export const usePlayerMana = () => useGameStore(s => s.gameState?.players?.player?.mana);
export const usePlayerHeroHealth = () => useGameStore(s => s.gameState?.players?.player?.heroHealth);
