/**
 * PhasePipIndicator.tsx
 *
 * Visual indicator for multi-phase boss fights. Shows one diamond pip
 * per declared boss phase, dimmed (◇) until that phase has fired and
 * lit (◆) once it has. The pips are sorted in display order: leftmost
 * = highest HP threshold (fires first), rightmost = lowest threshold
 * (fires last, usually the lethal-tier panic move).
 *
 * Mounted near the opponent hero portrait during campaign combat. If the
 * current mission has zero declared bossPhases, the indicator renders
 * nothing — non-boss missions stay clean.
 *
 * Lighting state is computed from the same `opponentCurrentHP /
 * opponentMaxHP` math the boss-phase runner uses, so the visual stays
 * in lockstep with the actual phase fires (no separate state to drift).
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useCampaignStore, getMission } from '../../campaign';
import type { BossPhase } from '../../campaign/campaignTypes';
import './PhasePipIndicator.css';

interface PhasePipIndicatorProps {
	opponentCurrentHP: number;
	opponentMaxHP: number;
}

export const PhasePipIndicator: React.FC<PhasePipIndicatorProps> = ({
	opponentCurrentHP,
	opponentMaxHP,
}) => {
	const currentMissionId = useCampaignStore(s => s.currentMission);

	const phases = useMemo<BossPhase[]>(() => {
		if (!currentMissionId) return [];
		const found = getMission(currentMissionId);
		if (!found?.mission?.bossPhases) return [];
		// Sort descending so leftmost pip = highest HP = fires first.
		return [...found.mission.bossPhases].sort((a, b) => b.hpPercent - a.hpPercent);
	}, [currentMissionId]);

	if (phases.length === 0) return null;
	if (opponentMaxHP <= 0) return null;

	const hpPct = (opponentCurrentHP / opponentMaxHP) * 100;

	return (
		<div className="phase-pip-indicator" aria-label="boss phases">
			<div className="phase-pip-label">PHASES</div>
			<div className="phase-pip-row">
				{phases.map((phase, i) => {
					const fired = hpPct <= phase.hpPercent;
					return (
						<motion.div
							key={i}
							className={`phase-pip ${fired ? 'phase-pip-fired' : ''}`}
							title={phase.description}
							initial={false}
							animate={fired ? { scale: [1, 1.4, 1] } : { scale: 1 }}
							transition={{ duration: 0.5 }}
						>
							{fired ? '\u25C6' : '\u25C7'}
						</motion.div>
					);
				})}
			</div>
		</div>
	);
};

export default PhasePipIndicator;
