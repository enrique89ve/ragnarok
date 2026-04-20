/**
 * SimpleCard.tsx
 *
 * A clean, elegant 2D card component.
 * No 3D effects, no complex transforms - just clear, readable cards.
 * Uses simple color-based backgrounds with rarity styling.
 * Keyword badges show small ability tooltips on hover.
 */

import React, { useMemo, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useInView } from 'react-intersection-observer';
import { KEYWORD_DEFINITIONS } from './ui/UnifiedCardTooltip';
import { KEYWORD_ICON_MAP } from './ui/CardIconsSVG';
import { getCardArtPath } from '../utils/art/artMapping';
import { useHoloTracking, getHoloTier } from '../hooks/useHoloTracking';
import './SimpleCard.css';
import './styles/holoEffect.css';

export interface SimpleCardData {
  id: number | string;
  name: string;
  manaCost: number;
  attack?: number;
  health?: number;
  description?: string;
  type: 'minion' | 'spell' | 'weapon' | 'artifact' | 'armor';
  rarity?: 'basic' | 'common' | 'rare' | 'epic' | 'mythic';
  tribe?: string;
  cardClass?: string;
  keywords?: string[];
  evolutionLevel?: 1 | 2 | 3;
  element?: string;
  petStage?: string;
  petFamily?: string;
  evolvesFrom?: number;
  evolvesFromName?: string;
  evolutionCondition?: { trigger: string; description: string };
  hasStage3Variants?: boolean;
  bloodPrice?: number;
  chainPartner?: number;
  einpieces?: number;
}

interface SimpleCardProps {
  card: SimpleCardData;
  isPlayable?: boolean;
  isHighlighted?: boolean;
  onClick?: () => void;
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
  size?: 'small' | 'medium' | 'large' | 'preview';
  showDescription?: boolean;
  className?: string;
  style?: React.CSSProperties;
  attackBuff?: number;
  healthBuff?: number;
  owned?: boolean;
}

const ICE_RE = /\b(ymir|buri|niflheim|frost|ice|snow|skadi|jotun|glacier|blizzard|frozen|winter|cold)\b/i;
const FIRE_RE = /\b(surtr|muspel|fire|flame|ember|inferno|burn|ash|volcanic|magma|lava|pyre)\b/i;
const ELECTRIC_RE = /\b(thor|thunder|lightning|storm|spark|tempest|volt)\b/i;
const SHADOW_RE = /\b(hel|helheim|shadow|dark|death|draugr|void|abyss|niflung|undead)\b/i;
const WATER_RE = /\b(aegir|njord|ocean|sea|tide|wave|aqua|rain|river|lake|flood)\b/i;
const GRASS_RE = /\b(idunn|yggdrasil|vine|leaf|root|bloom|grove|forest|nature|verdant)\b/i;
const LIGHT_RE = /\b(baldur|heimdall|sol|dawn|radiant|holy|divine|celestial|sun|bright)\b/i;

const getCardTheme = (name: string, element?: string): string | null => {
  if (element === 'ice' || element === 'water') return element;
  if (element === 'fire') return 'fire';
  if (element === 'electric') return 'electric';
  if (element === 'dark') return 'shadow';
  if (element === 'grass') return 'grass';
  if (element === 'light') return 'light';
  if (ICE_RE.test(name)) return 'ice';
  if (FIRE_RE.test(name)) return 'fire';
  if (ELECTRIC_RE.test(name)) return 'electric';
  if (SHADOW_RE.test(name)) return 'shadow';
  if (WATER_RE.test(name)) return 'water';
  if (GRASS_RE.test(name)) return 'grass';
  if (LIGHT_RE.test(name)) return 'light';
  return null;
};

const getRarityClass = (rarity?: string): string => {
  switch (rarity) {
    case 'mythic': return 'rarity-mythic';
    case 'epic': return 'rarity-epic';
    case 'rare': return 'rarity-rare';
    default: return 'rarity-common';
  }
};

const getCardTypeIcon = (type: string): string => {
  switch (type) {
    case 'spell': return '✨';
    case 'weapon': return '⚔️';
    case 'artifact': return '🔱';
    case 'armor': return '🛡️';
    default: return '👤';
  }
};

