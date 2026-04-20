import React, { useEffect, useCallback, useRef, useMemo } from 'react';
import { useGameStore } from '../stores/gameStore';
import SimpleBattlefield from './SimpleBattlefield';
import Hand from './Hand';
import { Graveyard } from './Graveyard';
import { DiscoveryModal } from './DiscoveryModal';
import { MulliganScreen } from './MulliganScreen';
import { CardInstance, CardData } from '../types';
import { CardInstanceWithCardData } from '../types/interfaceExtensions';
import { adaptCardInstance, reverseAdaptCardInstance } from '../utils/cards/cardInstanceAdapter';
import { Position } from '../types/Position';
import TargetingArrow from './TargetingArrow';
import { useAudio } from '../../lib/stores/useAudio';
import { useGameNotifications } from '../hooks/useGameNotifications';
import { useCardPositions } from '../hooks/useCardPositions';
import { AnimationLayer } from './AnimationLayer';
import { useAnimations } from './AnimationContainer';
import { useAIActionManager } from '../animations/AIActionManager';
import { Toaster } from '../../components/ui/sonner';
import DebugRenderCheck from './DebugRenderCheck';
import { preloadImages } from '../utils/assetPreloader';
import { getCardArtPath } from '../utils/art/artMapping';
import ActionNotification from './ActionNotification';
import AIAttackAnimationProcessor from './AIAttackAnimationProcessor';
const CardDetailView = React.lazy(() => import('./CardDetailView').then(m => ({ default: m.CardDetailView })));
import ManaBar from './ManaBar';
import GameAreaContainer from './GameAreaContainer';
import { useEventAnimationBridge } from '../hooks/useEventAnimationBridge';
import { useGraveyardTracking } from '../hooks/useGraveyardTracking';
import TurnTransition from '../animations/TurnTransition';
import EnvironmentalEffect from '../animations/EnvironmentalEffect';

import LegendaryEntrance from '../animations/LegendaryEntrance';
import DynamicAudioLayer from '../audio/DynamicAudioLayer';
import HeroPower from './HeroPower';

// Import professional styling enhancements
import './styles/ProfessionalEnhancements.css';
import './styles/NorseTheme.css';
import NorseBackground from './NorseBackground';

// Quest tracking UI
import { QuestTracker } from './quest';

// Import our new attack system
import UnifiedBattlefieldAttackConnector from '../combat/UnifiedBattlefieldAttackConnector';
import AttackSystem from '../combat/AttackSystem';
import { createHandlePlayerCardClick, createHandleOpponentCardClick, createHandleOpponentHeroClick } from './GameBoardHandlers';
import { isMinion, isSpell, isHero, getAttack, getHealth, hasOverload, hasBattlecry } from '../utils/cards/typeGuards';
import { hasKeyword } from '../utils/cards/keywordUtils';
import { needsPositionChoice } from '../utils/cards/positionUtils';
import { emitBattlecryTriggered, emitDeathrattleTriggered } from '../actions/gameActions';
import { debug } from '../config/debugConfig';
import { GameStatusBanner } from './ui/GameStatusBanner';
import TutorialOverlay from './tutorial/TutorialOverlay';
import { initTutorialSubscriber } from '../subscribers/TutorialSubscriber';
import { useCardPositioning } from '../hooks/useCardPositioning';

// Wire tutorial to game events (once)
initTutorialSubscriber();
import { useTargetingArrows } from '../hooks/useTargetingArrows';
import { useCardDetailModal } from '../hooks/useCardDetailModal';
import { useAttackVisualization } from '../hooks/useAttackVisualization';
import { useGameAnimationEffects } from '../hooks/useGameAnimationEffects';
import { useCardGameKeyboard } from '../hooks/useCardGameKeyboard';
import { useSettingsStore } from '../stores/settingsStore';

// Stable action references — grabbed once, never trigger rerenders
const gameActions = useGameStore.getState();
const playCard = gameActions.playCard;
const endTurn = gameActions.endTurn;
const selectAttacker = gameActions.selectAttacker;
const attackWithCard = gameActions.attackWithCard;
const toggleHeroTargetMode = gameActions.toggleHeroTargetMode;
const useHeroPowerAction = gameActions.useHeroPower;
const selectCard = gameActions.selectCard;
const selectDiscoveryOption = gameActions.selectDiscoveryOption;

