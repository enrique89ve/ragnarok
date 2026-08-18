import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CardInstance, MulliganState } from '../types';
import { MulliganCard } from './MulliganCard';
import { EmberField } from './transitions/EmberField';
import { MulliganDetailPanel } from './mulligan/MulliganDetailPanel';
import { MulliganActionBar } from './mulligan/MulliganActionBar';
import { useGameStore } from '../stores/gameStore';
import { useSettingsStore } from '../stores/settingsStore';
import './mulligan.css';

interface MulliganScreenProps {
  mulligan: MulliganState;
  playerHand: ReadonlyArray<CardInstance>;
  onMulliganAction: (newState: any) => void;
}

// z-[100000] sits above the cluster of portal-rendered tooltips that all
// share `z-index: var(--z-topmost)` (10000) — UnifiedCardTooltip, hero
// secret tooltips, attack animations — plus the keyword-badge-tooltip
// outlier at 15000. Without this, ties resolve by DOM order and any
// tooltip portaled after the mulligan paints on top of the veil.
const OVERLAY_CLASS =
  'fixed inset-0 z-[100000] flex flex-col items-center justify-center ' +
  // Three-layer atmospheric veil: vignette focal pull + amber halo + obsidian wash.
  'bg-[radial-gradient(ellipse_45%_60%_at_center,transparent_0%,rgba(0,0,0,0.45)_75%,rgba(0,0,0,0.78)_100%),' +
  'radial-gradient(ellipse_65%_85%_at_center,rgba(251,191,36,0.12)_0%,transparent_55%),' +
  'radial-gradient(ellipse_at_center,rgba(10,15,30,0.88)_0%,rgba(0,0,0,0.96)_100%)] ' +
  // Heavy blur dissolves underlying arena UI into atmospheric texture.
  'backdrop-blur-xl backdrop-saturate-[0.85]';

const TITLE_CLASS =
  'font-display font-black text-white uppercase leading-none ' +
  'text-[52px] tracking-[8px] mb-3 ' +
  '[text-shadow:0_0_30px_rgba(251,191,36,0.5),0_4px_8px_rgba(0,0,0,0.8)]';

const SUBTITLE_CLASS =
  'text-[11px] font-bold tracking-[4px] uppercase text-amber-400/55';

