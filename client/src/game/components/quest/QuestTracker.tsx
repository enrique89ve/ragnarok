/**
 * QuestTracker Component
 * Displays active quests with CCG-style progress tracking
 * 
 * Features:
 * - Shows quest name, condition, and progress
 * - Progress bar with animated fill
 * - Glow effect on progress updates
 * - Reward preview on hover
 * - Celebration animation on completion
 */

import React, { useState, useEffect, useRef } from 'react';
import { useQuestStore } from '../../stores/questStore';
import { ActiveQuest } from '../../utils/quests/types';
import { getQuestProgressPercent } from '../../utils/quests/questUtils';
import './QuestTracker.css';

interface QuestTrackerProps {
  owner?: 'player' | 'opponent';
  className?: string;
}

/**
 * QuestTracker - Displays active quests for a player
 */
export const QuestTracker: React.FC<QuestTrackerProps> = ({
  owner = 'player',
  className = ''
}) => {
  const quests = useQuestStore(state => 
    owner === 'player' ? state.playerQuests : state.opponentQuests
  );
  const recentUpdates = useQuestStore(state => state.recentProgressUpdates);

  if (quests.length === 0) {
    return <div className={`quest-tracker quest-tracker__empty ${className}`} />;
  }

  return (
    <div className={`quest-tracker ${className}`}>
      {quests.map(quest => (
        <QuestCard
          key={quest.id}
          quest={quest}
          hasRecentUpdate={recentUpdates.some(u => u.questId === quest.id)}
        />
      ))}
    </div>
  );
};

interface QuestCardProps {
  quest: ActiveQuest;
  hasRecentUpdate: boolean;
}

/**
 * Individual quest card with progress display
 */
const QuestCard: React.FC<QuestCardProps> = ({ quest, hasRecentUpdate }) => {
  const [justCompleted, setJustCompleted] = useState(false);
  const [showProgressUpdate, setShowProgressUpdate] = useState(false);
  const prevProgressRef = useRef(quest.current);
  
  const progressPercent = getQuestProgressPercent(quest);

  useEffect(() => {
    if (quest.current > prevProgressRef.current) {
      setShowProgressUpdate(true);
      const timer = setTimeout(() => setShowProgressUpdate(false), 600);
      prevProgressRef.current = quest.current;
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [quest.current]);

  useEffect(() => {
    if (quest.completed && quest.completedAt) {
      const timeSinceCompletion = Date.now() - quest.completedAt;
      if (timeSinceCompletion < 1000) {
        setJustCompleted(true);
        const timer = setTimeout(() => setJustCompleted(false), 800);
        return () => clearTimeout(timer);
      }
    }
    return undefined;
  }, [quest.completed, quest.completedAt]);

  const cardClasses = [
    'quest-card',
    quest.completed && 'quest-card--completed',
    showProgressUpdate && 'quest-card--progress-update',
    justCompleted && 'quest-card--just-completed'
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClasses}>
      <div className="quest-card__header">
        <div className={`quest-card__icon ${quest.completed ? 'quest-card__icon--completed' : ''}`}>
          {quest.completed ? '✓' : '!'}
        </div>
        <div className="quest-card__name">{quest.name}</div>
      </div>
      
      <div className="quest-card__condition">
        {quest.conditionDescription}
      </div>
      
      {!quest.completed ? (
        <div className="quest-card__progress">
          <div 
            className="quest-card__progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
          <div className="quest-card__progress-text">
            {quest.current} / {quest.goal}
          </div>
        </div>
      ) : (
        <div className="quest-card__completed-badge">
          <span className="quest-card__completed-badge-icon">⚔</span>
          Quest Complete!
        </div>
      )}
      
      <div className="quest-card__reward">
        <span className="quest-card__reward-label">Reward:</span>
        <span className="quest-card__reward-name">{quest.rewardCardName}</span>
      </div>
    </div>
  );
};

export default QuestTracker;
