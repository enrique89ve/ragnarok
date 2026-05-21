import { TESTNET_RUNE_ECONOMY } from '@shared/protocol-core/runeEconomy';

/*
 * PROTOTYPE - throwaway P2P ranked settlement state model.
 *
 * Question: how can QA full-catalog show local RUNE/XP reward feedback while
 * keeping economic ranked settlement blocked until dual-signed evidence exists?
 */

export type Peer = 'alice' | 'bob';
export type MatchPhase = 'playing' | 'game_over' | 'review' | 'submitted' | 'settled';
export type MatchType = 'unknown' | 'casual' | 'ranked';
export type MatchUniverse = 'unknown' | 'qa_full_catalog' | 'full_nft_ranked';
export type DeckEvidence = 'none' | 'qa_full_catalog' | 'nft_custody';
export type AnchorStatus = 'none' | 'single' | 'dual';
export type TranscriptMode = 'none' | 'race_order' | 'deterministic';
export type ArbiterStatus = 'idle' | 'rejected' | 'ready' | 'verified';
export type SettlementStatus =
	| 'no_settlement'
	| 'blocked'
	| 'ready_to_submit'
	| 'credited';

export interface SettlementPrototypeState {
	readonly matchId: string;
	readonly phase: MatchPhase;
	readonly matchType: MatchType;
	readonly universe: MatchUniverse;
	readonly deckEvidence: DeckEvidence;
	readonly winner: Peer | null;
	readonly anchor: {
		readonly status: AnchorStatus;
		readonly pubkeysPinned: boolean;
		readonly deckHashesPinned: boolean;
		readonly engineHashPinned: boolean;
	};
	readonly transcript: {
		readonly mode: TranscriptMode;
		readonly localRoot: string | null;
		readonly remoteRoot: string | null;
		readonly deterministicOrder: boolean;
	};
	readonly review: {
		readonly visible: boolean;
		readonly winnerAccepted: boolean;
		readonly loserAccepted: boolean;
	};
	readonly signatures: {
		readonly winner: boolean;
		readonly loser: boolean;
	};
	readonly disconnect: {
		readonly opponentOffline: boolean;
		readonly timeoutClaimReady: boolean;
	};
	readonly arbiter: {
		readonly status: ArbiterStatus;
		readonly reason: string | null;
	};
	readonly settlement: SettlementDecision;
	readonly rewardFeedback: RewardFeedback;
	readonly eventLog: readonly string[];
}

export interface SettlementDecision {
	readonly status: SettlementStatus;
	readonly reason: string;
	readonly winnerRune: number;
	readonly loserRune: number;
	readonly sourceKey: string | null;
}

export interface RewardFeedback {
	readonly visible: boolean;
	readonly scope: 'none' | 'qa_local' | 'chain';
	readonly label: string;
	readonly runeShown: number;
	readonly matchXpShown: number;
	readonly cardXpShown: number;
	readonly persistence: string;
}

export type SettlementAction =
	| { readonly type: 'reset' }
	| { readonly type: 'declare_local_win' }
	| { readonly type: 'qa_full_catalog' }
	| { readonly type: 'full_nft_ranked' }
	| { readonly type: 'set_ranked' }
	| { readonly type: 'single_anchor' }
	| { readonly type: 'dual_anchor' }
	| { readonly type: 'race_transcript' }
	| { readonly type: 'deterministic_transcript' }
	| { readonly type: 'open_review' }
	| { readonly type: 'winner_signs' }
	| { readonly type: 'loser_signs' }
	| { readonly type: 'hidden_prompt_attempt' }
	| { readonly type: 'submit_to_arbiter' }
	| { readonly type: 'arbiter_verifies' }
	| { readonly type: 'opponent_disconnects' }
	| { readonly type: 'timeout_claim' }
	| { readonly type: 'scenario'; readonly scenario: ScenarioName };

export type ScenarioName =
	| 'qa_local_rewards'
	| 'happy'
	| 'result_only'
	| 'transcript_mismatch'
	| 'hidden_prompt'
	| 'disconnect';

type SettlementDecisionInput = Omit<SettlementPrototypeState, 'settlement' | 'rewardFeedback'>;
type SettlementActionHandler = (
	state: SettlementPrototypeState,
	action: SettlementAction,
) => SettlementPrototypeState;
type SettlementBlocker = (state: SettlementDecisionInput) => string | null;

const MATCH_ID = 'qa-s0-ranked-prototype-001';
const MATCH_ROOT = 'root:seq-0001-alice-move-bob-move';
const LOCAL_RACE_ROOT = 'root:local-alice-first';
const REMOTE_RACE_ROOT = 'root:remote-bob-first';
const QA_LOCAL_MATCH_XP = 25;

