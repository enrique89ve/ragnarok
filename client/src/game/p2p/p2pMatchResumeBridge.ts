import { getAuthenticatedHiveUsername } from '../../data/HiveSessionIdentity';
import { useGameFlowStore } from '../stores/gameFlowStore';
import { useGameStore } from '../stores/gameStore';
import { usePeerStore } from '../stores/peerStore';
import { useUnifiedCombatStore } from '../stores/unifiedCombatStore';
import { createSeededIdGen, createSeededRng } from '../utils/seededRng';
import {
	selectDeckCardIds,
	selectDeckCardIdsByPiece,
	useWarbandStore,
} from '../../lib/stores/useWarbandStore';
import type { ArmySelection, ChessBoardState } from '../types/ChessTypes';
import type { UnifiedCombatStore } from '../stores/unifiedCombatStore';
import type { P2PCombatResumeSnapshot, P2PMatchResumeRecord } from './p2pMatchResume';
import {
	computeResumeSeal,
	getAcceptedResumeWatermark,
	isResumeAheadOrEqual,
	isSameResumeMatch,
	markResumeWatermarkAccepted,
	nextResumeSeq,
	readP2PMatchResumeRecord,
	resumeWatermarkOf,
	P2P_MATCH_RESUME_VERSION,
} from './p2pMatchResume';
import { getRagnarokNetworkConfig } from '../config/networkConfig';
import { planResumePokerBinding, reboundResumePendingCombat } from './p2pResumePokerHandoff';

function resumeAccount(): string {
	return getAuthenticatedHiveUsername() ?? 'local';
}

function collectCombatSnapshot(): P2PCombatResumeSnapshot {
	const combat = useUnifiedCombatStore.getState();
	return {
		chessPieces: combat.chessPieces,
		boardState: combat.boardState,
		pendingCombat: combat.pendingCombat,
		combatPhase: combat.combatPhase,
		pokerState: combat.pokerState,
		pokerCombatState: combat.pokerCombatState,
		pokerIsActive: combat.pokerIsActive,
		sharedDeck: combat.sharedDeck,
		sharedDeckCardIds: [...combat.sharedDeckCardIds],
		battlefield: combat.battlefield,
		turnState: combat.turnState,
	};
}

function isCollectIdentityBound(
	peer: ReturnType<typeof usePeerStore.getState>,
	roomId: string,
): boolean {
	if (!peer.myPeerId) return false;
	if (!peer.matchTicket) return true;
	return peer.matchTicket.roomId === roomId && peer.matchTicket.peerId === peer.myPeerId;
}

function isCollectRewind(input: {
	readonly matchId: string;
	readonly matchSeed: string;
	readonly roomId: string;
	readonly resetEpoch: string;
	readonly turnNumber: number;
	readonly chessMoveCount: number;
}): boolean {
	const accepted = getAcceptedResumeWatermark();
	if (!accepted || !isSameResumeMatch(accepted, input)) return false;
	if (input.turnNumber !== accepted.turnNumber) return input.turnNumber < accepted.turnNumber;
	return input.chessMoveCount < accepted.chessMoveCount;
}

function canCollectResume(
	peer: ReturnType<typeof usePeerStore.getState>,
	game: ReturnType<typeof useGameStore.getState>,
	flowTag: string | undefined,
): boolean {
	if (!peer.p2pInitApplied || !peer.myPeerId || !peer.opponentArmy) return false;
	if (!game.matchId || !game.matchSeed || !game.gameState || !game.myCanonicalSide) return false;
	if (game.gameState.gamePhase === 'game_over' || game.gameState.gamePhase === 'ended') return false;
	if (flowTag === 'game_over') return false;
	return true;
}

