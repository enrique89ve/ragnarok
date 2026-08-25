import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { POKER_VIEWPORT_LAYOUT } from '../poker/layout/pokerViewportLayout';
import {
  COMPACT_LANDSCAPE_POKER_HITBOX_SIZE,
  computeGameViewportFit,
} from './GameViewport';

const DESKTOP_INPUT = {
  viewportWidth: 1280,
  viewportHeight: 720,
  referenceWidth: 1920,
  referenceHeight: 1080,
  safeX: 32,
  safeY: 28,
} as const;

describe('computeGameViewportFit', () => {
  it('preserves the desktop safe area and fit', () => {
    const fit = computeGameViewportFit(DESKTOP_INPUT);

    expect(fit.compactLandscape).toBe(false);
    expect(fit.effectiveSafeY).toBe(28);
    expect(fit.scale).toBeCloseTo(0.6148148148);
    expect(fit.offsetX).toBeCloseTo(49.7777777778);
    expect(fit.offsetY).toBe(28);
  });

  it('uses a four-pixel vertical inset in compact landscape', () => {
    const fit = computeGameViewportFit({
      ...DESKTOP_INPUT,
      viewportWidth: 844,
      viewportHeight: 390,
    });

    expect(fit.compactLandscape).toBe(true);
    expect(fit.effectiveSafeY).toBe(4);
    expect(fit.scale).toBeCloseTo(382 / 1080);
    expect(1080 * fit.scale).toBeCloseTo(382);
    expect(1920 * fit.scale).toBeCloseTo(679.1111111111);
    expect(fit.offsetX).toBeCloseTo(82.4444444444);
    expect(fit.offsetY).toBe(4);
  });

  it('does not apply the compact policy in portrait', () => {
    const fit = computeGameViewportFit({
      ...DESKTOP_INPUT,
      viewportWidth: 390,
      viewportHeight: 844,
    });

    expect(fit.compactLandscape).toBe(false);
    expect(fit.effectiveSafeY).toBe(28);
    expect(fit.scale).toBeCloseTo(326 / 1920);
  });
});

describe('compact landscape viewport contract', () => {
  const viewportCss = fs.readFileSync(path.resolve(__dirname, 'GameViewport.css'), 'utf8');
  const bettingCss = fs.readFileSync(path.resolve(__dirname, 'styles/poker-betting.css'), 'utf8');

  it('removes document scrolling only while the game wrapper exists', () => {
    expect(viewportCss).toMatch(/html:has\(\.game-viewport-wrapper\)[\s\S]*?body:has\(\.game-viewport-wrapper\)[\s\S]*?overflow:\s*hidden;/);
    expect(viewportCss).toMatch(/html:has\(\.game-viewport-wrapper\)[\s\S]*?scrollbar-gutter:\s*auto;/);
  });

  it('provides a 124px target without exceeding the canonical controls zone', () => {
    const zone = POKER_VIEWPORT_LAYOUT.zones.bettingControls;
    const fourButtonWidth = COMPACT_LANDSCAPE_POKER_HITBOX_SIZE * 4 + 2 * 3;

    expect(bettingCss).toMatch(new RegExp(`data-compact-landscape="true"[\\s\\S]*?\\.poker-btn[\\s\\S]*?inline-size:\\s*${COMPACT_LANDSCAPE_POKER_HITBOX_SIZE}px;[\\s\\S]*?block-size:\\s*${COMPACT_LANDSCAPE_POKER_HITBOX_SIZE}px;`));
    expect(fourButtonWidth).toBeLessThanOrEqual(zone.width);
    expect(COMPACT_LANDSCAPE_POKER_HITBOX_SIZE).toBeLessThanOrEqual(zone.height);
  });
});
