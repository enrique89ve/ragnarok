import React, { useLayoutEffect, useState } from 'react';
import './GameViewport.css';

interface GameViewportProps {
  children: React.ReactNode;
  /** Kept for API compatibility — not used. Canvas is fixed 1920×1080. */
  aspectRatio?: number;
  referenceWidth?: number;
  referenceHeight?: number;
  extraClassName?: string;
}

const REF_W = 1920;
const REF_H = 1080;

/**
 * Compute scale + offset synchronously from window dimensions.
 * Pure function — used by both useState initializer (no first-paint flash)
 * and the resize listener.
 */
function computeFit(refW: number, refH: number) {
  if (typeof window === 'undefined') {
    return { scale: 1, offsetX: 0, offsetY: 0 };
  }
  const w = window.innerWidth;
  const h = window.innerHeight;
  const scale = Math.min(w / refW, h / refH);
  return {
    scale,
    offsetX: (w - refW * scale) / 2,
    offsetY: (h - refH * scale) / 2,
  };
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
  extraClassName = '',
}) => {
  // Sync init — first paint already has the correct scale, no flash.
  const [fit, setFit] = useState(() => computeFit(referenceWidth, referenceHeight));

  useLayoutEffect(() => {
    const update = () => setFit(computeFit(referenceWidth, referenceHeight));
    // Recompute once on mount in case window changed between initial state
    // and effect run (rare but real on slow loads).
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, [referenceWidth, referenceHeight]);

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
    <div className={`game-viewport-wrapper ${shakeClasses}`.trim()}>
      <div className={`game-viewport ${innerClasses}`.trim()} style={style}>
        {children}
      </div>
    </div>
  );
};

export default GameViewport;
