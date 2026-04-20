import React, { ReactNode, forwardRef, ForwardRefRenderFunction } from 'react';
import './styles/NorseTheme.css';

interface GameAreaContainerProps {
  children?: ReactNode;
  areaType: 'opponent' | 'battlefield' | 'player';
  className?: string;
  style?: React.CSSProperties;
}

/**
 * A specialized container component that enforces strict proportional layouts
 * regardless of screen size. This component uses CSS variables to maintain
 * the 20%/60%/20% vertical distribution between opponent, battlefield, and player areas.
 */
const GameAreaContainerBase: ForwardRefRenderFunction<HTMLDivElement, GameAreaContainerProps> = (props, ref) => {
  const { children, areaType, className = '', style: externalStyle } = props;
  // Determine which CSS variable to use based on area type
  const heightVariable = 
    areaType === 'opponent' ? 'var(--opponent-area-height)' :
    areaType === 'battlefield' ? 'var(--battlefield-height)' :
    'var(--player-area-height)';
  
  // Determine base class names based on area type
  const baseClassName = 
    areaType === 'opponent' ? 'opponent-area-container' :
    areaType === 'battlefield' ? 'battlefield-area-container' :
    'player-area-container';
  
  // Base styles that apply to all container types
  const baseStyles: React.CSSProperties = {
    height: heightVariable,
    width: '100%',
    position: 'relative',
    // FIX: Changed overflow to visible for all areas to prevent cutting off elements
    overflow: 'visible',
    display: 'flex',
    flexDirection: 'column',
    // FIX: Adjusted justification for opponent area to ensure hero isn't cut off
    justifyContent: areaType === 'battlefield' ? 'center' : 'flex-start',
    // Add more specific z-index values from our css variables
    zIndex: areaType === 'battlefield' ? 'var(--z-board)' : 'var(--z-ui)',
    // CRITICAL FIX: Disable pointer events on game area containers to prevent hover issues
    pointerEvents: areaType === 'player' ? 'auto' : 'none', // Special handling for player area
    // CRITICAL FIX: Force default cursor on all game areas
    cursor: 'default',
  };
  
  // Additional specific styles for each area type - borders now handled by CSS classes
  const specificStyles: React.CSSProperties = 
    areaType === 'opponent' ? {
      paddingBottom: '4px',
      // Border styling moved to CSS
    } : 
    areaType === 'battlefield' ? {
      // Norse themed battlefield with dark blue/gray tones and subtle glow
      background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.6) 0%, rgba(51, 65, 85, 0.4) 30%, rgba(51, 65, 85, 0.4) 70%, rgba(30, 41, 59, 0.6) 100%)',
      borderRadius: '12px',
      border: '2px solid rgba(148, 163, 184, 0.3)',
      boxShadow: 'inset 0 0 40px rgba(0, 0, 0, 0.3), 0 4px 20px rgba(0, 0, 0, 0.3)',
    } : {
      paddingTop: '0px', // Removed padding to eliminate wasted space
      // Border styling moved to CSS
    };
  
  // Combine base and specific styles
  const combinedStyles = { ...baseStyles, ...specificStyles, ...externalStyle };
  
  // Special handler for player area to prevent hover effects
  const handlePlayerAreaMouseMove = (e: React.MouseEvent) => {
    // Get all cards with active hover state and force reset them
    document.querySelectorAll('[data-is-hovering="true"]').forEach(card => {
      if (card instanceof HTMLElement) {
        // Reset hover state by dispatching synthetic event
        const mouseOutEvent = new MouseEvent('mouseleave', {
          bubbles: true, 
          cancelable: true,
          view: window
        });
        card.dispatchEvent(mouseOutEvent);
      }
    });
    
    // Stop further propagation of the event
    e.stopPropagation();
  };
  
  return (
    <div 
      className={`${baseClassName} ${className}`} 
      style={combinedStyles}
      data-area-type={areaType}
      ref={ref}
      // Add mouse event handlers for player area
      onMouseMove={areaType === 'player' ? handlePlayerAreaMouseMove : undefined}
    >
      {/* Add a special hover interceptor overlay for the player area to prevent hover effects */}
      {areaType === 'player' && (
        <div 
          className="absolute inset-0 z-50" 
          style={{
            pointerEvents: 'auto',
            cursor: 'default'
          }}
          data-player-area-hover-interceptor="true"
          // Add mousemove handler to the interceptor
          onMouseMove={handlePlayerAreaMouseMove}
        />
      )}
      {children}
    </div>
  );
};

// Create the forwarded ref component
const GameAreaContainer = forwardRef<HTMLDivElement, GameAreaContainerProps>(GameAreaContainerBase);

export default GameAreaContainer;