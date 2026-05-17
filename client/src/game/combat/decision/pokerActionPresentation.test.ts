import { describe, expect, it } from 'vitest';
import { CombatAction } from '../../types/PokerCombatTypes';
import { getPokerActionPresentation } from './pokerActionPresentation';

describe('getPokerActionPresentation', () => {
	it('keeps minor player actions quiet because the player just clicked them', () => {
		expect(getPokerActionPresentation({
			actor: 'player',
			action: CombatAction.DEFEND,
		})).toMatchObject({
			showPopup: false,
			text: 'You check',
			subtitle: '+1 STA',
		});

		expect(getPokerActionPresentation({
			actor: 'player',
			action: CombatAction.ENGAGE,
		}).showPopup).toBe(false);
	});

	it('shows opponent checks and calls as single-target readable handoff cues', () => {
		expect(getPokerActionPresentation({
			actor: 'opponent',
			action: CombatAction.ENGAGE,
			actorName: 'Leif',
		})).toMatchObject({
			showPopup: true,
			target: 'opponent',
			text: 'Leif matches the stake',
			subtitle: 'Round can close',
		});

		expect(getPokerActionPresentation({
			actor: 'opponent',
			action: CombatAction.DEFEND,
			actorName: 'Leif',
		})).toMatchObject({
			showPopup: true,
			target: 'opponent',
			text: 'Leif checks',
			subtitle: 'Round can close',
		});
	});

	it('labels opponent raises as a response handoff, not as a generic enemy modal', () => {
		expect(getPokerActionPresentation({
			actor: 'opponent',
			action: CombatAction.COUNTER_ATTACK,
			amount: 20,
			actorName: 'Odin',
		})).toMatchObject({
			showPopup: true,
			target: 'opponent',
			text: 'Odin raises 20 HP',
			subtitle: 'Your response',
		});
	});
});
