import { motion, AnimatePresence } from 'framer-motion';
import { getAnnouncementConfig } from '../stores/unifiedUIStore';
import { useAnimationAdapter } from '../hooks';
import { GameIcon } from '../utils/ui/GameIcon';
import './ActionAnnouncement.css';

export function ActionAnnouncement() {
  const { currentAnnouncement } = useAnimationAdapter();

  return (
    <div className="action-announcement-container">
      <AnimatePresence mode="wait">
        {currentAnnouncement && (
          <motion.div
            key={currentAnnouncement.id}
            className={`action-announcement action-announcement-${currentAnnouncement.type}`}
            initial={{
              opacity: 0,
              scale: 0.85,
              y: -20
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0
            }}
            exit={{
              opacity: 0,
              scale: 0.9,
              y: -10
            }}
            transition={{
              duration: 0.25,
              ease: [0.25, 0.1, 0.25, 1]
            }}
            style={{
              '--rarity-color': getAnnouncementConfig(currentAnnouncement.type).color
            } as React.CSSProperties}
          >
            <div className="announcement-icon-wrapper">
              <GameIcon
                name={currentAnnouncement.iconName ?? getAnnouncementConfig(currentAnnouncement.type).iconName}
                size={32}
                className="announcement-icon"
              />
            </div>

            <div className="announcement-content">
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
