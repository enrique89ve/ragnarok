/**
 * SimpleBattlefield.tsx
 * 
 * Clean, minimal battlefield component for CCG-style card game.
 * 7 slots per side, flexbox layout, direct card rendering.
 * Integrates UnifiedCardTooltip for consistent hover descriptions.
 * 
 * Replaces the bloated 3000+ line UnifiedBattlefield system.
 */

import { debug } from '../config/debugConfig';
import React, { useMemo, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CardInstanceWithCardData } from '../types/interfaceExtensions';
import CardRenderer from './CardRendering/CardRenderer';
import { MAX_BATTLEFIELD_SIZE } from '../constants/gameConstants';
import { hasKeyword } from '../utils/cards/keywordUtils';
import './SimpleBattlefield.css';

interface SimpleBattlefieldProps {
  playerCards: CardInstanceWithCardData[];
  opponentCards: CardInstanceWithCardData[];
  onCardClick?: (card: CardInstanceWithCardData) => void;
  onOpponentCardClick?: (card: CardInstanceWithCardData) => void;
  onOpponentHeroClick?: () => void;
  attackingCard: CardInstanceWithCardData | null;
  isPlayerTurn: boolean;
  registerCardPosition?: (card: CardInstanceWithCardData, position: any) => void;
  renderMode?: 'both' | 'player' | 'opponent';
  shakingTargets?: Set<string>;
  isInteractionDisabled?: boolean;
  showPositionPicker?: boolean;
  onPositionSelect?: (insertionIndex: number) => void;
  targetingMode?: 'friendly' | 'enemy' | 'any' | null;
}

const MAX_SLOTS = MAX_BATTLEFIELD_SIZE;
const SLOT_INDICES = Array.from({ length: MAX_BATTLEFIELD_SIZE }, (_, i) => i);
const EMPTY_SET = new Set<string>();

