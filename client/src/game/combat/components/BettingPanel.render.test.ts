import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { ActionPermissions } from '../../hooks/usePokerCombatAdapter';
import { BettingPanel } from './BettingPanel';

const BASE_PERMISSIONS: ActionPermissions = {
	isPreForesight: false,
	hasBetToCall: false,
	toCall: 0,
	availableHP: 30,
	minBet: 5,
	canCheck: true,
	canBet: true,
	canCall: false,
	canRaise: false,
	canFold: false,
	maxBetAmount: 30,
	isAllIn: false,
	isMyTurnToAct: true,
	waitingForOpponent: false,
};

function renderPanel(
	overrides: Partial<ActionPermissions> = {},
	showFrontlineButton = true,
): string {
	return renderToStaticMarkup(React.createElement(BettingPanel, {
		permissions: { ...BASE_PERMISSIONS, ...overrides },
		betAmount: 12,
		onBetAmountChange: vi.fn(),
		onAction: vi.fn(),
		onAutoAttackFrontline: vi.fn(),
		showFrontlineButton,
	}));
}

function buttonMarkup(markup: string, action: string): string {
	return markup.match(new RegExp(`<button[^>]*data-poker-action="${action}"[^>]*>`))?.[0] ?? '';
}

describe('BettingPanel action comprehension contract', () => {
	it('renders icon-only actions with contextual HP and accessible hover names', () => {
		const markup = renderPanel();

		expect(markup).toContain('data-poker-action="bet"');
		expect(markup).not.toContain('btn-action-label');
		expect(markup).toContain('>All in</button>');
		expect(markup).toContain('<span class="btn-hp">12</span>');
		expect(buttonMarkup(markup, 'bet')).toContain('aria-label="Attack (Bet) 12 HP"');
		expect(buttonMarkup(markup, 'bet')).toContain('title="Attack (Bet) 12 HP"');
		expect(buttonMarkup(markup, 'frontline')).toContain('aria-label="Frontline"');
		expect(buttonMarkup(markup, 'frontline')).toContain('title="Frontline"');
	});

	it('switches accessible action names from Bet to Raise and Check to Call', () => {
		const markup = renderPanel({
			hasBetToCall: true,
			toCall: 7,
			canCheck: false,
			canBet: false,
			canCall: true,
			canRaise: true,
			canFold: true,
		});

		expect(buttonMarkup(markup, 'raise')).toContain('aria-label="Counter (Raise) 19 HP"');
		expect(buttonMarkup(markup, 'call')).toContain('aria-label="Engage (Call) 7 HP"');
		expect(markup).toContain('<span class="btn-hp">19</span>');
		expect(markup).toContain('<span class="btn-hp">7</span>');
	});

	it('keeps terminal actions grouped before the tactical Frontline action', () => {
		const markup = renderPanel();
		const actionIds = ['bet', 'check', 'fold', 'frontline'];

		expect(markup).toContain('data-action-category="terminal"');
		expect(markup).toContain('data-action-category="tactical"');
		expect(markup).toContain('class="poker-action-divider" aria-hidden="true"');

		let previousIndex = -1;
		for (const actionId of actionIds) {
			const actionIndex = markup.indexOf(`data-poker-action="${actionId}"`);
			expect(actionIndex).toBeGreaterThan(previousIndex);
			previousIndex = actionIndex;
		}
	});

	it('keeps Frontline visible but disabled when it is unavailable or not my turn', () => {
		const unavailableMarkup = renderPanel({}, false);
		const unavailableFrontline = buttonMarkup(unavailableMarkup, 'frontline');

		expect(unavailableFrontline).toContain('disabled=""');
		expect(unavailableFrontline).toContain('title="No frontline units are ready to attack."');

		const opponentMarkup = renderPanel({ isMyTurnToAct: false, waitingForOpponent: true });
		const opponentFrontline = buttonMarkup(opponentMarkup, 'frontline');

		expect(opponentFrontline).toContain('disabled=""');
		expect(buttonMarkup(opponentMarkup, 'fold')).toContain('disabled=""');
	});

	it('keeps disabled reasons in title while preserving accessible names', () => {
		const markup = renderPanel({
			isMyTurnToAct: false,
			waitingForOpponent: true,
		});
		const betButton = buttonMarkup(markup, 'bet');

		expect(betButton).toContain('disabled=""');
		expect(betButton).toContain('title="Waiting for the opponent."');
		expect(betButton).toContain('aria-label="Attack (Bet) 12 HP"');
	});

	it('locks fixed geometry and grayscale-without-opacity styling', () => {
		const css = readFileSync(new URL('../styles/poker-betting.css', import.meta.url), 'utf8');

		expect(css).toMatch(/\.poker-btn\s*\{[\s\S]*?inline-size:\s*117px;[\s\S]*?block-size:\s*99px;/);
		expect(css).toMatch(/\.poker-btn:disabled\s*\{[\s\S]*?opacity:\s*1;[\s\S]*?filter:\s*grayscale\(1\)/);
		expect(css).toMatch(/\.poker-action-divider\s*\{[\s\S]*?inline-size:\s*2px;/);
	});
});
