import { describe, expect, it, vi } from 'vitest';
import { Hash256Schema } from '@shared/p2p-wire/integrity';
import { buildPhaseCheckpointCommit } from '@shared/p2p-wire/phaseCheckpoint';
import { applyChessAction } from '@shared/protocol-core/chess/reducer';
import type { ChessBoardSnapshot } from '@shared/protocol-core/chess/state';
import type { ChessProtocolPiece } from '@shared/protocol-core/chess/types';
import type { LocalSettlementRecord, LocalSettlementStore } from '@shared/protocol-core/localSettlement';
import { buildRagnarokRuntimeEvidence } from '@shared/runtimeConfig';
import { appliedGameCommand, rejectedGameCommand } from '../core/commands';
import { initializeGame } from '../utils/gameUtils';
import type { GameState } from '../types';
import type { MatchContext } from '../match/types';
import { getRagnarokNetworkConfig } from '../config/networkConfig';
import { bindDeckClaimsToAnnounce, canInitDeckHandshake, checkDeckVerificationIdentity } from './deckHandshakeAuthority';
import { createPhaseCheckpointClient } from './phaseCheckpointClient';
import { computeResumeSeal, readP2PMatchResumeRecord, type P2PMatchResumeRecord } from './p2pMatchResume';
import { settleRemoteCommand } from '../match/modes/p2p/wireSync/remoteCommandSettlement';
import { settleRemotePokerAction } from '../match/modes/p2p/wireSync/pokerP2PActionCommit';
import { commitRemotePokerDecision, hasRemotePokerDecision } from '../match/modes/p2p/wireSync/remotePokerDecisionLedger';
import { routeP2PGameEnded } from '../subscribers/localP2PGameEndedBoundary';
import { settleLocalP2PGameOver } from '../subscribers/localP2PSettlement';

type Profile = {
	readonly account: string;
	readonly peerId: string;
	readonly transcript: Array<Readonly<Record<string, unknown>>>;
	readonly pokerLedger: { readonly seen: Set<string>; readonly order: string[] };
	readonly settlementRecords: Map<string, LocalSettlementRecord>;
	incomingChessSeq: number;
	pokerEngineApplications: number;
	pokerRoundCloses: number;
};

function profile(account: string, peerId: string): Profile {
	return { account, peerId, transcript: [], pokerLedger: { seen: new Set(), order: [] }, settlementRecords: new Map(), incomingChessSeq: -1, pokerEngineApplications: 0, pokerRoundCloses: 0 };
}

const pieces: ChessProtocolPiece[] = [
	{ id: 'player-pawn', type: 'pawn', owner: 'player', position: { row: 1, col: 2 }, hasMoved: false },
	{ id: 'player-king', type: 'king', owner: 'player', position: { row: 0, col: 0 }, hasMoved: false },
	{ id: 'opponent-king', type: 'king', owner: 'opponent', position: { row: 6, col: 4 }, hasMoved: false },
];

function chessState(): ChessBoardSnapshot {
	return { pieces: structuredClone(pieces), currentTurn: 'player', gameStatus: 'playing', moveCount: 0, inCheck: null };
}

function settlementStore(target: Profile): LocalSettlementStore {
	return {
		commit: async record => {
			if (target.settlementRecords.has(record.eventId)) return 'already_applied';
			target.settlementRecords.set(record.eventId, record);
			return 'applied';
		},
	};
}

function matchContext(local: Profile, remote: Profile, myRole: 'first-mover' | 'second-mover'): MatchContext {
	return {
		matchId: 'multiprofile-f1-match',
		matchSeed: 'multiprofile-f1-seed',
		opponent: { kind: 'peer', peerId: remote.peerId, myRole, opponentUsername: remote.account },
		reward: { matchXp: { kind: 'percentage', multiplier: 1 }, rune: { kind: 'projected', source: 'p2p_ranked' }, ranking: { kind: 'elo' } },
	};
}

function terminalState(localWon: boolean): GameState {
	return {
		players: {
			player: { battlefield: [{ instanceId: 'starter-instance', card: { id: 100, name: 'Starter', rarity: 'common', category: 'starter' } }], graveyard: [], hand: [], heroId: 'local-hero' },
			opponent: { battlefield: [], graveyard: [], hand: [], heroId: 'remote-hero' },
		},
		currentTurn: 'player', turnNumber: 9, gamePhase: 'game_over', winner: localWon ? 'player' : 'opponent', gameLog: [],
	} as unknown as GameState;
}

