/**
 * NotificationSubscriber.ts
 *
 * Subscribes to GameEventBus events and triggers UI notifications.
 * Decouples toast/notification logic from game logic.
 *
 * Added by Enrique - Event-driven architecture integration
 */

import { GameEventBus } from '@/core/events/GameEventBus';
import type {
  CardPlayedEvent,
  CardDiscardedEvent,
  BattlecryTriggeredEvent,
  DeathrattleTriggeredEvent,
  SecretRevealedEvent,
  TurnStartedEvent,
  SilenceAppliedEvent,
  OverloadTriggeredEvent,
  NotificationEvent,
} from '@/core/events/GameEvents';
import { toast } from 'sonner';
import { useBannerStore } from '@/game/components/ui/GameStatusBanner';

type UnsubscribeFn = () => void;

/**
 * Configuration for notification behavior
 */
interface NotificationConfig {
  showCardPlayed: boolean;
  showCardDrawn: boolean;
  showBattlecries: boolean;
  showDeathrattles: boolean;
  showSecrets: boolean;
  showTurnChanges: boolean;
  showBuffs: boolean;
  showCombatResults: boolean;
}

const DEFAULT_CONFIG: NotificationConfig = {
  showCardPlayed: false,       // Too noisy for most games
  showCardDrawn: false,        // Too noisy
  showBattlecries: false,      // GSAP VFX handles these now
  showDeathrattles: false,     // GSAP VFX handles these now
  showSecrets: true,
  showTurnChanges: false,      // Usually shown in UI
  showBuffs: false,            // Too noisy
  showCombatResults: true
};

/**
 * Initialize notification event subscriptions
 */
export function initializeNotificationSubscriber(
  config: Partial<NotificationConfig> = {}
): UnsubscribeFn {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const unsubscribes: UnsubscribeFn[] = [];

  // Card Played (only for mythic cards)
  if (cfg.showCardPlayed) {
    unsubscribes.push(
      GameEventBus.subscribe<CardPlayedEvent>('CARD_PLAYED', (event) => {
        if (event.rarity === 'mythic') {
          toast.success(`Mythic! ${event.cardName}`, {
            duration: 2000
          });
        }
      })
    );
  }

  // Card Discarded (burned)
  unsubscribes.push(
    GameEventBus.subscribe<CardDiscardedEvent>('CARD_DISCARDED', (event) => {
      if (event.reason === 'hand_full') {
        const player = event.player === 'player' ? 'Your' : 'Opponent\'s';
        toast.warning(`${player} ${event.cardName} was burned!`, {
          duration: 3000
        });
      }
    })
  );

  // Battlecry Triggered
  if (cfg.showBattlecries) {
    unsubscribes.push(
      GameEventBus.subscribe<BattlecryTriggeredEvent>('BATTLECRY_TRIGGERED', (event) => {
        // Only show for significant battlecries
        if (event.value && event.value >= 3) {
          toast.info(`${event.sourceName}: ${event.effectType}`, {
            duration: 2000
          });
        }
      })
    );
  }

  // Deathrattle Triggered
  if (cfg.showDeathrattles) {
    unsubscribes.push(
      GameEventBus.subscribe<DeathrattleTriggeredEvent>('DEATHRATTLE_TRIGGERED', (event) => {
        toast.info(`Deathrattle: ${event.sourceName}`, {
          duration: 2000
        });
      })
    );
  }

  // Secret Revealed
  if (cfg.showSecrets) {
    unsubscribes.push(
      GameEventBus.subscribe<SecretRevealedEvent>('SECRET_REVEALED', (event) => {
        const player = event.player === 'player' ? 'Your' : 'Opponent\'s';
        toast.info(`${player} rune: ${event.cardName}!`, {
          duration: 3000
        });
      })
    );
  }

  // Turn Started
  if (cfg.showTurnChanges) {
    unsubscribes.push(
      GameEventBus.subscribe<TurnStartedEvent>('TURN_STARTED', (event) => {
        if (event.player === 'player') {
          toast.success('Your turn!', { duration: 1500 });
        }
      })
    );
  }

  // Game Started — visual cinematic handles this
  // Game Ended — victory/defeat cinematic handles this
  // Discovery Completed — card reveal animation handles this

  // Silence Applied
  unsubscribes.push(
    GameEventBus.subscribe<SilenceAppliedEvent>('SILENCE_APPLIED', (event) => {
      toast.info(`${event.targetName} was silenced!`, {
        duration: 2000
      });
    })
  );

  // Overload Triggered
  unsubscribes.push(
    GameEventBus.subscribe<OverloadTriggeredEvent>('OVERLOAD_TRIGGERED', (event) => {
      if (event.player === 'player') {
        toast.warning(`Overloaded: ${event.amount} mana`, {
          duration: 2000
        });
      }
    })
  );

  // Showdown Result — poker celebration animation handles this
  // Pet Evolution — ascension/apotheosis VFX handles this

  // Direct Notification Events — route to the centered GameStatusBanner so
  // the layer-contract rule in `eslint.config.js` is honest: stores can't
  // import the banner directly, but they can emit a NOTIFICATION event and
  // this subscriber pushes it into the banner store. Keeps presentation
  // swappable (a future controller could switch to toast or a different
  // widget without touching emission sites).
  unsubscribes.push(
    GameEventBus.subscribe<NotificationEvent>('NOTIFICATION', (event) => {
      const duration = event.duration ?? 2800;
      useBannerStore.getState().push(event.message, event.level, duration);
    })
  );

  // Return cleanup function
  return () => {
    unsubscribes.forEach(unsub => unsub());
  };
}

export default initializeNotificationSubscriber;
