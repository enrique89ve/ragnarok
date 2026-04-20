import React from 'react';
import '../styles/targeting-prompts.css';

export interface TargetingPromptProps {
  card: {
    card: {
      name: string;
      type: string;
      battlecry?: { targetType?: string };
      spellEffect?: { targetType?: string };
    }
  } | null;
  onCancel?: () => void;
}

export const TargetingPrompt: React.FC<TargetingPromptProps> = ({ card, onCancel }) => {
  if (!card) return null;

  const getTargetingMessage = () => {
    const targetType = (card.card as any).battlecry?.targetType || (card.card as any).spellEffect?.targetType;
    if (targetType === 'friendly_minion' || targetType === 'friendly_mech') {
      return `Click a friendly minion — ${card.card.name}`;
    } else if (targetType === 'friendly_hero') {
      return `Click your hero — ${card.card.name}`;
    } else if (targetType === 'any_minion' || targetType === 'any' || targetType === 'minion') {
      return `Click any minion (friendly or enemy) — ${card.card.name}`;
    } else if (targetType === 'enemy_minion' || targetType === 'enemy') {
      return `Click an enemy minion — ${card.card.name}`;
    } else if (targetType === 'enemy_hero' || targetType === 'hero') {
      return `Click the enemy hero — ${card.card.name}`;
    } else if (targetType === 'any_character' || targetType === 'character') {
      return `Click any minion or hero — ${card.card.name}`;
    }
    return `Click an enemy minion or hero — ${card.card.name}`;
  };

  return (
    <div className="targeting-prompt">
      <div className="targeting-prompt-title">
        {card.card.type === 'spell' ? 'Spell Targeting' : 'Select Target'}
      </div>
      <div className="targeting-prompt-message">
        {getTargetingMessage()}
      </div>
      {onCancel && (
        <button type="button" className="targeting-cancel-btn" onClick={onCancel}>
          Cancel
        </button>
      )}
      <div className="targeting-prompt-hint">
        Right-click or ESC to cancel
      </div>
    </div>
  );
};