function resumeRecord(input: { readonly local: Profile; readonly remote: Profile; readonly side: 'player' | 'opponent'; readonly transcript: readonly Readonly<Record<string, unknown>>[]; readonly checkpointId: string }): P2PMatchResumeRecord {
	const config = getRagnarokNetworkConfig();
	const identity = { account: input.local.account, resetEpoch: config.resetEpoch, matchId: 'multiprofile-f1-match', matchSeed: 'multiprofile-f1-seed', roomId: 'multiprofile-room', myPeerId: input.local.peerId, seq: 1, turnNumber: 3, chessMoveCount: 1, ticketToken: null };
	return {
		version: 3, account: identity.account, resetEpoch: identity.resetEpoch, seq: identity.seq, turnNumber: identity.turnNumber,
		chessMoveCount: identity.chessMoveCount, matchId: identity.matchId, matchSeed: identity.matchSeed, roomId: identity.roomId,
		myPeerId: identity.myPeerId, remotePeerId: input.remote.peerId, matchTicket: null, isHost: input.side === 'player', myCanonicalSide: input.side,
		playerArmy: { king: { id: 'pk' }, queen: { id: 'pq' }, rook: { id: 'pr' }, bishop: { id: 'pb' }, knight: { id: 'pn' } },
		opponentArmy: { king: { id: 'ok' }, queen: { id: 'oq' }, rook: { id: 'or' }, bishop: { id: 'ob' }, knight: { id: 'on' } },
		deckCardIds: [100], deckCardIdsByPiece: { queen: [100], rook: [], bishop: [], knight: [] },
		gameState: { players: { player: {}, opponent: {} }, currentTurn: 'player', turnNumber: 3, gamePhase: 'playing', gameLog: [] },
		combat: { chessPieces: pieces, boardState: { moveCount: 1 }, pendingCombat: null, combatPhase: 'betting', pokerState: null, pokerCombatState: null, pokerIsActive: true, sharedDeck: null, sharedDeckCardIds: [100], battlefield: null, turnState: { transcript: input.transcript, checkpointId: input.checkpointId } },
		flow: { tag: 'poker_combat', handoff: {} }, savedAt: 1_000,
		seal: computeResumeSeal(identity),
	} as unknown as P2PMatchResumeRecord;
}

