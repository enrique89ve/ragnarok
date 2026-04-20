import { useState, useEffect, useCallback, useRef } from 'react';
import { CardInstance, GameState } from '../types';
import { useAnimation, useAnimationStore } from './AnimationManager';
import { debug } from '../config/debugConfig';
import { assetPath } from '../utils/assetPath';

const audioPool: Map<string, HTMLAudioElement[]> = new Map();
const POOL_SIZE = 3;

function playPooledAudio(src: string, volume = 0.6, playbackRate = 1.0) {
  let pool = audioPool.get(src);
  if (!pool) {
    pool = Array.from({ length: POOL_SIZE }, () => {
      const a = new Audio(src);
      a.preload = 'auto';
      return a;
    });
    audioPool.set(src, pool);
  }
  const available = pool.find(a => a.paused || a.ended) || pool[0];
  available.volume = volume;
  available.playbackRate = playbackRate;
  available.currentTime = 0;
  available.play().catch(e => debug.error("Failed to play sound:", e));
}

/**
 * Types of actions the AI can take
 */
export type AIActionType = 
  | 'play_card'     // Playing a card from hand
  | 'attack'        // Attacking with a minion
  | 'hero_power'    // Using hero power
  | 'end_turn';     // End turn

/**
 * AI action interface to track planned actions
 */
export interface AIAction {
  type: AIActionType;
  cardId?: string;        // Card being played or attacking
  targetId?: string;      // Target of attack or spell
  card?: CardInstance;    // The full card data
  target?: CardInstance;  // The full target data
  message?: string;       // Description of the action
}

/**
 * Props required by the AI action manager
 */
interface AIActionManagerProps {
  gameState: GameState;
  isAITurn: boolean;
  onPlayCard: (card: CardInstance, targetId?: string) => void;
  onAttack: (attackerId: string, defenderId: string) => void;
  onUseHeroPower: (targetId?: string) => void;
  onEndTurn: () => void;
}

/**
 * AI Action Manager Hook
 * Manages AI actions with improved error handling and prevents turns from getting stuck
 */
