import { describe, it, expect } from 'vitest';
import { computeP2PRenderGuard } from './multiplayerRenderGuard';
import type { ArmySelection } from '../../types/ChessTypes';

const fakeArmy = { king: { id: 'odin' } } as unknown as ArmySelection;
const signedSession = {
	p2pSessionLocalAuthorized: true,
	p2pSessionRemoteAuthorized: true,
	p2pSessionAuthError: null,
};

describe('computeP2PRenderGuard', () => {
	it('waits with opponent-army message when no army announced yet', () => {
		const decision = computeP2PRenderGuard({
			opponentArmyFromPeer: null,
			p2pInitApplied: false,
			connectionState: 'connected',
			reconnectCountdown: 0,
			reconnectAttemptCount: 0,
			...signedSession,
		});
		expect(decision).toEqual({ kind: 'wait', reason: 'Connected. Waiting for opponent loadout…' });
	});

	it('waits with init-state message when army known but init not applied', () => {
		const decision = computeP2PRenderGuard({
			opponentArmyFromPeer: fakeArmy,
			p2pInitApplied: false,
			connectionState: 'connected',
			reconnectCountdown: 0,
			reconnectAttemptCount: 0,
			...signedSession,
		});
		expect(decision).toEqual({ kind: 'wait', reason: 'Connected. Syncing match state…' });
	});

	it('names the local saved-match rejoin on hard reload', () => {
		const decision = computeP2PRenderGuard({
			opponentArmyFromPeer: fakeArmy,
			p2pInitApplied: true,
			connectionState: 'reconnecting',
			reconnectCountdown: 40,
			reconnectAttemptCount: 1,
			hardReloadResume: true,
			...signedSession,
		});
		expect(decision).toEqual({ kind: 'render' });
	});

	it('renders when connection, loadout, and init gates pass', () => {
		const decision = computeP2PRenderGuard({
			opponentArmyFromPeer: fakeArmy,
			p2pInitApplied: true,
			connectionState: 'connected',
			reconnectCountdown: 0,
			reconnectAttemptCount: 0,
			...signedSession,
		});
		expect(decision).toEqual({ kind: 'render' });
	});

	it('renders a resolved result after the transport has closed', () => {
		const decision = computeP2PRenderGuard({
			opponentArmyFromPeer: fakeArmy,
			p2pInitApplied: false,
			connectionState: 'disconnected',
			reconnectCountdown: 0,
			reconnectAttemptCount: 0,
			terminalLifecycle: true,
			...signedSession,
		});
		expect(decision).toEqual({ kind: 'render' });
	});

	it('opponent-army gate takes precedence over init gate', () => {
		// Both false would be wait-for-army; this asserts the ordering
		// is opponentArmy first so we surface the most upstream blocker.
		const decision = computeP2PRenderGuard({
			opponentArmyFromPeer: null,
			p2pInitApplied: true,
			connectionState: 'connected',
			reconnectCountdown: 0,
			reconnectAttemptCount: 0,
			...signedSession,
		});
		expect(decision).toEqual({ kind: 'wait', reason: 'Connected. Waiting for opponent loadout…' });
	});

	it('does not block gameplay on a pending local Hive session signature', () => {
		const decision = computeP2PRenderGuard({
			opponentArmyFromPeer: fakeArmy,
			p2pInitApplied: true,
			connectionState: 'connected',
			reconnectCountdown: 0,
			reconnectAttemptCount: 0,
			p2pSessionLocalAuthorized: false,
			p2pSessionRemoteAuthorized: true,
			p2pSessionAuthError: null,
		});
		expect(decision).toEqual({ kind: 'render' });
	});

	it('does not block gameplay on a pending opponent Hive session signature', () => {
		const decision = computeP2PRenderGuard({
			opponentArmyFromPeer: fakeArmy,
			p2pInitApplied: true,
			connectionState: 'connected',
			reconnectCountdown: 0,
			reconnectAttemptCount: 0,
			p2pSessionLocalAuthorized: true,
			p2pSessionRemoteAuthorized: false,
			p2pSessionAuthError: null,
		});
		expect(decision).toEqual({ kind: 'render' });
	});

	it('does not block gameplay on Hive authorization failures', () => {
		const decision = computeP2PRenderGuard({
			opponentArmyFromPeer: fakeArmy,
			p2pInitApplied: true,
			connectionState: 'connected',
			reconnectCountdown: 0,
			reconnectAttemptCount: 0,
			p2pSessionLocalAuthorized: false,
			p2pSessionRemoteAuthorized: false,
			p2pSessionAuthError: 'Hive Keychain sign rejected: Keychain timeout (60s)',
		});
		expect(decision).toEqual({ kind: 'render' });
	});

	it('keeps a live board mounted while reconnecting', () => {
		const decision = computeP2PRenderGuard({
			opponentArmyFromPeer: fakeArmy,
			p2pInitApplied: true,
			connectionState: 'reconnecting',
			reconnectCountdown: 42,
			reconnectAttemptCount: 1,
			...signedSession,
		});
		expect(decision).toEqual({ kind: 'render' });
	});

	it('keeps a live board mounted after a transport error', () => {
		const decision = computeP2PRenderGuard({
			opponentArmyFromPeer: fakeArmy,
			p2pInitApplied: true,
			connectionState: 'error',
			reconnectCountdown: 0,
			reconnectAttemptCount: 2,
			...signedSession,
		});
		expect(decision).toEqual({ kind: 'render' });
	});

	it('waits on reconnect only before the board has been initialized', () => {
		const decision = computeP2PRenderGuard({
			opponentArmyFromPeer: fakeArmy,
			p2pInitApplied: false,
			connectionState: 'reconnecting',
			reconnectCountdown: 42,
			reconnectAttemptCount: 1,
			...signedSession,
		});
		expect(decision).toEqual({
			kind: 'wait',
			reason: 'Reconnecting with opponent… Attempt 1/2. 42s before technical result.',
		});
	});
});
