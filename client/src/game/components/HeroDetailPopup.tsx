import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { NorseHero, NorseKing } from '../types/NorseTypes';
import { ChessPieceHero } from '../types/ChessTypes';
import { ALL_NORSE_HEROES } from '../data/norseHeroes';
import { NORSE_KINGS } from '../data/norseKings/kingDefinitions';
import { useKingDivineCommandDisplay } from '../hooks/useKingDivineCommandDisplay';
import { resolveHeroPortrait } from '../utils/art/artMapping';
import { assetPath } from '../utils/assetPath';
import { getEditionInfo } from '../utils/heroRarity';
import { getHoloTier } from '../hooks/useHoloTracking';
import './styles/holoEffect.css';
import './HeroDetailPopup.css';

interface HeroDetailPopupProps {
  hero: ChessPieceHero | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect?: () => void;
}

const RUNE_CHARS = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ', 'ᛇ', 'ᛈ', 'ᛉ', 'ᛊ', 'ᛏ', 'ᛒ', 'ᛚ', 'ᛗ', 'ᛞ', 'ᛟ'];

const getRunesForText = (text: string, count: number = 3): string[] => {
  const hash = text.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(RUNE_CHARS[(hash + i * 7) % RUNE_CHARS.length]);
  }
  return result;
};

const PORTRAIT_POSITIONS: Record<string, string> = {
  'king-ymir': 'center 20%',
  'king-surtr': 'center 20%',
  'king-buri': 'center 15%',
};

const ELEMENT_ACCENT_COLORS: Record<string, { primary: string; glow: string }> = {
  fire: { primary: '#ff6a00', glow: 'rgba(255, 106, 0, 0.5)' },
  water: { primary: '#4a9eff', glow: 'rgba(74, 158, 255, 0.5)' },
  ice: { primary: '#88d8ff', glow: 'rgba(136, 216, 255, 0.5)' },
  grass: { primary: '#4aff6a', glow: 'rgba(74, 255, 106, 0.5)' },
  light: { primary: '#ffe066', glow: 'rgba(255, 224, 102, 0.5)' },
  dark: { primary: '#b87aff', glow: 'rgba(184, 122, 255, 0.5)' },
  electric: { primary: '#ffee58', glow: 'rgba(255, 238, 88, 0.5)' },
  neutral: { primary: '#c8b8a0', glow: 'rgba(200, 184, 160, 0.4)' },
};

const getAccentColor = (hero: ChessPieceHero): { primary: string; glow: string } => {
  const el = hero.element || 'neutral';
  return ELEMENT_ACCENT_COLORS[el] || ELEMENT_ACCENT_COLORS.neutral;
};

const CORNER_RUNES = ['ᚠ', 'ᚦ', 'ᛉ', 'ᛟ'];

const ICE_RE = /\b(ymir|buri|niflheim|frost|ice|snow|skadi|jotun|glacier|blizzard|frozen|winter|cold)\b/i;
const FIRE_RE = /\b(surtr|muspel|fire|flame|ember|inferno|burn|ash|volcanic|magma|lava|pyre)\b/i;
const ELECTRIC_RE = /\b(thor|thunder|lightning|storm|spark|tempest|volt)\b/i;
const SHADOW_RE = /\b(hel|helheim|shadow|dark|death|draugr|void|abyss|niflung|undead)\b/i;

const getHeroTheme = (name: string, element?: string): string | null => {
  if (element === 'ice' || ICE_RE.test(name)) return 'ice';
  if (element === 'fire' || FIRE_RE.test(name)) return 'fire';
  if (element === 'electric' || ELECTRIC_RE.test(name)) return 'electric';
  if (element === 'dark' || SHADOW_RE.test(name)) return 'shadow';
  return null;
};

const KING_GLOW_COLORS = {
  c1: '#92400E', c2: '#B45309', c3: '#F59E0B', c4: '#FDE68A', c5: '#FFFBEB'
};

const getGlowColors = (hero: ChessPieceHero, isKing: boolean) => {
  if (isKing) return KING_GLOW_COLORS;
  const accent = getAccentColor(hero);
  const p = accent.primary;
  return { c1: `${p}40`, c2: `${p}80`, c3: p, c4: `${p}cc`, c5: '#ffffff' };
};

