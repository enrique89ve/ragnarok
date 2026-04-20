/**
 * ErrorBoundaryCard.tsx
 * 
 * A wrapper component that catches errors in card rendering and displays a fallback UI.
 * This prevents transform objects and other invalid card data from breaking the deck builder.
 * 
 * This component has two modes:
 * 1. Collection mode - when used in the deck builder (takes card, count, maxCount, etc.)
 * 2. Generic mode - when used as a wrapper for any card rendering (takes children and fallbackCardData)
 */

import { debug } from '../config/debugConfig';
import React, { useState, useEffect, ReactNode } from 'react';
import { CardData } from '../types';
import CollectionCard from './collection/CollectionCard';
import { isCardEffect } from '../utils/cards/cardTypeAdapter';
import { normalizeCard } from '../utils/cards/cardSchemaValidator';

// Props for collection mode
interface CollectionCardProps {
  card: any; // Using any since we're specifically handling potentially invalid card data
  count?: number;
  maxCount?: number;
  onAdd?: (cardId: number) => void;
  canAdd?: boolean;
  showCardDetails?: (card: CardData) => void;
  children?: never; // Cannot have children in collection mode
  fallbackCardData?: never; // Cannot have fallbackCardData in collection mode
}

// Props for generic mode (wrapper)
interface WrapperProps {
  fallbackCardData: CardData; // Fallback card data in case of error
  children: ReactNode; // Child components to render
  card?: never; // Cannot have card in wrapper mode
  count?: never; // Cannot have count in wrapper mode
  maxCount?: never; // Cannot have maxCount in wrapper mode
  onAdd?: never; // Cannot have onAdd in wrapper mode
  canAdd?: never; // Cannot have canAdd in wrapper mode
  showCardDetails?: never; // Cannot have showCardDetails in wrapper mode
}

// Union type to allow either mode
type ErrorBoundaryCardProps = CollectionCardProps | WrapperProps;

/**
 * Error boundary for card rendering that catches and handles errors
 * when trying to render invalid card data
 */
const ErrorBoundaryCard: React.FC<ErrorBoundaryCardProps> = (props) => {
  const [hasError, setHasError] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string>('');

  // Determine if we're in collection mode or wrapper mode
  const isCollectionMode = 'card' in props;
  
  // Get the card to validate
  const card = isCollectionMode ? props.card : (props.fallbackCardData);
  
  // Extract other props for collection mode
  const restProps = isCollectionMode ? {
    count: props.count || 0,
    maxCount: props.maxCount || 0,
    onAdd: props.onAdd || (() => {}),
    canAdd: props.canAdd || false,
    showCardDetails: props.showCardDetails || (() => {})
  } : {};

  // Validate the card before rendering
  useEffect(() => {
    try {
      // Check for common issues that would cause rendering errors
      if (!card) {
        setHasError(true);
        setErrorInfo('Card is null or undefined');
        return;
      }

      // Check if it's a transform effect object
      if (isCardEffect(card) || 
          (card.type === 'transform') || 
          (card.position !== undefined && card.rotation !== undefined)) {
        setHasError(true);
        setErrorInfo('Invalid card: transform object');
        debug.warn('Transform object detected:', card);
        return;
      }

      // Check for required fields
      if (!card.id || !card.name) {
        setHasError(true);
        setErrorInfo('Invalid card: missing required fields');
        debug.warn('Invalid card data:', card);
        return;
      }

      // If all checks pass, clear any previous error
      setHasError(false);
      setErrorInfo('');
    } catch (err) {
      setHasError(true);
      setErrorInfo(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      debug.error('Error validating card:', err);
    }
  }, [card]);

  // Error handler for React error boundary
  const handleError = (error: Error) => {
    debug.error('ErrorBoundaryCard caught an error:', error);
    setHasError(true);
    setErrorInfo(`Rendering Error: ${error.message}`);
  };

  // Render a fallback UI if there's an error
  if (hasError) {
    return (
      <div className="error-card min-h-[240px] min-w-[180px] h-full block bg-red-900 rounded-lg shadow-lg flex items-center justify-center text-center p-4">
        <div>
          <div className="text-yellow-400 font-bold mb-2">Card Error</div>
          <div className="text-white text-sm">{errorInfo}</div>
        </div>
      </div>
    );
  }

  try {
    // In collection mode, render the CollectionCard
    if (isCollectionMode) {
      return <CollectionCard card={card} {...restProps} />;
    }
    
    // In wrapper mode, render the children
    return <>{props.children}</>;
  } catch (error) {
    // Handle any errors during rendering
    handleError(error as Error);
    return (
      <div className="error-card min-h-[240px] min-w-[180px] h-full block bg-red-900 rounded-lg shadow-lg flex items-center justify-center text-center p-4">
        <div>
          <div className="text-yellow-400 font-bold mb-2">Card Rendering Error</div>
          <div className="text-white text-sm">{errorInfo}</div>
        </div>
      </div>
    );
  }
};

export default ErrorBoundaryCard;