const ELEMENT_BADGE: Record<string, { icon: string; color: string }> = {
  fire: { icon: '\u{1F525}', color: '#ff6b35' },
  water: { icon: '\u{1F4A7}', color: '#4fc3f7' },
  grass: { icon: '\u{1F33F}', color: '#66bb6a' },
  electric: { icon: '\u{26A1}', color: '#fdd835' },
  light: { icon: '\u{2728}', color: '#ffd54f' },
  dark: { icon: '\u{1F311}', color: '#9c27b0' },
  ice: { icon: '\u{2744}\u{FE0F}', color: '#81d4fa' }
};

const getClassColor = (cardClass?: string): string => {
  const colors: Record<string, string> = {
    warrior: '#C79C6E',
    mage: '#69CCF0',
    hunter: '#ABD473',
    paladin: '#F58CBA',
    priest: '#FFFFFF',
    rogue: '#FFF569',
    shaman: '#0070DE',
    warlock: '#9482C9',
    druid: '#FF7D0A',
    berserker: '#A330C9',
    deathknight: '#C41F3B'
  };
  return colors[cardClass?.toLowerCase() || ''] || '#4a5568';
};

/**
 * Extract keyword icons from card - uses centralized KEYWORD_DEFINITIONS
 * Checks both explicit keywords array and description text
 */
const getCardKeywordIcons = (description?: string, keywords?: string[]): { icon: string; color: string; keyword: string; SvgIcon?: React.FC<React.SVGProps<SVGSVGElement>> }[] => {
  const icons: { icon: string; color: string; keyword: string; SvgIcon?: React.FC<React.SVGProps<SVGSVGElement>> }[] = [];
  const addedKeywords = new Set<string>();

  if (keywords && keywords.length > 0) {
    for (const keyword of keywords) {
      const key = keyword.toLowerCase();
      const def = KEYWORD_DEFINITIONS[key];
      if (def && !addedKeywords.has(key)) {
        icons.push({ icon: def.icon, color: def.color, keyword: key, SvgIcon: KEYWORD_ICON_MAP[key] || def.SvgIcon });
        addedKeywords.add(key);
      }
    }
  }

  if (description) {
    const desc = description.toLowerCase();
    for (const [keyword, def] of Object.entries(KEYWORD_DEFINITIONS)) {
      if (desc.includes(keyword) && !addedKeywords.has(keyword)) {
        icons.push({ icon: def.icon, color: def.color, keyword, SvgIcon: KEYWORD_ICON_MAP[keyword] || def.SvgIcon });
        addedKeywords.add(keyword);
      }
    }
  }

  return icons.slice(0, 4);
};

/**
 * Extract the specific effect text for a keyword from a card description.
 * e.g. "Battlecry: Equip a random weapon" → "Equip a random weapon"
 */
const extractKeywordEffect = (keyword: string, description: string): string | null => {
  const lower = description.toLowerCase();
  const idx = lower.indexOf(keyword.toLowerCase());
  if (idx === -1) return description;

  let start = idx + keyword.length;
  if (description[start] === ':') start++;
  while (start < description.length && description[start] === ' ') start++;

  let end = description.indexOf('.', start);
  if (end === -1) end = description.length;

  const effect = description.slice(start, end).trim();
  return effect || null;
};

interface BadgeTooltipState {
  keyword: string;
  icon: string;
  color: string;
  x: number;
  y: number;
  isEvolveInfo?: boolean;
}

const EMPTY_STYLE: React.CSSProperties = {};

