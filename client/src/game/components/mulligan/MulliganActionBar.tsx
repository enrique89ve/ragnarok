import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';

/*
  MulliganActionBar — Keep / Replace pair of buttons.

  - First button receives the forwarded ref so MulliganScreen can auto-focus
    the keep action on mount (keyboard users land on a real control).
  - `isolation: isolate` carves a standalone stacking context so underlying
    arena UI never bleeds beside or behind the action row.
  - Focus-visible state uses an amber outline — Norse warmth, not generic.
*/

interface MulliganActionBarProps {
	readonly selectedCount: number;
	readonly onKeepAll: () => void;
	readonly onConfirm: () => void;
}

const BTN_BASE =
	'relative min-w-[156px] px-9 py-3.5 rounded ' +
	'font-display font-extrabold text-[13px] tracking-[3px] uppercase text-[#fbf4dc] ' +
	'border border-transparent cursor-pointer ' +
	'transition-[transform,box-shadow,border-color,filter] duration-[180ms] ease ' +
	'hover:-translate-y-[3px] active:translate-y-0 active:duration-[80ms] ' +
	'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-amber-400/90 ' +
	'focus-visible:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.9),0_0_20px_rgba(251,191,36,0.55),0_4px_16px_rgba(0,0,0,0.5)]';

const BTN_KEEP =
	'bg-gradient-to-br from-red-900 to-red-800 border-red-500/35 ' +
	'shadow-[0_4px_16px_rgba(0,0,0,0.4)] hover:shadow-[0_8px_24px_rgba(239,68,68,0.3)]';

const BTN_REPLACE_BASE =
	'bg-gradient-to-br from-green-900 to-green-800 border-green-500/40 ' +
	'shadow-[0_4px_16px_rgba(0,0,0,0.4)] hover:shadow-[0_8px_24px_rgba(34,197,94,0.4)]';

const BTN_REPLACE_SELECTED =
	'shadow-[0_4px_20px_rgba(34,197,94,0.35)] border-green-500/60';

export const MulliganActionBar = forwardRef<HTMLButtonElement, MulliganActionBarProps>(
	({ selectedCount, onKeepAll, onConfirm }, firstButtonRef) => (
		<motion.div
			className="relative z-[3] flex items-center justify-center gap-6 isolate"
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.65, duration: 0.35 }}
		>
			<button
				ref={firstButtonRef}
				type="button"
				className={`${BTN_BASE} ${BTN_KEEP}`}
				onClick={onKeepAll}
				aria-label="Keep all cards and start the match"
			>
				Keep All
			</button>
			<button
				type="button"
				className={`${BTN_BASE} ${BTN_REPLACE_BASE} ${selectedCount > 0 ? BTN_REPLACE_SELECTED : ''}`}
				onClick={onConfirm}
				aria-label={
					selectedCount === 0
						? 'Lock current hand and start the match'
						: `Replace ${selectedCount} selected card${selectedCount > 1 ? 's' : ''}`
				}
			>
				{selectedCount === 0
					? 'Lock Hand'
					: `Replace ${selectedCount} Card${selectedCount > 1 ? 's' : ''}`}
			</button>
		</motion.div>
	)
);

MulliganActionBar.displayName = 'MulliganActionBar';

export default MulliganActionBar;
