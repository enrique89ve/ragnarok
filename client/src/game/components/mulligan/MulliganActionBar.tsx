import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';

/*
  MulliganActionBar — one clear commit action, plus a keep-all shortcut when
  the player has already marked cards for replacement.

  - The first visible action receives the forwarded ref so MulliganScreen can
    auto-focus a real decision control (keyboard users never land on a dead surface).
  - `isolation: isolate` carves a standalone stacking context so underlying
    arena UI never bleeds beside or behind the action row.
  - Focus-visible state uses an amber outline — Norse warmth, not generic.
*/

interface MulliganActionBarProps {
	readonly selectedCount: number;
	readonly onKeepAll: () => void;
	readonly onConfirm: () => void;
	readonly disableMotion: boolean;
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
	'bg-gradient-to-br from-emerald-800 to-emerald-700 border-emerald-400/45 ' +
	'shadow-[0_4px_16px_rgba(0,0,0,0.4)] hover:shadow-[0_8px_24px_rgba(34,197,94,0.35)]';

const BTN_REPLACE_BASE =
	'bg-gradient-to-br from-amber-800 to-amber-700 border-amber-400/50 ' +
	'shadow-[0_4px_16px_rgba(0,0,0,0.4)] hover:shadow-[0_8px_24px_rgba(245,158,11,0.4)]';

const BTN_REPLACE_SELECTED =
	'shadow-[0_4px_20px_rgba(245,158,11,0.4)] border-amber-300/75';

export const MulliganActionBar = forwardRef<HTMLButtonElement, MulliganActionBarProps>(
	({ selectedCount, onKeepAll, onConfirm, disableMotion }, firstButtonRef) => {
		const replaceButton = (
			<button
				ref={selectedCount === 0 ? firstButtonRef : undefined}
				type="button"
				className={`${BTN_BASE} ${selectedCount > 0 ? `${BTN_REPLACE_BASE} ${BTN_REPLACE_SELECTED}` : BTN_KEEP}`}
				onClick={onConfirm}
				aria-label={
					selectedCount === 0
						? 'Keep the current hand and start the match'
						: `Replace ${selectedCount} selected card${selectedCount > 1 ? 's' : ''}`
				}
			>
				{selectedCount === 0
					? 'Keep Hand'
					: `Replace ${selectedCount} Card${selectedCount > 1 ? 's' : ''}`}
			</button>
		);
		const content = selectedCount === 0 ? (
			replaceButton
		) : (
			<>
				<button
					ref={firstButtonRef}
					type="button"
					className={`${BTN_BASE} ${BTN_KEEP}`}
					onClick={onKeepAll}
					aria-label="Keep all cards and start the match"
				>
					Keep All
				</button>
				{replaceButton}
			</>
		);

		return disableMotion ? (
			<div className="relative z-[3] flex items-center justify-center gap-6 isolate">
				{content}
			</div>
		) : (
			<motion.div
				className="relative z-[3] flex items-center justify-center gap-6 isolate"
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.65, duration: 0.35 }}
			>
				{content}
			</motion.div>
		);
	}
);

MulliganActionBar.displayName = 'MulliganActionBar';

export default MulliganActionBar;
