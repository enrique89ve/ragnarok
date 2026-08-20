/**
 * ChessAttackAnimation.tsx
 *
 * Cinematic strike animation for chess captures:
 * anticipación -> embestida -> impacto -> estabilización.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BOARD_COLS,
  BOARD_ROWS,
  ChessBoardPosition,
  ChessPiece,
  ELEMENT_COLORS,
} from '../../types/ChessTypes';
import { useGameStore } from '../../stores/gameStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { PIECE_COLOR_BY_TYPE } from './pieceVisuals';
import { PieceGlyph } from './PieceGlyph';

type AttackWeightProfile = {
  readonly power: number;
  readonly impactScale: number;
  readonly arcLift: number;
};

type AttackAnimationCSSVariables = React.CSSProperties & {
  [key: string]: string;
};

type AttackPhase = 'idle' | 'charge' | 'lunge' | 'impact' | 'settle' | 'done';

const ATTACK_WEIGHT_BY_PIECE: Record<string, AttackWeightProfile> = {
  queen: { power: 1.2, impactScale: 1.2, arcLift: 1 },
  king: { power: 1.24, impactScale: 1.26, arcLift: 1.12 },
  knight: { power: 1.06, impactScale: 1.12, arcLift: 0.84 },
  rook: { power: 1.05, impactScale: 1.1, arcLift: 0.92 },
  bishop: { power: 0.97, impactScale: 1.05, arcLift: 0.75 },
  pawn: { power: 0.89, impactScale: 0.98, arcLift: 0.67 },
};

const DEFENDER_REACTION_BY_PIECE: Record<string, AttackWeightProfile> = {
  queen: { power: 1.14, impactScale: 1.24, arcLift: 0.85 },
  king: { power: 1.12, impactScale: 1.22, arcLift: 0.83 },
  rook: { power: 1, impactScale: 1.09, arcLift: 0.79 },
  knight: { power: 0.95, impactScale: 1.04, arcLift: 0.74 },
  bishop: { power: 0.92, impactScale: 1, arcLift: 0.72 },
  pawn: { power: 0.82, impactScale: 0.92, arcLift: 0.64 },
};

const ATTACK_INTENSITY_SCALE = 0.64;

const getAttackProfile = (pieceType: ChessPiece['type']): AttackWeightProfile =>
  ATTACK_WEIGHT_BY_PIECE[pieceType] ?? {
    power: 1,
    impactScale: 1.06,
    arcLift: 0.8,
  };

const getDefenderReactionProfile = (pieceType: ChessPiece['type']): AttackWeightProfile =>
  DEFENDER_REACTION_BY_PIECE[pieceType] ?? {
    power: 1,
    impactScale: 1.02,
    arcLift: 0.75,
  };

const getAttackSpeedScale = (pieceType: ChessPiece['type']): number =>
  pieceType === 'king' ? 0.2 * 0.7 : 1; // 30% slower king strike

const makeSeed = (source: string): number =>
  [...source].reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 2166136261);

const makeBurstVectors = (seed: number, count: number) =>
  Array.from({ length: count }).map((_, index) => {
    const noise = Math.sin(seed * 0.021 + index * 7.37);
    const angle = ((noise + 1) * 0.5 + index * 0.17) * Math.PI * 2;
    const range = ((Math.cos(seed * 0.013 + index * 4.17) + 1) * 0.5) * 0.75 + 0.45;
    const size = ((Math.sin(seed * 0.009 + index * 5.13) + 1) * 0.5) * 6 + 5;
    return { angle, range, size };
  });

interface AttackAnimationData {
  attacker: ChessPiece;
  defender: ChessPiece;
  attackerPosition: ChessBoardPosition;
  defenderPosition: ChessBoardPosition;
  isInstantKill: boolean;
  timestamp?: number;
}

interface ChessAttackAnimationProps {
  animation: AttackAnimationData | null;
  onAnimationComplete: () => void;
  cellSize: number;
  boardOffset: {
    x: number;
    y: number;
  };
}

export const ChessAttackAnimation: React.FC<ChessAttackAnimationProps> = ({
  animation,
  onAnimationComplete,
  cellSize,
  boardOffset,
}) => {
  const animationsEnabled = useSettingsStore(s => s.animationsEnabled);
  const reduceMotion = useSettingsStore(s => s.reduceMotion);
  const cardQuality = useSettingsStore(s => s.cardQuality);
  const shouldAnimate = animationsEnabled && !reduceMotion;
  const qualityTimeScale = cardQuality === 'low' ? 0.82 : cardQuality === 'medium' ? 1 : 1.12;
  const qualityIntensity = cardQuality === 'low' ? 0.68 : cardQuality === 'medium' ? 0.86 : 1;
  const shouldUseAdvancedAttack = cardQuality !== 'low';

  const [phase, setPhase] = useState<AttackPhase>('idle');
  const animationIdRef = useRef<string | null>(null);
  const onAnimationCompleteRef = useRef(onAnimationComplete);
  onAnimationCompleteRef.current = onAnimationComplete;

  const attackWeight = getAttackProfile(animation?.attacker.type ?? 'pawn').power;
  const attackSpeedScale = getAttackSpeedScale(animation?.attacker.type ?? 'pawn');
  const speedDurationScale = 1 / attackSpeedScale;

  const chargeDurationMs = Math.round(
    120 * qualityTimeScale * (0.95 + attackWeight * 0.06) * speedDurationScale,
  );
  const lungeDurationMs = Math.round(
    560 * qualityTimeScale * (0.9 + attackWeight * 0.11) * speedDurationScale,
  );
  const impactDurationMs = Math.round(
    240 * qualityTimeScale * (0.85 + attackWeight * 0.15) * speedDurationScale,
  );
  const settleDurationMs = Math.max(900, Math.round(260 * qualityTimeScale * speedDurationScale));
  const impactLabelHoldMs = Math.max(1200, Math.round(900 * qualityTimeScale * speedDurationScale));
  const strikeSafeDelayMs = 1500;

  // Canonical->visual coordinate mapping must mirror ChessBoard's
  // iteration order (commit 6d62811): canonical 'player' viewer renders
  // row 6 at the top (so row 0 is at the bottom — first-mover's back
  // rank closest to camera); canonical 'opponent' viewer flips 180° so row 0
  // is at the top and col 0 is on the right.
  const myCanonicalSide = useGameStore(s => s.myCanonicalSide) ?? 'player';
  const isFlipped = myCanonicalSide === 'opponent';

  const calculatePixelPosition = useCallback(
    (position: ChessBoardPosition) => {
      const visualRow = isFlipped ? position.row : BOARD_ROWS - 1 - position.row;
      const visualCol = isFlipped ? BOARD_COLS - 1 - position.col : position.col;
      return {
        x: boardOffset.x + visualCol * cellSize + cellSize / 2,
        y: boardOffset.y + visualRow * cellSize + cellSize / 2,
      };
    },
    [cellSize, boardOffset, isFlipped],
  );

  const burstVectors = useMemo(() => {
    if (!animation) {
      return [] as Array<{ angle: number; range: number; size: number }>;
    }
    const seed = makeSeed(
      `${animation.attacker.id}-${animation.defender.id}-${animation.isInstantKill ? 1 : 0}`,
    );
    const particleCount = shouldUseAdvancedAttack ? 10 : 6;
    return makeBurstVectors(seed, Math.max(5, particleCount));
  }, [animation, shouldUseAdvancedAttack]);

  useEffect(() => {
    if (!animation) {
      setPhase('idle');
      animationIdRef.current = null;
      return;
    }

    const animationSignature = `${animation.attacker.id}-${animation.defender.id}-${animation.timestamp ?? 0}`;
    if (animationIdRef.current === animationSignature) {
      return;
    }

    if (!shouldAnimate) {
      animationIdRef.current = animationSignature;
      setPhase('done');
      onAnimationCompleteRef.current();
      return;
    }

    animationIdRef.current = animationSignature;
    setPhase('charge');

    const chargeTimeout = window.setTimeout(() => {
      if (animationIdRef.current !== animationSignature) return;
      setPhase('lunge');
    }, chargeDurationMs);

    const lungeTimeout = window.setTimeout(() => {
      if (animationIdRef.current !== animationSignature) return;
      setPhase('impact');
    }, chargeDurationMs + lungeDurationMs);

      const settleTimeout = window.setTimeout(() => {
        if (animationIdRef.current !== animationSignature) return;
        setPhase('settle');
      }, chargeDurationMs + lungeDurationMs + impactDurationMs);

      const completeTimeout = window.setTimeout(() => {
        if (animationIdRef.current !== animationSignature) return;
        setPhase('done');
        onAnimationCompleteRef.current();
      // Do not clear animationIdRef. Parent may re-render before prop nulls,
      // so this guard avoids replaying stale payload.
    }, strikeSafeDelayMs);

    return () => {
      clearTimeout(chargeTimeout);
      clearTimeout(lungeTimeout);
      clearTimeout(settleTimeout);
      clearTimeout(completeTimeout);
    };
  }, [
    animation,
    shouldAnimate,
    chargeDurationMs,
    lungeDurationMs,
    impactDurationMs,
    settleDurationMs,
    strikeSafeDelayMs,
  ]);

  const isPlayer = animation ? animation.attacker.owner === myCanonicalSide : false;
  const elementColor = animation ? ELEMENT_COLORS[animation.attacker.element] || 'var(--ink-0)' : 'var(--ink-0)';
  const impactColor = animation?.isInstantKill ? 'var(--warning-400)' : elementColor;
  const attackAnimationVars = {
    '--attack-accent': impactColor,
    '--attack-ring-glow': `${cellSize * 0.045}px`,
    '--attack-attacker-color': elementColor,
    '--attack-defender-color': impactColor,
    '--attack-attacker-shadow': `0 0 9px ${elementColor}, 0 0 15px ${elementColor}`,
    '--attack-defender-shadow': `0 0 6px ${impactColor}, 0 0 10px ${impactColor}`,
    '--attack-label-color': animation?.isInstantKill ? 'var(--warning-300)' : impactColor,
    ...(animation?.isInstantKill
      ? {
          '--attack-piece-bg': 'linear-gradient(135deg, var(--warning-500), var(--warning-300))',
        }
      : {}),
  } as AttackAnimationCSSVariables;

  if (!shouldAnimate) {
    return null;
  }

  if (!animation || phase === 'idle' || phase === 'done') {
    return null;
  }

  const attackerStart = calculatePixelPosition(animation.attackerPosition);
  const defenderPos = calculatePixelPosition(animation.defenderPosition);

  const rawAttackProfile = getAttackProfile(animation.attacker.type);
  const rawDefenderProfile = getDefenderReactionProfile(animation.defender.type);
  const normalizedAttackProfile = {
    power: rawAttackProfile.power * qualityIntensity * ATTACK_INTENSITY_SCALE,
    impactScale: rawAttackProfile.impactScale * qualityIntensity * ATTACK_INTENSITY_SCALE,
    arcLift: rawAttackProfile.arcLift * (cardQuality === 'low' ? 0.72 : 1) * ATTACK_INTENSITY_SCALE,
  };
  const normalizedDefenderProfile = {
    power: rawDefenderProfile.power * qualityIntensity * ATTACK_INTENSITY_SCALE,
    impactScale: rawDefenderProfile.impactScale * qualityIntensity * ATTACK_INTENSITY_SCALE,
    arcLift: rawDefenderProfile.arcLift * (cardQuality === 'low' ? 0.72 : 1) * ATTACK_INTENSITY_SCALE,
  };

  const defenderRecoil = {
    magnitude: (normalizedDefenderProfile.power + normalizedAttackProfile.power) * 0.35 + normalizedDefenderProfile.impactScale * 0.55,
  };
  const trajectoryX = defenderPos.x - attackerStart.x;
  const trajectoryY = defenderPos.y - attackerStart.y;
  const trajectoryDistance = Math.max(1, Math.hypot(trajectoryX, trajectoryY));
  const normalizedX = trajectoryX / trajectoryDistance;
  const normalizedY = trajectoryY / trajectoryDistance;
  const arcOffset = {
    x: -normalizedY * cellSize * 0.12 * normalizedAttackProfile.arcLift,
    y: normalizedX * cellSize * 0.12 * normalizedAttackProfile.arcLift,
  };
  const arcPeak = {
    x: attackerStart.x + trajectoryX * 0.5 + arcOffset.x,
    y: attackerStart.y + trajectoryY * 0.5 - cellSize * 0.18 * normalizedAttackProfile.arcLift,
  };
  const defenderImpactOffset = {
    x: trajectoryX === 0 ? 0 : Math.sign(trajectoryX) * cellSize * 0.02 * normalizedAttackProfile.arcLift,
    y: trajectoryY === 0 ? 0 : Math.sign(trajectoryY) * cellSize * 0.02 * normalizedAttackProfile.arcLift,
  };
  const trajectoryRotation = (Math.atan2(trajectoryY, trajectoryX) * 180) / Math.PI;
  const combatSlashAngles = [-28, 0, 24];

  const defenderRotation = animation.defender.owner === myCanonicalSide ? 0 : 180;
  const settleBounce = animation.isInstantKill ? 0.035 : 0.025;
  const impactRadius = `${Math.max(68, cellSize * 0.96 * (0.9 + normalizedAttackProfile.impactScale))}px`;
  const impactLabel = animation.isInstantKill ? 'STRIKE' : 'CLASH';
  const isKingAttacker = animation.attacker.type === 'king';
  const isKingDefender = animation.defender.type === 'king';

  return (
    <AnimatePresence>
      <div
        className="chess-attack-animation-overlay"
        data-intent={animation.isInstantKill ? 'critical' : 'standard'}
        data-side={isPlayer ? 'player' : 'opponent'}
        style={attackAnimationVars}
      >
        {phase === 'charge' && (
          <motion.div
            initial={{ scale: 0.74, opacity: 0 }}
            animate={{ scale: [0.74, 1.05, 1], opacity: [0, 0.24, 0.08] }}
            transition={{ duration: chargeDurationMs / 1000, ease: 'easeOut' }}
            className="chess-attack-anticipation-ring"
            style={{
              left: attackerStart.x,
              top: attackerStart.y,
              width: cellSize * 0.82,
              height: cellSize * 0.82,
            }}
          />
        )}

        <motion.div
          initial={{
            x: attackerStart.x - cellSize / 2,
            y: attackerStart.y - cellSize / 2,
            scale: 1,
            opacity: 1,
          }}
          animate={
            phase === 'charge'
              ? {
                  x: [attackerStart.x - cellSize / 2, attackerStart.x - cellSize / 2, attackerStart.x - cellSize / 2],
                  y: [attackerStart.y - cellSize / 2, attackerStart.y - cellSize / 2, attackerStart.y - cellSize / 2],
              scale: [1, 1 + 0.03 * normalizedAttackProfile.power, 1],
                  rotate: [0, isPlayer ? 2.4 : -2.4, 0],
                  opacity: 1,
                }
              : phase === 'lunge'
                ? {
                    x: [
                      attackerStart.x - cellSize / 2,
                      arcPeak.x - cellSize / 2,
                      defenderPos.x - cellSize / 2,
                    ],
                    y: [
                      attackerStart.y - cellSize / 2,
                      arcPeak.y - cellSize / 2,
                      defenderPos.y - cellSize / 2,
                    ],
                    scale: [1, 1 + normalizedAttackProfile.impactScale * 0.06, 1 + normalizedAttackProfile.impactScale * 0.025],
                    rotate: [0, isPlayer ? 3.8 : -3.8, 0],
                    opacity: 1,
                  }
                : phase === 'impact'
                  ? {
                      x: [
                        defenderPos.x - cellSize / 2,
                        defenderPos.x - defenderImpactOffset.x - cellSize / 2,
                        defenderPos.x + defenderImpactOffset.x * 0.2 - cellSize / 2,
                        defenderPos.x - cellSize / 2,
                      ],
                      y: [
                        defenderPos.y - cellSize / 2,
                        defenderPos.y - defenderImpactOffset.y - cellSize / 2,
                        defenderPos.y + defenderImpactOffset.y * 0.2 - cellSize / 2,
                        defenderPos.y - cellSize / 2,
                      ],
                      scale: [
                        1 + normalizedAttackProfile.impactScale * 0.1,
                        1 + normalizedAttackProfile.impactScale * 0.13,
                        1 + normalizedAttackProfile.impactScale * 0.08,
                        0.99 + normalizedAttackProfile.impactScale * 0.015,
                      ],
                      rotate: [0, isPlayer ? -4.5 : 4.5, isPlayer ? 1 : -1, 0],
                      opacity: [1, 1, 0.96, 0.9],
                    }
                  : {
                      x: defenderPos.x - cellSize / 2,
                      y: defenderPos.y - cellSize / 2,
                      scale: [1, 1 + settleBounce * 0.6, 0.97],
                      opacity: [0.88, 0.78, 0],
                    }
          }
          transition={{
            duration:
              phase === 'charge'
                ? chargeDurationMs / 1000
                : phase === 'lunge'
                  ? lungeDurationMs / 1000
                  : phase === 'impact'
                    ? Math.max(0.18, impactDurationMs / 1000 * 0.55)
                    : settleDurationMs / 1000,
            times: phase === 'charge' ? [0, 0.5, 1] : phase === 'impact' ? [0, 0.26, 0.6, 1] : [0, 0.6, 1],
            ease: phase === 'impact' ? [0.16, 0.76, 0.35, 1] : phase === 'lunge' ? [0.12, 0.6, 0.25, 1] : 'easeOut',
          }}
          style={{
            width: cellSize,
            height: cellSize,
            zIndex: 1001,
          }}
          className={`chess-attack-attacker-piece ${isKingAttacker ? 'chess-attack-attacker-piece--king' : ''}`}
        >
          <span className="chess-attack-attacker-piece__frame" />
          <PieceGlyph
            pieceType={animation.attacker.type}
            fallbackColor={PIECE_COLOR_BY_TYPE[animation.attacker.type]}
            size="clamp(39px, 8vw, 73px)"
            className={`relative ${!isPlayer ? 'transform rotate-180' : ''}`}
            style={{ '--piece-glyph-text-shadow': 'var(--attack-attacker-shadow)' }}
          />
        </motion.div>

        {phase === 'lunge' && (
          <motion.div
            initial={{
              x: attackerStart.x,
              y: attackerStart.y,
              opacity: 0,
              scaleX: 0.2,
              scaleY: 0.2,
              width: shouldUseAdvancedAttack ? cellSize * 0.66 : cellSize * 0.42,
              height: shouldUseAdvancedAttack ? cellSize * 0.08 : cellSize * 0.04,
              rotate: trajectoryRotation,
            }}
            animate={{
              x: defenderPos.x,
              y: defenderPos.y,
              opacity: 0.75,
              scaleX: 1,
              scaleY: 1,
              width: shouldUseAdvancedAttack ? cellSize * 0.84 : cellSize * 0.42,
              height: shouldUseAdvancedAttack ? cellSize * 0.04 : cellSize * 0.02,
              rotate: trajectoryRotation,
            }}
            transition={{
              duration: lungeDurationMs / 1000,
              times: [0, 0.62, 1],
              ease: 'easeIn',
            }}
            className="chess-attack-combat-rail"
            style={{
              left: attackerStart.x,
              top: attackerStart.y,
              transformOrigin: 'left center',
              zIndex: 998,
            }}
          />
        )}

        {phase === 'lunge' && (
          <motion.div
            initial={{
              x: attackerStart.x,
              y: attackerStart.y,
              opacity: 0.75,
              scale: 0.46,
              width: cellSize * 0.3,
              height: cellSize * 0.1,
              rotate: trajectoryRotation,
            }}
            animate={{
              x: defenderPos.x,
              y: defenderPos.y,
              opacity: 0,
              scale: 0.08,
              width: shouldUseAdvancedAttack ? cellSize * 0.5 : cellSize * 0.26,
              height: shouldUseAdvancedAttack ? cellSize * 0.05 : cellSize * 0.18,
              rotate: trajectoryRotation,
            }}
            transition={{
              duration: lungeDurationMs / 1000,
              times: [0, 0.72, 1],
              ease: 'easeOut',
            }}
            className="chess-attack-trail"
            style={{
              transformOrigin: 'center',
              zIndex: 999,
              left: attackerStart.x,
              top: attackerStart.y,
            }}
          />
        )}

        {(phase === 'impact' || phase === 'settle') && (
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 1 + normalizedDefenderProfile.impactScale * 0.25, opacity: 0.74 }}
            transition={{ duration: (impactDurationMs + settleDurationMs) / 1000, ease: 'easeOut' }}
            className={`chess-attack-defender-shell ${isKingDefender ? 'chess-attack-defender-shell--king' : ''}`}
            style={{
              left: defenderPos.x,
              top: defenderPos.y,
              width: cellSize - cellSize * 0.08,
              height: cellSize - cellSize * 0.08,
              transform: 'translate(-50%, -50%)',
              filter: qualityIntensity < 0.8 ? 'blur(0.45px)' : 'none',
            }}
          >
          <PieceGlyph
            pieceType={animation.defender.type}
            fallbackColor={PIECE_COLOR_BY_TYPE[animation.defender.type]}
            size="clamp(35px, 7vw, 67px)"
            className="relative"
            style={{
              transform: `rotate(${defenderRotation}deg)`,
              '--piece-glyph-text-shadow': 'var(--attack-defender-shadow)',
              '--piece-glyph-color': 'var(--attack-defender-color)',
            }}
            />
          </motion.div>
        )}

        {phase === 'impact' && shouldUseAdvancedAttack && (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0.12, rotate: trajectoryRotation }}
              animate={{ opacity: 0.75, scale: 1.08, rotate: trajectoryRotation }}
              transition={{ duration: Math.max(0.16, impactDurationMs / 1000 * 0.42), ease: 'easeOut' }}
              className="chess-attack-combat-flash"
              style={{
                left: defenderPos.x,
                top: defenderPos.y,
                width: cellSize * 1.06,
                height: cellSize * 1.06,
                rotate: trajectoryRotation,
              }}
            />
            {combatSlashAngles.map((offset, index) => (
              <motion.span
                key={`combat-slash-${index}`}
                initial={{ scaleX: 0.12, opacity: 0, rotate: trajectoryRotation + offset }}
                animate={{ scaleX: 0.9, opacity: [0.72, 0] }}
                transition={{
                  duration: Math.max(0.14, impactDurationMs / 1000 * 0.64),
                  delay: index * 0.02,
                  ease: [0.18, 0.78, 0.26, 1],
                }}
                className="chess-attack-combat-slash"
                style={{
                  left: defenderPos.x,
                  top: defenderPos.y,
                  width: cellSize * 1.12,
                  height: shouldUseAdvancedAttack ? 3 : 2,
                  transformOrigin: 'left center',
                }}
              />
            ))}
            {burstVectors.map((burst, index) => (
              <motion.span
                key={`burst-${index}`}
                initial={{
                  left: defenderPos.x,
                  top: defenderPos.y,
                  width: burst.size,
                  height: burst.size,
                  opacity: 0.8,
                  scale: 1,
                }}
                animate={{
                  left: defenderPos.x + Math.cos(burst.angle) * cellSize * burst.range * 0.44,
                  top: defenderPos.y + Math.sin(burst.angle) * cellSize * burst.range * 0.44,
                  opacity: 0,
                  scale: 0.12,
                }}
                transition={{
                  duration: Math.max(0.22, impactDurationMs / 1000 * 0.9),
                  delay: index * 0.02,
                  ease: 'easeOut',
                }}
                className="chess-attack-burst"
                style={{
                  width: `${burst.size}px`,
                  height: `${burst.size}px`,
                }}
              />
            ))}
            <motion.span
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scaleX: 1, scaleY: 1, opacity: [0.72, 0.04] }}
              transition={{ duration: Math.max(0.24, impactDurationMs / 1000 * 0.7), ease: 'easeOut' }}
              className="chess-attack-connector"
              style={{
                left: attackerStart.x,
                top: defenderPos.y - cellSize * 0.2,
                width: `${cellSize * 0.62}px`,
                height: `${cellSize * 0.08}px`,
              }}
            />
          </>
        )}

        {phase === 'impact' && (
          <motion.div
            initial={{ scale: 0.2, opacity: 0.78, rotate: -25 }}
            animate={{ scale: 1, opacity: 0.12, rotate: 14 }}
            transition={{ duration: Math.max(0.22, impactDurationMs / 1000 * 0.7), ease: 'easeOut' }}
            className="chess-attack-impact-rings"
            style={{
              left: defenderPos.x,
              top: defenderPos.y,
              width: impactRadius,
              height: impactRadius,
            }}
          />
        )}

        {phase === 'impact' && (
          <motion.div
            initial={{ scale: 0.1, opacity: 1 }}
            animate={{ scale: 1.7 * defenderRecoil.magnitude * normalizedDefenderProfile.power, opacity: 0 }}
            transition={{ duration: Math.max(0.16, impactDurationMs / 1000 * 0.74), ease: 'easeOut' }}
            className="chess-attack-impact-wave"
            style={{
              left: defenderPos.x,
              top: defenderPos.y,
              width: cellSize,
              height: cellSize,
            }}
          />
        )}

        {(phase === 'impact' || phase === 'settle') && (
          <motion.div
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: -10, transition: { duration: 0.45, ease: 'easeOut' } }}
            transition={{ duration: Math.max(1.5, (impactDurationMs + settleDurationMs) / 1000), ease: 'backOut' }}
            className="chess-attack-impact-label"
            style={{
              left: defenderPos.x,
              top: defenderPos.y - cellSize,
            }}
          >
            <div>{impactLabel}</div>
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
};

export default ChessAttackAnimation;
