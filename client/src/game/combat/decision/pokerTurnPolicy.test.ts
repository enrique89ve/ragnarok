import { describe, expect, it } from 'vitest';
import { derivePokerTurnPolicy } from './pokerTurnPolicy';

const BASE_INPUT = {
	activePlayerId: 'local-piece',
	localPlayerId: 'local-piece',
	remotePlayerId: 'remote-piece',
	localPlayerIsReady: false,
	isP2PCombat: false,
};

describe('derivePokerTurnPolicy', () => {
	it('treats local P2P decisions as protocol-clock decisions', () => {
		const policy = derivePokerTurnPolicy({
			...BASE_INPUT,
			isP2PCombat: true,
		});

		expect(policy).toMatchObject({
			processMode: 'p2p',
			profileMode: 'p2p',
			actor: 'local_human',
			shouldTickTimer: true,
			shouldAutoActOnTimeout: true,
			shouldBroadcastTurnStart: true,
			shouldScheduleAiDecision: false,
			shouldSkipTimerAfterLocalReady: false,
		});
	});

	it('keeps the remote peer countdown visible after the local player acted', () => {
		const policy = derivePokerTurnPolicy({
			...BASE_INPUT,
			activePlayerId: 'remote-piece',
			localPlayerIsReady: true,
			isP2PCombat: true,
		});

		expect(policy).toMatchObject({
			processMode: 'p2p',
			actor: 'remote_peer',
			shouldTickTimer: true,
			shouldAutoActOnTimeout: false,
			shouldBroadcastTurnStart: false,
			shouldScheduleAiDecision: false,
			shouldSkipTimerAfterLocalReady: false,
		});
	});

	it('does not run a 60 second peer timer for casual local AI decisions', () => {
		const policy = derivePokerTurnPolicy({
			...BASE_INPUT,
			activePlayerId: 'remote-piece',
			localPlayerIsReady: true,
			opponentKind: 'ai',
		});

		expect(policy).toMatchObject({
			processMode: 'local_ai',
			profileMode: 'vs_ai',
			actor: 'remote_ai',
			shouldTickTimer: false,
			shouldAutoActOnTimeout: false,
			shouldBroadcastTurnStart: false,
			shouldScheduleAiDecision: true,
			shouldSkipTimerAfterLocalReady: true,
		});
	});

	it('keeps campaign as a local AI profile, not a separate transport process', () => {
		const policy = derivePokerTurnPolicy({
			...BASE_INPUT,
			activePlayerId: 'remote-piece',
			opponentKind: 'scripted',
		});

		expect(policy.processMode).toBe('local_ai');
		expect(policy.profileMode).toBe('campaign');
		expect(policy.actor).toBe('remote_ai');
		expect(policy.shouldScheduleAiDecision).toBe(true);
	});

	it('lets opponentKind win over leftover isP2PCombat / isCampaign flags', () => {
		const policy = derivePokerTurnPolicy({
			...BASE_INPUT,
			opponentKind: 'scripted',
			isP2PCombat: true,
			isCampaign: false,
		});
		expect(policy.processMode).toBe('local_ai');
		expect(policy.profileMode).toBe('campaign');
	});
});
