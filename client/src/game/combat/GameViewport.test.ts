import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { POKER_VIEWPORT_LAYOUT } from '../poker/layout/pokerViewportLayout';
import { POKER_VIEWPORT_SAFE_AREA } from '../poker/layout/pokerViewportLayout';
import {
  COMPACT_LANDSCAPE_POKER_HITBOX_SIZE,
  GAME_VIEWPORT_PRESENTATION_CASES,
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
    expect(fit.bars).toBe('pillarbox');
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
    expect(fit.bars).toBe('pillarbox');
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
    expect(fit.bars).toBe('letterbox');
  });
});

describe('presentation viewports — one 1920x1080 board', () => {
  const safe = POKER_VIEWPORT_SAFE_AREA;

  it('fits DESIGN QA sizes without stretching or exceeding maxScale', () => {
    for (const screen of GAME_VIEWPORT_PRESENTATION_CASES) {
      const fit = computeGameViewportFit({
        viewportWidth: screen.width,
        viewportHeight: screen.height,
        referenceWidth: 1920,
        referenceHeight: 1080,
        safeX: safe.safeX,
        safeY: safe.safeY,
        maxScale: safe.maxScale,
      });

      expect(fit.scale).toBeLessThanOrEqual(safe.maxScale);
      expect(1920 * fit.scale).toBeLessThanOrEqual(screen.width - 2 * safe.safeX + 0.01);
      expect(1080 * fit.scale).toBeLessThanOrEqual(screen.height - 2 * fit.effectiveSafeY + 0.01);
      expect((1920 * fit.scale) / (1080 * fit.scale)).toBeCloseTo(16 / 9);
    }
  });

  it('keeps 1366x768 readable and 1920x1080 under the presentation cap', () => {
    const laptop = computeGameViewportFit({
      viewportWidth: 1366,
      viewportHeight: 768,
      referenceWidth: 1920,
      referenceHeight: 1080,
      safeX: safe.safeX,
      safeY: safe.safeY,
      maxScale: safe.maxScale,
    });
    const fhd = computeGameViewportFit({
      viewportWidth: 1920,
      viewportHeight: 1080,
      referenceWidth: 1920,
      referenceHeight: 1080,
      safeX: safe.safeX,
      safeY: safe.safeY,
      maxScale: safe.maxScale,
    });

    expect(laptop.compactLandscape).toBe(false);
    expect(laptop.scale).toBeGreaterThan(0.6);
    expect(laptop.scale).toBeLessThan(1);
    expect(fhd.scale).toBeLessThanOrEqual(safe.maxScale);
    expect(fhd.scale).toBeGreaterThan(0.9);
  });

  it('pillarboxes ultrawide and windowboxes 4K instead of stretching', () => {
    const ultra = computeGameViewportFit({
      viewportWidth: 3440,
      viewportHeight: 1440,
      referenceWidth: 1920,
      referenceHeight: 1080,
      safeX: safe.safeX,
      safeY: safe.safeY,
      maxScale: safe.maxScale,
    });
    const uhd = computeGameViewportFit({
      viewportWidth: 3840,
      viewportHeight: 2160,
      referenceWidth: 1920,
      referenceHeight: 1080,
      safeX: safe.safeX,
      safeY: safe.safeY,
      maxScale: safe.maxScale,
    });
    const uncappedUltra = computeGameViewportFit({
      viewportWidth: 3440,
      viewportHeight: 1440,
      referenceWidth: 1920,
      referenceHeight: 1080,
      safeX: safe.safeX,
      safeY: safe.safeY,
    });

    expect(ultra.scale).toBe(safe.maxScale);
    expect(ultra.bars).toBe('windowbox');
    expect(uhd.scale).toBe(safe.maxScale);
    expect(uhd.bars).toBe('windowbox');
    expect(uncappedUltra.scale).toBeGreaterThan(safe.maxScale);
    expect((1920 * ultra.scale) / (1080 * ultra.scale)).toBeCloseTo(16 / 9);
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
