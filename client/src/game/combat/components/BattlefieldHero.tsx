/**
 * BattlefieldHero - Enhanced hero display component for the combat arena battlefield
 * 
 * Features:
 * - Hero portraits with restrained elemental identity
 * - Compact hero identity and resource display
 * - Hero dossier rendered in the arena modal layer
 * - HP and Stamina bars with visual feedback
 * - Secondary details consolidated into the compact hero dossier
 * - Hero power remains a dedicated, targetable control
 * 
 * @module combat/components/BattlefieldHero
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ALL_NORSE_HEROES } from '../../data/norseHeroes';
import { ELEMENT_WEAKNESSES, ELEMENT_STRENGTHS } from '../../utils/elements';
import { NORSE_TO_GAME_ELEMENT, type NorseElement } from '../../types/NorseTypes';
import { resolveHeroPortrait, DEFAULT_PORTRAIT } from '../../utils/art/artMapping';
import { GameIcon } from '../../utils/ui/GameIcon';
import HeroDossierModal from './HeroDossierModal';
import '../styles/hero-reactions.css';

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
  /** Opens the existing equipment detail panel from the dossier. */
  onOpenEquipment?: () => void;
  /** Whether the weapon has been upgraded */
  isWeaponUpgraded?: boolean;
  /** Equipped artifact card data (if any) */
  artifact?: { name: string; attack: number };
  /** Poker hole cards tucked inside the hero frame */
  pocketCardsOverlay?: React.ReactNode;
  /** Whether the hero frame should play the explicit damage reaction */
  shakingHero?: boolean;
}

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
  onOpenEquipment,
  isWeaponUpgraded = false,
  artifact,
  pocketCardsOverlay,
  shakingHero = false
}) => {
  const heroElement = useMemo(() => {
    if (elementProp) return elementProp;
    if (pet.norseHeroId && ALL_NORSE_HEROES[pet.norseHeroId]) {
      return ALL_NORSE_HEROES[pet.norseHeroId].element || 'neutral';
    }
    return 'neutral';
  }, [pet.norseHeroId, elementProp]);

  const portraitSrc = useMemo(
    () => (pet.norseHeroId ? resolveHeroPortrait(pet.norseHeroId) : null) ?? DEFAULT_PORTRAIT,
    [pet.norseHeroId],
  );

  const [resolvedPortrait, setResolvedPortrait] = useState(portraitSrc);

  useEffect(() => {
    let isActive = true;
    if (portraitSrc.startsWith('data:')) {
      setResolvedPortrait(portraitSrc);
      return;
    }
    const img = new Image();
    img.onload = () => { if (isActive) setResolvedPortrait(portraitSrc); };
    img.onerror = () => { if (isActive) setResolvedPortrait(DEFAULT_PORTRAIT); };
    img.src = portraitSrc;
    return () => { isActive = false; };
  }, [portraitSrc]);

  const portraitBgStyle = useMemo((): React.CSSProperties => ({
    backgroundImage: `url('${resolvedPortrait}')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center top'
  }), [resolvedPortrait]);

  const currentHP = pet.stats.currentHealth;
  const maxHP = pet.stats.maxHealth;
  const effectiveHP = Math.max(0, currentHP - hpCommitted);
  const armor = pet.stats.armor || 0;
  const healthPercent = maxHP > 0
    ? Math.max(0, Math.min(100, (effectiveHP / maxHP) * 100))
    : 0;
  const currentSta = pet.stats.currentStamina;
  const maxSta = pet.stats.maxStamina;
  const staminaPercent = maxSta > 0 ? Math.max(0, Math.min(100, (currentSta / maxSta) * 100)) : 0;
  const [damageReaction, setDamageReaction] = useState<'damaged' | 'healed' | null>(null);
  const [powerActivating, setPowerActivating] = useState(false);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const prevHealthRef = useRef(effectiveHP);

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

  const elementClass = heroElement ? `element-${heroElement.toLowerCase()}` : '';

  const norseHero = pet.norseHeroId ? ALL_NORSE_HEROES[pet.norseHeroId] : null;
  const heroPower = norseHero?.heroPower;
  const weaponUpgrade = norseHero?.weaponUpgrade;

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
  const isPowerDisabled = !canAffordPower || isOpponent || !onHeroPowerClick;

  const handleCardClick = useCallback(() => {
    onClick?.();
    if (!isTargetable) setIsDossierOpen(true);
  }, [isTargetable, onClick]);

  const handleHeroPowerAction = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (isPowerDisabled || !onHeroPowerClick) return;
    onHeroPowerClick();
    setPowerActivating(true);
    setTimeout(() => setPowerActivating(false), 500);
  }, [isPowerDisabled, onHeroPowerClick]);

  return (
    <div
      className={`battlefield-hero-square ${elementClass} ${isOpponent ? 'opponent' : 'player'} ${isTargetable ? 'targetable' : ''} clickable`}
    >
      {pocketCardsOverlay}
      <div className={`hero-card-wrapper ${damageReaction ? `hero-${damageReaction}` : ''} ${healthPercent <= 20 ? 'hero-critical-hp' : healthPercent <= 40 ? 'hero-low-hp' : ''}`}>
        <div
          className="hero-stamina-rail"
          role="meter"
          aria-label={`${pet.name} stamina`}
          aria-valuemin={0}
          aria-valuemax={maxSta}
          aria-valuenow={currentSta}
          title={`Stamina ${currentSta}/${maxSta}`}
        >
          <span className="hero-stamina-label">STA</span>
          <span className="hero-stamina-track">
            <span className="hero-stamina-fill" style={{ transform: `scaleY(${staminaPercent / 100})` }} />
          </span>
          <strong>{currentSta}</strong>
        </div>

        <div className={`hero-card-frame ${shakingHero ? 'damage-shake damage-flash' : ''}`}>
          <button
            type="button"
            className="hero-card-details-trigger"
            onClick={handleCardClick}
            aria-haspopup={isTargetable ? undefined : 'dialog'}
            aria-label={isTargetable
              ? `Target ${pet.name}`
              : `${isOpponent ? 'View opponent' : 'View'} hero details for ${pet.name}`}
          />
          <div
            className={`hero-portrait hero-portrait-interactive ${!isOpponent && heroPower ? 'has-power' : ''} ${isWeaponUpgraded ? 'upgraded' : ''} ${powerActivating ? 'power-activating' : ''}`}
            style={portraitBgStyle}
          >
            {!isOpponent && heroPower && (
              <button
                type="button"
                className={`portrait-power-badge ${canAffordPower ? 'affordable' : 'expensive'} ${isWeaponUpgraded ? 'upgraded' : ''}`}
                onClick={handleHeroPowerAction}
                disabled={isPowerDisabled}
                aria-label={`${heroPower.name}, costs ${heroPower.cost} mana`}
                title={`${heroPower.name} · ${heroPower.cost} Mana`}
              >
                <GameIcon name="zap" size={12} />
                <span className="power-cost">{heroPower.cost}</span>
              </button>
            )}
          </div>

          <div className="hero-status-console">
            <div className="hero-name-plate">
              <span className="hero-name">{pet.name.split(' ')[0]}</span>
            </div>

            <div className={`fighting-hp-bar-container${isOpponent ? ' opponent' : ''}`}>
              <div className="fighting-hp-bar" role="meter" aria-label={`${pet.name} health`} aria-valuemin={0} aria-valuemax={maxHP} aria-valuenow={effectiveHP}>
                <div className="fighting-hp-damage" />
                <div className="fighting-hp-fill" style={{ transform: `scaleX(${healthPercent / 100})` }} />
                <span className="fighting-hp-text">{Math.round(effectiveHP)}/{Math.round(maxHP)}</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      <HeroDossierModal
		isOpen={isDossierOpen}
		isOpponent={isOpponent}
		heroName={pet.name.split(' ')[0]}
		heroClass={heroClass}
		heroElement={heroElement}
		portraitSrc={resolvedPortrait}
		level={level}
		currentHP={effectiveHP}
		maxHP={maxHP}
		currentStamina={currentSta}
		maxStamina={maxSta}
		currentMana={mana}
		maxMana={maxMana}
		pokerPosition={pokerPosition}
		armor={armor}
		hpCommitted={hpCommitted}
		secretsCount={secrets.length}
		artifact={artifact}
		heroPower={heroPower}
		weaponUpgrade={weaponUpgrade}
		isWeaponUpgraded={isWeaponUpgraded}
		canAffordPower={canAffordPower}
		canUpgrade={canUpgrade}
		elementMatchups={elementMatchups}
		onClose={() => setIsDossierOpen(false)}
		onHeroPowerClick={onHeroPowerClick}
		onWeaponUpgradeClick={onWeaponUpgradeClick}
		onOpenEquipment={onOpenEquipment}
	  />
    </div>
  );
});

export default BattlefieldHero;
