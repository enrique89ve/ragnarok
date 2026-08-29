/**
 * SimpleBattlefield.tsx
 *
 * Clean, minimal battlefield component for CCG-style card game.
 * Uses MAX_BATTLEFIELD_SIZE slots per side, flexbox layout, direct card rendering.
 * Integrates UnifiedCardTooltip for consistent hover descriptions.
 *
 * Replaces the bloated 3000+ line UnifiedBattlefield system.
 */

import { debug } from '../config/debugConfig';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { AnimatePresence, LayoutGroup, motion, usePresence, useReducedMotion } from 'framer-motion';
import { CardInstanceWithCardData } from '../types/interfaceExtensions';
import SimpleCardCompat from './card/SimpleCardCompat';
import { toSimpleCardData } from './card/cardDataAdapter';
import { MAX_BATTLEFIELD_SIZE } from '../constants/gameConstants';
import { hasKeyword } from '../utils/cards/keywordUtils';
import type { SimpleCardStatTone, SimpleCardStatView } from './card/SimpleCardCompat';
import './SimpleBattlefield.css';
import { arenaVfxWagerMinionProps } from '../combat/arenaVfxTargets';
import { canCardAttack } from '../combat/attackUtils';
import BattlefieldStateMark from '../combat/components/BattlefieldStateMark';
import {
  getEinherjarReturnsRemaining,
  getRuntimeStateDefinition,
  hasExhaustedCombatState,
  isRuntimeStateActive,
  type RuntimeStateId,
} from '../combat/runtimeStateContract';
import { useTargetingStore } from '../stores/targetingStore';
import {
  combatVisualExitTiming,
  clearCombatVisualLifetime,
  combatVisualLifetimeRemaining,
  COMBAT_LETHAL_TIMELINE_MS,
} from '../combat/vfx/combatVisualLifetime';

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
  allowDisabledCardClick?: boolean;
  showPositionPicker?: boolean;
  onPositionSelect?: (insertionIndex: number) => void;
  targetingMode?: 'friendly' | 'enemy' | 'any' | null;
  /** Render context. Poker cards keep their authored slot on mount. */
  renderSurface?: 'chess' | 'poker';
}

const MAX_SLOTS = MAX_BATTLEFIELD_SIZE;
const EMPTY_SET = new Set<string>();

const STATUS_BADGE_DEFINITIONS = [
  { stateId: 'frozen', className: 'badge-frozen' },
  { stateId: 'paralyzed', className: 'badge-paralysis' },
  { stateId: 'poisoned', className: 'badge-poison' },
  { stateId: 'bleeding', className: 'badge-bleed' },
  { stateId: 'burning', className: 'badge-burn' },
  { stateId: 'weakened', className: 'badge-weakness' },
  { stateId: 'vulnerable', className: 'badge-vulnerable' },
  { stateId: 'marked', className: 'badge-marked' },
] as const satisfies ReadonlyArray<{ readonly stateId: RuntimeStateId; readonly className: string }>;

export interface BattlefieldLayoutItem<T extends { instanceId: string } = CardInstanceWithCardData> {
  readonly key: string;
  readonly card: T;
}

/**
 * Diagnostic guard for the canonical board identity contract. Keep this
 * predicate outside the render path so production renders do not pay for a
 * second identity scan; state/adaptor tests can still assert bad data.
 */
export function hasUniqueBattlefieldInstanceIds<T extends { instanceId: string }>(
  cards: readonly T[],
): boolean {
  const seen = new Set<string>();
  for (const card of cards) {
    if (seen.has(card.instanceId)) return false;
    seen.add(card.instanceId);
  }
  return true;
}

/** Targeting is resolved by the canonical valid-id list, not by battlefield side. */
export function isBattlefieldTarget(
  card: { readonly instanceId: string } | null | undefined,
  validTargetIds: readonly string[],
): boolean {
  return card !== null && card !== undefined && validTargetIds.includes(card.instanceId);
}

