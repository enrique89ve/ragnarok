/**
 * DynamicAudioLayer.tsx
 * 
 * A specialized component that provides adaptive audio based on game state.
 * This component manages layered audio tracks that dynamically respond to:
 * - Number of minions on board
 * - Player health
 * - Turn count
 * - Card rarity being played
 */

import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useAudio } from '../../lib/stores/useAudio';
import { Howl, Howler } from 'howler';
import { assetPath } from '../utils/assetPath';

const DynamicAudioLayer: React.FC = () => {
  const gameState = useGameStore(s => s.gameState);
  // Just using playSoundEffect as setAmbientVolume is not in the current interface
  const { playSoundEffect } = useAudio();
  
  // Reference for ambient sound tracks
  const ambientTracksRef = useRef<{
    [key: string]: Howl | null
  }>({
    battle: null,
    tension: null,
    victory: null,
    defeat: null
  });
  
  // State to track current playing ambient track
  const [currentAmbient, setCurrentAmbient] = useState<string | null>(null);
  
  // Ref to store target ambient to avoid dependency cycles
  const targetAmbientRef = useRef<string | null>(null);
  
  // Calculate game intensity based on board state
  const calculateGameIntensity = () => {
    if (!gameState || !gameState.players || !gameState.players.player || !gameState.players.opponent) {
      return 'low';
    }
    
    // Count minions on board for both players
    const playerBoardCount = gameState.players.player.battlefield?.length || 0;
    const opponentBoardCount = gameState.players.opponent.battlefield?.length || 0;
    const totalMinions = playerBoardCount + opponentBoardCount;
    
    // Calculate player health percentage with safety checks
    const playerHealth = gameState.players.player.health || 100;
    const playerMaxHealth = gameState.players.player.maxHealth || 100;
    const healthPercentage = playerHealth / playerMaxHealth;
    
    // Use turn count as a factor
    const turnCount = gameState.turnNumber || 0;
    const isLateGame = turnCount > 10;
    const isMidGame = turnCount > 5 && turnCount <= 10;
    
    // Determine intensity based on combined factors
    if (
      (totalMinions >= 5) ||
      (healthPercentage < 0.3) ||
      (isLateGame && totalMinions >= 3)
    ) {
      return 'high';
    } else if (
      (totalMinions >= 3) ||
      (healthPercentage < 0.6) ||
      (isMidGame && totalMinions >= 2) ||
      (isLateGame)
    ) {
      return 'medium';
    }
    
    return 'low';
  };
  
  // Determine appropriate ambient soundtrack based on game state
  const determineAmbientTrack = () => {
    if (!gameState) {
      return 'battle'; // Default to battle if no game state
    }
    
    // If game is over, play victory/defeat
    if (gameState.gamePhase === 'game_over') {
      return gameState.winner === 'player' ? 'victory' : 'defeat';
    }
    
    // During normal gameplay, decide between battle and tension
    const intensity = calculateGameIntensity();
    
    // Use tension track for high intensity moments
    if (intensity === 'high') {
      return 'tension';
    }
    
    // Default to battle track
    return 'battle';
  };
  
  // Initialize ambient tracks
  useEffect(() => {
    // Battle ambient (main gameplay)
    ambientTracksRef.current.battle = new Howl({
      src: [assetPath('/audio/ambient/battle_ambient.mp3')],
      loop: true,
      volume: 0.4,
      preload: false,
      html5: true
    });

    // Tension ambient (low health, many minions, late game)
    ambientTracksRef.current.tension = new Howl({
      src: [assetPath('/audio/ambient/tension_ambient.mp3')],
      loop: true,
      volume: 0.5,
      preload: false,
      html5: true
    });

    // Victory fanfare
    ambientTracksRef.current.victory = new Howl({
      src: [assetPath('/audio/ambient/victory_fanfare.mp3')],
      loop: false,
      volume: 0.6,
      preload: false,
      html5: true
    });

    // Defeat ambient
    ambientTracksRef.current.defeat = new Howl({
      src: [assetPath('/audio/ambient/defeat_ambient.mp3')],
      loop: false,
      volume: 0.5,
      preload: false,
      html5: true
    });

    // Start with battle ambient by default
    if (ambientTracksRef.current.battle) {
      ambientTracksRef.current.battle.once('load', () => {
        ambientTracksRef.current.battle?.play();
      });
      ambientTracksRef.current.battle.load();
      setCurrentAmbient('battle');
    }
    
    // Cleanup on unmount
    return () => {
      // Stop and unload all ambient tracks to release audio buffers
      Object.values(ambientTracksRef.current).forEach(track => {
        if (track) {
          track.stop();
          track.unload();
        }
      });
      setCurrentAmbient(null);
    };
  }, []);
  
  // Update ambient track based on game state changes
  useEffect(() => {
    // Don't update if game state isn't available
    if (!gameState) return;
    
    // Determine what ambient track should be playing
    const targetAmbient = determineAmbientTrack();
    
    // Update the ref with new target
    targetAmbientRef.current = targetAmbient;
    
    // If it's different from current ambient, transition
    if (targetAmbientRef.current !== currentAmbient && ambientTracksRef.current[targetAmbientRef.current]) {
      // Fade out current ambient if any
      if (currentAmbient && ambientTracksRef.current[currentAmbient]) {
        const currentTrack = ambientTracksRef.current[currentAmbient];
        if (currentTrack) {
          const originalVolume = currentTrack.volume();
          currentTrack.fade(originalVolume, 0, 1000);
          setTimeout(() => {
            currentTrack.stop();
          }, 1000);
        }
      }
      
      // Fade in new ambient
      const newTrack = ambientTracksRef.current[targetAmbientRef.current];
      if (newTrack) {
        newTrack.volume(0);
        newTrack.play();
        newTrack.fade(0, targetAmbientRef.current === 'victory' || targetAmbientRef.current === 'defeat' ? 0.6 : 0.4, 1000);
        
        // Update the current ambient state outside of the dependency cycle
        // This breaks the potential infinite loop by using a timeout
        const newAmbient = targetAmbientRef.current;
        setTimeout(() => {
          setCurrentAmbient(newAmbient);
        }, 0);
      }
    }
    
  }, [gameState]); // Remove currentAmbient from dependencies
  
  // Reference to previous game state (at the component level, outside of any hooks)
  const prevStateRef = useRef({
    playerBoardCount: 0,
    opponentBoardCount: 0,
    playerHealth: 100,
    isPlayerTurn: true
  });

  // Dynamic one-shot sound effects based on game state changes
  useEffect(() => {
    if (!gameState || !gameState.players || !gameState.players.player || !gameState.players.opponent) {
      return;
    }
    
    // Extract current state for comparison with safety checks
    const playerBoardCount = gameState.players.player.battlefield?.length || 0;
    const opponentBoardCount = gameState.players.opponent.battlefield?.length || 0;
    const playerHealth = gameState.players.player.health || 100;
    const isPlayerTurn = gameState.currentTurn === 'player';
    
    // Check for low health warning (only play once when crossing threshold)
    if (playerHealth <= 10 && prevStateRef.current.playerHealth > 10) {
      playSoundEffect('damage_hero');
      // Could add visual indicator here
    }
    
    // Check for turn change
    if (isPlayerTurn !== prevStateRef.current.isPlayerTurn) {
      // Play turn change sound based on game progression
      const turnCount = gameState.turnNumber || 0;
      if (turnCount > 10) {
        playSoundEffect('spell_cast');
      } else if (turnCount > 5) {
        playSoundEffect('spell_cast');
      } else {
        playSoundEffect('spell_cast');
      }
    }
    
    // Special case: Both players have 5+ minions - battlefield is getting crowded
    if (playerBoardCount >= 5 && opponentBoardCount >= 5 && 
        (prevStateRef.current.playerBoardCount < 5 || prevStateRef.current.opponentBoardCount < 5)) {
      if (isPlayerTurn) {
        playSoundEffect('spell_cast');
      }
    }
    
    // Update previous state reference
    prevStateRef.current = {
      playerBoardCount,
      opponentBoardCount,
      playerHealth: typeof playerHealth === 'number' ? playerHealth : 100,
      isPlayerTurn
    };
    
  }, [gameState, playSoundEffect]);
  
  // This component has no visual representation
  return null;
};

export default DynamicAudioLayer;