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
import { useBannerStore } from '@/game/components/ui/GameStatusBanner';
import { GAME_MESSAGE_IDS } from '@/game/effects/feedback/gameMessageCatalog';
import { publishGameMessage } from '@/game/effects/feedback/gameMessageAdapter';

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
          publishGameMessage({
            id: GAME_MESSAGE_IDS.CARD_MYTHIC,
            params: { cardName: event.cardName },
          });
        }
      })
    );
  }

  // Card Discarded (burned)
  unsubscribes.push(
    GameEventBus.subscribe<CardDiscardedEvent>('CARD_DISCARDED', (event) => {
      if (event.reason === 'hand_full') {
        publishGameMessage({
          id: GAME_MESSAGE_IDS.CARD_BURNED,
          params: { player: event.player, cardName: event.cardName },
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
          publishGameMessage({
            id: GAME_MESSAGE_IDS.BATTLECRY_TRIGGERED,
            params: { sourceName: event.sourceName, effectType: event.effectType },
          });
        }
      })
    );
  }

  // Deathrattle Triggered
  if (cfg.showDeathrattles) {
    unsubscribes.push(
      GameEventBus.subscribe<DeathrattleTriggeredEvent>('DEATHRATTLE_TRIGGERED', (event) => {
        publishGameMessage({
          id: GAME_MESSAGE_IDS.DEATHRATTLE_TRIGGERED,
          params: { sourceName: event.sourceName },
        });
      })
    );
  }

  // Secret Revealed
  if (cfg.showSecrets) {
    unsubscribes.push(
      GameEventBus.subscribe<SecretRevealedEvent>('SECRET_REVEALED', (event) => {
        publishGameMessage({
          id: GAME_MESSAGE_IDS.SECRET_REVEALED,
          params: { player: event.player, cardName: event.cardName },
        });
      })
    );
  }

  // Turn Started
  if (cfg.showTurnChanges) {
    unsubscribes.push(
      GameEventBus.subscribe<TurnStartedEvent>('TURN_STARTED', (event) => {
        if (event.player === 'player') {
          publishGameMessage({
            id: GAME_MESSAGE_IDS.PLAYER_TURN,
            params: {},
          });
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
      publishGameMessage({
        id: GAME_MESSAGE_IDS.SILENCE_APPLIED,
        params: { targetName: event.targetName },
      });
    })
  );

  // Overload Triggered
  unsubscribes.push(
    GameEventBus.subscribe<OverloadTriggeredEvent>('OVERLOAD_TRIGGERED', (event) => {
      if (event.player === 'player') {
        publishGameMessage({
          id: GAME_MESSAGE_IDS.OVERLOAD_TRIGGERED,
          params: { amount: event.amount },
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
