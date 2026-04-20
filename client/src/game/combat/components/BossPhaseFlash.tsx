/**
 * BossPhaseFlash.tsx
 *
 * Brief screen-tinted flash overlay used by useBossPhases when a boss
 * phase fires. Renders a fullscreen colored gradient that fades in fast
 * (120ms) and out slow (~600ms). Pure presentational — owned and cleared
 * by the parent (RagnarokCombatArena).
 *
 * Tints map to phase moods:
 *   - red:    rage / damage / berserker
 *   - gold:   divine / mythic boss / Asgardian
 *   - blue:   ice / cold / control
 *   - green:  poison / nature / Vanir
 *   - purple: void / Ginnungagap / cosmic
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BossPhaseFlash as FlashKind } from '../../campaign/campaignTypes';
import './BossPhaseFlash.css';

interface BossPhaseFlashProps {
	flash: FlashKind | null;
}

export const BossPhaseFlash: React.FC<BossPhaseFlashProps> = ({ flash }) => {
	return (
		<AnimatePresence>
			{flash && (
				<motion.div
					key={flash}
					className={`boss-phase-flash boss-phase-flash-${flash}`}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.12 }}
				/>
			)}
		</AnimatePresence>
	);
};

export default BossPhaseFlash;
