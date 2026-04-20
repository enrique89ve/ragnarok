import { useEffect } from 'react';
import { addToGraveyard, clearGraveyard, GraveyardMinion } from '../data/cardManagement/graveyardTracker';

/**
 * Hook to handle graveyard tracking
 * 
 * This hook listens for minion death events and updates the graveyard accordingly.
 * It also handles clearing the graveyard when a game ends or restarts.
 * 
 * @param gameState Current game state object 
 */
export const useGraveyardTracking = (gameState: any) => {
  useEffect(() => {
    // Set up event listener for minion death
    const handleMinionDeath = (event: CustomEvent) => {
      const deadMinion = event.detail.minion;
      
      if (deadMinion && deadMinion.type === 'minion') {
        // Convert to GraveyardMinion format
        const graveyardMinion: GraveyardMinion = {
          id: deadMinion.id,
          name: deadMinion.name,
          attack: deadMinion.attack,
          health: deadMinion.health,
          maxHealth: deadMinion.maxHealth,
          type: deadMinion.type,
          race: deadMinion.race,
          manaCost: deadMinion.manaCost,
          keywords: deadMinion.keywords || [],
          effects: {
            battlecry: deadMinion.battlecry,
            deathrattle: deadMinion.deathrattle,
            // Include other effects as needed
          },
          class: deadMinion.class || 'Neutral',
          rarity: deadMinion.rarity || 'common',
          description: deadMinion.description || '',
          flavorText: deadMinion.flavorText || ''
        };
        
        // Add to graveyard
        addToGraveyard(graveyardMinion);
      }
    };
    
    // Listen for custom event when minion dies
    window.addEventListener('minionDeath', handleMinionDeath as EventListener);
    
    // Listen for game end or restart
    const handleGameEnd = () => {
      clearGraveyard();
    };
    
    window.addEventListener('gameEnd', handleGameEnd);
    window.addEventListener('gameStart', handleGameEnd); // Clear at start of new game too
    
    // Clean up listeners on unmount
    return () => {
      window.removeEventListener('minionDeath', handleMinionDeath as EventListener);
      window.removeEventListener('gameEnd', handleGameEnd);
      window.removeEventListener('gameStart', handleGameEnd);
    };
  }, [gameState.gameId]); // Reattach listeners if game ID changes (new game)

  // No return needed - this hook is just for side effects
};