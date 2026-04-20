import { CardData, SpellEffect, GameState, DiscoveryState, CardRarity, CardType, HeroClass } from '../types';
import allCards from '../data/allCards';
// Lazy access to break game-engine <-> game-store circular dependency
const useGameStore = {
	getState: () => ((globalThis as Record<string, unknown>).__ragnarokGameStore as
		{ getState: () => { gameState: GameState } }).getState()
};
import { isMinion, getAttack, getHealth } from './cards/typeGuards';
import { debug } from '../config/debugConfig';
import { MAX_HAND_SIZE } from '../constants/gameConstants';

/**
 * Filter cards based on discovery parameters
 */
export function filterCards(
  cards: CardData[],
  filters: {
    type?: CardType | 'any';
    rarity?: CardRarity | 'any';
    manaCost?: number | 'any';
    manaCostRange?: [number, number] | 'any';
    heroClass?: HeroClass | 'any';
  }
): CardData[] {
  return cards.filter(card => {
    // Filter by card type
    if (filters.type && filters.type !== 'any' && card.type !== filters.type) {
      return false;
    }
    
    // Filter by rarity
    if (filters.rarity && filters.rarity !== 'any' && card.rarity !== filters.rarity) {
      return false;
    }
    
    // Filter by exact mana cost
    if (filters.manaCost && filters.manaCost !== 'any' && card.manaCost !== filters.manaCost) {
      return false;
    }
    
    // Filter by mana cost range
    if (filters.manaCostRange && filters.manaCostRange !== 'any') {
      const [min, max] = filters.manaCostRange;
      const manaCost = card.manaCost ?? 0;
      if (manaCost < min || manaCost > max) {
        return false;
      }
    }
    
    // Filter by hero class (if we had class information on cards)
    if (filters.heroClass && filters.heroClass !== 'any') {
      // Note: In a full implementation, cards would have class information
      // For now, we'll skip this filter since we don't track card classes
    }
    
    return true;
  });
}

/**
 * Get random discovery options based on discovery parameters
 */
export function getDiscoveryOptions(
  amount: number = 3,
  type: CardType | 'any' = 'any',
  heroClass: string = 'any',
  rarity: CardRarity | 'any' = 'any',
  manaCost: number | 'any' = 'any',
  manaCostRange: [number, number] | 'any' = 'any'
): CardData[] {
  // Use the aggregated allCards database (1300+ cards) for all discovery types
  let sourceCards: CardData[] = [];
  if (type === 'spell') {
    sourceCards = allCards.filter(card => card.type === 'spell');
  } else if (type === 'minion') {
    sourceCards = allCards.filter(card => card.type === 'minion');
  } else if (type === 'weapon') {
    sourceCards = allCards.filter(card => card.type === 'weapon');
  } else if (type === 'secret') {
    sourceCards = allCards.filter(card => card.type === 'secret');
  } else {
    sourceCards = allCards;
  }

  // Apply additional filters
  sourceCards = filterCards(sourceCards, {
    type,
    rarity,
    manaCost,
    manaCostRange,
    heroClass: heroClass as HeroClass
  });

  // If we don't have enough cards, reduce the amount
  if (sourceCards.length < amount) {
    amount = sourceCards.length;
  }

  // If we have no cards, return empty array
  if (amount === 0) {
    return [];
  }

  // Get random unique cards
  const result: CardData[] = [];
  const usedIndices = new Set<number>();

  while (result.length < amount && usedIndices.size < sourceCards.length) {
    const randomIndex = Math.floor(Math.random() * sourceCards.length);
    
    if (!usedIndices.has(randomIndex)) {
      usedIndices.add(randomIndex);
      result.push(sourceCards[randomIndex]);
    }
  }

  return result;
}

/**
 * Create a discovery state from a spell effect
 */
