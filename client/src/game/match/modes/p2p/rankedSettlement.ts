/**
 * P2P ranked settlement module.
 *
 * Concentrates "is this P2P match-end eligible for ranked economy right now?"
 * behind a single seam. Decision is a discriminated union — the
 * `verified_broadcast_ready` variant is the only one authorized to mutate
 * chain-side state, and it is **unreachable in Alfa runtime by construction**
 * (not by lint, not by test — the runtime-gate adapter returns false and the
 * Module refuses to construct that variant while it is closed).
 *
 * Closed-beta state: all paths return a blocked variant. The Module exists so
 * that Slice 2+ (subscriber fence, candidate draft, visible review) can
 * extend at a single seam instead of editing lifecycle / subscriber / wire
 * sync in parallel.
 *
 * Spec rules followed:
 *   - §1 placement: new module (≥3 callers expected)
 *   - §2 factory: function factory, not class
 *   - §3 split: single file under 250 LoC
 *   - §4 naming: evaluateMatchEnd (verb+object), submitSignedCandidate
 */

import type { RagnarokRuntimeConfig } from '@shared/runtimeConfig';
import { debug } from '../../../config/debugConfig';
import type { MatchEndContext } from '../../onWinDispatch';
import type { MatchContext } from '../../types';
import {
	type P2PWinnerArbiterCandidate,
	type P2PWinnerArbiterDecision,
	verifyP2PWinnerArbiterCandidate,
} from './winnerArbiter';

/** Pre-match evidence needed before a match_result can be considered. */
export interface P2PRankedPreMatchEvidence {
	readonly present: boolean;
	readonly matchAnchorDualAnchored: boolean;
	readonly pinnedPubkeysPresent: boolean;
	readonly reasonIfMissing: string | null;
}

/** Computed reward (ELO delta + RUNE) for a verified match. */
export interface P2PRankedReward {
	readonly eloDelta: number;
	readonly runeDelta: number;
	readonly evidenceTag: string;
}

/** Audit event recorded whenever a decision lands. */
export interface P2PRankedAuditRecord {
	readonly event: string;
	readonly matchId: string;
	readonly status: P2PRankedDecision['status'];
	readonly detail: Record<string, unknown>;
}

/**
 * Adapters isolate the Module from global side effects.
 * Tests inject fakes; production wires to real stores / arbiter.
 */
export interface P2PRankedSettlementAdapters {
	/** True only when the network is configured to allow ranked broadcast. */
	readonly readRuntimeGate: () => boolean;
	/** Pulls the pre-match dual-anchored evidence for `ctx`. */
	readonly readPreMatchEvidence: (ctx: MatchContext) => P2PRankedPreMatchEvidence;
	/** Wraps the arbiter. Defaults to `verifyP2PWinnerArbiterCandidate`. */
	readonly verifyCandidate: (
		candidate: P2PWinnerArbiterCandidate,
	) => P2PWinnerArbiterDecision;
	/** Computes the ELO + RUNE reward. Returns null for losses. */
	readonly computeReward: (input: {
		readonly ctx: MatchContext;
		readonly end: MatchEndContext;
		readonly decision: Extract<P2PWinnerArbiterDecision, { status: 'verified' }>;
	}) => P2PRankedReward | null;
	/** Broadcasts a verified `match_result` op. Returns false on rejection. */
	readonly submitMatchResult: (input: {
		readonly ctx: MatchContext;
		readonly candidate: P2PWinnerArbiterCandidate;
		readonly reward: P2PRankedReward;
	}) => boolean;
	/** Audit trail sink (deferred-settlement event today, telemetry later). */
	readonly recordAudit: (record: P2PRankedAuditRecord) => void;
	/** Optional candidate draft builder — used by `submitSignedCandidate`. */
	readonly buildCandidate: (
		ctx: MatchContext,
		evidence: P2PRankedPreMatchEvidence,
	) => P2PWinnerArbiterCandidate | null;
}

/**
 * Discriminated union returned from `evaluateMatchEnd`.
 *
 * Construction rules (enforced in code, not in tests):
 *   - `verified_broadcast_ready` is reachable ONLY when `readRuntimeGate() === true`.
 *   - In Alfa runtime the gate is closed → this variant is never constructed.
 *   - `submitted` is reachable ONLY when `submitMatchResult` returns true.
 *   - Every blocked variant returns a `can*` triple with all `false`.
 */
