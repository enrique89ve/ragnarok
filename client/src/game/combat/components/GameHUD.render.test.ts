import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { PokerDecisionView } from '../decision/pokerDecisionView';
import { GameHUD } from './GameHUD';

function decisionView(
	status: PokerDecisionView['status'],
	localCanAct = false,
): PokerDecisionView {
	return {
		status,
		activeSide: status === 'local_decision' ? 'local' : status === 'remote_decision' ? 'remote' : 'none',
		localCanAct,
		waitingForPeer: status === 'remote_decision',
		inputPaused: status === 'reconnecting',
		phaseLabel: 'Faith',
		turnLabel: 'Turn 2',
		clockLabel: '15s',
		remainingSeconds: 15,
		durationSeconds: 30,
		timerProgress: 0.5,
		timerTone: 'normal',
		hasClock: true,
		displayTurn: status === 'local_decision' ? 'player' : status === 'remote_decision' ? 'opponent' : undefined,
		cssTurnClass: status === 'local_decision' ? 'player-turn' : 'opponent-turn',
		statusLabel: {
			inactive: 'Inactive',
		reconnecting: 'Reconnecting',
		expired: 'Time Expired',
		showdown: 'Showdown',
		syncing: 'Syncing',
		local_decision: 'Your Decision',
		remote_decision: 'Opponent Acting',
		}[status],
		statusTitle: status,
		statusDetail: localCanAct ? 'Controls are live' : 'Controls locked',
		windowLabel: status,
	};
}

function renderHud(
	view: PokerDecisionView,
	pauseView: React.ComponentProps<typeof GameHUD>['pauseView'] = null,
): string {
	return renderToStaticMarkup(React.createElement(GameHUD, {
		turnNumber: 2,
		playerDeckCount: 20,
		opponentDeckCount: 19,
		opponentHandCount: 4,
		phaseLabel: 'Faith',
		pot: 42,
		playerCommitted: 12,
		opponentCommitted: 30,
		decisionView: view,
		pauseView,
	}));
}

describe('GameHUD poker decision status', () => {
	it('renders the local actionable state as active while preserving phase and stakes', () => {
		const markup = renderHud(decisionView('local_decision', true));

		expect(markup).toContain('class="hud-status-ribbon player-active"');
		expect(markup).toContain('data-hud-status-tone="active"');
		expect(markup).toContain('aria-label="Your Decision. Controls are live."');
		expect(markup).toContain('Phase Faith');
		expect(markup).toContain('Stakes <span class="hud-numeric">42</span> HP');
		expect(markup).toContain('Committed You <span class="hud-numeric">12</span>');
	});

	it('does not style a locally owned but locked decision as actionable', () => {
		const markup = renderHud(decisionView('local_decision'));

		expect(markup).not.toContain('class="hud-status-ribbon player-active"');
		expect(markup).toContain('data-hud-status-tone="waiting"');
		expect(markup).toContain('>Decision Locked</span>');
		expect(markup).toContain('aria-label="Decision Locked. Controls locked."');
		expect(markup).not.toContain('Actions are available');
	});

	it.each([
		['remote_decision', 'Opponent Acting', 'opponent-active', 'opponent'],
		['reconnecting', 'Reconnecting', '', 'waiting'],
		['expired', 'Time Expired', '', 'waiting'],
		['showdown', 'Showdown', '', 'waiting'],
		['syncing', 'Syncing', '', 'waiting'],
		['inactive', 'Inactive', '', 'waiting'],
	] as const)('renders %s state without claiming local action availability', (state, label, ribbon, tone) => {
		const markup = renderHud(decisionView(state));

		expect(markup).toContain(`class="hud-status-ribbon ${ribbon}"`);
		expect(markup).toContain(`data-hud-status-tone="${tone}"`);
		expect(markup).toContain(`>${label}</span>`);
		expect(markup).not.toContain('Actions are available');
	});

	it('lets an explicit pause override an actionable turn and resumes when the pause clears', () => {
		const pausedMarkup = renderHud(decisionView('local_decision', true), {
			kind: 'reconnecting',
			title: 'Opponent connection interrupted',
			detail: 'Restoring the match automatically (8s). Actions are locked. The board stays visible.',
		});
		const resumedMarkup = renderHud(decisionView('local_decision', true));

		expect(pausedMarkup).not.toContain('class="hud-status-ribbon player-active"');
		expect(pausedMarkup).toContain('data-hud-status-tone="paused"');
		expect(pausedMarkup).toContain('aria-label="Opponent connection interrupted. Restoring the match automatically (8s). Actions are locked. The board stays visible."');
		expect(resumedMarkup).toContain('class="hud-status-ribbon player-active"');
		expect(resumedMarkup).toContain('aria-label="Your Decision. Controls are live."');
	});
});
