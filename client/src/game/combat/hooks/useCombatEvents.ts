import { useEffect, useRef } from 'react';
import { CombatPhase, PokerCombatState, PokerCard } from '../../types/PokerCombatTypes';
import { initializeCombatEventSubscribers, cleanupCombatEventSubscribers } from '../../services/CombatEventSubscribers';
import { useGameStore } from '../../stores/gameStore';
import { getPokerDramaCallbacks } from './usePokerDrama';

export interface ShowdownCelebration {
  resolution: {
    winner: 'player' | 'opponent' | 'draw';
    resolutionType: 'showdown' | 'fold';
    playerHand: { rank: number; cards: PokerCard[] };
    opponentHand: { rank: number; cards: PokerCard[] };
    whoFolded?: 'player' | 'opponent';
    foldPenalty?: number;
  };
  winningCards: PokerCard[];
}

export interface HeroDeathState {
  isAnimating: boolean;
  deadHeroName: string;
  isPlayerDead: boolean;
  pendingResolution: any;
}

interface UseCombatEventsOptions {
  combatState: PokerCombatState | null;
  isActive: boolean;
  onShowdownCelebration: (celebration: ShowdownCelebration | null) => void;
  onHeroDeath: (deathState: HeroDeathState | null) => void;
  resolveCombat: () => any;
  setResolution: (resolution: any) => void;
}

export function useCombatEvents(options: UseCombatEventsOptions): void {
  const { combatState, isActive, onShowdownCelebration, onHeroDeath, resolveCombat, setResolution } = options;

  const cardGameMulliganActive = useGameStore(state => state.gameState?.mulligan?.active);
  const hasResolvedRef = useRef(false);

  useEffect(() => {
    if (combatState?.phase !== CombatPhase.RESOLUTION) {
      hasResolvedRef.current = false;
    }
  }, [combatState?.phase]);

  useEffect(() => {
    if (!isActive) {
      hasResolvedRef.current = false;
    }
  }, [isActive]);

  useEffect(() => {
    initializeCombatEventSubscribers();

    return () => {
      cleanupCombatEventSubscribers();
    };
  }, []);

  useEffect(() => {
    if (hasResolvedRef.current) return;
    if (!combatState || !isActive) return;
    if (combatState.phase !== CombatPhase.RESOLUTION) return;
    if (cardGameMulliganActive) return;

    const hasFold = !!combatState.foldWinner;
    if (!hasFold && (!combatState.player.isReady || !combatState.opponent.isReady)) {
      return;
    }

    const result = resolveCombat();
    if (!result) return; // Don't lock ref if resolution failed — allow retry
    hasResolvedRef.current = true;
    {
      const matchOver = result.playerFinalHealth <= 0 || result.opponentFinalHealth <= 0;

      if (matchOver) {
        const isPlayerDead = result.playerFinalHealth <= 0;
        const deadHeroName = isPlayerDead
          ? (combatState?.player?.pet?.name || 'Hero')
          : (combatState?.opponent?.pet?.name || 'Enemy');

        onHeroDeath({
          isAnimating: true,
          deadHeroName,
          isPlayerDead,
          pendingResolution: result
        });
      } else {
        setResolution(result);

        const winningCards = result.winner === 'draw'
          ? [...(result.playerHand?.cards || []), ...(result.opponentHand?.cards || [])]
          : result.winner === 'player'
            ? result.playerHand?.cards || []
            : result.opponentHand?.cards || [];

        onShowdownCelebration({
          resolution: {
            winner: result.winner,
            resolutionType: result.resolutionType,
            playerHand: result.playerHand,
            opponentHand: result.opponentHand,
            whoFolded: result.whoFolded,
            foldPenalty: result.foldPenalty
          },
          winningCards
        });

        // Trigger showdown drama VFX
        try {
          const dramaCallbacks = getPokerDramaCallbacks();
          const damage = result.winner === 'player' ? result.opponentDamage : result.playerDamage;
          dramaCallbacks.onShowdown(
            result.playerHand?.rank || 1,
            result.opponentHand?.rank || 1,
            result.winner,
            damage || 0
          );
        } catch { /* drama VFX is non-critical */ }
      }
    }
  }, [combatState?.phase, combatState?.player?.isReady, combatState?.opponent?.isReady, isActive, resolveCombat, onShowdownCelebration, onHeroDeath, setResolution, cardGameMulliganActive]);
}
