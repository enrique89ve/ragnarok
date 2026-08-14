/**
 * ChessCombatSlice - Chess board state and actions
 * 
 * Manages all chess-related gameplay including piece movement, combat, and board state.
 */

import { StateCreator } from 'zustand';
import {
  ChessPiece,
  ChessBoardPosition,
  ChessPlayerSide,
  ChessGameStatus,
  ChessPieceType,
  ChessCollision,
  CombatResult as ChessCombatResult,
  PIECE_BASE_STATS,
  PLAYER_INITIAL_POSITIONS,
  OPPONENT_INITIAL_POSITIONS,
  ArmySelection,
  ElementType
} from '../../types/ChessTypes';
import { NorseElement, NORSE_TO_GAME_ELEMENT } from '../../types/NorseTypes';
import { CHESS_PIECE_HEROES, pieceHasSpells } from '../../data/ChessPieceConfig';
import {
  initialBoardState,
  ChessCombatSlice,
  UnifiedCombatStore,
  type ChessMutationResult
} from './types';
import { debug } from '../../config/debugConfig';
import { createSeededRng, createSeededIdGen } from '../../utils/seededRng';
import { isPieceType, type HeroDeckLoadout } from '../../deck/heroDeckRules';
import {
  getValidMoves as pureGetValidMoves,
  getThreateningPieces as pureGetThreateningPieces,
  isKingInCheck as pureIsKingInCheck,
  isCheckmate as pureIsCheckmate,
  checkPawnPromotion as pureCheckPawnPromotion,
  checkWinCondition as pureCheckWinCondition,
  applyChessAction
} from '@shared/protocol-core/chess';
import type { ChessReduceResult } from '@shared/protocol-core/chess';

export interface ChessAttackResolutionInput {
  attacker: ChessPiece;
  defender: ChessPiece;
  attackerPosition: ChessBoardPosition;
  defenderPosition: ChessBoardPosition;
  isInstantKill: boolean;
}

export function resolveChessAttackIntent(
  getState: () => UnifiedCombatStore,
  setState: (partial: Partial<UnifiedCombatStore>) => void,
  attack: ChessAttackResolutionInput
): ChessMutationResult {
  const state = getState();

  debug.chess(`[Chess] Resolving attack intent: ${attack.attacker.heroName} -> ${attack.defender.heroName}`);

  if (attack.isInstantKill) {
    return state.executeInstantKill(attack.attacker, attack.defender, attack.defenderPosition);
  }

  const mineResult = state.checkAndTriggerMine(
    attack.defenderPosition,
    attack.attacker.owner,
    attack.attacker.id,
    attack.attacker.type
  );
  if (mineResult && mineResult.triggered) {
    debug.chess(`[Chess] Mine triggered before combat! ${attack.attacker.owner} loses ${mineResult.staPenalty} STA`);
    const attackerPiece = getState().boardState.pieces.find(p => p.id === attack.attacker.id);
    if (attackerPiece) {
      const newStamina = Math.max(0, attackerPiece.stamina - mineResult.staPenalty);
      state.updatePieceStamina(attack.attacker.id, newStamina);
    }
  }

  const collision: ChessCollision = {
    attacker: attack.attacker,
    defender: attack.defender,
    attackerPosition: attack.attackerPosition,
    defenderPosition: attack.defenderPosition
  };
  const latestState = getState();

  setState({
    pendingCombat: collision,
    boardState: {
      ...latestState.boardState,
      gameStatus: 'combat'
    }
  });
  return { status: 'applied' };
}

export const createChessCombatSlice: StateCreator<
  UnifiedCombatStore,
  [],
  [],
  ChessCombatSlice
