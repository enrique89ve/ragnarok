import { describe, expect, it } from 'vitest';
import type { ChessPiece } from '../../types/ChessTypes';
import {
  getCellAriaLabel,
  getCellHighlight,
  getCellTone,
  getMineState,
  getMoveAnimationOffset,
  getCheckNoticePresentation,
  getPieceHealthState,
  getPlacementPreview,
  getVisualGridPosition,
  getTurnNoticePresentation,
} from './chessBoardPresentation';
import {
  createFractalLeaderPath,
  createThorBoltBranches,
  createThorBoltPath,
  getCenteredCoverTransform,
  getAlternatingElementMix,
  shouldEnableRagnarokSceneFx,
} from './chessSceneFxModel';

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
  it('adapts turn notices to the local viewer side', () => {
    expect(getTurnNoticePresentation({ currentTurn: 'player', viewerSide: 'player' }))
      .toEqual({ state: 'self', label: 'ᚱ YOUR COMMAND ᚱ' });
    expect(getTurnNoticePresentation({ currentTurn: 'player', viewerSide: 'opponent' }))
      .toEqual({ state: 'opponent', label: 'ᚱ FOE STIRS ᚱ' });
  });

  it('distinguishes own-king danger from an enemy king in check', () => {
    expect(getCheckNoticePresentation({ checkedSide: 'opponent', viewerSide: 'opponent' }))
      .toEqual({ state: 'self', label: 'CHECK! YOUR KING IS IN DANGER' });
    expect(getCheckNoticePresentation({ checkedSide: 'opponent', viewerSide: 'player' }))
      .toEqual({ state: 'opponent', label: 'ENEMY KING IN CHECK' });
  });

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

describe('chessSceneFxModel', () => {
  it('matches the centered cover transform used by the arena background', () => {
    const transform = getCenteredCoverTransform(1520, 717, 1680, 945);

    expect(transform.scale).toBeCloseTo(1520 / 1680);
    expect(transform.x).toBeCloseTo(0);
    expect(transform.y).toBeCloseTo(-69);
    expect(112 * transform.scale + transform.x).toBeCloseTo(101.33, 1);
    expect(1568 * transform.scale + transform.x).toBeCloseTo(1418.67, 1);
    expect(612 * transform.scale + transform.y).toBeCloseTo(485, 0);
    expect(606 * transform.scale + transform.y).toBeCloseTo(479, 0);
  });

  it('creates deterministic jagged paths with stable endpoints', () => {
    const input = {
      seed: 42,
      start: { x: 0.1, y: 0 },
      end: { x: 0.3, y: 0.7 },
      iterations: 4,
      displacement: 0.04,
    } as const;

    const first = createFractalLeaderPath(input);
    expect(createFractalLeaderPath(input)).toEqual(first);
    expect(first).toHaveLength(17);
    expect(first[0]).toEqual(input.start);
    expect(first.at(-1)).toEqual(input.end);
  });

  it('keeps generated FX geometry inside the normalized scene', () => {
    const leftLeader = createThorBoltPath(73, true);
    const rightLeader = createThorBoltPath(91, false);
    const points = [
      ...leftLeader,
      ...rightLeader,
      ...createThorBoltBranches(73, true, leftLeader).flat(),
      ...createThorBoltBranches(91, false, rightLeader).flat(),
    ];

    expect(points.every(point => point.x >= 0 && point.x <= 1)).toBe(true);
    expect(points.every(point => point.y >= 0 && point.y <= 1)).toBe(true);
  });

  it('keeps Thor lightning in the sky and outer architecture', () => {
    const left = createThorBoltPath(73, true);
    const right = createThorBoltPath(91, false);

    expect(left.every(point => point.x < 0.36 && point.y <= 0.42)).toBe(true);
    expect(right.every(point => point.x > 0.64 && point.y <= 0.42)).toBe(true);
  });

  it('alternates fire and snow through a smooth repeating cycle', () => {
    expect(getAlternatingElementMix(0)).toEqual({ fire: 1, snow: 0 });
    expect(getAlternatingElementMix(8)).toEqual({ fire: 0, snow: 1 });
    expect(getAlternatingElementMix(16)).toEqual({ fire: 1, snow: 0 });
    const transition = getAlternatingElementMix(4);
    expect(transition.fire).toBeCloseTo(0.5);
    expect(transition.snow).toBeCloseTo(0.5);
  });

  it('enables Ragnarok FX only for the default arena and Midgard', () => {
    expect(shouldEnableRagnarokSceneFx('')).toBe(true);
    expect(shouldEnableRagnarokSceneFx('realm-midgard')).toBe(true);
    expect(shouldEnableRagnarokSceneFx('realm-asgard')).toBe(false);
    expect(shouldEnableRagnarokSceneFx('realm-muspelheim')).toBe(false);
  });
});
