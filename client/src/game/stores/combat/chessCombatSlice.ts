/**
 * ChessCombatSlice - Chess board state and actions
 * 
 * Manages all chess-related gameplay including piece movement, combat, and board state.
 */

import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { resolveHeroPortrait } from '../../utils/art/artMapping';
import { 
  ChessPiece, 
  ChessBoardPosition, 
  ChessBoardState, 
  ChessPlayerSide,
  ChessGameStatus,
  ChessPieceType,
  ChessCollision,
  CombatResult as ChessCombatResult,
  BOARD_ROWS,
  BOARD_COLS,
  PIECE_MOVEMENT_PATTERNS,
  PIECE_BASE_STATS,
  PLAYER_INITIAL_POSITIONS,
  OPPONENT_INITIAL_POSITIONS,
  ArmySelection,
  ElementType
} from '../../types/ChessTypes';
import { NorseElement, NORSE_TO_GAME_ELEMENT } from '../../types/NorseTypes';
import { CHESS_PIECE_HEROES, pieceHasSpells } from '../../data/ChessPieceConfig';
import { 
  ChessPieceState, 
  InstantKillEvent, 
  PendingAttackAnimation, 
  CombatLogEntry,
  initialBoardState,
  ChessCombatSlice,
  UnifiedCombatStore
} from './types';
import { debug } from '../../config/debugConfig';

export const createChessCombatSlice: StateCreator<
  UnifiedCombatStore,
  [],
  [],
  ChessCombatSlice
