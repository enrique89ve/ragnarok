import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { gsap } from 'gsap';
import { CardInstance, MulliganState } from '../types';
import { MulliganCard } from './MulliganCard';
import { EmberField } from './transitions/EmberField';
import { MulliganDetailPanel } from './mulligan/MulliganDetailPanel';
import { MulliganActionBar } from './mulligan/MulliganActionBar';
import { collectMountedMulliganCardTargets } from './mulligan/mulliganEntranceTargets';
import { useGameStore } from '../stores/gameStore';
import { useSettingsStore } from '../stores/settingsStore';
import { ARENA_VFX_LAYERS, getArenaVfxLayer } from '../combat/arenaVfxTargets';
import './mulligan.css';

interface MulliganScreenProps {
  mulligan: MulliganState;
  playerHand: ReadonlyArray<CardInstance>;
  onMulliganAction: (newState: any) => void;
}

const OVERLAY_CLASS =
  'absolute inset-0 z-10 pointer-events-auto flex flex-col items-center justify-center ' +
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

const MULLIGAN_CARD_START_DELAY = 0.42;
const MULLIGAN_CARD_STAGGER = 0.09;
const MULLIGAN_CARD_TRAVEL_DURATION = 0.68;
const MULLIGAN_CARD_REVEAL_OFFSET = 0.2;
const MULLIGAN_ACTION_SETTLE_DELAY = 0.86;

