import { BOARD_COLS, BOARD_ROWS, type ChessBoardPosition, type ChessPiece, type ChessPlayerSide } from '../../types/ChessTypes';

export type ChessCellTone = 'light' | 'dark';
export type ChessCellHighlight = 'none' | 'move' | 'attack';
export type ChessCellMineState = 'none' | 'active' | 'placement-burst' | 'trigger-explosion';
export type ChessCellPlacementPreview = 'none' | 'valid' | 'invalid';
export type ChessPieceHealthState = 'healthy' | 'warning' | 'danger';
export type ChessBoardOrientation = 'standard' | 'flipped';
export type ChessNoticeState = 'self' | 'opponent';

export type ChessNoticePresentation = Readonly<{
  state: ChessNoticeState;
  label: string;
}>;

export type ChessVisualGridPosition = {
  readonly row: number;
  readonly col: number;
};

export type ChessMoveAnimationOffset = {
  readonly x: number;
  readonly y: number;
};

export function getTurnNoticePresentation(input: {
  readonly currentTurn: ChessPlayerSide;
  readonly viewerSide: ChessPlayerSide;
}): ChessNoticePresentation {
  return input.currentTurn === input.viewerSide
    ? { state: 'self', label: 'ᚱ YOUR COMMAND ᚱ' }
    : { state: 'opponent', label: 'ᚱ FOE STIRS ᚱ' };
}

export function getCheckNoticePresentation(input: {
  readonly checkedSide: ChessPlayerSide;
  readonly viewerSide: ChessPlayerSide;
}): ChessNoticePresentation {
  return input.checkedSide === input.viewerSide
    ? { state: 'self', label: 'CHECK! YOUR KING IS IN DANGER' }
    : { state: 'opponent', label: 'ENEMY KING IN CHECK' };
}

export function getCellTone(row: number, col: number): ChessCellTone {
  return (row + col) % 2 === 0 ? 'light' : 'dark';
}

export function getCellHighlight(input: {
  readonly isValidMove: boolean;
  readonly isAttackMove: boolean;
}): ChessCellHighlight {
  if (input.isAttackMove) return 'attack';
  if (input.isValidMove) return 'move';
  return 'none';
}

export function getMineState(input: {
  readonly isActiveMine: boolean;
  readonly isPlacementBurst: boolean;
  readonly isTriggerExplosion: boolean;
}): ChessCellMineState {
  if (input.isTriggerExplosion) return 'trigger-explosion';
  if (input.isPlacementBurst) return 'placement-burst';
  if (input.isActiveMine) return 'active';
  return 'none';
}

export function getPlacementPreview(input: {
  readonly isMinePreview: boolean;
  readonly canPlaceHere: boolean;
}): ChessCellPlacementPreview {
  if (!input.isMinePreview) return 'none';
  return input.canPlaceHere ? 'valid' : 'invalid';
}

export function getCellAriaLabel(input: {
  readonly row: number;
  readonly col: number;
  readonly piece: ChessPiece | null;
}): string {
  const rowNumber = input.row + 1;
  const colNumber = input.col + 1;
  if (!input.piece) return `Row ${rowNumber}, column ${colNumber}, empty`;
  return `Row ${rowNumber}, column ${colNumber}, ${input.piece.heroName} ${input.piece.type}, ${input.piece.owner}`;
}

export function getPieceHealthState(healthPercent: number): ChessPieceHealthState {
  if (healthPercent <= 25) return 'danger';
  if (healthPercent <= 50) return 'warning';
  return 'healthy';
}

export function getVisualGridPosition(input: {
  readonly position: ChessBoardPosition;
  readonly orientation: ChessBoardOrientation;
}): ChessVisualGridPosition {
  if (input.orientation === 'flipped') {
    return {
      row: input.position.row,
      col: BOARD_COLS - 1 - input.position.col,
    };
  }

  return {
    row: BOARD_ROWS - 1 - input.position.row,
    col: input.position.col,
  };
}

export function getMoveAnimationOffset(input: {
  readonly from: ChessBoardPosition;
  readonly to: ChessBoardPosition;
  readonly orientation: ChessBoardOrientation;
  readonly cellSize: number;
}): ChessMoveAnimationOffset {
  const fromVisual = getVisualGridPosition({
    position: input.from,
    orientation: input.orientation,
  });
  const toVisual = getVisualGridPosition({
    position: input.to,
    orientation: input.orientation,
  });

  return {
    x: (fromVisual.col - toVisual.col) * input.cellSize,
    y: (fromVisual.row - toVisual.row) * input.cellSize,
  };
}
