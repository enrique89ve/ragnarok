import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ALL_NORSE_HEROES, getHeroClass } from '../../data/norseHeroes';
import { getClassAttackIcon } from '../../assets/classAttackIcons';
import './HeroPowerButton.css';

interface HeroPowerButtonProps {
  norseHeroId?: string;
  mana: number;
  maxMana: number;
  isOpponent?: boolean;
  isWeaponUpgraded?: boolean;
  onHeroPowerClick?: () => void;
  onWeaponUpgradeClick?: () => void;
}

export const HeroPowerButton: React.FC<HeroPowerButtonProps> = ({
  norseHeroId,
  mana,
  maxMana,
  isOpponent = false,
  isWeaponUpgraded = false,
  onHeroPowerClick,
  onWeaponUpgradeClick
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipCoords, setTooltipCoords] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLDivElement>(null);

  const norseHero = norseHeroId ? ALL_NORSE_HEROES[norseHeroId] : null;
  const heroPower = norseHero?.heroPower;
  const weaponUpgrade = norseHero?.weaponUpgrade;
  // Use smart class detection from hero ID mapping
  const heroClass = norseHeroId ? getHeroClass(norseHeroId) : 'neutral';
  const classIcon = getClassAttackIcon(heroClass);

  const WEAPON_COST = 5;
  const canAffordPower = heroPower ? mana >= heroPower.cost : false;
  const canAffordUpgrade = mana >= WEAPON_COST;
  const canUpgrade = canAffordUpgrade && !isOpponent && !isWeaponUpgraded;
  const isPowerDisabled = !canAffordPower || isOpponent;
  const showUpgradeGlow = canUpgrade;

  const updateTooltipPosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setTooltipCoords({
      x: rect.left + rect.width / 2,
      y: isOpponent ? rect.bottom + 8 : rect.top - 8
    });
  }, [isOpponent]);

  useEffect(() => {
    if (showTooltip) {
      updateTooltipPosition();
      window.addEventListener('scroll', updateTooltipPosition, true);
      return () => window.removeEventListener('scroll', updateTooltipPosition, true);
    }
    return undefined;
  }, [showTooltip, updateTooltipPosition]);

  if (!heroPower) {
    return null;
  }

  const handlePowerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isPowerDisabled && onHeroPowerClick) {
      onHeroPowerClick();
    }
  };

  const handleUpgradeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (canUpgrade && onWeaponUpgradeClick) {
      onWeaponUpgradeClick();
      setShowTooltip(false);
    }
  };

  const tooltipContent = showTooltip && createPortal(
    <div
      className={`hero-power-portal-tooltip ${isOpponent ? 'below' : 'above'}`}
      style={{
        left: tooltipCoords.x,
        top: tooltipCoords.y,
        transform: isOpponent ? 'translateX(-50%)' : 'translate(-50%, -100%)'
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="hero-power-portal-tooltip-content">
        <div className="tooltip-section tooltip-section--power">
          <div className="tooltip-header">
            <span className="tooltip-name">{heroPower.name}</span>
            <span className="tooltip-cost">{heroPower.cost} Mana</span>
          </div>
          <div className="tooltip-description">{heroPower.description}</div>
          <div className="tooltip-meta">Target: {heroPower.targetType.replace(/_/g, ' ')}</div>
        </div>

        {weaponUpgrade && (
          <div className="tooltip-section tooltip-section--upgrade">
            <div className={`tooltip-upgrade-header ${isWeaponUpgraded ? 'upgraded' : 'available'}`}>
              <span>{isWeaponUpgraded ? 'Upgraded' : 'Upgrade Available'}</span>
              {!isWeaponUpgraded && (
                <span className={`tooltip-upgrade-cost ${!canAffordUpgrade ? 'disabled' : ''}`}>
                  {WEAPON_COST} Mana
                </span>
              )}
            </div>

            {!isWeaponUpgraded && (
              <>
                <div className="tooltip-upgrade-effect">
                  {weaponUpgrade.immediateEffect.description}
                </div>
                <div className="tooltip-upgrade-note">
                  Permanently upgrades Hero Power for this match
                </div>
                <button
                  className="tooltip-upgrade-button"
                  onClick={handleUpgradeClick}
                  disabled={!canUpgrade}
                >
                  {canUpgrade
                    ? `Upgrade Now (${WEAPON_COST} Mana)`
                    : `Need ${WEAPON_COST - mana} more mana`}
                </button>
              </>
            )}

            {isWeaponUpgraded && (
              <div className="tooltip-upgraded-text">
                Hero Power has been permanently enhanced!
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );

  return (
    <div 
      className={`hero-power-wrapper ${isOpponent ? 'opponent' : 'player'} hero-power-anchor`}
      style={{ isolation: 'isolate', zIndex: 10001 }}
    >
      <div
        ref={buttonRef}
        className={`hero-power-btn ${isPowerDisabled ? 'disabled' : ''} ${isOpponent ? 'opponent' : 'player'} ${showUpgradeGlow ? 'upgrade-available' : ''} ${isWeaponUpgraded ? 'upgraded' : ''}`}
        onClick={handlePowerClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        style={{ pointerEvents: 'auto', zIndex: 10002 }}
      >
        <div className="hero-power-btn-cost">
          <span className="cost-value">{heroPower.cost}</span>
        </div>
        <div className="hero-power-btn-icon">
          {classIcon ? (
            <img
              src={classIcon}
              alt={`${heroClass} power`}
              className="class-attack-icon"
              loading="lazy"
            />
          ) : (
            <span className="icon-symbol">{isWeaponUpgraded ? '⚔' : '⚡'}</span>
          )}
        </div>

        {isWeaponUpgraded && (
          <div className="hero-power-btn-badge">✓</div>
        )}
      </div>

      {/* Sleek Dedicated Upgrade Button - Pops out when affordable */}
      {canUpgrade && !isOpponent && (
        <button 
          className="hero-power-upgrade-button-sleek"
          onClick={handleUpgradeClick}
          title={`Upgrade Hero Power (5 Mana)`}
          style={{ pointerEvents: 'auto', zIndex: 10001 }}
        >
          <div className="upgrade-icon">⚔</div>
          <div className="upgrade-cost">5</div>
        </button>
      )}

      {tooltipContent}
    </div>
  );
};

export default HeroPowerButton;
