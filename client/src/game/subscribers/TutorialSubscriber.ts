/**
 * TutorialSubscriber.ts — Wires game events to tutorial step completion
 *
 * Listens to GameEventBus and auto-completes tutorial steps
 * when the player performs the relevant action.
 */

import { GameEventBus } from '../../core/events/GameEventBus';
import { useTutorialStore, TUTORIAL_STEPS } from '../tutorial/tutorialStore';

const EVENT_TO_STEP: Record<string, string> = {
	CARD_PLAYED: 'hand',
	MINION_SUMMONED: 'minions',
	SPELL_CAST: 'spells',
	HERO_POWER_USED: 'hero_power',
	TURN_ENDED: 'end_turn',
	GAME_STARTED: 'welcome',
	GAME_ENDED: 'winning',
	BATTLECRY_TRIGGERED: 'keywords',
	DEATHRATTLE_TRIGGERED: 'keywords',
};

let initialized = false;
const unsubscribes: Array<() => void> = [];

export function initTutorialSubscriber(): void {
	if (initialized) return;
	initialized = true;

	for (const [event, stepId] of Object.entries(EVENT_TO_STEP)) {
		const unsub = GameEventBus.subscribe(event as Parameters<typeof GameEventBus.subscribe>[0], () => {
			const { tutorialDismissed, completeStep, completedSteps, currentStepIndex } = useTutorialStore.getState();
			if (tutorialDismissed) return;
			if (completedSteps.includes(stepId)) return;

			completeStep(stepId);

			// Auto-advance if the current step matches what was just completed
			const currentStep = TUTORIAL_STEPS[currentStepIndex];
			if (currentStep && currentStep.id === stepId) {
				useTutorialStore.getState().nextStep();
			}
		});
		unsubscribes.push(unsub);
	}
}

export function disposeTutorialSubscriber(): void {
	unsubscribes.forEach(unsub => unsub());
	unsubscribes.length = 0;
	initialized = false;
}