/** Authored wager effects are active only when a concrete effect is present. */
export function hasBattlefieldWagerEffect(input: unknown): boolean {
  if (!input || typeof input !== 'object' || !('card' in input)) return false;
  const card = input.card;
  if (!card || typeof card !== 'object' || !('wagerEffect' in card)) return false;
  return card.wagerEffect !== null && card.wagerEffect !== undefined;
}

/**
 * Cards are layout participants in their logical battlefield order.
 * The instance id is deliberately the only identity used by the renderer;
 * array indexes describe order, never card lifetime.
 */
export function buildBattlefieldLayoutItems<T extends { instanceId: string }>(
  cards: readonly T[],
): ReadonlyArray<BattlefieldLayoutItem<T>> {
  return cards
    .slice(0, MAX_SLOTS)
    .map(card => ({ key: card.instanceId, card }));
}

function compareStat(current: number, base: number): SimpleCardStatTone {
  if (current > base) return 'buffed';
  if (current < base) return 'damaged';
  return 'base';
}

function readAttack(card: CardInstanceWithCardData['card']): number {
  if ('attack' in card && typeof card.attack === 'number') return card.attack;
  return 0;
}

function readHealth(card: CardInstanceWithCardData['card']): number {
  if ('health' in card && typeof card.health === 'number') return card.health;
  return 0;
}

function buildBattlefieldStatView(card: CardInstanceWithCardData): SimpleCardStatView {
  const baseAttack = readAttack(card.card);
  const baseHealth = readHealth(card.card);
  const currentAttack = card.currentAttack ?? baseAttack;
  const currentHealth = card.currentHealth ?? baseHealth;

  return {
    attack: {
      value: currentAttack,
      tone: compareStat(currentAttack, baseAttack),
    },
    health: {
      value: currentHealth,
      tone: compareStat(currentHealth, baseHealth),
    },
  };
}

interface BattlefieldCardPresenceProps {
  readonly cardInstanceId: string;
  readonly side: 'player' | 'opponent';
  readonly animateCardEntry: boolean;
  readonly children: React.ReactNode;
}