function buildCollectedResume(input: {
	readonly peer: ReturnType<typeof usePeerStore.getState>;
	readonly game: ReturnType<typeof useGameStore.getState>;
	readonly warband: ReturnType<typeof useWarbandStore.getState>;
	readonly flow: ReturnType<typeof useGameFlowStore.getState>['current'];
	readonly roomId: string;
	readonly resetEpoch: string;
	readonly combat: P2PCombatResumeSnapshot;
	readonly chessMoveCount: number;
	readonly now: number;
}): P2PMatchResumeRecord | null {
	const { peer, game, warband, flow, roomId, resetEpoch, combat, chessMoveCount, now } = input;
	if (!game.matchId || !game.matchSeed || !game.gameState || !peer.myPeerId || !game.myCanonicalSide) {
		return null;
	}
	if (warband.warband.status !== 'ready' || !peer.opponentArmy) return null;
	const seq = nextResumeSeq({
		matchId: game.matchId,
		matchSeed: game.matchSeed,
		roomId,
		resetEpoch,
	});
	const account = resumeAccount();
	return {
		version: P2P_MATCH_RESUME_VERSION,
		account,
		resetEpoch,
		seq,
		turnNumber: game.gameState.turnNumber,
		chessMoveCount,
		matchId: game.matchId,
		matchSeed: game.matchSeed,
		roomId,
		myPeerId: peer.myPeerId,
		remotePeerId: peer.remotePeerId,
		matchTicket: peer.matchTicket,
		isHost: peer.isHost,
		myCanonicalSide: game.myCanonicalSide,
		playerArmy: warband.warband.army,
		opponentArmy: peer.opponentArmy,
		deckCardIds: [...selectDeckCardIds(warband)],
		deckCardIdsByPiece: selectDeckCardIdsByPiece(warband),
		gameState: game.gameState,
		combat,
		flow,
		savedAt: now,
		seal: computeResumeSeal({
			account,
			resetEpoch,
			matchId: game.matchId,
			matchSeed: game.matchSeed,
			roomId,
			myPeerId: peer.myPeerId,
			seq,
			turnNumber: game.gameState.turnNumber,
			chessMoveCount,
			ticketToken: peer.matchTicket?.token ?? null,
		}),
	};
}

export function collectP2PMatchResume(now = Date.now()): P2PMatchResumeRecord | null {
	const peer = usePeerStore.getState();
	const game = useGameStore.getState();
	const warband = useWarbandStore.getState();
	const flow = useGameFlowStore.getState().current;

	const roomId = peer.matchTicket?.roomId ?? peer.lastRoomId;
	if (!canCollectResume(peer, game, flow?.tag) || !roomId || warband.warband.status !== 'ready') {
		return null;
	}
	if (!game.matchId || !game.matchSeed || !game.gameState || !peer.myPeerId) return null;
	if (!isCollectIdentityBound(peer, roomId)) return null;

	const combat = collectCombatSnapshot();
	const chessMoveCount = readChessMoveCount(combat.boardState);
	const resetEpoch = getRagnarokNetworkConfig().resetEpoch;
	if (isCollectRewind({
		matchId: game.matchId,
		matchSeed: game.matchSeed,
		roomId,
		resetEpoch,
		turnNumber: game.gameState.turnNumber,
		chessMoveCount,
	})) {
		return null;
	}

	return buildCollectedResume({
		peer,
		game,
		warband,
		flow,
		roomId,
		resetEpoch,
		combat,
		chessMoveCount,
		now,
	});
}

function readChessMoveCount(boardState: unknown): number {
	if (typeof boardState !== 'object' || boardState === null) return 0;
	const moveCount = (boardState as { moveCount?: unknown }).moveCount;
	return typeof moveCount === 'number' && Number.isInteger(moveCount) && moveCount >= 0
		? moveCount
		: 0;
}

function resumeContainsBattleCommitment(record: P2PMatchResumeRecord): boolean {
	if (record.chessMoveCount > 0) return true;
	if (record.combat.pendingCombat !== null || record.combat.pokerIsActive) return true;
	if (record.flow?.tag === 'poker_combat') return true;
	return typeof record.combat.boardState === 'object'
		&& record.combat.boardState !== null
		&& (record.combat.boardState as { gameStatus?: unknown }).gameStatus === 'combat';
}

function isBoardState(value: unknown): value is ChessBoardState {
	return typeof value === 'object' && value !== null && Array.isArray((value as ChessBoardState).pieces);
}

function applyCombatSnapshot(
	combat: P2PCombatResumeSnapshot,
	matchSeed: string,
	playerArmy: ArmySelection,
	opponentArmy: ArmySelection,
	slotsSwapped: boolean | null,
): void {
	const next: Partial<UnifiedCombatStore> = {
		pokerIsActive: combat.pokerIsActive,
		sharedDeckCardIds: [...combat.sharedDeckCardIds],
		playerArmy,
		opponentArmy,
		_chessRng: createSeededRng(matchSeed),
		_chessIdGen: createSeededIdGen(matchSeed, 'chess-pieces'),
	};
	if (slotsSwapped !== null) next.pokerSlotsSwapped = slotsSwapped;
	if (Array.isArray(combat.chessPieces)) next.chessPieces = combat.chessPieces as UnifiedCombatStore['chessPieces'];
	if (isBoardState(combat.boardState)) next.boardState = combat.boardState;
	next.pendingCombat = combat.pendingCombat as UnifiedCombatStore['pendingCombat'];
	next.combatPhase = combat.combatPhase as UnifiedCombatStore['combatPhase'];
	next.pokerState = combat.pokerState as UnifiedCombatStore['pokerState'];
	next.pokerCombatState = combat.pokerCombatState as UnifiedCombatStore['pokerCombatState'];
	next.sharedDeck = combat.sharedDeck as UnifiedCombatStore['sharedDeck'];
	next.battlefield = combat.battlefield as UnifiedCombatStore['battlefield'];
	next.turnState = combat.turnState as UnifiedCombatStore['turnState'];
	useUnifiedCombatStore.setState(next);
}

