/**
 * BattlefieldHero - Enhanced hero display component for the combat arena battlefield
 * 
 * Features:
 * - Hero portraits with elemental effects and particle systems
 * - Interactive hero power activation via portrait click
 * - Tooltips rendered via portal to escape overflow:hidden containers
 * - HP and Stamina bars with visual feedback
 * - Secret indicators with hover tooltips
 * - Weapon upgrade system display
 * 
 * @module combat/components/BattlefieldHero
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ALL_NORSE_HEROES } from '../../data/norseHeroes';
import { getElementColor, getElementIcon, ELEMENT_LABELS, ELEMENT_WEAKNESSES, ELEMENT_STRENGTHS, type ElementType } from '../../utils/elements';
import { NORSE_TO_GAME_ELEMENT, type NorseElement } from '../../types/NorseTypes';
import { assetPath } from '../../utils/assetPath';
import { resolveHeroPortrait, DEFAULT_PORTRAIT } from '../../utils/art/artMapping';
import '../styles/hero-reactions.css';
import '../styles/hp-bar.css';

/**
 * Props for the BattlefieldHero component
 */
export interface BattlefieldHeroProps {
  /** The pet/hero data object containing name, stats, and norseHeroId */
  pet: any;
  /** Amount of HP committed (risk) */
  hpCommitted: number;
  /** Poker position (SB/BB) */
  pokerPosition?: 'small_blind' | 'big_blind';
  /** Hero level */
  level: number;
  /** Click handler for the hero card */
  onClick?: () => void;
  /** Whether the hero is currently targetable */
  isTargetable?: boolean;
  /** Whether this is the opponent's hero */
  isOpponent?: boolean;
  /** Array of active secrets */
  secrets?: any[];
  /** Hero class for secret color styling */
  heroClass?: string;
  /** Element type for visual effects (fire, ice, etc.) */
  element?: string;
  /** Current mana available */
  mana?: number;
  /** Maximum mana capacity */
  maxMana?: number;
  /** Handler for hero power activation */
  onHeroPowerClick?: () => void;
  /** Handler for weapon upgrade activation */
  onWeaponUpgradeClick?: () => void;
  /** Whether the weapon has been upgraded */
  isWeaponUpgraded?: boolean;
  /** Equipped artifact card data (if any) */
  artifact?: { name: string; attack: number };
}

const getSecretColor = (heroClass: string) => {
  switch (heroClass) {
    case 'mage': return '#3b82f6';
    case 'hunter': return '#22c55e';
    case 'paladin': return '#eab308';
    case 'rogue': return '#94a3b8';
    default: return '#a855f7';
  }
};

const QUESTION_MARK_STYLE: React.CSSProperties = { color: 'white', fontWeight: 'bold', fontSize: '16px' };
const SECRET_COUNT_STYLE: React.CSSProperties = {
  position: 'absolute', bottom: '-4px', right: '-4px',
  backgroundColor: '#dc2626', color: 'white', fontSize: '10px',
  fontWeight: 'bold', width: '16px', height: '16px', borderRadius: '50%',
  display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid white'
};
const SECRET_HEADER_STYLE_BASE: React.CSSProperties = { fontWeight: 'bold', marginBottom: '4px' };
const SECRET_TEXT_STYLE: React.CSSProperties = { opacity: 0.8 };

/**
 * BattlefieldHero displays an enhanced hero card on the battlefield
 * with interactive hero powers, elemental effects, and detailed stats
 */
