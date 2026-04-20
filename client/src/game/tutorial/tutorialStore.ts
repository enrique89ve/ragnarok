import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TutorialStep {
	id: string;
	title: string;
	description: string;
	highlightSelector?: string;
	position?: 'top' | 'bottom' | 'left' | 'right';
}

export const TUTORIAL_STEPS: TutorialStep[] = [
	{ id: 'welcome', title: 'Welcome to Ragnarok', description: 'A card battler combining Norse mythology with poker mechanics. Let\'s learn the basics!' },
	{ id: 'mana', title: 'Mana Crystals', description: 'You gain one mana crystal each turn (max 10). Cards cost mana to play.' },
	{ id: 'hand', title: 'Your Hand', description: 'These are your cards. Drag a card onto the battlefield to play it.' },
	{ id: 'minions', title: 'Minions', description: 'Minions have Attack (damage dealt) and Health. They can attack enemy minions or the hero.' },
	{ id: 'spells', title: 'Spells', description: 'Spells have immediate effects when played. Some target a specific minion or hero.' },
	{ id: 'weapons', title: 'Weapons', description: 'Weapons give your hero attack power. Your hero can attack minions or the enemy hero.' },
	{ id: 'hero_power', title: 'Hero Power', description: 'Each hero has a unique ability that costs 2 mana. Use it once per turn.' },
	{ id: 'attack', title: 'Attacking', description: 'Click a minion to select it, then click an enemy to attack. Minions can\'t attack the turn they\'re played (unless they have Charge or Rush).' },
	{ id: 'taunt', title: 'Taunt', description: 'Minions with Taunt must be attacked first before you can target other enemies.' },
	{ id: 'end_turn', title: 'End Turn', description: 'When you\'re done, click End Turn to pass to your opponent.' },
	{ id: 'poker', title: 'Poker Combat', description: 'When minions clash, a poker hand is drawn! Better poker hands deal bonus damage.' },
	{ id: 'deck_building', title: 'Deck Building', description: 'Build decks of 30 cards (as chess pieces). Choose a hero and fill your deck with class and neutral cards.' },
	{ id: 'keywords', title: 'Keywords', description: 'Cards have keywords like Battlecry, Deathrattle, and Divine Shield. Hover over keywords for details.' },
	{ id: 'winning', title: 'Win Condition', description: 'Reduce the enemy hero\'s health to 0 to win! Manage your resources wisely.' },
	{ id: 'done', title: 'Ready to Play!', description: 'You know the basics. Good luck in battle, warrior!' },
];

interface TutorialState {
	completedSteps: string[];
	tutorialDismissed: boolean;
	currentStepIndex: number;
}

interface TutorialActions {
	completeStep: (stepId: string) => void;
	dismissTutorial: () => void;
	resetTutorial: () => void;
	nextStep: () => void;
	prevStep: () => void;
	isStepCompleted: (stepId: string) => boolean;
}

export const useTutorialStore = create<TutorialState & TutorialActions>()(
	persist(
		(set, get) => ({
			completedSteps: [],
			tutorialDismissed: false,
			currentStepIndex: 0,

			completeStep: (stepId) => {
				set(s => ({
					completedSteps: s.completedSteps.includes(stepId)
						? s.completedSteps
						: [...s.completedSteps, stepId],
				}));
			},

			dismissTutorial: () => set({ tutorialDismissed: true }),

			resetTutorial: () => set({
				completedSteps: [],
				tutorialDismissed: false,
				currentStepIndex: 0,
			}),

			nextStep: () => {
				const { currentStepIndex } = get();
				if (currentStepIndex < TUTORIAL_STEPS.length - 1) {
					const step = TUTORIAL_STEPS[currentStepIndex];
					set(s => ({
						currentStepIndex: currentStepIndex + 1,
						completedSteps: s.completedSteps.includes(step.id)
							? s.completedSteps
							: [...s.completedSteps, step.id],
					}));
				} else {
					set({ tutorialDismissed: true });
				}
			},

			prevStep: () => {
				const { currentStepIndex } = get();
				if (currentStepIndex > 0) {
					set({ currentStepIndex: currentStepIndex - 1 });
				}
			},

			isStepCompleted: (stepId) => get().completedSteps.includes(stepId),
		}),
		{
			name: 'ragnarok-tutorial',
			partialize: (state) => ({
				completedSteps: state.completedSteps,
				tutorialDismissed: state.tutorialDismissed,
			}),
		}
	)
);