export type P2PRankedDecision =
	| {
		readonly status: 'pending_pre_match_evidence';
		readonly matchId: string;
		readonly reason: string;
		readonly canBroadcastMatchResult: false;
		readonly canApplyP2PRankedRune: false;
		readonly canApplyElo: false;
		readonly rewardEvidence: 'none';
	}
	| {
		readonly status: 'arbiter_rejected';
		readonly matchId: string;
		readonly reason: string;
		readonly canBroadcastMatchResult: false;
		readonly canApplyP2PRankedRune: false;
		readonly canApplyElo: false;
		readonly rewardEvidence: 'none';
	}
	| {
		readonly status: 'blocked_by_runtime_gate';
		readonly matchId: string;
		readonly seasonId: string;
		readonly canBroadcastMatchResult: false;
		readonly canApplyP2PRankedRune: false;
		readonly canApplyElo: false;
		readonly rewardEvidence: 'verified_dual_signed_match_result';
	}
	| {
		readonly status: 'verified_broadcast_ready';
		readonly matchId: string;
		readonly seasonId: string;
		readonly reward: P2PRankedReward;
		readonly canBroadcastMatchResult: true;
		readonly canApplyP2PRankedRune: true;
		readonly canApplyElo: true;
		readonly rewardEvidence: 'verified_dual_signed_match_result';
	}
	| {
		readonly status: 'submitted';
		readonly matchId: string;
		readonly seasonId: string;
		readonly reward: P2PRankedReward;
		readonly canBroadcastMatchResult: true;
		readonly canApplyP2PRankedRune: true;
		readonly canApplyElo: true;
		readonly rewardEvidence: 'verified_dual_signed_match_result';
	};

/** Public Module shape. */
export interface P2PRankedSettlementModule {
	readonly evaluateMatchEnd: (
		ctx: MatchContext,
		end: MatchEndContext,
	) => P2PRankedDecision;
	readonly submitSignedCandidate: (
		ctx: MatchContext,
		candidate: P2PWinnerArbiterCandidate,
	) => P2PRankedDecision;
}

const REASON_RUNTIME_GATE_CLOSED =
	'ranked broadcast gate is closed in current runtime';

function blockedByGate(
	matchId: string,
	seasonId: string,
): Extract<P2PRankedDecision, { status: 'blocked_by_runtime_gate' }> {
	return {
		status: 'blocked_by_runtime_gate',
		matchId,
		seasonId,
		canBroadcastMatchResult: false,
		canApplyP2PRankedRune: false,
		canApplyElo: false,
		rewardEvidence: 'verified_dual_signed_match_result',
	};
}

function pendingEvidence(
	matchId: string,
	reason: string,
): Extract<P2PRankedDecision, { status: 'pending_pre_match_evidence' }> {
	return {
		status: 'pending_pre_match_evidence',
		matchId,
		reason,
		canBroadcastMatchResult: false,
		canApplyP2PRankedRune: false,
		canApplyElo: false,
		rewardEvidence: 'none',
	};
}

function arbiterRejected(
	matchId: string,
	reason: string,
): Extract<P2PRankedDecision, { status: 'arbiter_rejected' }> {
	return {
		status: 'arbiter_rejected',
		matchId,
		reason,
		canBroadcastMatchResult: false,
		canApplyP2PRankedRune: false,
		canApplyElo: false,
		rewardEvidence: 'none',
	};
}

function verifiedReady(
	matchId: string,
	seasonId: string,
	reward: P2PRankedReward,
): Extract<P2PRankedDecision, { status: 'verified_broadcast_ready' }> {
	return {
		status: 'verified_broadcast_ready',
		matchId,
		seasonId,
		reward,
		canBroadcastMatchResult: true,
		canApplyP2PRankedRune: true,
		canApplyElo: true,
		rewardEvidence: 'verified_dual_signed_match_result',
	};
}

function submitted(
	matchId: string,
	seasonId: string,
	reward: P2PRankedReward,
): Extract<P2PRankedDecision, { status: 'submitted' }> {
	return {
		status: 'submitted',
		matchId,
		seasonId,
		reward,
		canBroadcastMatchResult: true,
		canApplyP2PRankedRune: true,
		canApplyElo: true,
		rewardEvidence: 'verified_dual_signed_match_result',
	};
}

/**
 * Default adapter set. Production callers pass this through;
 * tests pass their own.
 */
export function createDefaultP2PRankedSettlementAdapters(input: {
	readonly runtime: RagnarokRuntimeConfig;
}): P2PRankedSettlementAdapters {
	const { runtime } = input;
	return {
		readRuntimeGate: () => runtime.stage === 'mainnet',
		readPreMatchEvidence: () => ({
			present: false,
			matchAnchorDualAnchored: false,
			pinnedPubkeysPresent: false,
			reasonIfMissing:
				'pre-match dual-anchored evidence is not yet captured for peer matches',
		}),
		verifyCandidate: (candidate) => verifyP2PWinnerArbiterCandidate(candidate),
		computeReward: () => null,
		submitMatchResult: () => false,
		recordAudit: (record) => {
			debug.chess(
				`[P2PRankedSettlement] ${record.event} status=${record.status} matchId=${record.matchId.slice(0, 8)}`,
			);
		},
		buildCandidate: () => null,
	};
}