export const BattlefieldHero: React.FC<BattlefieldHeroProps> = React.memo(({
  pet, 
  hpCommitted,
  pokerPosition,
  level,
  onClick,
  isTargetable = false,
  isOpponent = false,
  secrets = [],
  heroClass = 'neutral',
  element: elementProp,
  mana = 0,
  maxMana = 10,
  onHeroPowerClick,
  onWeaponUpgradeClick,
  isWeaponUpgraded = false,
  artifact
}) => {
  const heroElement = useMemo(() => {
    if (elementProp) return elementProp;
    if (pet.norseHeroId && ALL_NORSE_HEROES[pet.norseHeroId]) {
      return ALL_NORSE_HEROES[pet.norseHeroId].element || 'neutral';
    }
    return 'neutral';
  }, [pet.norseHeroId, elementProp]);

  const portraitPaths = useMemo(() => {
    const localPath = assetPath(`/portraits/heroes/${pet.name.split(' ')[0].toLowerCase()}.png`);
    const cdnPath = pet.norseHeroId ? resolveHeroPortrait(pet.norseHeroId) : null;
    return { local: localPath, cdn: cdnPath };
  }, [pet.name, pet.norseHeroId]);

  const [resolvedPortrait, setResolvedPortrait] = useState(portraitPaths.local);

  useEffect(() => {
    let isActive = true;
    const tryLoad = (src: string, fallback: () => void) => {
      if (src.startsWith('data:')) {
        if (isActive) setResolvedPortrait(src);
        return;
      }
      const img = new Image();
      img.onload = () => {
        if (isActive) setResolvedPortrait(src);
      };
      img.onerror = () => {
        if (isActive) fallback();
      };
      img.src = src;
    };
    tryLoad(portraitPaths.local, () => {
      if (portraitPaths.cdn) {
        tryLoad(portraitPaths.cdn, () => {
          if (isActive) setResolvedPortrait(DEFAULT_PORTRAIT);
        });
      } else {
        if (isActive) setResolvedPortrait(DEFAULT_PORTRAIT);
      }
    });
    return () => {
      isActive = false;
    };
  }, [portraitPaths]);

  const portraitBgStyle = useMemo((): React.CSSProperties => ({
    backgroundImage: `url('${resolvedPortrait}')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center top',
    cursor: !isOpponent ? 'pointer' : 'default',
    pointerEvents: 'auto'
  }), [resolvedPortrait, isOpponent]);
  
  const currentHP = pet.stats.currentHealth;
  const maxHP = pet.stats.maxHealth;
  const effectiveHP = Math.max(0, currentHP - hpCommitted);
  const armor = pet.stats.armor || 0;
  const healthPercent = Math.max(0, (effectiveHP / maxHP) * 100);
  const currentSta = pet.stats.currentStamina;
  const maxSta = pet.stats.maxStamina;
  const staminaPercent = maxSta > 0 ? Math.max(0, (currentSta / maxSta) * 100) : 0;
  const [showSecretTooltip, setShowSecretTooltip] = useState(false);
  const [showHeroPowerTooltip, setShowHeroPowerTooltip] = useState(false);
  const [showMatchupTooltip, setShowMatchupTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const [matchupTooltipPos, setMatchupTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const [damageReaction, setDamageReaction] = useState<'damaged' | 'healed' | null>(null);
  const [powerActivating, setPowerActivating] = useState(false);
  const [armorGained, setArmorGained] = useState(false);
  const prevHealthRef = useRef(effectiveHP);
  const prevArmorRef = useRef(armor);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const portraitRef = useRef<HTMLDivElement>(null);
  const matchupBadgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prevHealthRef.current === effectiveHP) return;
    if (effectiveHP < prevHealthRef.current) {
      setDamageReaction('damaged');
    } else {
      setDamageReaction('healed');
    }
    prevHealthRef.current = effectiveHP;
    const timer = setTimeout(() => setDamageReaction(null), 600);
    return () => clearTimeout(timer);
  }, [effectiveHP]);

  useEffect(() => {
    if (armor > prevArmorRef.current) {
      setArmorGained(true);
      const timer = setTimeout(() => setArmorGained(false), 400);
      prevArmorRef.current = armor;
      return () => clearTimeout(timer);
    }
    prevArmorRef.current = armor;
    return undefined;
  }, [armor]);

  const elementClass = heroElement ? `element-${heroElement.toLowerCase()}` : '';
  
  const norseHero = pet.norseHeroId ? ALL_NORSE_HEROES[pet.norseHeroId] : null;
  const heroPower = norseHero?.heroPower;
  const weaponUpgrade = norseHero?.weaponUpgrade;

  const secretColor = getSecretColor(heroClass);

  const secretIndicatorStyle = useMemo((): React.CSSProperties => ({
    backgroundColor: secretColor,
    position: 'absolute',
    top: isOpponent ? 'auto' : '-12px',
    bottom: isOpponent ? '-12px' : 'auto',
    right: '50%', transform: 'translateX(50%)',
    width: '28px', height: '28px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '2px solid white',
    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
    cursor: 'help', zIndex: 10
  }), [secretColor, isOpponent]);

  const secretTooltipStyle = useMemo((): React.CSSProperties => ({
    position: 'absolute',
    top: isOpponent ? '100%' : 'auto',
    bottom: isOpponent ? 'auto' : '100%',
    left: '50%', transform: 'translateX(-50%)',
    backgroundColor: 'rgba(0,0,0,0.9)', color: 'white',
    padding: '8px 12px', borderRadius: '6px', fontSize: '12px',
    whiteSpace: 'nowrap', zIndex: 100,
    marginTop: isOpponent ? '8px' : '0',
    marginBottom: isOpponent ? '0' : '8px',
    border: `2px solid ${secretColor}`,
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
  }), [secretColor, isOpponent]);

  const secretHeaderStyle = useMemo((): React.CSSProperties => ({
    ...SECRET_HEADER_STYLE_BASE, color: secretColor
  }), [secretColor]);

  const elementMatchups = useMemo(() => {
    const norseEl = norseHero?.element as NorseElement | undefined;
    if (!norseEl) return null;
    const gameEl = NORSE_TO_GAME_ELEMENT[norseEl];
    if (!gameEl || gameEl === 'neutral') return null;
    const weakTo = ELEMENT_WEAKNESSES[gameEl] || [];
    const strongVs = ELEMENT_STRENGTHS[gameEl] || [];
    if (weakTo.length === 0 && strongVs.length === 0) return null;
    return { weakTo, strongVs };
  }, [norseHero?.element]);
  
  const WEAPON_COST = 5;
  const canAffordPower = heroPower ? mana >= heroPower.cost : false;
  const canAffordUpgrade = mana >= WEAPON_COST;
  const canUpgrade = canAffordUpgrade && !isOpponent && !isWeaponUpgraded;
  const isPowerDisabled = !canAffordPower || isOpponent;
  
  const handlePortraitClick = useCallback((e: React.MouseEvent) => {
    if (isOpponent) return;
    e.stopPropagation();

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      if (canUpgrade && onWeaponUpgradeClick) {
        onWeaponUpgradeClick();
      }
      return;
    }

    clickTimeoutRef.current = setTimeout(() => {
      clickTimeoutRef.current = null;
      if (onHeroPowerClick) {
        onHeroPowerClick();
        setPowerActivating(true);
        setTimeout(() => setPowerActivating(false), 500);
      }
    }, 300);
  }, [isOpponent, onHeroPowerClick, onWeaponUpgradeClick, canUpgrade]);
  
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);
  
  return (
    <div 
      className={`battlefield-hero-square ${isOpponent ? 'opponent' : 'player'} ${isTargetable ? 'targetable' : ''} ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
    >
      <div className={`hero-card-wrapper ${elementClass} premium-glow ${damageReaction ? `hero-${damageReaction}` : ''} ${healthPercent <= 20 ? 'hero-critical-hp' : healthPercent <= 40 ? 'hero-low-hp' : ''}`}>
        <div className={`hero-elemental-aura ${elementClass} premium-glow`} />
        
        <div className={`hero-card-frame ${elementClass} premium-glow`}>
          <div className={`hero-particles ${elementClass} premium-glow`}>
            <div className="particle particle-1" />
            <div className="particle particle-2" />
            <div className="particle particle-3" />
            <div className="particle particle-4" />
            <div className="particle particle-5" />
            <div className="particle particle-6" />
            <div className="particle particle-7" />
            <div className="particle particle-8" />
            <div className="particle particle-9" />
            <div className="particle particle-10" />
          </div>
          <div 
            ref={portraitRef}
            className={`hero-portrait hero-portrait-interactive ${!isOpponent && heroPower ? 'has-power' : ''} ${!isPowerDisabled ? 'power-ready' : ''} ${canUpgrade ? 'upgrade-ready' : ''} ${isWeaponUpgraded ? 'upgraded' : ''} ${powerActivating ? 'power-activating' : ''}`}
            style={portraitBgStyle}
            onClick={(e) => {
              handlePortraitClick(e);
            }}
            onMouseEnter={(e) => {
              e.stopPropagation();
              if (portraitRef.current) {
                const rect = portraitRef.current.getBoundingClientRect();
                setTooltipPosition({
                  top: isOpponent ? rect.bottom + 8 : rect.top - 8,
                  left: rect.left + rect.width / 2
                });
              }
              setShowHeroPowerTooltip(true);
            }}
            onMouseLeave={(e) => {
              e.stopPropagation();
              setShowHeroPowerTooltip(false);
              setTooltipPosition(null);
            }}
          >
            {!isOpponent && heroPower && (
              <div className={`portrait-power-badge ${canAffordPower ? 'affordable' : 'expensive'} ${isWeaponUpgraded ? 'upgraded' : ''}`}>
                <span className="power-cost">{heroPower.cost}</span>
                {isWeaponUpgraded && <span className="upgraded-icon">⚔</span>}
              </div>
            )}
            {artifact && (
              <div className="artifact-badge">
                Artifact {artifact.name.split(' ')[0]} {artifact.attack > 0 ? `+${artifact.attack}` : ''}
              </div>
            )}
          </div>
          
          {showHeroPowerTooltip && heroPower && tooltipPosition && createPortal(
            <div 
              className="hero-portrait-tooltip-portal"
              style={{
                position: 'fixed',
                top: tooltipPosition.top,
                left: tooltipPosition.left,
                transform: isOpponent ? 'translateX(-50%)' : 'translateX(-50%) translateY(-100%)',
                zIndex: 10000,
                pointerEvents: 'none',
                animation: 'tooltip-fade-in 0.15s ease-out'
              }}
            >
              <div className="portrait-tooltip-content">
                <div className="tooltip-power-header">
                  <span className="power-name">{heroPower.name}</span>
                  <span className="power-cost-display">{heroPower.cost} Mana</span>
                </div>
                <div className="tooltip-power-desc">{heroPower.description}</div>
                
                {weaponUpgrade && !isOpponent && (
                  <div className={`tooltip-upgrade-section ${canUpgrade ? 'can-upgrade' : ''} ${isWeaponUpgraded ? 'is-upgraded' : ''}`}>
                    <div className="upgrade-header">
                      {isWeaponUpgraded ? 'Weapon Upgraded' : `Weapon Upgrade: ${weaponUpgrade.name} (${WEAPON_COST} Mana)`}
                    </div>
                    <div className="upgrade-effect">
                      {isWeaponUpgraded 
                        ? `Upgraded effect active: ${weaponUpgrade.immediateEffect.description}`
                        : `Upgrade for: ${weaponUpgrade.immediateEffect.description}`}
                    </div>
                    {!isWeaponUpgraded && (
                      canUpgrade ? (
                        <div className="upgrade-hint">Double-click portrait to upgrade!</div>
                      ) : (
                        <div className="upgrade-hint disabled">Need {WEAPON_COST - mana} more mana to upgrade</div>
                      )
                    )}
                  </div>
                )}

                {!isOpponent && !isWeaponUpgraded && (
                  <div className="tooltip-power-hint">
                    {isPowerDisabled 
                      ? `Need ${heroPower.cost - mana} more mana` 
                      : 'Single-click to activate'}
                  </div>
                )}
              </div>
            </div>,
            document.body
          )}
          <div className="hero-name-plate">
            <span className="hero-name">{pet.name.split(' ')[0]}</span>
          </div>

          {elementMatchups && (
            <div
              ref={matchupBadgeRef}
              className="hero-matchup-badge"
              onMouseEnter={() => {
                if (matchupBadgeRef.current) {
                  const rect = matchupBadgeRef.current.getBoundingClientRect();
                  setMatchupTooltipPos({
                    top: isOpponent ? rect.bottom + 6 : rect.top - 6,
                    left: rect.left + rect.width / 2,
                  });
                }
                setShowMatchupTooltip(true);
              }}
              onMouseLeave={() => {
                setShowMatchupTooltip(false);
                setMatchupTooltipPos(null);
              }}
            >
              <span className="matchup-arrow matchup-arrow-weak">▼</span>
              {elementMatchups.weakTo.map(el => (
                <span key={el} className="matchup-el-icon matchup-el-weak">
                  {getElementIcon(el)}
                </span>
              ))}
              <span className="matchup-sep" />
              <span className="matchup-arrow matchup-arrow-strong">▲</span>
              {elementMatchups.strongVs.map(el => (
                <span key={el} className="matchup-el-icon matchup-el-strong">
                  {getElementIcon(el)}
                </span>
              ))}
            </div>
          )}

          {showMatchupTooltip && elementMatchups && matchupTooltipPos && createPortal(
            <div
              className="matchup-tooltip-portal"
              style={{
                position: 'fixed',
                top: matchupTooltipPos.top,
                left: matchupTooltipPos.left,
                transform: isOpponent ? 'translateX(-50%)' : 'translateX(-50%) translateY(-100%)',
                zIndex: 10000,
                pointerEvents: 'none',
                animation: 'tooltip-fade-in 0.15s ease-out',
              }}
            >
              <div className="matchup-tooltip-content">
                <div className="matchup-tooltip-row matchup-tooltip-weak">
                  <span className="matchup-tooltip-label">▼ Weak vs</span>
                  <span className="matchup-tooltip-elements">
                    {elementMatchups.weakTo.map(el => (
                      <span key={el} className="matchup-tooltip-el" style={{ '--el-color': getElementColor(el) } as React.CSSProperties}>
                        {getElementIcon(el)} {ELEMENT_LABELS[el]}
                      </span>
                    ))}
                  </span>
                </div>
                <div className="matchup-tooltip-row matchup-tooltip-strong">
                  <span className="matchup-tooltip-label">▲ Strong vs</span>
                  <span className="matchup-tooltip-elements">
                    {elementMatchups.strongVs.map(el => (
                      <span key={el} className="matchup-tooltip-el" style={{ '--el-color': getElementColor(el) } as React.CSSProperties}>
                        {getElementIcon(el)} {ELEMENT_LABELS[el]}
                      </span>
                    ))}
                  </span>
                </div>
              </div>
            </div>,
            document.body
          )}
        
          <div className={`fighting-hp-bar-container${isOpponent ? ' opponent' : ''}`}>
            <div className="fighting-hp-bar">
              <div className="fighting-hp-damage" />
              <div className="fighting-hp-fill" style={{ transform: `scaleX(${healthPercent / 100})` }} />
              <span className="fighting-hp-text">{Math.round(effectiveHP)}/{Math.round(maxHP)}</span>
            </div>
          </div>
        
          <div className="hero-stat-bar sta-bar">
            <div className="stat-bar-fill sta-fill" style={{ transform: `scaleX(${staminaPercent / 100})` }} />
            <span className="stat-bar-text">⚡{currentSta}/{maxSta}</span>
          </div>
        
          {armor > 0 && (
            <div className={`hero-armor-badge${armorGained ? ' armor-gained' : ''}`} title={`Armor: ${armor} - Absorbs damage before HP`}>
              <svg className="armor-shield-icon" viewBox="0 0 36 40" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id={`armorGrad-${isOpponent ? 'opp' : 'plr'}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#b8b8b8" />
                    <stop offset="30%" stopColor="#8a8a8a" />
                    <stop offset="60%" stopColor="#a0a0a0" />
                    <stop offset="100%" stopColor="#6b6b6b" />
                  </linearGradient>
                  <linearGradient id={`armorHighlight-${isOpponent ? 'opp' : 'plr'}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                  </linearGradient>
                </defs>
                <path 
                  d="M18 2 L4 10 L4 22 Q4 34 18 38 Q32 34 32 22 L32 10 Z" 
                  fill={`url(#armorGrad-${isOpponent ? 'opp' : 'plr'})`}
                  stroke="#4a4a4a"
                  strokeWidth="2"
                />
                <path 
                  d="M18 4 L6 11 L6 22 Q6 32 18 36 Q30 32 30 22 L30 11 Z" 
                  fill={`url(#armorHighlight-${isOpponent ? 'opp' : 'plr'})`}
                  opacity="0.3"
                />
                <path 
                  d="M18 6 L8 12 L8 14 L18 8 L28 14 L28 12 Z" 
                  fill="rgba(255,255,255,0.15)"
                />
              </svg>
              <span className="armor-value">{armor}</span>
            </div>
          )}
        
          {secrets && secrets.length > 0 && (
            <div
              className="hero-secret-indicator"
              onMouseEnter={() => setShowSecretTooltip(true)}
              onMouseLeave={() => setShowSecretTooltip(false)}
              style={secretIndicatorStyle}
            >
              <span style={QUESTION_MARK_STYLE}>?</span>
              {secrets.length > 1 && (
                <span style={SECRET_COUNT_STYLE}>
                  {secrets.length}
                </span>
              )}
            </div>
          )}
        
          {showSecretTooltip && secrets && secrets.length > 0 && (
            <div className="secret-tooltip" style={secretTooltipStyle}>
              <div style={secretHeaderStyle}>
                Rune Active
              </div>
              <div style={SECRET_TEXT_STYLE}>
                {secrets.length === 1 ? '1 rune in play' : `${secrets.length} runes in play`}
              </div>
            </div>
          )}
        </div>

        {/* Risk chip — shows committed HP as poker chip badge */}
        {hpCommitted > 0 && (
          <div className={`hero-risk-chip ${isOpponent ? 'opponent' : 'player'}`}>
            <span className="risk-chip-amount">{hpCommitted}</span>
            <span className="risk-chip-unit">HP</span>
          </div>
        )}

        {/* Dealer button — gold Norse coin on the small blind (button) player */}
        {pokerPosition === 'small_blind' && (
          <div className={`dealer-button ${isOpponent ? 'opponent' : 'player'}`} title="Dealer">
            <svg viewBox="0 0 32 32" className="dealer-coin">
              <defs>
                <linearGradient id="coinGold" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ffe680" />
                  <stop offset="40%" stopColor="#d4a017" />
                  <stop offset="100%" stopColor="#8b6508" />
                </linearGradient>
              </defs>
              <circle cx="16" cy="16" r="14" fill="url(#coinGold)" stroke="#8b6508" strokeWidth="1.5" />
              <circle cx="16" cy="16" r="11" fill="none" stroke="rgba(255,230,128,0.5)" strokeWidth="0.8" />
              <text x="16" y="20" textAnchor="middle" fontSize="12" fontWeight="900" fill="#5c3d0a" fontFamily="Cinzel, serif">D</text>
            </svg>
          </div>
        )}
      </div>
    </div>
  );
});

export default BattlefieldHero;
