import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAnnouncementConfig } from '../stores/unifiedUIStore';
import { useAnimationAdapter } from '../hooks';
import { GameIcon } from '../utils/ui/GameIcon';
import { useCombatFeedbackStore } from '../combat/feedback/combatFeedbackStore';
import './ActionAnnouncement.css';

const ANNOUNCEMENT_CINEMA_HOLDER = 'action-announcement';

const ANNOUNCEMENT_LABELS: Record<string, string> = {
  battlecry: 'Battlecry',
  deathrattle: 'Deathrattle',
  spell: 'Spell effect',
  attack: 'Attack',
  damage: 'Damage',
  heal: 'Restoration',
  buff: 'Empowerment',
  summon: 'Summoning',
  draw: 'Card draw',
  discover: 'Discovery',
  secret: 'Hidden rune',
  mythic: 'Mythic effect',
  status_effect: 'Status effect',
  phase_change: 'Battle phase',
  victory: 'Victory',
  defeat: 'Defeat',
};

function getAnnouncementLabel(type: string): string {
  return ANNOUNCEMENT_LABELS[type] ?? 'Combat effect';
}

export function ActionAnnouncement() {
  const { currentAnnouncement } = useAnimationAdapter();

  useEffect(() => {
    const store = useCombatFeedbackStore.getState();
    if (currentAnnouncement) {
      store.holdCinema(ANNOUNCEMENT_CINEMA_HOLDER);
      return () => store.releaseCinema(ANNOUNCEMENT_CINEMA_HOLDER);
    }
    store.releaseCinema(ANNOUNCEMENT_CINEMA_HOLDER);
    return undefined;
  }, [currentAnnouncement]);

  return (
    <div className="action-announcement-container">
      <AnimatePresence mode="wait">
        {currentAnnouncement && (
          <motion.div
            key={currentAnnouncement.id}
            className={`action-announcement action-announcement-${currentAnnouncement.type}`}
            initial={{
              opacity: 0,
              scale: 0.95,
              y: -12
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0
            }}
            exit={{
              opacity: 0,
              scale: 0.97,
              y: -8
            }}
            transition={{
              duration: 0.2,
              ease: [0.23, 1, 0.32, 1]
            }}
            style={{
              '--rarity-color': getAnnouncementConfig(currentAnnouncement.type).color
            } as React.CSSProperties}
            role="status"
            aria-live="polite"
          >
            <span className="announcement-rune announcement-rune-top" aria-hidden="true" />
            <span className="announcement-rune announcement-rune-bottom" aria-hidden="true" />

            <div className="announcement-icon-column" aria-hidden="true">
              <div className="announcement-icon-wrapper">
                <GameIcon
                  name={currentAnnouncement.iconName ?? getAnnouncementConfig(currentAnnouncement.type).iconName}
                  size={34}
                  className="announcement-icon"
                />
              </div>
              <span className="announcement-icon-caption">RUNE</span>
            </div>

            <div className="announcement-content">
              <span className="announcement-kicker">
                <span className="announcement-kicker-mark" aria-hidden="true" />
                {getAnnouncementLabel(currentAnnouncement.type)}
              </span>

              <h2 className="announcement-title">
                {currentAnnouncement.title}
              </h2>

              {currentAnnouncement.subtitle && (
                <p className="announcement-subtitle">
                  {currentAnnouncement.subtitle}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