export const SimpleBattlefield: React.FC<SimpleBattlefieldProps> = React.memo(({
  playerCards,
  opponentCards,
  onCardClick,
  onOpponentCardClick,
  attackingCard,
  isPlayerTurn,
  renderMode = 'both',
  shakingTargets = EMPTY_SET,
  isInteractionDisabled = false,
  showPositionPicker = false,
  onPositionSelect,
  targetingMode = null
}) => {
  const showOpponent = renderMode === 'both' || renderMode === 'opponent';
  const showPlayer = renderMode === 'both' || renderMode === 'player';

  const opponentHasTaunt = useMemo(
    () => opponentCards.some(c => hasKeyword(c, 'taunt')),
    [opponentCards]
  );

  const isValidTarget = (card: CardInstanceWithCardData) => {
    if (!attackingCard) return false;
    return !opponentHasTaunt || hasKeyword(card, 'taunt');
  };

  const renderSlots = (
    cards: CardInstanceWithCardData[], 
    side: 'player' | 'opponent',
    onClick?: (card: CardInstanceWithCardData) => void
  ) => {
    return SLOT_INDICES.map((index) => {
      const card = cards[index];
      const isOccupied = !!card;
      const isShaking = card && shakingTargets.has(card.instanceId);
      const isAttacking = card && attackingCard?.instanceId === card.instanceId;
      const canAttack = side === 'player' && card && isPlayerTurn &&
                        !card.isSummoningSick && card.canAttack && !attackingCard;
      const isTarget = side === 'opponent' && card && isValidTarget(card);
      const hasSuperBonus = card && (card as any).hasSuperMinionBonus;
      const hasCharge = !!(card && hasKeyword(card, 'charge'));
      const isSummoningSick = side === 'player' && !!card && !!card.isSummoningSick && !hasCharge;
      const isExhausted = side === 'player' && !!card && isPlayerTurn &&
                          !card.isSummoningSick && !card.canAttack &&
                          !!((card.card as any)?.attack > 0);
      const cardHasTaunt = !!(card && hasKeyword(card, 'taunt'));
      const hasElementalBuff = !!(card as any)?.hasElementalBuff;
      const readyToEvolve = !!(card as any)?.petEvolutionMet;
      const isDormantCard = !!(card as any)?.isDormant;
      const dormantTurnsLeft = (card as any)?.dormantTurnsLeft as number | undefined;
      const einherjarReturns = (card as any)?.einpieces as number | undefined;
      const hasChainPartner = !!(card?.card as any)?.chainPartner;
      const chainPartnerOnBoard = hasChainPartner && (() => {
        const partnerId = (card?.card as any)?.chainPartner;
        const allCards = side === 'player' ? playerCards : opponentCards;
        return allCards.some(c => c.card?.id === partnerId);
      })();
      const isSubmerged = !!(card as any)?.isSubmerged;
      const submergeTurnsLeft = (card as any)?.submergeTurnsLeft as number | undefined;
      const isCoiled = !!(card as any)?.isCoiled;
      const hasWager = !!(card?.card as any)?.wagerEffect;
      const hasFlying = !!(card && hasKeyword(card, 'flying'));

      const statusPoisoned = !!(card as any)?.isPoisonedDoT;
      const statusBleeding = !!(card as any)?.isBleeding;
      const statusParalyzed = !!(card as any)?.isParalyzed;
      const statusWeakened = !!(card as any)?.isWeakened;
      const statusVulnerable = !!(card as any)?.isVulnerable;
      const statusFrozen = !!(card as any)?.isFrozen;
      const statusMarked = !!(card as any)?.isMarked;
      const statusBurning = !!(card as any)?.isBurning;
      const hasAnyStatus = statusPoisoned || statusBleeding || statusParalyzed || statusWeakened || statusVulnerable || statusFrozen || statusMarked || statusBurning;

      return (
        <div
          key={`${side}-slot-${index}`}
          className={`bf-slot ${isOccupied ? 'occupied' : 'empty'}`}
        >
          <AnimatePresence>
            {card && (
              <motion.div
                key={card.instanceId}
                data-instance-id={card.instanceId}
                className={`bf-card-wrapper
                  ${isShaking ? 'shake' : ''}
                  ${isAttacking ? 'attacking' : ''}
                  ${canAttack ? 'can-attack' : ''}
                  ${isTarget ? 'valid-target' : ''}
                  ${hasSuperBonus ? 'super-minion-bonus' : ''}
                  ${isSummoningSick ? 'summoning-sick' : ''}
                  ${isExhausted ? 'exhausted' : ''}
                  ${cardHasTaunt ? 'has-taunt' : ''}
                  ${hasElementalBuff ? 'elemental-buffed' : ''}
                  ${statusPoisoned ? 'status-poisoned' : ''}
                  ${statusBleeding ? 'status-bleeding' : ''}
                  ${statusParalyzed ? 'status-paralyzed' : ''}
                  ${statusWeakened ? 'status-weakened' : ''}
                  ${statusVulnerable ? 'status-vulnerable' : ''}
                  ${statusFrozen ? 'status-frozen' : ''}
                  ${statusMarked ? 'status-marked' : ''}
                  ${statusBurning ? 'status-burning' : ''}
                  ${readyToEvolve ? 'ready-to-evolve' : ''}
                  ${isDormantCard ? 'is-dormant' : ''}
                  ${isSubmerged ? 'is-submerged' : ''}
                  ${isCoiled ? 'is-coiled' : ''}
                  ${hasWager ? 'has-wager' : ''}
                  ${hasFlying ? 'has-flying' : ''}
                `}
                role="button"
                aria-label={`${card.card?.name || 'Minion'}, ${(card.card as any)?.attack ?? 0} attack, ${card.health ?? (card.card as any)?.health ?? 0} health${cardHasTaunt ? ', taunt' : ''}${canAttack ? ', ready to attack' : ''}`}
                tabIndex={0}
                onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (e.currentTarget as HTMLElement).click(); } }}
                initial={{ opacity: 0, scale: 0.15, y: side === 'player' ? 80 : -80 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  scale: 0.05,
                  y: side === 'opponent' ? 25 : -25,
                  filter: 'brightness(5) saturate(0)',
                  transition: { duration: 0.35, ease: [0.55, 0, 1, 0.45] }
                }}
                transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                onClick={() => {
                  debug.combat('[SimpleBattlefield Click]', {
                    cardName: card.card?.name,
                    side,
                    canAttack: card.canAttack,
                    isSummoningSick: card.isSummoningSick,
                    isPlayerTurn,
                    isInteractionDisabled,
                    attackingCard: !!attackingCard
                  });
                  !isInteractionDisabled && onClick?.(card);
                }}
              >
                <CardRenderer
                  card={card}
                  isPlayable={true}
                  isHighlighted={isAttacking || canAttack || isTarget}
                  size="medium"
                />
                {(() => {
                  const curAtk = card.currentAttack ?? (card.card as any)?.attack ?? 0;
                  const curHp = card.currentHealth ?? (card.card as any)?.health ?? 0;
                  const baseAtk = (card.card as any)?.attack ?? 0;
                  const baseHp = (card.card as any)?.health ?? 0;
                  const atkClass = curAtk > baseAtk ? 'buffed' : '';
                  const hpClass = curHp > baseHp ? 'buffed' : curHp < baseHp ? 'damaged' : '';
                  return (
                    <div className="bf-card-stats">
                      <span className={`bf-attack ${atkClass}`}>{curAtk}</span>
                      <span className={`bf-health ${hpClass}`}>{curHp}</span>
                    </div>
                  );
                })()}
                {hasAnyStatus && (
                  <div className="bf-status-badges">
                    {statusPoisoned && <span className="status-badge badge-poison" title="Poison: 3 damage per turn">☠️</span>}
                    {statusBleeding && <span className="status-badge badge-bleed" title="Bleed: +3 damage taken">🩸</span>}
                    {statusBurning && <span className="status-badge badge-burn" title="Burn: +3 Attack, 3 self-damage">🔥</span>}
                    {statusFrozen && <span className="status-badge badge-frozen" title="Frozen: Cannot act">❄️</span>}
                    {statusParalyzed && <span className="status-badge badge-paralysis" title="Paralysis: 50% chance to fail">⚡</span>}
                    {statusWeakened && <span className="status-badge badge-weakness" title="Weakness: -3 Attack">⬇️</span>}
                    {statusVulnerable && <span className="status-badge badge-vulnerable" title="Vulnerable: +3 damage taken">🎯</span>}
                    {statusMarked && <span className="status-badge badge-marked" title="Marked: Ignores Stealth">👁️</span>}
                  </div>
                )}
                {einherjarReturns !== undefined && einherjarReturns > 0 && (
                  <div className="bf-einherjar-badge" title={`Einherjar: ${einherjarReturns} return${einherjarReturns > 1 ? 's' : ''} remaining`}>
                    <span className="einherjar-icon">⚔️</span>
                    <span className="einherjar-count">×{einherjarReturns}</span>
                  </div>
                )}
                {chainPartnerOnBoard && (
                  <div className="bf-chain-badge" title="Ragnarok Chain: Partner is in play — bonuses active!">
                    <span className="chain-icon">🔗</span>
                  </div>
                )}
                {hasChainPartner && !chainPartnerOnBoard && (
                  <div className="bf-chain-badge chain-inactive" title="Ragnarok Chain: Partner not in play">
                    <span className="chain-icon">🔗</span>
                  </div>
                )}
                {isDormantCard && (
                  <div className="bf-dormant-overlay" title={`Dormant: Awakens in ${dormantTurnsLeft ?? '?'} turn${dormantTurnsLeft === 1 ? '' : 's'}`}>
                    <span className="dormant-icon">💤</span>
                    <span className="dormant-turns">{dormantTurnsLeft ?? '?'}</span>
                  </div>
                )}
                {isSubmerged && (
                  <div className="bf-submerge-overlay" title={`Submerged: Surfaces in ${submergeTurnsLeft ?? '?'} turn${submergeTurnsLeft === 1 ? '' : 's'}`}>
                    <span className="submerge-icon">🌊</span>
                    <span className="submerge-turns">{submergeTurnsLeft ?? '?'}</span>
                  </div>
                )}
                {isCoiled && (
                  <div className="bf-coil-badge" title="Coiled: Attack locked to 0">
                    <span className="coil-icon">🐍</span>
                  </div>
                )}
                {hasWager && (
                  <div className="bf-wager-badge" title="Wager: Active during poker combat">
                    <span className="wager-icon">🎲</span>
                  </div>
                )}
                {hasFlying && (
                  <div className="bf-flying-badge" title="Flying: Bypasses Taunt">
                    <span className="flying-icon">🪶</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    });
  };

  const playerSlots = useMemo(
    () => renderSlots(playerCards, 'player', onCardClick),
    [playerCards, onCardClick, shakingTargets, attackingCard, isPlayerTurn, isInteractionDisabled, opponentHasTaunt]
  );

  const opponentSlots = useMemo(
    () => renderSlots(opponentCards, 'opponent', onOpponentCardClick),
    [opponentCards, onOpponentCardClick, shakingTargets, attackingCard, isPlayerTurn, isInteractionDisabled, opponentHasTaunt]
  );

  const playerRowRef = useRef<HTMLDivElement>(null);

  const occupiedCount = playerCards.length;
  const isBoardFull = occupiedCount >= MAX_SLOTS;
  const showGaps = showPositionPicker && !isBoardFull && showPlayer;

  const [hoveredGap, setHoveredGap] = useState(-1);

  const playerSlotsWithGaps = useMemo(() => {
    if (!showGaps) return playerSlots;
    const result: React.ReactNode[] = [];
    for (let i = 0; i <= occupiedCount; i++) {
      const gapIndex = i;
      const isActive = hoveredGap === i;
      result.push(
        <div
          key={`gap-${i}`}
          className={`bf-insertion-gap ${isActive ? 'active' : ''} ${showPositionPicker ? 'clickable' : ''}`}
          onMouseEnter={showPositionPicker ? () => setHoveredGap(gapIndex) : undefined}
          onMouseLeave={showPositionPicker ? () => setHoveredGap(-1) : undefined}
          onClick={showPositionPicker ? (e) => { e.stopPropagation(); onPositionSelect?.(gapIndex); } : undefined}
        />
      );
      if (i < MAX_SLOTS && playerSlots[i]) {
        result.push(playerSlots[i]);
      }
    }
    return result;
  }, [showGaps, showPositionPicker, playerSlots, occupiedCount, hoveredGap, onPositionSelect]);

  const targetClass = targetingMode === 'friendly' ? 'targeting-friendly' : targetingMode === 'enemy' ? 'targeting-enemy' : targetingMode === 'any' ? 'targeting-any' : '';

  return (
    <div className={`simple-battlefield ${targetClass}`}>
      {showOpponent && (
        <div className="bf-row opponent-row" aria-label="Opponent's battlefield">
          {opponentSlots}
        </div>
      )}

      {showPlayer && (
        <div ref={playerRowRef} className={`bf-row player-row ${showGaps ? 'dragging' : ''} ${showPositionPicker ? 'position-picking' : ''}`} aria-label="Player's battlefield">
          {playerSlotsWithGaps}
        </div>
      )}
    </div>
  );
});

export default SimpleBattlefield;
