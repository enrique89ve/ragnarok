/**
 * AnimationSubscriber.ts
 *
 * Subscribes to GameEventBus events and triggers UI animations.
 * Decouples animation logic from game logic.
 * 
 * Added by Enrique - Event-driven architecture integration
 */

import { GameEventBus } from '@/core/events/GameEventBus';
import {
	gameEffectCoordinator,
	type GameEffectHandle,
} from '@/game/effects/core/gameEffectCoordinator';
import { debug } from '../config/debugConfig';

type UnsubscribeFn = () => void;

/**
 * Animation queue item
 */
interface QueuedAnimation {
  id: string;
  type: string;
  sourceId?: string;
  targetId?: string;
  duration: number;
  params?: Record<string, unknown>;
  priority: number;
  timestamp: number;
}

/**
 * Animation subscriber state
 */
interface AnimationState {
  queue: QueuedAnimation[];
  isPlaying: boolean;
  currentAnimation: QueuedAnimation | null;
}

/**
 * Animation callback type
 */
type AnimationCallback = (animation: QueuedAnimation) => void;

const MAX_ANIMATION_QUEUE_LENGTH = 24;
const TURN_BOUNDARY_SURVIVING_PRIORITY = 8;

/**
 * Animation subscriber class for managing animation queue
 */
class AnimationSubscriberImpl {
  private state: AnimationState = {
    queue: [],
    isPlaying: false,
    currentAnimation: null
  };

  private callbacks: AnimationCallback[] = [];
  private unsubscribes: UnsubscribeFn[] = [];
  private processNextHandle: GameEffectHandle | null = null;

