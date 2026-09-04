import { describe, expect, it } from 'vitest';
import {
	describeIntegrityPauseDetail,
	isP2PGameplayInputLocked,
	resolveP2PMatchPauseView,
} from './p2pMatchPauseView';

describe('resolveP2PMatchPauseView', () => {
	it('does not pause a healthy connected match', () => {
		expect(resolveP2PMatchPauseView({
			competitionPhase: 'battle',
			connectionState: 'connected',
			disconnectSide: null,
			integrityError: null,
			reconnectCountdown: 0,
			reconnectAttemptCount: 0,
		})).toBeNull();
	});

	it('names a local drop instead of blaming the opponent', () => {
		const view = resolveP2PMatchPauseView({
			competitionPhase: 'battle',
			connectionState: 'reconnecting',
			disconnectSide: 'local',
			integrityError: null,
			reconnectCountdown: 40,
			reconnectAttemptCount: 1,
		});
		expect(view?.title).toBe('Your connection interrupted');
		expect(view?.detail).toContain('Restoring the match automatically');
		expect(view?.detail).toContain('40s');
		expect(view?.exportLabel).toBe('Export diagnostics');
	});

	it('names an opponent drop separately', () => {
		const view = resolveP2PMatchPauseView({
			competitionPhase: 'battle',
			connectionState: 'grace_period',
			disconnectSide: 'opponent',
			integrityError: null,
			reconnectCountdown: 12,
			reconnectAttemptCount: 2,
		});
		expect(view?.title).toBe('Opponent connection interrupted');
	});

	it('prefers integrity over reconnect copy', () => {
		const view = resolveP2PMatchPauseView({
			competitionPhase: 'battle',
			connectionState: 'reconnecting',
			disconnectSide: 'local',
			integrityError: 'Game integrity diverged',
			reconnectCountdown: 20,
			reconnectAttemptCount: 1,
		});
		expect(view?.kind).toBe('integrity');
		expect(view?.title).toBe('Game integrity paused');
	});

	it('surfaces the parenthetical quarantine reason in the pause copy', () => {
		expect(describeIntegrityPauseDetail(
			'Game integrity diverged. Actions are paused until the match is left. (chess_transition_receipt_timeout)',
		)).toContain('chess_transition_receipt_timeout');
		const view = resolveP2PMatchPauseView({
			competitionPhase: 'battle',
			connectionState: 'connected',
			disconnectSide: null,
			integrityError: 'Game integrity diverged. Actions are paused until the match is left. (chess_hash_mismatch_turn_1)',
			reconnectCountdown: 0,
			reconnectAttemptCount: 0,
		});
		expect(view?.detail).toContain('chess_hash_mismatch_turn_1');
		expect(view?.detail).toContain('Export diagnostics');
	});

	it('keeps the board paused after a failed reconnect', () => {
		const view = resolveP2PMatchPauseView({
			competitionPhase: 'battle',
			connectionState: 'error',
			disconnectSide: 'local',
			integrityError: null,
			reconnectCountdown: 0,
			reconnectAttemptCount: 2,
		});
		expect(view?.kind).toBe('error');
		expect(view?.exportLabel).toBe('Export diagnostics');
	});

	it('never mounts a hard pause overlay during pre-battle setup', () => {
		expect(resolveP2PMatchPauseView({
			competitionPhase: 'pre_battle',
			connectionState: 'connected',
			disconnectSide: null,
			integrityError: 'temporary setup failure',
			reconnectCountdown: 0,
			reconnectAttemptCount: 0,
		})).toBeNull();
	});

	it('locks input on reconnect, error, and integrity', () => {
		expect(isP2PGameplayInputLocked({
			connectionState: 'connected',
			integrityError: null,
		})).toBe(false);
		expect(isP2PGameplayInputLocked({
			connectionState: 'reconnecting',
			integrityError: null,
		})).toBe(true);
		expect(isP2PGameplayInputLocked({
			connectionState: 'connected',
			integrityError: 'Game integrity diverged',
		})).toBe(true);
	});
});
