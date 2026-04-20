/**
 * HeroBridge - Compact hero display bridge component for combat arena
 * 
 * A more compact hero card display showing name, level, HP bar with
 * committed HP visualization, and stamina. Used as a bridge/connector
 * element in the combat UI.
 * 
 * @module combat/components/HeroBridge
 */

import React from 'react';

/**
 * Props for the HeroBridge component
 */
export interface HeroBridgeProps {
  /** The pet/hero data object containing name and stats */
  pet: any;
  /** Amount of HP committed (risk) */
  hpCommitted: number;
  /** Hero level */
  level: number;
  /** Click handler for the bridge */
  onClick?: () => void;
  /** Whether the hero is currently targetable */
  isTargetable?: boolean;
}

/**
 * HeroBridge displays a compact hero card with HP and stamina bars
 * Used as a bridge element connecting different UI sections in combat
 */
export const HeroBridge: React.FC<HeroBridgeProps> = ({ 
  pet, 
  hpCommitted, 
  level, 
  onClick, 
  isTargetable = false 
}) => {
  const currentHP = pet.stats.currentHealth;
  const maxHP = pet.stats.maxHealth;
  const effectiveHP = Math.max(0, currentHP - hpCommitted);
  const healthPercent = Math.max(0, (effectiveHP / maxHP) * 100);
  const committedPercent = Math.min(100, Math.max(0, (hpCommitted / maxHP) * 100));

  return (
    <div 
      className={`hero-bridge ${isTargetable ? 'targetable' : ''} ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
    >
      <div className="hero-bridge-card">
        <div className="hero-bridge-header">
          <span className="hero-bridge-title">HERO</span>
          <span className="hero-bridge-level">Lv.{level}</span>
        </div>
        
        <div className="hero-bridge-avatar">
          <span className="hero-bridge-letter">{pet.name.charAt(0)}</span>
        </div>
        
        <div className="hero-bridge-name">{pet.name}</div>
        
        <div className="hero-bridge-stats">
          <div className="hero-bridge-hp">
            <div className="hero-hp-bar">
              <div className="hero-hp-committed" style={{ transform: `scaleX(${committedPercent / 100})` }} />
              <div className="hero-hp-fill" style={{ transform: `scaleX(${healthPercent / 100})` }} />
            </div>
            <span className="hero-hp-text">{effectiveHP}/{maxHP} HP</span>
          </div>
          
          <div className="hero-bridge-stamina">
            <span className="stamina-icon">⚡</span>
            <span className="stamina-value">{pet.stats.currentStamina}/{pet.stats.maxStamina}</span>
          </div>
          
          {hpCommitted > 0 && (
            <div className="hero-bridge-risk">
              <span className="risk-label">Risk:</span>
              <span className="risk-value">{hpCommitted} HP</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeroBridge;