export const MulliganScreen: React.FC<MulliganScreenProps> = ({
  mulligan,
  playerHand,
}) => {
  const toggleMulliganCard = useGameStore(state => state.toggleMulliganCard);
  const confirmMulliganChoice = useGameStore(state => state.confirmMulligan);
  const skipMulliganChoice = useGameStore(state => state.skipMulligan);
  const animationsEnabled = useSettingsStore(state => state.animationsEnabled);
  const enhancedVFX = useSettingsStore(state => state.enhancedVFX);
  const reduceMotionSetting = useSettingsStore(state => state.reduceMotion);
  const containerRef = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);
  const [hoveredCard, setHoveredCard] = useState<CardInstance | null>(null);
  const [hoveredCardAnchor, setHoveredCardAnchor] = useState<HTMLElement | null>(null);
  const [hoveredCardRect, setHoveredCardRect] = useState<DOMRect | null>(null);
  const handleCardHoverChange = useCallback((card: CardInstance | null, anchor?: HTMLElement) => {
    setHoveredCard(card);
    setHoveredCardAnchor(anchor ?? null);
    setHoveredCardRect(anchor?.getBoundingClientRect() ?? null);
  }, []);

  // Keep the tooltip attached to the card while the viewport or scroll position changes.
  // The card row itself remains completely outside this measurement/update path.
  useEffect(() => {
    if (!hoveredCardAnchor) return;

    const updateAnchorRect = () => {
      setHoveredCardRect(hoveredCardAnchor.getBoundingClientRect());
    };

    updateAnchorRect();
    window.addEventListener('resize', updateAnchorRect);
    window.addEventListener('scroll', updateAnchorRect, true);
    return () => {
      window.removeEventListener('resize', updateAnchorRect);
      window.removeEventListener('scroll', updateAnchorRect, true);
    };
  }, [hoveredCardAnchor]);

  const disableMotion = useMemo(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return !animationsEnabled || reduceMotionSetting || prefersReducedMotion;
  }, [animationsEnabled, reduceMotionSetting]);
  const disableCardFx = disableMotion || !enhancedVFX;

  const selectedCount = useMemo(
    () => Object.values(mulligan.playerSelections).filter(Boolean).length,
    [mulligan.playerSelections]
  );
  const validPlayerHand = useMemo(
    () => playerHand.filter(card => card && card.card),
    [playerHand]
  );

  // Focus the first available action on mount so keyboard users land on a real
  // decision control instead of having to tab through the atmospheric layer.
  useEffect(() => {
    if (!mulligan?.active) return;
    firstButtonRef.current?.focus();
  }, [mulligan?.active]);

  // Trap Tab navigation inside the dialog; Escape acts as Keep-All.
  useEffect(() => {
    if (!mulligan?.active) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        skipMulliganChoice();
        return;
      }
      if (e.key !== 'Tab') return;
      const root = containerRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mulligan?.active, skipMulliganChoice]);

  if (!mulligan || !mulligan.active) return null;
  const isWaiting = mulligan.playerReady;
  const cardRow = validPlayerHand.map((card, i) => {
    const cardNode = (
      <MulliganCard
        card={card}
        isSelected={!!mulligan.playerSelections[card.instanceId]}
        onClick={() => toggleMulliganCard(card.instanceId)}
        onHoverChange={handleCardHoverChange}
        disableMotion={disableMotion}
        disableCardFx={disableCardFx}
      />
    );

    if (disableMotion) {
      return (
        <div key={card.instanceId}>
          {cardNode}
        </div>
      );
    }

    return (
      <motion.div
        key={card.instanceId}
        initial={{ y: 80, opacity: 0, rotateY: -15 }}
        animate={{ y: 0, opacity: 1, rotateY: 0 }}
        transition={{ delay: 0.3 + i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {cardNode}
      </motion.div>
    );
  });

  const header = disableMotion ? (
    <div className="text-center mb-8">
      <h2 id="mulligan-title" className={TITLE_CLASS}>
        Mulligan
      </h2>
      <p id="mulligan-subtitle" className={SUBTITLE_CLASS}>
        Select cards to replace
      </p>
    </div>
  ) : (
    <div className="text-center mb-8">
      <motion.h2
        id="mulligan-title"
        className={TITLE_CLASS}
        initial={{ scale: 1.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.25, type: 'spring', stiffness: 260, damping: 20 }}
      >
        Mulligan
      </motion.h2>
      <motion.p
        id="mulligan-subtitle"
        className={SUBTITLE_CLASS}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        Select cards to replace
      </motion.p>
    </div>
  );

  const rings = disableMotion ? (
    <>
      <div className="mulligan-ring mulligan-ring-large" />
      <div className="mulligan-ring mulligan-ring-small" />
    </>
  ) : (
    <>
      <motion.div
        className="mulligan-ring mulligan-ring-large"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="mulligan-ring mulligan-ring-small"
        animate={{ rotate: -360 }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
      />
    </>
  );

  const waitingIndicator = isWaiting ? (
    disableMotion ? (
      <div className="flex items-center justify-center gap-3 mt-7">
        <span className="text-[11px] font-bold tracking-[2px] uppercase text-amber-400/65">
          Waiting for opponent…
        </span>
      </div>
    ) : (
      <AnimatePresence>
        <motion.div
          key={`waiting-indicator`}
          className="flex items-center justify-center gap-3 mt-7"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-amber-400/70"
                animate={{ y: [0, -6, 0], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, delay: i * 0.18, repeat: Infinity }}
              />
            ))}
          </div>
          <span className="text-[11px] font-bold tracking-[2px] uppercase text-amber-400/65">
            Waiting for opponent…
          </span>
        </motion.div>
      </AnimatePresence>
    )
  ) : null;

  const panel = disableMotion ? (
    <div className="relative z-2 w-full max-w-255 px-4">
      {header}
      <div className="flex justify-center items-center gap-8 mb-10 py-4 overflow-visible">
        {cardRow}
      </div>
      <MulliganActionBar
        ref={firstButtonRef}
        selectedCount={selectedCount}
        onKeepAll={skipMulliganChoice}
        onConfirm={confirmMulliganChoice}
        disableMotion
      />
      {waitingIndicator}
    </div>
  ) : (
    <motion.div
      className="relative z-2 w-full max-w-255 px-4"
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {header}
      <div className="flex justify-center items-center gap-8 mb-10 py-4 overflow-visible">
        {cardRow}
      </div>
      <MulliganActionBar
        ref={firstButtonRef}
        selectedCount={selectedCount}
        onKeepAll={skipMulliganChoice}
        onConfirm={confirmMulliganChoice}
        disableMotion={disableMotion}
      />
      {waitingIndicator}
    </motion.div>
  );

  const atmosphere = (
    <>
      <EmberField disableMotion={disableMotion} />
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {rings}
      </div>
    </>
  );

  // Portaled to document.body so the fixed overlay isn't trapped by the arena
  // canvas's transform: scale() ancestor (which would otherwise anchor `fixed`
  // to that scaled box, leaving the wrapper/volcano edges bare).
  const overlay = (
    disableMotion ? (
      <div
        ref={containerRef}
        className={OVERLAY_CLASS}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mulligan-title"
        aria-describedby="mulligan-subtitle"
      >
        {atmosphere}
        {panel}
        <MulliganDetailPanel hoveredCard={hoveredCard} anchorRect={hoveredCardRect} disableMotion />
      </div>
    ) : (
      <AnimatePresence>
      <motion.div
        key="mulligan-overlay"
        ref={containerRef}
        className={OVERLAY_CLASS}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mulligan-title"
        aria-describedby="mulligan-subtitle"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
      >
        {atmosphere}
        {panel}
        <MulliganDetailPanel
          hoveredCard={hoveredCard}
          anchorRect={hoveredCardRect}
          disableMotion={disableMotion}
        />
      </motion.div>
      </AnimatePresence>
    )
  );

  return createPortal(overlay, document.body);
};
