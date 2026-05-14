import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CardInstance } from '../../types';

/*
  MulliganDetailPanel — LoL-style hover inspector.

  Reserved min-height keeps the buttons row anchored regardless of hover
  state (no layout shift between hovered/empty). Uses aria-live so screen
  readers announce inspected card name without stealing focus.
*/

interface MulliganDetailPanelProps {
	readonly hoveredCard: CardInstance | null;
}

const PANEL_CLASS =
	'relative z-[2] mx-auto mb-5 w-full max-w-[560px] min-h-[84px] ' +
	'flex items-center justify-center text-left ' +
	'px-[18px] py-3 rounded-md isolate overflow-hidden ' +
	// Fully-opaque obsidian gradient + own backdrop-blur so no underlying UI
	// (mana orbs, turn chips, deck counters) ever bleeds through the panel.
	'bg-[linear-gradient(180deg,rgba(15,20,35,0.96)_0%,rgba(8,10,18,0.99)_100%)] ' +
	'backdrop-blur-md ' +
	'border border-amber-500/[0.22] ' +
	'shadow-[inset_0_1px_0_rgba(251,191,36,0.08),0_8px_24px_rgba(0,0,0,0.65)]';

export const MulliganDetailPanel: React.FC<MulliganDetailPanelProps> = ({ hoveredCard }) => (
	<div className={PANEL_CLASS} aria-live="polite">
		<AnimatePresence mode="wait">
			{hoveredCard?.card ? (
				<motion.div
					key={hoveredCard.instanceId}
					className="w-full flex flex-col gap-1.5"
					initial={{ opacity: 0, y: -6 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -4 }}
					transition={{ duration: 0.18 }}
				>
					<div className="flex items-baseline justify-between gap-3 pb-1.5 border-b border-amber-500/[0.12]">
						<span className="font-display text-sm font-bold uppercase tracking-[1.5px] text-[#fbf4dc]">
							{hoveredCard.card.name}
						</span>
						<span className="text-[10px] font-bold uppercase tracking-[2px] text-amber-400/75 whitespace-nowrap">
							{hoveredCard.card.manaCost} mana
						</span>
					</div>
					{hoveredCard.card.description && (
						<p className="m-0 text-xs leading-[1.5] text-gray-200/85">
							{hoveredCard.card.description}
						</p>
					)}
				</motion.div>
			) : (
				<motion.span
					key="empty"
					className="text-[10px] font-bold uppercase tracking-[3px] text-amber-400/45"
					initial={{ opacity: 0 }}
					animate={{ opacity: 0.5 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.18 }}
				>
					Hover a card to inspect
				</motion.span>
			)}
		</AnimatePresence>
	</div>
);

export default MulliganDetailPanel;