export const SimpleCard: React.FC<SimpleCardProps> = React.memo(({
  card,
  isPlayable = true,
  isHighlighted = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
  size = 'medium',
  showDescription = false,
  className = '',
  style = EMPTY_STYLE,
  attackBuff = 0,
  healthBuff = 0,
  owned = true,
}) => {
  const isMinion = card.type === 'minion';
  const isSpell = card.type === 'spell';
  const isWeapon = card.type === 'weapon';
  const isArtifact = card.type === 'artifact';
  const isArmor = card.type === 'armor';

  const classColor = getClassColor(card.cardClass);
  const artPath = getCardArtPath(card.name, card.id);
  const cardTheme = useMemo(() => getCardTheme(card.name, card.element), [card.name, card.element]);

  const nameClass = card.name.length > 24 ? 'name-extreme' : card.name.length > 18 ? 'name-very-long' : card.name.length > 13 ? 'name-long' : '';

  const cardTypeClass = isSpell ? 'card-type-spell' : isWeapon ? 'card-type-weapon' : isArtifact ? 'card-type-artifact' : isArmor ? 'card-type-armor' : 'card-type-minion';

  const evolutionClass = card.evolutionLevel === 1 ? 'evolution-mortal'
    : card.evolutionLevel === 2 ? 'evolution-ascended'
    : card.evolutionLevel === 3 ? 'evolution-divine' : '';

  const evolutionStars = card.evolutionLevel ? '★'.repeat(card.evolutionLevel) : '';

  const { ref: artRef, inView: artInView } = useInView({ triggerOnce: true, rootMargin: '200px' });

  const holoTier = useMemo(() => getHoloTier(card.rarity), [card.rarity]);

  const cardRef = useRef<HTMLDivElement>(null);
  const holo = useHoloTracking(cardRef);

  const handleHoloLeave = useCallback((e: React.MouseEvent) => {
    holo.onMouseLeave(e);
    onMouseLeave?.(e);
  }, [holo, onMouseLeave]);

  const [badgeTooltip, setBadgeTooltip] = useState<BadgeTooltipState | null>(null);

  // Touch long-press: show card details after 500ms hold (mobile support)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    longPressTimerRef.current = setTimeout(() => {
      // Trigger the same hover event for tooltip display
      const touch = e.touches[0];
      if (touch && onMouseEnter) {
        onMouseEnter({ clientX: touch.clientX, clientY: touch.clientY } as unknown as React.MouseEvent);
      }
    }, 500);
  }, [onMouseEnter]);
  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleBadgeEnter = useCallback((e: React.MouseEvent, effect: { icon: string; color: string; keyword: string }) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setBadgeTooltip({
      keyword: effect.keyword,
      icon: effect.icon,
      color: effect.color,
      x: rect.left + rect.width / 2,
      y: rect.top
    });
  }, []);

  const handleBadgeLeave = useCallback(() => {
    setBadgeTooltip(null);
  }, []);

  const isEvolvePet = card.petStage === 'adept' || card.petStage === 'master';

  const evolveTooltipText = useMemo(() => {
    if (!badgeTooltip?.isEvolveInfo) return null;
    const lines: string[] = [];
    if (card.petStage === 'adept' && card.evolvesFromName) {
      lines.push(`Requires ${card.evolvesFromName} on battlefield`);
    } else if (card.petStage === 'master' && card.petFamily) {
      const familyName = card.petFamily.charAt(0).toUpperCase() + card.petFamily.slice(1);
      lines.push(`Requires any ${familyName} adept on battlefield`);
    }
    if (card.evolutionCondition) {
      lines.push(`Trigger: ${card.evolutionCondition.description}`);
    }
    return lines.join('\n');
  }, [badgeTooltip, card.petStage, card.evolvesFromName, card.petFamily, card.evolutionCondition]);

  const tooltipEffectText = useMemo(() => {
    if (!badgeTooltip || badgeTooltip.isEvolveInfo || !card.description) return null;
    return extractKeywordEffect(badgeTooltip.keyword, card.description);
  }, [badgeTooltip, card.description]);

  const handleEvolveEnter = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setBadgeTooltip({
      keyword: card.petStage === 'master' ? 'Master Evolution' : 'Evolution',
      icon: '\u{1F504}',
      color: '#00e5ff',
      x: rect.left + rect.width / 2,
      y: rect.top,
      isEvolveInfo: true,
    });
  }, [card.petStage]);

  const descriptionContent = useMemo(() => {
    const effectIcons = getCardKeywordIcons(card.description, card.keywords);
    const hasContent = card.description || effectIcons.length > 0 || isEvolvePet;
    if (!hasContent) return null;
    const isSpellOrWeapon = card.type === 'spell' || card.type === 'weapon';
    const noIcons = effectIcons.length === 0 && !isEvolvePet;
    return (
      <div className="card-description">
        {showDescription || (isSpellOrWeapon && noIcons) ? (
          <span>{card.description}</span>
        ) : (
          (effectIcons.length > 0 || isEvolvePet) ? (
            <div className="keyword-icons-container">
              {isEvolvePet && (
                <div
                  className="keyword-icon-badge evolve-info-badge"
                  onMouseEnter={handleEvolveEnter}
                  onMouseLeave={handleBadgeLeave}
                >
                  {card.petStage === 'master' ? '\u{2B50}' : '\u{1F504}'}
                </div>
              )}
              {effectIcons.map((effect, idx) => (
                <div
                  key={idx}
                  className="keyword-icon-badge"
                  style={{ '--badge-color': effect.color } as React.CSSProperties}
                  data-keyword={effect.keyword}
                  onMouseEnter={(e) => handleBadgeEnter(e, effect)}
                  onMouseLeave={handleBadgeLeave}
                >
                  {effect.SvgIcon ? <effect.SvgIcon style={{ color: effect.color }} /> : effect.icon}
                </div>
              ))}
            </div>
          ) : null
        )}
      </div>
    );
  }, [card.description, card.keywords, card.type, card.petStage, showDescription, isEvolvePet, handleBadgeEnter, handleBadgeLeave, handleEvolveEnter]);

  const tooltipStyle = useMemo<React.CSSProperties>(() => {
    if (!badgeTooltip) return {};
    const margin = 12;
    const tooltipWidth = 200;
    let left = badgeTooltip.x;
    let top = badgeTooltip.y - margin;

    left = Math.max(margin, Math.min(left, window.innerWidth - tooltipWidth / 2 - margin));
    top = Math.max(margin + 60, top);

    return {
      left: `${left}px`,
      top: `${top}px`,
    };
  }, [badgeTooltip]);

  return (
    <div
      className={`simple-card ${size} ${getRarityClass(card.rarity)} ${cardTypeClass} ${evolutionClass} ${isPlayable ? 'playable' : 'not-playable'} ${isHighlighted ? 'highlighted' : ''} ${cardTheme ? `element-holo-${cardTheme}` : ''} ${holoTier || ''} ${card.petStage === 'master' && card.element && !card.hasStage3Variants ? 'stage3-evolved' : ''} ${className}`}
      role="button"
      aria-label={`${card.name}, ${card.manaCost} mana ${card.type}${card.attack !== undefined ? `, ${card.attack} attack` : ''}${card.health !== undefined ? `, ${card.health} health` : ''}`}
      tabIndex={0}
      ref={cardRef}
      onClick={onClick}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && onClick) { e.preventDefault(); onClick(); } }}
      onMouseMove={holo.onMouseMove}
      onMouseEnter={onMouseEnter}
      onMouseLeave={handleHoloLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={style}
      data-card-id={card.id}
      data-rarity={card.rarity}
      data-card-type={card.type}
      data-evolution-level={card.evolutionLevel}
    >
      <div className={`card-mana stat-emblem ${card.bloodPrice ? 'blood-price-mana' : ''}`}>
        <svg className="stat-emblem-bg mana-emblem-bg" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <polygon points="20,2 38,20 20,38 2,20" fill={card.bloodPrice ? 'url(#mana-blood)' : 'url(#mana-emblem)'} stroke={card.bloodPrice ? '#fca5a5' : '#93C5FD'} strokeWidth="1.5" />
          <polygon points="20,9 31,20 20,31 9,20" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.7" />
          <defs>
            <linearGradient id="mana-emblem" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="40%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#1E3A8A" />
            </linearGradient>
            <linearGradient id="mana-blood" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="40%" stopColor="#b91c1c" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>
          </defs>
        </svg>
        <span className="mana-value">{card.manaCost}</span>
      </div>

      {card.bloodPrice && (
        <div className="blood-price-badge" title={`Blood Price: Pay ${card.bloodPrice} HP instead of mana`}>
          <span className="blood-price-value">{card.bloodPrice}</span>
        </div>
      )}

      {evolutionStars && (
        <div className="evolution-stars">{evolutionStars}</div>
      )}

      {card.element && ELEMENT_BADGE[card.element] && (
        <div className="element-badge">
          {ELEMENT_BADGE[card.element].icon}
        </div>
      )}

      {card.petStage && (
        <div className={`pet-stage-badge stage-${card.petStage === 'basic' ? '1' : card.petStage === 'adept' ? '2' : '3'}`}>
          {card.petStage === 'basic' ? 'I' : card.petStage === 'adept' ? 'II' : 'III'}
        </div>
      )}

      <div
        ref={artRef}
        className={`card-art-container${!owned ? ' art-locked' : ''}`}
        style={artPath && owned ? undefined : { background: `linear-gradient(135deg, ${classColor}40 0%, ${classColor}20 100%)` }}
      >
        {artPath && artInView && owned ? (
          <img src={artPath} alt="" className="card-art-image" draggable={false} loading="lazy" decoding="async" width={256} height={256} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : !owned ? (
          <div className="card-art-locked">
            <span className="lock-icon">🔒</span>
            <span className="lock-text">Not Owned</span>
          </div>
        ) : !artPath ? (
          <div className="card-art-icon">
            <span>{getCardTypeIcon(card.type)}</span>
          </div>
        ) : null}
      </div>

      <div className="card-name-banner">
        <span className={`card-name ${nameClass}`}>{card.name}</span>
        {card.rarity && card.rarity !== 'basic' && card.rarity !== 'common' && (
          <span className={`rarity-gem rarity-gem-${card.rarity}`} />
        )}
      </div>

      {card.tribe && (
        <div className="card-tribe-line">
          <span className="tribe-text">{card.tribe}</span>
        </div>
      )}

      {descriptionContent}

      {(isMinion || isWeapon || isArtifact) && (
        <>
          <div className="card-attack stat-emblem">
            <svg className="stat-emblem-bg" viewBox="0 0 40 44" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 0L36 10V30L20 44L4 30V10L20 0Z" fill="url(#atk-emblem)" stroke="#FDE68A" strokeWidth="1.5" />
              <path d="M20 6L30 12V28L20 38L10 28V12L20 6Z" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.7" />
              <defs>
                <linearGradient id="atk-emblem" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#FBBF24" />
                  <stop offset="40%" stopColor="#D97706" />
                  <stop offset="100%" stopColor="#78350F" />
                </linearGradient>
              </defs>
            </svg>
            <span className={`stat-value ${card.petStage === 'master' && card.hasStage3Variants ? 'stat-unknown' : ''} ${attackBuff > 0 ? 'stat-buffed' : ''}`}>
              {card.petStage === 'master' && card.hasStage3Variants ? '?' : (card.attack ?? 0) + attackBuff}
            </span>
          </div>
          <div className="card-health stat-emblem">
            <svg className="stat-emblem-bg" viewBox="0 0 40 44" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 2C14 2 4 7 4 7V26C4 34 11 40 20 44C29 40 36 34 36 26V7S26 2 20 2Z" fill="url(#hp-emblem)" stroke="#FCA5A5" strokeWidth="1.5" />
              <path d="M20 8C16 8 8 11.5 8 11.5V25C8 31 13 35.5 20 38.5C27 35.5 32 31 32 25V11.5S24 8 20 8Z" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.7" />
              <defs>
                <linearGradient id="hp-emblem" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#EF4444" />
                  <stop offset="40%" stopColor="#DC2626" />
                  <stop offset="100%" stopColor="#7F1D1D" />
                </linearGradient>
              </defs>
            </svg>
            <span className={`stat-value ${card.petStage === 'master' && card.hasStage3Variants ? 'stat-unknown' : ''} ${healthBuff > 0 ? 'stat-buffed' : ''}`}>
              {card.petStage === 'master' && card.hasStage3Variants ? '?' : (card.health ?? 0) + healthBuff}
            </span>
          </div>
        </>
      )}

      {holoTier && (
        <>
          <div className="holo-foil" />
          <div className="holo-glitter" />
          <div className="holo-glare" />
        </>
      )}

      {cardTheme && <div className={`card-particles theme-${cardTheme}`} />}

      {badgeTooltip && createPortal(
        <div className={`keyword-badge-tooltip ${badgeTooltip.isEvolveInfo ? 'evolve-tooltip' : ''}`} style={tooltipStyle}>
          <div className="kbt-header">
            <span className="kbt-icon">{KEYWORD_ICON_MAP[badgeTooltip.keyword] ? React.createElement(KEYWORD_ICON_MAP[badgeTooltip.keyword], { style: { color: badgeTooltip.color, width: '1.2em', height: '1.2em' } }) : badgeTooltip.icon}</span>
            <span className="kbt-name" style={{ color: badgeTooltip.color }}>
              {badgeTooltip.keyword.charAt(0).toUpperCase() + badgeTooltip.keyword.slice(1)}
            </span>
          </div>
          {badgeTooltip.isEvolveInfo && evolveTooltipText ? (
            <div className="kbt-effect evolve-requirements">
              {evolveTooltipText.split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          ) : tooltipEffectText ? (
            <div className="kbt-effect">{tooltipEffectText}</div>
          ) : null}
        </div>,
        document.body
      )}
    </div>
  );
});

export default SimpleCard;
