import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { gsap } from 'gsap';
import { CardInstance, MulliganState } from '../types';
import { MulliganCard } from './MulliganCard';
import { EmberField } from './transitions/EmberField';
import { MulliganDetailPanel } from './mulligan/MulliganDetailPanel';
import { MulliganActionBar } from './mulligan/MulliganActionBar';
import { MulliganDealRowFx } from './mulligan/MulliganDealRowFx';
import {
	MULLIGAN_FULLSCREEN_SHELL_CLASS,
	MULLIGAN_OVERLAY_CLASS,
	MULLIGAN_SUBTITLE_CLASS,
	MULLIGAN_TITLE_CLASS,
} from './mulligan/mulliganOverlayTokens';
import { resolveMulliganPortalTarget } from './mulligan/resolveMulliganPortalTarget';
import {
	MULLIGAN_LOL,
	MULLIGAN_OPENING_SNAP,
	mulliganIrisDurationStyle,
	type MulliganDealTiming,
} from './mulligan/mulliganLolTiming';
import { MULLIGAN_EXIT_IRIS_OWNER, useMulliganShell } from './mulligan/MulliganShellContext';
import { useMulliganExitIris } from './mulligan/useMulliganExitIris';
import { useArenaVfxRoot } from '../combat/arenaVfxContext';
import { collectMountedMulliganCardTargets } from './mulligan/mulliganEntranceTargets';
import { preloadMulliganHandArt } from '../utils/preloadMulliganHandArt';
import { GAME_COMMAND_TYPES } from '../core/commands';
import { useP2PActions } from '../context/useP2PActions';
import { useSettingsStore } from '../stores/settingsStore';
import './mulligan.css';

interface MulliganScreenProps {
  mulligan: MulliganState | null | undefined;
  playerHand: ReadonlyArray<CardInstance>;
  onMulliganAction: (newState: any) => void;
  /** Local opening hand: skip ghost prime, flip, and button settle beats. */
  snapEntrance?: boolean;
}

const OVERLAY_CLASS = MULLIGAN_OVERLAY_CLASS;
const TITLE_CLASS = MULLIGAN_TITLE_CLASS;
const SUBTITLE_CLASS = MULLIGAN_SUBTITLE_CLASS;

const MULLIGAN_CARD_START_DELAY = 0;