const BattlefieldCardPresence: React.FC<BattlefieldCardPresenceProps> = ({
  cardInstanceId,
  side,
  animateCardEntry,
  children,
}) => {
  const [isPresent, safeToRemove] = usePresence();
  const [deathPhase, setDeathPhase] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (isPresent) {
      setDeathPhase(false);
      clearCombatVisualLifetime(cardInstanceId);
      return undefined;
    }

    const remaining = combatVisualLifetimeRemaining(cardInstanceId);
    const { lifetimeMs, deathDelayMs } = combatVisualExitTiming(remaining, reducedMotion === true);
    const deathTimer = window.setTimeout(() => setDeathPhase(true), deathDelayMs);
    const removeTimer = window.setTimeout(() => {
      clearCombatVisualLifetime(cardInstanceId);
      safeToRemove?.();
    }, lifetimeMs);

    return () => {
      window.clearTimeout(deathTimer);
      window.clearTimeout(removeTimer);
    };
  }, [cardInstanceId, isPresent, reducedMotion, safeToRemove]);

  const animate = isPresent
    ? (animateCardEntry ? { opacity: 1, scale: 1, y: 0 } : undefined)
    : deathPhase
      ? {
          opacity: 0,
          scale: 0.05,
          y: side === 'opponent' ? 25 : -25,
          filter: 'brightness(5) saturate(0)',
        }
      : { opacity: 1, scale: 1, y: 0, filter: 'none' };

  return (
    <motion.div
      className="bf-card-position"
      layout="position"
      initial={animateCardEntry ? { opacity: 0, scale: 0.15, y: side === 'player' ? 80 : -80 } : false}
      animate={animate}
      transition={isPresent
        ? {
            layout: reducedMotion
              ? { duration: 0.01 }
              : { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
            type: 'spring',
            stiffness: 420,
            damping: 24,
          }
        : deathPhase
          ? {
              layout: reducedMotion
                ? { duration: 0.01 }
                : { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
              duration: reducedMotion ? 0.01 : COMBAT_LETHAL_TIMELINE_MS.death / 1000,
              ease: [0.55, 0, 1, 0.45],
            }
          : { layout: { duration: 0.22, ease: [0.22, 1, 0.36, 1] }, duration: 0 }}
    >
      {children}
    </motion.div>
  );
};

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
  allowDisabledCardClick = false,
  showPositionPicker = false,
  onPositionSelect,
  targetingMode = null,
  renderSurface = 'chess',
}) => {
  const showOpponent = renderMode === 'both' || renderMode === 'opponent';
  const showPlayer = renderMode === 'both' || renderMode === 'player';
  const animateCardEntry = renderSurface !== 'poker';
  const validTargetIds = useTargetingStore(state => state.validTargets);

  const renderSlots = (
    cards: readonly CardInstanceWithCardData[],
    side: 'player' | 'opponent',
    onClick?: (card: CardInstanceWithCardData) => void
  ) => {
    return buildBattlefieldLayoutItems(cards).map(({ card, key }) => {
      const isShaking = card && shakingTargets.has(card.instanceId);
      const isAttacking = card && attackingCard?.instanceId === card.instanceId;
      const canAttack = side === 'player' && card && isPlayerTurn &&
                        canCardAttack(card, isPlayerTurn) && !attackingCard;
      const isTarget = Boolean(card && isBattlefieldTarget(card, validTargetIds));
      const hasSuperBonus = card.hasSuperMinionBonus === true;
      const isSummoningSick = isRuntimeStateActive(card, 'summoning_sick');
      const isExhausted = side === 'player' && isPlayerTurn && hasExhaustedCombatState(card);
      const cardHasTaunt = isRuntimeStateActive(card, 'taunt');
      const hasElementalBuff = card.hasElementalBuff === true;
      const readyToEvolve = card.petEvolutionMet === true;
      const isDormantCard = isRuntimeStateActive(card, 'dormant');
      const dormantTurnsLeft = card.dormantTurnsLeft;
      const einherjarReturns = getEinherjarReturnsRemaining(card);
      const chainPartnerId = 'chainPartner' in card.card ? card.card.chainPartner : undefined;
      const hasChainPartner = typeof chainPartnerId === 'number';
      const chainPartnerOnBoard = isRuntimeStateActive(card, 'ragnarok_chain');
      const isSubmerged = isRuntimeStateActive(card, 'submerged');
      const submergeTurnsLeft = card.submergeTurnsLeft;
      const hasCoilState = isRuntimeStateActive(card, 'coiled');
      const hasWager = hasBattlefieldWagerEffect(card);
      const hasFlying = !!(card && hasKeyword(card, 'flying'));

      const statView = card ? buildBattlefieldStatView(card) : null;
      const statusBadges = STATUS_BADGE_DEFINITIONS.flatMap(({ stateId, className }) => {
        if (!isRuntimeStateActive(card, stateId)) return [];
        const definition = getRuntimeStateDefinition(stateId);
        return definition ? [{ className, stateId, title: `${definition.name}: ${definition.description}` }] : [];
      });
      const hasAnyStatus = statusBadges.length > 0;
      const activeStatusIds = new Set(statusBadges.map(badge => badge.stateId));
      const visibleStatusBadges = statusBadges.slice(0, 4);
      const hiddenStatusBadges = statusBadges.slice(4);

      return (
        <BattlefieldCardPresence
          key={key}
          cardInstanceId={card.instanceId}
          side={side}
          animateCardEntry={animateCardEntry}
        >
              <div
                data-instance-id={card.instanceId}
                data-card-family="nft"
                {...(hasWager ? arenaVfxWagerMinionProps(side) : null)}
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
                  ${activeStatusIds.has('poisoned') ? 'status-poisoned' : ''}
                  ${activeStatusIds.has('bleeding') ? 'status-bleeding' : ''}
                  ${activeStatusIds.has('paralyzed') ? 'status-paralyzed' : ''}
                  ${activeStatusIds.has('weakened') ? 'status-weakened' : ''}
                  ${activeStatusIds.has('vulnerable') ? 'status-vulnerable' : ''}
                  ${activeStatusIds.has('frozen') ? 'status-frozen' : ''}
                  ${activeStatusIds.has('marked') ? 'status-marked' : ''}
                  ${activeStatusIds.has('burning') ? 'status-burning' : ''}
                  ${readyToEvolve ? 'ready-to-evolve' : ''}
                  ${isDormantCard ? 'is-dormant' : ''}
                  ${isSubmerged ? 'is-submerged' : ''}
                  ${hasCoilState ? 'is-coiled' : ''}
                  ${hasWager ? 'has-wager' : ''}
                  ${hasFlying ? 'has-flying' : ''}
                `}
                role="button"
                aria-disabled={isInteractionDisabled}
                aria-label={`${card.card?.name || 'Minion'}, ${statView?.attack?.value ?? 0} attack, ${statView?.health?.value ?? 0} health${cardHasTaunt ? ', taunt' : ''}${canAttack ? ', ready to attack' : ''}`}
                tabIndex={0}
                onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (e.currentTarget as HTMLElement).click(); } }}
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
                  if (!isInteractionDisabled || allowDisabledCardClick) onClick?.(card);
                }}
              >
                <span className="bf-summon-fx" aria-hidden="true" />
                {isSummoningSick && (
                  <BattlefieldStateMark
                    className="bf-card-state-marker bf-card-state-marker--sleep"
                    label="Summoning sickness: Cannot attack on the turn it enters play"
                    icon={{ source: 'combat', name: 'summoning_sick' }}
                  />
                )}
                {isExhausted && (
                  <BattlefieldStateMark
                    className="bf-card-state-marker bf-card-state-marker--spent"
                    label="Exhausted: Has used its available attacks this turn"
                    icon={{ source: 'combat', name: 'exhausted' }}
                  />
                )}
                {(() => {
                  const simpleData = toSimpleCardData(card);
                  if (!simpleData) return null;
                  return (
                    <SimpleCardCompat
                      card={simpleData}
                      isPlayable
                      isHighlighted={isAttacking || canAttack || isTarget}
                      size="medium"
                      statView={statView ?? undefined}
                      statsMode="battlefield"
                    />
                  );
                })()}
                {hasAnyStatus && (
                  <div className="bf-status-badges">
                    {visibleStatusBadges.map((badge) => (
                      <BattlefieldStateMark
                        key={badge.className}
                        className={`status-badge ${badge.className}`}
                        label={badge.title}
                        icon={{ source: 'combat', name: badge.stateId }}
                      />
                    ))}
                    {hiddenStatusBadges.length > 0 && (
                      <span
                        className="status-badge status-badge--overflow"
                        title={hiddenStatusBadges.map(badge => badge.title).join(' | ')}
                        aria-label={`${hiddenStatusBadges.length} additional statuses`}
                      >
                        +{hiddenStatusBadges.length}
                      </span>
                    )}
                  </div>
                )}
                {readyToEvolve && (
                  <BattlefieldStateMark
                    className="bf-evolution-badge"
                    label="Evolution ready: The evolution condition has been completed"
                    icon={{ source: 'combat', name: 'evolution_ready' }}
                  />
                )}
                {einherjarReturns !== undefined && einherjarReturns > 0 && (
                  <BattlefieldStateMark
                    className="bf-einherjar-badge"
                    label={`Einherjar: ${einherjarReturns} return${einherjarReturns > 1 ? 's' : ''} remaining`}
                    icon={{ source: 'keyword', name: 'einherjar' }}
                    count={`×${einherjarReturns}`}
                    countClassName="einherjar-count"
                  />
                )}
                {chainPartnerOnBoard && (
                  <BattlefieldStateMark
                    className="bf-chain-badge"
                    label="Ragnarok Chain: Partner is in play — bonuses active"
                    icon={{ source: 'combat', name: 'ragnarok_chain' }}
                  />
                )}
                {hasChainPartner && !chainPartnerOnBoard && (
                  <BattlefieldStateMark
                    className="bf-chain-badge chain-inactive"
                    label="Ragnarok Chain: Partner not in play"
                    icon={{ source: 'combat', name: 'ragnarok_chain' }}
                  />
                )}
                {isDormantCard && (
                  <BattlefieldStateMark
                    className="bf-dormant-overlay"
                    label={`Dormant: Awakens in ${dormantTurnsLeft ?? '?'} turn${dormantTurnsLeft === 1 ? '' : 's'}`}
                    icon={{ source: 'combat', name: 'dormant' }}
                    count={dormantTurnsLeft ?? '?'}
                    countClassName="dormant-turns"
                    decorativeSleepMarks
                    iconSize={36}
                  />
                )}
                {isSubmerged && (
                  <BattlefieldStateMark
                    className="bf-submerge-overlay"
                    label={`Submerged: Surfaces in ${submergeTurnsLeft ?? '?'} turn${submergeTurnsLeft === 1 ? '' : 's'}`}
                    icon={{ source: 'combat', name: 'submerged' }}
                    count={submergeTurnsLeft ?? '?'}
                    countClassName="submerge-turns"
                    iconSize={36}
                  />
                )}
                {hasCoilState && (
                  <BattlefieldStateMark
                    className="bf-coil-badge"
                    label="Coiled: Attack locked to 0 while the source remains in play"
                    icon={{ source: 'combat', name: 'coiled' }}
                  />
                )}
                {hasWager && (
                  <BattlefieldStateMark
                    className="bf-wager-badge"
                    label="Wager: Active during poker combat"
                    icon={{ source: 'keyword', name: 'wager' }}
                  />
                )}
                {hasFlying && (
                  <BattlefieldStateMark
                    className="bf-flying-badge"
                    label="Flying: Bypasses Taunt"
                    icon={{ source: 'keyword', name: 'flying' }}
                  />
                )}
              </div>
        </BattlefieldCardPresence>
      );
    });
  };

  const playerSlots = useMemo(
    () => renderSlots(playerCards, 'player', onCardClick),
    [playerCards, onCardClick, shakingTargets, attackingCard, isPlayerTurn, isInteractionDisabled, allowDisabledCardClick, validTargetIds]
  );

  const opponentSlots = useMemo(
    () => renderSlots(opponentCards, 'opponent', onOpponentCardClick),
    [opponentCards, onOpponentCardClick, shakingTargets, attackingCard, isPlayerTurn, isInteractionDisabled, allowDisabledCardClick, validTargetIds]
  );

  const playerRowRef = useRef<HTMLDivElement>(null);

  const playerCardCount = Math.min(playerCards.length, MAX_SLOTS);
  const opponentCardCount = Math.min(opponentCards.length, MAX_SLOTS);
  const isBoardFull = playerCards.length >= MAX_SLOTS;
  const showGaps = showPositionPicker && !isBoardFull && showPlayer;

  const [hoveredGap, setHoveredGap] = useState(-1);

  const playerSlotsWithGaps = useMemo(() => {
    if (!showGaps) return playerSlots;
    const result: React.ReactNode[] = [];
    for (let i = 0; i <= playerCardCount; i++) {
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
  }, [showGaps, showPositionPicker, playerSlots, playerCardCount, hoveredGap, onPositionSelect]);

  const targetClass = targetingMode === 'friendly' ? 'targeting-friendly' : targetingMode === 'enemy' ? 'targeting-enemy' : targetingMode === 'any' ? 'targeting-any' : '';

  return (
    <div
      className={`simple-battlefield ${targetClass}`}
      data-max-slots={MAX_SLOTS}
      data-render-surface={renderSurface}
    >
      <LayoutGroup>
        {showOpponent && (
          <div
            className="bf-row opponent-row"
            aria-label="Opponent's battlefield"
            data-card-count={opponentCardCount}
            data-max-slots={MAX_SLOTS}
          >
            <AnimatePresence>{opponentSlots}</AnimatePresence>
          </div>
        )}

        {showPlayer && (
          <div
            ref={playerRowRef}
            className={`bf-row player-row ${showGaps ? 'dragging' : ''} ${showPositionPicker ? 'position-picking' : ''}`}
            aria-label="Player's battlefield"
            data-card-count={playerCardCount}
            data-max-slots={MAX_SLOTS}
            data-row-mode={showGaps ? 'position-picker' : 'normal'}
          >
            <AnimatePresence>{playerSlotsWithGaps}</AnimatePresence>
          </div>
        )}
      </LayoutGroup>
    </div>
  );
});

export default SimpleBattlefield;
