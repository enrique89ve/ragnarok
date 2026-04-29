import { useEffect, useRef } from 'react';
import type { CampaignChapter, CampaignMission, Difficulty } from '../../campaign';
import type { RoundFlowState } from '../../flow/round/types';
import type { ChessBoardState, ChessPiece } from '../../types/ChessTypes';
import { debug } from '../../config/debugConfig';
import { useUnifiedCombatStore } from '../../stores/unifiedCombatStore';

type CampaignData = {
  readonly mission: CampaignMission;
  readonly chapter: CampaignChapter;
} | null;

type BossRuleEffectsInput = {
  readonly isCampaign: boolean;
  readonly campaignData: CampaignData;
  readonly campaignDifficulty: Difficulty;
  readonly flowState: RoundFlowState | null;
  readonly boardState: ChessBoardState;
  readonly turnCount: number;
  readonly bossRulesApplied: boolean;
  readonly markBossRulesApplied: () => void;
  readonly updatePieceHealth: (pieceId: string, health: number) => void;
};

function getDifficultyHealthBonus(difficulty: Difficulty): number {
  if (difficulty === 'mythic') return 60;
  if (difficulty === 'heroic') return 30;
  return 0;
}

function getDifficultyPassiveDamage(difficulty: Difficulty): number {
  return difficulty === 'mythic' ? 1 : 0;
}

export function useBossRuleEffects(input: BossRuleEffectsInput): void {
  const bossRulesInitRef = useRef(false);
  const lastBossRuleTurnRef = useRef('');

  useEffect(() => {
    if (!input.isCampaign || !input.campaignData) return;
    if (input.bossRulesApplied || bossRulesInitRef.current) return;

    const store = useUnifiedCombatStore.getState();
    if (store.boardState.pieces.length === 0) return;

    bossRulesInitRef.current = true;

    const rules = input.campaignData.mission.bossRules;
    const bossExtraHealth = rules.find(rule => rule.type === 'extra_health')?.value ?? 0;
    const totalExtraHealth = bossExtraHealth + getDifficultyHealthBonus(input.campaignDifficulty);

    let boostedPieces = [...store.boardState.pieces];

    if (totalExtraHealth > 0) {
      boostedPieces = boostedPieces.map(piece => {
        if (piece.owner !== 'opponent') return piece;

        return {
          ...piece,
          health: piece.health + totalExtraHealth,
          maxHealth: piece.maxHealth + totalExtraHealth,
        };
      });
      debug.chess(`[Boss Rules] Applied +${totalExtraHealth} health to opponent (boss: ${bossExtraHealth})`);
    }

    const extraMana = rules.find(rule => rule.type === 'extra_mana')?.value ?? 0;
    if (extraMana > 0) {
      boostedPieces = boostedPieces.map(piece => {
        if (piece.owner !== 'opponent') return piece;

        const maxStamina = Math.floor(piece.maxHealth / 10) + extraMana;
        return { ...piece, stamina: maxStamina };
      });
      debug.chess(`[Boss Rules] Applied +${extraMana} stamina to opponent pieces`);
    }

    const startMinion = rules.find(rule => rule.type === 'start_with_minion');
    if (startMinion) {
      const emptySpots: number[] = [];

      for (let col = 0; col < 5; col++) {
        if (!boostedPieces.some(piece => piece.position.row === 4 && piece.position.col === col)) {
          emptySpots.push(col);
        }
      }

      if (emptySpots.length > 0) {
        const col = emptySpots[Math.floor(emptySpots.length / 2)];
        const pawnHealth = 100 + totalExtraHealth;
        const extraPawn: ChessPiece = {
          id: crypto.randomUUID(),
          type: 'pawn',
          owner: 'opponent',
          position: { row: 4, col },
          health: pawnHealth,
          maxHealth: pawnHealth,
          stamina: Math.floor(pawnHealth / 10),
          heroClass: 'warrior',
          heroName: 'Boss Minion',
          deckCardIds: [],
          fixedCards: [],
          hasSpells: false,
          hasMoved: false,
          element: 'neutral',
        };

        boostedPieces.push(extraPawn);
        debug.chess(`[Boss Rules] Spawned extra pawn at row 4, col ${col}`);
      }
    }

    useUnifiedCombatStore.setState({
      boardState: { ...store.boardState, pieces: boostedPieces },
    });

    input.markBossRulesApplied();
  }, [
    input.bossRulesApplied,
    input.campaignData,
    input.campaignDifficulty,
    input.isCampaign,
    input.markBossRulesApplied,
  ]);

  useEffect(() => {
    if (!input.isCampaign || !input.campaignData || input.flowState?.tag !== 'chess') return;

    const turnKey = `${input.boardState.currentTurn}-${input.turnCount}`;
    if (lastBossRuleTurnRef.current === turnKey) return;
    lastBossRuleTurnRef.current = turnKey;

    const rules = input.campaignData.mission.bossRules;

    if (input.boardState.currentTurn === 'player') {
      const bossPassive = rules.find(rule => rule.type === 'passive_damage')?.value ?? 0;
      const passiveDamage = bossPassive + getDifficultyPassiveDamage(input.campaignDifficulty);

      if (passiveDamage > 0) {
        const store = useUnifiedCombatStore.getState();
        const playerKing = store.boardState.pieces.find(piece => piece.owner === 'player' && piece.type === 'king');

        if (playerKing) {
          const newHealth = Math.max(1, playerKing.health - passiveDamage);
          input.updatePieceHealth(playerKing.id, newHealth);
          debug.chess(`[Boss Rules] Passive damage: player king takes ${passiveDamage} (HP: ${playerKing.health} -> ${newHealth})`);
        }
      }
    }

    if (input.boardState.currentTurn === 'opponent') {
      const store = useUnifiedCombatStore.getState();
      let pieces = [...store.boardState.pieces];
      let storeChanged = false;

      const bonusDraw = rules.find(rule => rule.type === 'bonus_draw')?.value ?? 0;
      if (bonusDraw > 0) {
        const healAmount = bonusDraw * 15;
        const opponentPieces = pieces.filter(piece => piece.owner === 'opponent' && piece.health < piece.maxHealth);

        if (opponentPieces.length > 0) {
          const mostDamaged = opponentPieces.reduce((current, next) =>
            (current.maxHealth - current.health) > (next.maxHealth - next.health) ? current : next
          );
          const healed = Math.min(mostDamaged.maxHealth, mostDamaged.health + healAmount);
          pieces = pieces.map(piece => piece.id === mostDamaged.id ? { ...piece, health: healed } : piece);
          storeChanged = true;
          debug.chess(`[Boss Rules] Bonus heal: ${mostDamaged.heroName} heals ${healAmount}`);
        }
      }

      const extraMana = rules.find(rule => rule.type === 'extra_mana')?.value ?? 0;
      if (extraMana > 0) {
        pieces = pieces.map(piece => {
          if (piece.owner !== 'opponent') return piece;

          const maxStamina = Math.floor(piece.maxHealth / 10) + extraMana;
          return { ...piece, stamina: Math.min(piece.stamina + extraMana, maxStamina) };
        });
        storeChanged = true;
        debug.chess(`[Boss Rules] Extra stamina: opponent +${extraMana}`);
      }

      if (storeChanged) {
        useUnifiedCombatStore.setState({
          boardState: { ...store.boardState, pieces },
        });
      }
    }
  }, [
    input.boardState.currentTurn,
    input.campaignData,
    input.campaignDifficulty,
    input.flowState,
    input.isCampaign,
    input.turnCount,
    input.updatePieceHealth,
  ]);
}
