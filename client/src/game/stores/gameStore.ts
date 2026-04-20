import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { showStatus } from '../components/ui/GameStatusBanner';
import { createCardInstance, findCardInstance } from '../utils/cards/cardUtils';
import { hasKeyword } from '../utils/cards/keywordUtils';
import {
  initializeGame,
  playCard,
  endTurn,
  processAttack,
  processAITurn,
  autoAttackWithAllCards
} from '../utils/gameUtils';
import { executeHeroPower } from '../utils/heroPowerUtils';
import { processDiscovery } from '../utils/discoveryUtils';
import { toggleCardSelection, confirmMulligan, skipMulligan } from '../utils/mulliganUtils';
import { useMulliganStore } from './mulliganStore';
import { useDiscoveryStore } from './discoveryStore';
import { usePokerRewardStore } from './pokerRewardStore';
import { CardInstance, GameState, CardData } from '../types';
import { CardInstanceWithCardData } from '../types/interfaceExtensions';
import { useAudio } from '../../lib/stores/useAudio';
import useGame from '../../lib/stores/useGame';
import { useUnifiedUIStore as useAnnouncementStore } from './unifiedUIStore';
import { GameEventBus } from '../../core/events/GameEventBus';
import { isAISimulationMode, debug, getDebugConfig } from '../config/debugConfig';
import { getPokerCombatAdapterState } from '../hooks/usePokerCombatAdapter';
import { CombatAction, CombatPhase } from '../types/PokerCombatTypes';
import { useUnifiedCombatStore } from './unifiedCombatStore';
import { MAX_BATTLEFIELD_SIZE, MAX_HAND_SIZE } from '../constants/gameConstants';
import { useTargetingStore } from './targetingStore';
import { logActivity } from './activityLogStore';
import { CombatEventBus } from '../services/CombatEventBus';
import { getAttack } from '../utils/cards/typeGuards';
import { usePeerStore } from './peerStore';
import { computeStateHash } from '../engine/engineBridge';

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
  lastStateHash: string | null;
  selectedCard: CardInstance | null;
  // For tracking attack selection
  attackingCard: CardInstance | null;
  // For tracking hero power target selection
  heroTargetMode: boolean;
  
  // Game actions
  initGame: () => void;
  playCard: (cardId: string, targetId?: string, targetType?: 'minion' | 'hero', insertionIndex?: number, payWithBlood?: boolean) => void;
  attackWithCard: (attackerId: string, defenderId?: string) => void; // If defenderId is undefined, attack hero
  autoAttackAll: (mode?: 'minion' | 'hero') => void; // Auto-attack with all minions
  selectAttacker: (card: CardInstance | CardInstanceWithCardData | null) => void; // Select card to attack with
  useHeroPower: (targetId?: string, targetType?: 'card' | 'hero') => void; // Use hero power
  toggleHeroTargetMode: () => void; // Toggle hero power targeting mode
  endTurn: () => void;
  selectCard: (card: CardInstance | CardInstanceWithCardData | null) => void;
  resetGameState: () => void;
  setGameState: (state: Partial<GameState>) => void;
  selectDiscoveryOption: (card: CardData | null) => void;
  
  // Mulligan actions
  toggleMulliganCard: (cardId: string) => void;
  confirmMulligan: () => void;
  skipMulligan: () => void;
  
  // Poker hand rewards - give mana crystal and draw a card
  grantPokerHandRewards: () => void;

  // WASM state hash
  updateStateHash: () => void;

  // UI actions
  setHoveredCard: (card: CardInstance | CardInstanceWithCardData | null) => void;
  hoveredCard: CardInstance | null;
}

// Guard: prevents a second attack from being initiated while one is already animating
let isAttackProcessing = false;
let attackWatchdogTimer: ReturnType<typeof setTimeout> | null = null;

// Auto-end-turn timer (declared early so initGame/resetGameState can clear it)
let autoEndTurnTimer: ReturnType<typeof setTimeout> | null = null;

// Guard: prevents double-firing endTurn while AI is thinking
let isAITurnProcessing = false;

