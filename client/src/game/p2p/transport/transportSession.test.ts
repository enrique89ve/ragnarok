import { describe, expect, it } from 'vitest';

import { createTransportSession } from './transportSession';

describe('transport session', () => {
	it('preserves the initial transport and locks relay across attempts', () => {
		const session = createTransportSession('match-1');
		const firstAttempt = session.beginAttempt();

		expect(session.selectTransport(firstAttempt, 'webrtc')).toBe(true);
		expect(session.lockRelay(firstAttempt)).toBe(true);

		const secondAttempt = session.beginAttempt();
		expect(session.getSnapshot()).toMatchObject({
			matchId: 'match-1',
			attemptId: secondAttempt,
			initialTransport: 'webrtc',
			currentTransport: 'webrtc',
			relayLocked: true,
		});
		expect(session.selectTransport(firstAttempt, 'websocket-relay')).toBe(false);
		expect(session.selectTransport(secondAttempt, 'websocket-relay')).toBe(true);
	});

	it('rejects stale attempt mutations', () => {
		const session = createTransportSession('match-2');
		const staleAttempt = session.beginAttempt();
		const currentAttempt = session.beginAttempt();

		expect(session.isCurrent(staleAttempt)).toBe(false);
		expect(session.isCurrent(currentAttempt)).toBe(true);
		expect(session.lockRelay(staleAttempt)).toBe(false);
	});
});
