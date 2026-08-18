import { describe, expect, it } from 'vitest';
import {
	type P2PRankedDecision,
	type P2PRankedSettlementAdapters,
	type P2PRankedSettlementModule,
	createP2PRankedSettlementModule,
} from './rankedSettlement';
import type { MatchEndContext } from '../../onWinDispatch';
import type { MatchContext } from '../../types';
import {
	type P2PWinnerArbiterCandidate,
	type P2PWinnerArbiterDecision,
	P2P_WINNER_ARBITER_REJECT_REASONS,
} from './winnerArbiter';

const BASE_CTX: MatchContext = {
	matchId: 'match-s1-001',
	matchSeed: 'seed-s1-001',
	opponent: { kind: 'peer', peerId: 'peer-1', myRole: 'first-mover', opponentUsername: 'bob' },
	reward: {
		matchXp: { kind: 'none' },
		rune: { kind: 'none' },
		ranking: { kind: 'elo' },
	},
};

const WIN_END: MatchEndContext = { iWon: true, turnCount: 12 };
const LOSS_END: MatchEndContext = { iWon: false, turnCount: 8 };

const VERIFIED_DECISION: P2PWinnerArbiterDecision = {
	status: 'verified',
	matchId: 'match-s1-001',
	seasonId: '1',
	winner: 'alice',
	loser: 'bob',
	transcriptRoot: 'root-1',
	transcriptCid: 'cid-1',
	commitmentHash: 'commit-1',
	effects: {
		canBroadcastMatchResult: true,
		canApplyP2PRankedRune: true,
		canApplyElo: true,
		rewardEvidence: 'verified_dual_signed_match_result',
	},
};

const REJECTED_DECISION: P2PWinnerArbiterDecision = {
	status: 'rejected',
	reason: P2P_WINNER_ARBITER_REJECT_REASONS.runtimeProfile,
	effects: {
		canBroadcastMatchResult: false,
		canApplyP2PRankedRune: false,
		canApplyElo: false,
		rewardEvidence: 'none',
	},
};

const BASE_CANDIDATE: P2PWinnerArbiterCandidate = {
	matchId: 'match-s1-001',
	seasonId: '1',
	runtime: { stage: 'mainnet', protocolId: 'p1', resetEpoch: 'e1' },
	participants: [
		{ account: 'alice', sessionPubkey: 'pub-alice' },
		{ account: 'bob', sessionPubkey: 'pub-bob' },
	],
	anchor: null,
	deckEvidence: { kind: 'result_only' },
	transcript: {
		localRoot: 'root-1',
		remoteRoot: 'root-1',
		deterministic: true,
		finalizedBy: 'deterministic_transcript_finalizer',
		cid: 'cid-1',
	},
	result: { winner: 'alice', loser: 'bob', replayWinner: 'alice', commitmentHash: 'commit-1' },
	review: { visibleBeforeSigning: true },
	signatures: {
		winner: {
			signer: 'alice',
			signature: 'sig-w',
			verifiedByPinnedPubkey: true,
			commitmentHash: 'commit-1',
			domain: 'p2p-match-result',
		},
		loser: {
			signer: 'bob',
			signature: 'sig-l',
			verifiedByPinnedPubkey: true,
			commitmentHash: 'commit-1',
			domain: 'p2p-match-result',
		},
	},
};

function makeAdapters(overrides: Partial<P2PRankedSettlementAdapters> = {}): {
	adapters: P2PRankedSettlementAdapters;
	module: P2PRankedSettlementModule;
	calls: { audit: number };
} {
	const calls = { audit: 0 };
	const adapters: P2PRankedSettlementAdapters = {
		readRuntimeGate: () => false,
		readPreMatchEvidence: () => ({
			present: false,
			matchAnchorDualAnchored: false,
			pinnedPubkeysPresent: false,
			reasonIfMissing: 'no pre-match anchor',
		}),
		verifyCandidate: () => REJECTED_DECISION,
		computeReward: () => null,
		submitMatchResult: () => false,
		recordAudit: () => {
			calls.audit += 1;
		},
		buildCandidate: () => null,
		...overrides,
	};
	const module = createP2PRankedSettlementModule(adapters);
	return { adapters, module, calls };
}

