import { describe, expect, it } from 'vitest';
import { getPokerHudStatusPresentation, getPokerTurnBadgePresentation } from './pokerTurnBadgePresentation';
import type { PokerDecisionView } from './pokerDecisionView';

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

describe('getPokerTurnBadgePresentation', () => {
	it('returns a green active badge model for the local player turn', () => {
		expect(getPokerTurnBadgePresentation('player')).toMatchObject({
			turn: 'player',
			tone: 'active',
			className: 'persistent-turn-badge player-turn',
			kicker: 'Your',
			main: 'Turn',
		});
	});

	it('returns a grey waiting badge model for the opponent turn', () => {
		expect(getPokerTurnBadgePresentation('opponent')).toMatchObject({
			turn: 'opponent',
			tone: 'waiting',
			className: 'persistent-turn-badge opponent-turn',
			kicker: 'Enemy',
			main: 'Turn',
		});
	});

	it('returns null when no poker turn should be shown', () => {
		expect(getPokerTurnBadgePresentation(undefined)).toBeNull();
	});

	it('shows active local styling only when the decision view allows actions', () => {
		expect(getPokerHudStatusPresentation(decisionView('local_decision', true))).toMatchObject({
			tone: 'active',
			label: 'Your Decision',
			ariaLabel: 'Your Decision. Controls are live.',
		});
		expect(getPokerHudStatusPresentation(decisionView('local_decision'))).toMatchObject({
			tone: 'waiting',
			label: 'Decision Locked',
			ariaLabel: 'Decision Locked. Controls locked.',
		});
	});

	it.each([
		['remote_decision', 'Opponent Acting'],
		['reconnecting', 'Reconnecting'],
		['expired', 'Time Expired'],
		['showdown', 'Showdown'],
		['syncing', 'Syncing'],
		['inactive', 'Inactive'],
	] as const)('keeps %s explicit and non-active', (status, label) => {
		expect(getPokerHudStatusPresentation(decisionView(status))).toMatchObject({
			tone: status === 'remote_decision' ? 'opponent' : 'waiting',
			label,
		});
	});

	it('uses opponent emphasis only while the opponent owns the decision', () => {
		expect(getPokerHudStatusPresentation(decisionView('remote_decision')).tone).toBe('opponent');
		expect(getPokerHudStatusPresentation(decisionView('expired')).tone).toBe('waiting');
	});

	it('lets an integrity or connection pause override an otherwise actionable local turn', () => {
		expect(getPokerHudStatusPresentation(decisionView('local_decision', true), {
			kind: 'integrity',
			title: 'Game integrity paused',
			detail: 'Actions are locked until you leave the match.',
		})).toMatchObject({
			tone: 'paused',
			label: 'Integrity Paused',
			ariaLabel: 'Game integrity paused. Actions are locked until you leave the match.',
		});
	});
});
