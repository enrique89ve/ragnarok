import React from 'react';
import { motion } from 'framer-motion';
import { CombatPhase } from '../../types/PokerCombatTypes';

type CombatPhaseDirectorMode = 'setup' | 'wager' | 'resolution';

interface CombatPhaseDirectorProps {
	phase: CombatPhase;
	phaseLabel: string;
	headline: string;
	body: string;
	cue: string;
	mode: CombatPhaseDirectorMode;
	isPlayerTurn: boolean;
	isWaiting: boolean;
	pills?: string[];
}

const PHASE_RAIL: Array<{ phase: CombatPhase; label: string }> = [
	{ phase: CombatPhase.SPELL_PET, label: 'Spellcraft' },
	{ phase: CombatPhase.PRE_FLOP, label: 'First Blood' },
	{ phase: CombatPhase.FAITH, label: 'Faith' },
	{ phase: CombatPhase.FORESIGHT, label: 'Foresight' },
	{ phase: CombatPhase.DESTINY, label: 'Destiny' },
	{ phase: CombatPhase.RESOLUTION, label: 'Showdown' },
];

function getPhaseIndex(phase: CombatPhase): number {
	return PHASE_RAIL.findIndex(step => step.phase === phase);
}

export const CombatPhaseDirector: React.FC<CombatPhaseDirectorProps> = ({
	phase,
	phaseLabel,
	headline,
	body,
	cue,
	mode,
	isPlayerTurn,
	isWaiting,
	pills = [],
}) => {
	const currentIndex = getPhaseIndex(phase);

	return (
		<motion.div
			layout
			initial={{ opacity: 0, y: 10, scale: 0.98 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
			className={`combat-phase-director mode-${mode} ${isPlayerTurn ? 'player-window' : 'opponent-window'} ${isWaiting ? 'is-waiting' : ''}`}
		>
			<div className="combat-phase-director-topline">
				<span className="combat-phase-director-kicker">Battle Cadence</span>
				<span className="combat-phase-director-cue">{cue}</span>
			</div>

			<div className="combat-phase-rail" aria-label="combat phase progression">
				{PHASE_RAIL.map((step, index) => {
					const state =
						currentIndex > index
							? 'complete'
							: currentIndex === index
								? 'current'
								: 'upcoming';

					return (
						<div
							key={step.phase}
							className={`combat-phase-step ${state}`}
							aria-current={state === 'current' ? 'step' : undefined}
						>
							<span className="combat-phase-step-marker">{index + 1}</span>
							<span className="combat-phase-step-label">{step.label}</span>
						</div>
					);
				})}
			</div>

			<div className="combat-phase-director-copy">
				<span className="combat-phase-director-phase">{phaseLabel}</span>
				<strong className="combat-phase-director-title">{headline}</strong>
				<p className="combat-phase-director-text">{body}</p>
			</div>

			{pills.length > 0 && (
				<div className="combat-phase-director-pills">
					{pills.map((pill, index) => (
						<span key={`${pill}-${index}`} className="combat-phase-director-pill">
							{pill}
						</span>
					))}
				</div>
			)}
		</motion.div>
	);
};

export default CombatPhaseDirector;
