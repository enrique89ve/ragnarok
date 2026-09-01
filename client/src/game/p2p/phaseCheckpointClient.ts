/**
 * Client-side gate for server-notarized phase boundaries.
 *
 * Exactly one proposal can be pending. Reconnect resends that exact immutable
 * proposal, and only a server-system commit matching every field resolves the
 * gate. The module never computes or validates gameplay rules.
 */

import {
	PHASE_CHECKPOINT_PROTOCOL_VERSION,
	PHASE_CHECKPOINT_SCOPE,
	PhaseCheckpointProposalSchema,
	ZERO_PHASE_CHECKPOINT_ID,
	computePhaseCheckpointId,
	samePhaseCheckpointProposal,
	isRetryablePhaseCheckpointDispute,
	type PhaseCheckpointCommit,
	type PhaseCheckpointDispute,
	type PhaseCheckpointPhase,
	type PhaseCheckpointProposal,
	type PhaseCheckpointServerMessage,
} from '@shared/p2p-wire/phaseCheckpoint';
import type { Hash256 } from '@shared/p2p-wire/integrity';

export type PhaseCheckpointRequestResult =
	| { readonly status: 'committed'; readonly commit: PhaseCheckpointCommit }
	| { readonly status: 'disputed'; readonly dispute: PhaseCheckpointDispute }
	| {
		readonly status: 'unavailable';
		readonly reason: 'pending_transition' | 'client_timeout' | 'not_connected' | 'integrity_quarantined' | 'transport_rejected';
	};

export type PhaseCheckpointProposalSender = (proposal: PhaseCheckpointProposal) => boolean | void;

type PendingRequest = {
	readonly proposal: PhaseCheckpointProposal;
	readonly promise: Promise<PhaseCheckpointRequestResult>;
	readonly resolve: (result: PhaseCheckpointRequestResult) => void;
	readonly timeout: ReturnType<typeof setTimeout>;
};

export type PhaseCheckpointClient = Readonly<{
	request: (input: {
		readonly matchId: string;
		readonly fromPhase: PhaseCheckpointPhase;
		readonly toPhase: PhaseCheckpointPhase;
		readonly stateRoot: Hash256;
		readonly send: PhaseCheckpointProposalSender;
	}) => Promise<PhaseCheckpointRequestResult>;
	handleServerMessage: (message: PhaseCheckpointServerMessage) => boolean;
	retryPending: (send: PhaseCheckpointProposalSender) => boolean;
	reset: () => void;
	getPendingProposal: () => PhaseCheckpointProposal | null;
}>;

function commitMatchesProposal(
	commit: PhaseCheckpointCommit,
	proposal: PhaseCheckpointProposal,
): boolean {
	return commit.matchId === proposal.matchId
		&& commit.epoch === proposal.epoch
		&& commit.fromPhase === proposal.fromPhase
		&& commit.toPhase === proposal.toPhase
		&& commit.previousCheckpointId === proposal.previousCheckpointId
		&& commit.stateRoot === proposal.stateRoot
		&& commit.checkpointId === computePhaseCheckpointId({
			roomId: commit.roomId,
			proposal,
		});
}

function trySendProposal(send: PhaseCheckpointProposalSender, proposal: PhaseCheckpointProposal): boolean {
	try {
		// `undefined` preserves compatibility with legacy direct-room senders;
		// only an explicit false means the transport rejected the proposal.
		return send(proposal) !== false;
	} catch {
		return false;
	}
}

export function createPhaseCheckpointClient(input?: {
	readonly timeoutMs?: number;
}): PhaseCheckpointClient {
	const timeoutMs = input?.timeoutMs ?? 75_000;
	let lastCommit: PhaseCheckpointCommit | null = null;
	let pending: PendingRequest | null = null;
	let terminalDispute: PhaseCheckpointDispute | null = null;

	function settlePending(result: PhaseCheckpointRequestResult): void {
		const current = pending;
		if (!current) return;
		clearTimeout(current.timeout);
		pending = null;
		current.resolve(result);
	}

	function request(requestInput: {
		readonly matchId: string;
		readonly fromPhase: PhaseCheckpointPhase;
		readonly toPhase: PhaseCheckpointPhase;
		readonly stateRoot: Hash256;
		readonly send: PhaseCheckpointProposalSender;
	}): Promise<PhaseCheckpointRequestResult> {
		if (terminalDispute) {
			return Promise.resolve({ status: 'disputed', dispute: terminalDispute });
		}

		const proposal = PhaseCheckpointProposalSchema.parse({
			type: 'phase_checkpoint_propose_v1',
			protocolVersion: PHASE_CHECKPOINT_PROTOCOL_VERSION,
			scope: PHASE_CHECKPOINT_SCOPE,
			matchId: requestInput.matchId,
			epoch: (lastCommit?.epoch ?? 0) + 1,
			fromPhase: requestInput.fromPhase,
			toPhase: requestInput.toPhase,
			previousCheckpointId: lastCommit?.checkpointId ?? ZERO_PHASE_CHECKPOINT_ID,
			stateRoot: requestInput.stateRoot,
		});

		if (pending) {
			if (samePhaseCheckpointProposal(pending.proposal, proposal)) {
				const pendingPromise = pending.promise;
				if (!trySendProposal(requestInput.send, pending.proposal)) {
					settlePending({ status: 'unavailable', reason: 'transport_rejected' });
				}
				return pendingPromise;
			}
			return Promise.resolve({ status: 'unavailable', reason: 'pending_transition' });
		}

		let resolve!: (result: PhaseCheckpointRequestResult) => void;
		const promise = new Promise<PhaseCheckpointRequestResult>((done) => {
			resolve = done;
		});
		const timeout = setTimeout(() => {
			settlePending({ status: 'unavailable', reason: 'client_timeout' });
		}, timeoutMs);
		pending = { proposal, promise, resolve, timeout };
		if (!trySendProposal(requestInput.send, proposal)) {
			settlePending({ status: 'unavailable', reason: 'transport_rejected' });
		}
		return promise;
	}

	function handleServerMessage(message: PhaseCheckpointServerMessage): boolean {
		const current = pending;
		if (!current) {
			return message.type === 'phase_checkpoint_commit_v1'
				&& lastCommit?.checkpointId === message.checkpointId;
		}
		if (message.matchId !== current.proposal.matchId
			|| message.epoch !== current.proposal.epoch) {
			return false;
		}

		if (message.type === 'phase_checkpoint_dispute_v1') {
			if (isRetryablePhaseCheckpointDispute(message.reason)) {
				return true;
			}
			terminalDispute = message;
			settlePending({ status: 'disputed', dispute: message });
			return true;
		}

		if (!commitMatchesProposal(message, current.proposal)) return false;
		if (lastCommit && message.roomId !== lastCommit.roomId) return false;
		lastCommit = message;
		settlePending({ status: 'committed', commit: message });
		return true;
	}

	function retryPending(send: PhaseCheckpointProposalSender): boolean {
		const current = pending;
		if (!current) return false;
		if (!trySendProposal(send, current.proposal)) {
			settlePending({ status: 'unavailable', reason: 'transport_rejected' });
			return false;
		}
		return true;
	}

	function reset(): void {
		if (pending) {
			clearTimeout(pending.timeout);
			pending.resolve({ status: 'unavailable', reason: 'client_timeout' });
		}
		pending = null;
		lastCommit = null;
		terminalDispute = null;
	}

	return Object.freeze({
		request,
		handleServerMessage,
		retryPending,
		reset,
		getPendingProposal: () => pending?.proposal ?? null,
	});
}

export const phaseCheckpointClient = createPhaseCheckpointClient();
