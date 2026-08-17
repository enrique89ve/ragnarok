import { useEffect, useRef } from 'react';
import { CombatPhase, PokerCombatState, PokerCard, PokerHandRank } from '../../types/PokerCombatTypes';
import { initializeCombatEventSubscribers, cleanupCombatEventSubscribers } from '../../services/CombatEventSubscribers';
import { useGameStore } from '../../stores/gameStore';
import {
	emitHandRankAnnounced,
	emitRagnarokTriggered,
	emitShowdownDamage,
	emitStreakAnnounced,
} from '../vfx/events';

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

    // Showdown drama choreography — emitted post-commit for BOTH the
    // match-over (lethal) and next-hand cases so the lethal cue can fire
    // on the killing blow. The handler module owns the timing.
    const playerRank = result.playerHand?.rank || PokerHandRank.HIGH_CARD;
    const opponentRank = result.opponentHand?.rank || PokerHandRank.HIGH_CARD;
    const damage = result.winner === 'player' ? result.opponentDamage : result.playerDamage;

    if (playerRank === PokerHandRank.RAGNAROK || opponentRank === PokerHandRank.RAGNAROK) {
      emitRagnarokTriggered({
        side: playerRank === PokerHandRank.RAGNAROK ? 'player' : 'opponent',
      });
    }
    emitHandRankAnnounced({ side: 'player', rank: playerRank, winner: result.winner });
    emitHandRankAnnounced({ side: 'opponent', rank: opponentRank, winner: result.winner });
    if (result.winner !== 'draw' && (damage || 0) > 0) {
      emitShowdownDamage({
        winner: result.winner,
        damage: damage || 0,
        isLethal: result.playerFinalHealth <= 0 || result.opponentFinalHealth <= 0,
      });
    }
    if (result.winner === 'player' && combatState) {
      const pHP = combatState.player.pet.stats.currentHealth;
      const pMax = combatState.player.pet.stats.maxHealth;
      if (pMax > 0 && pHP / pMax <= 0.2) {
        emitStreakAnnounced({ side: 'player', streak: 0, kind: 'last_stand' });
      }
    }

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
      }
    }
  }, [combatState?.phase, combatState?.player?.isReady, combatState?.opponent?.isReady, isActive, resolveCombat, onShowdownCelebration, onHeroDeath, setResolution, cardGameMulliganActive]);
}