export function HeroDetailPopup({ hero, isOpen, onClose, onSelect }: HeroDetailPopupProps) {
  const [mounted, setMounted] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [mousePercent, setMousePercent] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const returnAnimationRef = useRef<number | null>(null);

  const { isKingWithAbility, abilityInfo } = useKingDivineCommandDisplay(hero?.id);
  const heroTheme = useMemo(() => hero ? getHeroTheme(hero.name, hero.element) : null, [hero]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    setIsFlipped(false);
  }, [hero?.id]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || isFlipping) return;
    if (returnAnimationRef.current) {
      cancelAnimationFrame(returnAnimationRef.current);
      returnAnimationRef.current = null;
    }
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distX = e.clientX - centerX;
    const distY = e.clientY - centerY;
    const rotY = Math.max(-15, Math.min(15, distX / rect.width * 30));
    const rotX = Math.max(-15, Math.min(15, -distY / rect.height * 30));
    setRotation({ x: rotX, y: rotY });
    setPosition({ x: distX / 20, y: distY / 20 });
    const mx = ((e.clientX - rect.left) / rect.width) * 100;
    const my = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePercent({ x: mx, y: my });
    if (!isHovering) setIsHovering(true);
  }, [isFlipping, isHovering]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    const startRotation = { ...rotation };
    const startPosition = { ...position };
    const startTime = performance.now();
    const duration = 800;
    const easeOutBack = (t: number) => {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    };
    const animateReturn = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const easedProgress = progress >= 1 ? 1 : easeOutBack(1 - progress);
      setRotation({ x: startRotation.x * easedProgress, y: startRotation.y * easedProgress });
      setPosition({ x: startPosition.x * easedProgress, y: startPosition.y * easedProgress });
      if (progress < 1) {
        returnAnimationRef.current = requestAnimationFrame(animateReturn);
      } else {
        setRotation({ x: 0, y: 0 });
        setPosition({ x: 0, y: 0 });
        setMousePercent({ x: 50, y: 50 });
      }
    };
    returnAnimationRef.current = requestAnimationFrame(animateReturn);
  }, [rotation, position]);

  const handleFlip = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFlipping) return;
    setIsFlipping(true);
    setIsFlipped(prev => !prev);
    setTimeout(() => setIsFlipping(false), 700);
  }, [isFlipping]);

  useEffect(() => {
    return () => {
      if (returnAnimationRef.current) cancelAnimationFrame(returnAnimationRef.current);
    };
  }, []);

  if (!hero || !mounted) return null;

  const isKing = hero.id?.startsWith('king-') || false;
  const norseHero: NorseHero | undefined = hero.norseHeroId && !isKing ? ALL_NORSE_HEROES[hero.norseHeroId] : undefined;
  const norseKing: NorseKing | undefined = isKing && hero.id ? NORSE_KINGS[hero.id] : undefined;

  const lore = norseKing?.description || norseHero?.lore;
  const designIntent = norseKing?.designIntent;
  const role = norseKing?.role || (norseHero ? norseHero.heroClass : 'Hero');
  const title = norseKing?.title || norseHero?.title;
  const portraitPos = hero.id ? (PORTRAIT_POSITIONS[hero.id] || 'center 20%') : 'center 20%';
  const resolvedPortrait = resolveHeroPortrait(hero.id, hero.portrait);
  const heroRunes = getRunesForText(hero.name, 3);
  const edition = getEditionInfo(hero.id || hero.name, isKing);
  const glowColors = getGlowColors(hero, isKing);

  const particles = Array.from({ length: 14 }, (_, i) => ({
    id: i,
    startX: `${10 + (i * 67 + 13) % 80}%`,
    driftX: `${(i % 2 === 0 ? 1 : -1) * (8 + (i * 3) % 20)}px`,
    duration: `${3 + (i * 7) % 5}s`,
    delay: `${(i * 0.4) % 3}s`,
  }));

  const effectiveRotY = isFlipped ? -rotation.y : rotation.y;
  const flipTransition = isFlipping
    ? 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)'
    : (rotation.x === 0 && rotation.y === 0 ? 'transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)' : 'none');

  const popupContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="hero-popup-portal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >

          <div className="hero-popup-backdrop" onClick={onClose} />

          <div
            className="card-scene"
            onClick={onClose}
            style={{
              '--accent-color': getAccentColor(hero).primary,
              '--accent-glow': getAccentColor(hero).glow,
            } as React.CSSProperties}
          >
            <div
              ref={cardRef}
              className="card-inner"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onClick={(e) => e.stopPropagation()}
              style={{
                transform: `rotateX(${rotation.x}deg) rotateY(${effectiveRotY + (isFlipped ? 180 : 0)}deg) translateZ(0)`,
                transition: flipTransition,
              }}
            >
              <div className="portrait-frame-pulse" />
              <div
                className="portrait-border-glow"
                style={{
                  '--glow-c1': glowColors.c1,
                  '--glow-c2': glowColors.c2,
                  '--glow-c3': glowColors.c3,
                  '--glow-c4': glowColors.c4,
                  '--glow-c5': glowColors.c5,
                } as React.CSSProperties}
              />

              {/* ===== FRONT FACE — Portrait ===== */}
              <div
                className={`card-front rarity-${edition.tier === 'starter' ? 'common' : edition.tier} ${getHoloTier(edition.tier === 'starter' ? 'common' : edition.tier) || ''} holo-active`}
                onClick={handleFlip}
                style={{
                  '--pointer-x': `${mousePercent.x}%`,
                  '--pointer-y': `${mousePercent.y}%`,
                  '--pointer-from-center': Math.min(Math.sqrt(Math.pow((mousePercent.y - 50) / 50, 2) + Math.pow((mousePercent.x - 50) / 50, 2)), 1),
                  '--pointer-from-top': mousePercent.y / 100,
                  '--pointer-from-left': mousePercent.x / 100,
                  '--card-opacity': 1,
                  '--bg-x': `${37 + ((mousePercent.x - 50) / 50) * 13}%`,
                  '--bg-y': `${37 + ((mousePercent.y - 50) / 50) * 13}%`,
                } as React.CSSProperties}
              >
                <div className="hero-popup-portrait">
                  {resolvedPortrait && (
                    <img
                      src={resolvedPortrait}
                      alt={hero.name}
                      style={{
                        objectPosition: portraitPos,
                      }}
                      loading="lazy"
                    />
                  )}

                  <div className="holo-foil" />
                  <div className="holo-glitter" />
                  <div className="holo-glare" />
                  <div
                    className="portrait-depth-shadow"
                    style={{
                      background: `radial-gradient(circle at ${100 - mousePercent.x}% ${100 - mousePercent.y}%, rgba(0,0,0,0.45) 0%, transparent 70%)`,
                    }}
                  />
                  <div
                    className="portrait-gloss-overlay"
                    style={{
                      background: `radial-gradient(circle at ${mousePercent.x}% ${mousePercent.y}%, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.08) 35%, transparent 65%)`,
                    }}
                  />
                  <div className="portrait-vignette" />

                  {heroTheme && <div className={`popup-theme-particles theme-${heroTheme}`} />}

                  <div className="portrait-particles">
                    {particles.map(p => (
                      <div
                        key={p.id}
                        className="portrait-particle"
                        style={{
                          '--start-x': p.startX,
                          '--drift-x': p.driftX,
                          '--float-duration': p.duration,
                          '--float-delay': p.delay,
                        } as React.CSSProperties}
                      />
                    ))}
                  </div>

                  {CORNER_RUNES.map((rune, i) => (
                    <span
                      key={i}
                      className={`portrait-corner-rune ${['top-left', 'top-right', 'bottom-left', 'bottom-right'][i]}`}
                    >
                      {rune}
                    </span>
                  ))}

                  <motion.div
                    className={`edition-stamp edition-${edition.tier === 'starter' ? 'common' : edition.tier}`}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                  >
                    {edition.editionLabel} EDITION
                  </motion.div>

                  {edition.tier !== 'starter' && (
                    <motion.div
                      className="hero-popup-scarcity-badge"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4, duration: 0.4 }}
                    >
                      <span className="hero-popup-scarcity-number" style={{ color: edition.colors.primary }}>
                        #{String(edition.mintNumber).padStart(edition.maxSupply >= 10000 ? 5 : edition.maxSupply >= 1000 ? 4 : 3, '0')}
                      </span>
                      <span className="hero-popup-scarcity-separator">/</span>
                      <span className="hero-popup-scarcity-max">{edition.maxSupply.toLocaleString()}</span>
                    </motion.div>
                  )}

                  <div className="card-name-plate">
                    <div className="card-name-plate-name">{hero.name}</div>
                    {title && <div className="card-name-plate-title">{title}</div>}
                  </div>
                </div>
              </div>

              {/* ===== BACK FACE — Info ===== */}
              <div className="card-back">
                <div className="card-back-header">
                  <div className="card-back-hero-info">
                    <div className="card-back-hero-name">{hero.name}</div>
                    {title && <div className="card-back-hero-title">{title}</div>}
                  </div>
                  <button
                    className="card-back-flip-btn"
                    onClick={handleFlip}
                    type="button"
                    title="Flip back"
                  >
                    &#x21BB;
                  </button>
                </div>

                {hero.element && (
                  <div className="hero-element-badge">
                    <span className="hero-element-dot" />
                    <span>{hero.element.toUpperCase()}</span>
                  </div>
                )}

                {lore && (
                  <>
                    <div className="back-section-divider">Origins</div>
                    <p className="back-lore">"{lore}"</p>
                  </>
                )}

                {(designIntent || role) && (
                  <>
                    <div className="back-playstyle-label">Playstyle: {role}</div>
                    <p className="back-playstyle-text">
                      {designIntent || `${hero.name} forces combat and punishes slow setups. If you hesitate, ${hero.name} wins.`}
                    </p>
                  </>
                )}

                {((norseKing?.passives && norseKing.passives.length > 0) || norseHero?.passive || norseHero?.heroPower) && (
                  <>
                    <div className="back-section-divider">Abilities</div>

                    {norseKing?.passives?.map((passive) => (
                      <div key={passive.id} className="back-ability-row">
                        <div className="back-ability-name">{passive.name}</div>
                        <div className="back-ability-desc">{passive.description}</div>
                      </div>
                    ))}

                    {norseHero?.passive && (
                      <div className="back-ability-row">
                        <div className="back-ability-name">{norseHero.passive.name}</div>
                        <div className="back-ability-desc">{norseHero.passive.description}</div>
                      </div>
                    )}

                    {norseHero?.heroPower && (
                      <div className="back-ability-row">
                        <div className="back-ability-name">{norseHero.heroPower.name}</div>
                        <div className="back-ability-desc">{norseHero.heroPower.description}</div>
                      </div>
                    )}
                  </>
                )}

                {isKingWithAbility && abilityInfo && (
                  <>
                    <div className="back-section-divider">Divine Command</div>
                    <div className="back-ability-row" style={{ borderLeftColor: abilityInfo.rarityColor }}>
                      <div className="back-dc-header">
                        <span className="back-dc-name" style={{ color: abilityInfo.rarityColor }}>
                          {abilityInfo.abilityName}
                        </span>
                        <span
                          className="back-dc-rarity"
                          style={{
                            backgroundColor: `${abilityInfo.rarityColor}25`,
                            color: abilityInfo.rarityColor,
                          }}
                        >
                          {abilityInfo.rarityLabel}
                        </span>
                      </div>
                      <div className="back-dc-desc">{abilityInfo.description}</div>
                      <div className="back-dc-stats">
                        <span><span className="back-dc-stat-value" style={{ color: '#22d3ee' }}>{abilityInfo.turnDuration}T</span> dur</span>
                        <span><span className="back-dc-stat-value" style={{ color: '#22d3ee' }}>+{abilityInfo.manaBoost}</span> mana</span>
                        <span><span className="back-dc-stat-value" style={{ color: '#ef4444' }}>-{abilityInfo.staPenalty}</span> STA</span>
                        <span><span className="back-dc-stat-value" style={{ color: '#fbbf24' }}>{abilityInfo.shapeName}</span></span>
                      </div>
                    </div>
                  </>
                )}

              </div>
            </div>

            {onSelect && (
              <div className="ornate-btn-container" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="ornate-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect();
                    onClose();
                  }}
                >
                  <div className="ornate-btn-inner">
                    <span className="ornate-btn-corner-l">&#x16A0;</span>
                    <span className="ornate-btn-text">Select {hero.name}</span>
                    <span className="ornate-btn-corner-r">&#x16A0;</span>
                  </div>
                </button>
                <div className="ornate-btn-glow-outer" />
                <div className="ornate-btn-glow-inner" />
              </div>
            )}

            <button className="hero-popup-close" onClick={(e) => { e.stopPropagation(); onClose(); }} type="button" title="Close">
              <X size={20} color="white" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(popupContent, document.body);
}
