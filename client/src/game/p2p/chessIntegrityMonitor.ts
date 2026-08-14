import type { Hash256, TransitionReceiptMessage } from '@shared/p2p-wire/integrity';

export type ExpectedChessTransition = Readonly<{
	matchId: string;
	seq: number;
	commandId: string;
	intentHash: Hash256;
	prevRoot: Hash256;
	nextRoot: Hash256;
}>;

export type ChessIntegrityDivergence = Readonly<{
	reason:
		| 'peer_rejected'
		| 'match_id_mismatch'
		| 'sequence_mismatch'
		| 'prev_root_mismatch'
		| 'next_root_mismatch'
		| 'local_checkpoint_unavailable';
	commandId: string;
	expectedRoot: Hash256 | null;
	receivedRoot: Hash256 | null;
	detail: string;
}>;

export type ChessIntegrityMonitorState =
	| { readonly status: 'healthy'; readonly pending: ExpectedChessTransition | null }
	| { readonly status: 'quarantined'; readonly divergence: ChessIntegrityDivergence };

export type RegisterTransitionResult =
	| { readonly status: 'registered' }
	| { readonly status: 'blocked'; readonly reason: 'pending_ack' | 'quarantined' };

export type ConfirmTransitionResult =
	| { readonly status: 'confirmed'; readonly commandId: string }
	| { readonly status: 'ignored'; readonly reason: 'no_pending_transition' | 'unrelated_ack' }
	| { readonly status: 'quarantined'; readonly divergence: ChessIntegrityDivergence };

export type ChessIntegrityMonitor = Readonly<{
	getState: () => ChessIntegrityMonitorState;
	canStartTransition: () => boolean;
	register: (expected: ExpectedChessTransition) => RegisterTransitionResult;
	confirm: (receipt: TransitionReceiptMessage) => ConfirmTransitionResult;
	quarantine: (divergence: ChessIntegrityDivergence) => void;
	reset: () => void;
}>;

function quarantineResult(
	setState: (state: ChessIntegrityMonitorState) => void,
	divergence: ChessIntegrityDivergence,
): ConfirmTransitionResult {
	setState({ status: 'quarantined', divergence });
	return { status: 'quarantined', divergence };
}

/**
 * Functional, session-local integrity observer.
 *
 * It never reads or mutates gameplay stores. The wire bridge feeds it
 * post-commit receipts, and it either confirms the expected root or moves the
 * session into a fail-closed quarantine state.
 */
export function createChessIntegrityMonitor(): ChessIntegrityMonitor {
	let state: ChessIntegrityMonitorState = { status: 'healthy', pending: null };

	const setState = (next: ChessIntegrityMonitorState): void => {
		state = next;
	};

	const getState = (): ChessIntegrityMonitorState => state;

	const canStartTransition = (): boolean =>
		state.status === 'healthy' && state.pending === null;

	const register = (expected: ExpectedChessTransition): RegisterTransitionResult => {
		if (state.status === 'quarantined') {
			return { status: 'blocked', reason: 'quarantined' };
		}
		if (state.pending !== null) {
			return { status: 'blocked', reason: 'pending_ack' };
		}
		setState({ status: 'healthy', pending: expected });
		return { status: 'registered' };
	};

	const confirm = (receipt: TransitionReceiptMessage): ConfirmTransitionResult => {
		if (state.status === 'quarantined') {
			return { status: 'quarantined', divergence: state.divergence };
		}

		const expected = state.pending;
		if (expected === null) {
			return { status: 'ignored', reason: 'no_pending_transition' };
		}
		if (receipt.commandId !== expected.commandId) {
			return { status: 'ignored', reason: 'unrelated_ack' };
		}
		if (receipt.status === 'rejected') {
			return quarantineResult(setState, {
				reason: 'peer_rejected',
				commandId: receipt.commandId,
				expectedRoot: expected.nextRoot,
				receivedRoot: receipt.currentRoot,
				detail: receipt.reason,
			});
		}
		if (receipt.intentHash !== expected.intentHash) {
			return quarantineResult(setState, {
				reason: 'prev_root_mismatch',
				commandId: receipt.commandId,
				expectedRoot: expected.prevRoot,
				receivedRoot: receipt.prevRoot,
				detail: 'receipt is bound to a different transition intent',
			});
		}
		if (receipt.matchId !== expected.matchId) {
			return quarantineResult(setState, {
				reason: 'match_id_mismatch',
				commandId: receipt.commandId,
				expectedRoot: expected.nextRoot,
				receivedRoot: receipt.nextRoot,
				detail: `expected ${expected.matchId}, received ${receipt.matchId}`,
			});
		}
		if (receipt.seq !== expected.seq) {
			return quarantineResult(setState, {
				reason: 'sequence_mismatch',
				commandId: receipt.commandId,
				expectedRoot: expected.nextRoot,
				receivedRoot: receipt.nextRoot,
				detail: `expected ${expected.seq}, received ${receipt.seq}`,
			});
		}
		if (receipt.prevRoot !== expected.prevRoot) {
			return quarantineResult(setState, {
				reason: 'prev_root_mismatch',
				commandId: receipt.commandId,
				expectedRoot: expected.prevRoot,
				receivedRoot: receipt.prevRoot,
				detail: 'peer applied the command from a different pre-state',
			});
		}
		if (receipt.nextRoot !== expected.nextRoot) {
			return quarantineResult(setState, {
				reason: 'next_root_mismatch',
				commandId: receipt.commandId,
				expectedRoot: expected.nextRoot,
				receivedRoot: receipt.nextRoot,
				detail: 'peer produced a different post-state',
			});
		}

		setState({ status: 'healthy', pending: null });
		return { status: 'confirmed', commandId: receipt.commandId };
	};

	const quarantine = (divergence: ChessIntegrityDivergence): void => {
		setState({ status: 'quarantined', divergence });
	};

	const reset = (): void => {
		setState({ status: 'healthy', pending: null });
	};

	return Object.freeze({
		getState,
		canStartTransition,
		register,
		confirm,
		quarantine,
		reset,
	});
}

export const chessIntegrityMonitor = createChessIntegrityMonitor();