export function createDiscoveryFromSpell(
  state: GameState,
  spellEffect: SpellEffect,
  sourceCardId: string
): DiscoveryState {
  // Get discover parameters from the spell
  const discoveryType = spellEffect.discoveryType || 'any';
  const discoveryClass = spellEffect.discoveryClass || 'any';
  const discoveryCount = spellEffect.discoveryCount || 3;
  const discoveryRarity = spellEffect.discoveryRarity || 'any';
  const discoveryManaCost = spellEffect.discoveryManaCost || 'any';
  const discoveryManaCostRange = spellEffect.discoveryManaCostRange || 'any';

  // Get discovery options
  const options = getDiscoveryOptions(
    discoveryCount,
    discoveryType as CardType | 'any',
    discoveryClass as string,
    discoveryRarity,
    discoveryManaCost,
    discoveryManaCostRange
  );

  // Return the discovery state
  return {
    active: true,
    options,
    sourceCardId,
    // Store all options for filtering
    allOptions: [...options],
    // Set initial filters based on the spell effect
    filters: {
      type: discoveryType as CardType | 'any',
      rarity: discoveryRarity,
      manaCost: discoveryManaCost,
      manaCostRange: discoveryManaCostRange,
      heroClass: discoveryClass as HeroClass | 'any'
    },
    callback: (selectedCard: CardData | null) => {
      try {
        // Get the CURRENT game state from the store, not the stale captured state
        const { gameState: currentState } = useGameStore.getState();
        const updatedState = JSON.parse(JSON.stringify(currentState));
        
        if (selectedCard) {
          // Create a unique instance ID for the discovered card
          const instanceId = `discovered_${Date.now()}`;
          
          // Build the card instance
          const cardInstance = {
            instanceId,
            card: selectedCard,
            isPlayed: false,
            canAttack: selectedCard.type === 'minion' ? false : undefined,
            isSummoningSick: selectedCard.type === 'minion' ? true : undefined,
            currentHealth: isMinion(selectedCard) ? getHealth(selectedCard) : undefined,
            hasDivineShield: selectedCard.type === 'minion' && 
                            (selectedCard.keywords?.includes('divine_shield') || false) ? true : undefined,
            attacksPerformed: 0
          };
          
          // Log the selection
          
          // Add the selected card to the player's hand if there's room
          if (updatedState.players.player.hand.length < MAX_HAND_SIZE) {
            updatedState.players.player.hand.push(cardInstance);
          } else {
          }
          
          // Clear the discovery state
          updatedState.discovery = undefined;
          
          return updatedState;
        } else {
          // If no card was selected, just clear the discovery state
          updatedState.discovery = undefined;
          return updatedState;
        }
      } catch (error) {
        // Handle error gracefully
        debug.error('[DISCOVERY] Error in discovery callback:', error);
        
        // Get fresh state and clear discovery
        const { gameState: errorCurrentState } = useGameStore.getState();
        const errorState = JSON.parse(JSON.stringify(errorCurrentState));
        errorState.discovery = undefined;
        return errorState;
      }
    }
  };
}

/**
 * Process a discovery spell effect
 */
export function processDiscovery(
  state: GameState,
  spellEffect: SpellEffect,
  sourceCardId: string
): GameState {
  // First check if the game is over - don't process discovery for game over states
  if (state.gamePhase === 'game_over') {
    return state;
  }
  
  // Store the source card ID in a more reliable way - it's not needed to be in the hand anymore
  // since the card has already been played and removed from hand
  
  // Create the discovery state
  const discoveryState = createDiscoveryFromSpell(state, spellEffect, sourceCardId);
  
  // Special handling for opponent's turn - AI should auto-select a card instead of showing the discovery UI
  if (state.currentTurn === 'opponent') {
    
    // If no options are available, return the state unchanged
    if (discoveryState.options.length === 0) {
      debug.error('No cards available for AI discovery');
      return state;
    }
    
    // Choose a card with higher value/cost for the AI (simple heuristic)
    let bestCardIndex = 0;
    let bestCardValue = -1;
    
    discoveryState.options.forEach((card, index) => {
      // Simple heuristic: prefer higher mana cost cards (typically stronger)
      // This could be enhanced with more sophisticated AI logic
      const cardValue = card.manaCost ?? 0;
      if (cardValue > bestCardValue) {
        bestCardValue = cardValue;
        bestCardIndex = index;
      }
    });
    
    const selectedCard = discoveryState.options[bestCardIndex];
    
    
    // Add the selected card to the opponent's hand
    const createCardInstance = (card: CardData) => {
      return {
        instanceId: `opp-disc-${Math.floor(Math.random() * 10000)}`,
        card: { ...card },
        isPlayed: false,
        isSummoningSick: true,
        hasDivineShield: card.keywords?.includes('divine_shield') || false,
        hasWindfury: card.keywords?.includes('windfury') || false,
        hasTaunt: card.keywords?.includes('taunt') || false,
        hasLifesteal: card.keywords?.includes('lifesteal') || false,
        canAttack: false,
        currentHealth: getHealth(card)
      };
    };
    
    const cardInstance = createCardInstance(selectedCard);
    state.players.opponent.hand.push(cardInstance);
    
    // Return the state without setting up the discovery UI since the AI handled it
    return state;
  }
  
  // For the player's turn, update the game state with the discovery UI
  return {
    ...state,
    discovery: discoveryState
  };
}