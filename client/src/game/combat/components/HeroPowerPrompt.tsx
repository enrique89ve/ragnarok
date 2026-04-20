import React from 'react';
import '../styles/targeting-prompts.css';

export interface HeroPowerPromptProps {
  targeting: {
    active: boolean;
    powerName: string;
    targetType: string;
  } | null;
  onCancel: () => void;
}

export const HeroPowerPrompt: React.FC<HeroPowerPromptProps> = ({ targeting, onCancel }) => {
  if (!targeting?.active) return null;

  const getTargetingMessage = () => {
    const tt = targeting.targetType;
    const canTargetHero = tt === 'friendly_character' || tt === 'enemy_character' || 
      tt === 'any_character' || tt === 'any' || tt === 'enemy' || tt === 'enemy_hero';
    const isFriendly = tt.includes('friendly');
    const isEnemy = tt.includes('enemy');
    
    if (isFriendly && canTargetHero) {
      return 'Click on a friendly minion or your hero';
    } else if (isFriendly) {
      return 'Click on a friendly minion to buff';
    } else if (isEnemy && canTargetHero) {
      return 'Click on an enemy minion or enemy hero';
    } else if (isEnemy) {
      return 'Click on an enemy minion to target';
    } else if (canTargetHero) {
      return 'Click on any minion or hero to target';
    } else {
      return 'Click on any minion to target';
    }
  };

  return (
    <div className="targeting-prompt hero-power-targeting">
      <div className="targeting-prompt-title">
        ⚡ {targeting.powerName} ⚡
      </div>
      <div className="targeting-prompt-message">
        {getTargetingMessage()}
      </div>
      <button 
        className="targeting-cancel-btn"
        onClick={onCancel}
      >
        Cancel
      </button>
    </div>
  );
};