  /**
   * Register callback for when animations should play
   */
  onAnimation(callback: AnimationCallback): UnsubscribeFn {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Queue an animation
   */
  queueAnimation(animation: Omit<QueuedAnimation, 'id' | 'timestamp'>): void {
    const fullAnimation: QueuedAnimation = {
      ...animation,
      id: `anim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    // Insert based on priority (higher priority first)
    const insertIndex = this.state.queue.findIndex(a => a.priority < animation.priority);
    if (insertIndex === -1) {
      this.state.queue.push(fullAnimation);
    } else {
      this.state.queue.splice(insertIndex, 0, fullAnimation);
    }

    // Never allow an unbounded presentation backlog to lag behind canonical state.
    if (this.state.queue.length > MAX_ANIMATION_QUEUE_LENGTH) {
      this.state.queue.length = MAX_ANIMATION_QUEUE_LENGTH;
    }

    // Start processing if not already
    if (!this.state.isPlaying) {
      this.processNext();
    }
  }

  /**
   * Drop stale lower-priority queued animations on turn/match boundaries so
   * slow VFX never bleed across turns or delay terminal presentation.
   */
  private purgeStaleQueue(minPriority: number, preemptCurrent = false): void {
    this.state.queue = this.state.queue.filter(item => item.priority >= minPriority);
    if (preemptCurrent) {
      this.cancelScheduledNext();
      this.state.isPlaying = false;
      this.state.currentAnimation = null;
    }
  }

  private cancelScheduledNext(): void {
    this.processNextHandle?.cancel();
    this.processNextHandle = null;
  }

  /**
   * Process next animation in queue
   */
  private processNext(): void {
    if (this.state.queue.length === 0) {
      this.cancelScheduledNext();
      this.state.isPlaying = false;
      this.state.currentAnimation = null;
      return;
    }

    this.state.isPlaying = true;
    this.state.currentAnimation = this.state.queue.shift()!;

    // Notify callbacks
    this.callbacks.forEach(cb => {
      try {
        cb(this.state.currentAnimation!);
      } catch (error) {
        debug.error('[AnimationSubscriber] Callback error:', error);
      }
    });

    this.cancelScheduledNext();
    const scheduled = this.state.currentAnimation;
    this.processNextHandle = gameEffectCoordinator.schedule({
      owner: 'animation-subscriber',
      lane: 'queue',
      key: 'next',
      priority: scheduled.priority >= 10 ? 'high' : 'normal',
      delayMs: scheduled.duration,
      run: () => {
        this.processNextHandle = null;
        this.processNext();
      },
    });
  }

  /**
   * Clear all queued animations
   */
  clearQueue(): void {
    this.cancelScheduledNext();
    this.state.queue = [];
    this.state.isPlaying = false;
    this.state.currentAnimation = null;
  }

  /**
   * Get current queue length
   */
  getQueueLength(): number {
    return this.state.queue.length;
  }

  /**
   * Check if animations are playing
   */
  isPlaying(): boolean {
    return this.state.isPlaying;
  }

  /**
   * Initialize event subscriptions
   */
  initialize(): void {
    // Card Played Animation
    this.unsubscribes.push(
      GameEventBus.subscribePresentation('CARD_PLAYED', (event) => {
        const isMythic = event.rarity === 'mythic';
        this.queueAnimation({
          type: isMythic ? 'mythic_entrance' : 'card_play',
          sourceId: event.instanceId,
          duration: isMythic ? 2000 : 600,
          priority: isMythic ? 10 : 5,
          params: {
            cardName: event.cardName,
            cardType: event.cardType,
            rarity: event.rarity,
            position: event.position
          }
        });
      })
    );

    // Card Drawn Animation
    this.unsubscribes.push(
      GameEventBus.subscribePresentation('CARD_DRAWN', (event) => {
        if (event.player === 'player') {
          this.queueAnimation({
            type: event.burned ? 'card_burn' : 'card_draw',
            sourceId: event.cardId,
            duration: 500,
            priority: 3,
            params: {
              cardName: event.cardName,
              burned: event.burned,
              fatigue: event.fromFatigue
            }
          });
        }
      })
    );

    // Minion Summoned Animation
    this.unsubscribes.push(
      GameEventBus.subscribePresentation('MINION_SUMMONED', (event) => {
        if (event.source !== 'played') {
          this.queueAnimation({
            type: 'summon',
            sourceId: event.instanceId,
            duration: 800,
            priority: 5,
            params: {
              cardName: event.cardName,
              position: event.position,
              source: event.source
            }
          });
        }
      })
    );

    // Minion Destroyed Animation
    this.unsubscribes.push(
      GameEventBus.subscribePresentation('MINION_DESTROYED', (event) => {
        this.queueAnimation({
          type: 'death',
          sourceId: event.instanceId,
          duration: event.hasDeathrattle ? 1200 : 600,
          priority: 6,
          params: {
            cardName: event.cardName,
            hasDeathrattle: event.hasDeathrattle
          }
        });
      })
    );

    // Spell Cast Animation
    this.unsubscribes.push(
      GameEventBus.subscribePresentation('SPELL_CAST', (event) => {
        this.queueAnimation({
          type: 'spell_cast',
          sourceId: event.cardId,
          targetId: event.targetId,
          duration: 1000,
          priority: 7,
          params: {
            cardName: event.cardName,
            effectType: event.effectType
          }
        });
      })
    );

    // Battlecry Animation
    this.unsubscribes.push(
      GameEventBus.subscribePresentation('BATTLECRY_TRIGGERED', (event) => {
        this.queueAnimation({
          type: 'battlecry',
          sourceId: event.sourceId,
          targetId: event.targetId,
          duration: 800,
          priority: 6,
          params: {
            sourceName: event.sourceName,
            effectType: event.effectType,
            value: event.value
          }
        });
      })
    );

    // Deathrattle Animation
    this.unsubscribes.push(
      GameEventBus.subscribePresentation('DEATHRATTLE_TRIGGERED', (event) => {
        this.queueAnimation({
          type: 'deathrattle',
          sourceId: event.sourceId,
          duration: 1000,
          priority: 7,
          params: {
            sourceName: event.sourceName,
            effectType: event.effectType
          }
        });
      })
    );

    // Buff Applied Animation
    this.unsubscribes.push(
      GameEventBus.subscribePresentation('BUFF_APPLIED', (event) => {
        this.queueAnimation({
          type: 'buff',
          targetId: event.targetId,
          duration: 500,
          priority: 4,
          params: {
            targetName: event.targetName,
            attackChange: event.attackChange,
            healthChange: event.healthChange,
            keywords: event.keywords
          }
        });
      })
    );

    // Turn Started Animation
    this.unsubscribes.push(
      GameEventBus.subscribePresentation('TURN_STARTED', (event) => {
        this.purgeStaleQueue(TURN_BOUNDARY_SURVIVING_PRIORITY);
        this.queueAnimation({
          type: 'turn_start',
          duration: 1500,
          priority: 8,
          params: {
            player: event.player,
            turnNumber: event.turnNumber
          }
        });
      })
    );

    // Game Started Animation
    this.unsubscribes.push(
      GameEventBus.subscribePresentation('GAME_STARTED', (event) => {
        this.clearQueue();
        this.queueAnimation({
          type: 'game_start',
          duration: 3000,
          priority: 10,
          params: {
            playerHeroClass: event.playerHeroClass,
            opponentHeroClass: event.opponentHeroClass,
            startingPlayer: event.startingPlayer
          }
        });
      })
    );

    // Game Ended Animation
    this.unsubscribes.push(
      GameEventBus.subscribePresentation('GAME_ENDED', (event) => {
        this.purgeStaleQueue(10, true);
        this.queueAnimation({
          type: event.winner === 'player' ? 'victory' : 'defeat',
          duration: 5000,
          priority: 10,
          params: {
            winner: event.winner,
            reason: event.reason,
            finalTurn: event.finalTurn
          }
        });
      })
    );

    // Pet Evolution Animation
    this.unsubscribes.push(
      GameEventBus.subscribePresentation('PET_EVOLVED', (event) => {
        const isApotheosis = event.toStage === 3;
        this.queueAnimation({
          type: isApotheosis ? 'pet_apotheosis' : 'pet_ascension',
          sourceId: event.instanceId,
          duration: isApotheosis ? 1500 : 800,
          priority: isApotheosis ? 15 : 8,
          params: {
            cardName: event.cardName,
            familyName: event.familyName,
            fromStage: event.fromStage,
            toStage: event.toStage,
            element: event.element,
            isApotheosis
          }
        });
      })
    );

    // Weapon Equipped Animation
    this.unsubscribes.push(
      GameEventBus.subscribePresentation('WEAPON_EQUIPPED', (event) => {
        this.queueAnimation({
          type: 'weapon_equip',
          sourceId: event.cardId,
          duration: 600,
          priority: 7,
          params: { cardName: event.cardName, player: event.player, attack: event.attack, durability: event.durability }
        });
      })
    );

    // Weapon Destroyed Animation
    this.unsubscribes.push(
      GameEventBus.subscribePresentation('WEAPON_DESTROYED', (event) => {
        this.queueAnimation({
          type: 'weapon_destroy',
          duration: 500,
          priority: 6,
          params: { cardName: event.cardName, player: event.player }
        });
      })
    );

    // Secret (Rune) Played Animation
    this.unsubscribes.push(
      GameEventBus.subscribePresentation('SECRET_PLAYED', (event) => {
        this.queueAnimation({
          type: 'secret_played',
          duration: 800,
          priority: 7,
          params: { player: event.player }
        });
      })
    );

    // Secret (Rune) Revealed Animation
    this.unsubscribes.push(
      GameEventBus.subscribePresentation('SECRET_REVEALED', (event) => {
        this.queueAnimation({
          type: 'secret_revealed',
          duration: 1000,
          priority: 9,
          params: { secretName: event.cardName, player: event.player, triggeredBy: event.triggeredBy }
        });
      })
    );

    // Hero Power Used Animation
    this.unsubscribes.push(
      GameEventBus.subscribePresentation('HERO_POWER_USED', (event) => {
        this.queueAnimation({
          type: 'hero_power',
          duration: 700,
          priority: 7,
          params: { player: event.player, heroPowerName: event.heroPowerName, manaCost: event.cost }
        });
      })
    );

    // Silence Applied Animation
    this.unsubscribes.push(
      GameEventBus.subscribePresentation('SILENCE_APPLIED', (event) => {
        this.queueAnimation({
          type: 'silence',
          targetId: event.targetId,
          duration: 500,
          priority: 6,
          params: { targetName: event.targetName }
        });
      })
    );

    // Direct Animation Requests
    this.unsubscribes.push(
      GameEventBus.subscribePresentation('ANIMATION_REQUEST', (event) => {
        this.queueAnimation({
          type: event.animationType,
          sourceId: event.sourceId,
          targetId: event.targetId,
          duration: event.duration ?? 1000,
          priority: 5,
          params: event.params
        });
      })
    );
  }

  /**
   * Cleanup subscriptions
   */
  cleanup(): void {
    this.unsubscribes.forEach(unsub => unsub());
    this.unsubscribes = [];
    this.clearQueue();
  }
}

// Singleton instance
const animationSubscriber = new AnimationSubscriberImpl();

/**
 * Initialize animation subscriber
 */
export function initializeAnimationSubscriber(): UnsubscribeFn {
  animationSubscriber.initialize();
  return () => animationSubscriber.cleanup();
}

/**
 * Get animation subscriber instance
 */
export function getAnimationSubscriber(): AnimationSubscriberImpl {
  return animationSubscriber;
}

export default initializeAnimationSubscriber;