export function createInitialSettlementPrototypeState(): SettlementPrototypeState {
	return withDecision({
		matchId: MATCH_ID,
		phase: 'playing',
		matchType: 'unknown',
		universe: 'unknown',
		deckEvidence: 'none',
		winner: null,
		anchor: {
			status: 'none',
			pubkeysPinned: false,
			deckHashesPinned: false,
			engineHashPinned: false,
		},
		transcript: {
			mode: 'none',
			localRoot: null,
			remoteRoot: null,
			deterministicOrder: false,
		},
		review: {
			visible: false,
			winnerAccepted: false,
			loserAccepted: false,
		},
		signatures: {
			winner: false,
			loser: false,
		},
		disconnect: {
			opponentOffline: false,
			timeoutClaimReady: false,
		},
		arbiter: {
			status: 'idle',
			reason: null,
		},
		settlement: blocked('initialising'),
		rewardFeedback: noRewardFeedback(),
		eventLog: ['Prototype loaded: local reward feedback is separate from economic settlement.'],
	});
}

const settlementActionHandlers: Record<SettlementAction['type'], SettlementActionHandler> = {
	reset: () => createInitialSettlementPrototypeState(),
	scenario: (state, action) => action.type === 'scenario' ? loadScenario(action.scenario) : state,
	declare_local_win: state => patch(state, 'Local game ended: alice won.', {
		phase: 'game_over',
		winner: 'alice',
	}),
	qa_full_catalog: state => patch(state, 'QA full-catalog mode: show local reward feedback only.', {
		universe: 'qa_full_catalog',
		deckEvidence: 'qa_full_catalog',
		matchType: 'ranked',
	}),
	full_nft_ranked: state => patch(state, 'Full NFT ranked mode: deck is eligible for economic settlement.', {
		universe: 'full_nft_ranked',
		deckEvidence: 'nft_custody',
		matchType: 'ranked',
	}),
	set_ranked: state => patch(state, 'Match type set to ranked.', { matchType: 'ranked' }),
	single_anchor: state => patch(state, 'Only one peer anchored the match. This is not enough.', {
		anchor: {
			status: 'single',
			pubkeysPinned: true,
			deckHashesPinned: true,
			engineHashPinned: true,
		},
	}),
	dual_anchor: state => patch(state, 'Dual match_anchor exists with pinned pubkeys/decks/engine.', {
		anchor: {
			status: 'dual',
			pubkeysPinned: true,
			deckHashesPinned: true,
			engineHashPinned: true,
		},
	}),
	race_transcript: state => patch(state, 'Both peers saw the actions, but hashed them in different order.', {
		transcript: {
			mode: 'race_order',
			localRoot: LOCAL_RACE_ROOT,
			remoteRoot: REMOTE_RACE_ROOT,
			deterministicOrder: false,
		},
	}),
	deterministic_transcript: state => patch(state, 'Transcript ordered by stable sequence; roots match.', {
		transcript: {
			mode: 'deterministic',
			localRoot: MATCH_ROOT,
			remoteRoot: MATCH_ROOT,
			deterministicOrder: true,
		},
	}),
	open_review: state => patch(state, 'Visible result review opened. Signing is now user-initiated.', {
		phase: 'review',
		review: {
			...state.review,
			visible: true,
		},
	}),
	winner_signs: state => {
		if (!state.review.visible) {
			return patch(state, 'Blocked winner signature: review UI is not visible.', {});
		}
		return patch(state, 'Winner signed compact result commitment.', {
			review: { ...state.review, winnerAccepted: true },
			signatures: { ...state.signatures, winner: true },
		});
	},
	loser_signs: state => {
		if (!state.review.visible) {
			return patch(state, 'Blocked loser signature: review UI is not visible.', {});
		}
		return patch(state, 'Loser countersigned the same compact commitment.', {
			review: { ...state.review, loserAccepted: true },
			signatures: { ...state.signatures, loser: true },
		});
	},
	hidden_prompt_attempt: state => patch(state, 'Hidden Keychain prompt blocked: result_signature_deferred.', {}),
	submit_to_arbiter: state => submitToArbiter(state),
	arbiter_verifies: state => {
		if (state.arbiter.status !== 'ready') {
			return patch(state, 'Arbiter cannot verify: no ready submission.', {});
		}
		return patch(state, 'Arbiter verified envelope and replay evidence.', {
			phase: 'settled',
			arbiter: { status: 'verified', reason: null },
		});
	},
	opponent_disconnects: state => patch(state, 'Opponent disconnected before final dual-signed result.', {
		disconnect: { ...state.disconnect, opponentOffline: true },
	}),
	timeout_claim: state => patch(state, 'timeout_claim is not implemented: no ranked settlement.', {
		disconnect: { opponentOffline: true, timeoutClaimReady: false },
	}),
};

