import React, { useLayoutEffect, useState } from 'react';
import { ARENA_VFX_LAYERS, arenaVfxLayerProps } from './arenaVfxTargets';
import './GameViewport.css';

type GameViewportProps = {
  children: React.ReactNode;
  /** Kept for API compatibility — not used. Canvas is fixed 1920×1080. */
  aspectRatio?: number;
  referenceWidth?: number;
  referenceHeight?: number;
  safeX?: number;
  safeY?: number;
  maxScale?: number;
  extraClassName?: string;
};

export type GameViewportFitInput = {
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly referenceWidth: number;
  readonly referenceHeight: number;
  readonly safeX: number;
  readonly safeY: number;
  readonly maxScale?: number;
};

export type GameViewportFit = {
  readonly scale: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly effectiveSafeY: number;
  readonly compactLandscape: boolean;
};

const REF_W = 1920;
const REF_H = 1080;
const COMPACT_LANDSCAPE_MAX_HEIGHT = 500;
const COMPACT_LANDSCAPE_MIN_ASPECT = 16 / 9;
const COMPACT_LANDSCAPE_SAFE_Y = 4;

export const COMPACT_LANDSCAPE_POKER_HITBOX_SIZE = 124;

/**
 * Compute scale + offset from explicit physical dimensions. Compact landscape
 * keeps the horizontal notch inset while reducing only the vertical margin.
 */
export function computeGameViewportFit(input: GameViewportFitInput): GameViewportFit {
  const compactLandscape = input.viewportHeight <= COMPACT_LANDSCAPE_MAX_HEIGHT
    && input.viewportWidth / Math.max(1, input.viewportHeight) >= COMPACT_LANDSCAPE_MIN_ASPECT;
  const effectiveSafeY = compactLandscape ? COMPACT_LANDSCAPE_SAFE_Y : input.safeY;
  const availableWidth = Math.max(1, input.viewportWidth - input.safeX * 2);
  const availableHeight = Math.max(1, input.viewportHeight - effectiveSafeY * 2);
  const rawScale = Math.min(
    availableWidth / input.referenceWidth,
    availableHeight / input.referenceHeight,
  );
  const scale = input.maxScale === undefined ? rawScale : Math.min(rawScale, input.maxScale);

  return {
    scale,
    offsetX: input.safeX + (availableWidth - input.referenceWidth * scale) / 2,
    offsetY: effectiveSafeY + (availableHeight - input.referenceHeight * scale) / 2,
    effectiveSafeY,
    compactLandscape,
  };
}

function computeWindowFit(
  referenceWidth: number,
  referenceHeight: number,
  safeX: number,
  safeY: number,
  maxScale: number | undefined,
): GameViewportFit {
  if (typeof window === 'undefined') {
    return {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      effectiveSafeY: safeY,
      compactLandscape: false,
    };
  }

  return computeGameViewportFit({
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    referenceWidth,
    referenceHeight,
    safeX,
    safeY,
    maxScale,
  });
}

/**
 * GameViewport — 1920×1080 virtual canvas with JS-driven responsive scaling.
 *
 * History of pain:
 *   v1: JS scale → CSS variable → CSS rule consumed it. Race condition on
 *       first paint left scale=1 stuck.
 *   v2: Pure CSS `transform: scale(min(calc(100vw / 1920px), ...))`.
 *       Type-altering calc (length/length → number) is CSS Values 4 — only
 *       supported in Chrome 105+/Firefox 116+/Safari 17+. Older browsers
 *       silently dropped the entire `transform` declaration, leaving the
 *       canvas at 1920×1080 native (cut off + black margins).
 *   v3 (this): JS computes scale + offset, sets `transform` DIRECTLY in
 *       inline style. Inline always wins over CSS, no calc, no variables,
 *       no race. useState initializer is synchronous so the first paint
 *       has the right value. useLayoutEffect re-syncs after mount and on
 *       every window resize.
 */
export const GameViewport: React.FC<GameViewportProps> = ({
  children,
  referenceWidth = REF_W,
  referenceHeight = REF_H,
  safeX = 0,
  safeY = 0,
  maxScale,
  extraClassName = '',
}) => {
  // Sync init — first paint already has the correct scale, no flash.
  const [fit, setFit] = useState(() => computeWindowFit(referenceWidth, referenceHeight, safeX, safeY, maxScale));

  useLayoutEffect(() => {
    const update = () => setFit(computeWindowFit(referenceWidth, referenceHeight, safeX, safeY, maxScale));
    // Recompute once on mount in case window changed between initial state
    // and effect run (rare but real on slow loads).
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, [maxScale, referenceWidth, referenceHeight, safeX, safeY]);

  // Inline style — overrides any CSS `transform` rule on .game-viewport.
  // We use top/left absolute positioning + transform-origin top-left so the
  // offsets we compute are intuitive (pixel offsets in window space).
  const style: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: `${referenceWidth}px`,
    height: `${referenceHeight}px`,
    transform: `translate(${fit.offsetX}px, ${fit.offsetY}px) scale(${fit.scale})`,
    transformOrigin: '0 0',
  };

  // Screen-shake classes from extraClassName must live on the WRAPPER,
  // not on the inner .game-viewport. The inner element has a JS-set
  // inline transform; a CSS animation on it would clobber the scale
  // during the shake. The wrapper has no transform so animating its
  // translate is safe.
  const classNames = extraClassName.split(/\s+/).filter(Boolean);
  const shakeClasses = classNames
    .filter((c) => c.startsWith('screen-shake-'))
    .join(' ');
  const innerClasses = classNames
    .filter((c) => !c.startsWith('screen-shake-'))
    .join(' ');

  return (
    <div
      className={`game-viewport-wrapper ${shakeClasses}`.trim()}
      data-compact-landscape={fit.compactLandscape ? 'true' : 'false'}
      {...arenaVfxLayerProps(ARENA_VFX_LAYERS.viewportWrapper)}
    >
      <div className={`game-viewport ${innerClasses}`.trim()} style={style} {...arenaVfxLayerProps(ARENA_VFX_LAYERS.viewport)}>
        {children}
      </div>
    </div>
  );
};

export default GameViewport;
