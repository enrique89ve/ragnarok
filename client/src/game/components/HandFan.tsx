/**
 * HandFan Component - Clean hand display
 * 
 * Self-contained component using CSS variables for responsive sizing.
 * Uses flexbox with negative margins for tight overlapping fan effect.
 */
import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { CardInstance } from '../types';
import { showStatus } from './ui/GameStatusBanner';
import { playSound } from '../utils/soundUtils';
import { CardInstanceWithCardData } from '../types/interfaceExtensions';
import { adaptCardInstance } from '../utils/cards/cardInstanceAdapter';
import CardWithDrag from './CardWithDrag';
import { Position } from '../types/Position';
import { useElementalBuff } from '../combat/hooks/useElementalBuff';
import { CardDrawAnimation } from './CardDrawAnimation';
import { CardPlayAnimation } from './CardPlayAnimation';
import { MAX_BATTLEFIELD_SIZE } from '../constants/gameConstants';
import './HandFan.css';

interface HandFanProps {
  cards: CardInstance[];
  currentMana: number;
  heroHealth: number;
  isPlayerTurn: boolean;
  onCardPlay?: (card: CardInstance, position?: Position) => void;
  isInteractionDisabled?: boolean;
  registerCardPosition?: (card: CardInstance, position: Position) => void;
  battlefieldRef: React.RefObject<HTMLDivElement>;
  evolveReadyIds?: Set<string>;
  battlefieldCount?: number;
  playerBattlefield?: CardInstance[];
}

const MAX_ROTATION = 4;
const MAX_Y_OFFSET = 15;
const PUSH_AMOUNTS = [0, 35, 20, 10];
const HOVERED_CONTAINER_STYLE: React.CSSProperties = { zIndex: 9000, position: 'relative' };
const NOOP_REGISTER = () => {};

