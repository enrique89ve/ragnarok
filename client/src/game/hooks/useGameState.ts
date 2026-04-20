import { useState, useCallback } from 'react';
import { GameState, CardInstance } from '../types';
import { initializeGame, drawCard, playCard, endTurn } from '../utils/gameUtils';

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>(initializeGame());
  
  // Initialize a new game
  const startNewGame = useCallback(() => {
    setGameState(initializeGame());
  }, []);
  
  // Draw a card for the current player
  const drawCardForCurrentPlayer = useCallback(() => {
    setGameState(state => drawCard(state));
  }, []);
  
  // Play a card from hand to battlefield
  const playCardFromHand = useCallback((cardInstanceId: string) => {
    setGameState(state => playCard(state, cardInstanceId));
  }, []);
  
  // End the current player's turn
  const endCurrentTurn = useCallback(() => {
    setGameState(state => endTurn(state));
  }, []);
  
  return {
    gameState,
    startNewGame,
    drawCardForCurrentPlayer,
    playCardFromHand,
    endCurrentTurn
  };
}