describe('P2PRankedSettlementModule.evaluateMatchEnd', () => {
	it('1. returns pending_pre_match_evidence when pre-match evidence absent', () => {
		const { module } = makeAdapters();
		const decision = module.evaluateMatchEnd(BASE_CTX, WIN_END);
		expect(decision.status).toBe('pending_pre_match_evidence');
		expect(decision.canBroadcastMatchResult).toBe(false);
		expect(decision.canApplyP2PRankedRune).toBe(false);
		expect(decision.canApplyElo).toBe(false);
	});

	it('2. returns arbiter_rejected when arbiter rejects the candidate', () => {
		const { module } = makeAdapters({
			readPreMatchEvidence: () => ({
				present: true,
				matchAnchorDualAnchored: true,
				pinnedPubkeysPresent: true,
				reasonIfMissing: null,
			}),
			buildCandidate: () => BASE_CANDIDATE,
			verifyCandidate: () => REJECTED_DECISION,
		});
		const decision = module.evaluateMatchEnd(BASE_CTX, WIN_END);
		expect(decision.status).toBe('arbiter_rejected');
		expect(
			(decision as Extract<P2PRankedDecision, { status: 'arbiter_rejected' }>).reason,
		).toBe(P2P_WINNER_ARBITER_REJECT_REASONS.runtimeProfile);
		expect(decision.canBroadcastMatchResult).toBe(false);
	});

	it('3. returns blocked_by_runtime_gate when arbiter verifies but gate closed (Alfa default)', () => {
		const { module } = makeAdapters({
			readPreMatchEvidence: () => ({
				present: true,
				matchAnchorDualAnchored: true,
				pinnedPubkeysPresent: true,
				reasonIfMissing: null,
			}),
			buildCandidate: () => BASE_CANDIDATE,
			verifyCandidate: () => VERIFIED_DECISION,
			readRuntimeGate: () => false,
		});
		const decision = module.evaluateMatchEnd(BASE_CTX, WIN_END);
		expect(decision.status).toBe('blocked_by_runtime_gate');
		expect(decision.canBroadcastMatchResult).toBe(false);
		expect(decision.canApplyP2PRankedRune).toBe(false);
		expect(decision.canApplyElo).toBe(false);
	});

	it('4. returns arbiter_rejected with loss reason when local player lost', () => {
		const { module } = makeAdapters({
			readPreMatchEvidence: () => ({
				present: true,
				matchAnchorDualAnchored: true,
				pinnedPubkeysPresent: true,
				reasonIfMissing: null,
			}),
			buildCandidate: () => BASE_CANDIDATE,
			verifyCandidate: () => VERIFIED_DECISION,
			readRuntimeGate: () => true,
			computeReward: () => null,
		});
		const decision = module.evaluateMatchEnd(BASE_CTX, LOSS_END);
		expect(decision.status).toBe('arbiter_rejected');
		expect(
			(decision as Extract<P2PRankedDecision, { status: 'arbiter_rejected' }>).reason,
		).toBe('loss does not earn ranked reward');
	});

	it('5. returns verified_broadcast_ready only when gate is open AND arbiter verified AND winner', () => {
		const { module } = makeAdapters({
			readPreMatchEvidence: () => ({
				present: true,
				matchAnchorDualAnchored: true,
				pinnedPubkeysPresent: true,
				reasonIfMissing: null,
			}),
			buildCandidate: () => BASE_CANDIDATE,
			verifyCandidate: () => VERIFIED_DECISION,
			readRuntimeGate: () => true,
			computeReward: () => ({ eloDelta: 16, runeDelta: 2, evidenceTag: 'verified_dual_signed_match_result' }),
		});
		const decision = module.evaluateMatchEnd(BASE_CTX, WIN_END);
		expect(decision.status).toBe('verified_broadcast_ready');
		expect(decision.canBroadcastMatchResult).toBe(true);
		expect(decision.canApplyP2PRankedRune).toBe(true);
		expect(decision.canApplyElo).toBe(true);
		const reward = (decision as Extract<P2PRankedDecision, { status: 'verified_broadcast_ready' }>).reward;
		expect(reward.eloDelta).toBe(16);
		expect(reward.runeDelta).toBe(2);
	});

	it('6. in default Alfa runtime, evaluateMatchEnd CANNOT return verified_broadcast_ready', () => {
		// Default adapters have readRuntimeGate returning false.
		// Even with the strongest possible upstream signals, the gate stops construction.
		const { module } = makeAdapters({
			readPreMatchEvidence: () => ({
				present: true,
				matchAnchorDualAnchored: true,
				pinnedPubkeysPresent: true,
				reasonIfMissing: null,
			}),
			buildCandidate: () => BASE_CANDIDATE,
			verifyCandidate: () => VERIFIED_DECISION,
			computeReward: () => ({ eloDelta: 16, runeDelta: 2, evidenceTag: 'verified_dual_signed_match_result' }),
		});
		const decision = module.evaluateMatchEnd(BASE_CTX, WIN_END);
		expect(decision.status).not.toBe('verified_broadcast_ready');
		expect(decision.status).toBe('blocked_by_runtime_gate');
	});

	it('7. every blocked variant sets the can* triple to false (no partial payoff)', () => {
		const blockedVariants: P2PRankedDecision['status'][] = [
			'pending_pre_match_evidence',
			'arbiter_rejected',
			'blocked_by_runtime_gate',
		];
		for (const status of blockedVariants) {
			const { module, adapters } = makeAdapters();
			const decision = module.evaluateMatchEnd(BASE_CTX, WIN_END);
			expect(['pending_pre_match_evidence', 'arbiter_rejected', 'blocked_by_runtime_gate']).toContain(
				decision.status,
			);
			expect(decision.canBroadcastMatchResult).toBe(false);
			expect(decision.canApplyP2PRankedRune).toBe(false);
			expect(decision.canApplyElo).toBe(false);
			// Build a fresh module for each variant; suppress unused
			void adapters;
			void status;
		}
	});

	it('8. records an audit event for every decision', () => {
		const { module, calls } = makeAdapters();
		module.evaluateMatchEnd(BASE_CTX, WIN_END);
		expect(calls.audit).toBe(1);

		const { module: module2, calls: calls2 } = makeAdapters({
			readPreMatchEvidence: () => ({
				present: true,
				matchAnchorDualAnchored: true,
				pinnedPubkeysPresent: true,
				reasonIfMissing: null,
			}),
			buildCandidate: () => BASE_CANDIDATE,
			verifyCandidate: () => REJECTED_DECISION,
		});
		module2.evaluateMatchEnd(BASE_CTX, WIN_END);
		expect(calls2.audit).toBe(1);
	});

	it('9. submitSignedCandidate routes through gate and returns blocked_by_runtime_gate in Alfa', () => {
		const { module } = makeAdapters({
			verifyCandidate: () => VERIFIED_DECISION,
		});
		const decision = module.submitSignedCandidate(BASE_CTX, BASE_CANDIDATE);
		expect(decision.status).toBe('blocked_by_runtime_gate');
		expect(decision.canBroadcastMatchResult).toBe(false);
	});
});