export const HandFan = React.memo<HandFanProps>(({
  cards: originalCards,
  currentMana,
  heroHealth,
  isPlayerTurn,
  onCardPlay,
  isInteractionDisabled = false,
  registerCardPosition,
  battlefieldRef,
  evolveReadyIds,
  battlefieldCount = 0,
  playerBattlefield
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [shakingCardId, setShakingCardId] = useState<string | null>(null);
  const [bloodModeCardId, setBloodModeCardId] = useState<string | null>(null);
  const [drawCounter, setDrawCounter] = useState(0);
  const [playedCardData, setPlayedCardData] = useState<{ name: string; manaCost: number; rarity?: string } | null>(null);
  const [playCounter, setPlayCounter] = useState(0);
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevCardCount = useRef<number>(0);

  const triggerCardShake = (instanceId: string) => {
    if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    setShakingCardId(instanceId);
    shakeTimerRef.current = setTimeout(() => setShakingCardId(null), 450);
  };

  useEffect(() => {
    return () => {
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    };
  }, []);

  const elementalBuff = useElementalBuff();
  const atkBuff = elementalBuff.playerBuff?.attackBonus ?? 0;
  const hpBuff = elementalBuff.playerBuff?.healthBonus ?? 0;

  const adaptedCards = useMemo(() => {
    return originalCards.map(card => {
      if ('instanceId' in card && 'card' in card) {
        return card as CardInstanceWithCardData;
      }
      return adaptCardInstance(card as CardInstance);
    });
  }, [originalCards]);

  useEffect(() => {
    if (adaptedCards.length > prevCardCount.current) {
      playSound('card_draw');
      setDrawCounter(prev => prev + 1);
    }
    prevCardCount.current = adaptedCards.length;
  }, [adaptedCards.length]);

  const playingRef = useRef(false);
  const handleCardPlay = useCallback((card: CardInstanceWithCardData, position?: Position) => {
    if (!onCardPlay || playingRef.current) return;

    const originalCard = originalCards.find(c =>
      card.instanceId === (c as any).instanceId
    );

    if (originalCard) {
      playingRef.current = true;
      const useBlood = bloodModeCardId === card.instanceId && !!(card.card as any)?.bloodPrice;
      if (useBlood) {
        (originalCard as any).payWithBlood = true;
      }
      setPlayedCardData({ name: card.card.name, manaCost: card.card.manaCost || 0, rarity: (card.card as any).rarity });
      setPlayCounter(prev => prev + 1);
      setBloodModeCardId(null);
      playSound('card_play');
      onCardPlay(originalCard, position);
      setTimeout(() => { playingRef.current = false; }, 300);
    }
  }, [onCardPlay, originalCards, bloodModeCardId]);

  const clearHover = useCallback(() => setHoveredIndex(null), []);
  const stableRegisterPosition = registerCardPosition || NOOP_REGISTER;

  const cardCount = adaptedCards.length;
  const centerIndex = (cardCount - 1) / 2;

  const getCardTransform = (index: number): React.CSSProperties => {
    const offset = index - centerIndex;
    const normalizedOffset = cardCount > 1 ? offset / centerIndex : 0;
    
    const rotation = normalizedOffset * MAX_ROTATION;
    const yOffset = Math.abs(normalizedOffset) * MAX_Y_OFFSET;
    
    return {
      transform: `translateY(${yOffset}px) rotate(${rotation}deg)`,
      zIndex: 10 + index
    };
  };

  if (adaptedCards.length === 0) {
    return (
      <div className="hand-fan-container">
        <div className="hand-fan-empty">
          Your hand is empty. End turn to draw a card.
        </div>
      </div>
    );
  }

  // Calculate dynamic positioning for spread effect
  const getCardStyle = (index: number): React.CSSProperties => {
    const baseTransform = getCardTransform(index);
    const isHovered = hoveredIndex === index;
    const springTransition = 'transform 0.35s cubic-bezier(0.34, 1.18, 0.64, 1)';
    const smoothTransition = 'transform 0.3s cubic-bezier(0.19, 1, 0.22, 1)';
    
    // Hovered card gets lifted and scaled - z-index must exceed betting zone (200)
    if (isHovered) {
      return {
        zIndex: 9000,
        transform: 'translateY(-55px) scale(1.25) rotate(0deg)',
        transition: springTransition
      };
    }
    
    // When a card is hovered, push ALL other cards with weighted distance
    if (hoveredIndex !== null) {
      const distance = index - hoveredIndex; // Signed distance (negative = left, positive = right)
      const absDistance = Math.abs(distance);
      
      // Push cards with decreasing intensity based on distance (up to 3 cards away)
      if (absDistance > 0 && absDistance <= 3) {
        const pushDirection = distance < 0 ? -1 : 1;
        const pushAmount = pushDirection * PUSH_AMOUNTS[absDistance];
        
        return {
          ...baseTransform,
          transform: `${baseTransform.transform} translateX(${pushAmount}px)`,
          transition: smoothTransition
        };
      }
    }
    
    return {
      ...baseTransform,
      transition: smoothTransition
    };
  };

  return (
    <div className="hand-fan-container" style={hoveredIndex !== null ? HOVERED_CONTAINER_STYLE : undefined}>
      <CardDrawAnimation drawCount={drawCounter} />
      <CardPlayAnimation playedCard={playedCardData} playCount={playCounter} />
      {adaptedCards.map((card, index) => {
        if (!card || !card.card) return null;
        
        const manaCost = card.card?.manaCost || 0;
        const bloodCost = (card.card as any)?.bloodPrice as number | undefined;
        const isBloodMode = bloodModeCardId === card.instanceId && !!bloodCost;
        const canAffordMana = manaCost <= currentMana;
        const canAffordBlood = !!bloodCost && heroHealth > bloodCost;
        const isMinion = card.card?.type === 'minion';
        const boardFull = isMinion && battlefieldCount >= MAX_BATTLEFIELD_SIZE;

        // Pet evolution prerequisite check — Stage 2/3 pets require preconditions
        const petStage = (card.card as any)?.petStage;
        const isEvolvePet = petStage === 'adept' || petStage === 'master';
        let meetsPetEvolution = true;
        if (isEvolvePet) {
          if (!playerBattlefield || playerBattlefield.length === 0) {
            meetsPetEvolution = false;
          } else {
            const evolvesFromId = (card.card as any)?.evolvesFrom;
            const petFamily = (card.card as any)?.petFamily;
            if (petStage === 'master' && petFamily) {
              meetsPetEvolution = playerBattlefield.some(
                (m: any) => m.card?.petFamily === petFamily && m.card?.petStage === 'adept' && m.petEvolutionMet
              );
            } else if (evolvesFromId) {
              meetsPetEvolution = playerBattlefield.some(
                (m: any) => m.card?.id === evolvesFromId && m.petEvolutionMet
              );
            } else {
              meetsPetEvolution = false;
            }
          }
        }

        const canPlay = isPlayerTurn && !isInteractionDisabled && !boardFull && meetsPetEvolution && (isBloodMode ? canAffordBlood : (canAffordMana || canAffordBlood));
        const isHovered = hoveredIndex === index;
        
        const isShaking = shakingCardId === card.instanceId;
        const isEvolveReady = evolveReadyIds?.has(card.instanceId) ?? false;

        return (
          <div
            key={card.instanceId || card.card.id}
            className={`hand-fan-card ${canPlay ? 'playable' : ''} ${isHovered ? 'is-hovered' : ''} ${isShaking ? 'shake' : ''} ${isBloodMode ? 'blood-mode' : ''} ${isEvolveReady ? 'evolve-ready' : ''} ${isEvolvePet && !meetsPetEvolution ? 'evolution-locked' : ''}`}
            style={getCardStyle(index)}
            tabIndex={0}
            role="button"
            aria-label={`${card.card.name}, ${manaCost} mana`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (canPlay) {
                  handleCardPlay(card);
                } else if (isPlayerTurn && !isInteractionDisabled) {
                  triggerCardShake(card.instanceId);
                  playSound('error');
                  if (isBloodMode && bloodCost) {
                    showStatus(`Need more than ${bloodCost} HP to pay Blood Price`, 'error');
                  } else {
                    const deficit = manaCost - currentMana;
                    if (deficit > 0) {
                      showStatus(bloodCost ? `Need ${deficit} more mana (right-click for Blood Price)` : `Need ${deficit} more mana`, 'error');
                    }
                  }
                }
              }
            }}
            onClick={() => {
              if (!canPlay && isPlayerTurn && !isInteractionDisabled) {
                triggerCardShake(card.instanceId);
                playSound('error');
                if (boardFull) {
                  showStatus('Battlefield is full', 'error');
                } else if (isBloodMode && bloodCost) {
                  showStatus(`Need more than ${bloodCost} HP to pay Blood Price`, 'error');
                } else {
                  const deficit = manaCost - currentMana;
                  if (deficit > 0) {
                    showStatus(bloodCost ? `Need ${deficit} more mana (right-click for Blood Price)` : `Need ${deficit} more mana`, 'error');
                  }
                }
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              if (!bloodCost) return;
              const willBeBloodMode = bloodModeCardId !== card.instanceId;
              setBloodModeCardId(prev => prev === card.instanceId ? null : card.instanceId);
              playSound('card_draw');
              showStatus(willBeBloodMode ? `Blood Price: pay ${bloodCost} HP` : 'Switched to mana payment');
            }}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={clearHover}
          >
            <CardWithDrag
              card={card}
              isInHand={true}
              isPlayable={canPlay}
              onClick={canPlay ? () => handleCardPlay(card) : undefined}
              onValidDrop={canPlay ? (position) => handleCardPlay(card, position) : undefined}
              boardRef={battlefieldRef}
              registerPosition={stableRegisterPosition}
              attackBuff={card.card?.type === 'minion' ? atkBuff : 0}
              healthBuff={card.card?.type === 'minion' ? hpBuff : 0}
            />
          </div>
        );
      })}
    </div>
  );
});

HandFan.displayName = 'HandFan';

export default HandFan;