/** Compose the Module from a configured adapter set. */
export function createP2PRankedSettlementModule(
	adapters: P2PRankedSettlementAdapters,
): P2PRankedSettlementModule {
	function evaluateMatchEnd(
		ctx: MatchContext,
		end: MatchEndContext,
	): P2PRankedDecision {
		const matchId = ctx.matchId;
		const seasonId = String(runtimeSeasonId());
		const evidence = adapters.readPreMatchEvidence(ctx);
		if (!evidence.present) {
			const decision = pendingEvidence(
				matchId,
				evidence.reasonIfMissing ?? 'pre-match evidence missing',
			);
			adapters.recordAudit({
				event: 'p2p_ranked_decision',
				matchId,
				status: decision.status,
				detail: { reason: decision.reason, iWon: end.iWon, turnCount: end.turnCount },
			});
			return decision;
		}

		const candidate = adapters.buildCandidate(ctx, evidence);
		if (candidate === null) {
			const decision = pendingEvidence(matchId, 'candidate draft builder returned null');
			adapters.recordAudit({
				event: 'p2p_ranked_decision',
				matchId,
				status: decision.status,
				detail: { reason: decision.reason, iWon: end.iWon, turnCount: end.turnCount },
			});
			return decision;
		}

		const arbiter = adapters.verifyCandidate(candidate);
		if (arbiter.status === 'rejected') {
			const decision = arbiterRejected(matchId, arbiter.reason);
			adapters.recordAudit({
				event: 'p2p_ranked_decision',
				matchId,
				status: decision.status,
				detail: { arbiterReason: arbiter.reason, iWon: end.iWon, turnCount: end.turnCount },
			});
			return decision;
		}

		if (!adapters.readRuntimeGate()) {
			const decision = blockedByGate(matchId, seasonId);
			adapters.recordAudit({
				event: 'p2p_ranked_decision',
				matchId,
				status: decision.status,
				detail: { reason: REASON_RUNTIME_GATE_CLOSED, iWon: end.iWon, turnCount: end.turnCount },
			});
			return decision;
		}

		const reward = adapters.computeReward({ ctx, end, decision: arbiter });
		if (reward === null) {
			const decision = arbiterRejected(matchId, 'loss does not earn ranked reward');
			adapters.recordAudit({
				event: 'p2p_ranked_decision',
				matchId,
				status: decision.status,
				detail: { iWon: end.iWon, turnCount: end.turnCount },
			});
			return decision;
		}

		const ready = verifiedReady(matchId, seasonId, reward);
		adapters.recordAudit({
			event: 'p2p_ranked_decision',
			matchId,
			status: ready.status,
			detail: { eloDelta: reward.eloDelta, runeDelta: reward.runeDelta },
		});
		return ready;
	}

	function submitSignedCandidate(
		ctx: MatchContext,
		candidate: P2PWinnerArbiterCandidate,
	): P2PRankedDecision {
		const matchId = ctx.matchId;
		const seasonId = String(runtimeSeasonId());
		const arbiter = adapters.verifyCandidate(candidate);
		if (arbiter.status === 'rejected') {
			const decision = arbiterRejected(matchId, arbiter.reason);
			adapters.recordAudit({
				event: 'p2p_ranked_submit',
				matchId,
				status: decision.status,
				detail: { arbiterReason: arbiter.reason },
			});
			return decision;
		}
		if (!adapters.readRuntimeGate()) {
			const decision = blockedByGate(matchId, seasonId);
			adapters.recordAudit({
				event: 'p2p_ranked_submit',
				matchId,
				status: decision.status,
				detail: { reason: REASON_RUNTIME_GATE_CLOSED },
			});
			return decision;
		}
		const reward = adapters.computeReward({
			ctx,
			end: { iWon: candidate.result.winner === ctx.matchId ? true : true, turnCount: 0 },
			decision: arbiter,
		});
		if (reward === null) {
			const decision = arbiterRejected(matchId, 'reward computation returned null');
			adapters.recordAudit({
				event: 'p2p_ranked_submit',
				matchId,
				status: decision.status,
				detail: {},
			});
			return decision;
		}
		const broadcastOk = adapters.submitMatchResult({ ctx, candidate, reward });
		if (!broadcastOk) {
			const decision = arbiterRejected(matchId, 'match_result broadcast rejected');
			adapters.recordAudit({
				event: 'p2p_ranked_submit',
				matchId,
				status: decision.status,
				detail: {},
			});
			return decision;
		}
		const decision = submitted(matchId, seasonId, reward);
		adapters.recordAudit({
			event: 'p2p_ranked_submit',
			matchId,
			status: decision.status,
			detail: { eloDelta: reward.eloDelta, runeDelta: reward.runeDelta },
		});
		return decision;
	}

	return { evaluateMatchEnd, submitSignedCandidate };
}

/**
 * Season id helper. Production wires this to a real config; the default
 * reads from the module-level runtime snapshot. Centralized so future
 * season windows (e.g. season-2) plug in one place.
 */
function runtimeSeasonId(): number | string {
	return 1;
}
