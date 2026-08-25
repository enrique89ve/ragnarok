import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { CardInstance } from '../../types';
import { MulliganCard } from '../MulliganCard';
import { getMulliganEvolutionGuidance } from './mulliganEvolutionGuidance';

vi.mock('../card/SimpleCardCompat', () => ({
	SimpleCard: () => null,
}));

vi.mock('../card/slots/CardCardBack', () => ({
	default: () => null,
}));

const createCard = (overrides: Record<string, unknown>): CardInstance => ({
	instanceId: 'mulligan-card-1',
	card: {
		id: 50263,
		name: 'Urd the Past',
		manaCost: 0,
		attack: 2,
		health: 5,
		type: 'minion',
		rarity: 'rare',
		description: 'Battlecry: Restore 3 Health to your hero.',
		keywords: ['battlecry'],
		...overrides,
	},
	canAttack: false,
	isPlayed: false,
	isSummoningSick: false,
	attacksPerformed: 0,
} as CardInstance);

describe('Mulligan evolution guidance', () => {
	it('projects an explicit replacement recommendation for evolved pets', () => {
		expect(getMulliganEvolutionGuidance({
			petStage: 'adept',
			evolvesFromName: "Urd's Initiate",
		})).toMatchObject({
			stage: 'adept',
			label: 'Evolution locked',
			prerequisite: "Needs Urd's Initiate in play",
			recommendation: 'Replace for your opening hand',
		});

		expect(getMulliganEvolutionGuidance({ petStage: 'basic' })).toBeNull();
	});

	it('prefers a master evolution exact predecessor over generic family copy', () => {
		expect(getMulliganEvolutionGuidance({
			petStage: 'master',
			petFamily: 'norns',
			evolvesFromName: 'Urd the Past',
		})).toMatchObject({
			stage: 'master',
			prerequisite: 'Needs Urd the Past in play',
		});

		expect(getMulliganEvolutionGuidance({
			petStage: 'master',
			petFamily: 'norns',
		})).toMatchObject({
			prerequisite: 'Needs an Adept norns pet in play',
		});
	});

	it('renders the lock, prerequisite, recommendation, and accessible announcement without selecting it', () => {
		const html = renderToStaticMarkup(React.createElement(MulliganCard, {
			card: createCard({
				petStage: 'adept',
				evolvesFrom: 50260,
			}),
			isSelected: false,
			onClick: () => undefined,
			disableMotion: true,
			disableCardFx: true,
		}));

		expect(html).toContain('data-evolution-stage="adept"');
		expect(html).toContain('Evolution locked');
		expect(html).toContain("Needs Urd&#x27;s Initiate in play");
		expect(html).toContain('Replace for your opening hand');
		expect(html).toContain('Click to replace this card.');
		expect(html).toContain('aria-pressed="false"');
	});
});
