import { describe, expect, it } from 'vitest';
import type { ChessPiece } from '../../types/ChessTypes';
import {
  containsPosition,
  getBlockedPieceMessage,
  getBoardHighlightKind,
  getCellClickAction,
  getLosingKingId,
  hasNoLegalMoves,
  shouldShowEnemyHoverPreview,
} from './chessBoardInteractionRules';

function makePiece(input: Partial<ChessPiece> & Pick<ChessPiece, 'id' | 'type' | 'owner'>): ChessPiece {
  return {
    position: { row: 0, col: 0 },
    health: 100,
    maxHealth: 100,
    stamina: 10,
    heroClass: 'neutral',
    heroName: `${input.owner} ${input.type}`,
    deckCardIds: [],
    hasSpells: false,
    hasMoved: false,
    element: 'neutral',
    ...input,
  };
}

describe('chessBoardInteractionRules', () => {
  it('checks positions by board coordinates', () => {
    expect(containsPosition([{ row: 1, col: 2 }], 1, 2)).toBe(true);
    expect(containsPosition([{ row: 1, col: 2 }], 2, 1)).toBe(false);
  });

  it('detects blocked pieces from move and attack lists', () => {
    expect(hasNoLegalMoves({ moves: [], attacks: [] })).toBe(true);
    expect(hasNoLegalMoves({ moves: [{ row: 1, col: 1 }], attacks: [] })).toBe(false);
  });

  it('uses hover preview as an exclusive highlight source', () => {
    const selectedSource = {
      moves: [{ row: 1, col: 1 }],
      attacks: [{ row: 1, col: 2 }],
    };
    const hoverPreviewSource = {
      moves: [{ row: 4, col: 4 }],
      attacks: [{ row: 4, col: 3 }],
    };

    expect(getBoardHighlightKind({
      row: 1,
      col: 1,
      selectedSource,
      hoverPreviewSource,
    })).toBe('none');
    expect(getBoardHighlightKind({
      row: 1,
      col: 2,
      selectedSource,
      hoverPreviewSource,
    })).toBe('none');
    expect(getBoardHighlightKind({
      row: 4,
      col: 4,
      selectedSource,
      hoverPreviewSource,
    })).toBe('move');
    expect(getBoardHighlightKind({
      row: 4,
      col: 3,
      selectedSource,
      hoverPreviewSource,
    })).toBe('attack');
  });

  it('keeps selected attack targets visible when hover preview is not active', () => {
    const selectedSource = {
      moves: [],
      attacks: [{ row: 4, col: 3 }],
    };

    expect(getBoardHighlightKind({
      row: 4,
      col: 3,
      selectedSource,
      hoverPreviewSource: null,
    })).toBe('attack');
  });

  it('does not show enemy hover preview on a selected attack target', () => {
    expect(shouldShowEnemyHoverPreview({
      row: 4,
      col: 3,
      selectedSource: {
        moves: [{ row: 3, col: 3 }],
        attacks: [{ row: 4, col: 3 }],
      },
    })).toBe(false);

    expect(shouldShowEnemyHoverPreview({
      row: 5,
      col: 3,
      selectedSource: {
        moves: [{ row: 3, col: 3 }],
        attacks: [{ row: 4, col: 3 }],
      },
    })).toBe(true);
  });

  it('selects the losing king for terminal board states', () => {
    const playerKing = makePiece({ id: 'player-king', type: 'king', owner: 'player' });
    const opponentKing = makePiece({ id: 'opponent-king', type: 'king', owner: 'opponent' });

    expect(getLosingKingId({ gameStatus: 'player_wins', pieces: [playerKing, opponentKing] })).toBe('opponent-king');
    expect(getLosingKingId({ gameStatus: 'opponent_wins', pieces: [playerKing, opponentKing] })).toBe('player-king');
    expect(getLosingKingId({ gameStatus: 'playing', pieces: [playerKing, opponentKing] })).toBeNull();
  });

  it('classifies cell clicks without executing game effects', () => {
    const playerQueen = makePiece({ id: 'player-queen', type: 'queen', owner: 'player' });
    const opponentQueen = makePiece({ id: 'opponent-queen', type: 'queen', owner: 'opponent' });

    expect(getCellClickAction({
      disabled: true,
      isPlacementMode: false,
      isValidMove: false,
      isAttackMove: false,
      pieceAtPosition: null,
      currentTurn: 'player',
      mySide: 'player',
    })).toEqual({ kind: 'ignored' });

    expect(getCellClickAction({
      disabled: true,
      isPlacementMode: true,
      isValidMove: false,
      isAttackMove: false,
      pieceAtPosition: null,
      currentTurn: 'player',
      mySide: 'player',
    })).toEqual({ kind: 'place_mine' });

    expect(getCellClickAction({
      disabled: false,
      isPlacementMode: false,
      isValidMove: true,
      isAttackMove: false,
      pieceAtPosition: null,
      currentTurn: 'player',
      mySide: 'player',
    })).toEqual({ kind: 'move_or_attack' });

    expect(getCellClickAction({
      disabled: false,
      isPlacementMode: false,
      isValidMove: false,
      isAttackMove: false,
      pieceAtPosition: null,
      currentTurn: 'player',
      mySide: 'player',
    })).toEqual({ kind: 'clear_selection' });

    expect(getCellClickAction({
      disabled: false,
      isPlacementMode: false,
      isValidMove: false,
      isAttackMove: false,
      pieceAtPosition: opponentQueen,
      currentTurn: 'player',
      mySide: 'player',
    })).toEqual({ kind: 'ignored' });

    expect(getCellClickAction({
      disabled: false,
      isPlacementMode: false,
      isValidMove: false,
      isAttackMove: false,
      pieceAtPosition: playerQueen,
      currentTurn: 'player',
      mySide: 'player',
    })).toEqual({ kind: 'select_piece', piece: playerQueen });
  });

  it('blocks all gameplay clicks when it is not my turn (symmetric P2P)', () => {
    const opponentPawn = makePiece({ id: 'opp-pawn', type: 'pawn', owner: 'opponent' });
    const playerPawn = makePiece({ id: 'plr-pawn', type: 'pawn', owner: 'player' });

    // Opponent's turn from player viewer: every action collapses to 'ignored'.
    expect(getCellClickAction({
      disabled: false,
      isPlacementMode: false,
      isValidMove: true,
      isAttackMove: false,
      pieceAtPosition: opponentPawn,
      currentTurn: 'opponent',
      mySide: 'player',
    })).toEqual({ kind: 'ignored' });

    expect(getCellClickAction({
      disabled: false,
      isPlacementMode: false,
      isValidMove: false,
      isAttackMove: false,
      pieceAtPosition: opponentPawn,
      currentTurn: 'opponent',
      mySide: 'player',
    })).toEqual({ kind: 'ignored' });

    // Player's turn from opponent viewer: same — symmetric guard.
    expect(getCellClickAction({
      disabled: false,
      isPlacementMode: false,
      isValidMove: false,
      isAttackMove: false,
      pieceAtPosition: playerPawn,
      currentTurn: 'player',
      mySide: 'opponent',
    })).toEqual({ kind: 'ignored' });

    // Placement mode bypasses the turn guard (mine placement is a king
    // ability that can fire on either turn).
    expect(getCellClickAction({
      disabled: false,
      isPlacementMode: true,
      isValidMove: false,
      isAttackMove: false,
      pieceAtPosition: null,
      currentTurn: 'opponent',
      mySide: 'player',
    })).toEqual({ kind: 'place_mine' });
  });

  it('rejects selecting an opponent piece even if currentTurn matches their side', () => {
    const opponentQueen = makePiece({ id: 'opp-queen', type: 'queen', owner: 'opponent' });

    // Defense in depth: even if the turn arithmetic ever drifts and someone's
    // viewer briefly sees currentTurn matching opponent on their own side,
    // the ownership check blocks selection.
    expect(getCellClickAction({
      disabled: false,
      isPlacementMode: false,
      isValidMove: false,
      isAttackMove: false,
      pieceAtPosition: opponentQueen,
      currentTurn: 'player',
      mySide: 'player',
    })).toEqual({ kind: 'ignored' });
  });

  it('keeps blocked-piece copy isolated from the component markup', () => {
    const piece = makePiece({ id: 'blocked-rook', type: 'rook', owner: 'player', heroName: 'Thor' });
    expect(getBlockedPieceMessage(piece)).toBe('Thor is blocked and cannot move!');
  });
});