export const useAIActionManager = ({
  gameState,
  isAITurn,
  onPlayCard,
  onAttack,
  onUseHeroPower,
  onEndTurn
}: AIActionManagerProps) => {
  // Store current action and queue
  const [actionQueue, setActionQueue] = useState<AIAction[]>([]);
  const [currentAction, setCurrentAction] = useState<AIAction | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  
  // Reference to store timers for cleanup
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  
  // Add a timer to the reference for later cleanup
  const addTimer = useCallback((timer: NodeJS.Timeout) => {
    timersRef.current.push(timer);
  }, []);
  
  // Clear all timers stored in the reference
  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);
  
  // Reset the action queue and state
  const resetQueue = useCallback(() => {
    clearAllTimers();
    setActionQueue([]);
    setCurrentAction(null);
    setIsThinking(false);
  }, [clearAllTimers]);
  
  // Queue a single action
  const queueAction = useCallback((action: AIAction) => {
    setActionQueue(prev => [...prev, action]);
  }, []);
  
  // Queue multiple actions at once
  const queueActions = useCallback((actions: AIAction[]) => {
    setActionQueue(prev => [...prev, ...actions]);
  }, []);
  
  // Start AI "thinking" state
  const startThinking = useCallback(() => {
    setIsThinking(true);
  }, []);
  
  /**
   * Execute a specific AI action with comprehensive error handling
   * and visual animations for better feedback
   */
  const executeAction = useCallback((action: AIAction) => {
    try {
      debug.animation(`Executing AI action: ${action.type}`);
      
      // Helper function to get element position
      const getCardPosition = (cardId: string) => {
        const cardElement = document.querySelector(`[data-card-id="${cardId}"]`);
        if (cardElement) {
          const rect = cardElement.getBoundingClientRect();
          return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
          };
        }
        return null;
      };
      
      // Helper function to get hero position
      const getHeroPosition = (hero: 'player' | 'opponent') => {
        const heroElement = document.querySelector(`.${hero}-hero`);
        if (heroElement) {
          const rect = heroElement.getBoundingClientRect();
          return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
          };
        }
        return null;
      };
      
      switch (action.type) {
        case 'play_card':
          if (action.card && action.card.card) {
            debug.animation(`AI playing card: ${action.card.card.name}`);
            try {
              // Show card play visual effect before executing the actual play
              const { addAnimation } = useAnimationStore.getState();
              
              // Get the card's position in hand (if available)
              const cardElement = document.querySelector(`[data-card-id="${action.card.instanceId}"]`);
              if (cardElement) {
                const rect = cardElement.getBoundingClientRect();
                const position = {
                  x: rect.left + rect.width / 2,
                  y: rect.top + rect.height / 2
                };
                
                // Simulate hovering/reviewing the card first (like a human player would)
                addAnimation({
                  id: `hover-${action.card.instanceId}`,
                  type: 'highlight',
                  position: position,
                  startTime: Date.now(),
                  duration: 700, // Hover for a bit to simulate consideration
                  card: action.card
                });
                
                // Capture card reference for use inside setTimeout
                const cardRef = action.card;
                const cardData = cardRef.card;
                const manaCost = cardData.manaCost ?? 0;
                const cardType = cardData.type;
                const cardRarity = cardData.rarity;
                const cardInstanceId = cardRef.instanceId;
                
                // After "thinking", play the card with enhanced effects
                setTimeout(() => {
                  // Defensive guard: verify card reference is still valid
                  if (!cardRef || !cardRef.card) {
                    debug.warn("Card reference became invalid before animation callback");
                    return;
                  }
                  
                  const cardPlaySounds = [
                    assetPath('/sounds/card_play.mp3'),
                    assetPath('/sounds/card_place.mp3')
                  ];
                  const playbackRate = 0.9 + Math.random() * 0.3;
                  playPooledAudio(cardPlaySounds[Math.floor(Math.random() * cardPlaySounds.length)], 0.6, playbackRate);

                  if (manaCost >= 5) {
                    setTimeout(() => {
                      playPooledAudio(assetPath('/sounds/card_whoosh.mp3'), 0.4);
                    }, 100);
                  }
                  
                  // Add dramatic camera shake for high-cost cards
                  if (manaCost >= 7) {
                    const shakeIntensity = Math.min(manaCost, 10); // Cap at 10px shake
                    document.body.style.animation = `shake 0.6s ${shakeIntensity}px`;
                    setTimeout(() => {
                      document.body.style.animation = '';
                    }, 700);
                  }
                  
                  // Show mana crystal flash on play
                  addAnimation({
                    id: `mana-flash-${Date.now()}`,
                    type: 'manaUse',
                    position: { x: window.innerWidth - 100, y: 50 }, // Near the opponent's mana display
                    startTime: Date.now(),
                    duration: 400,
                    value: manaCost
                  });
                  
                  // Add enhanced play animation
                  addAnimation({
                    id: `play-${cardInstanceId}`,
                    type: 'play',
                    position: position,
                    startTime: Date.now(),
                    duration: 600,
                    card: cardRef,
                    playType: (cardType === 'spell') ? 'spell' : 'minion'
                  });
                  
                  // Add particles for fancy cards (spells and rares+)
                  if (cardType === 'spell' || 
                      ['Rare', 'Epic', 'Mythic'].includes(cardRarity || '')) {
                    addAnimation({
                      id: `particles-${cardInstanceId}`,
                      type: 'particles',
                      position: position,
                      startTime: Date.now() + 200,
                      duration: 800,
                      particleType: cardType === 'spell' ? 'magic' : 'rarity'
                    });
                  }
                  
                  // Add a target animation if this card has a target
                  if (action.targetId) {
                    const targetPos = getCardPosition(action.targetId) || 
                      (action.targetId === 'player-hero' ? getHeroPosition('player') : null);
                    
                    if (targetPos) {
                      // Targeting animation
                      addAnimation({
                        id: `target-${cardInstanceId}-${action.targetId}`,
                        type: 'target',
                        position: position,
                        targetPosition: targetPos,
                        startTime: Date.now() + 300, // Slightly delayed
                        duration: 500
                      });
                      
                      // Target impact effect
                      addAnimation({
                        id: `target-impact-${action.targetId}`,
                        type: 'flash',
                        position: targetPos,
                        startTime: Date.now() + 500,
                        duration: 300
                      });
                    }
                  }
                  
                  // Execute the actual card play after animations start
                  setTimeout(() => {
                    // Re-validate card reference before final action
                    if (cardRef && cardRef.card) {
                      onPlayCard(cardRef, action.targetId);
                    } else {
                      debug.warn("Card reference became stale before onPlayCard execution");
                    }
                  }, 250);
                  
                }, 800); // Delay after "thinking" about the card
              } else {
                // If we can't find the card element, just play the card without animation
                // but still add a short delay to simulate human behavior
                const fallbackCard = action.card;
                setTimeout(() => {
                  if (fallbackCard) {
                    onPlayCard(fallbackCard, action.targetId);
                  }
                }, 400);
              }
            } catch (playError) {
              debug.error("Error playing card:", playError);
              // Fallback
              if (action.card) {
                onPlayCard(action.card, action.targetId);
              }
            }
          } else {
            debug.error("Invalid card data for AI play_card action");
          }
          break;
          
        case 'attack':
          if (action.cardId && action.targetId) {
            debug.animation(`AI attacking with ${action.cardId} against ${action.targetId}`);
            try {
              // Get positions for attacker and target for animation
              const attackerPosition = getCardPosition(action.cardId);
              const targetPosition = getCardPosition(action.targetId) || 
                                     (action.targetId === 'player-hero' ? getHeroPosition('player') : null);
              
              if (attackerPosition && targetPosition) {
                // Add attack animation using the animation store
                const { addAnimation } = useAnimationStore.getState();
                
                // Add "thinking" indicator first (like a real player considering attack)
                addAnimation({
                  id: `thinking-${action.cardId}`,
                  type: 'highlight',
                  position: attackerPosition,
                  startTime: Date.now(),
                  duration: 600,
                  card: { instanceId: action.cardId }
                });
                
                // Delay the actual attack after "thinking" to simulate human behavior
                setTimeout(() => {
                  // Play attack sound effect - with random variations
                  const attackSounds = [
                    assetPath('/sounds/attack.mp3'),
                    assetPath('/sounds/sword_attack.mp3'),
                    assetPath('/sounds/card_attack.mp3')
                  ];
                  const randomSound = attackSounds[Math.floor(Math.random() * attackSounds.length)];
                  playPooledAudio(randomSound, 0.6);
                  
                  // Add camera shake for impact
                  const intensity = Math.random() * 5 + 5; // Between 5-10px shake
                  document.body.style.animation = `shake 0.5s ${intensity}px`;
                  setTimeout(() => {
                    document.body.style.animation = '';
                  }, 500);
                  
                  // Add the attack animation with improved visuals
                  addAnimation({
                    id: `attack-${action.cardId}-${action.targetId}`,
                    type: 'attack',
                    sourcePosition: attackerPosition,
                    targetPosition: targetPosition,
                    startTime: Date.now(),
                    duration: 700,
                    // Add extra attack properties
                    intensity: Math.random() > 0.7 ? 'critical' : 'normal'
                  });
                  
                  // Get cards for damage display
                  const opponentMinions = gameState.players.opponent.battlefield || [];
                  const playerMinions = gameState.players.player.battlefield || [];
                  
                  // Find attacker and defender card instances
                  const attacker = opponentMinions.find(c => c.instanceId === action.cardId);
                  const defender = playerMinions.find(c => c.instanceId === action.targetId) ||
                                  (action.targetId === 'player-hero' ? {card: {attack: 0} as {attack: number}} : null);
                  
                  if (attacker && defender) {
                    // Get attack values safely (check if card has attack property)
                    const attackerCard = attacker.card as {attack?: number};
                    const defenderCard = defender.card as {attack?: number};
                    const attackerDamage = attackerCard.attack ?? 0;
                    const defenderDamage = defenderCard.attack ?? 0;
                    
                    // Add impact flash on target
                    addAnimation({
                      id: `impact-${action.targetId}`,
                      type: 'flash',
                      position: targetPosition,
                      startTime: Date.now() + 200,
                      duration: 300
                    });
                    
                    // Add damage animation on target
                    addAnimation({
                      id: `damage-${action.targetId}`,
                      type: 'damage',
                      position: targetPosition,
                      startTime: Date.now() + 300, // Slightly delayed
                      duration: 800,
                      value: attackerDamage
                    });
                    
                    // Add particle burst for dramatic effect
                    addAnimation({
                      id: `particles-${action.targetId}`,
                      type: 'particles',
                      position: targetPosition,
                      startTime: Date.now() + 300,
                      duration: 700,
                      particleType: 'impact'
                    });
                    
                    // If target can counter-attack, show damage to attacker too
                    if (defenderDamage > 0) {
                      // Counter-attack flash 
                      addAnimation({
                        id: `counter-flash-${action.cardId}`,
                        type: 'flash',
                        position: attackerPosition,
                        startTime: Date.now() + 350,
                        duration: 300
                      });
                      
                      // Counter-attack damage number
                      addAnimation({
                        id: `damage-${action.cardId}`,
                        type: 'damage',
                        position: attackerPosition,
                        startTime: Date.now() + 400, // Slightly more delayed
                        duration: 800,
                        value: defenderDamage
                      });
                      
                      // Counter-attack particles
                      addAnimation({
                        id: `counter-particles-${action.cardId}`,
                        type: 'particles',
                        position: attackerPosition,
                        startTime: Date.now() + 400,
                        duration: 700,
                        particleType: 'impact'
                      });
                    }
                  }
                  
                  // Execute actual attack after visual effects start
                  setTimeout(() => {
                    onAttack(action.cardId!, action.targetId!);
                  }, 300);
                  
                }, 800); // Delay to simulate human thinking
              } else {
                // If we can't get positions, just execute the attack without animation
                setTimeout(() => {
                  onAttack(action.cardId!, action.targetId!);
                }, 200);
              }
            } catch (attackError) {
              debug.error("Error during attack:", attackError);
            }
          } else {
            debug.error("Missing cardId or targetId for AI attack action");
          }
          break;
          
        case 'hero_power':
          debug.animation(`AI using hero power${action.targetId ? ` on ${action.targetId}` : ''}`);
          try {
            // Get target position if any (convert null to undefined for type compatibility)
            const targetPosition = action.targetId ? 
              (getCardPosition(action.targetId) || 
               (action.targetId === 'player-hero' ? getHeroPosition('player') : undefined)) ?? undefined
              : undefined;
            
            // Get hero power position
            const heroPowerPosition = getHeroPosition('opponent');
            
            if (heroPowerPosition) {
              // First simulate thinking/consideration like a real player would
              const { addAnimation } = useAnimationStore.getState();
              
              // Highlight the hero power button first
              addAnimation({
                id: `hero-power-hover-${Date.now()}`,
                type: 'highlight',
                position: heroPowerPosition,
                startTime: Date.now(),
                duration: 600
              });
              
              // After "thinking", use the hero power with enhanced effects
              setTimeout(() => {
                // Play hero power sound with slightly randomized pitch for variety
                playPooledAudio(assetPath('/sounds/hero_power.mp3'), 0.6, 0.95 + Math.random() * 0.2);
                
                // Add dramatic glow around hero
                addAnimation({
                  id: `hero-glow-${Date.now()}`,
                  type: 'highlight',
                  position: { 
                    x: heroPowerPosition.x - 50, // Offset to center on hero portrait
                    y: heroPowerPosition.y - 60
                  },
                  startTime: Date.now(),
                  duration: 500,
                  scale: 2.5 // Larger highlight
                });
                
                // Add mana crystal flash
                addAnimation({
                  id: `mana-flash-hero-power-${Date.now()}`,
                  type: 'manaUse',
                  position: { x: window.innerWidth - 100, y: 50 }, // Near opponent's mana
                  startTime: Date.now() + 100,
                  duration: 400,
                  value: 2 // Hero power typically costs 2 mana
                });
                
                // Add hero power animation
                addAnimation({
                  id: `hero-power-${Date.now()}`,
                  type: 'spell',
                  position: heroPowerPosition,
                  targetPosition: targetPosition,
                  startTime: Date.now() + 200,
                  duration: 800,
                  spellType: 'heropower'
                });
                
                // Add particles for visual flair
                addAnimation({
                  id: `hero-power-particles-${Date.now()}`,
                  type: 'particles',
                  position: heroPowerPosition,
                  startTime: Date.now() + 250,
                  duration: 600,
                  particleType: 'heropower'
                });
                
                // If there's a target, add targeting animation
                if (targetPosition) {
                  // Add target line/arrow
                  addAnimation({
                    id: `hero-power-target-${Date.now()}`,
                    type: 'target',
                    position: heroPowerPosition,
                    targetPosition: targetPosition,
                    startTime: Date.now() + 300,
                    duration: 500
                  });
                  
                  // Add impact effect on target
                  addAnimation({
                    id: `hero-power-impact-${Date.now()}`,
                    type: 'flash',
                    position: targetPosition,
                    startTime: Date.now() + 600,
                    duration: 400
                  });
                  
                  // Add particles on target
                  addAnimation({
                    id: `hero-power-target-particles-${Date.now()}`,
                    type: 'particles',
                    position: targetPosition,
                    startTime: Date.now() + 650,
                    duration: 500,
                    particleType: 'magic'
                  });
                }
                
                // Add subtle camera shake for impact
                if (Math.random() > 0.5) { // Only sometimes for variety
                  document.body.style.animation = `shake 0.4s 3px`;
                  setTimeout(() => {
                    document.body.style.animation = '';
                  }, 400);
                }
                
                // Slight delay before executing the actual power
                setTimeout(() => {
                  onUseHeroPower(action.targetId);
                }, 400);
              }, 700); // Delay for "thinking" about using hero power
            } else {
              // If no position, just execute but still add a delay for realism
              setTimeout(() => {
                onUseHeroPower(action.targetId);
              }, 500);
            }
          } catch (heroPowerError) {
            debug.error("Error using hero power:", heroPowerError);
            // Fallback
            onUseHeroPower(action.targetId);
          }
          break;
          
        case 'end_turn':
          debug.animation('AI ending turn');
          try {
            // Add some visual and audio feedback before ending turn
            const { addAnimation } = useAnimationStore.getState();
            
            // Play end turn sound
            playPooledAudio(assetPath('/sounds/end_turn.mp3'), 0.5);
            
            // Get the end turn button position (approximate)
            const endTurnButtonPosition = {
              x: window.innerWidth - 120,
              y: window.innerHeight / 2
            };
            
            // Add button click animation
            addAnimation({
              id: `end-turn-click-${Date.now()}`,
              type: 'highlight',
              position: endTurnButtonPosition,
              startTime: Date.now(),
              duration: 400
            });
            
            // Add a "whoosh" effect as turn passes to player
            addAnimation({
              id: `turn-transition-${Date.now()}`,
              type: 'fullscreen',
              position: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
              startTime: Date.now() + 200,
              duration: 600,
              effect: 'turnTransition'
            });
            
            // Slight delay before executing the actual end turn
            setTimeout(() => {
              onEndTurn();
            }, 250);
          } catch (endTurnError) {
            debug.error("Error in end turn animation:", endTurnError);
            // Ensure the turn always ends even if animations fail
            onEndTurn();
          }
          break;
          
        default:
          debug.warn('Unknown AI action type:', action.type);
      }
    } catch (error) {
      debug.error("Error in executeAction:", error);
      
      // Force end turn if we have any critical error
      if (action.type !== 'end_turn') {
        debug.animation("Critical action failure, forcing end turn");
        try {
          onEndTurn();
        } catch (endTurnError) {
          debug.error("Failed to force end turn:", endTurnError);
        }
      }
    }
  }, [onPlayCard, onAttack, onUseHeroPower, onEndTurn]);
  
  /**
   * Process the next action in the queue with extensive recovery mechanisms
   */
  const processNextAction = useCallback(() => {
    // If queue is empty, check if we need to end the turn
    if (actionQueue.length === 0) {
      setCurrentAction(null);
      debug.animation("AI action queue is empty");
      
      // If AI turn is active but no actions remain, we should end the turn
      if (isAITurn && !isThinking) {
        debug.animation("No more AI actions, ending turn");
        // Add small delay before ending turn
        const endTurnTimer = setTimeout(() => {
          // Force an end turn action to ensure the turn completes
          debug.animation("AI turn - forcing end turn (failsafe)");
          onEndTurn();
          // Clean up after end turn
          resetQueue();
        }, 300); // Short delay
        addTimer(endTurnTimer);
      }
      return;
    }
    
    // Get the next action and remove it from the queue
    const nextAction = actionQueue[0];
    setActionQueue(prev => prev.slice(1));
    setCurrentAction(nextAction);
    
    debug.animation(`Processing AI action: ${nextAction.type}`);
    
    // Use extremely short delays to prevent game from hanging
    const actionDelay = nextAction.type === 'play_card' ? 300 : 
                         nextAction.type === 'attack' ? 200 : 
                         nextAction.type === 'hero_power' ? 300 : 
                         nextAction.type === 'end_turn' ? 200 : 200;
    
    // Execute the action after the delay
    const actionTimer = setTimeout(() => {
      try {
        // Handle end_turn actions immediately and directly
        if (nextAction.type === 'end_turn') {
          debug.animation("AI executing end turn action");
          
          // Direct end turn execution - critical path
          onEndTurn();
          
          // Cleanup immediately after end turn
          const resetTimer = setTimeout(() => {
            debug.animation("Resetting AI action queue after end turn");
            setCurrentAction(null);
            resetQueue();
          }, 50);
          
          addTimer(resetTimer);
        } else {
          // For all other actions, wrap in try/catch
          try {
            executeAction(nextAction);
          } catch (actionError) {
            debug.error(`Error executing ${nextAction.type} action:`, actionError);
          }
          
          // Always clear current action after a short delay to ensure progress
          const clearTimer = setTimeout(() => {
            setCurrentAction(null);
            
            // Continue with next action
            const nextTimer = setTimeout(() => {
              processNextAction();
            }, 50);
            addTimer(nextTimer);
          }, 100);
          
          addTimer(clearTimer);
        }
      } catch (error) {
        // Final fallback error handling
        debug.error("Critical error executing AI action:", error);
        
        // Ensure turn always ends even with errors
        if (nextAction.type === 'end_turn') {
          debug.animation("Error during end turn, forcing player turn");
          try {
            onEndTurn();
          } catch (e) {
            debug.error("Even the fallback end turn failed:", e);
          }
          resetQueue();
        } else {
          // Skip to the next action on error
          setCurrentAction(null);
          const recoveryTimer = setTimeout(processNextAction, 100);
          addTimer(recoveryTimer);
        }
      }
    }, actionDelay);
    
    addTimer(actionTimer);
  }, [actionQueue, executeAction, resetQueue, addTimer, isAITurn, isThinking, onEndTurn]);
  
  // Track the AI turn state changes to prevent multiple processing
  const lastAITurnRef = useRef<boolean>(false);
  const thinkingInitiatedRef = useRef(false);
  
  // Handle changes to AI turn state
  useEffect(() => {
    // Only execute if the isAITurn state actually changed
    if (isAITurn !== lastAITurnRef.current) {
      debug.animation(`AI turn state changed from ${lastAITurnRef.current} to ${isAITurn}`);
      lastAITurnRef.current = isAITurn;
      
      // Reset thinking state when turn changes
      thinkingInitiatedRef.current = false;
      
      if (isAITurn) {
        // First clean up any previous state
        resetQueue();
        
        // Start AI turn processing if not already initiated
        if (!thinkingInitiatedRef.current) {
          thinkingInitiatedRef.current = true;
          
          // Begin thinking phase - brief delay before actions
          startThinking();
          debug.animation("AI turn started - thinking phase");
          
          // After brief thinking delay, process actions
          const thinkingTimer = setTimeout(() => {
            // Verify we're still in AI turn before continuing
            if (isAITurn) {
              setIsThinking(false);
              
              // Add default end turn action if queue is empty
              if (actionQueue.length === 0) {
                debug.animation("No AI actions found, adding default end turn action");
                const endTurnAction: AIAction = { type: 'end_turn' };
                setActionQueue([endTurnAction]);
              } else {
                // Process the existing queue
                processNextAction();
              }
              
              // Ultimate failsafe: force end turn after 3 seconds if still AI's turn
              const safetyTimer = setTimeout(() => {
                if (isAITurn) {
                  debug.animation("EMERGENCY FAILSAFE - Force ending AI turn after timeout");
                  onEndTurn();
                  resetQueue();
                }
              }, 3000);
              
              addTimer(safetyTimer);
            }
          }, 500); // Brief thinking time
          
          addTimer(thinkingTimer);
        }
        
        // Return cleanup function
        return () => {
          debug.animation("Cleanup triggered in AI turn effect");
          clearAllTimers();
        };
      } else {
        // Not AI's turn anymore, reset state
        debug.animation("AI turn ended - resetting state");
        resetQueue();
      }
    }
    return undefined;
  }, [isAITurn, processNextAction, resetQueue, startThinking, addTimer, 
      clearAllTimers, actionQueue, currentAction, onEndTurn]);
  
  // Safely process action queue changes - prevents double processing
  const actionQueueLengthRef = useRef(0);
  
  useEffect(() => {
    // Only process if queue length changed (prevents loops)
    const queueHasChanged = actionQueueLengthRef.current !== actionQueue.length;
    actionQueueLengthRef.current = actionQueue.length;
    
    // Only start processing if conditions are right
    if (!currentAction && actionQueue.length > 0 && !isThinking && queueHasChanged && isAITurn) {
      debug.animation("Processing action queue due to queue length change:", actionQueue.length);
      processNextAction();
    }
  }, [actionQueue, currentAction, isThinking, processNextAction, isAITurn]);
  
  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);
  
  // Return the manager API
  return {
    queueAction,
    queueActions,
    resetQueue,
    currentAction,
    isProcessing: Boolean(currentAction) || isThinking,
    actionQueue,
    isThinking
  };
};