> = (set, get) => ({
  chessPieces: [],
  boardState: initialBoardState,
  pendingCombat: null,
  lastInstantKill: null,
  pendingAttackAnimation: null,
  playerArmy: null,
  opponentArmy: null,
  sharedDeckCardIds: [],

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

  initializeBoard: (playerArmy: ArmySelection, opponentArmy: ArmySelection) => {
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
      
      return {
        id: uuidv4(),
        type,
        owner,
        position,
        health: stats.baseHealth,
        maxHealth: stats.baseHealth,
        stamina: Math.floor(stats.baseHealth / 10),
        heroClass: hero.heroClass,
        heroName: hero.name,
        heroPortrait: resolveHeroPortrait(hero.id, hero.portrait),
        deckCardIds: [],
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
      pendingCombat: null,
      lastInstantKill: null,
      pendingAttackAnimation: null
    });
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
    
    if (!piece) return;
    
    const updatedPieces = state.boardState.pieces.map(p => {
      if (p.id === piece.id) {
        return {
          ...p,
          position: to,
          hasMoved: true
        };
      }
      return p;
    });
    
    set({
      boardState: {
        ...state.boardState,
        pieces: updatedPieces,
        selectedPiece: null,
        validMoves: [],
        attackMoves: [],
        moveCount: state.boardState.moveCount + 1
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
  },

  executeInstantKill: (attacker: ChessPiece, defender: ChessPiece, targetPosition: ChessBoardPosition) => {
    const state = get();
    
    debug.chess(`[Chess] Executing instant kill: ${attacker.heroName} -> ${defender.heroName}`);
    
    state.removePiece(defender.id);
    
    const updatedPieces = get().boardState.pieces.map(p => {
      if (p.id === attacker.id) {
        return {
          ...p,
          position: targetPosition,
          hasMoved: true
        };
      }
      return p;
    });
    
    set({
      lastInstantKill: {
        position: targetPosition,
        attackerType: attacker.type,
        timestamp: Date.now()
      },
      boardState: {
        ...get().boardState,
        pieces: updatedPieces,
        selectedPiece: null,
        validMoves: [],
        attackMoves: [],
        moveCount: get().boardState.moveCount + 1
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
    
    const gameStatus = state.checkWinCondition();
    
    set({
      boardState: {
        ...get().boardState,
        gameStatus
      }
    });
    
    state.updateCheckStatus();
    
    if (get().boardState.gameStatus === 'playing') {
      state.nextTurn();
    }
    
    get().addLogEntry({
      id: `instant_kill_${Date.now()}`,
      timestamp: Date.now(),
      type: 'attack',
      message: `${attacker.heroName} instantly killed ${defender.heroName}`
    });
  },

  getValidMoves: (piece: ChessPiece) => {
    const state = get();
    const { pieces } = state.boardState;
    const moves: ChessBoardPosition[] = [];
    const attacks: ChessBoardPosition[] = [];
    
    const pattern = PIECE_MOVEMENT_PATTERNS[piece.type];
    if (!pattern.directions) return { moves, attacks };
    
    const checkPosition = (row: number, col: number): 'empty' | 'ally' | 'enemy' | 'invalid' => {
      if (row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_COLS) {
        return 'invalid';
      }
      const occupant = pieces.find(p => p.position.row === row && p.position.col === col);
      if (!occupant) return 'empty';
      return occupant.owner === piece.owner ? 'ally' : 'enemy';
    };
    
    const wouldLeaveKingInCheck = (targetPos: ChessBoardPosition, isCapture: boolean): boolean => {
      const simulatedPieces = pieces.map(p => {
        if (p.id === piece.id) {
          return { ...p, position: targetPos };
        }
        return p;
      }).filter(p => {
        if (isCapture) {
          const targetPiece = pieces.find(tp => 
            tp.position.row === targetPos.row && tp.position.col === targetPos.col
          );
          if (targetPiece && p.id === targetPiece.id) return false;
        }
        return true;
      });
      
      return state.isKingInCheck(piece.owner, simulatedPieces);
    };
    
    if (piece.type === 'pawn') {
      const forwardDir = piece.owner === 'player' ? 1 : -1;
      
      const oneStep = { row: piece.position.row + forwardDir, col: piece.position.col };
      if (checkPosition(oneStep.row, oneStep.col) === 'empty') {
        moves.push(oneStep);
        
        if (!piece.hasMoved) {
          const twoStep = { row: piece.position.row + 2 * forwardDir, col: piece.position.col };
          if (checkPosition(twoStep.row, twoStep.col) === 'empty') {
            moves.push(twoStep);
          }
        }
      }
      
      const leftAttack = { row: piece.position.row + forwardDir, col: piece.position.col - 1 };
      const rightAttack = { row: piece.position.row + forwardDir, col: piece.position.col + 1 };
      
      if (checkPosition(leftAttack.row, leftAttack.col) === 'enemy') {
        attacks.push(leftAttack);
      }
      if (checkPosition(rightAttack.row, rightAttack.col) === 'enemy') {
        attacks.push(rightAttack);
      }
    } else if (pattern.type === 'line') {
      for (const dir of pattern.directions) {
        let currentRow = piece.position.row + dir.row;
        let currentCol = piece.position.col + dir.col;
        
        while (currentRow >= 0 && currentRow < BOARD_ROWS && currentCol >= 0 && currentCol < BOARD_COLS) {
          const status = checkPosition(currentRow, currentCol);
          
          if (status === 'empty') {
            moves.push({ row: currentRow, col: currentCol });
          } else if (status === 'enemy') {
            attacks.push({ row: currentRow, col: currentCol });
            break;
          } else {
            break;
          }
          
          currentRow += dir.row;
          currentCol += dir.col;
        }
      }
    } else {
      for (const dir of pattern.directions) {
        const targetRow = piece.position.row + dir.row;
        const targetCol = piece.position.col + dir.col;
        const status = checkPosition(targetRow, targetCol);
        
        if (status === 'empty') {
          moves.push({ row: targetRow, col: targetCol });
        } else if (status === 'enemy') {
          attacks.push({ row: targetRow, col: targetCol });
        }
      }
    }

    const safeMoves: ChessBoardPosition[] = [];
    const safeAttacks: ChessBoardPosition[] = [];
    
    for (const move of moves) {
      if (!wouldLeaveKingInCheck(move, false)) {
        safeMoves.push(move);
      }
    }
    
    for (const attack of attacks) {
      if (!wouldLeaveKingInCheck(attack, true)) {
        safeAttacks.push(attack);
      }
    }
    
    // Kings cannot be directly attacked — win condition is checkmate only
    const finalAttacks = safeAttacks.filter(pos => {
      const target = pieces.find(p => p.position.row === pos.row && p.position.col === pos.col);
      return !target || target.type !== 'king';
    });

    return { moves: safeMoves, attacks: finalAttacks };
  },

  getPieceAt: (position: ChessBoardPosition): ChessPiece | null => {
    const state = get();
    return state.boardState.pieces.find(
      p => p.position.row === position.row && p.position.col === position.col
    ) || null;
  },

  getThreateningPieces: (kingPosition: ChessBoardPosition, attackerSide: ChessPlayerSide, pieces?: ChessPiece[]): ChessPiece[] => {
    const state = get();
    const boardPieces = pieces || state.boardState.pieces;
    const threateners: ChessPiece[] = [];
    
    const attackerPieces = boardPieces.filter(p => p.owner === attackerSide);
    
    for (const piece of attackerPieces) {
      const pattern = PIECE_MOVEMENT_PATTERNS[piece.type];
      if (!pattern.directions) continue;
      
      if (piece.type === 'pawn') {
        const forwardDir = piece.owner === 'player' ? 1 : -1;
        const leftAttack = { row: piece.position.row + forwardDir, col: piece.position.col - 1 };
        const rightAttack = { row: piece.position.row + forwardDir, col: piece.position.col + 1 };
        
        if ((leftAttack.row === kingPosition.row && leftAttack.col === kingPosition.col) ||
            (rightAttack.row === kingPosition.row && rightAttack.col === kingPosition.col)) {
          threateners.push(piece);
        }
      } else if (pattern.type === 'line') {
        for (const dir of pattern.directions) {
          let currentRow = piece.position.row + dir.row;
          let currentCol = piece.position.col + dir.col;
          
          while (currentRow >= 0 && currentRow < BOARD_ROWS && currentCol >= 0 && currentCol < BOARD_COLS) {
            if (currentRow === kingPosition.row && currentCol === kingPosition.col) {
              threateners.push(piece);
              break;
            }
            const blockingPiece = boardPieces.find(p => 
              p.position.row === currentRow && p.position.col === currentCol
            );
            if (blockingPiece) break;
            
            currentRow += dir.row;
            currentCol += dir.col;
          }
        }
      } else {
        for (const dir of pattern.directions) {
          const targetRow = piece.position.row + dir.row;
          const targetCol = piece.position.col + dir.col;
          
          if (targetRow === kingPosition.row && targetCol === kingPosition.col) {
            threateners.push(piece);
            break;
          }
        }
      }
    }
    
    return threateners;
  },

  isKingInCheck: (side: ChessPlayerSide, pieces?: ChessPiece[]): boolean => {
    const state = get();
    const boardPieces = pieces || state.boardState.pieces;
    const king = boardPieces.find(p => p.type === 'king' && p.owner === side);
    
    if (!king) return false;
    
    const enemySide = side === 'player' ? 'opponent' : 'player';
    const threateners = state.getThreateningPieces(king.position, enemySide, boardPieces);
    
    return threateners.length > 0;
  },

  isCheckmate: (side: ChessPlayerSide): boolean => {
    const state = get();
    
    if (!state.isKingInCheck(side)) return false;
    
    const sidePieces = state.boardState.pieces.filter(p => p.owner === side);
    
    for (const piece of sidePieces) {
      const { moves, attacks } = state.getValidMoves(piece);
      if (moves.length > 0 || attacks.length > 0) {
        return false;
      }
    }
    
    debug.chess(`[Chess] CHECKMATE! ${side} has no legal moves while in check`);
    return true;
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

  checkPawnPromotion: (piece: ChessPiece): boolean => {
    if (piece.type !== 'pawn') return false;
    if (piece.owner === 'player' && piece.position.row === BOARD_ROWS - 1) return true;
    if (piece.owner === 'opponent' && piece.position.row === 0) return true;
    return false;
  },

  promotePawn: (pieceId: string, newType: ChessPieceType) => {
    const state = get();
    const newStats = PIECE_BASE_STATS[newType];
    const piece = state.boardState.pieces.find(p => p.id === pieceId);
    if (!piece) return;
    
    const army = piece.owner === 'player' ? state.playerArmy : state.opponentArmy;
    const queenHero = army?.queen || CHESS_PIECE_HEROES.queen[0];
    const heroElement = queenHero.element as NorseElement | undefined;
    const gameElement: ElementType = heroElement 
      ? NORSE_TO_GAME_ELEMENT[heroElement] 
      : 'neutral';
    
    set({
      boardState: {
        ...state.boardState,
        pieces: state.boardState.pieces.map(p => {
          if (p.id === pieceId) {
            return {
              ...p,
              type: newType,
              health: newStats.baseHealth,
              maxHealth: newStats.baseHealth,
              hasSpells: newStats.hasSpells,
              heroClass: queenHero.heroClass,
              heroName: queenHero.name,
              heroPortrait: resolveHeroPortrait(queenHero.id, queenHero.portrait),
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
        
        state.startAttackAnimation(selectedPiece, defender, isInstantKill);
        
        set({
          boardState: {
            ...state.boardState,
            selectedPiece: null,
            validMoves: [],
            attackMoves: []
          }
        });
        
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
    get().addLogEntry({
      id: `capture_${Date.now()}`,
      timestamp: Date.now(),
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
    const currentBoardState = state.boardState;
    const newTurn = currentBoardState.currentTurn === 'player' ? 'opponent' : 'player';
    
    set({
      boardState: {
        ...currentBoardState,
        currentTurn: newTurn
      }
    });
    
    // Clear expired mines at end of turn (King Divine Command System)
    state.clearExpiredMines(currentBoardState.moveCount);
  },

  checkWinCondition: (): ChessGameStatus => {
    const state = get();
    const playerKing = state.boardState.pieces.find(
      p => p.type === 'king' && p.owner === 'player'
    );
    const opponentKing = state.boardState.pieces.find(
      p => p.type === 'king' && p.owner === 'opponent'
    );

    if (!opponentKing) return 'player_wins';
    if (!playerKing) return 'opponent_wins';
    return 'playing';
  },

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

  startAttackAnimation: (attacker: ChessPiece, defender: ChessPiece, isInstantKill: boolean) => {
    debug.chess(`[Chess] Starting attack animation: ${attacker.heroName} -> ${defender.heroName} (instant: ${isInstantKill})`);
    set({
      pendingAttackAnimation: {
        attacker,
        defender,
        attackerPosition: { ...attacker.position },
        defenderPosition: { ...defender.position },
        isInstantKill,
        timestamp: Date.now()
      }
    });
  },

  completeAttackAnimation: () => {
    const state = get();
    const animation = state.pendingAttackAnimation;
    
    if (!animation) {
      debug.chess('[Chess] No pending animation to complete');
      return;
    }

    debug.chess(`[Chess] Completing attack animation: ${animation.attacker.heroName} -> ${animation.defender.heroName}`);

    set({ pendingAttackAnimation: null });

    if (animation.isInstantKill) {
      state.executeInstantKill(animation.attacker, animation.defender, animation.defenderPosition);
    } else {
      const mineResult = state.checkAndTriggerMine(
        animation.defenderPosition, 
        animation.attacker.owner, 
        animation.attacker.id, 
        animation.attacker.type
      );
      if (mineResult && mineResult.triggered) {
        debug.chess(`[Chess] Mine triggered before combat! ${animation.attacker.owner} loses ${mineResult.staPenalty} STA`);
        const attackerPiece = get().boardState.pieces.find(p => p.id === animation.attacker.id);
        if (attackerPiece) {
          const newStamina = Math.max(0, attackerPiece.stamina - mineResult.staPenalty);
          state.updatePieceStamina(animation.attacker.id, newStamina);
        }
      }
      
      const collision: ChessCollision = {
        attacker: animation.attacker,
        defender: animation.defender,
        attackerPosition: animation.attackerPosition,
        defenderPosition: animation.defenderPosition
      };
      
      set({ 
        pendingCombat: collision,
        boardState: {
          ...state.boardState,
          gameStatus: 'combat'
        }
      });
    }
  },

  clearAttackAnimation: () => {
    set({ pendingAttackAnimation: null });
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

  executeAITurn: () => {
    const state = get();
    if (state.boardState.currentTurn !== 'opponent') return;
    if (state.boardState.gameStatus !== 'playing') return;

    const pieceValue: Record<ChessPieceType, number> = {
      king: 1000,
      queen: 90,
      rook: 50,
      bishop: 30,
      knight: 30,
      pawn: 10
    };

    const opponentPieces = state.boardState.pieces.filter(p => p.owner === 'opponent');
    
    let bestMove: { piece: ChessPiece; target: ChessBoardPosition; isAttack: boolean; score: number } | null = null;
    let bestNonAttackMove: { piece: ChessPiece; target: ChessBoardPosition; isAttack: boolean; score: number } | null = null;

    for (const piece of opponentPieces) {
      const { moves, attacks } = state.getValidMoves(piece);
      const attackerValue = pieceValue[piece.type];
      const isInstantKillAttacker = piece.type === 'pawn' || piece.type === 'king';
      
      for (const attack of attacks) {
        const targetPiece = state.getPieceAt(attack);
        if (targetPiece) {
          const targetValue = pieceValue[targetPiece.type];
          const isInstantKillDefender = targetPiece.type === 'pawn';
          const isInstantKill = isInstantKillAttacker || isInstantKillDefender;
          
          let score: number;
          if (isInstantKill) {
            const instantKillBonus = isInstantKillAttacker ? 15 : 10;
            score = targetValue + instantKillBonus;
          } else {
            const riskFactor = attackerValue * 0.3;
            score = targetValue - riskFactor;
          }
          
          if (score > 0 && (!bestMove || score > bestMove.score)) {
            bestMove = { piece, target: attack, isAttack: true, score };
          }
        }
      }
      
      for (const move of moves) {
        const forwardBonus = (piece.position.row - move.row) * 2;
        const pawnPushBonus = piece.type === 'pawn' ? 3 : 0;
        const score = 5 + forwardBonus + pawnPushBonus + Math.random() * 3;
        
        if (!bestNonAttackMove || score > bestNonAttackMove.score) {
          bestNonAttackMove = { piece, target: move, isAttack: false, score };
        }
      }
    }

    const finalMove = bestMove || bestNonAttackMove;
    
    if (!finalMove) {
      debug.ai('[AI] No valid moves - stalemate');
      const currentBoardState = get().boardState;
      set({
        boardState: { ...currentBoardState, gameStatus: 'player_wins' as ChessGameStatus }
      });
      return;
    }

    const moveToExecute = finalMove;
    const pieceId = moveToExecute.piece.id;
    state.selectPiece(moveToExecute.piece);

    const attemptMove = () => {
      const currentState = get();
      if (currentState.boardState.gameStatus !== 'playing') return;
      if (currentState.boardState.currentTurn !== 'opponent') return;

      if (currentState.pendingAttackAnimation) {
        debug.ai('[AI] Waiting for animation to complete, retrying in 200ms...');
        setTimeout(attemptMove, 200);
        return;
      }

      const piece = currentState.boardState.pieces.find(p => p.id === pieceId);
      if (!piece) {
        debug.ai('[AI] Piece no longer exists, skipping move');
        return;
      }

      const { moves, attacks } = currentState.getValidMoves(piece);
      const targetStillValid = [...moves, ...attacks].some(
        m => m.row === moveToExecute.target.row && m.col === moveToExecute.target.col
      );
      if (!targetStillValid) {
        debug.ai('[AI] Target no longer valid, recalculating...');
        currentState.selectPiece(null);
        currentState.executeAITurn();
        return;
      }

      currentState.selectPiece(piece);
      const collision = currentState.movePiece(moveToExecute.target);
      if (!collision) {
        debug.ai(`[AI] Moved ${moveToExecute.piece.type} to (${moveToExecute.target.row}, ${moveToExecute.target.col})`);
      } else if (collision.instantKill) {
        debug.ai(`[AI] Instant kill with ${collision.attacker.type} against ${collision.defender.type}`);
      } else {
        debug.ai(`[AI] PvP combat: ${collision.attacker.type} vs ${collision.defender.type}`);
      }
    };
    
    setTimeout(attemptMove, 500);
  },
});
