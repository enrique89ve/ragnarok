import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { CardInstance } from '../../types';
import { toMulliganSimpleCardData } from '../MulliganCard';
import type { SimpleCardData } from '../card/SimpleCardCompat';
import { adaptCardKeywordsForPresentation } from '../card/cardKeywordPresentationAdapter';
import {
	getBloodPriceChromeFaq,
	getElementChromeFaq,
	getPetStageChromeFaq,
	getRarityChromeFaq,
} from '../card/cardChromeFaq';

const PET_STAGE_FAQ: Record<string, number> = {
	basic: 1,
	adept: 2,
	master: 3,
};

const readMulliganChromeLines = (card: SimpleCardData): readonly string[] => {
	const petStage = card.petStage ? PET_STAGE_FAQ[card.petStage] : undefined;
	return [
		card.element && card.element !== 'neutral' ? getElementChromeFaq(card.element) : null,
		card.bloodPrice && card.bloodPrice > 0 ? getBloodPriceChromeFaq(card.bloodPrice) : null,
		petStage !== undefined ? getPetStageChromeFaq(petStage) : null,
		card.rarity ? getRarityChromeFaq(card.rarity) : null,
	].filter((line): line is string => Boolean(line));
};

/*
  MulliganDetailPanel — contextual keyword tooltip.

  The row owns the cards' geometry. This panel is fixed and positioned from the
  hovered card's real DOMRect, so inspection can never push, resize, or reorder
  the cards. It intentionally omits name and mana because they are already
  visible on the card itself.
*/

interface MulliganDetailPanelProps {
  readonly hoveredCard: CardInstance | null;
  readonly anchorRect: DOMRect | null;
  readonly disableMotion: boolean;
}

const TOOLTIP_WIDTH = 280;
const TOOLTIP_ESTIMATED_HEIGHT = 184;
const TOOLTIP_GAP = 12;
const TOOLTIP_EDGE = 16;

const TOOLTIP_CLASS =
  'fixed z-[5] pointer-events-none overflow-y-auto rounded-md ' +
  'border border-amber-400/25 bg-[linear-gradient(180deg,rgba(7,12,24,0.98),rgba(3,7,15,0.98))] ' +
  'px-3.5 py-3 text-[#fbf4dc] ' +
  'shadow-[0_12px_32px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(251,191,36,0.08)]';

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

const resolveTooltipPosition = (rect: DOMRect) => {
  const viewportWidth = typeof window === 'undefined' ? 1280 : window.innerWidth;
  const viewportHeight = typeof window === 'undefined' ? 720 : window.innerHeight;
  const width = Math.min(TOOLTIP_WIDTH, Math.max(0, viewportWidth - TOOLTIP_EDGE * 2));
  const spaceLeft = rect.left;
  const spaceRight = viewportWidth - rect.right;
  const preferRight = spaceRight >= spaceLeft;
  const rightCandidate = rect.right + TOOLTIP_GAP;
  const leftCandidate = rect.left - width - TOOLTIP_GAP;
  const rightFits = rightCandidate + width <= viewportWidth - TOOLTIP_EDGE;
  const leftFits = leftCandidate >= TOOLTIP_EDGE;
  const side = preferRight
    ? (rightFits ? 'right' : 'left')
    : (leftFits ? 'left' : 'right');
  const rawLeft = side === 'right' ? rightCandidate : leftCandidate;
  const left = clamp(rawLeft, TOOLTIP_EDGE, viewportWidth - width - TOOLTIP_EDGE);
  const top = clamp(
    rect.top + rect.height / 2 - TOOLTIP_ESTIMATED_HEIGHT / 2,
    TOOLTIP_EDGE,
    viewportHeight - TOOLTIP_ESTIMATED_HEIGHT - TOOLTIP_EDGE,
  );

  return { left, top, width, side };
};

export const MulliganDetailPanel: React.FC<MulliganDetailPanelProps> = ({
  hoveredCard,
  anchorRect,
  disableMotion,
}) => {
  if (!hoveredCard?.card || !anchorRect) return null;

  const card = toMulliganSimpleCardData(hoveredCard.card);
  const keywordEntries = adaptCardKeywordsForPresentation({
    keywords: card.keywords,
    surface: 'pregame',
    limit: null,
    labelMode: 'full',
  }).entries;
  const chromeLines = readMulliganChromeLines(card);
  const hasInspectionText = keywordEntries.length > 0 || chromeLines.length > 0 || Boolean(card.description);
  if (!hasInspectionText) return null;

  const position = resolveTooltipPosition(anchorRect);
  const tooltipStyle: React.CSSProperties = {
    left: position.left,
    top: position.top,
    width: position.width,
    maxHeight: 'calc(100vh - 32px)',
  };

  const tooltipContent = (
    <>
      {chromeLines.length > 0 && (
        <section className={keywordEntries.length > 0 || card.description ? 'mb-2.5' : ''}>
          <div className="mb-2 text-[9px] font-bold uppercase tracking-[2.5px] text-amber-400/75">
            Card marks
          </div>
          <ul className="space-y-1.5 text-xs leading-[1.45] text-gray-200/90">
            {chromeLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      )}
      {keywordEntries.length > 0 && (
        <section>
          <div className="mb-2 text-[9px] font-bold uppercase tracking-[2.5px] text-amber-400/75">
            Keyword meanings
          </div>
          <ul className="space-y-1.5 text-xs leading-[1.45] text-gray-200/90">
            {keywordEntries.map((entry) => (
              <li key={entry.keyword}>
                <strong className="font-semibold" style={{ color: entry.accent }}>
                  {entry.label}
                </strong>
                <span className="text-gray-300/90"> — {entry.description}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {card.description && (
        <p className={`${keywordEntries.length > 0 ? 'mt-2.5 border-t border-white/10 pt-2.5' : ''} text-xs leading-[1.5] text-gray-200/90`}>
          {card.description}
        </p>
      )}
    </>
  );

  if (disableMotion) {
    return (
      <div className={TOOLTIP_CLASS} style={tooltipStyle} role="tooltip" aria-live="polite">
        {tooltipContent}
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={hoveredCard.instanceId}
        className={TOOLTIP_CLASS}
        style={tooltipStyle}
        role="tooltip"
        aria-live="polite"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
      >
        {tooltipContent}
      </motion.div>
    </AnimatePresence>
  );
};

export default MulliganDetailPanel;
