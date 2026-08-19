import { describe, expect, it, vi } from 'vitest';

import { Hash256Schema } from '@shared/p2p-wire/integrity';
import { buildPhaseCheckpointCommit } from '@shared/p2p-wire/phaseCheckpoint';
import { createPhaseCheckpointClient } from './phaseCheckpointClient';

const ROOT = Hash256Schema.parse('1'.repeat(64));

describe('phaseCheckpointClient', () => {
	it('retries the same proposal and resolves only a matching server commit', async () => {
		const client = createPhaseCheckpointClient({ timeoutMs: 1_000 });
		const sent: unknown[] = [];
		const promise = client.request({
			matchId: 'match-1', fromPhase: 'chess', toPhase: 'poker_combat', stateRoot: ROOT,
			send: (proposal) => sent.push(proposal),
		});
		expect(client.retryPending((proposal) => sent.push(proposal))).toBe(true);
		expect(sent[1]).toEqual(sent[0]);
		const proposal = client.getPendingProposal();
		if (!proposal) throw new Error('expected pending proposal');
		const commit = buildPhaseCheckpointCommit({ roomId: 'room-1', proposal });
		expect(client.handleServerMessage(commit)).toBe(true);
		expect(await promise).toEqual({ status: 'committed', commit });
	});

	it('ignores a commit whose root is not bound to the pending proposal', () => {
		const client = createPhaseCheckpointClient({ timeoutMs: 1_000 });
		void client.request({
			matchId: 'match-1', fromPhase: 'chess', toPhase: 'poker_combat', stateRoot: ROOT,
			send: () => undefined,
		});
		const proposal = client.getPendingProposal();
		if (!proposal) throw new Error('expected pending proposal');
		const forged = buildPhaseCheckpointCommit({
			roomId: 'room-1',
			proposal: { ...proposal, stateRoot: Hash256Schema.parse('2'.repeat(64)) },
		});
		expect(client.handleServerMessage(forged)).toBe(false);
		client.reset();
	});

	it('does not terminate on a retryable observer mismatch', async () => {
		const client = createPhaseCheckpointClient({ timeoutMs: 1_000 });
		const promise = client.request({
			matchId: 'match-1', fromPhase: 'chess', toPhase: 'poker_combat', stateRoot: ROOT,
			send: () => undefined,
		});
		const proposal = client.getPendingProposal();
		if (!proposal) throw new Error('expected pending proposal');
		expect(client.handleServerMessage({
			type: 'phase_checkpoint_dispute_v1',
			protocolVersion: proposal.protocolVersion,
			scope: proposal.scope,
			roomId: 'room-1',
			matchId: proposal.matchId,
			epoch: proposal.epoch,
			reason: 'peer_mismatch',
		})).toBe(true);
		expect(client.getPendingProposal()).toEqual(proposal);
		const commit = buildPhaseCheckpointCommit({ roomId: 'room-1', proposal });
		expect(client.handleServerMessage(commit)).toBe(true);
		await expect(promise).resolves.toEqual({ status: 'committed', commit });
	});

	it('fails closed after the reconnect-sized timeout', async () => {
		vi.useFakeTimers();
		const client = createPhaseCheckpointClient({ timeoutMs: 75_000 });
		const result = client.request({
			matchId: 'match-1', fromPhase: 'chess', toPhase: 'game_over', stateRoot: ROOT,
			send: () => undefined,
		});
		await vi.advanceTimersByTimeAsync(75_000);
		await expect(result).resolves.toEqual({ status: 'unavailable', reason: 'client_timeout' });
		vi.useRealTimers();
	});
});