const CINEMATIC_EASE = [0.16, 1, 0.3, 1] as const;

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
  const mulliganCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
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
  const actionEntranceDelay =
    MULLIGAN_CARD_START_DELAY +
    Math.max(validPlayerHand.length - 1, 0) * MULLIGAN_CARD_STAGGER +
    MULLIGAN_ACTION_SETTLE_DELAY;

  const cardEntranceKey = validPlayerHand.map(card => card.instanceId).join('|');

  useLayoutEffect(() => {
    if (!mulligan?.active || disableMotion) return;

    const cards = collectMountedMulliganCardTargets(
      validPlayerHand.map(card => card.instanceId),
      mulliganCardRefs.current,
    );
    if (cards.length === 0) return;

    const centerIndex = (cards.length - 1) / 2;
    const context = gsap.context(() => {
      const timeline = gsap.timeline({ delay: MULLIGAN_CARD_START_DELAY });

      timeline.fromTo(
        cards,
        {
          autoAlpha: 0,
          x: index => (centerIndex - index) * 112,
          y: 86,
          scale: 0.78,
          rotation: index => (index - centerIndex) * 8,
          rotationY: -26,
          rotationX: 9,
          transformOrigin: '50% 100%',
        },
        {
          autoAlpha: 1,
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
          rotationY: 0,
          rotationX: 0,
          duration: MULLIGAN_CARD_TRAVEL_DURATION,
          ease: 'back.out(1.35)',
          stagger: MULLIGAN_CARD_STAGGER,
          overwrite: 'auto',
        }
      );
    }, containerRef.current ?? undefined);

    return () => context.revert();
  }, [cardEntranceKey, disableMotion, mulligan?.active, validPlayerHand]);

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
        entranceRevealDelay={MULLIGAN_CARD_START_DELAY + i * MULLIGAN_CARD_STAGGER + MULLIGAN_CARD_REVEAL_OFFSET}
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
      <div
        key={card.instanceId}
        className="mulligan-entrance-card"
        ref={node => {
          mulliganCardRefs.current[card.instanceId] = node;
        }}
      >
        {cardNode}
      </div>
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
    <motion.div
      className="mulligan-entrance-header text-center mb-8"
      initial={{ opacity: 0, y: -18, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.18, duration: 0.52, ease: CINEMATIC_EASE }}
    >
      <motion.h2
        id="mulligan-title"
        className={TITLE_CLASS}
        initial={{ scale: 0.72, opacity: 0, y: 8, rotateX: -16 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.24, type: 'spring', stiffness: 260, damping: 19, mass: 0.72 }}
      >
        Mulligan
      </motion.h2>
      <motion.p
        id="mulligan-subtitle"
        className={SUBTITLE_CLASS}
        initial={{ opacity: 0, y: 9 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.38, ease: 'easeOut' }}
      >
        Select cards to replace
      </motion.p>
    </motion.div>
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
        initial={{ opacity: 0, scale: 0.72, rotate: -12 }}
        animate={{ opacity: 1, scale: 1, rotate: 360 }}
        transition={{
          opacity: { delay: 0.08, duration: 0.52, ease: 'easeOut' },
          scale: { delay: 0.08, duration: 0.9, ease: CINEMATIC_EASE },
          rotate: { duration: 60, repeat: Infinity, ease: 'linear' },
        }}
      />
      <motion.div
        className="mulligan-ring mulligan-ring-small"
        initial={{ opacity: 0, scale: 0.82, rotate: 16 }}
        animate={{ opacity: 1, scale: 1, rotate: -360 }}
        transition={{
          opacity: { delay: 0.18, duration: 0.52, ease: 'easeOut' },
          scale: { delay: 0.18, duration: 0.9, ease: CINEMATIC_EASE },
          rotate: { duration: 40, repeat: Infinity, ease: 'linear' },
        }}
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
      className="mulligan-entrance-shell relative z-2 w-full max-w-255 px-4"
      initial={{ y: 28, opacity: 0, scale: 0.97, rotateX: 4 }}
      animate={{ y: 0, opacity: 1, scale: 1, rotateX: 0 }}
      transition={{ delay: 0.06, duration: 0.48, ease: CINEMATIC_EASE }}
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
        entranceDelay={actionEntranceDelay}
      />
      {waitingIndicator}
    </motion.div>
  );

  const portal = disableMotion ? (
    <div className="mulligan-portal-layer" aria-hidden="true">
      <div className="mulligan-portal-aura" />
      <div className="mulligan-portal-flare" />
      <div className="mulligan-portal-beam mulligan-portal-beam-horizontal" />
      <div className="mulligan-portal-beam mulligan-portal-beam-diagonal" />
      <div className="mulligan-portal-core" />
    </div>
  ) : (
    <div className="mulligan-portal-layer" aria-hidden="true">
      <motion.div
        className="mulligan-portal-aura"
        initial={{ opacity: 0, scale: 0.34 }}
        animate={{ opacity: [0, 0.72, 0.36], scale: [0.34, 1.08, 1] }}
        transition={{ duration: 1.2, times: [0, 0.42, 1], ease: CINEMATIC_EASE }}
      />
      <motion.div
        className="mulligan-portal-flare"
        initial={{ opacity: 0, scale: 0.3, rotate: -18 }}
        animate={{ opacity: [0, 0.65, 0.18], scale: [0.3, 1.06, 1], rotate: 0 }}
        transition={{ duration: 1.05, times: [0, 0.44, 1], ease: CINEMATIC_EASE }}
      />
      <motion.div
        className="mulligan-portal-beam mulligan-portal-beam-horizontal"
        initial={{ opacity: 0, scaleX: 0.12 }}
        animate={{ opacity: [0, 0.92, 0.08], scaleX: [0.12, 1.08, 1] }}
        transition={{ duration: 0.84, times: [0, 0.43, 1], ease: CINEMATIC_EASE }}
      />
      <motion.div
        className="mulligan-portal-beam mulligan-portal-beam-diagonal"
        initial={{ opacity: 0, scaleX: 0.12, rotate: -24 }}
        animate={{ opacity: [0, 0.72, 0.06], scaleX: [0.12, 1.02, 1], rotate: -24 }}
        transition={{ duration: 0.96, times: [0, 0.38, 1], ease: CINEMATIC_EASE }}
      />
      <motion.div
        className="mulligan-portal-core"
        initial={{ opacity: 0, scale: 0.08 }}
        animate={{ opacity: [0, 1, 0.16], scale: [0.08, 1.18, 0.82] }}
        transition={{ duration: 0.92, times: [0, 0.42, 1], ease: CINEMATIC_EASE }}
      />
    </div>
  );

  const atmosphere = (
    <>
      <EmberField disableMotion={disableMotion} />
      <div className="mulligan-atmosphere-layers absolute inset-0 pointer-events-none overflow-hidden">
        {portal}
        {rings}
      </div>
    </>
  );

  const portalTarget = getArenaVfxLayer(ARENA_VFX_LAYERS.modal);
  if (!portalTarget) return null;

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

  return createPortal(overlay, portalTarget);
};