export const GameBoard: React.FC<{}> = () => {
  // Only subscribe to state that actually drives renders
  const gameState = useGameStore(state => state.gameState);
  const hoveredCard = useGameStore(state => state.hoveredCard);
  const attackingCard = useGameStore(state => state.attackingCard);
  const selectedCard = useGameStore(state => state.selectedCard);
  const heroTargetMode = useGameStore(state => state.heroTargetMode);
  const useHeroPower = useHeroPowerAction;
  
  // Reference to the game container for effects like screen shake and spell flashes
  const gameContainerRef = useRef<HTMLDivElement>(null);

  // Reference to the battlefield container for card drop validation
  const battlefieldRef = useRef<HTMLDivElement>(null);

  // Extracted hooks
  const {
    mousePosition,
    showTargetingArrow,
    setShowTargetingArrow,
    arrowStartPosition,
    setArrowStartPosition,
    setValidTargets
  } = useTargetingArrows();

  const { detailCard, handleViewCardDetails, handleCloseCardDetails } = useCardDetailModal();

  const {
    pendingPositionalCard,
    handlePositionSelect
  } = useCardPositioning(playCard, gameState.currentTurn);

  const {
    getCardPositionsMap
  } = useAttackVisualization(battlefieldRef);

  const {
    activeLegendaryCard,
    setActiveLegendaryCard,
    activeEnvironmentalEffect,
    setActiveEnvironmentalEffect
  } = useGameAnimationEffects();

  // Card game keyboard shortcuts (Space=end turn, h=hero power, f=fullscreen, etc.)
  useCardGameKeyboard({ enabled: gameState?.gamePhase === 'playing' });

  // Settings subscriptions
  const confirmAttacks = useSettingsStore(s => s.confirmAttacks);

  // Reference to track turn changes for turn transition
  const lastTurnRef = useRef<string | null>(null);

  const {
    currentTurn,
    gamePhase
  } = gameState;

  // Initialize ref on first render to prevent spurious transition animation
  if (lastTurnRef.current === null && currentTurn) {
    lastTurnRef.current = currentTurn;
  }
  
  const { playSoundEffect } = useAudio();
  const { showNotification } = useGameNotifications();
  
  // Convenience functions for common sound effects with enhanced gameplay feedback
  const playHit = () => {
    playSoundEffect('attack');
    // Add screen shake effect for impact
    if (gameContainerRef.current) {
      gameContainerRef.current.classList.add('screen-shake-impact');
      setTimeout(() => {
        if (gameContainerRef.current) {
          gameContainerRef.current.classList.remove('screen-shake-impact');
        }
      }, 500);
    }
  };
  
  const playSuccess = () => {
    playSoundEffect('spell_cast');
    // Add subtle flash effect for spell cast
    if (gameContainerRef.current) {
      gameContainerRef.current.classList.add('spell-cast-flash');
      setTimeout(() => {
        if (gameContainerRef.current) {
          gameContainerRef.current.classList.remove('spell-cast-flash');
        }
      }, 300);
    }
  };
  
  // Card and entity position tracking
  const { registerCardPosition, getCardPosition, getHeroPosition, registerHeroPosition } = useCardPositions();
  
  // Track mana position for animations without causing renders
  const manaPositionRef = React.useRef<{x: number, y: number} | null>(null);
  const registerManaPosition = React.useCallback((type: 'mana', position: {x: number, y: number}) => {
    // Only update if position actually changed
    if (
      !manaPositionRef.current || 
      Math.abs(manaPositionRef.current.x - position.x) > 1 || 
      Math.abs(manaPositionRef.current.y - position.y) > 1
    ) {
      manaPositionRef.current = position;
    }
  }, []);
  
  // Animation system
  const {
    addAttackAnimation,
    addDamageEffect: _rawAddDamageEffect,
    addHealEffect,
    addBuffEffect, 
    addShieldBreakEffect, 
    addHeroPowerEffect,
    addManaUseAnimation,
    addOverloadAnimation
  } = useAnimations();

  // Gate damage popups behind showDamageNumbers setting
  const addDamageEffect = useCallback((...args: Parameters<typeof _rawAddDamageEffect>) => {
    if (useSettingsStore.getState().showDamageNumbers) {
      _rawAddDamageEffect(...args);
    }
  }, [_rawAddDamageEffect]);

  useEventAnimationBridge();

  // Preload all card art in both players' decks + hands on mount
  useEffect(() => {
    const paths: string[] = [];
    for (const side of ['player', 'opponent'] as const) {
      const p = gameState.players[side];
      if (!p) continue;
      for (const ci of [...(p.hand || []), ...(p.deck || [])]) {
        const c = 'card' in ci ? ci.card : ci;
        const art = getCardArtPath(c.name, c.id);
        if (art) paths.push(art);
      }
    }
    if (paths.length > 0) preloadImages(paths);
  }, []);

  useEffect(() => {
    const handleCardPlayEvent = (e: CustomEvent) => {
      const { instanceId, position } = e.detail;
      debug.log('Card play event received:', instanceId, 'at position:', position);

      const player = gameState.players.player;
      if (player && player.hand) {
        const cardToPlay = player.hand.find(card => card.instanceId === instanceId);
        if (cardToPlay) {
          debug.log('Playing card via clean interaction system:', cardToPlay.card.name);
          playCard(instanceId, position);
          playSoundEffect('card_play');
        }
      }
    };

    document.addEventListener('ragnarok-card-play', handleCardPlayEvent as EventListener);

    return () => {
      document.removeEventListener('ragnarok-card-play', handleCardPlayEvent as EventListener);
    };
  }, [gameState.players, playCard, playSoundEffect]);

  // AI Action Manager to control AI turn spacing and animations
  // Important note: We don't use the AI Action Manager for actual turns,
  // since the GameUtils already handles AI turns synchronously.
  // This component only handles the visual display and prevents interaction during AI turns.
  const { 
    isProcessing: isProcessingAIActions,
    currentAction
  } = useAIActionManager({
    gameState,
    // The AI turn doesn't actually need to be managed through this component
    // The endTurn function in gameUtils already handles AI actions synchronously
    isAITurn: false, // Disable automated AI turn management
    onPlayCard: (card, targetId) => {
      playCard(card.instanceId, targetId);
    },
    onAttack: (attackerId, defenderId) => {
      attackWithCard(attackerId, defenderId);
    },
    onUseHeroPower: (targetId) => {
      useHeroPower(targetId);
    },
    onEndTurn: () => {
      endTurn();
    }
  });
  
  // Player's turn flag
  const isPlayerTurn = currentTurn === 'player';

  const player = gameState.players.player;
  const opponent = gameState.players.opponent;

  const targetingMode = useMemo((): 'friendly' | 'enemy' | 'any' | null => {
    if (!selectedCard) return null;
    const battlecryTarget = isMinion(selectedCard.card) ? selectedCard.card.battlecry?.targetType : undefined;
    const spellTarget = isSpell(selectedCard.card) ? selectedCard.card.spellEffect?.targetType : undefined;
    const t = battlecryTarget || spellTarget;
    if (!t) return null;
    if (t === 'friendly_minion' || t === 'friendly') return 'friendly';
    if (t === 'enemy_minion' || t === 'enemy' || t === 'enemy_character') return 'enemy';
    return 'any';
  }, [selectedCard]);
  
  // Compute which hand cards can evolve a battlefield pet right now
  const evolveReadyIds = useMemo(() => {
    const ids = new Set<string>();
    if (!player?.hand || !player?.battlefield) return ids;
    const readyPets = player.battlefield.filter((minion: CardInstance) => minion.petEvolutionMet === true);
    if (readyPets.length === 0) return ids;
    for (const handCard of player.hand) {
      const { card, instanceId } = handCard;
      if (isMinion(card) && card.petStage === 'adept' && card.evolvesFrom) {
        if (readyPets.some(minion => minion.card?.id === card.evolvesFrom)) {
          ids.add(instanceId);
        }
      } else if (isMinion(card) && card.petStage === 'master' && card.petFamily) {
        if (readyPets.some(minion => isMinion(minion.card) && minion.card.petFamily === card.petFamily && minion.card.petStage === 'adept')) {
          ids.add(instanceId);
        }
      }
    }
    return ids;
  }, [player?.hand, player?.battlefield]);

  // Track minion deaths for the graveyard mechanics
  useGraveyardTracking(gameState);
  
  // Handle discovery card selection
  const handleDiscoverySelect = (selectedCard: CardData | null) => {
    // Call the store action
    selectDiscoveryOption(selectedCard);
    
    if (selectedCard) {
      // Play a success sound when a card is selected
      playSuccess();
      
      // Show a notification for the discovery selection
      showNotification({
        title: '✨ Foreseen',
        description: `You foresaw ${selectedCard.name}!`,
        type: 'success',
        duration: 3000
      });
    }
  };

  // Reference to the registered animation system from above
  // (Already initialized earlier in the component)
  
  // Function to get the center of the battlefield
  // Handle playing a card
  const handlePlayCard = (card: CardInstance, cardPosition?: Position) => {
    debug.log(`[CARD-DEBUG] Attempting to play card:`, card);
    debug.log(`[CARD-DEBUG] Card name: ${card?.card?.name}, ID: ${card?.instanceId}, ManaCost: ${card?.card?.manaCost}`);
    
    // Check if card is valid
    if (!card || !card.card) {
      debug.error(`[CARD-ERROR] Invalid card object:`, card);
      showNotification({
        title: `❌ Card Error`,
        description: `Unable to play this card. It appears to be invalid.`,
        type: 'error',
        duration: 2000
      });
      return;
    }
    
    // Check if we have enough mana to play this card
    const playerMana = player.mana?.current || 0;
    debug.log(`[MANA-DEBUG] Player has ${playerMana} mana. Card costs ${card.card.manaCost}.`);
    
    if ((card.card.manaCost ?? 0) > playerMana) {
      debug.log(`[ERROR] Not enough mana. Card costs ${card.card.manaCost}, but player only has ${playerMana}`);
      
      // Show notification to the player
      showNotification({
        title: `❌ Not Enough Mana`,
        description: `${card.card.name} costs ${card.card.manaCost} mana, but you only have ${playerMana}.`,
        type: 'error',
        duration: 2000
      });
      
      return; // Don't proceed with playing the card
    }
    
    // Check if it's a mythic card and show special entrance animation
    if (card.card.rarity === 'mythic' && cardPosition) {
      debug.log(`[LEGENDARY-DEBUG] Triggering mythic entrance for ${card.card.name}`);

      // Set the mythic card to trigger the animation component
      setActiveLegendaryCard({ 
        card: card.card, 
        position: cardPosition 
      });
      
      // Play special mythic sound effect
      playSoundEffect('legendary_entrance');
    }
      
    // Positional minions (magnetic, cleave, buff_adjacent) go to random position
    if (isMinion(card.card) && needsPositionChoice(card) && player.battlefield.length >= 2) {
      const randomIndex = Math.floor(Math.random() * (player.battlefield.length + 1));
      playCard(card.instanceId, undefined, undefined, randomIndex);
      playSoundEffect('card_play');
      return;
    }

    // Check if it's a card that requires a battlecry target (like Dreadscale)
    if (isMinion(card.card) &&
        hasBattlecry(card.card) &&
        card.card.battlecry?.requiresTarget) {
      debug.log(`${card.card.name} requires a battlecry target`);
      
      // Store the card for targeting and update the game state
      selectCard(card);
      debug.log(`Selected ${card.card.name} as the active card, waiting for battlecry target`);
      
      // Show a notification that user needs to select a target
      showNotification({
        title: `🎯 Select Battlecry Target`,
        description: `${card.card.name} requires a target for its battlecry. Click on a minion on the battlefield.`,
        type: 'info',
        duration: 5000
      });
      
      // Don't play the card yet - wait for target selection
      return;
    }
    
    // Play card placement sound
    if (cardPosition) {
      playSoundEffect('card_play');
    }
      
    // Check if it's a spell card with discover keyword
    if (isSpell(card.card) && hasKeyword(card, 'discover') && card.card.spellEffect?.type === 'discover') {
      // Play the card after a delay if animating, or immediately if not
      if (cardPosition) {
        setTimeout(() => {
          playCard(card.instanceId);
          
          // Play success sound for discover spells
          playSuccess();
          
          // Show notification about discovery
          showNotification({
            title: '🔮 Völva\'s Vision',
            description: `Foreseeing options from ${isSpell(card.card) ? (card.card.spellEffect?.discoveryType || 'all') : 'all'} cards`,
            type: 'info',
            duration: 2000
          });
        }, 400); // Delay to match animation
      } else {
        playCard(card.instanceId);
        
        // Play success sound for discover spells
        playSuccess();
        
        // Show notification about discovery
        showNotification({
          title: '🔮 Discover',
          description: `Discovering options from ${isSpell(card.card) ? (card.card.spellEffect?.discoveryType || 'all') : 'all'} cards`,
          type: 'info',
          duration: 2000
        });
      }
      
      return;
    }
    
    // For other spell cards
    if (isSpell(card.card)) {
      const spellEffect = card.card.spellEffect;
      
      // Check if the spell requires a target
      if (spellEffect?.requiresTarget) {
        // Store the card for targeting
        selectCard(card);
        
        // Initialize targeting UI components
        setShowTargetingArrow(true);
        debug.log(`[TARGETING] Showing targeting arrow for ${card.card.name}. Target type: ${spellEffect.targetType}`);
        
        // Set the starting position of the arrow at the card's position
        if (cardPosition) {
          setArrowStartPosition(cardPosition);
          debug.log(`[TARGETING] Arrow start position set to:`, cardPosition);
        }
        
        // Determine valid targets based on spell requirements
        const validTargetIds: string[] = [];
        
        // Add player's minions if the spell can target friendly minions
        if (spellEffect.targetType?.includes('friendly') || spellEffect.targetType === 'any') {
          player.battlefield.forEach(minion => {
            validTargetIds.push(minion.instanceId);
          });
        }
        
        // Add opponent's minions if the spell can target enemy minions
        if (spellEffect.targetType?.includes('enemy') || spellEffect.targetType === 'any') {
          opponent.battlefield.forEach(minion => {
            validTargetIds.push(minion.instanceId);
          });
        }
        
        // Add heroes as valid targets if applicable
        if (spellEffect.targetType?.includes('hero') || spellEffect.targetType === 'any' || spellEffect.targetType === 'any_character') {
          validTargetIds.push('player_hero');
          validTargetIds.push('opponent_hero');
        }
        
        setValidTargets(validTargetIds);
        
        // Show a notification that user needs to select a target
        showNotification({
          title: `🎯 Select Target`,
          description: `${card.card.name} requires a target`,
          type: 'info',
          duration: 2000
        });
        
        // Don't play the card yet - wait for target selection
        return;
      }
      
      // Handle different spell effect types
      if (spellEffect?.type === 'damage' || spellEffect?.type === 'aoe_damage') {
        playHit();
        showNotification({
          title: `🔥 ${card.card.name}`,
          description: `Deal ${spellEffect.value || 0} damage`,
          type: 'warning'
        });
      } else if (spellEffect?.type === 'heal') {
        playSuccess();
        showNotification({
          title: `✨ ${card.card.name}`,
          description: `Restore ${spellEffect?.value || 0} health`,
          type: 'success'
        });
      } else if (spellEffect?.type === 'draw') {
        showNotification({
          title: `📚 ${card.card.name}`,
          description: `Draw ${spellEffect?.value || 1} card${spellEffect?.value !== 1 ? 's' : ''}`,
          type: 'info'
        });
      } else if (spellEffect?.type === 'buff') {
        playSuccess();
        const buffText = `+${spellEffect?.buffAttack || 0}/+${spellEffect?.buffHealth || 0}`;
        showNotification({
          title: `💪 ${card.card.name}`,
          description: `Give a minion ${buffText}`,
          type: 'success'
        });
      } else if (spellEffect?.type === 'transform') {
        playSuccess();
        showNotification({
          title: `🧙‍♂️ ${card.card.name}`,
          description: `Transform a minion`,
          type: 'info'
        });
      } else if (spellEffect?.type === 'freeze') {
        playHit();
        showNotification({
          title: `❄️ ${card.card.name}`,
          description: `Freeze${spellEffect?.targetType?.includes('all') ? ' all' : ''} ${spellEffect?.targetType?.includes('enemy') ? 'enemy' : ''} minions`,
          type: 'info'
        });
      } else if (spellEffect?.type === 'summon') {
        playSuccess();
        showNotification({
          title: `🧪 ${card.card.name}`,
          description: `Summon a minion`,
          type: 'success'
        });
      } else if (spellEffect?.type === 'mana_crystal') {
        playSuccess();
        showNotification({
          title: `✨ ${card.card.name}`,
          description: `Gain ${spellEffect?.value} mana crystal${spellEffect?.value !== 1 ? 's' : ''}${spellEffect?.isTemporaryMana ? ' this turn only' : ''}`,
          type: 'success'
        });
      }
    }
    
    // Delay the actual play to let the card travel animation complete
    const animationDelay = (card.card.rarity === 'mythic') ? 3000 : (cardPosition ? 400 : 0);

    // Fire battlecry VFX early (at ~80% of card travel) so it lands WITH the card
    if (isMinion(card.card) && hasBattlecry(card.card)) {
      const battlecry = card.card.battlecry;
      const effectType = battlecry?.type || 'default';
      const isAoE = effectType === 'aoe_damage' || (effectType === 'damage' && battlecry?.affectsAllEnemies);
      const vfxDelay = Math.max(0, animationDelay - 150);

      setTimeout(() => {
        if (isAoE || effectType === 'damage') playHit();
        else if (effectType === 'heal' || effectType === 'buff' || effectType === 'summon') playSuccess();

        emitBattlecryTriggered({
          sourceId: card.instanceId,
          sourceName: card.card.name,
          effectType: isAoE ? 'aoe_damage' : effectType,
          player: 'player',
          value: battlecry?.value ?? battlecry?.buffAttack ?? 0
        });
      }, vfxDelay);
    }

    setTimeout(() => {
      playCard(card.instanceId);

      if (manaPositionRef.current) {
        addManaUseAnimation(manaPositionRef.current, card.card.manaCost ?? 0);

        if (hasOverload(card.card)) {
          const overloadAmount = card.card.overload?.amount || 0;
          if (overloadAmount > 0) {
            addOverloadAnimation(manaPositionRef.current, overloadAmount);
            showNotification({
              title: 'Overload',
              description: `${overloadAmount} mana locked next turn`,
              type: 'warning',
              duration: 2000
            });
          }
        }
      }
    }, animationDelay);
  }
  
  
  // Handle selecting a card to attack with or as a target for spells/battlecries
  const handleCardSelect = (card: CardInstance | CardInstanceWithCardData) => {
    // Convert the card to ensure it has the right format (CardInstance)
    const adaptedCard = reverseAdaptCardInstance(adaptCardInstance(card));
    
    debug.log(`[CARD SELECT] Card selected: ${adaptedCard.card.name}, type: ${adaptedCard.card.type}`);
    debug.log(`[CARD SELECT] Card can attack: ${adaptedCard.canAttack}, summoning sick: ${adaptedCard.isSummoningSick}, attacks performed: ${adaptedCard.attacksPerformed}`);
    debug.log(`[CARD SELECT] Current targeting state: showTargetingArrow=${showTargetingArrow}, selectedCard=${selectedCard?.card?.name || 'none'}, attackingCard=${attackingCard?.card?.name || 'none'}`);
    
    // Check if a minion with battlecry is currently selected (waiting for target)
    if (selectedCard && 
        isMinion(selectedCard.card) && 
        hasBattlecry(selectedCard.card) && 
        selectedCard.card.battlecry?.requiresTarget) {
      
      debug.log(`Selected ${adaptedCard.card.name} as battlecry target for ${selectedCard.card.name}`);
      
      // Check if this is a valid target for the battlecry
      // We need to check based on the targetType in the battlecry
      const targetType = selectedCard.card.battlecry?.targetType;
      let isValid = false;
      
      switch (targetType) {
        case 'any_character':
        case 'any':
          // Can target any minion or hero
          isValid = true;
          break;
        case 'any_minion':
          isValid = card.card.type === 'minion'; // Can target any minion
          break;
        case 'friendly_minion':
          isValid = player.battlefield.some(c => c.instanceId === card.instanceId);
          break;
        case 'enemy_minion':
          isValid = opponent.battlefield.some(c => c.instanceId === card.instanceId);
          break;
        default:
          // Special case for Faceless Manipulator (copy battlecry)
          if (selectedCard.card.battlecry?.type === 'copy') {
            // Faceless should only copy minions on the battlefield
            isValid = (player.battlefield.some(c => c.instanceId === card.instanceId) || 
                      opponent.battlefield.some(c => c.instanceId === card.instanceId)) &&
                      card.card.type === 'minion';
            debug.log(`Copy battlecry target validity for ${card.card.name}: ${isValid}`);
          } else {
            debug.log(`Unsupported battlecry target type: ${targetType}`);
            isValid = false;
          }
      }
      
      if (isValid) {
        // Store the selected card info before clearing selection
        const battlecryCard = selectedCard;
        const battlecryType = isMinion(battlecryCard.card) ? battlecryCard.card.battlecry?.type : undefined;
        
        // Clear the selectedCard state first to prevent confusion in state updates
        selectCard(null);
        
        // Now play the card with the target
        debug.log(`Playing ${battlecryCard.card.name} with target ${card.card.name}`);
        playCard(battlecryCard.instanceId, card.instanceId, 'minion');
        
        // Add mana use animation if mana position is tracked
        if (manaPositionRef.current) {
          // The amount to subtract is the card's mana cost
          addManaUseAnimation(manaPositionRef.current, battlecryCard.card.manaCost || 0);
          
          // If this card has Overload, show an overload animation too
          if (hasOverload(battlecryCard.card)) {
            const overloadAmount = battlecryCard.card.overload?.amount || 0;
            
            // Show special animation for overloaded mana crystals
            if (overloadAmount > 0) {
              addOverloadAnimation(manaPositionRef.current, overloadAmount);
              
              // Show notification for overload
              showNotification({
                title: '🔒 Overload',
                description: `${overloadAmount} mana crystal${overloadAmount > 1 ? 's' : ''} will be locked next turn`,
                type: 'warning',
                duration: 3000
              });
            }
          }
        }
        
        // Mythic-specific sound
        if(battlecryCard.card.rarity === 'mythic') {
          playSuccess();
        } else {
          // Play appropriate sound effect based on battlecry type
          if (battlecryType === 'damage' || battlecryType === 'aoe_damage') {
            playHit();
            
            // Get positions for visual effects
            // For AoE, we'll just show an effect on the target card
            const targetPosition = getCardPosition(card.instanceId);
            if (targetPosition && isMinion(battlecryCard.card)) {
              // For damage based on stats, use the minion's attack value
              const damageAmount = battlecryCard.card.battlecry?.isBasedOnStats 
                ? getAttack(battlecryCard.card)
                : (battlecryCard.card.battlecry?.value || 0);
                
              if (damageAmount > 0) {
                addDamageEffect(targetPosition, damageAmount);
              }
            }
          }
        }
      } else {
        // Not a valid target
        showNotification({
          title: `❌ Invalid Target`,
          description: `${card.card.name} is not a valid target for ${selectedCard.card.name}'s battlecry`,
          type: 'error',
          duration: 2000
        });
      }
    }
    // Check if a spell card is currently selected (waiting for target)
    else if (selectedCard && isSpell(selectedCard.card) && selectedCard.card.spellEffect?.requiresTarget) {
      debug.log(`Selected ${card.card.name} as target for ${selectedCard.card.name}`);
      
      // Check if this is a valid target for the spell
      if (isValidTarget(selectedCard, card)) {
        // Hide the targeting UI
        setShowTargetingArrow(false);
        setValidTargets([]);
        
        // Play the spell and target the selected card
        playCard(selectedCard.instanceId, card.instanceId, 'minion');
        
        // Add mana use animation if mana position is tracked
        if (manaPositionRef.current) {
          // The amount to subtract is the spell's mana cost
          addManaUseAnimation(manaPositionRef.current, selectedCard.card.manaCost || 0);
          
          // If this spell has Overload, show an overload animation too
          if (hasOverload(selectedCard.card)) {
            const overloadAmount = selectedCard.card.overload?.amount || 0;
            
            // Show special animation for overloaded mana crystals
            if (overloadAmount > 0) {
              addOverloadAnimation(manaPositionRef.current, overloadAmount);
              
              // Show notification for overload
              showNotification({
                title: '🔒 Overload',
                description: `${overloadAmount} mana crystal${overloadAmount > 1 ? 's' : ''} will be locked next turn`,
                type: 'warning',
                duration: 3000
              });
            }
          }
        }
        
        // Play appropriate sound effect
        if (selectedCard.card.spellEffect?.type === 'damage') {
          playHit();
          
          // Get positions for visual effects
          const targetPosition = getCardPosition(card.instanceId);
          if (targetPosition && selectedCard.card.spellEffect?.value) {
            addDamageEffect(targetPosition, selectedCard.card.spellEffect?.value || 0);
          }
        } else if (selectedCard.card.spellEffect?.type === 'heal') {
          playSuccess();
          
          // Get positions for visual effects
          const targetPosition = getCardPosition(card.instanceId);
          if (targetPosition && selectedCard.card.spellEffect?.value) {
            addHealEffect(targetPosition, selectedCard.card.spellEffect?.value || 0);
          }
        } else if (selectedCard.card.spellEffect?.type === 'buff') {
          playSuccess();
          
          // Get positions for visual effects
          const targetPosition = getCardPosition(card.instanceId);
          if (targetPosition) {
            addBuffEffect(
              targetPosition, 
              selectedCard.card.spellEffect?.buffAttack || 0, 
              selectedCard.card.spellEffect?.buffHealth || 0
            );
          }
        }
        
        // Clear selection after playing
        selectCard(null);
      } else {
        // Not a valid target
        showNotification({
          title: `❌ Invalid Target`,
          description: `${card.card.name} is not a valid target for ${selectedCard.card.name}`,
          type: 'error',
          duration: 2000
        });
      }
    } 
    // Otherwise, this is a regular card selection for attack
    else if (isPlayerTurn && card.isPlayed) {
      // If another attacker is already selected and we clicked a different friendly minion, deselect first
      if (attackingCard && attackingCard.instanceId !== card.instanceId) {
        selectAttacker(null);
      }

      if (card.isSummoningSick) {
        showNotification({
          title: 'Cannot Attack',
          description: `${card.card.name} has summoning sickness`,
          type: 'warning',
          duration: 1500
        });
        return;
      }
      if (!card.canAttack) {
        showNotification({
          title: 'Cannot Attack',
          description: `${card.card.name} already attacked this turn`,
          type: 'warning',
          duration: 1500
        });
        return;
      }

      debug.log(`Selected card to attack with: ${card.card.name}`);
      debug.log(`Card details: isPlayed=${card.isPlayed}, isSummoningSick=${card.isSummoningSick}, canAttack=${card.canAttack}, attacks performed=${card.attacksPerformed}`);
      
      // Toggle selection - if already selected, deselect it
      if (attackingCard?.instanceId === card.instanceId) {
        debug.log(`Deselecting attacker: ${card.card.name}`);
        selectAttacker(null);
      } else {
        debug.log(`Selecting attacker: ${card.card.name}`);
        // Clear any previous selected card
        selectCard(null);
        
        // Set as attacking card - store a reference to the instance to ensure state consistency
        debug.log(`Before selectAttacker call - card type: ${typeof card}, has instanceId: ${!!card.instanceId}, has card prop: ${!!card.card}`);
        
        // Need to ensure the card data is properly converted for both types
        const attackerCardWithChecks = {
          ...card,
          isSummoningSick: card.isSummoningSick ?? false,  // Ensure this property exists
          canAttack: card.canAttack ?? true,               // Ensure this property exists
          instanceId: card.instanceId                       // Ensure instanceId is preserved
        };
        
        // Only proceed if card can actually attack
        if (!attackerCardWithChecks.isSummoningSick && attackerCardWithChecks.canAttack) {
          selectAttacker(attackerCardWithChecks);
          debug.log(`After selectAttacker call - attackingCard: ${!!attackingCard}, name: ${attackingCard?.card?.name || 'none'}`);
          
          // Show notification that card is selected for attack
          showNotification({
            title: `⚔️ Attacker Selected`,
            description: `${card.card.name} is ready to attack. Select a target.`,
            type: 'info',
            duration: 2000
          });
        } else {
          debug.log(`Card ${card.card.name} attempted to attack but was blocked due to: ${card.isSummoningSick ? 'summoning sickness' : 'already attacked'}`);
          showNotification({
            title: `Cannot Attack`,
            description: card.isSummoningSick 
              ? `${card.card.name} has summoning sickness and cannot attack yet.`
              : `${card.card.name} has already attacked this turn.`,
            type: 'warning',
            duration: 2000
          });
        }
      }
    }
  };
  
  // Helper to check if a card is a valid target for the selected spell or battlecry
  const isValidTarget = (sourceCard: CardInstance, targetCard: CardInstance): boolean => {
    // More detailed console logging for targeting debugging
    debug.log(`[TARGETING] Checking if ${targetCard.card.name} is a valid target for ${sourceCard.card.name}`);
    debug.log(`[TARGETING] Source card details:`, {
      name: sourceCard.card.name,
      type: sourceCard.card.type,
      spellEffect: isSpell(sourceCard.card) ? sourceCard.card.spellEffect : undefined
    });
    debug.log(`[TARGETING] Target card details:`, {
      name: targetCard.card.name,
      type: targetCard.card.type,
      instanceId: targetCard.instanceId,
      keywords: targetCard.card.keywords
    });
    
    // For spell cards
    if (isSpell(sourceCard.card)) {
      const spellEffect = sourceCard.card.spellEffect;
      debug.log(`[TARGETING] Spell requires target: ${spellEffect?.requiresTarget}`);
      
      // Check if target is a minion
      const targetIsMinionInstance = player.battlefield?.some(c => c.instanceId === targetCard.instanceId) || 
                       opponent.battlefield?.some(c => c.instanceId === targetCard.instanceId);
      
      // Check if target is a hero
      const targetIsHero = isHero(targetCard.card);
      
      // Check if the hero belongs to player or opponent
      const isPlayerHero = targetIsHero && (isHero(targetCard.card) && targetCard.card.heroClass === player.heroClass);
      const isOpponentHero = targetIsHero && (isHero(targetCard.card) && targetCard.card.heroClass !== player.heroClass);
      
      // Check if target has taunt
      const hasTaunt = hasKeyword(targetCard, 'taunt');
      
      // Log for debugging
      debug.log(`[DEBUG] Checking target validity for ${sourceCard.card.name}:`, {
        targetName: targetCard.card.name,
        targetType: spellEffect?.targetType,
        conditionalTarget: spellEffect?.conditionalTarget,
        targetAttack: getAttack(targetCard.card),
        targetIsMinionInstance,
        targetIsHero,
        isPlayerHero,
        isOpponentHero,
        hasTaunt
      });
      
      // Check conditionalTarget requirements first
      if (spellEffect?.conditionalTarget) {
        if (targetIsMinionInstance) {
          const targetAttack = getAttack(targetCard.card);
          const targetCurrentHealth = targetCard.currentHealth || 0;
          const targetMaxHealth = getHealth(targetCard.card);
          
          // Handle attack-based conditional targets
          switch (spellEffect?.conditionalTarget) {
            case 'attack_greater_than_5':
              if (targetAttack < 5) {
                debug.log(`Target attack ${targetAttack} is less than 5, invalid for Shadow Word: Death`);
                return false;
              }
              break;
            case 'attack_less_than_3':
              if (targetAttack > 3) {
                debug.log(`Target attack ${targetAttack} is greater than 3, invalid for Shadow Word: Pain`);
                return false;
              }
              break;
            case 'low_attack_minion':
              if (targetAttack > 3) {
                debug.log(`Target attack ${targetAttack} is greater than 3, invalid for Shadow Word: Pain`);
                return false;
              }
              break;
            case 'damaged_minion':
              if (targetCurrentHealth >= targetMaxHealth) {
                debug.log(`Target is not damaged (${targetCurrentHealth}/${targetMaxHealth}), invalid for Execute`);
                return false;
              }
              break;
            case 'undamaged_minion':
              if (targetCurrentHealth < targetMaxHealth) {
                debug.log(`Target is damaged (${targetCurrentHealth}/${targetMaxHealth}), invalid for Backstab`);
                return false;
              }
              break;
            default:
              debug.warn(`Unknown conditional target: ${spellEffect?.conditionalTarget}`);
          }
        } else {
          // Most conditional targets only apply to minions
          debug.log('Conditional target only applies to minions, but target is not a minion');
          return false;
        }
      }
      
      // Then check based on the target type
      switch (spellEffect?.targetType) {
        case 'any':
          // Can target any character (minion or hero)
          
          // If targeting opponent hero or minion, check for taunt rules
          if (isOpponentHero || opponent.battlefield.some(c => c.instanceId === targetCard.instanceId)) {
            // Check if the opponent has taunt minions
            const opponentHasTaunt = opponent.battlefield.some(c => 
              hasKeyword(c, 'taunt')
            );
            
            // If opponent has taunt minions, we can only target those unless the target itself has taunt
            if (opponentHasTaunt && !hasTaunt && 
                opponent.battlefield.some(c => c.instanceId === targetCard.instanceId)) {
              debug.log('Cannot target non-taunt minions when opponent has taunt minions');
              return false;
            }
            
            // If targeting opponent hero and there are taunt minions, cannot target hero
            if (isOpponentHero && opponentHasTaunt) {
              debug.log('Cannot target opponent hero when there are taunt minions');
              return false;
            }
          }
          
          // For 'any' type, both friendly and enemy targets are valid
          return true;
        case 'any_minion':
          return isMinion(targetCard.card); // Can target any minion, but not heroes
        case 'friendly_minion':
          return player.battlefield.some(c => c.instanceId === targetCard.instanceId);
        case 'enemy_minion': {
          const opponentHasTaunt = opponent.battlefield.some(c =>
            hasKeyword(c, 'taunt')
          );

          if (opponent.battlefield.some(c => c.instanceId === targetCard.instanceId)) {
            if (opponentHasTaunt && !hasTaunt) {
              debug.log('Cannot target non-taunt minions when opponent has taunt minions');
              return false;
            }
            return true;
          }
          return false;
        }
        case 'enemy': {
          const opponentHasTaunts = opponent.battlefield.some(c =>
            hasKeyword(c, 'taunt')
          );

          if (opponent.battlefield.some(c => c.instanceId === targetCard.instanceId)) {
            if (opponentHasTaunts && !hasTaunt) {
              debug.log('Cannot target non-taunt minions when opponent has taunt minions');
              return false;
            }
            return true;
          }

          if (targetIsHero && isOpponentHero) {
            if (opponentHasTaunts) {
              debug.log('Cannot target opponent hero when there are taunt minions');
              return false;
            }
            return true;
          }

          return false;
        }
        case 'friendly':
          return player.battlefield.some(c => c.instanceId === targetCard.instanceId) || 
                 (targetIsHero && isPlayerHero);
        default:
          debug.warn(`Unknown target type: ${spellEffect?.targetType}`);
          return false;
      }
    }
    
    // For minions with battlecry
    if (isMinion(sourceCard.card) && hasBattlecry(sourceCard.card)) {
      
      const battlecry = sourceCard.card.battlecry;
      
      // If the battlecry doesn't require a target, any target is invalid
      if (!battlecry?.requiresTarget) {
        return false;
      }
      
      // Check based on the target type
      switch (battlecry?.targetType) {
        case 'any': {
          const isOpponentHero = isHero(targetCard.card) && targetCard.card.heroClass !== player.heroClass;
          const isOpponentMinion = opponent.battlefield.some(c => c.instanceId === targetCard.instanceId);

          if (isOpponentHero || isOpponentMinion) {
            const opponentHasTaunt = opponent.battlefield.some(c =>
              hasKeyword(c, 'taunt')
            );
            const hasTaunt = hasKeyword(targetCard, 'taunt');

            if (opponentHasTaunt && !hasTaunt && isOpponentMinion) {
              debug.log('Cannot target non-taunt minions when opponent has taunt minions');
              return false;
            }
            if (isOpponentHero && opponentHasTaunt) {
              debug.log('Cannot target opponent hero when there are taunt minions');
              return false;
            }
          }
          return true;
        }
        case 'any_minion': {
          if (targetCard.card.type !== 'minion') {
            return false;
          }

          if (opponent.battlefield.some(c => c.instanceId === targetCard.instanceId)) {
            const opponentHasTaunt = opponent.battlefield.some(c =>
              hasKeyword(c, 'taunt')
            );
            const hasTaunt = hasKeyword(targetCard, 'taunt');

            if (opponentHasTaunt && !hasTaunt) {
              debug.log('Cannot target non-taunt minions when opponent has taunt minions');
              return false;
            }
          }
          return true;
        }
        case 'friendly_minion':
          return player.battlefield.some(c => c.instanceId === targetCard.instanceId);
        case 'enemy_minion': {
          if (!opponent.battlefield.some(c => c.instanceId === targetCard.instanceId)) {
            return false;
          }

          const opponentHasTaunt = opponent.battlefield.some(c =>
            hasKeyword(c, 'taunt')
          );
          const hasTaunt = hasKeyword(targetCard, 'taunt');

          if (opponentHasTaunt && !hasTaunt) {
            debug.log('Cannot target non-taunt minions when opponent has taunt minions');
            return false;
          }
          return true;
        }
        default:
          // Special case for Faceless Manipulator (copy battlecry)
          if (battlecry?.type === 'copy') {
            // Faceless should only copy minions on the battlefield
            return (player.battlefield.some(c => c.instanceId === targetCard.instanceId) || 
                   opponent.battlefield.some(c => c.instanceId === targetCard.instanceId)) &&
                   targetCard.card.type === 'minion';
          }
          return false;
      }
    }
    
    // If none of the above conditions are met, the target is invalid
    return false;
  };
  
  // Handle attacking an opponent's card
  const handleAttackOpponentCard = (targetCard: CardInstance | CardInstanceWithCardData) => {
    // Confirm attacks setting — ask before executing
    if (confirmAttacks && attackingCard) {
      const atkName = attackingCard.card?.name || 'Minion';
      const defName = 'card' in targetCard ? targetCard.card?.name : 'target';
      if (!window.confirm(`Attack ${defName} with ${atkName}?`)) return;
    }

    // Convert the card to ensure it has the right format (CardInstance)
    const adaptedTargetCard = reverseAdaptCardInstance(adaptCardInstance(targetCard));
    
    debug.log("[ATTACK_FLOW] Attack opponent card function called with target:", adaptedTargetCard.card.name);
    debug.log("[ATTACK_FLOW] Is player turn:", isPlayerTurn);
    debug.log("[ATTACK_FLOW] Target card zone:", opponent.battlefield.some(c => c.instanceId === adaptedTargetCard.instanceId) ? "opponent battlefield" : "unknown");
    
    if (attackingCard) {
      debug.log("[ATTACK_FLOW] Attacking card exists:", attackingCard.card.name);
      debug.log("[ATTACK_FLOW] Attacking card details:", {
        canAttack: attackingCard.canAttack,
        isSummoningSick: attackingCard.isSummoningSick,
        attacksPerformed: attackingCard.attacksPerformed,
        zone: player.battlefield.some(c => c.instanceId === attackingCard.instanceId) ? "player battlefield" : "unknown"
      });
      
      // Check if the card can attack (not summoning sick and has not used its attacks)
      if (attackingCard.isSummoningSick) {
        debug.log(`${attackingCard.card.name} can't attack - it has summoning sickness`);
        showNotification({
          title: "Can't Attack",
          description: "This minion can't attack yet - it has summoning sickness.",
          type: 'error',
          duration: 2000
        });
        return;
      }
      
      if (!attackingCard.canAttack) {
        debug.log(`${attackingCard.card.name} can't attack - it has already attacked this turn`);
        showNotification({
          title: "Can't Attack",
          description: "This minion has already attacked this turn.",
          type: 'error',
          duration: 2000
        });
        return;
      }
      
      // Check if opponent has taunt minions - if so, we can only attack those
      const opponentHasTaunts = opponent.battlefield.some(c => 
        hasKeyword(c, 'taunt')
      );
      
      // Only do Taunt validation when the target is NOT a Taunt
      const targetHasTaunt = hasKeyword(targetCard, 'taunt');
      
      if (opponentHasTaunts && !targetHasTaunt) {
        debug.log(`Can't attack non-taunt minion when opponent has taunt minions`);
        showNotification({
          title: "Can't Attack",
          description: "You must attack minions with Taunt first.",
          type: 'error',
          duration: 2000
        });
        return;
      }
      
      debug.log(`Attacking ${targetCard.card.name} with ${attackingCard.card.name}`);
      
      // Play attack sound
      playHit();
      
      // Get card positions for animation
      const attackerPosition = getCardPosition(attackingCard.instanceId);
      const defenderPosition = getCardPosition(targetCard.instanceId);
      
      // If we have valid positions, show an attack animation
      if (attackerPosition && defenderPosition) {
        // Add attack animation
        addAttackAnimation(attackerPosition, defenderPosition);
        
        // Add damage effect on target card - ensure attack is defined
        const attackerAttackValue = getAttack(attackingCard.card);
        addDamageEffect(defenderPosition, attackerAttackValue);
        
        // Check if the attacker will take damage from the defender
        const defenderAttackValue = getAttack(targetCard.card);
        if (defenderAttackValue > 0) {
          addDamageEffect(attackerPosition, defenderAttackValue);
        }
        
        // Check if defending minion has Divine Shield
        if (targetCard.hasDivineShield) {
          addShieldBreakEffect(defenderPosition);
        }
      }
      
      // Check if the attack will kill the minion - ensure attack is defined
      const attackerAttackValue = getAttack(attackingCard.card);
      const willKill = (targetCard.currentHealth || 0) <= attackerAttackValue;
      
      // Check for deathrattle
      if (willKill && hasKeyword(targetCard, 'deathrattle') && isMinion(targetCard.card) && targetCard.card.deathrattle) {
        // Attack first
        attackWithCard(attackingCard.instanceId, targetCard.instanceId);
        
        // Emit deathrattle event for GSAP VFX (replaces toast popup)
        emitDeathrattleTriggered({
          sourceId: targetCard.instanceId,
          sourceName: targetCard.card.name,
          effectType: targetCard.card.deathrattle.type || 'default',
          player: 'opponent'
        });
      } else {
        // Just perform the attack without notification
        attackWithCard(attackingCard.instanceId, targetCard.instanceId);
      }
    }
  };
  
  // Handle attacking the opponent's hero directly, using hero power, or targeting with battlecry or spell
  const handleAttackOpponentHero = () => {
    // Confirm attacks setting — ask before going face
    if (confirmAttacks && attackingCard) {
      const atkName = attackingCard.card?.name || 'Minion';
      if (!window.confirm(`Attack opponent hero with ${atkName}?`)) return;
    }

    // CASE 1: If there's a spell card that needs a target
    if (selectedCard && 
        isSpell(selectedCard.card) && 
        selectedCard.card.spellEffect?.requiresTarget) {
      
      debug.log(`Selected opponent's hero as target for spell ${selectedCard.card.name}`);
      
      // Create a dummy hero card instance for the opponent's hero
      const opponentHeroInstance = {
        instanceId: 'opponent-hero',
        card: {
          id: -1,
          name: opponent.name || 'Opponent Hero',
          type: 'hero' as const,
          rarity: 'common' as const,
          manaCost: 0,
          heroClass: (opponent.heroClass as string).toLowerCase()
        },
        attacksPerformed: 0,
        currentHealth: opponent.heroHealth || 100,
        canAttack: false,
        isSummoningSick: false
      };
      
      // First, check if this is a valid target type for the spell
      if (isValidTarget(selectedCard, opponentHeroInstance)) {
        // Check if opponent has taunt minions - if so, we can't target the hero with spells either
        const opponentHasTaunt = opponent.battlefield?.some(c => 
          hasKeyword(c, 'taunt')
        ) || false;
        
        if (opponentHasTaunt) {
          debug.log(`Cannot target opponent's hero with spell when there are taunt minions on the battlefield`);
          showNotification({
            title: "Can't Target Hero",
            description: "You must target taunt minions first.",
            type: 'error',
            duration: 2000
          });
          // Return early without playing the card
          return;
        }
        // Store the selected card info before clearing selection
        const spellCard = selectedCard;
        const spellEffect = isSpell(spellCard.card) ? spellCard.card.spellEffect : undefined;
        
        // Clear the selectedCard state first to prevent confusion in state updates
        selectCard(null);
        
        // Now play the card with the target
        debug.log(`Playing ${spellCard.card.name} targeting opponent's hero`);
        playCard(spellCard.instanceId, 'opponent', 'hero');
        
        // Add mana use animation
        if (manaPositionRef.current) {
          addManaUseAnimation(manaPositionRef.current, spellCard.card.manaCost || 0);
          
          // If this spell has Overload, show an overload animation too
          if (hasOverload(spellCard.card)) {
            const overloadAmount = spellCard.card.overload?.amount || 0;
            
            // Show special animation for overloaded mana crystals
            if (overloadAmount > 0) {
              addOverloadAnimation(manaPositionRef.current, overloadAmount);
              
              // Show notification for overload
              showNotification({
                title: '🔒 Overload',
                description: `${overloadAmount} mana crystal${overloadAmount > 1 ? 's' : ''} will be locked next turn`,
                type: 'warning',
                duration: 3000
              });
            }
          }
        }
        
        // Get the hero position for visual effects
        const heroPos = getHeroPosition('opponent');
        
        // Show appropriate animations for the spell effect
        if (heroPos) {
          if (spellEffect?.type === 'damage') {
            const damageAmount = spellEffect?.value || 0;
            addDamageEffect(heroPos, damageAmount);
            playHit();
          } else {
            // Generic spell effect
            playSuccess();
          }
        }
      } else {
        // Not a valid target
        showNotification({
          title: `❌ Invalid Target`,
          description: `Opponent's hero is not a valid target for ${selectedCard.card.name}`,
          type: 'error',
          duration: 2000
        });
      }
    }
    // CASE 2: If there's a battlecry card that needs a target
    else if (selectedCard && 
        isMinion(selectedCard.card) && 
        hasBattlecry(selectedCard.card) && 
        selectedCard.card.battlecry?.requiresTarget) {
      
      debug.log(`Selected opponent's hero as battlecry target for ${selectedCard.card.name}`);
      
      // Check if this is a valid target for the battlecry
      const targetType = selectedCard.card.battlecry?.targetType;
      let isValid = false;
      
      // First, check if this is a valid target type for the battlecry
      switch (targetType) {
        case 'any':
          isValid = true; // Can target any character (including heroes)
          break;
        case 'enemy_hero':
          isValid = true; // Can target enemy hero specifically
          break;
        case 'any_hero':
          isValid = true; // Can target any hero
          break;
        default:
          isValid = false;
      }
      
      // Now check if opponent has taunt minions - if so, we can't target the hero directly
      if (isValid) {
        // Check if opponent has taunt minions - if so, we can't target the hero
        const opponentHasTaunt = opponent.battlefield?.some(c => 
          hasKeyword(c, 'taunt')
        ) || false;
        
        if (opponentHasTaunt) {
          debug.log(`Can't target opponent's hero directly when there are taunt minions on the battlefield`);
          showNotification({
            title: "Can't Target Hero",
            description: "You must target taunt minions first.",
            type: 'error',
            duration: 2000
          });
          isValid = false;
        }
      }
      
      if (isValid) {
        // Store the selected card info before clearing selection
        const battlecryCard = selectedCard;
        const battlecryType = isMinion(battlecryCard.card) ? battlecryCard.card.battlecry?.type : undefined;
        
        // Clear the selectedCard state first to prevent confusion in state updates
        selectCard(null);
        
        // Now play the card with the target
        debug.log(`Playing ${battlecryCard.card.name} with target opponent's hero`);
        playCard(battlecryCard.instanceId, 'opponent', 'hero');
        
        // Add mana use animation
        if (manaPositionRef.current) {
          addManaUseAnimation(manaPositionRef.current, battlecryCard.card.manaCost || 0);
        }
        
        // Get the hero position for visual effects
        const heroPos = getHeroPosition('opponent');
        
        // Show appropriate animations for the battlecry effect
        if (heroPos) {
          if (battlecryType === 'damage') {
            const damageAmount = isMinion(battlecryCard.card) ? (battlecryCard.card.battlecry?.value || 0) : 0;
            addDamageEffect(heroPos, damageAmount);
            playHit();
          } else {
            // Generic battlecry effect
            playSuccess();
          }
        }
      } else {
        // Not a valid target
        showNotification({
          title: `❌ Invalid Target`,
          description: `Opponent's hero is not a valid target for ${selectedCard.card.name}'s battlecry`,
          type: 'error',
          duration: 2000
        });
      }
    }
    // CASE 2: If in hero power target mode
    else if (heroTargetMode) {
      // If in hero power target mode and clicking on opponent's hero
      debug.log('Using hero power on opponent\'s hero');
      
      // For mage and hunter hero powers that target the opponent's hero, check for taunt minions
      if (player.heroClass === 'mage' || player.heroClass === 'hunter') {
        // Check if opponent has taunt minions - if so, we can't target the hero with hero power
        const opponentHasTaunt = opponent.battlefield?.some(c => 
          hasKeyword(c, 'taunt')
        ) || false;
        
        if (opponentHasTaunt) {
          debug.log(`Cannot target opponent's hero with hero power when there are taunt minions on the battlefield`);
          showNotification({
            title: "Can't Target Hero",
            description: "You must target taunt minions first.",
            type: 'error',
            duration: 2000
          });
          // Return early without using hero power
          return;
        }
      }
      
      // Get attacker position
      const heroPos = getHeroPosition('opponent');
      
      // Create animations based on the hero class
      if (heroPos) {
        // First, show the class-specific hero power animation
        if (player.heroClass === 'mage') {
          // For Mage, add hero power animation at the target hero position
          addHeroPowerEffect(heroPos, player.heroClass as 'mage' | 'warrior' | 'paladin' | 'hunter');
          // Then add damage effect
          addDamageEffect(heroPos, 1);
          playHit();
        } else if (player.heroClass === 'hunter') {
          // For Hunter, add hero power animation at the target hero position
          addHeroPowerEffect(heroPos, player.heroClass as 'mage' | 'warrior' | 'paladin' | 'hunter');
          // Then add damage effect (2 damage)
          addDamageEffect(heroPos, 2);
          playHit();
        } else if (player.heroClass === 'warrior') {
          // For Warrior hero power, we target our own hero (armor up)
          const playerHeroPos = getHeroPosition('player');
          if (playerHeroPos) {
            // Add hero power animation at player's hero position
            addHeroPowerEffect(playerHeroPos, player.heroClass as 'mage' | 'warrior' | 'paladin' | 'hunter');
            // Show buff effect on player's hero
            addBuffEffect(playerHeroPos, 0, 2); // 0 attack, 2 health buff for armor
            playSuccess();
          }
        }
      }
      
      // Execute the hero power
      useHeroPower('opponent', 'hero');
      
      // Add mana use animation for hero power
      if (manaPositionRef.current) {
        // Hero power costs 2 mana
        addManaUseAnimation(manaPositionRef.current, 2);
      }
    } 
    // CASE 3: If a card is selected for attacking
    else if (attackingCard) {
      // Check if the card can attack (not summoning sick and has not used its attacks)
      if (attackingCard.isSummoningSick) {
        debug.log(`${attackingCard.card.name} can't attack - it has summoning sickness`);
        showNotification({
          title: "Can't Attack",
          description: "This minion can't attack yet - it has summoning sickness.",
          type: 'error',
          duration: 2000
        });
        return;
      }
      
      if (!attackingCard.canAttack) {
        debug.log(`${attackingCard.card.name} can't attack - it has already attacked this turn`);
        showNotification({
          title: "Can't Attack",
          description: "This minion has already attacked this turn.",
          type: 'error',
          duration: 2000
        });
        return;
      }
      
      // Check if opponent has taunt minions - if so, we can't attack the hero
      const opponentHasTaunt = opponent.battlefield?.some(c => 
        hasKeyword(c, 'taunt')
      ) || false;
      
      if (opponentHasTaunt) {
        debug.log(`Can't attack hero directly when there are taunt minions on the battlefield`);
        showNotification({
          title: "Can't Attack Hero",
          description: "You must attack taunt minions first.",
          type: 'error',
          duration: 2000
        });
        return;
      }
      
      // Normal attack against hero
      debug.log(`Attacking opponent's hero with ${attackingCard.card.name}`);
      
      // Get card positions for animation
      const attackerPosition = getCardPosition(attackingCard.instanceId);
      const heroPos = getHeroPosition('opponent');
      
      // If we have valid positions, show an attack animation
      if (attackerPosition && heroPos) {
        // Add attack animation
        addAttackAnimation(attackerPosition, heroPos);
        
        // Add damage effect on hero - ensure attack is defined
        const attackValue = getAttack(attackingCard.card);
        addDamageEffect(heroPos, attackValue);
      }
      
      // Perform the attack
      attackWithCard(attackingCard.instanceId); // No target ID means attacking hero
    } else {
      // If clicked with no selection, do nothing but log for debugging
      debug.log('Clicked opponent hero without attack selection or hero power active');
    }
  };
  
  
  // Toggle hero power mode
  const handleToggleHeroPower = () => {
    toggleHeroTargetMode();
  };
  
  // Handle using hero power on a minion
  const handleHeroPowerOnMinion = (targetCard: CardInstance) => {
    if (heroTargetMode) {
      debug.log(`Using hero power on ${targetCard.card.name}`);
      
      // Get the target position for animation
      const targetPosition = getCardPosition(targetCard.instanceId);
      
      // Create animations based on the hero class
      if (targetPosition) {
        // Add hero power special effect animation
        addHeroPowerEffect(targetPosition, player.heroClass as 'mage' | 'warrior' | 'paladin' | 'hunter');
        
        // Add additional effect animations based on hero class
        if (player.heroClass === 'mage') {
          // For Mage hero power, show damage effect
          addDamageEffect(targetPosition, 1);
          playHit();
        } else if (player.heroClass === 'paladin') {
          // For Paladin, we don't need an effect on the target as it summons a minion
          // But we could add a buff effect for visual feedback
          addBuffEffect(targetPosition, 0, 0); // Update animation without buff
          playSuccess();
        }
      }
      
      // Execute the hero power
      useHeroPower(targetCard.instanceId, 'card');
      
      // Add mana use animation for hero power
      if (manaPositionRef.current) {
        // Hero power costs 2 mana
        addManaUseAnimation(manaPositionRef.current, 2);
      }
    }
  };
  
  // Handle using hero power on a hero (opponent's hero)
  const handleHeroPowerOnHero = () => {
    if (heroTargetMode) {
      debug.log('Using hero power on opponent hero');
      
      // Create animations based on the hero class
      if (player.heroClass === 'mage') {
        // For Mage hero power, show damage effect on opponent hero
        playHit();
      }
      
      // Execute the hero power on opponent hero
      useHeroPower('opponent-hero', 'hero');
      
      // Add mana use animation for hero power
      if (manaPositionRef.current) {
        // Hero power costs 2 mana
        addManaUseAnimation(manaPositionRef.current, 2);
      }
    }
  };
  
  // Handle player hero click (for targeting player's own hero with spells/battlecries)
  const handlePlayerHeroClick = () => {
    // Only allow interaction during player's turn
    if (!isPlayerTurn || isProcessingAIActions) return;
    
    // CASE 1: If spell card is selected
    if (selectedCard && isSpell(selectedCard.card)) {
      // Create a dummy hero card instance for the player's hero
      // First check if player.hero exists to avoid the "Cannot read properties of undefined" error
      if (!player.hero) {
        debug.error('Player hero is undefined when clicking player hero portrait');
        return;
      }
      
      // Check if valid target based on spell's targeting requirements
      const spellEffect = selectedCard.card.spellEffect;
      
      // Log for debugging
      debug.log(`Selected player's hero as target for spell ${selectedCard.card.name}`);
      debug.log('Spell effect:', spellEffect);
      
      let isValid = false;
      
      if (spellEffect?.targetType === 'any') {
        isValid = true;
      } else if (spellEffect?.targetType === 'friendly_hero') {
        isValid = true;
      } else if (spellEffect?.targetType === 'friendly_character') {
        isValid = true;
      } else if (spellEffect?.targetType === 'any_hero') {
        isValid = true;
      }
      
      if (isValid) {
        // Store the selected card info before clearing selection
        const spellCard = selectedCard;
        
        // Clear the selectedCard state first to prevent confusion in state updates
        selectCard(null);
        
        // Now play the card with the target
        debug.log(`Playing ${spellCard.card.name} targeting player's hero`);
        playCard(spellCard.instanceId, 'player', 'hero');
        
        // Add mana use animation
        if (manaPositionRef.current) {
          addManaUseAnimation(manaPositionRef.current, spellCard.card.manaCost || 0);
          
          // If this spell has Overload, show an overload animation too
          if (hasOverload(spellCard.card)) {
            const overloadAmount = spellCard.card.overload?.amount || 0;
            
            // Show special animation for overloaded mana crystals
            if (overloadAmount > 0) {
              addOverloadAnimation(manaPositionRef.current, overloadAmount);
              
              // Show notification for overload
              showNotification({
                title: '🔒 Overload',
                description: `${overloadAmount} mana crystal${overloadAmount > 1 ? 's' : ''} will be locked next turn`,
                type: 'warning',
                duration: 3000
              });
            }
          }
        }
        
        // Get the hero position for visual effects
        const heroPos = getHeroPosition('player');
        
        // Show appropriate animations for the spell effect
        if (heroPos) {
          if (spellEffect?.type === 'damage') {
            const damageAmount = spellEffect?.value || 0;
            addDamageEffect(heroPos, damageAmount);
            playHit();
          } else if (spellEffect?.type === 'heal') {
            const healAmount = spellEffect?.value || 0;
            addHealEffect(heroPos, healAmount);
            playSuccess();
          } else {
            // Generic spell effect
            playSuccess();
          }
        }
      } else {
        // Not a valid target
        showNotification({
          title: `❌ Invalid Target`,
          description: `Your hero is not a valid target for ${selectedCard.card.name}`,
          type: 'error',
          duration: 2000
        });
      }
    }
    // CASE 2: If there's a battlecry card that needs a target
    else if (selectedCard && 
        isMinion(selectedCard.card) && 
        hasBattlecry(selectedCard.card) && 
        selectedCard.card.battlecry?.requiresTarget) {
      
      // First check if player.hero exists to avoid the "Cannot read properties of undefined" error
      if (!player.hero) {
        debug.error('Player hero is undefined when selecting hero as battlecry target');
        return;
      }
      
      debug.log(`Selected player's hero as battlecry target for ${selectedCard.card.name}`);
      
      // Check if this is a valid target for the battlecry
      const targetType = selectedCard.card.battlecry?.targetType;
      let isValid = false;
      
      switch (targetType) {
        case 'any':
          isValid = true; // Can target any character (including heroes)
          break;
        case 'friendly_hero':
          isValid = true; // Can target friendly hero specifically
          break;
        case 'any_hero':
          isValid = true; // Can target any hero
          break;
        case 'self':
          isValid = true; // Can target self (which includes the player's hero)
          break;
        default:
          isValid = false;
      }
      
      if (isValid) {
        // Store the selected card info before clearing selection
        const battlecryCard = selectedCard;
        const battlecryType = isMinion(battlecryCard.card) ? battlecryCard.card.battlecry?.type : undefined;
        
        // Clear the selectedCard state first to prevent confusion in state updates
        selectCard(null);
        
        // Now play the card with the target
        debug.log(`Playing ${battlecryCard.card.name} with target player's hero`);
        playCard(battlecryCard.instanceId, 'player', 'hero');
        
        // Add mana use animation
        if (manaPositionRef.current) {
          addManaUseAnimation(manaPositionRef.current, battlecryCard.card.manaCost || 0);
        }
        
        // Get the hero position for visual effects
        const heroPos = getHeroPosition('player');
        
        // Show appropriate animations for the battlecry effect
        if (heroPos) {
          if (battlecryType === 'damage') {
            const damageAmount = isMinion(battlecryCard.card) ? (battlecryCard.card.battlecry?.value || 0) : 0;
            addDamageEffect(heroPos, damageAmount);
            playHit();
          } else if (battlecryType === 'heal') {
            const healAmount = isMinion(battlecryCard.card) ? (battlecryCard.card.battlecry?.value || 0) : 0;
            addHealEffect(heroPos, healAmount);
            playSuccess();
          } else {
            // Generic battlecry effect
            playSuccess();
          }
        }
      } else {
        // Not a valid target
        showNotification({
          title: `❌ Invalid Target`,
          description: `Your hero is not a valid target for ${selectedCard.card.name}'s battlecry`,
          type: 'error',
          duration: 2000
        });
      }
    }
  };
  
  // Background music is now managed through the useAudio hook
  // We'll initialize it on first mount only - with reference to prevent loops
  const audioInitializedRef = React.useRef(false);
  useEffect(() => {
    // Only initialize once to prevent loops
    if (!audioInitializedRef.current) {
      audioInitializedRef.current = true;
      const audio = useAudio.getState();
      
      // Initialize background music if not already playing
      if (audio) {
        audio.playBackgroundMusic('battle_theme');
      }
    }
    
    // No need for cleanup as the audio store manages state
  }, []);
  

  
  // Handle game over
  if (gamePhase === 'game_over') {
    const winner = gameState.winner === 'player' ? 'You Win!' : 'Opponent Wins!';
    
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="text-4xl font-bold mb-8">Game Over</div>
        <div className="text-5xl font-bold text-yellow-400 mb-12">{winner}</div>
        <button 
          onClick={() => window.location.reload()}
          className="professional-game-button px-8 py-4 text-white font-bold rounded-lg text-xl"
        >
          Play Again
        </button>
      </div>
    );
  }
  
  return (
    <NorseBackground>
    <div role="main" aria-label="Game Board" className="virtual-canvas-scaler game-container game-board-enhanced h-full overflow-visible relative z-index-base" ref={gameContainerRef}>
      {/* Debug 3D renderer — DEV only */}
      {import.meta.env.DEV && <DebugRenderCheck />}
      
      {/* Quest Tracker - displays active quests with progress */}
      <QuestTracker owner="player" />
      
      
      {/* Spell/battlecry targeting UI */}
      {showTargetingArrow && (
        <>
          <TargetingArrow
            from={arrowStartPosition}
            to={mousePosition}
            color="#ffcc00"
            animated={true}
          />
          <button
            className="targeting-cancel-btn"
            onClick={() => {
              selectCard(null);
              setShowTargetingArrow(false);
              setValidTargets([]);
              playSoundEffect('button_click');
            }}
            style={{
              position: 'absolute', bottom: '220px', left: '50%', transform: 'translateX(-50%)',
              zIndex: 9100, padding: '8px 20px', border: '1px solid rgba(255,100,100,0.6)',
              borderRadius: '6px', background: 'rgba(80,20,20,0.85)', color: '#ffb0b0',
              fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: '13px',
              cursor: 'pointer', pointerEvents: 'auto',
              boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
              letterSpacing: '0.5px'
            }}
          >
            Cancel (ESC / Right-click)
          </button>
        </>
      )}
      
      {/* Turn transition animation - activated when turn changes */}
      {lastTurnRef.current !== null && lastTurnRef.current !== currentTurn && (
        <TurnTransition 
          isPlayerTurn={isPlayerTurn}
          onComplete={() => {
            lastTurnRef.current = currentTurn;
            // Play turn-specific environmental effect
            if (isPlayerTurn) {
              // Only show environmental effect for the player's turn
              // and only for higher-value cards (rare, epic, mythic)
              const highValueCards = player.hand.filter(card => 
                card.card.rarity && ['rare', 'epic', 'mythic'].includes(card.card.rarity.toLowerCase())
              );
              
              if (highValueCards.length > 0) {
                // Show effect for a random high-value card
                const randomCard = highValueCards[Math.floor(Math.random() * highValueCards.length)];
                if (randomCard && randomCard.card) {
                  setActiveEnvironmentalEffect({
                    card: randomCard.card,
                    duration: 3,
                    intensity: randomCard.card.rarity === 'mythic' ? 'high' : 'medium'
                  });
                }
              }
            }
          }}
        />
      )}
      
      {/* Mythic card entrance animation for when mythic cards are played */}
      {activeLegendaryCard && (
        <LegendaryEntrance
          card={activeLegendaryCard.card}
          position={activeLegendaryCard.position}
          onComplete={() => setActiveLegendaryCard(null)}
        />
      )}
      
      {/* Environmental effect based on card type/class */}
      {activeEnvironmentalEffect && (
        <EnvironmentalEffect
          card={activeEnvironmentalEffect.card}
          duration={activeEnvironmentalEffect.duration}
          intensity={activeEnvironmentalEffect.intensity}
          onComplete={() => setActiveEnvironmentalEffect(null)}
        />
      )}
      
      {/* Animation layer for visual effects */}
      <AnimationLayer />

      {/* Inline status banners (replaces toast popups) */}
      <GameStatusBanner />

      {/* Tutorial overlay for new players */}
      <TutorialOverlay />

      {/* Prophecy countdown indicators */}
      {gameState.prophecies && gameState.prophecies.length > 0 && (
        <div className="prophecy-tracker">
          {gameState.prophecies.map(p => (
            <div key={p.id} className={`prophecy-pip ${p.owner}`}>
              <span className="prophecy-pip-name">{p.name}</span>
              <span className="prophecy-pip-turns">{p.turnsRemaining}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Dynamic audio that responds to board state */}
      <DynamicAudioLayer />
      
      {/* Card detail view */}
      {detailCard && (
        <React.Suspense fallback={null}>
          <CardDetailView
            card={detailCard}
            onClose={handleCloseCardDetails}
          />
        </React.Suspense>
      )}
      
      {/* AI thinking overlay - show when AI is processing actions */}
      {isProcessingAIActions && !isPlayerTurn && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-gray-900 bg-opacity-80 p-4 rounded-xl shadow-xl border border-yellow-600 max-w-md">
            <div className="text-center">
              <h3 className="text-xl font-bold text-yellow-400 mb-2">💭 Opponent's Turn</h3>
              <p className="text-white text-sm">The opponent is thinking about their next move...</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Mulligan Screen - only show during mulligan phase */}
      {gamePhase === 'mulligan' && gameState.mulligan && (
        <MulliganScreen
          mulligan={gameState.mulligan}
          playerHand={player.hand}
          onMulliganAction={() => {
            // This is now handled directly by the store methods
            // We leave this prop for compatibility, but don't need to do anything here
          }}
        />
      )}
      
      {/* New Attack System integration */}
      <AttackSystem 
        isPlayerTurn={isPlayerTurn} 
        cardPositions={getCardPositionsMap()}
        getBoardCenter={() => ({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2
        })}
        onAttackComplete={() => {
          debug.log('[ATTACK] Attack completed successfully');
        }}
      />
      
      {/* Battlefield connector for the attack system */}
      <UnifiedBattlefieldAttackConnector 
        playerCards={player.battlefield}
        opponentCards={opponent.battlefield}
        isPlayerTurn={isPlayerTurn}
        cardPositions={getCardPositionsMap()}
        onCardClick={createHandlePlayerCardClick(isPlayerTurn, attackingCard, selectAttacker, handleCardSelect)}
        onOpponentCardClick={createHandleOpponentCardClick(attackingCard, attackWithCard)}
        onOpponentHeroClick={createHandleOpponentHeroClick(attackingCard, attackWithCard)}
      />

      {/* Toast notifications */}
      <Toaster position="top-right" richColors />
      
      {/* AI Action notifications */}
      <ActionNotification action={currentAction} />
      
      {/* AI Attack Animation Popup - shows when opponent minions attack */}
      <AIAttackAnimationProcessor />
      
      {/* Game board layout with strict proportional containers */}
      <div className="game-grid-container w-full h-full">
        {/* Top opponent area - fixed at 20% height */}
        <GameAreaContainer areaType="opponent" className="z-index-base">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="mr-4">
                {/* Enemy mana crystals - Enhanced 3D version */}
                <ManaBar 
                  currentMana={opponent.mana.current} 
                  maxMana={opponent.mana.max} 
                  overloadedMana={opponent.mana.overloaded} 
                  pendingOverload={opponent.mana.pendingOverload}
                />
              </div>
              
              {/* Enemy deck count with card back - Norse themed */}
              <div className="flex items-center">
                <div className="norse-deck flex items-center justify-center mr-1">
                  <div className="norse-card-count">{opponent.deck.length}</div>
                </div>
              </div>
            </div>
            
            {/* Enemy hero portrait - clickable for attacks */}
            <div 
              className={`opponent-hero-portrait relative cursor-pointer transition-all ${
                attackingCard && !opponent.battlefield?.some(c => hasKeyword(c, 'taunt'))
                  ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-gray-900 animate-pulse scale-105'
                  : ''
              }`}
              data-card-id="opponent-hero"
              ref={ref => {
                if (ref) {
                  const rect = ref.getBoundingClientRect();
                  registerHeroPosition && registerHeroPosition('opponent', {
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                  });
                }
              }}
              onClick={() => {
                if (!isProcessingAIActions) {
                  handleAttackOpponentHero();
                }
              }}
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-b from-red-700 to-red-900 flex items-center justify-center text-white font-bold shadow-lg border-2 border-red-600 hover:scale-110 transition-transform">
                <div className="text-center">
                  <div className="text-lg leading-none">{opponent.heroHealth ?? opponent.health ?? 100}</div>
                  <div className="text-[8px] opacity-70">HP</div>
                </div>
              </div>
              {(opponent.heroArmor ?? opponent.armor ?? 0) > 0 && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-b from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white text-xs font-bold border border-gray-300 shadow-md">
                  {opponent.heroArmor ?? opponent.armor ?? 0}
                </div>
              )}
            </div>
            
            {/* Enemy hand count */}
            <div className="flex items-center">
              <div className="flex">
                {opponent.hand.map((_, index) => (
                  <div 
                    key={index} 
                    className="w-6 h-8 bg-gradient-to-br from-amber-700 to-amber-900 rounded border border-amber-600 -ml-2 first:ml-0"
                  />
                ))}
                {opponent.hand.length > 0 && (
                  <div className="ml-1 text-white text-xs font-bold">{opponent.hand.length}</div>
                )}
              </div>
            </div>
          </div>
        </GameAreaContainer>
        
        {/* Main battlefield area - fixed at 60% height */}
        <GameAreaContainer areaType="battlefield" className="px-4" ref={battlefieldRef} style={{ pointerEvents: (!isPlayerTurn || isProcessingAIActions) ? 'none' : 'auto' }}>
          {/* Attack System is now integrated at the root level */}

          <SimpleBattlefield
            playerCards={player.battlefield}
            opponentCards={opponent.battlefield}
            isPlayerTurn={isPlayerTurn}
            attackingCard={attackingCard}
            onCardClick={(card) => {
              if (isProcessingAIActions) return;
              
              // If right click or ctrl+click, view card details
              if ((window.event as MouseEvent)?.ctrlKey) {
                handleViewCardDetails(card);
              } else {
                // Otherwise, normal card selection
                // Extract the essential properties to create a compatible CardInstance
                const cardInstance = {
                  instanceId: card.instanceId,
                  card: card.card,
                  currentHealth: card.currentHealth,
                  canAttack: card.canAttack,
                  isPlayed: card.isPlayed,
                  isSummoningSick: card.isSummoningSick,
                  hasDivineShield: card.hasDivineShield,
                  attacksPerformed: card.attacksPerformed
                };
                handleCardSelect(cardInstance);
              }
            }}
            onOpponentCardClick={
              isProcessingAIActions ? undefined :
              // If hero power is active, use hero power on target with proper type handling
              heroTargetMode ? ((card) => {
                // Extract the essential properties to create a compatible CardInstance
                const cardInstance = {
                  instanceId: card.instanceId,
                  card: card.card,
                  currentHealth: card.currentHealth,
                  canAttack: card.canAttack,
                  isPlayed: card.isPlayed,
                  isSummoningSick: card.isSummoningSick,
                  hasDivineShield: card.hasDivineShield,
                  attacksPerformed: card.attacksPerformed
                };
                handleHeroPowerOnMinion(cardInstance);
              }) : 
              // If a card with battlecry requiring target is selected, handle that
              (selectedCard && selectedCard.card.type === 'minion' && 
               hasKeyword(selectedCard, 'battlecry') &&
               selectedCard.card.battlecry?.requiresTarget) ? 
               ((card) => {
                // Extract the essential properties to create a compatible CardInstance
                const cardInstance = {
                  instanceId: card.instanceId,
                  card: card.card,
                  currentHealth: card.currentHealth,
                  canAttack: card.canAttack,
                  isPlayed: card.isPlayed,
                  isSummoningSick: card.isSummoningSick,
                  hasDivineShield: card.hasDivineShield,
                  attacksPerformed: card.attacksPerformed
                };
                handleCardSelect(cardInstance);
               }) :
              // Otherwise, regular attack - same approach for type compatibility
              ((card) => {
                debug.log("Attack opponent card clicked:", card.card.name);
                // Extract the essential properties to create a compatible CardInstance
                const cardInstance = {
                  instanceId: card.instanceId,
                  card: card.card,
                  currentHealth: card.currentHealth,
                  canAttack: card.canAttack,
                  isPlayed: card.isPlayed,
                  isSummoningSick: card.isSummoningSick,
                  hasDivineShield: card.hasDivineShield,
                  attacksPerformed: card.attacksPerformed
                };
                handleAttackOpponentCard(cardInstance);
              })
            }
            onOpponentHeroClick={isProcessingAIActions ? undefined : 
              // If hero power is active, directly handle it without conversion
              heroTargetMode ? handleHeroPowerOnHero :
              // Otherwise, regular attack
              handleAttackOpponentHero
            }
            registerCardPosition={registerCardPosition}
            isInteractionDisabled={isProcessingAIActions}
            showPositionPicker={!!pendingPositionalCard}
            onPositionSelect={handlePositionSelect}
            targetingMode={targetingMode}
          />
          
          {/* Action buttons moved to unified control bar at bottom - removed to prevent duplicate */}
        </GameAreaContainer>
        
        {/* Bottom player area - fixed at 20% height */}
        <GameAreaContainer areaType="player" className="px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {/* Player deck count - Norse themed */}
              <div className="flex items-center mr-4">
                <div className="norse-deck flex items-center justify-center mr-1">
                  <div className="norse-card-count">{player.deck.length}</div>
                </div>
              </div>
              
              {/* Player mana crystals - Enhanced 3D version */}
              <div 
                className="flex items-center"
                ref={ref => {
                  if (ref) {
                    const rect = ref.getBoundingClientRect();
                    registerManaPosition && registerManaPosition('mana', {
                      x: rect.left + rect.width / 2,
                      y: rect.top + rect.height / 2
                    });
                  }
                }}
              >
                <ManaBar 
                  currentMana={player.mana.current} 
                  maxMana={player.mana.max} 
                  overloadedMana={player.mana.overloaded} 
                  pendingOverload={player.mana.pendingOverload}
                  registerPosition={registerManaPosition}
                />
              </div>
            </div>
            
            {/* Player hero portrait with HP + armor */}
            <div
              className="relative cursor-pointer transition-all hover:scale-105 ml-4"
              onClick={() => { if (!isProcessingAIActions) handlePlayerHeroClick(); }}
              ref={ref => {
                if (ref) {
                  const rect = ref.getBoundingClientRect();
                  registerHeroPosition && registerHeroPosition('player', {
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                  });
                }
              }}
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-b from-blue-700 to-blue-900 flex items-center justify-center text-white font-bold shadow-lg border-2 border-blue-500">
                <div className="text-center">
                  <div className="text-lg leading-none">{player.heroHealth ?? player.health ?? 100}</div>
                  <div className="text-[8px] opacity-70">HP</div>
                </div>
              </div>
              {(player.heroArmor ?? 0) > 0 && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-b from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white text-xs font-bold border border-gray-300 shadow-md">
                  {player.heroArmor}
                </div>
              )}
            </div>
            
            {/* Hero power button - using unified HeroPower component */}
            <div className="flex items-center">
              <HeroPower 
                heroPower={player.heroPower}
                currentMana={player.mana?.current || 0}
                isPlayerTurn={isPlayerTurn && !isProcessingAIActions}
                isTargetMode={heroTargetMode}
                onUse={handleToggleHeroPower}
                isInteractionDisabled={isProcessingAIActions}
              />
            </div>
            
            {/* Hand area - hidden during mulligan phase */}
            {gamePhase !== 'mulligan' && (
              <div className="mt-4 w-full" style={{ pointerEvents: (!isPlayerTurn || isProcessingAIActions) ? 'none' : 'auto' }}>
                <Hand
                  cards={player.hand}
                  currentMana={player.mana.current}
                  isPlayerTurn={isPlayerTurn}
                  onCardPlay={(card, position) => {
                    if (isProcessingAIActions) return;
                    
                    // If right click or ctrl+click, view card details
                    if ((window.event as MouseEvent)?.ctrlKey) {
                      handleViewCardDetails(card);
                    } else {
                      // Otherwise, normal card play with position for animation
                      handlePlayCard(card, position);
                    }
                  }}
                  isInteractionDisabled={isProcessingAIActions}
                  registerCardPosition={registerCardPosition}
                  battlefieldRef={battlefieldRef}
                  evolveReadyIds={evolveReadyIds}
	                battlefieldCount={player.battlefield?.length || 0}
	                activeMinionCount={player.battlefield?.filter((minion: CardInstance) => !minion.isSummoningSick && minion.canAttack !== false).length || 0}
	                playerBattlefield={player.battlefield}
	              />
              </div>
            )}
          </div>
        </GameAreaContainer>
      </div>
      
      {/* Game Log - Hidden when in Ragnarok Combat Arena */}
      {/* <div className="fixed left-4 top-40 w-64 z-40 norse-game-log">
        <GameLog log={gameState.gameLog || []} maxEntries={15} />
      </div> */}
      
      {/* Graveyards - position in fixed locations */}
      <div className="fixed left-4 bottom-6 flex flex-col space-y-2 z-40">
        <Graveyard cards={player.graveyard || []} playerName="Your" />
      </div>
      
      <div className="fixed right-4 bottom-6 flex flex-col space-y-2 z-40">
        <Graveyard cards={opponent.graveyard || []} playerName="Opponent's" />
      </div>
      
      {/* Card preview */}
      {hoveredCard && (
        <div className="fixed top-1/2 right-8 transform -translate-y-1/2 pointer-events-none z-50">
          <div className="bg-gray-900 bg-opacity-90 p-4 rounded-lg shadow-xl border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-2">{hoveredCard.card.name}</h3>
            <p className="text-sm text-gray-300 mb-3">{hoveredCard.card.description || 'No description'}</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Mana Cost: <span className="text-blue-400 font-bold">{hoveredCard.card.manaCost}</span></div>
              <div>Attack: <span className="text-red-400 font-bold">{getAttack(hoveredCard.card)}</span></div>
              <div>Health: <span className="text-green-400 font-bold">{getHealth(hoveredCard.card)}</span></div>
              <div>Rarity: <span className="text-purple-400 font-bold">{hoveredCard.card.rarity}</span></div>
            </div>
          </div>
        </div>
      )}
      
      {/* Discovery Modal for card discovery */}
      {gameState.discovery && gameState.discovery.active && (
        <div className="fixed inset-0 z-cinematic">
          <DiscoveryModal 
            discoveryState={gameState.discovery}
            onCardSelect={handleDiscoverySelect}
          />
        </div>
      )}
      
      {/* Debug WebGL Diagnostics Panel — DEV only */}
      {import.meta.env.DEV && <DebugRenderCheck />}
      
      {/* Ultimate CardWithDrag system handles all interactions - no competing systems */}
    </div>
    </NorseBackground>);
};

export default GameBoard;
