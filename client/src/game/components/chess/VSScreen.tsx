import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChessPiece, ChessPieceType, PIECE_DISPLAY_NAMES } from '../../types/ChessTypes';
import { useGameStore } from '../../stores/gameStore';
import { PIECE_COLOR_BY_TYPE } from './pieceVisuals';
import { PieceGlyph } from './PieceGlyph';
import { ChessHealthIcon } from './ChessIconsSVG';
import './VSScreen.css';
import type { PokerEntryApprovalView } from '../../p2p/usePokerEntryApproval';

interface VSScreenProps {
  attacker: ChessPiece;
  defender: ChessPiece;
  onComplete: () => void;
  duration?: number;
  approval?: PokerEntryApprovalView | null;
}

const VS_DEFAULT_DURATION_MS = 3800;
const VS_ENTER_DELAY_MS = 320;
const VS_EXIT_LEAD_MS = 620;
const VS_MIN_DURATION_MS = 3400;

const VSScreen: React.FC<VSScreenProps> = ({ 
  attacker, 
  defender, 
  onComplete,
  duration = VS_DEFAULT_DURATION_MS,
  approval = null,
}) => {
  const [phase, setPhase] = useState<'enter' | 'vs' | 'exit'>('enter');
  const reducedMotion = useReducedMotion();
  // Viewer-relative labeling: "PLAYER" = me locally regardless of canonical side.
  const myCanonicalSide = useGameStore(s => s.myCanonicalSide) ?? 'player';
  const safeDuration = Math.max(VS_MIN_DURATION_MS, duration);
  const exitAt = Math.max(VS_EXIT_LEAD_MS + VS_ENTER_DELAY_MS, safeDuration - VS_EXIT_LEAD_MS);
  const visualPhase = reducedMotion ? 'vs' : phase;

  useEffect(() => {
    const enterTimer = setTimeout(() => setPhase('vs'), VS_ENTER_DELAY_MS);
    if (approval) return () => clearTimeout(enterTimer);
    const exitTimer = setTimeout(() => setPhase('exit'), exitAt);
    const completeTimer = setTimeout(onComplete, safeDuration);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [approval, safeDuration, exitAt, onComplete]);

  const getPieceTitle = (piece: ChessPiece) => {
    return piece.heroName || `${piece.type.charAt(0).toUpperCase()}${piece.type.slice(1)}`;
  };

  return (
    <AnimatePresence>
      <motion.div 
        className="vs-screen-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        <div className="vs-screen-backdrop" />
        
        <div className="vs-screen-content">
          <motion.div 
            className="vs-fighter vs-fighter-left"
            initial={reducedMotion ? false : { x: '-100vw', opacity: 0, scale: 0.92 }}
            animate={{ 
              x: visualPhase === 'exit' ? '-100vw' : 0,
              opacity: visualPhase === 'exit' ? 0 : 1,
              scale: visualPhase === 'exit' ? 0.96 : 1,
            }}
            transition={{ 
              type: 'tween',
              duration: reducedMotion ? 0 : 0.68,
              ease: [0.16, 1, 0.3, 1]
            }}
          >
            <div className="vs-fighter-glow vs-fighter-glow-blue" />
            <div className="vs-fighter-frame">
              <div className="vs-fighter-owner">
                <span>{attacker.owner === myCanonicalSide ? 'PLAYER' : 'OPPONENT'}</span>
              </div>
              <div className="vs-portrait-container">
                <PieceGlyph
                  pieceType={attacker.type}
                  fallbackColor={PIECE_COLOR_BY_TYPE[attacker.type]}
                  size="clamp(114px, 23cqw, 218px)"
                  className="vs-portrait-glyph"
                  style={{ color: 'var(--vs-piece-color)', textShadow: '0 4px 14px rgba(0,0,0,0.7)' }}
                  fallbackTextShadow="0 4px 14px rgba(0,0,0,0.7)"
                />
              </div>
              <div className="vs-fighter-info">
                <span className="vs-fighter-name">{getPieceTitle(attacker)}</span>
                <span className="vs-fighter-type">{PIECE_DISPLAY_NAMES[attacker.type as ChessPieceType].toUpperCase()}</span>
                <div className="vs-fighter-stats">
                  <span className="vs-stat" aria-label={`Health ${attacker.health}`}>
                    <ChessHealthIcon aria-hidden="true" />
                    <span className="vs-stat-value">{attacker.health}</span>
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="vs-center"
            initial={reducedMotion ? false : { scale: 0.72, opacity: 0, rotate: -4 }}
            animate={{ 
              scale: visualPhase === 'vs' ? 1 : (visualPhase === 'exit' ? 0.72 : 0.72),
              opacity: visualPhase === 'exit' ? 0 : 1,
              rotate: visualPhase === 'vs' ? 0 : -4,
            }}
            transition={{ 
              duration: reducedMotion ? 0 : 0.72,
              ease: [0.16, 1, 0.3, 1]
            }}
          >
            <div className="vs-center-frame">
              <div className="vs-text">
                <span className="vs-letter">V</span>
                <span className="vs-letter">S</span>
              </div>
              <div className="vs-sparks" />
            </div>
          </motion.div>

          <motion.div 
            className="vs-fighter vs-fighter-right"
            initial={reducedMotion ? false : { x: '100vw', opacity: 0, scale: 0.92 }}
            animate={{ 
              x: visualPhase === 'exit' ? '100vw' : 0,
              opacity: visualPhase === 'exit' ? 0 : 1,
              scale: visualPhase === 'exit' ? 0.96 : 1,
            }}
            transition={{ 
              type: 'tween',
              delay: reducedMotion ? 0 : 0.05,
              duration: reducedMotion ? 0 : 0.68,
              ease: [0.16, 1, 0.3, 1]
            }}
          >
            <div className="vs-fighter-glow vs-fighter-glow-red" />
            <div className="vs-fighter-frame">
              <div className="vs-fighter-owner">
                <span>{defender.owner === myCanonicalSide ? 'PLAYER' : 'OPPONENT'}</span>
              </div>
              <div className="vs-portrait-container">
                <PieceGlyph
                  pieceType={defender.type}
                  fallbackColor={PIECE_COLOR_BY_TYPE[defender.type]}
                  size="clamp(114px, 23cqw, 218px)"
                  className="vs-portrait-glyph"
                  style={{ color: 'var(--vs-piece-color)', textShadow: '0 4px 14px rgba(0,0,0,0.7)' }}
                  fallbackTextShadow="0 4px 14px rgba(0,0,0,0.7)"
                />
              </div>
              <div className="vs-fighter-info">
                <span className="vs-fighter-name">{getPieceTitle(defender)}</span>
                <span className="vs-fighter-type">{PIECE_DISPLAY_NAMES[defender.type as ChessPieceType].toUpperCase()}</span>
                <div className="vs-fighter-stats">
                  <span className="vs-stat" aria-label={`Health ${defender.health}`}>
                    <ChessHealthIcon aria-hidden="true" />
                    <span className="vs-stat-value">{defender.health}</span>
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          className={`vs-bottom-bar${approval ? ' vs-bottom-bar-approval' : ''}`}
          initial={reducedMotion ? false : { y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: reducedMotion ? 0 : 0.72, duration: reducedMotion ? 0 : 0.38, ease: 'easeOut' }}
        >
          {approval ? <PokerEntryApprovalPanel approval={approval} /> : (
            <span className="vs-battle-text">PREPARE FOR BATTLE</span>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

function PokerEntryApprovalPanel({ approval }: Readonly<{ approval: PokerEntryApprovalView }>) {
  const statusCopy = approval.status === 'paused'
    ? 'Approval paused while connection recovers'
    : approval.status === 'committed'
      ? 'Both warriors are ready'
      : approval.status === 'expired'
        ? 'Approval window expired'
        : approval.status === 'error'
          ? 'Approval service unavailable'
          : approval.status === 'connecting'
            ? 'Synchronizing approval…'
            : approval.localReady || approval.localApprovalPending
              ? 'Waiting for opponent'
              : 'Confirm before entering Poker';

  return (
    <section className="vs-approval" aria-labelledby="vs-approval-title" aria-live="polite">
      <div className="vs-approval-heading">
        <div>
          <span className="vs-approval-kicker">POKER READY CHECK</span>
          <h2 id="vs-approval-title">{statusCopy}</h2>
        </div>
        <div className="vs-approval-clock" role="timer" aria-label={`${approval.secondsRemaining} seconds remaining`}>
          <span>{approval.secondsRemaining}</span>
          <small>SEC</small>
        </div>
      </div>
      <div className="vs-approval-statuses" aria-label="Player approval status">
        <span className={approval.localReady ? 'is-ready' : 'is-pending'}>
          <i aria-hidden="true" /> YOU · {approval.localReady ? 'READY' : approval.localApprovalPending ? 'SUBMITTED' : 'PENDING'}
        </span>
        <span className={approval.opponentReady ? 'is-ready' : 'is-pending'}>
          <i aria-hidden="true" /> OPPONENT · {approval.opponentReady ? 'READY' : 'PENDING'}
        </span>
      </div>
      {approval.localReady || approval.localApprovalPending ? (
		<div className="vs-approval-waiting" role="status">
			{approval.localReady ? 'READY' : 'SUBMITTED'} · WAITING FOR OPPONENT
		</div>
      ) : (
        <button
          type="button"
          className="vs-approval-button"
          onClick={approval.onApprove}
          disabled={!approval.canApprove}
        >
          READY FOR POKER
        </button>
      )}
      <p className="vs-approval-rule">Both players must approve. Missing the deadline closes the match.</p>
    </section>
  );
}

export default VSScreen;
