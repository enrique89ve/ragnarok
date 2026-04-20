/**
 * UnifiedBattlefieldAttackConnector.tsx
 * 
 * This component connects the battlefield UI with the attack system.
 * It handles the logic of selecting cards for attack and initiating attacks.
 */

import React, { useEffect } from 'react';
import { CardInstance } from '../types';
import { Position } from '../types/Position';
import { useAttackStore } from './attackStore';
import { canCardAttack, isValidAttackTarget } from './attackUtils';
import { useGameStore } from '../stores/gameStore';
import { hasKeyword } from '../utils/cards/keywordUtils';

interface UnifiedBattlefieldAttackConnectorProps {
  playerCards: CardInstance[];
  opponentCards: CardInstance[];
  isPlayerTurn: boolean;
  cardPositions: Record<string, Position>;
  onCardClick: (card: CardInstance) => void;
  onOpponentCardClick: (card: CardInstance) => void;
  onOpponentHeroClick: () => void;
}

const UnifiedBattlefieldAttackConnector: React.FC<UnifiedBattlefieldAttackConnectorProps> = ({
  playerCards,
  opponentCards,
  isPlayerTurn,
  cardPositions,
  onCardClick,
  onOpponentCardClick,
  onOpponentHeroClick
}) => {
  const { attackingCard, isAttackMode, startAttackMode, endAttackMode, completeAttack } = useAttackStore();
  const { gameState } = useGameStore();

  // Reset attack mode when turn changes
  useEffect(() => {
    if (!isPlayerTurn && isAttackMode) {
      endAttackMode();
    }
  }, [isPlayerTurn, isAttackMode, endAttackMode]);

  // Handle click on player's card - potential attacker
  useEffect(() => {
    // Register handlers for player cards
    const handlePlayerCardClick = (card: CardInstance) => {
      
      // Check if this card can attack
      if (isPlayerTurn && canCardAttack(card, isPlayerTurn)) {
        // If we're already in attack mode with this card, toggle it off
        if (isAttackMode && attackingCard?.instanceId === card.instanceId) {
          endAttackMode();
        } else {
          // Start attack mode with this card
          startAttackMode(card);
        }
      } else {
        // If the card can't attack, just pass the click to the normal handler
        onCardClick(card);
      }
    };

    // Register handlers for opponent cards (potential targets)
    const handleOpponentCardClick = (card: CardInstance) => {
      
      if (isAttackMode && attackingCard) {
        // Get taunt minions from opponent's battlefield for target validation
        const opponentBattlefield = gameState?.players?.opponent?.battlefield || [];
        const opponentTauntCards = opponentBattlefield.filter((c: any) =>
          hasKeyword(c, 'taunt')
        );
        
        // Check if this is a valid target
        const isValid = isValidAttackTarget(attackingCard, card, opponentTauntCards as any);
        
        if (isValid) {
          // Complete the attack
          completeAttack(card);
          
          // Call the attack handler from parent
          onOpponentCardClick(card);
        } else {
        }
      } else {
        // Not in attack mode, pass the click to normal handler
        onOpponentCardClick(card);
      }
    };

    // Hook up to the battlefield by setting up event handlers
    // This would be connected to the actual UI components in a full implementation
  }, [isPlayerTurn, isAttackMode, attackingCard, gameState, onCardClick, onOpponentCardClick, startAttackMode, endAttackMode, completeAttack]);
  
  // This component is just a connector and doesn't render any UI
  return null;
};

export default UnifiedBattlefieldAttackConnector;