function readLiveResumeWatermark(): ReturnType<typeof resumeWatermarkOf> | null {
	const game = useGameStore.getState();
	const peer = usePeerStore.getState();
	const combat = useUnifiedCombatStore.getState();
	if (!peer.p2pInitApplied || !game.matchId || !game.matchSeed || !game.gameState) return null;
	const roomId = peer.matchTicket?.roomId ?? peer.lastRoomId;
	if (!roomId) return null;
	return {
		matchId: game.matchId,
		matchSeed: game.matchSeed,
		roomId,
		resetEpoch: getRagnarokNetworkConfig().resetEpoch,
		seq: getAcceptedResumeWatermark()?.seq ?? 0,
		turnNumber: game.gameState.turnNumber,
		chessMoveCount: readChessMoveCount(combat.boardState),
		savedAt: Date.now(),
	};
}

export function applyP2PMatchResume(record: P2PMatchResumeRecord): boolean {
	const parsed = readP2PMatchResumeRecord(record);
	if (!parsed) return false;
	const live = readLiveResumeWatermark();
	if (live && isSameResumeMatch(resumeWatermarkOf(parsed), live)
		&& !isResumeAheadOrEqual(resumeWatermarkOf(parsed), live)) {
		return false;
	}

	const binding = planResumePokerBinding(parsed);
	if (binding.kind === 'reject') return false;
	const resumeFlow = binding.flow;
	const slotsSwapped = binding.kind === 'bound' ? binding.plan.handoff.slotsSwapped : null;

	useWarbandStore.getState().setWarband(
		parsed.playerArmy,
		parsed.deckCardIds,
		parsed.deckCardIdsByPiece,
	);

	usePeerStore.setState({
		myPeerId: parsed.myPeerId,
		remotePeerId: parsed.remotePeerId,
		matchTicket: parsed.matchTicket,
		isHost: parsed.isHost,
		opponentArmy: parsed.opponentArmy,
		p2pInitApplied: true,
		hardReloadResume: true,
		lastRoomId: parsed.roomId,
		connectionState: 'reconnecting',
		disconnectSide: 'local',
		error: null,
	});
	if (parsed.remotePeerId) {
		usePeerStore.getState().initializeBattleLifecycle({
			matchId: parsed.matchId,
			playerA: parsed.myPeerId,
			playerB: parsed.remotePeerId,
		});
		if (resumeContainsBattleCommitment(parsed)) {
			usePeerStore.getState().restoreBattleCommitment(Math.max(1, parsed.chessMoveCount));
		}
	}

	useGameStore.setState({
		gameState: parsed.gameState,
		matchSeed: parsed.matchSeed,
		matchId: parsed.matchId,
		myCanonicalSide: parsed.myCanonicalSide,
	});
	useGameStore.getState().bindCardsRng(parsed.matchSeed);

	applyCombatSnapshot(
		parsed.combat,
		parsed.matchSeed,
		parsed.playerArmy,
		parsed.opponentArmy,
		slotsSwapped,
	);
	useUnifiedCombatStore.getState().bindP2PBoard({
		matchId: parsed.matchId,
		matchSeed: parsed.matchSeed,
	});
	if (binding.kind === 'bound') {
		const pendingCombat = reboundResumePendingCombat(
			parsed.combat.pendingCombat,
			binding.plan.handoff.attacker,
			binding.plan.handoff.defender,
		);
		if (pendingCombat) useUnifiedCombatStore.setState({ pendingCombat });
	}

	if (resumeFlow) {
		useGameFlowStore.getState().hydrate(resumeFlow);
	} else {
		useGameFlowStore.getState().start({ kind: 'chess' });
	}
	markResumeWatermarkAccepted(resumeWatermarkOf(parsed));
	return true;
}
