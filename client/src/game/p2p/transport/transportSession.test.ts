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
		expect(session.selectTransport(secondAttempt, 'webrtc')).toBe(false);
	});

	it('rejects stale attempt mutations', () => {
		const session = createTransportSession('match-2');
		const staleAttempt = session.beginAttempt();
		const currentAttempt = session.beginAttempt();

		expect(session.isCurrent(staleAttempt)).toBe(false);
		expect(session.isCurrent(currentAttempt)).toBe(true);
		expect(session.lockRelay(staleAttempt)).toBe(false);
	});

	it('invalidates an in-flight attempt without changing the match identity', () => {
		const session = createTransportSession('match-3');
		const attempt = session.beginAttempt();

		session.invalidate();

		expect(session.isCurrent(attempt)).toBe(false);
		expect(session.getSnapshot()).toMatchObject({
			matchId: 'match-3',
			attemptId: attempt + 1,
		});
	});
});