export const MulliganScreen: React.FC<MulliganScreenProps> = ({
  mulligan,
  playerHand,
  snapEntrance = false,
}) => {
  const p2pActions = useP2PActions();
  const toggleMulliganCard = useCallback(
    (cardId: string) => p2pActions.dispatchGameCommand({ type: GAME_COMMAND_TYPES.toggleMulliganCard, cardId }),
    [p2pActions],
  );
  const confirmMulliganChoice = useCallback(
    () => p2pActions.dispatchGameCommand({ type: GAME_COMMAND_TYPES.confirmMulligan }),
    [p2pActions],
  );
  const skipMulliganChoice = useCallback(
    () => p2pActions.dispatchGameCommand({ type: GAME_COMMAND_TYPES.skipMulligan }),
    [p2pActions],
  );
  const animationsEnabled = useSettingsStore(state => state.animationsEnabled);
  const enhancedVFX = useSettingsStore(state => state.enhancedVFX);
  const reduceMotionSetting = useSettingsStore(state => state.reduceMotion);
  const arenaRoot = useArenaVfxRoot();
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mulliganCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const firstButtonRef = useRef<HTMLButtonElement>(null);
  const [hoveredCard, setHoveredCard] = useState<CardInstance | null>(null);
  const [hoveredCardAnchor, setHoveredCardAnchor] = useState<HTMLElement | null>(null);
  const [hoveredCardRect, setHoveredCardRect] = useState<DOMRect | null>(null);
  const [dealRowPriming, setDealRowPriming] = useState(true);
  const mulliganLive = Boolean(mulligan?.active);
  const disableMotion = useMemo(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return !animationsEnabled || reduceMotionSetting || prefersReducedMotion;
  }, [animationsEnabled, reduceMotionSetting]);
  const dealTiming: MulliganDealTiming = snapEntrance ? MULLIGAN_OPENING_SNAP : MULLIGAN_LOL;
  const entranceMotionOff = disableMotion || snapEntrance;
  const viewportOwnsExit = useMulliganShell().exitIrisOwner === MULLIGAN_EXIT_IRIS_OWNER.viewport;
  const exitIris = useMulliganExitIris(mulliganLive, !disableMotion && !viewportOwnsExit);
  const frozenHandRef = useRef(playerHand);
  if (mulliganLive) frozenHandRef.current = playerHand;
  const displayedHand = mulliganLive ? playerHand : frozenHandRef.current;
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

  useLayoutEffect(() => {
    if (!exitIris.covered) {
      setPortalTarget(null);
      return;
    }
    setPortalTarget(resolveMulliganPortalTarget(arenaRoot, viewportOwnsExit));
  }, [arenaRoot, exitIris.covered, viewportOwnsExit]);

  const disableCardFx = disableMotion || !enhancedVFX;

  const selectedCount = useMemo(
    () => Object.values(mulligan?.playerSelections ?? {}).filter(Boolean).length,
    [mulligan?.playerSelections]
  );
  const validPlayerHand = useMemo(
    () => displayedHand.filter(card => card && card.card),
    [displayedHand]
  );

  useEffect(() => {
    if (!mulligan?.active) return;
    preloadMulliganHandArt(validPlayerHand);
    setDealRowPriming(!snapEntrance);
  }, [mulligan?.active, snapEntrance, validPlayerHand]);

  useEffect(() => {
    if (!mulligan?.active || disableMotion) {
      setDealRowPriming(false);
    }
  }, [disableMotion, mulligan?.active]);

  useEffect(() => {
    if (!mulligan?.active || disableMotion || !dealRowPriming) return;
    const fallback = window.setTimeout(() => setDealRowPriming(false), 450);
    return () => window.clearTimeout(fallback);
  }, [dealRowPriming, disableMotion, mulligan?.active]);
  const actionEntranceDelay = snapEntrance
    ? 0
    : MULLIGAN_CARD_START_DELAY +
      Math.max(validPlayerHand.length - 1, 0) * MULLIGAN_LOL.dealStaggerS +
      MULLIGAN_LOL.actionSettleS;

  const cardEntranceKey = validPlayerHand.map(card => card.instanceId).join('|');

  useLayoutEffect(() => {
    if (!mulligan?.active || entranceMotionOff) return;

    const cards = collectMountedMulliganCardTargets(
      validPlayerHand.map(card => card.instanceId),
      mulliganCardRefs.current,
    );
    if (cards.length === 0) {
      setDealRowPriming(false);
      return;
    }

    const centerIndex = (cards.length - 1) / 2;
    const context = gsap.context(() => {
      const timeline = gsap.timeline({ delay: MULLIGAN_CARD_START_DELAY });

      timeline.eventCallback('onStart', () => {
        setDealRowPriming(false);
      });

      timeline.fromTo(
        cards,
        {
          opacity: 1,
          x: index => (centerIndex - index) * (snapEntrance ? 28 : 56),
          y: snapEntrance ? 20 : 48,
          scale: snapEntrance ? 0.96 : 0.92,
          rotation: 0,
          transformOrigin: '50% 100%',
        },
        {
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
          duration: dealTiming.dealTravelS,
          ease: snapEntrance ? 'power2.out' : 'power3.out',
          stagger: dealTiming.dealStaggerS,
          overwrite: 'auto',
        }
      );
    }, containerRef.current ?? undefined);

    return () => context.revert();
  }, [cardEntranceKey, dealTiming.dealStaggerS, dealTiming.dealTravelS, entranceMotionOff, mulligan?.active, snapEntrance, validPlayerHand]);

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

  const renderDealRow = (cards: React.ReactNode) => (
    <div className="mulligan-deal-row">
      <MulliganDealRowFx
        slotCount={validPlayerHand.length}
        visible={!entranceMotionOff && dealRowPriming}
      />
      <div className="mulligan-deal-row__cards flex justify-center items-center gap-8 overflow-visible">
        {cards}
      </div>
    </div>
  );

  if (!exitIris.covered || !mulligan || !portalTarget) return null;

  const isWaiting = mulligan.playerReady;
  const cardRow = validPlayerHand.map((card, i) => {
    const cardNode = (
      <MulliganCard
        card={card}
        isSelected={!!mulligan.playerSelections[card.instanceId]}
        onClick={() => toggleMulliganCard(card.instanceId)}
        onHoverChange={handleCardHoverChange}
        disableMotion={entranceMotionOff}
        disableCardFx={disableCardFx}
        entranceRevealDelay={MULLIGAN_CARD_START_DELAY + i * dealTiming.dealStaggerS + dealTiming.flipRevealOffsetS}
      />
    );

    if (entranceMotionOff) {
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

  const header = entranceMotionOff ? (
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
      transition={{ delay: 0, duration: 0.28, ease: 'easeOut' }}
    >
      <motion.h2
        id="mulligan-title"
        className={TITLE_CLASS}
        initial={{ scale: 0.72, opacity: 0, y: 8, rotateX: -16 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.04, type: 'spring', stiffness: 420, damping: 28, mass: 0.55 }}
      >
        Mulligan
      </motion.h2>
      <motion.p
        id="mulligan-subtitle"
        className={SUBTITLE_CLASS}
        initial={{ opacity: 0, y: 9 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.22, ease: 'easeOut' }}
      >
        Select cards to replace
      </motion.p>
    </motion.div>
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

  const panel = entranceMotionOff ? (
    <div className="relative z-2 w-full max-w-255 px-4">
      {header}
      <div className="mb-10 py-4">
        {renderDealRow(cardRow)}
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
      initial={{ y: 12, opacity: 1, scale: 1, rotateX: 0 }}
      animate={{ y: 0, opacity: 1, scale: 1, rotateX: 0 }}
      transition={{ delay: 0, duration: 0.22, ease: 'easeOut' }}
    >
      {header}
      <div className="mb-10 py-4">
        {renderDealRow(cardRow)}
      </div>
      <MulliganActionBar
        ref={firstButtonRef}
        selectedCount={selectedCount}
        onKeepAll={skipMulliganChoice}
        onConfirm={confirmMulliganChoice}
        disableMotion={entranceMotionOff}
        entranceDelay={actionEntranceDelay}
      />
      {waitingIndicator}
    </motion.div>
  );

  const atmosphere = viewportOwnsExit ? null : (
    <EmberField disableMotion={disableMotion} />
  );
  const useFullscreenShell = viewportOwnsExit;
  const overlayClass = useFullscreenShell
    ? MULLIGAN_FULLSCREEN_SHELL_CLASS
    : `${OVERLAY_CLASS} mulligan-chamber--backdrop-host opening-hand-backdrop-layer opening-hand-backdrop-layer--chamber${
        exitIris.irisOpen ? ' mulligan-chamber--iris' : ''
      }`;

  const overlay = (
    <div
      ref={containerRef}
      className={overlayClass}
      style={exitIris.irisOpen ? mulliganIrisDurationStyle : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mulligan-title"
      aria-describedby="mulligan-subtitle"
    >
      {atmosphere}
      {panel}
      <MulliganDetailPanel
        hoveredCard={hoveredCard}
        anchorRect={hoveredCardRect}
        disableMotion={disableMotion}
      />
    </div>
  );

  return createPortal(overlay, portalTarget);
};
