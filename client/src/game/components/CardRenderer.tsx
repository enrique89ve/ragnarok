/**
 * CardRenderer Component
 * 
 * A pure rendering component for cards that handles only the visual presentation
 * with no transformation or interaction logic.
 * 
 * This component is responsible for:
 * 1. Determining which rendering strategy to use (3D, holographic, etc.)
 * 2. Processing card data into the right format for the renderer
 * 3. Applying visual styles based on card properties (rarity, type, etc.)
 * 4. Handling pure rendering concerns with no game logic
 */

import React from 'react';
import SimpleHolographicCard from './SimpleHolographicCard';
import { CardData, CardInstance } from '../types';
import { CardInstanceWithCardData, isCardInstanceWithCardData } from '../types/interfaceExtensions';
import { getCardDataSafely } from '../utils/cards/cardInstanceAdapter';

interface CardRendererProps {
  // Card data - can be in any format the game uses
  card: CardInstance | CardInstanceWithCardData | CardData;
  
  // Visual configuration options
  renderQuality?: 'high' | 'medium' | 'low';
  use3D?: boolean;
  enableHolographic?: boolean;
  forceHolographic?: boolean;
  
  // Visual state flags
  isPlayable?: boolean;
  isHighlighted?: boolean;
  isInHand?: boolean;
  
  // Container configuration
  className?: string;
  style?: React.CSSProperties;
  
  // Ref forwarding for parent components to access the DOM element
  cardRef?: React.RefObject<HTMLDivElement>;
  
  // Optional ID for card tracking
  cardId?: string;
}

/**
 * Pure rendering component for cards with no transformation logic
 */
export const CardRenderer: React.FC<CardRendererProps> = React.memo(({
  card,
  renderQuality = 'high',
  use3D = true,
  enableHolographic = true,
  forceHolographic = false,
  isPlayable = false,
  isHighlighted = false,
  isInHand = false,
  className = '',
  style = {},
  cardRef,
  cardId,
}) => {
  // Process card data into a consistent format regardless of the input type
  const processedCard = getCardDataSafely(card);
  
  // Get card properties for rendering
  const cardName = processedCard.name || 'Card';
  const cardType = processedCard.type || 'minion';
  const displayAttack = processedCard.attack;
  const displayHealth = processedCard.health || (processedCard as any).currentHealth;
  const displayManaCost = processedCard.manaCost;
  
  // Card rarity information
  const cardRarity = (processedCard.rarity || 'common').toLowerCase();
  const isLegendary = cardRarity === 'mythic';
  const isEpic = cardRarity === 'epic';
  
  // Container style (visual only - no transformations)
  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    position: 'relative',
    borderRadius: '8px',
    overflow: 'visible',
    ...style
  };
  
  return (
    <div 
      ref={cardRef}
      className={`card-renderer ${className}`}
      style={containerStyle}
      data-card-id={processedCard.id}
      data-card-name={cardName}
      data-card-type={cardType}
      data-rendering-mode={use3D ? '3d' : '2d'}
      data-card-quality={renderQuality}
    >
      {use3D ? (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          {/* Use SimpleHolographicCard for consistent 3D rendering */}
          <SimpleHolographicCard 
            card={{
              id: typeof processedCard.id === 'string' ? parseInt(processedCard.id, 10) : (processedCard.id as number),
              name: cardName,
              manaCost: displayManaCost || 0,
              attack: displayAttack,
              health: displayHealth,
              type: cardType,
              rarity: cardRarity || 'common',
              class: processedCard.class || "Neutral",
              description: processedCard.description || ""
            }}
            enableHolographic={enableHolographic}
            forceHolographic={forceHolographic}
            showDebugOverlay={false}
            effectIntensity={1.0}
          />

          {/* Visual indicators for card state */}
          {(isPlayable || isHighlighted) && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: `2px solid ${
                isPlayable ? 'rgba(34, 197, 94, 0.8)' : 
                isHighlighted ? 'rgba(234, 179, 8, 0.8)' : 'transparent'
              }`,
              borderRadius: '8px',
              boxShadow: `0 0 10px ${
                isPlayable ? 'rgba(34, 197, 94, 0.5)' : 
                isHighlighted ? 'rgba(234, 179, 8, 0.5)' : 'transparent'
              }`,
              pointerEvents: 'none',
              zIndex: 10
            }}/>
          )}
        </div>
      ) : (
        // Fallback 2D rendering (simplified)
        <div className="card-2d-fallback" style={{ 
          width: '100%', 
          height: '100%', 
          background: 'linear-gradient(135deg, #3b82f6, #1e40af)',
          borderRadius: '8px',
          border: '2px solid #f59e0b',
          boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          color: 'white',
          textAlign: 'center',
          padding: '10px',
          position: 'relative'
        }}>
          {/* Mana cost */}
          {displayManaCost !== undefined && (
            <div style={{
              position: 'absolute',
              top: '5px',
              left: '5px',
              width: '25px',
              height: '25px',
              borderRadius: '50%',
              backgroundColor: '#1e40af',
              border: '2px solid #42a5f5',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '12px'
            }}>
              {displayManaCost}
            </div>
          )}
          
          {/* Card name */}
          <div style={{ 
            fontSize: '16px', 
            fontWeight: 'bold',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)'
          }}>
            {cardName}
          </div>
          
          {/* Card description */}
          <div style={{ 
            fontSize: '12px', 
            marginTop: '5px',
            padding: '2px 5px',
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '4px',
            maxHeight: '40px',
            overflow: 'hidden'
          }}>
            {processedCard.description || 'No description'}
          </div>
          
          {/* Attack/Health stats */}
          {displayAttack !== undefined && displayHealth !== undefined && (
            <div style={{ 
              marginTop: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
              padding: '0 10px'
            }}>
              <span style={{ 
                background: '#fbbf24', 
                padding: '5px', 
                borderRadius: '50%', 
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold'
              }}>
                {displayAttack}
              </span>
              <span style={{ 
                background: '#34d399', 
                padding: '5px', 
                borderRadius: '50%',
                width: '24px',
                height: '24px', 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold'
              }}>
                {displayHealth}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default CardRenderer;