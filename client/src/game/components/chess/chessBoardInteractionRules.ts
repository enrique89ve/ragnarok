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

export function containsPosition(
  positions: readonly ChessBoardPosition[],
  row: number,
  col: number,
): boolean {
  return positions.some(position => position.row === row && position.col === col);
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
}): CellClickAction {
  if (input.disabled && !input.isPlacementMode) return { kind: 'ignored' };
  if (input.isPlacementMode) return { kind: 'place_mine' };
  if (input.isValidMove || input.isAttackMove) return { kind: 'move_or_attack' };
  if (!input.pieceAtPosition) return { kind: 'clear_selection' };
  if (input.pieceAtPosition.owner !== input.currentTurn) return { kind: 'ignored' };
  return { kind: 'select_piece', piece: input.pieceAtPosition };
}
