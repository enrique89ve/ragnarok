/**
 * Hand Component
 * 
 * Renders the player's hand of cards with premium 3D effects.
 * Uses the card adapter pattern to ensure consistent data handling
 * between different parts of the application.
 * 
 * Uses slot-based layout system from SlotLayout.css for professional TCG styling.
 */
import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { CardInstance, CardData } from '../types';
import { playSound } from '../utils/soundUtils';
import { debug } from '../config/debugConfig';
import { MAX_BATTLEFIELD_SIZE } from '../constants/gameConstants';
import { CardInstanceWithCardData } from '../types/interfaceExtensions';
import { adaptCardInstance } from '../utils/cards/cardInstanceAdapter';
import DirectCardDrag from './DirectCardDrag';
import CardWithDrag from './CardWithDrag';
import { Position } from '../types/Position';
import CardHoverPreview from './CardHoverPreview';
import { useHandArc, getHandCardStyle } from '../hooks/useHandArc';

// Props for the Hand component
interface HandProps {
  cards: CardInstance[];
  currentMana: number;
  isPlayerTurn: boolean;
  onCardPlay?: (card: CardInstance, position?: Position) => void;
  isInteractionDisabled?: boolean;
  registerCardPosition?: (card: CardInstance, position: Position) => void;
  battlefieldRef: React.RefObject<HTMLDivElement>;
  evolveReadyIds?: Set<string>;
  battlefieldCount?: number;
  activeMinionCount?: number;
  playerBattlefield?: any[];
}

const NOOP_REGISTER = () => {};

/**
 * Hand component displays the player's current hand of cards
 */
export const Hand: React.FC<HandProps> = React.memo(({
  cards: originalCards,
  currentMana,
  isPlayerTurn,
  onCardPlay,
  isInteractionDisabled = false,
  registerCardPosition,
  battlefieldRef,
  evolveReadyIds,
  battlefieldCount = 0,
  activeMinionCount = 0,
  playerBattlefield
}) => {
  const [hoveredCard, setHoveredCard] = useState<CardData | null>(null);
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const adaptedCards = useMemo(() => {
    return originalCards.map(card => {
      if ('instanceId' in card && 'card' in card) {
        return card as CardInstanceWithCardData;
      }
      return adaptCardInstance(card as CardInstance);
    });
  }, [originalCards]);

  const cardLookup = useMemo(() => {
    const map = new Map<string, CardInstance>();
    for (const c of originalCards) {
      const id = (c as any).instanceId;
      if (id) map.set(id, c);
    }
    return map;
  }, [originalCards]);

  const handContainerRef = useRef<HTMLDivElement>(null);
  const prevCardCount = useRef<number>(0);

  useEffect(() => {
    if (adaptedCards.length > prevCardCount.current) {
      playSound('card_draw');
    }
    prevCardCount.current = adaptedCards.length;
  }, [adaptedCards.length]);

  const handleCardPlay = useCallback((card: CardInstanceWithCardData, position?: Position) => {
    if (!onCardPlay) return;

    const originalCard = cardLookup.get(card.instanceId);
    if (originalCard) {
      playSound('card_play');
      onCardPlay(originalCard, position);
    }
  }, [onCardPlay, cardLookup]);

  const calculateCardPosition = useCallback((cardElement: HTMLElement, card: CardInstanceWithCardData) => {
    if (!cardElement || !registerCardPosition) return;

    const originalCard = cardLookup.get(card.instanceId);
    if (originalCard && cardElement) {
      const rect = cardElement.getBoundingClientRect();
      registerCardPosition(originalCard, {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      });
    }
  }, [registerCardPosition, cardLookup]);
  
  // Use the professional hand arc calculator for card positioning from SlotLayout system
  const handArcTransforms = useHandArc(adaptedCards.length);

  return (
    <div className="tcg-zone zone-player-hand">
      {adaptedCards.length === 0 ? (
        <div className="text-amber-200 text-sm italic mb-5">
          Your hand is empty. End turn to draw a card.
        </div>
      ) : (
        <div 
          ref={handContainerRef}
          className="hand-container" 
          data-card-count={adaptedCards.length}
          style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}
        >
          {adaptedCards.map((card, index) => {
            if (!card || !card.card) {
              debug.error("Invalid card data in hand:", card);
              return null;
            }
            
            const manaCost = card.card?.manaCost || 0;
            const isMinion = card.card?.type === 'minion';
            const boardFull = isMinion && battlefieldCount >= MAX_BATTLEFIELD_SIZE;

            const sacrificeCost = card.card?.sacrificeCost || 0;
            const meetsSacrifice = sacrificeCost === 0 || activeMinionCount >= sacrificeCost;

            const trioPact = card.card?.trioPact;
            const meetsTrioPact = !trioPact || trioPact.every(
              (reqId: number) => adaptedCards.some(c => c.card?.id === reqId)
            );
            const trioPactBoardOk = trioPact ? true : !boardFull;

            const petStage = (card.card as any)?.petStage;
            const isEvolvePet = petStage === 'adept' || petStage === 'master';
            let meetsPetEvolution = true;
            if (isEvolvePet && playerBattlefield) {
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

            const canPlay = isPlayerTurn &&
                           !isInteractionDisabled &&
                           trioPactBoardOk &&
                           manaCost <= currentMana &&
                           meetsSacrifice &&
                           meetsTrioPact &&
                           meetsPetEvolution;
            
            // Use the professional hand arc transform system
            const transform = handArcTransforms[index];
            const isHovered = hoveredCardIndex === index;
            const cardStyle = transform ? getHandCardStyle(transform, isHovered) : {};
            
            const isEvolveReady = evolveReadyIds?.has(card.instanceId) ?? false;

            return (
              <div
                key={card.instanceId || card.card.id}
                className={`hand-card-wrapper ${canPlay ? 'playable' : ''} ${isEvolveReady ? 'evolve-ready' : ''}`}
                style={{ 
                  '--card-offset-x': `${transform?.xOffset || 0}px`,
                  '--card-offset-y': `${transform?.yOffset || 0}px`,
                  '--card-rotation': `${transform?.rotation || 0}deg`,
                  '--card-z': transform?.zIndex || 10
                } as React.CSSProperties}
                ref={(el) => {
                  if (el && registerCardPosition) {
                    calculateCardPosition(el, card);
                  }
                }}
                data-card-id={card.card.id}
                data-card-instance-id={card.instanceId}
                data-card-name={card.card.name}
                data-can-play={canPlay ? 'true' : 'false'}
                onMouseEnter={(e) => {
                  setHoveredCard(card.card);
                  setHoveredCardIndex(index);
                  setMousePos({ x: e.clientX, y: e.clientY });
                }}
                onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                onMouseLeave={() => {
                  setHoveredCard(null);
                  setHoveredCardIndex(null);
                }}
              >
                <CardWithDrag
                  card={card}
                  isInHand={true}
                  isPlayable={canPlay}
                  onPlay={canPlay ? handleCardPlay : undefined}
                  boardRef={battlefieldRef}
                  registerPosition={registerCardPosition || NOOP_REGISTER}
                />
              </div>
            );
          })}
        </div>
      )}
      
      {/* Card hover preview - shows full description on hover */}
      {hoveredCard && <CardHoverPreview card={hoveredCard} mousePosition={mousePos} />}
    </div>
  );
});

Hand.displayName = 'Hand';

export default Hand;