export function reduceSettlementPrototype(
	state: SettlementPrototypeState,
	action: SettlementAction,
): SettlementPrototypeState {
	return settlementActionHandlers[action.type](state, action);
}

export function getScenarioNames(): readonly ScenarioName[] {
	return ['qa_local_rewards', 'happy', 'result_only', 'transcript_mismatch', 'hidden_prompt', 'disconnect'];
}

export function loadScenario(scenario: ScenarioName): SettlementPrototypeState {
	let state = createInitialSettlementPrototypeState();
	const run = (actions: readonly SettlementAction[]) => {
		for (const action of actions) state = reduceSettlementPrototype(state, action);
		return state;
	};

	switch (scenario) {
		case 'qa_local_rewards':
			return run([
				{ type: 'qa_full_catalog' },
				{ type: 'declare_local_win' },
			]);
		case 'happy':
			return run([
				{ type: 'full_nft_ranked' },
				{ type: 'dual_anchor' },
				{ type: 'declare_local_win' },
				{ type: 'deterministic_transcript' },
				{ type: 'open_review' },
				{ type: 'winner_signs' },
				{ type: 'loser_signs' },
				{ type: 'submit_to_arbiter' },
				{ type: 'arbiter_verifies' },
			]);
		case 'result_only':
			return run([
				{ type: 'full_nft_ranked' },
				{ type: 'declare_local_win' },
				{ type: 'deterministic_transcript' },
				{ type: 'open_review' },
				{ type: 'winner_signs' },
				{ type: 'loser_signs' },
				{ type: 'submit_to_arbiter' },
			]);
		case 'transcript_mismatch':
			return run([
				{ type: 'full_nft_ranked' },
				{ type: 'dual_anchor' },
				{ type: 'declare_local_win' },
				{ type: 'race_transcript' },
				{ type: 'open_review' },
				{ type: 'winner_signs' },
				{ type: 'loser_signs' },
				{ type: 'submit_to_arbiter' },
			]);
		case 'hidden_prompt':
			return run([
				{ type: 'full_nft_ranked' },
				{ type: 'dual_anchor' },
				{ type: 'declare_local_win' },
				{ type: 'deterministic_transcript' },
				{ type: 'hidden_prompt_attempt' },
				{ type: 'submit_to_arbiter' },
			]);
		case 'disconnect':
			return run([
				{ type: 'full_nft_ranked' },
				{ type: 'dual_anchor' },
				{ type: 'declare_local_win' },
				{ type: 'deterministic_transcript' },
				{ type: 'opponent_disconnects' },
				{ type: 'timeout_claim' },
				{ type: 'submit_to_arbiter' },
			]);
	}
}

function submitToArbiter(state: SettlementPrototypeState): SettlementPrototypeState {
	const decision = deriveSettlementDecision(state);
	if (decision.status !== 'ready_to_submit') {
		return patch(state, `Arbiter rejected/blocked submission: ${decision.reason}`, {
			phase: state.phase === 'playing' ? state.phase : 'submitted',
			arbiter: { status: 'rejected', reason: decision.reason },
		});
	}
	return patch(state, 'Envelope ready for arbiter verification.', {
		phase: 'submitted',
		arbiter: { status: 'ready', reason: null },
	});
}

function patch(
	state: SettlementPrototypeState,
	message: string,
	next: Partial<Omit<SettlementPrototypeState, 'settlement' | 'rewardFeedback' | 'eventLog'>>,
): SettlementPrototypeState {
	return withDecision({
		...state,
		...next,
		eventLog: [...state.eventLog, message].slice(-9),
	});
}

function withDecision(
	state: SettlementDecisionInput & { settlement: SettlementDecision; rewardFeedback: RewardFeedback },
): SettlementPrototypeState {
	const settlement = deriveSettlementDecision(state);
	return {
		...state,
		settlement,
		rewardFeedback: deriveRewardFeedback(state, settlement),
	};
}

function deriveSettlementDecision(
	state: SettlementDecisionInput,
): SettlementDecision {
	const blockReason = getSettlementBlockReason(state);
	if (blockReason) return blocked(blockReason);
	if (state.arbiter.status === 'verified') {
		return {
			status: 'credited',
			reason: 'verified dual-signed match_result with replayable transcript',
			winnerRune: TESTNET_RUNE_ECONOMY.p2pWinRune,
			loserRune: TESTNET_RUNE_ECONOMY.p2pLossRune,
			sourceKey: `p2p:S01:${state.matchId}:winner:${state.winner}`,
		};
	}
	return {
		status: 'ready_to_submit',
		reason: 'all preconditions met; arbiter can verify and publish/accept match_result',
		winnerRune: 0,
		loserRune: 0,
		sourceKey: null,
	};
}

