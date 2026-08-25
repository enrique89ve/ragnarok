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

function renderPanel(overrides: Partial<ActionPermissions> = {}): string {
	return renderToStaticMarkup(React.createElement(BettingPanel, {
		permissions: { ...BASE_PERMISSIONS, ...overrides },
		betAmount: 12,
		onBetAmountChange: vi.fn(),
		onAction: vi.fn(),
		onAutoAttackFrontline: vi.fn(),
		showFrontlineButton: true,
	}));
}

function buttonMarkup(markup: string, action: string): string {
	return markup.match(new RegExp(`<button[^>]*data-poker-action="${action}"[^>]*>`))?.[0] ?? '';
}

describe('BettingPanel action comprehension contract', () => {
	it('renders visible Bet, Check, Fold, Frontline and All in copy with HP and accessible names', () => {
		const markup = renderPanel();

		expect(markup).toContain('data-poker-action="bet"');
		expect(markup).toContain('<span class="btn-action-label">Bet</span>');
		expect(markup).toContain('<span class="btn-action-label">Check</span>');
		expect(markup).toContain('<span class="btn-action-label">Fold</span>');
		expect(markup).toContain('<span class="btn-action-label">Frontline</span>');
		expect(markup).toContain('>All in</button>');
		expect(markup).toContain('<span class="btn-hp">12</span>');
		expect(buttonMarkup(markup, 'bet')).toContain('aria-label="Attack (Bet) 12 HP"');
		expect(buttonMarkup(markup, 'bet')).toContain('title="Attack (Bet) 12 HP"');
	});

	it('switches visible labels from Bet to Raise and Check to Call', () => {
		const markup = renderPanel({
			hasBetToCall: true,
			toCall: 7,
			canCheck: false,
			canBet: false,
			canCall: true,
			canRaise: true,
			canFold: true,
		});

		expect(markup).toContain('<span class="btn-action-label">Raise</span>');
		expect(markup).toContain('<span class="btn-action-label">Call</span>');
		expect(markup).not.toContain('<span class="btn-action-label">Bet</span>');
		expect(markup).not.toContain('<span class="btn-action-label">Check</span>');
		expect(markup).toContain('<span class="btn-hp">19</span>');
		expect(markup).toContain('<span class="btn-hp">7</span>');
	});

	it('keeps disabled reasons in title without hiding labels', () => {
		const markup = renderPanel({
			isMyTurnToAct: false,
			waitingForOpponent: true,
		});
		const betButton = buttonMarkup(markup, 'bet');

		expect(betButton).toContain('disabled=""');
		expect(betButton).toContain('title="Waiting for the opponent."');
		expect(markup).toContain('<span class="btn-action-label">Bet</span>');
	});

	it('locks fixed geometry and grayscale-without-opacity styling', () => {
		const css = readFileSync(new URL('../styles/poker-betting.css', import.meta.url), 'utf8');

		expect(css).toMatch(/\.poker-btn\s*\{[\s\S]*?inline-size:\s*117px;[\s\S]*?block-size:\s*99px;/);
		expect(css).toMatch(/\.poker-btn:disabled\s*\{[\s\S]*?opacity:\s*1;[\s\S]*?filter:\s*grayscale\(1\)/);
		expect(css).toMatch(/\.poker-btn \.btn-action-label\s*\{[\s\S]*?color:\s*#fff;[\s\S]*?white-space:\s*nowrap;/);
	});
});