> = (set, get) => ({
  chessPieces: [],
  boardState: initialBoardState,
  pendingCombat: null,
  playerArmy: null,
  opponentArmy: null,
  sharedDeckCardIds: [],
  playerTurnCount: 0,
  _chessRng: null,
  _chessIdGen: null,
  _logCounter: 0,

  incrementPlayerTurn: () => set((s) => ({ playerTurnCount: s.playerTurnCount + 1 })),
  resetPlayerTurnCount: () => set({ playerTurnCount: 0 }),

  initChessWithSeed: (matchSeed: string) => {
    set({
      _chessRng: createSeededRng(matchSeed),
      _chessIdGen: createSeededIdGen(matchSeed, 'chess'),
    });
    debug.chess('[Chess] Seeded RNG/idGen initialized from matchSeed');
  },

  _nextLogTick: (): number => {
    const next = get()._logCounter + 1;
    set({ _logCounter: next });
    return next;
  },

  initializeCombat: (playerPieces, opponentPieces) => {
    set({
      combatPhase: 'CHESS_MOVEMENT',
      chessPieces: [...playerPieces, ...opponentPieces],
      battlefield: {
        playerMinions: [],
        opponentMinions: [],
        playerHero: {
          heroId: 'player',
          name: 'Player',
          health: 100,
          maxHealth: 100,
          armor: 0,
          attack: 0,
          ownerId: 'player',
        },
        opponentHero: {
          heroId: 'opponent',
          name: 'Opponent',
          health: 100,
          maxHealth: 100,
          armor: 0,
          attack: 0,
          ownerId: 'opponent',
        },
      },
      sharedDeck: {
        remainingCards: [],
        burnedCards: [],
        dealtToPlayer: [],
        dealtToOpponent: [],
      },
      combatLog: [],
    });
  },

  initializeBoard: (
    playerArmy: ArmySelection,
    opponentArmy: ArmySelection,
    idGen: () => string,
    playerDeckLoadout?: HeroDeckLoadout,
  ) => {
    const pieces: ChessPiece[] = [];

    const createPiece = (
      type: ChessPieceType,
      owner: ChessPlayerSide,
      position: ChessBoardPosition,
      army: ArmySelection
    ): ChessPiece => {
      const stats = PIECE_BASE_STATS[type];
      let hero = type === 'pawn'
        ? CHESS_PIECE_HEROES.pawn[0]
        : army[type as keyof ArmySelection];

      const heroElement = hero.element as NorseElement | undefined;
      const gameElement: ElementType = heroElement
        ? NORSE_TO_GAME_ELEMENT[heroElement]
        : 'neutral';
      const deckCardIds = owner === 'player' && isPieceType(type) && playerDeckLoadout
        ? [...playerDeckLoadout[type]]
        : [];

      return {
        id: idGen(),
        type,
        owner,
        position,
        health: stats.baseHealth,
        maxHealth: stats.baseHealth,
        stamina: Math.floor(stats.baseHealth / 10),
        heroClass: hero.heroClass,
        heroName: hero.name,
        heroId: hero.id,
        deckCardIds,
        fixedCards: hero.fixedCardIds,
        hasSpells: pieceHasSpells(type),
        hasMoved: false,
        element: gameElement
      };
    };

    PLAYER_INITIAL_POSITIONS.forEach(pos => {
      pieces.push(createPiece(
        pos.type,
        'player',
        { row: pos.row, col: pos.col },
        playerArmy
      ));
    });

    OPPONENT_INITIAL_POSITIONS.forEach(pos => {
      pieces.push(createPiece(
        pos.type,
        'opponent',
        { row: pos.row, col: pos.col },
        opponentArmy
      ));
    });

    set({
      boardState: {
        pieces,
        currentTurn: 'player',
        selectedPiece: null,
        validMoves: [],
        attackMoves: [],
        gameStatus: 'playing',
        moveCount: 0,
        inCheck: null
      },
      playerArmy,
      opponentArmy,
      pendingCombat: null
    });
    get().clearChessAnimations();
  },

  selectPiece: (piece: ChessPiece | null) => {
    const state = get();
    
    if (!piece) {
      set({
        boardState: {
          ...state.boardState,
          selectedPiece: null,
          validMoves: [],
          attackMoves: []
        }
      });
      return;
    }
    
    if (piece.owner !== state.boardState.currentTurn) {
      return;
    }
    
    const { moves, attacks } = state.getValidMoves(piece);
    
    set({
      boardState: {
        ...state.boardState,
        selectedPiece: piece,
        validMoves: moves,
        attackMoves: attacks
      }
    });
  },

  executeMove: (from: ChessBoardPosition, to: ChessBoardPosition) => {
    const state = get();
    const piece = state.boardState.pieces.find(
      p => p.position.row === from.row && p.position.col === from.col
    );

    if (!piece) return { status: 'rejected', reason: 'no-such-piece' };

    const result: ChessReduceResult<ChessPiece> = applyChessAction(
      state.boardState,
      { kind: 'move', pieceId: piece.id, to }
    );
    if (!result.ok) {
      debug.chess(`[Chess] executeMove rejected by reducer: ${result.reason}`);
      return { status: 'rejected', reason: result.reason };
    }

    set({
      boardState: {
        ...state.boardState,
        ...result.state,
        selectedPiece: null,
        validMoves: [],
        attackMoves: []
      }
    });

    state.incrementAllStamina();
    
    // Check for mine trigger (King Divine Command System)
    // Note: Only hero pieces (Queen, Rook, Bishop, Knight) can trigger mines.
    // Pawns and Kings use instant-kill resolution and bypass the mine system.
    const mineResult = state.checkAndTriggerMine(to, piece.owner, piece.id, piece.type);
    if (mineResult && mineResult.triggered) {
      debug.chess(`[Chess] Mine triggered! ${piece.owner} loses ${mineResult.staPenalty} STA`);
      const movedPieceForMine = get().boardState.pieces.find(p => p.id === piece.id);
      if (movedPieceForMine) {
        const newStamina = Math.max(0, movedPieceForMine.stamina - mineResult.staPenalty);
        state.updatePieceStamina(piece.id, newStamina);
      }
    }
    
    const movedPiece = get().boardState.pieces.find(p => p.id === piece.id);
    if (movedPiece && state.checkPawnPromotion(movedPiece)) {
      debug.chess(`[Chess] Pawn promoted to Queen at (${to.row}, ${to.col})`);
      state.promotePawn(movedPiece.id, 'queen');
    }
    
    state.updateCheckStatus();
    
    if (get().boardState.gameStatus === 'playing') {
      state.nextTurn();
    }
    return { status: 'applied' };
  },

  executeInstantKill: (attacker: ChessPiece, defender: ChessPiece, targetPosition: ChessBoardPosition) => {
    const state = get();

    debug.chess(`[Chess] Executing instant kill: ${attacker.heroName} -> ${defender.heroName}`);

    const result: ChessReduceResult<ChessPiece> = applyChessAction(state.boardState, {
      kind: 'capture',
      attackerId: attacker.id,
      victimId: defender.id,
      to: targetPosition
    });
    if (!result.ok) {
      debug.chess(`[Chess] executeInstantKill rejected by reducer: ${result.reason}`);
      return { status: 'rejected', reason: result.reason };
    }

    state.recordInstantKill(targetPosition, attacker.type);
    set({
      boardState: {
        ...state.boardState,
        ...result.state,
        selectedPiece: null,
        validMoves: [],
        attackMoves: []
      }
    });

    state.incrementAllStamina();

    const mineResult = state.checkAndTriggerMine(targetPosition, attacker.owner, attacker.id, attacker.type);
    if (mineResult && mineResult.triggered) {
      debug.chess(`[Chess] Mine triggered after instant kill! ${attacker.owner} loses ${mineResult.staPenalty} STA`);
      const attackerPiece = get().boardState.pieces.find(p => p.id === attacker.id);
      if (attackerPiece) {
        const newStamina = Math.max(0, attackerPiece.stamina - mineResult.staPenalty);
        state.updatePieceStamina(attacker.id, newStamina);
      }
    }

    const movedPiece = get().boardState.pieces.find(p => p.id === attacker.id);
    if (movedPiece && state.checkPawnPromotion(movedPiece)) {
      debug.chess(`[Chess] Pawn promoted to Queen after instant kill at (${targetPosition.row}, ${targetPosition.col})`);
      state.promotePawn(movedPiece.id, 'queen');
    }

    state.updateCheckStatus();
    
    if (get().boardState.gameStatus === 'playing') {
      state.nextTurn();
    }
    
    const instantKillTick = get()._nextLogTick();
    get().addLogEntry({
      id: `instant_kill_${instantKillTick}`,
      timestamp: instantKillTick,
      type: 'attack',
      message: `${attacker.heroName} instantly killed ${defender.heroName}`
    });
    return { status: 'applied' };
  },

  // Thin wrapper. Rule logic lives in shared/protocol-core/chess (portable,
  // testable, no Zustand). Slice signature unchanged so consumers don't move.
  getValidMoves: (piece: ChessPiece) => pureGetValidMoves(piece, get().boardState.pieces),

  getPieceAt: (position: ChessBoardPosition): ChessPiece | null => {
    const state = get();
    return state.boardState.pieces.find(
      p => p.position.row === position.row && p.position.col === position.col
    ) || null;
  },

  beginChessAttack: (attacker: ChessPiece, defender: ChessPiece, isInstantKill: boolean) => {
    const validation = applyChessAction(get().boardState, {
      kind: 'capture',
      attackerId: attacker.id,
      victimId: defender.id,
      to: defender.position
    });
    if (!validation.ok) {
      debug.chess(`[Chess] beginChessAttack rejected by reducer: ${validation.reason}`);
      return { status: 'rejected', reason: validation.reason };
    }
    const attack: ChessAttackResolutionInput = {
      attacker,
      defender,
      attackerPosition: { ...attacker.position },
      defenderPosition: { ...defender.position },
      isInstantKill
    };

    get().startAttackAnimation(attacker, defender, isInstantKill);
    return resolveChessAttackIntent(get, set, attack);
  },

  getThreateningPieces: (kingPosition: ChessBoardPosition, attackerSide: ChessPlayerSide, pieces?: ChessPiece[]): ChessPiece[] =>
    pureGetThreateningPieces(kingPosition, attackerSide, pieces ?? get().boardState.pieces),

  isKingInCheck: (side: ChessPlayerSide, pieces?: ChessPiece[]): boolean =>
    pureIsKingInCheck(side, pieces ?? get().boardState.pieces),

  isCheckmate: (side: ChessPlayerSide): boolean => {
    const mate = pureIsCheckmate(side, get().boardState.pieces);
    if (mate) debug.chess(`[Chess] CHECKMATE! ${side} has no legal moves while in check`);
    return mate;
  },

  updateCheckStatus: () => {
    const state = get();
    
    const playerInCheck = state.isKingInCheck('player');
    const opponentInCheck = state.isKingInCheck('opponent');
    
    let newCheckStatus: ChessPlayerSide | null = null;
    if (playerInCheck) newCheckStatus = 'player';
    else if (opponentInCheck) newCheckStatus = 'opponent';
    
    if (playerInCheck && state.isCheckmate('player')) {
      debug.chess('[Chess] Player is checkmated - opponent wins');
      set({
        boardState: {
          ...state.boardState,
          inCheck: 'player',
          gameStatus: 'opponent_wins'
        }
      });
      return;
    }
    
    if (opponentInCheck && state.isCheckmate('opponent')) {
      debug.chess('[Chess] Opponent is checkmated - player wins');
      set({
        boardState: {
          ...state.boardState,
          inCheck: 'opponent',
          gameStatus: 'player_wins'
        }
      });
      return;
    }
    
    if (newCheckStatus) {
      debug.chess(`[Chess] CHECK! ${newCheckStatus}'s King is under attack`);
    }
    
    set({
      boardState: {
        ...state.boardState,
        inCheck: newCheckStatus
      }
    });
  },

  checkPawnPromotion: (piece: ChessPiece): boolean => pureCheckPawnPromotion(piece),

  promotePawn: (pieceId: string, newType: ChessPieceType) => {
    const state = get();
    const piece = state.boardState.pieces.find(p => p.id === pieceId);
    if (!piece) return;

    const result: ChessReduceResult<ChessPiece> = applyChessAction(
      state.boardState,
      { kind: 'promote', pieceId, to: newType }
    );
    if (!result.ok) {
      debug.chess(`[Chess] promotePawn rejected by reducer: ${result.reason}`);
      return;
    }

    const newStats = PIECE_BASE_STATS[newType];
    const army = piece.owner === 'player' ? state.playerArmy : state.opponentArmy;
    const queenHero = army?.queen || CHESS_PIECE_HEROES.queen[0];
    const heroElement = queenHero.element as NorseElement | undefined;
    const gameElement: ElementType = heroElement
      ? NORSE_TO_GAME_ELEMENT[heroElement]
      : 'neutral';

    set({
      boardState: {
        ...state.boardState,
        ...result.state,
        pieces: result.state.pieces.map(p => {
          if (p.id === pieceId) {
            return {
              ...p,
              health: newStats.baseHealth,
              maxHealth: newStats.baseHealth,
              hasSpells: newStats.hasSpells,
              heroClass: queenHero.heroClass,
              heroName: queenHero.name,
              heroId: queenHero.id,
              fixedCards: queenHero.fixedCardIds,
              element: gameElement
            };
          }
          return p;
        })
      }
    });
  },

  movePiece: (pieceIdOrPosition: string | ChessBoardPosition, newPosition?: { row: number; col: number }): ChessCollision | null | void => {
    if (typeof pieceIdOrPosition === 'string' && newPosition) {
      set({
        chessPieces: get().chessPieces.map((piece) =>
          piece.id === pieceIdOrPosition
            ? { ...piece, position: newPosition, hasMoved: true }
            : piece
        ),
      });
      return;
    }
    
    const to = pieceIdOrPosition as ChessBoardPosition;
    const state = get();
    const { selectedPiece, validMoves, attackMoves } = state.boardState;

    if (!selectedPiece) return null;
    
    if (state.pendingAttackAnimation) {
      debug.chess('[Chess] Move blocked - attack animation in progress');
      return null;
    }

    const isValidMove = validMoves.some(m => m.row === to.row && m.col === to.col);
    const isAttackMove = attackMoves.some(m => m.row === to.row && m.col === to.col);

    if (!isValidMove && !isAttackMove) return null;

    if (isAttackMove) {
      const defender = state.getPieceAt(to);
      if (defender) {
        const collision: ChessCollision = {
          attacker: selectedPiece,
          defender,
          attackerPosition: selectedPiece.position,
          defenderPosition: to
        };
        
        const isInstantKillAttacker = selectedPiece.type === 'pawn' || selectedPiece.type === 'king';
        const isInstantKillDefender = defender.type === 'pawn';
        const isInstantKill = isInstantKillAttacker || isInstantKillDefender;
        
        if (isInstantKill) {
          const reason = isInstantKillAttacker
            ? `${selectedPiece.type} uses Valkyrie weapon`
            : `pawn is weak and cannot defend`;
          debug.chess(`[Chess] Instant kill queued: ${selectedPiece.heroName} -> ${defender.heroName} (${reason})`);
          collision.instantKill = true;
        }

        set({
          boardState: {
            ...state.boardState,
            selectedPiece: null,
            validMoves: [],
            attackMoves: []
          }
        });

        state.beginChessAttack(selectedPiece, defender, isInstantKill);

        return collision;
      }
    }

    state.executeMove(selectedPiece.position, to);
    return null;
  },

  capturePiece: (attackerId, targetId) => {
    set({
      chessPieces: get().chessPieces.map((piece) =>
        piece.id === targetId ? { ...piece, isAlive: false } : piece
      ),
    });
    const captureTick = get()._nextLogTick();
    get().addLogEntry({
      id: `capture_${captureTick}`,
      timestamp: captureTick,
      type: 'attack',
      message: `Piece ${attackerId} captured ${targetId}`,
    });
  },

  removePiece: (pieceId: string) => {
    const currentBoardState = get().boardState;
    set({
      boardState: {
        ...currentBoardState,
        pieces: currentBoardState.pieces.filter((p: ChessPiece) => p.id !== pieceId)
      }
    });
  },

  updatePieceHealth: (pieceId: string, newHealth: number) => {
    const currentBoardState = get().boardState;
    set({
      boardState: {
        ...currentBoardState,
        pieces: currentBoardState.pieces.map((p: ChessPiece) => 
          p.id === pieceId ? { ...p, health: Math.max(0, newHealth) } : p
        )
      }
    });
  },

  updatePieceStamina: (pieceId: string, newStamina: number) => {
    const currentBoardState = get().boardState;
    set({
      boardState: {
        ...currentBoardState,
        pieces: currentBoardState.pieces.map((p: ChessPiece) => {
          if (p.id !== pieceId) return p;
          const maxStamina = Math.floor(p.maxHealth / 10);
          return { ...p, stamina: Math.max(0, Math.min(newStamina, maxStamina)) };
        })
      }
    });
  },

  incrementAllStamina: () => {
    const currentBoardState = get().boardState;
    const currentTurn = currentBoardState.currentTurn;
    set({
      boardState: {
        ...currentBoardState,
        pieces: currentBoardState.pieces.map((p: ChessPiece) => {
          if (p.owner !== currentTurn) return p;
          const maxStamina = Math.floor(p.maxHealth / 10);
          return { ...p, stamina: Math.min(p.stamina + 1, maxStamina) };
        })
      }
    });
  },

  nextTurn: () => {
    const state = get();
    const result: ChessReduceResult<ChessPiece> = applyChessAction(
      state.boardState,
      { kind: 'endTurn' }
    );
    if (!result.ok) {
      debug.chess(`[Chess] nextTurn rejected by reducer: ${result.reason}`);
      return;
    }

    set({
      boardState: { ...state.boardState, ...result.state }
    });

    // Clear expired mines at end of turn (King Divine Command System)
    state.clearExpiredMines(state.boardState.moveCount);
  },

  checkWinCondition: (): ChessGameStatus => pureCheckWinCondition(get().boardState.pieces),

  setGameStatus: (status: ChessGameStatus) => {
    const currentBoardState = get().boardState;
    set({
      boardState: {
        ...currentBoardState,
        gameStatus: status
      }
    });
  },

  setSharedDeck: (cardIds: number[]) => {
    set({ sharedDeckCardIds: cardIds });
  },

  clearPendingCombat: () => {
    set({ pendingCombat: null });
  },

  completeAttackAnimation: () => {
    const state = get();
    const animation = state.pendingAttackAnimation;

    if (!animation) {
      debug.chess('[Chess] No pending animation to clear');
      return;
    }

    debug.chess(`[Chess] Clearing attack animation marker: ${animation.attacker.heroName} -> ${animation.defender.heroName}`);
    state.clearAttackAnimation();
  },

  resolveCombat: (result: ChessCombatResult) => {
    const state = get();
    const { pendingCombat } = state;

    if (!pendingCombat) return;

    state.removePiece(result.loser.id);
    state.updatePieceHealth(result.winner.id, result.winnerNewHealth);

    if (result.winner.id === pendingCombat.attacker.id) {
      const updatedPieces = get().boardState.pieces.map(piece => {
        if (piece.id === pendingCombat.attacker.id) {
          return {
            ...piece,
            position: pendingCombat.defenderPosition,
            hasMoved: true
          };
        }
        return piece;
      });
      
      set({
        boardState: {
          ...get().boardState,
          pieces: updatedPieces,
          moveCount: get().boardState.moveCount + 1
        }
      });
      
      get().incrementAllStamina();
      
      const movedPiece = get().boardState.pieces.find(p => p.id === pendingCombat.attacker.id);
      if (movedPiece && get().checkPawnPromotion(movedPiece)) {
        debug.chess(`[Chess] Pawn promoted to Queen after combat at (${movedPiece.position.row}, ${movedPiece.position.col})`);
        get().promotePawn(movedPiece.id, 'queen');
        get().updateCheckStatus();
      }
    }

    const gameStatus = state.checkWinCondition();

    set({
      pendingCombat: null,
      boardState: {
        ...get().boardState,
        gameStatus,
        selectedPiece: null,
        validMoves: [],
        attackMoves: []
      }
    });
    
    get().updateCheckStatus();
    
    if (get().boardState.gameStatus === 'playing') {
      get().nextTurn();
    }
  },

});