const settlementBlockers: readonly SettlementBlocker[] = [
	requireRankedMatch,
	rejectQaFullCatalog,
	requireNftCustodyEvidence,
	requireFinalWinner,
	rejectOfflineOpponent,
	requireDualAnchor,
	requirePinnedAnchorFacts,
	requireTranscriptRoots,
	requireDeterministicTranscript,
	requireVisibleReview,
	requireDualSignatures,
];

function getSettlementBlockReason(state: SettlementDecisionInput): string | null {
	for (const blocker of settlementBlockers) {
		const reason = blocker(state);
		if (reason) return reason;
	}
	return null;
}

function requireRankedMatch(state: SettlementDecisionInput): string | null {
	return state.matchType === 'ranked' ? null : 'match is not ranked';
}

function rejectQaFullCatalog(state: SettlementDecisionInput): string | null {
	return state.universe === 'qa_full_catalog'
		? 'QA full-catalog rewards are local feedback; no p2p_ranked ledger entry'
		: null;
}

function requireNftCustodyEvidence(state: SettlementDecisionInput): string | null {
	return state.universe === 'full_nft_ranked' && state.deckEvidence !== 'nft_custody'
		? 'full NFT ranked requires nft-custody deck evidence'
		: null;
}

function requireFinalWinner(state: SettlementDecisionInput): string | null {
	return state.winner && state.phase !== 'playing' ? null : 'match has no final winner yet';
}

function rejectOfflineOpponent(state: SettlementDecisionInput): string | null {
	return state.disconnect.opponentOffline
		? 'opponent offline before final dual-signed result; timeout_claim is not live'
		: null;
}

function requireDualAnchor(state: SettlementDecisionInput): string | null {
	return state.anchor.status === 'dual'
		? null
		: 'ranked match requires prior dual-anchored match_anchor';
}

function requirePinnedAnchorFacts(state: SettlementDecisionInput): string | null {
	return state.anchor.pubkeysPinned && state.anchor.deckHashesPinned && state.anchor.engineHashPinned
		? null
		: 'match_anchor is missing pinned pubkeys, deck hashes, or engine hash';
}

function requireTranscriptRoots(state: SettlementDecisionInput): string | null {
	return state.transcript.localRoot && state.transcript.remoteRoot
		? null
		: 'missing signed transcript roots';
}

function requireDeterministicTranscript(state: SettlementDecisionInput): string | null {
	return state.transcript.deterministicOrder && state.transcript.localRoot === state.transcript.remoteRoot
		? null
		: 'transcript_root_mismatch; fail closed until ordering is deterministic';
}

function requireVisibleReview(state: SettlementDecisionInput): string | null {
	return state.review.visible ? null : 'visible result review/sign flow required before Keychain';
}

function requireDualSignatures(state: SettlementDecisionInput): string | null {
	return state.signatures.winner && state.signatures.loser
		? null
		: 'ranked match_result requires winner and loser signatures';
}

function blocked(reason: string): SettlementDecision {
	return {
		status: 'blocked',
		reason,
		winnerRune: 0,
		loserRune: 0,
		sourceKey: null,
	};
}

function deriveRewardFeedback(
	state: SettlementDecisionInput,
	settlement: SettlementDecision,
): RewardFeedback {
	if (!state.winner || state.phase === 'playing') return noRewardFeedback();

	if (state.universe === 'qa_full_catalog') {
		return {
				visible: true,
				scope: 'qa_local',
				label: 'QA local reward preview',
			runeShown: TESTNET_RUNE_ECONOMY.p2pWinRune,
			matchXpShown: QA_LOCAL_MATCH_XP,
			cardXpShown: 0,
			persistence: 'local session/profile only; no RUNE ledger, no CardXP, no level_up',
		};
	}

	if (settlement.status === 'credited') {
		return {
			visible: true,
			scope: 'chain',
			label: 'Verified ranked reward',
			runeShown: settlement.winnerRune,
			matchXpShown: QA_LOCAL_MATCH_XP,
			cardXpShown: QA_LOCAL_MATCH_XP,
			persistence: 'replay-derived RUNE ledger plus NFT CardXP/level_up path',
		};
	}

	if (state.universe === 'full_nft_ranked') {
		return {
				visible: true,
				scope: 'qa_local',
				label: 'Projected ranked reward',
			runeShown: TESTNET_RUNE_ECONOMY.p2pWinRune,
			matchXpShown: QA_LOCAL_MATCH_XP,
			cardXpShown: 0,
			persistence: 'preview only until dual-signed match_result is verified',
		};
	}

	return noRewardFeedback();
}

function noRewardFeedback(): RewardFeedback {
	return {
		visible: false,
		scope: 'none',
		label: 'No reward feedback',
		runeShown: 0,
		matchXpShown: 0,
		cardXpShown: 0,
		persistence: 'none',
	};
}
