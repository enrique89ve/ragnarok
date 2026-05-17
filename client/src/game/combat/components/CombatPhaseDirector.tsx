import React from 'react';
import { motion } from 'framer-motion';
import { CombatPhase } from '../../types/PokerCombatTypes';
import { ARENA_VFX_TARGETS, arenaVfxTargetProps } from '../arenaVfxTargets';

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
	pills?: ReadonlyArray<string>;
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

interface DirectorMetric {
	readonly label: string;
	readonly value: string;
	readonly tone: 'risk' | 'call' | 'board' | 'mana' | 'neutral';
}

function getModeLabel(mode: CombatPhaseDirectorMode): string {
	if (mode === 'wager') return 'Wager Round';
	if (mode === 'resolution') return 'Resolution';
	return 'Setup Window';
}

function getWindowLabel(isWaiting: boolean, isPlayerTurn: boolean): string {
	if (isWaiting) return 'Enemy Acting';
	return isPlayerTurn ? 'Your Decision' : 'Enemy Window';
}

function toDirectorMetric(pill: string): DirectorMetric {
	if (/^stakes\s+/i.test(pill)) {
		return { label: 'Pot', value: pill.replace(/^stakes\s+/i, ''), tone: 'risk' };
	}

	if (/^to call\s+/i.test(pill)) {
		return { label: 'Call', value: pill.replace(/^to call\s+/i, ''), tone: 'call' };
	}

	if (/^next stake\s+/i.test(pill)) {
		return { label: 'Next', value: pill.replace(/^next stake\s+/i, ''), tone: 'call' };
	}

	if (/allies on board/i.test(pill)) {
		return { label: 'Board', value: pill.replace(/\son board$/i, ''), tone: 'board' };
	}

	if (/mana$/i.test(pill)) {
		return { label: 'Mana', value: pill.replace(/\smana$/i, ''), tone: 'mana' };
	}

	if (/cards ready$/i.test(pill)) {
		return { label: 'Hand', value: pill.replace(/\sready$/i, ''), tone: 'neutral' };
	}

	return { label: 'Intel', value: pill, tone: 'neutral' };
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
	const windowLabel = getWindowLabel(isWaiting, isPlayerTurn);
	const modeLabel = getModeLabel(mode);
	const metrics = pills.map(toDirectorMetric);

	return (
		<motion.section
			initial={{ opacity: 0, y: 10, scale: 0.98 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
			className={`combat-phase-director mode-${mode} ${isPlayerTurn ? 'player-window' : 'opponent-window'} ${isWaiting ? 'is-waiting' : ''}`}
			aria-label={`${phaseLabel}: ${headline}`}
		>
			<div className="combat-phase-director-topline">
				<div className="combat-phase-director-brand">
					<span className="combat-phase-director-kicker">Battle Cadence</span>
					<span className="combat-phase-director-mode">{modeLabel}</span>
				</div>
				<span className="combat-phase-director-window">
					<span className="combat-phase-director-window-dot" aria-hidden="true" />
					{windowLabel}
				</span>
			</div>

			<ol className="combat-phase-rail" aria-label="combat phase progression">
				{PHASE_RAIL.map((step, index) => {
					const state =
						currentIndex > index
							? 'complete'
							: currentIndex === index
								? 'current'
								: 'upcoming';

					return (
						<li
							key={step.phase}
							className={`combat-phase-step ${state}`}
							aria-current={state === 'current' ? 'step' : undefined}
						>
							<span className="combat-phase-step-marker">{index + 1}</span>
							<span className="combat-phase-step-label">{step.label}</span>
						</li>
					);
				})}
			</ol>

			<div className="combat-phase-director-copy">
				<div className="combat-phase-director-order">
					<span className="combat-phase-director-phase">{phaseLabel}</span>
					<span className="combat-phase-director-cue">{cue}</span>
				</div>
				<strong className="combat-phase-director-title">{headline}</strong>
				<p className="combat-phase-director-text">{body}</p>
			</div>

			{metrics.length > 0 && (
				<div className="combat-phase-director-pills">
					{metrics.map((metric, index) => (
						<span
							key={`${metric.label}-${metric.value}-${index}`}
							className={`combat-phase-director-pill tone-${metric.tone}`}
							{...(metric.tone === 'risk' ? arenaVfxTargetProps(ARENA_VFX_TARGETS.riskDisplay) : {})}
						>
							<span className="combat-phase-director-pill-label">{metric.label}</span>
							<span className="combat-phase-director-pill-value">{metric.value}</span>
						</span>
					))}
				</div>
			)}
		</motion.section>
	);
};

export default CombatPhaseDirector;
