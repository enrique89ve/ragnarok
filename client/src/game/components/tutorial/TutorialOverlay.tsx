/**
 * TutorialOverlay.tsx — Non-blocking tutorial that auto-advances on player actions
 *
 * Positioned at bottom-center (doesn't block the game board).
 * Shows current step with highlight hint. Auto-advances via TutorialSubscriber.
 * Can be dismissed permanently with one click.
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTutorialStore, TUTORIAL_STEPS } from '../../tutorial/tutorialStore';

const STEP_ICONS: Record<string, string> = {
	welcome: '\u2694\uFE0F',
	mana: '\uD83D\uDC8E',
	hand: '\uD83C\uDCCF',
	minions: '\uD83D\uDC79',
	spells: '\u2728',
	weapons: '\u2694\uFE0F',
	hero_power: '\u26A1',
	attack: '\uD83C\uDFF9',
	taunt: '\uD83D\uDEE1\uFE0F',
	end_turn: '\u23ED\uFE0F',
	poker: '\uD83C\uDCA1',
	deck_building: '\uD83D\uDCDA',
	keywords: '\uD83D\uDD16',
	winning: '\uD83C\uDFC6',
	done: '\uD83C\uDF1F',
};

const STEP_HINTS: Record<string, string> = {
	welcome: 'Let\'s get started!',
	mana: 'Look at the blue crystal in the top-left of your cards',
	hand: 'Click a card in your hand to play it',
	minions: 'Your minions appear on the battlefield below your hero',
	spells: 'Spells have instant effects — try playing one',
	weapons: 'Weapons let your hero attack directly',
	hero_power: 'The glowing button near your hero portrait',
	attack: 'Click your minion, then click an enemy to attack',
	taunt: 'You must attack Taunt minions first',
	end_turn: 'Click the End Turn button when you\'re done',
	poker: 'Poker hands determine bonus damage in combat',
	deck_building: 'Build custom decks in the Army Selection screen',
	keywords: 'Hover over keyword badges on cards for details',
	winning: 'Reduce the enemy king\'s health to zero!',
	done: 'You\'re ready!',
};

export default function TutorialOverlay() {
	const tutorialDismissed = useTutorialStore(s => s.tutorialDismissed);
	const currentStepIndex = useTutorialStore(s => s.currentStepIndex);
	const nextStep = useTutorialStore(s => s.nextStep);
	const prevStep = useTutorialStore(s => s.prevStep);
	const dismissTutorial = useTutorialStore(s => s.dismissTutorial);
	const [minimized, setMinimized] = useState(false);

	// Auto-dismiss after completing all steps
	useEffect(() => {
		if (currentStepIndex >= TUTORIAL_STEPS.length - 1) {
			const t = setTimeout(dismissTutorial, 3000);
			return () => clearTimeout(t);
		}
		return undefined;
	}, [currentStepIndex, dismissTutorial]);

	if (tutorialDismissed) return null;

	const step = TUTORIAL_STEPS[currentStepIndex];
	if (!step) return null;

	const icon = STEP_ICONS[step.id] || '\uD83D\uDCA1';
	const hint = STEP_HINTS[step.id] || '';
	const isLast = currentStepIndex === TUTORIAL_STEPS.length - 1;
	const progress = ((currentStepIndex + 1) / TUTORIAL_STEPS.length) * 100;

	if (minimized) {
		return (
			<button
				onClick={() => setMinimized(false)}
				className="fixed bottom-4 left-4 z-[9990] px-3 py-2 bg-amber-900/80 border border-amber-700/50 rounded-lg text-amber-400 text-xs font-semibold hover:bg-amber-800/80 transition-colors"
				style={{ backdropFilter: 'blur(4px)' }}
			>
				{icon} Tutorial ({currentStepIndex + 1}/{TUTORIAL_STEPS.length})
			</button>
		);
	}

	return (
		<AnimatePresence>
			<motion.div
				initial={{ y: 100, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				exit={{ y: 100, opacity: 0 }}
				className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9990] w-full max-w-lg px-4"
			>
				<div
					className="rounded-xl border border-amber-700/40 p-4 shadow-2xl"
					style={{ background: 'rgba(15, 12, 8, 0.95)', backdropFilter: 'blur(8px)' }}
				>
					{/* Top row: progress + controls */}
					<div className="flex items-center justify-between mb-2">
						<div className="flex items-center gap-2">
							<span className="text-lg">{icon}</span>
							<span className="text-xs text-gray-500">{currentStepIndex + 1} / {TUTORIAL_STEPS.length}</span>
						</div>
						<div className="flex items-center gap-2">
							<button
								onClick={() => setMinimized(true)}
								className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
							>
								Minimize
							</button>
							<button
								onClick={dismissTutorial}
								className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
							>
								Skip All
							</button>
						</div>
					</div>

					{/* Progress bar */}
					<div className="w-full h-1 bg-gray-800 rounded-full mb-3 overflow-hidden">
						<motion.div
							className="h-full bg-amber-500 rounded-full"
							animate={{ width: `${progress}%` }}
							transition={{ duration: 0.3 }}
						/>
					</div>

					{/* Content */}
					<h3 className="text-base font-bold text-amber-400 mb-1">{step.title}</h3>
					<p className="text-sm text-gray-300 leading-relaxed mb-1">{step.description}</p>
					{hint && (
						<p className="text-xs text-amber-600/70 italic">{hint}</p>
					)}

					{/* Navigation */}
					<div className="flex gap-2 mt-3">
						{currentStepIndex > 0 && (
							<button
								onClick={prevStep}
								className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded text-xs transition-colors"
							>
								Back
							</button>
						)}
						<button
							onClick={nextStep}
							className="flex-1 px-3 py-1.5 bg-amber-700 hover:bg-amber-600 text-white rounded text-xs font-semibold transition-colors"
						>
							{isLast ? 'Start Playing!' : 'Next'}
						</button>
					</div>
				</div>
			</motion.div>
		</AnimatePresence>
	);
}
