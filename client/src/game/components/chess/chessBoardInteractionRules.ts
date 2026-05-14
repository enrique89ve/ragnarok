import type {
  ChessBoardPosition,
  ChessGameStatus,
  ChessPiece,
  ChessPlayerSide,
} from '../../types/ChessTypes';

export type CellClickAction =
  | { readonly kind: 'ignored' }
  | { readonly kind: 'place_mine' }
  | { readonly kind: 'move_or_attack' }
  | { readonly kind: 'clear_selection' }
  | { readonly kind: 'select_piece'; readonly piece: ChessPiece };

export type BoardHighlightKind = 'none' | 'move' | 'attack';

export interface BoardHighlightSource {
  readonly moves: readonly ChessBoardPosition[];
  readonly attacks: readonly ChessBoardPosition[];
}

export function containsPosition(
  positions: readonly ChessBoardPosition[],
  row: number,
  col: number,
): boolean {
  return positions.some(position => position.row === row && position.col === col);
}

export function getBoardHighlightKind(input: {
  readonly row: number;
  readonly col: number;
  readonly selectedSource: BoardHighlightSource | null;
  readonly hoverPreviewSource: BoardHighlightSource | null;
}): BoardHighlightKind {
  const { row, col, selectedSource, hoverPreviewSource } = input;

  if (hoverPreviewSource) {
    if (containsPosition(hoverPreviewSource.attacks, row, col)) return 'attack';
    if (containsPosition(hoverPreviewSource.moves, row, col)) return 'move';
    return 'none';
  }

  if (selectedSource && containsPosition(selectedSource.attacks, row, col)) return 'attack';
  if (selectedSource && containsPosition(selectedSource.moves, row, col)) return 'move';

  return 'none';
}

export function shouldShowEnemyHoverPreview(input: {
  readonly row: number;
  readonly col: number;
  readonly selectedSource: BoardHighlightSource | null;
}): boolean {
  if (!input.selectedSource) return true;
  return !containsPosition(input.selectedSource.attacks, input.row, input.col);
}

export function hasNoLegalMoves(input: {
  readonly moves: readonly ChessBoardPosition[];
  readonly attacks: readonly ChessBoardPosition[];
}): boolean {
  return input.moves.length === 0 && input.attacks.length === 0;
}

export function getBlockedPieceMessage(piece: ChessPiece): string {
  return `${piece.heroName} is blocked and cannot move!`;
}

export function getLosingKingId(input: {
  readonly gameStatus: ChessGameStatus;
  readonly pieces: readonly ChessPiece[];
}): string | null {
  const { gameStatus, pieces } = input;
  if (gameStatus !== 'player_wins' && gameStatus !== 'opponent_wins') return null;

  const losingSide: ChessPlayerSide = gameStatus === 'player_wins' ? 'opponent' : 'player';
  const losingKing = pieces.find(piece => piece.type === 'king' && piece.owner === losingSide);
  return losingKing?.id ?? null;
}

export function getCellClickAction(input: {
  readonly disabled: boolean;
  readonly isPlacementMode: boolean;
  readonly isValidMove: boolean;
  readonly isAttackMove: boolean;
  readonly pieceAtPosition: ChessPiece | null;
  readonly currentTurn: ChessPlayerSide;
  readonly mySide: ChessPlayerSide;
}): CellClickAction {
  if (input.disabled && !input.isPlacementMode) return { kind: 'ignored' };
  if (input.isPlacementMode) return { kind: 'place_mine' };
  // Symmetric P2P: each peer can only act on its OWN turn. SP keeps the same
  // rule (mySide always 'player', AI takes opponent's turn via executeAITurn).
  if (input.currentTurn !== input.mySide) return { kind: 'ignored' };
  if (input.isValidMove || input.isAttackMove) return { kind: 'move_or_attack' };
  if (!input.pieceAtPosition) return { kind: 'clear_selection' };
  // Ownership boundary: never allow selecting an opponent piece, even when
  // currentTurn coincidentally matches. Defense-in-depth against any future
  // turn-tracking drift.
  if (input.pieceAtPosition.owner !== input.mySide) return { kind: 'ignored' };
  return { kind: 'select_piece', piece: input.pieceAtPosition };
}