// Guard: poker reward retries moved to pokerRewardStore.ts

// Create store with subscribeWithSelector middleware for precise battlefield monitoring
export const useGameStore = create<GameStore>()(subscribeWithSelector((set, get) => ({
  gameState: initializeGame(),
  matchSeed: null,
  lastStateHash: null,
  selectedCard: null,
  hoveredCard: null,
  attackingCard: null,
  heroTargetMode: false,

  initGame: () => {
    if (autoEndTurnTimer) { clearTimeout(autoEndTurnTimer); autoEndTurnTimer = null; }
    isAttackProcessing = false;
    if (attackWatchdogTimer) { clearTimeout(attackWatchdogTimer); attackWatchdogTimer = null; }
    // Get selectedDeck and selectedHero from useGame store
    const { selectedDeck, selectedHero, selectedHeroId } = useGame.getState();
    // Convert null to undefined for function compatibility
    const deckId = selectedDeck === null ? undefined : selectedDeck;
    const hero = selectedHero === null ? undefined : selectedHero;
    const heroId = selectedHeroId === null ? undefined : selectedHeroId;

    set({
      gameState: initializeGame(deckId, hero, heroId),
      selectedCard: null,
      hoveredCard: null,
      attackingCard: null,
      heroTargetMode: false
    });
  },

  playCard: (cardId: string, targetId?: string, targetType?: 'minion' | 'hero', insertionIndex?: number, payWithBlood?: boolean) => {
    const { gameState } = get();
    const audioStore = useAudio.getState();

    try {
      // Check if it's player's turn - add exception for AI simulation
      if (gameState.currentTurn !== 'player' && !isAISimulationMode()) {
        throw new Error('Not your turn');
      }

      // Find the card in player's hand
      const player = gameState.players.player;
      const cardResult = findCardInstance(player.hand, cardId);

      if (!cardResult) {
        debug.warn('Card not found in hand (may have been played already):', cardId);
        return;
      }

      // Extract the card instance from the result
      const cardInstance = cardResult.card as CardInstance;

      // Check if player has enough mana
      if (!player.mana || typeof player.mana.current !== 'number') {
        player.mana = { current: 1, max: 1, overloaded: 0, pendingOverload: 0 };
      }

      const cardCost = cardInstance.card.manaCost ?? 0;
      const bloodCost = cardInstance.card.bloodPrice;
      if (payWithBlood && bloodCost && bloodCost > 0) {
        const heroHp = player.heroHealth ?? player.health ?? 100;
        if (heroHp <= bloodCost) {
          throw new Error(`Not enough health. Need more than ${bloodCost} HP to pay Blood Price`);
        }
      } else if (cardCost > player.mana.current) {
        throw new Error(`Not enough mana. Need ${cardCost} but only have ${player.mana.current}`);
      }

      if (cardInstance.card.type === 'minion' && player.battlefield.length >= MAX_BATTLEFIELD_SIZE) {
        throw new Error(`Battlefield is full! Maximum ${MAX_BATTLEFIELD_SIZE} minions allowed.`);
      }

      // For cards with battlecry that require target, check if we have a target
      if (cardInstance.card.type === 'minion' &&
          hasKeyword(cardInstance, 'battlecry') &&
          cardInstance.card.battlecry?.requiresTarget && 
          !targetId) {
        debug.log(`${cardInstance.card.name} requires a battlecry target`);
        return; // Don't proceed without a target
      }
      
      // Save the card data for reference after it's played
      const cardData = JSON.parse(JSON.stringify(cardInstance.card));
      
      try {
        // Play the card with the target if provided
        const newState = playCard(gameState, cardId, targetId, targetType, insertionIndex, payWithBlood);
        
        // If the card requires a battlecry target but we still don't have a valid game state,
        // it means the battlecry couldn't be executed properly
        if (cardData.type === 'minion' &&
            cardData.keywords?.includes('battlecry') &&
            cardData.battlecry?.requiresTarget &&
            newState === gameState) {
          debug.log('Battlecry target validation failed');
          return;
        }
        
        // Log to saga feed based on card type
        if (cardInstance.card.type === 'spell') {
          logActivity('spell_cast', 'player', `Cast ${cardInstance.card.name}`, {
            cardName: cardInstance.card.name,
            cardId: typeof cardInstance.card.id === 'number' ? cardInstance.card.id : undefined,
            value: cardInstance.card.spellEffect?.value as number
          });
        } else if (cardInstance.card.type === 'minion') {
          logActivity('minion_summoned', 'player', `Summoned ${cardInstance.card.name} (${cardInstance.card.attack}/${cardInstance.card.health})`, {
            cardName: cardInstance.card.name,
            cardId: typeof cardInstance.card.id === 'number' ? cardInstance.card.id : undefined
          });
        }
        
        // Check if the card has a spell effect that triggers discovery
        const hasDiscover = (cardInstance.card.type === 'spell' && cardInstance.card.spellEffect?.type === 'discover') ||
                          hasKeyword(cardInstance, 'discover');

        if (hasDiscover && newState.discovery?.active) {
          // Play sound effect
          if (audioStore && typeof audioStore.playSoundEffect === 'function') {
            audioStore.playSoundEffect('discover');
          }
          
          set({ 
            gameState: newState,
            selectedCard: null
          });
        } else {
          // Normal card play, no discovery
          
          // Play sound effect based on card type
          if (cardInstance.card.rarity === 'mythic') {
            if (audioStore && typeof audioStore.playSoundEffect === 'function') {
              audioStore.playSoundEffect('legendary');
            }
          } else if (cardInstance.card.type === 'minion' &&
                    hasKeyword(cardInstance, 'battlecry') &&
                    cardInstance.card.battlecry?.type === 'damage') {
            if (audioStore && typeof audioStore.playSoundEffect === 'function') {
              audioStore.playSoundEffect('damage');
            }
          } else {
            if (audioStore && typeof audioStore.playSoundEffect === 'function') {
              audioStore.playSoundEffect('card_play');
            }
          }
          
          let finalState = newState;
          const hasCharge = hasKeyword(cardInstance, 'charge');
          const hasRush = hasKeyword(cardInstance, 'rush');
          
          if (cardInstance.card.type === 'minion' && (cardInstance.card.attack ?? 0) > 0 && (hasCharge || hasRush)) {
            // Find the minion in state and ensure it's ready to attack
            const minionIndex = finalState.players.player.battlefield.findIndex(
              (c: CardInstance) => c.instanceId === cardInstance.instanceId
            );
            if (minionIndex !== -1) {
              finalState.players.player.battlefield[minionIndex].isSummoningSick = false;
              finalState.players.player.battlefield[minionIndex].canAttack = true;
            }
          }
          
          // Update state
          set({ 
            gameState: finalState,
            selectedCard: null
          });
        }
      } catch (playCardError) {
        debug.error(`[PLAY-CARD-ERROR] Error in playCard utility for ${cardInstance.card.name}:`, playCardError);
        throw playCardError;
      }
    } catch (error) {
      debug.error('Error playing card:', error);
    }
  },

  endTurn: () => {
    // Guard: prevent double-firing while AI is thinking
    if (isAITurnProcessing) {
      debug.log('[EndTurn] Blocked — AI turn still processing');
      return;
    }

    const { gameState } = get();
    const audioStore = useAudio.getState();

    try {
      // Log end turn to saga feed
      logActivity('turn_end', 'player', `Turn ${gameState.turnNumber} ended`);

      // Phase 1: End player turn, switch to opponent (skip AI simulation for delay)
      const intermediateState = endTurn(gameState, true);

      // Log opponent turn start
      logActivity('turn_start', 'opponent',
        `Turn ${intermediateState.turnNumber} - Opponent's turn`);

      // Play sound effect
      if (audioStore && typeof audioStore.playSoundEffect === 'function') {
        audioStore.playSoundEffect('turn_end');
      }

      // End Turn = Fold in poker
      const pokerAdapter = getPokerCombatAdapterState();
      if (pokerAdapter.isActive && pokerAdapter.combatState) {
        const phase = pokerAdapter.combatState.phase;
        const playerId = pokerAdapter.combatState.player.playerId;

        const isTransitioning = useUnifiedCombatStore.getState().isTransitioningHand;
        const hasFoldWinner = !!pokerAdapter.combatState.foldWinner;
        if (phase !== CombatPhase.MULLIGAN && phase !== CombatPhase.RESOLUTION && !isTransitioning && !hasFoldWinner) {
          debug.log('[UnifiedEndTurn] End Turn = Fold');
          pokerAdapter.performAction(playerId, CombatAction.BRACE);
        } else {
          debug.log(`[UnifiedEndTurn] Skipping fold: phase=${phase}, transitioning=${isTransitioning}`);
        }
      }

      // Set intermediate state (shows opponent's turn, triggers turn banner)
      set({
        gameState: intermediateState,
        selectedCard: null
      });

      // Phase 2: After AI thinking delay, process AI turn and switch back to player
      // Skip AI processing if opponent is a real human (P2P connected)
      const aiDelay = 1800 + Math.random() * 1000; // 1800-2800ms — slow enough to read
      const scheduledTurnNumber = intermediateState.turnNumber;
      isAITurnProcessing = true;
      setTimeout(() => {
        try {
          const { gameState: currentState } = get();
          if (currentState.currentTurn !== 'opponent') return;
          if (currentState.gamePhase === 'game_over') return;
          if (currentState.turnNumber !== scheduledTurnNumber) return;

          // If P2P connected, the opponent is a real human — do NOT run AI
          if (usePeerStore.getState().connectionState === 'connected') return;

          const finalState = processAITurn(currentState);

          logActivity('turn_start', 'player',
            `Turn ${finalState.turnNumber} - Your turn`);

          set({ gameState: finalState });
        } finally {
          isAITurnProcessing = false;
        }
      }, aiDelay);
    } catch (error) {
      debug.error('Error ending turn:', error);
    }
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
    if (isAttackProcessing) return;
    isAttackProcessing = true;
    if (attackWatchdogTimer) clearTimeout(attackWatchdogTimer);
    attackWatchdogTimer = setTimeout(() => {
      isAttackProcessing = false;
      attackWatchdogTimer = null;
    }, 5000);

    const { gameState } = get();
    const audioStore = useAudio.getState();
    const targetingStore = useTargetingStore.getState();

    // Find the attacker card — use fresh state for accurate attacksPerformed
    const attackerCard = get().gameState.players.player.battlefield.find(
      c => c.instanceId === attackerId
    );

    if (attackerCard) {
      const hasMegaWindfury = hasKeyword(attackerCard, 'mega_windfury');
      const hasWindfury = hasKeyword(attackerCard, 'windfury');
      const maxAttacks = hasMegaWindfury ? 4 : hasWindfury ? 2 : 1;
      if ((attackerCard.attacksPerformed || 0) >= maxAttacks) {
        showStatus("This minion already attacked this turn!", 'error');
        targetingStore.cancelTargeting();
        set({ attackingCard: null });
        isAttackProcessing = false;
        if (attackWatchdogTimer) { clearTimeout(attackWatchdogTimer); attackWatchdogTimer = null; }
        return;
      }
    }

    try {
      // Emit animation request — rendering layer handles the visual lunge
      GameEventBus.emitAnimationRequest({
        animationType: 'attack_lunge',
        sourceId: attackerId,
        targetId: defenderId || 'opponent-hero',
        params: { attackerSide: 'player' }
      });

      // Process attack logic immediately (animation is purely visual, non-blocking)
      if (!attackerCard) {
        targetingStore.cancelTargeting();
        set({ attackingCard: null, selectedCard: null });
        isAttackProcessing = false;
        if (attackWatchdogTimer) { clearTimeout(attackWatchdogTimer); attackWatchdogTimer = null; }
        return;
      }

      const newState = processAttack(gameState, attackerId, defenderId);

      // If the state changed, it means the attack was successful
      if (newState !== gameState) {
        // Play sound effect
        if (audioStore && typeof audioStore.playSoundEffect === 'function') {
          audioStore.playSoundEffect('attack');
        }

        // Emit combat events for subscribers (PokerCombatStore, animations, sound, etc.)
        const damage = getAttack(attackerCard.card);
        const targetMinion = gameState.players.opponent.battlefield.find(c => c.instanceId === defenderId);
        const counterDamage = targetMinion ? getAttack(targetMinion.card) : 0;
        const isHeroTarget = !defenderId || defenderId === 'opponent-hero';

        CombatEventBus.emitImpactPhase({
          attackerId: attackerId,
          targetId: defenderId || 'opponent-hero',
          damageToTarget: damage,
          damageToAttacker: isHeroTarget ? 0 : counterDamage
        });

        CombatEventBus.emitDamageResolved({
          sourceId: attackerId,
          sourceType: 'minion',
          targetId: defenderId || 'opponent-hero',
          targetType: isHeroTarget ? 'hero' : 'minion',
          actualDamage: damage,
          damageSource: 'minion_attack',
          attackerOwner: 'player',
          defenderOwner: 'opponent',
          targetHealthBefore: 0,
          targetHealthAfter: 0,
          targetDied: false,
          counterDamage: isHeroTarget ? undefined : counterDamage
        });

        // Log attack to saga feed
        const targetName = defenderId === 'opponent-hero' || !defenderId
          ? 'enemy hero'
          : gameState.players.opponent.battlefield.find(c => c.instanceId === defenderId)?.card.name || 'enemy minion';

        logActivity('attack', 'player', `${attackerCard.card.name} attacked ${targetName}`, {
          cardName: attackerCard.card.name,
          targetName: targetName,
          value: getAttack(attackerCard.card)
        });

        // Clear targeting state - attack completed
        targetingStore.cancelTargeting();

        // Update game state
        set({
          gameState: newState,
          attackingCard: null,
          selectedCard: null
        });
      } else {
        // Attack failed - clear targeting
        targetingStore.cancelTargeting();
        set({ attackingCard: null });
      }
    } catch (error) {
      debug.error('Error processing attack:', error);
      targetingStore.cancelTargeting();
      set({ attackingCard: null, selectedCard: null });
    } finally {
      isAttackProcessing = false;
      if (attackWatchdogTimer) { clearTimeout(attackWatchdogTimer); attackWatchdogTimer = null; }
    }
  },
  
  autoAttackAll: (mode: 'minion' | 'hero' = 'minion') => {
    const { gameState } = get();
    if (gameState.currentTurn !== 'player') return;
    const newState = autoAttackWithAllCards(gameState, mode);
    if (newState !== gameState) {
      set({ gameState: newState, attackingCard: null, selectedCard: null });
    }
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
    set({
      gameState: initializeGame(),
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
    const { gameState } = get();
    const newState = useDiscoveryStore.getState().selectDiscoveryOption(gameState, card);
    if (newState) {
      set({ gameState: newState });
      setTimeout(() => {
        debug.log('[GameStore] Discovery complete, granting deferred poker hand rewards');
        get().grantPokerHandRewards();
      }, 0);
    }
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
    if (!heroTargetMode && gameState.currentTurn === 'player' && !gameState.players.player.heroPower.used) {
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
    if (newState) set({ gameState: newState });
  },

  // Confirm mulligan selections and replace selected cards
  confirmMulligan: () => {
    const { gameState } = get();
    const newState = useMulliganStore.getState().confirmMulligan(gameState);
    if (newState) set({ gameState: newState });
  },

  // Skip mulligan and keep all cards
  skipMulligan: () => {
    const { gameState } = get();
    const newState = useMulliganStore.getState().skipMulligan(gameState);
    if (newState) set({ gameState: newState });
  },
  
  // Use hero power on a target (or no target for some powers like Armor Up)
  useHeroPower: (targetId?: string, targetType?: 'card' | 'hero') => {
    const { gameState, heroTargetMode } = get();
    const audioStore = useAudio.getState();
    
    try {
      // Can only use hero power during player's turn and if not already used
      if (gameState.currentTurn !== 'player' && !isAISimulationMode()) {
        throw new Error('Not your turn');
      }
      
      const player = gameState.players.player;
      
      if (player.heroPower.used) {
        throw new Error('Hero power already used this turn');
      }
      
      if (player.mana.current < player.heroPower.cost) {
        throw new Error(`Not enough mana. Need ${player.heroPower.cost} but only have ${player.mana.current}`);
      }
      
      // Some hero powers don't need a target (warrior, hunter, and special ones like Odin)
      const heroClass = player.heroClass.toLowerCase();
      const heroId = player.hero?.id;
      let needsTarget = false;
      
      // Odin's Wisdom of the Ravens does NOT need a target
      if (heroClass === 'mage' && heroId !== 'hero-odin') {
        needsTarget = true;
      }
      
      // Make sure we have a target if needed
      if (needsTarget && (!targetId || !targetType)) {
        if (!heroTargetMode) {
          set({ heroTargetMode: true });
          showStatus('Select a target for your hero power', 'info');
          return;
        }
        throw new Error('This hero power requires a target');
      }
      
      // Execute the hero power
      const newState = executeHeroPower(gameState, 'player', targetId, targetType);
      
      if (newState === gameState) {
        return;
      }

      // Show action announcement for the hero power
      const announcementStoreState = useAnnouncementStore.getState();
      if (announcementStoreState && announcementStoreState.addAnnouncement) {
        announcementStoreState.addAnnouncement({
          type: 'action' as any,
          title: player.heroPower.name,
          subtitle: player.heroPower.description,
          icon: '✨',
          duration: 2000
        });
      }

      // Play hero power sound effect
      if (audioStore && typeof audioStore.playSoundEffect === 'function') {
        audioStore.playSoundEffect('hero_power');
      }
      
      // Log to saga feed
      logActivity('buff', 'player', `Used ${player.heroPower.name}`);

      // Update game state
      set({
        gameState: newState,
        heroTargetMode: false  // Exit hero power mode
      });
      
      // Success notification
      showStatus(`Used Hero Power: ${player.heroPower.name}`, 'success');

      // Emit hero power effect event — rendering layer handles the visual
      GameEventBus.emitAnimationRequest({
        animationType: 'hero_power_effect',
        sourceId: 'player',
        params: { heroClass, effectType: player.heroPower.name }
      });

      debug.log(`Hero power ${player.heroPower.name} used successfully`);
    } catch (error) {
      debug.error('Error using hero power:', error);
    }
  },
  
  grantPokerHandRewards: () => {
    const { gameState } = get();
    const rewardStore = usePokerRewardStore.getState();

    if (gameState?.mulligan?.active) {
      debug.log('[PokerRewards] Blocked: card game mulligan still active');
      return;
    }

    if (rewardStore.shouldDeferForDiscovery(gameState)) {
      setTimeout(() => get().grantPokerHandRewards(), 500);
      return;
    }

    const newState = rewardStore.grantPokerHandRewards(gameState);
    if (newState) {
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
			const atk = m.currentAttack ?? getAttack(m.card);
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

// Zustand slice selectors — subscribe to specific state slices to avoid excess re-renders
export const usePlayerHand = () => useGameStore(s => s.gameState?.players?.player?.hand);
export const usePlayerBattlefield = () => useGameStore(s => s.gameState?.players?.player?.battlefield);
export const useOpponentBattlefield = () => useGameStore(s => s.gameState?.players?.opponent?.battlefield);
export const useGamePhase = () => useGameStore(s => s.gameState?.gamePhase);
export const useCurrentTurn = () => useGameStore(s => s.gameState?.currentTurn);
export const usePlayerMana = () => useGameStore(s => s.gameState?.players?.player?.mana);
export const usePlayerHeroHealth = () => useGameStore(s => s.gameState?.players?.player?.heroHealth);