describe('F1 P2P multi-profile automated tracer', () => {
	it('runs handshake, chess, checkpoint, poker, reload and terminal local settlement across two isolated profiles', async () => {
		const alice = profile('alice', 'peer-alice');
		const bob = profile('bob', 'peer-bob');
		const aliceDeck = { heroClass: 'warrior', cardIds: [100], nftLevels: [] } as const;
		const bobDeck = { heroClass: 'mage', cardIds: [100], nftLevels: [] } as const;
		const claims = [{ authority: 'starter-entitlement' as const, cardId: 100 }];
		const aliceBound = bindDeckClaimsToAnnounce(aliceDeck, claims);
		const bobBound = bindDeckClaimsToAnnounce(bobDeck, claims);
		expect(aliceBound.status).toBe('bound');
		expect(bobBound.status).toBe('bound');
		if (aliceBound.status !== 'bound' || bobBound.status !== 'bound') return;
		expect(checkDeckVerificationIdentity('bob', bob.account, true)).toBe('approved');
		expect(checkDeckVerificationIdentity('alice', alice.account, true)).toBe('approved');
		expect(canInitDeckHandshake({ matchSeed: 'multiprofile-f1-seed', myCanonicalSide: 'player', localSnapshot: aliceBound.snapshot, remoteSnapshot: bobBound.snapshot, sharedNetwork: true, remoteVerification: 'approved' })).toBe(true);
		expect(canInitDeckHandshake({ matchSeed: 'multiprofile-f1-seed', myCanonicalSide: 'opponent', localSnapshot: bobBound.snapshot, remoteSnapshot: aliceBound.snapshot, sharedNetwork: true, remoteVerification: 'approved' })).toBe(true);

		const aliceBoard = applyChessAction(chessState(), { kind: 'move', pieceId: 'player-pawn', to: { row: 2, col: 2 } });
		const bobBoard = applyChessAction(chessState(), { kind: 'move', pieceId: 'player-pawn', to: { row: 2, col: 2 } });
		expect(aliceBoard.ok).toBe(true);
		expect(bobBoard.ok).toBe(true);
		if (!aliceBoard.ok || !bobBoard.ok) return;
		settleRemoteCommand(appliedGameCommand(initializeGame(), []), { onApplied: () => { bob.incomingChessSeq = 0; bob.transcript.push({ kind: 'chess_move', seq: 0 }); }, onUnapplied: () => undefined });
		expect(bob.incomingChessSeq).toBe(0);
		expect(bobBoard.state).toEqual(aliceBoard.state);
		const transcriptBeforeReject = bob.transcript.length;
		const rejected = applyChessAction(bobBoard.state, { kind: 'move', pieceId: 'missing-piece', to: { row: 3, col: 2 } });
		expect(rejected.ok).toBe(false);
		settleRemoteCommand(rejectedGameCommand(initializeGame(), rejected.ok ? 'unexpected' : rejected.reason), { onApplied: () => { bob.incomingChessSeq = 1; }, onUnapplied: () => undefined });
		expect(bob.incomingChessSeq).toBe(0);
		expect(bob.transcript).toHaveLength(transcriptBeforeReject);

		const root = Hash256Schema.parse('a'.repeat(64));
		const aliceCheckpoint = createPhaseCheckpointClient({ timeoutMs: 1_000 });
		const bobCheckpoint = createPhaseCheckpointClient({ timeoutMs: 1_000 });
		const aliceTransition = aliceCheckpoint.request({ matchId: 'multiprofile-f1-match', fromPhase: 'chess', toPhase: 'poker_combat', stateRoot: root, send: () => undefined });
		const bobTransition = bobCheckpoint.request({ matchId: 'multiprofile-f1-match', fromPhase: 'chess', toPhase: 'poker_combat', stateRoot: root, send: () => undefined });
		const proposal = aliceCheckpoint.getPendingProposal();
		expect(bobCheckpoint.getPendingProposal()).toEqual(proposal);
		if (!proposal) throw new Error('checkpoint proposal missing');
		const commit = buildPhaseCheckpointCommit({ roomId: 'multiprofile-room', proposal });
		expect(aliceCheckpoint.handleServerMessage(commit)).toBe(true);
		expect(bobCheckpoint.handleServerMessage(commit)).toBe(true);
		await expect(aliceTransition).resolves.toMatchObject({ status: 'committed' });
		await expect(bobTransition).resolves.toMatchObject({ status: 'committed' });

		const decisionId = 'poker-turn-1:bob:1000';
		const receivePoker = (result: { readonly status: 'applied' } | { readonly status: 'rejected'; readonly reason: 'illegal_action' }): void => {
			if (hasRemotePokerDecision(alice.pokerLedger, decisionId)) return;
			settleRemotePokerAction(result, {
				onApplied: () => {
					alice.pokerEngineApplications += 1;
					commitRemotePokerDecision(alice.pokerLedger, decisionId, 256);
					alice.transcript.push({ kind: 'poker_action', decisionId });
					alice.pokerRoundCloses += 1;
				},
				onRejected: () => undefined,
			});
		};
		receivePoker({ status: 'rejected', reason: 'illegal_action' });
		expect(hasRemotePokerDecision(alice.pokerLedger, decisionId)).toBe(false);
		expect(alice.transcript.filter(item => item.kind === 'poker_action')).toHaveLength(0);
		expect(alice.pokerRoundCloses).toBe(0);
		receivePoker({ status: 'applied' });
		receivePoker({ status: 'applied' });
		expect(alice.pokerEngineApplications).toBe(1);
		expect(alice.pokerRoundCloses).toBe(1);
		expect(alice.transcript.filter(item => item.kind === 'poker_action')).toHaveLength(1);

		const aliceResume = readP2PMatchResumeRecord(JSON.parse(JSON.stringify(resumeRecord({ local: alice, remote: bob, side: 'player', transcript: alice.transcript, checkpointId: commit.checkpointId }))), 1_001);
		const bobResume = readP2PMatchResumeRecord(JSON.parse(JSON.stringify(resumeRecord({ local: bob, remote: alice, side: 'opponent', transcript: bob.transcript, checkpointId: commit.checkpointId }))), 1_001);
		expect(aliceResume?.account).toBe('alice');
		expect(bobResume?.account).toBe('bob');
		expect(aliceResume).not.toBe(bobResume);
		expect((aliceResume?.combat.turnState as { checkpointId?: string }).checkpointId).toBe(commit.checkpointId);
		expect((aliceResume?.combat.turnState as { transcript?: unknown[] }).transcript).toEqual(alice.transcript);
		const reloadedAlice = profile(aliceResume?.account ?? '', aliceResume?.myPeerId ?? '');
		const reloadedBob = profile(bobResume?.account ?? '', bobResume?.myPeerId ?? '');
		reloadedAlice.transcript.push(...((aliceResume?.combat.turnState as { transcript?: Array<Readonly<Record<string, unknown>>> }).transcript ?? []));
		reloadedBob.transcript.push(...((bobResume?.combat.turnState as { transcript?: Array<Readonly<Record<string, unknown>>> }).transcript ?? []));
		expect(reloadedAlice.transcript).toEqual(alice.transcript);
		expect(reloadedBob.transcript).toEqual(bob.transcript);

		const terminalRoot = Hash256Schema.parse('b'.repeat(64));
		const reconnectedAliceCheckpoint = createPhaseCheckpointClient({ timeoutMs: 1_000 });
		const reconnectedBobCheckpoint = createPhaseCheckpointClient({ timeoutMs: 1_000 });
		const aliceTerminal = reconnectedAliceCheckpoint.request({ matchId: 'multiprofile-f1-match', fromPhase: 'poker_combat', toPhase: 'game_over', stateRoot: terminalRoot, send: () => undefined });
		const bobTerminal = reconnectedBobCheckpoint.request({ matchId: 'multiprofile-f1-match', fromPhase: 'poker_combat', toPhase: 'game_over', stateRoot: terminalRoot, send: () => undefined });
		const terminalProposal = reconnectedAliceCheckpoint.getPendingProposal();
		expect(reconnectedBobCheckpoint.getPendingProposal()).toEqual(terminalProposal);
		if (!terminalProposal) throw new Error('terminal checkpoint proposal missing');
		const terminalCommit = buildPhaseCheckpointCommit({ roomId: 'multiprofile-room', proposal: terminalProposal });
		reconnectedAliceCheckpoint.handleServerMessage(terminalCommit);
		reconnectedBobCheckpoint.handleServerMessage(terminalCommit);
		await expect(aliceTerminal).resolves.toMatchObject({ status: 'committed' });
		await expect(bobTerminal).resolves.toMatchObject({ status: 'committed' });

		const config = getRagnarokNetworkConfig();
		const evidence = buildRagnarokRuntimeEvidence(config);
		expect(evidence.phasePolicy.localSettlement).toBe(true);
		const runExternalSettlement = vi.fn(async () => undefined);
		const settle = async (local: Profile, remote: Profile, localWon: boolean, side: 'first-mover' | 'second-mover') => routeP2PGameEnded({
			gameState: terminalState(localWon), activeMatch: matchContext(local, remote, side), runtimeEvidence: evidence,
			runLocalSettlement: () => settleLocalP2PGameOver(matchContext(local, remote, side), terminalState(localWon), {
				runtimeConfig: config, runtimeEvidence: evidence, getLocalAccount: () => local.account,
				getEloRating: async account => ({ account, elo: 1000, wins: 0, losses: 0, lastMatchBlock: 0 }),
				getTokenBalance: async () => ({ RUNE: 0 }), getLatestCardProgressionByOwner: async () => [],
				getTranscriptRoot: async () => terminalCommit.stateRoot, clearTranscript: () => undefined,
				settlementStore: settlementStore(local), now: () => 2_000,
			}), runExternalSettlement,
		});
		const aliceResult = await settle(reloadedAlice, reloadedBob, true, 'first-mover');
		const bobResult = await settle(reloadedBob, reloadedAlice, false, 'second-mover');
		expect(aliceResult.route).toBe('local');
		expect(bobResult.route).toBe('local');
		expect(reloadedAlice.settlementRecords.size).toBe(1);
		expect(reloadedBob.settlementRecords.size).toBe(1);
		const aliceSettlement = [...reloadedAlice.settlementRecords.values()][0];
		const bobSettlement = [...reloadedBob.settlementRecords.values()][0];
		expect(aliceSettlement.result.resultHash).toBe(bobSettlement.result.resultHash);
		expect(aliceSettlement.runeEntries).toHaveLength(1);
		expect(aliceSettlement.runeEntries[0]).toMatchObject({ account: 'alice', direction: 'credit', sourceType: 'p2p_ranked' });
		expect(aliceSettlement.elo).toHaveLength(2);
		expect(aliceSettlement.elo.map(item => item.seasonScoreAfter).every(Number.isFinite)).toBe(true);
		expect(aliceSettlement.cardXp).toHaveLength(1);
		expect(runExternalSettlement).not.toHaveBeenCalled();
		const localEvidence = JSON.stringify([aliceSettlement, bobSettlement]);
		expect(localEvidence).not.toMatch(/custom_json|"action"|match_anchor|match_result|Keychain|wallet/);
	});
});
