import { describe, expect, it } from 'vitest';
import type { ChessPiece } from '../../types/ChessTypes';
import {
  getCellAriaLabel,
  getCellHighlight,
  getCellTone,
  getMineState,
  getMoveAnimationOffset,
  getPieceHealthState,
  getPlacementPreview,
  getVisualGridPosition,
} from './chessBoardPresentation';

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

describe('chessBoardPresentation', () => {
  it('derives stable cell tone from coordinates', () => {
    expect(getCellTone(0, 0)).toBe('light');
    expect(getCellTone(0, 1)).toBe('dark');
    expect(getCellTone(1, 1)).toBe('light');
  });

  it('prioritizes attack highlights over quiet move highlights', () => {
    expect(getCellHighlight({ isValidMove: false, isAttackMove: false })).toBe('none');
    expect(getCellHighlight({ isValidMove: true, isAttackMove: false })).toBe('move');
    expect(getCellHighlight({ isValidMove: false, isAttackMove: true })).toBe('attack');
    expect(getCellHighlight({ isValidMove: true, isAttackMove: true })).toBe('attack');
  });

  it('prioritizes transient mine effects over active mine state', () => {
    expect(getMineState({
      isActiveMine: false,
      isPlacementBurst: false,
      isTriggerExplosion: false,
    })).toBe('none');
    expect(getMineState({
      isActiveMine: true,
      isPlacementBurst: false,
      isTriggerExplosion: false,
    })).toBe('active');
    expect(getMineState({
      isActiveMine: true,
      isPlacementBurst: true,
      isTriggerExplosion: false,
    })).toBe('placement-burst');
    expect(getMineState({
      isActiveMine: true,
      isPlacementBurst: true,
      isTriggerExplosion: true,
    })).toBe('trigger-explosion');
  });

  it('derives mine placement preview without binding to CSS classes', () => {
    expect(getPlacementPreview({ isMinePreview: false, canPlaceHere: true })).toBe('none');
    expect(getPlacementPreview({ isMinePreview: true, canPlaceHere: true })).toBe('valid');
    expect(getPlacementPreview({ isMinePreview: true, canPlaceHere: false })).toBe('invalid');
  });

  it('builds board-cell labels from model state', () => {
    const piece = makePiece({
      id: 'player-queen',
      type: 'queen',
      owner: 'player',
      heroName: 'Freyja',
    });

    expect(getCellAriaLabel({ row: 2, col: 3, piece: null })).toBe('Row 3, column 4, empty');
    expect(getCellAriaLabel({ row: 2, col: 3, piece })).toBe('Row 3, column 4, Freyja queen, player');
  });

  it('keeps health tone thresholds explicit for CSS data attributes', () => {
    expect(getPieceHealthState(100)).toBe('healthy');
    expect(getPieceHealthState(51)).toBe('healthy');
    expect(getPieceHealthState(50)).toBe('warning');
    expect(getPieceHealthState(25)).toBe('danger');
  });

  it('maps canonical board coordinates to viewer-relative grid cells', () => {
    expect(getVisualGridPosition({
      position: { row: 0, col: 0 },
      orientation: 'standard',
    })).toEqual({ row: 6, col: 0 });
    expect(getVisualGridPosition({
      position: { row: 0, col: 0 },
      orientation: 'flipped',
    })).toEqual({ row: 0, col: 4 });
  });

  it('derives movement animation offsets from previous and next positions', () => {
    expect(getMoveAnimationOffset({
      from: { row: 0, col: 0 },
      to: { row: 1, col: 0 },
      orientation: 'standard',
      cellSize: 80,
    })).toEqual({ x: 0, y: 80 });

    expect(getMoveAnimationOffset({
      from: { row: 0, col: 0 },
      to: { row: 1, col: 0 },
      orientation: 'flipped',
      cellSize: 80,
    })).toEqual({ x: 0, y: -80 });
  });
});
