import { useEffect, useRef, useCallback } from 'react';
import { GameEventBus } from '../../../../../core/events/GameEventBus';
import { usePeerStore } from '../../../../stores/peerStore';
import { useMatchStore } from '../../../store';
import { deriveAuthority } from '../../../derived';
import { applyEndTurnPokerFold, useGameStore } from '../../../../stores/gameStore';
import { useUnifiedCombatStore } from '../../../../stores/unifiedCombatStore';
import { debug } from '../../../../config/debugConfig';
import { getRagnarokNetworkConfig } from '../../../../config/networkConfig';
import { verifyDeckOwnership } from '../../../../../data/blockchain/deckVerification';
import { canonicalStringify, sha256Hash } from '../../../../../data/blockchain/hashUtils';
import { computeMatchResultCommitmentHash } from '../../../../../data/blockchain/matchResultPackager';
import { verifyDeckClaims as verifyDeckClaimsOnServer } from '../../../../../data/chainAPI';
import { getNFTBridge } from '../../../../nft';
import type { PackagedMatchResult } from '../../../../../data/blockchain/types';
import type { DeckCardClaim } from '../../../../../../../shared/protocol-core/deckVerification';
import { buildClientDeckClaimsFromCardIds } from '../../../../protocol/playerCollectionAdapter';
import { startNewTranscript, clearTranscript, recordSessionEvent, exportSessionLog, recordMove, getActiveTranscript } from '../../../../../data/blockchain/transcriptBuilder';
import { localPlayerId, remotePlayerId } from '../../../../../data/blockchain/playerIdentity';
import { getWasmHash, loadWasmEngine } from '../../../../engine/wasmLoader';
import { computeStateHash } from '../../../../engine/engineBridge';
import { flipGameState, computeCardsPrevStateHash } from '../../../../engine/wireHash';
import { computeChessPrevStateHash } from '../../../../engine/chessHash';
import { computeInitialMatchRoot, computeInitialMatchRootDebug, computePokerCombatStateHash } from '../../../../p2p/phaseBoundaryRoot';
import { isSharedNetworkEnvironment } from '../../../../config/featureFlags';
import { findExistingMatchResult, type SlashEvidenceParams } from '../../../../../data/blockchain/slashEvidence';
import { GAME_COMMAND_TYPES } from '../../../../core/commands';
import type { ApplyGameCommandResult } from '../../../../core/commands';
import type { WireGameCommand } from '../../../../hooks/p2pEnvelope';
import { useWarbandStore, selectArmy, selectDeckCardIds, selectDeckCardIdsByPiece } from '../../../../../lib/stores/useWarbandStore';
import { HERO_DECK_PIECE_TYPES } from '../../../../deck/heroDeckRules';
import { deriveCanonicalSide, isChessAttackInstantKill, tryParseChessCommandEnvelope, type ChessCommandEnvelope } from '../../../../../../../shared/p2p-wire/chess';
import { getKingAbilityConfig, getMineShapeTiles, isValidMinePlacement, requiresDirectionSelection } from '../../../../utils/chess/kingAbilityUtils';
import { seededRngFromString } from '../../../../utils/seededRng';
import {
	confirmChessTransitionReceipt,
	pausePendingChessReceiptTimeout,
	resetChessWireSender,
	retryPendingChessTransition,
	setChessSendObserver,
	setChessGameplaySigner,
} from '../../../../p2p/chessWireSender';
import { getP2PProcessFlags, getP2PTransportRole } from '../../../../p2p/p2pPerspective';
import { ensureCanonicalP2PChessBoard, isP2PBoardBoundTo } from '../../../../p2p/p2pChessBoardBinding';
import {
	SETUP_STATE_MISMATCH_REASON,
	shouldCompareHashBeacon,
	shouldDeferSlashForHashMismatch,
	shouldEmitHashBeacon,
} from '../../../../p2p/p2pIntegrityPolicy';
import {
	snapshotLocalCardsDeck,
	savedDecksStorageKey,
	type CardsDeckAnnounce,
} from '../../../../p2p/cardsDeckHandshake';
import {
	bindDeckClaimsToAnnounce,
	canInitDeckHandshake,
	checkDeckVerificationIdentity,
	createDeckHandshakeSnapshot,
	isCurrentDeckVerificationGeneration,
	type DeckHandshakeSnapshot,
} from '../../../../p2p/deckHandshakeAuthority';
import useGame from '../../../../../lib/stores/useGame';
import type { HiveCardAsset } from '../../../../../data/schemas/HiveTypes';
import { planCardsLocalAction, shouldCommitLocalCardsAction } from './cardsWirePlan';
import {
	commitNextP2PCanonicalAction,
	startP2PBattleFromAcceptedChessAction,
} from '../../../../p2p/canonicalActionOrder';
import type { P2PMessage } from '../../../../p2p/messages';
import { parseWireMessage } from '../../../../p2p/messageSchemas';
import { CombatAction, CombatPhase } from '../../../../types/PokerCombatTypes';
import { encodePokerAction, isPokerActionCompactConsistent, type CompactPokerActionName } from '../../../../../../../shared/p2p-wire/combat';
import {
	getCanonicalPokerActionNowMs,
	isTimedPokerDecisionPhase,
	UNIVERSAL_POKER_TURN_CLOCK_POLICY,
} from '../../../../../../../shared/p2p-wire/pokerTurnClock';
import { generateSessionKey, type SessionKey } from '../../../../protocol/sessionKey';
import { CHALLENGE_STALE_THRESHOLD_MS, type ServerSignedChallenge } from '@shared/p2pAvailability';
import {
	emptyTranscript,
	appendSelfAction,
	verifyAndAppendRemote,
	type Transcript,
	type Broadcaster,
} from '../../../../protocol/transcript';
import { buildSessionAuthorizeMessage, signSessionAuthorize } from '../../../../../data/HiveDataLayer';
import { verifyInboundRenewal } from '../../../../protocol/sessionRenewal';
import { verifyHiveSignature } from '../../../../../data/blockchain/hiveSignatureVerifier';
import {
	open as openActionLog,
	deriveEncKey as deriveActionLogEncKey,
	appendLeaf as appendActionLogLeaf,
	type StoredLeaf,
} from '../../../../protocol/actionLog';
import { verifyResultProposalTranscriptRoot } from './resultProposalGuard';
import { buildRagnarokRuntimeEvidence } from '@shared/runtimeConfig';
import { resolveWalletInvocationAuthMode } from '@shared/protocolPhase';
import { getP2PPokerCombatAdapter } from './pokerP2PCombatAdapter';
import { settleRemotePokerAction } from './pokerP2PActionCommit';
import { commitRemotePokerDecision, hasRemotePokerDecision } from './remotePokerDecisionLedger';
import { stripRelayMatchTicketFromSessionChallenge } from '../../../../p2p/sessionAuthChallenge';
import { decodeWireGameState, encodeGameStateForWire } from '../../../../p2p/stateFrameCodec';
import { getCardRegistryHash } from '../../../../data/effects/registryHash';
import {
	CHESS_INTEGRITY_PROTOCOL_VERSION,
	CHESS_INTEGRITY_SCOPE,
	computeTransitionIntentHash,
	type TransitionReceiptMessage,
} from '@shared/p2p-wire/integrity';
import {
	buildChessIntegrityCheckpoint,
	captureChessIntegrityCheckpoint,
} from '../../../../p2p/chessIntegrityCheckpoint';
import { chessIntegrityMonitor } from '../../../../p2p/chessIntegrityMonitor';
import {
	phaseCheckpointClient,
type PhaseCheckpointRequestResult,
	type PhaseCheckpointProposalSender,
} from '../../../../p2p/phaseCheckpointClient';
import { parseHash256, type Hash256 } from '@shared/p2p-wire/integrity';
import { isRetryablePhaseCheckpointDispute, type PhaseCheckpointPhase } from '@shared/p2p-wire/phaseCheckpoint';
import { isRetryablePokerTurnNotaryDispute } from '@shared/p2p-wire/pokerTimeNotary';
import type {
	PokerActionTimeGateAck,
	PokerTurnClockProposal,
} from '@shared/p2p-wire/pokerTimeNotary';
import { settleRemoteCommand } from './remoteCommandSettlement';
import { getCachedMatchAcceptance, getCachedMatchmakingDelegation } from '../../../../p2p/matchAcceptance';
import { buildMatchAcceptanceMessage, buildMatchAcceptanceV2Message, readMatchAcceptanceProof } from '../../../../../../../shared/p2pMatchAcceptance';
import { isCurrentMatchmakingDelegation, readMatchmakingDelegationProof, buildMatchmakingDelegationMessage } from '@shared/p2pMatchDelegation';
import { verifyEnvelope } from '../../../../protocol/sessionKey';
import { signGameplayEnvelope, verifyGameplayEnvelope } from '../../../../protocol/signedGameplayEnvelope';
import { useMatchmakingStore } from '../../../../stores/matchmakingStore';
import {
	buildBattleReadyLoadoutCommitmentPayload,
	compareBattleReadyProofs,
	describeBattleReadyDebugMismatch,
	type BattleReadyDebug,
	type P2PBattleReadyProof,
} from '../../../../p2p/battleReady';
import {
	INITIAL_TRANSPORT_EPOCH,
	P2P_CONTROL_PROTOCOL_VERSION,
	type P2PControlClientMessage,
	type P2PControlServerMessage,
} from '@shared/p2p-wire/control';
import {
	buildActionAppliedMessage,
	P2P_ACTION_APPLIED_WAIT_TIMEOUT_MS,
	type ActionAppliedMessage,
} from '@shared/p2p-wire/delivery';
import { enqueueWireMessage, MAX_INBOUND_WIRE_QUEUE_SIZE } from './wireMessageQueue';
import { resolveP2PResumeAuthPolicy } from '../../../../p2p/p2pResumeAuthPolicy';
import { replayTranscriptLeaves } from './transcriptReplay';
import {
	createTranscriptOrderGate,
	requiresSignedActionEnvelope,
	type TranscriptOrderGate,
} from './transcriptOrderGate';

function buildPokerGameplayCommand(input: {
	readonly playerId: string;
	readonly action: string;
	readonly origin: string;
	readonly hpCommitment?: number;
	readonly compact?: unknown;
	readonly turnId: string;
	readonly decisionId: string;
	readonly sentAtMs: number;
}): Record<string, unknown> {
	return {
		playerId: input.playerId,
		action: input.action,
		origin: input.origin,
		...(input.hpCommitment === undefined ? {} : { hpCommitment: input.hpCommitment }),
		...(input.compact === undefined ? {} : { compact: input.compact }),
		turnId: input.turnId,
		decisionId: input.decisionId,
		sentAtMs: input.sentAtMs,
	};
}

export type { GameCommandEnvelope, WireGameCommand } from '../../../../hooks/p2pEnvelope';
export type { P2PMessage } from '../../../../p2p/messages';

declare const __BUILD_HASH__: string;

const P2P_INTEGRITY_PAUSED_MESSAGE = 'Game integrity diverged. Actions are paused until the match is left.';
const PRE_BATTLE_CARDS_DELIVERY_ATTEMPTS = 3;
const PRE_BATTLE_HASH_RETRY_ATTEMPTS = 3;
const PRE_BATTLE_HASH_RETRY_DELAY_MS = 150;

type PendingPokerActionGate = {
	readonly matchId: string;
	readonly turnId: string;
	readonly seq: number;
	readonly controlMessage: P2PControlClientMessage;
	readonly gameplayMessage: Extract<P2PMessage, { type: 'poker_action' }>;
	readonly resolve: (allowed: boolean) => void;
	timeout: ReturnType<typeof setTimeout> | null;
	retrying: boolean;
	gateAllowed: boolean | null;
	applied: boolean;
};

type PendingCardsActionGate = {
	readonly matchId: string;
	readonly commandId: string;
	readonly seq: number;
	readonly gameplayMessage: Extract<P2PMessage, { type: 'game_command' }>;
	readonly resolve: (receipt: ActionAppliedMessage | null) => void;
	timeout: ReturnType<typeof setTimeout> | null;
	retrying: boolean;
	attempts: number;
};

function readConnectionTransportEpoch(connection: { readonly transportEpoch?: number } | null): number {
	return typeof connection?.transportEpoch === 'number' && Number.isInteger(connection.transportEpoch) && connection.transportEpoch >= 1
		? connection.transportEpoch
		: INITIAL_TRANSPORT_EPOCH;
}

function isGameplayWireMessage(data: P2PMessage): boolean {
	return data.type === 'game_command'
		|| data.type === 'chess_command'
		|| data.type === 'poker_action'
		// The action envelope is the signed transcript/audit representation of
		// the same gameplay command. It must freeze with the reducer command;
		// otherwise a quarantined match could still append leaves and change its
		// evidence root after gameplay has been stopped.
		|| data.type === 'action_envelope';
}

/**
 * A hash mismatch is not a recoverable UI warning: continuing would let the
 * two browsers produce different battle results. Keep the quarantine in the
 * peer store so every sender, receiver, reconnect, and status surface shares
 * the same fail-closed decision.
 */
function quarantineP2PSession(reason: string): void {
	const peer = usePeerStore.getState();
	if (peer.p2pIntegrityError !== null) return;
	if (peer.battleLifecycle?.phase !== 'battle') {
		if (!peer.battleLifecycle || !peer.myPeerId) {
			const detail = `Match setup could not be verified. (${reason})`;
			peer.setP2pBattleReady({ error: detail });
			recordSessionEvent('p2p_pre_battle_failed', { reason, detail });
			return;
		}
		const eventId = `pre-battle-cancel:${peer.battleLifecycle.matchId}:${reason}`;
		const lifecycle = peer.requestP2PLeave(peer.myPeerId, eventId);
		recordSessionEvent('p2p_pre_battle_cancelled', { reason, eventId });
		if (lifecycle?.phase === 'cancelled') {
			GameEventBus.emitNotification({
				level: 'warning',
				message: 'Match setup could not be synchronized. The match was canceled with no result.',
				duration: 8_000,
			});
		}
		return;
	}
	const detail = `${P2P_INTEGRITY_PAUSED_MESSAGE} (${reason})`;
	peer.setP2pIntegrityError(detail);
	recordSessionEvent('p2p_integrity_quarantined', { reason, detail });
	GameEventBus.emitNotification({
		level: 'error',
		message: P2P_INTEGRITY_PAUSED_MESSAGE,
		duration: 10_000,
	});
}

function waitForPreBattleHashRetry(): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, PRE_BATTLE_HASH_RETRY_DELAY_MS));
}

function isP2PSessionQuarantined(): boolean {
	return usePeerStore.getState().p2pIntegrityError !== null;
}

function generateSalt(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

// `moveCounter` was lifted into transcriptBuilder.ts (singleton-scoped) so
// chessWireSender can share the same monotonic counter for chess moves.
let outgoingSeqCounter = 0;
// Chess wire is symmetric P2P (Plan B): both peers send and apply
// chess_command envelopes independently — no host-only routing. The
// outgoing seq counter for chess lives in the dedicated `chessWireSender`
// module so the chess UI can emit without dragging in this hook's
// internals; it's reset when the session is discarded via
// `resetChessWireSender()` below, while short reconnects retain the pending
// envelope for idempotent replay.

// `recordMove` + `moveCounter` previously lived here as module-locals. Both
// were lifted into `transcriptBuilder.ts` so the chess send path (`chessWireSender`,
// not a hook) can record without dragging in this file's React context. The
// counter must be a singleton — splitting it would break monotonic moveNumber
// across the cards / chess / poker entry points.

function p2pEngineLoadNotice(err: unknown): string {
	const detail = err instanceof Error ? err.message : 'unknown engine error';
	return `Match engine failed to load. This P2P match cannot continue. ${detail}`;
}

function deferSlashEvidence(params: SlashEvidenceParams): void {
	recordSessionEvent('slash_evidence_deferred', { ...params });
	debug.warn(`[wireSync] Slash evidence deferred (${params.reason}) — hidden Keychain prompts are disabled`);
	GameEventBus.emitNotification({
		level: 'warning',
		message: 'Evidence captured. Submit evidence needs a visible wallet action.',
		duration: 8000,
	});
}

const RESULT_SIGN_TIMEOUT_MS = 30_000;

function shouldRequestP2PSessionAuthorizePrompt(): boolean {
	const runtime = buildRagnarokRuntimeEvidence(getRagnarokNetworkConfig());
	return resolveWalletInvocationAuthMode(runtime.phasePolicy) === 'hive-body-auth';
}

// Deck ownership verification (nft-custody claims) requires authoritative NFT
// ownership. That authority only exists outside local-settlement phases: F1
// (alfa-testnet, local-gameplay-v1) simulates the economy locally, so genesis
// cards are not on-chain and must not be rejected by an nft-custody check.
// Gate by phase, not by stage — `isSharedNetworkEnvironment` is true for any
// testnet/mainnet and would otherwise run nft-custody enforcement in F1.
function requiresDeckOwnershipVerification(): boolean {
	const runtime = buildRagnarokRuntimeEvidence(getRagnarokNetworkConfig());
	return !runtime.phasePolicy.localSettlement;
}

function isFreshMatchChallenge(challenge: ServerSignedChallenge): boolean {
	const now = Date.now();
	const maxAge = CHALLENGE_STALE_THRESHOLD_MS * 2;

	if (challenge.timestamp > challenge.expiresAt) {
		return false;
	}
	if (challenge.expiresAt <= now) {
		return false;
	}
	if ((challenge.expiresAt - challenge.timestamp) > maxAge) {
		return false;
	}
	return true;
}

function challengesMatch(a: ServerSignedChallenge, b: ServerSignedChallenge): boolean {
	return a.from === b.from
		&& a.to === b.to
		&& a.peerId === b.peerId
		&& a.timestamp === b.timestamp
		&& a.expiresAt === b.expiresAt
		&& a.nonce === b.nonce
		&& a.sigAlg === b.sigAlg
		&& a.serverSig === b.serverSig;
}

function readCombatAction(value: string): CombatAction | null {
	switch (value) {
		case CombatAction.ATTACK:
		case CombatAction.COUNTER_ATTACK:
		case CombatAction.ENGAGE:
		case CombatAction.BRACE:
		case CombatAction.DEFEND:
			return value;
		default:
			return null;
	}
}

function getSessionAuthChallenges(): readonly ServerSignedChallenge[] {
	const { opponentMatchChallenge, matchChallenge } = usePeerStore.getState();
	const candidates: ServerSignedChallenge[] = [];
	if (matchChallenge) {
		candidates.push(matchChallenge);
	}
	if (opponentMatchChallenge && !candidates.some((candidate) => challengesMatch(candidate, opponentMatchChallenge))) {
		candidates.push(opponentMatchChallenge);
	}
	return candidates;
}

function findMatchingSessionAuthChallenge(
	challenge: ServerSignedChallenge,
): ServerSignedChallenge | null {
	const expected = getSessionAuthChallenges().find((candidate) => challengesMatch(candidate, challenge));
	return expected ?? null;
}

function readHiveCollectionForHandshake(): HiveCardAsset[] | undefined {
	try {
		const hiveStore = (globalThis as Record<string, unknown>).__ragnarokHiveDataStore as
			{ getState: () => { cardCollection?: HiveCardAsset[] } } | undefined;
		return hiveStore?.getState?.()?.cardCollection;
	} catch {
		return undefined;
	}
}

export function useWireSync() {
	const connection = usePeerStore(state => state.connection);
	const connectionState = usePeerStore(state => state.connectionState);
	// Two semantic views on the same WS-resolved bit:
	//   - `isWsHost` — WS-resolved host hint. Used by the seed_reveal handshake to
	//     derive the canonical chess side via `deriveCanonicalSide(matchSeed,
	//     isWsHost)`. This is the legitimate use of the WS hint.
	//   - `processFlags` — pure process gates derived from transport role and
	//     current authority mode. UI code should consume viewer/canonical
	//     perspective instead of branching on these flags.
	const isWsHost = usePeerStore(state => state.isHost);
	const myCanonicalSide = useGameStore(state => state.myCanonicalSide);
	const transportRole = getP2PTransportRole(isWsHost);
	const processFlags = getP2PProcessFlags({ transportRole });
	const isCardsCanonicalPlayerFrame = myCanonicalSide === 'player';
	const shouldSendGuestKeepAlive = processFlags.sendsGuestKeepAlive;
	const broadcastsCardsState = processFlags.broadcastsCardsState;
	const sendsHashBeacon = processFlags.sendsHashBeacon;
	const sendsCardsInit = processFlags.sendsCardsInit;
	const adoptsRemoteCardsInit = processFlags.adoptsRemoteCardsInit;
	// The data listener is connection-scoped. Keep handshake/perspective inputs
	// in refs so seed resolution does not tear down the listener while queued
	// `cards_deck` / `session_authorize` messages are still being processed.
	const isWsHostRef = useRef(isWsHost);
	const isCardsCanonicalPlayerFrameRef = useRef(isCardsCanonicalPlayerFrame);
	const sendsCardsInitRef = useRef(sendsCardsInit);
	const adoptsRemoteCardsInitRef = useRef(adoptsRemoteCardsInit);
	isWsHostRef.current = isWsHost;
	isCardsCanonicalPlayerFrameRef.current = isCardsCanonicalPlayerFrame;
	sendsCardsInitRef.current = sendsCardsInit;
	adoptsRemoteCardsInitRef.current = adoptsRemoteCardsInit;
	// `isFirstMover` is the canonical symmetric-protocol concept. Cards hashes
	// use the canonical player frame, not the transport host hint: the seed
	// deliberately allows either browser to own the first-mover side.
	const activeMatchForAuthority = useMatchStore(state => state.activeMatch);
	const isP2PMatch = activeMatchForAuthority?.opponent.kind === 'peer';
	const _authority = activeMatchForAuthority ? deriveAuthority(activeMatchForAuthority) : null;
	const isFirstMover = _authority?.kind === 'p2p-symmetric' && _authority.myRole === 'first-mover';
	void isFirstMover; // Reserved for future UI diagnostics; gameplay stays symmetric.
	const send = usePeerStore(state => state.send);
	const p2pInitApplied = usePeerStore(state => state.p2pInitApplied);
	const opponentArmy = usePeerStore(state => state.opponentArmy);
	const p2pSessionLocalAuthorized = usePeerStore(state => state.p2pSessionLocalAuthorized);
	const p2pSessionRemoteAuthorized = usePeerStore(state => state.p2pSessionRemoteAuthorized);
	const matchSeed = useGameStore(state => state.matchSeed);
	const matchId = useGameStore(state => state.matchId);
	const p2pBoardBinding = useUnifiedCombatStore(state => state.p2pBoardBinding);
	const boardBoundToCurrentMatch = Boolean(
		matchId
		&& matchSeed
		&& isP2PBoardBoundTo(p2pBoardBinding, matchId, matchSeed),
	);
	const competitionPhase = usePeerStore(state => state.battleLifecycle?.phase ?? null);

	/**
	 * A WebRTC DataChannel is the gameplay plane, not a server-observable
	 * referee channel. Route checkpoint proposals through authenticated Control
	 * WS whenever the selected transport has one; direct legacy rooms retain
	 * the old relay-compatible path because they have no signed control role.
	 */
	const sendPhaseCheckpointProposal = useCallback<PhaseCheckpointProposalSender>((proposal): boolean => {
		const activeConnection = usePeerStore.getState().connection;
		if (activeConnection?.controlAvailable && activeConnection.sendControlMessage) {
			try {
				activeConnection.sendControlMessage(proposal);
				return true;
			} catch (error) {
				debug.warn('[wireSync] phase checkpoint proposal rejected by control transport', error);
				return false;
			}
		}
		return send(proposal);
	}, [send]);

	const sendPokerTurnProposal = useCallback((proposal: Omit<PokerTurnClockProposal, 'type'>): boolean => {
		if (connectionState !== 'connected' || isP2PSessionQuarantined()) return false;
		const message: PokerTurnClockProposal = { type: 'poker_turn_started', ...proposal };
		const activeConnection = usePeerStore.getState().connection;
		try {
			if (activeConnection?.controlAvailable && activeConnection.sendControlMessage) {
				activeConnection.sendControlMessage(message);
				return true;
			}
			return send(message);
		} catch (error) {
			// The turn clock is only authoritative after the proposal is accepted by
			// the selected transport. A thrown send must never be reported as a
			// successful announcement, otherwise the local timer can advance while the
			// referee and opponent have no matching turn record.
			debug.warn('[wireSync] Poker turn proposal rejected by transport', error);
			return false;
		}
	}, [connectionState, send]);

	const playCard = useGameStore(state => state.playCard);
	const attackWithCard = useGameStore(state => state.attackWithCard);
	const endTurn = useGameStore(state => state.endTurn);
	const performHeroPower = useGameStore(state => state.performHeroPower);
	const frontlineAttack = useGameStore(state => state.frontlineAttack);
	const performNorseHeroPower = useGameStore(state => state.performNorseHeroPower);
	const weaponUpgrade = useGameStore(state => state.weaponUpgrade);
	const toggleMulliganCard = useGameStore(state => state.toggleMulliganCard);
	const confirmMulligan = useGameStore(state => state.confirmMulligan);
	const skipMulligan = useGameStore(state => state.skipMulligan);
	const selectDiscoveryOption = useGameStore(state => state.selectDiscoveryOption);
	const applyOpponentCommandToStore = useGameStore(state => state.applyOpponentCommand);
	const pendingActionEnvelopeQueueRef = useRef<Extract<P2PMessage, { type: 'action_envelope' }>[]>([]);
	const initSentRef = useRef(false);

	// Rate limiting: max 5 action messages per second from opponent
	const actionTimestampsRef = useRef<number[]>([]);
	const MAX_ACTIONS_PER_SEC = 5;

	// Session binding: matchId derived from seed exchange
	const matchIdRef = useRef<string | null>(null);
	// Quick Match creates this key during the visible Accept ceremony and
	// carries it into session_authorize. Legacy manual rooms retain the older
	// compatibility path below.
	const sessionKeyRef = useRef<SessionKey | null>(null);
	const sessionAuthorizeSentRef = useRef(false);
	const battleReadySentMatchRef = useRef<string | null>(null);
	const battleReadyDebugRef = useRef<BattleReadyDebug | null>(null);
	const opponentSessionPubkeyRef = useRef<string | null>(null);
	const opponentSessionHiveSigRef = useRef<string | null>(null);
	// ADR 0004 §Decision.4 — per-action signed transcript (issue 03). Both
	// peers maintain a local copy of the same leaf sequence; the Merkle
	// root is committed in `match_result.transcriptRoot` at end-of-match.
	// Broadcaster role is canonical (A = first-mover, B = second-mover),
	// derived from the WS host hint at seed_reveal — see seed_reveal handler.
	const signedTranscriptRef = useRef<Transcript | null>(null);
	const myBroadcasterRef = useRef<Broadcaster | null>(null);
	// A remote cards command is applied before its asynchronously signed
	// action_envelope is necessarily on the wire. Hold the next local command
	// until that transcript leaf is verified, otherwise alternating turns can
	// mint the same transcript seq on opposite peers.
	const transcriptOrderGateRef = useRef<TranscriptOrderGate | null>(null);
	if (transcriptOrderGateRef.current === null) {
		transcriptOrderGateRef.current = createTranscriptOrderGate();
	}
	// ADR 0004 §Decision.6 (issue 04) — encrypted IndexedDB action log. This is
	// available when Quick Match acceptance is signed; legacy unsigned/local
	// matches do not create an encrypted log key.
	const actionLogDbRef = useRef<Awaited<ReturnType<typeof openActionLog>> | null>(null);
	const actionLogEncKeyRef = useRef<CryptoKey | null>(null);
	// Per-session seq tracking: monotonic, contiguous, reset on new session
	const lastIncomingSeqRef = useRef<number>(-1);
	// Serialize asynchronous Ed25519 signing so local sequence numbers remain
	// contiguous even when actions are clicked faster than WebCrypto responds.
	const localCommandSignChainRef = useRef<Promise<void>>(Promise.resolve());
	// Signed transcript envelopes use the same async signing boundary. Keep their
	// append path serialized as well; otherwise two rapid cards actions can both
	// observe the same transcript length and emit duplicate sequence numbers.
	const localTranscriptSignChainRef = useRef<Promise<void>>(Promise.resolve());
	// Identity binding: opponent's Hive username from seed_reveal
	const opponentUsernameRef = useRef<string | null>(null);
	const pendingSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const localCardsDeckRef = useRef<DeckHandshakeSnapshot | null>(null);
	const remoteCardsDeckRef = useRef<DeckHandshakeSnapshot | null>(null);
	const remoteDeckAnnounceRef = useRef<CardsDeckAnnounce | null>(null);
	const remoteDeckClaimsRef = useRef<{ hiveAccount: string; claims: readonly DeckCardClaim[] } | null>(null);
	const remoteDeckVerificationRef = useRef<'pending' | 'checking' | 'approved' | 'rejected'>('pending');
	const deckVerificationGenerationRef = useRef(0);

	const isCurrentConnectedMatch = useCallback((matchId: string): boolean => {
		const peerState = usePeerStore.getState();
		return peerState.connectionState === 'connected'
			&& peerState.connection !== null
			&& matchIdRef.current === matchId;
	}, []);

	// Commit-reveal seed exchange state
	const mySaltRef = useRef<string | null>(null);
	const theirCommitmentRef = useRef<string | null>(null);
	const seedResolvedRef = useRef(false);

	// Slash dedup: one cards-slash + one chess-slash per turn at most. Tracked
	// independently because cards and chess hash checks are independent
	// detections — a turn can plausibly fail one without the other (e.g.
	// chess-only mutation that doesn't touch cards GameState).
	const lastSlashTurnRef = useRef<number>(-1);
	const lastChessSlashTurnRef = useRef<number>(-1);
	const debouncedSyncRef = useRef<(() => void) | null>(null);

	// Command dedup: track commandIds (UUIDs from envelope) we've already applied so a
	// duplicate envelope (network retry, buffered replay after reconnect, malicious
	// resend) is rejected before re-applying its mutation. Defense-in-depth alongside
	// the seq-contiguity check — seq alone catches simple duplicates but doesn't
	// survive a peer-side seq counter reset; commandId is globally unique per envelope.
	// Bounded ring (Set + insertion-order array) prevents unbounded memory growth on
	// long matches while keeping recent IDs for replay rejection.
	const SEEN_COMMAND_IDS_MAX = 256;
	const seenCommandIdsRef = useRef<Set<string>>(new Set());
	const seenCommandIdsOrderRef = useRef<string[]>([]);

	// Chess-wire dedup ring + monotonic seq tracking. Independent of the
	// cards-wire counters above so chess and poker phases don't share seq
	// space (would otherwise look like seq gaps when phases switch).
	const lastIncomingChessSeqRef = useRef<number>(-1);
	const seenChessCommandIdsRef = useRef<Set<string>>(new Set());
	const seenChessCommandIdsOrderRef = useRef<string[]>([]);
	const chessReceiptByCommandIdRef = useRef<Map<string, TransitionReceiptMessage>>(new Map());
	const chessReceiptCommandOrderRef = useRef<string[]>([]);
	const seenPokerDecisionIdsRef = useRef<Set<string>>(new Set());
	const seenPokerDecisionIdsOrderRef = useRef<string[]>([]);
	const pokerActionSeqRef = useRef(0);
	// Poker reducers must not apply a second local decision while the first
	// decision is waiting for its Ed25519 signature. The controller applies the
	// reducer only after `sendPokerAction` resolves true.
	const pokerActionSignPendingRef = useRef(false);
	// A player/timeout Poker action is not locally canonical until the relay or
	// authenticated Control WS referee acknowledges the server-side deadline
	// gate. WebSocket write success alone is insufficient: the referee may drop
	// a late action after the bytes were accepted by the browser socket.
	const pendingPokerActionGateRef = useRef(new Map<string, PendingPokerActionGate>());
	const pendingCardsActionGateRef = useRef(new Map<string, PendingCardsActionGate>());
	const localCardsCommandPendingRef = useRef(false);
	const cardsReceiptByCommandIdRef = useRef(new Map<string, ActionAppliedMessage>());
	const cardsReceiptCommandOrderRef = useRef<string[]>([]);

	const armPokerActionGateTimeout = useCallback((decisionId: string): void => {
		const pending = pendingPokerActionGateRef.current.get(decisionId);
		if (!pending) return;
		if (pending.timeout) clearTimeout(pending.timeout);
		pending.timeout = setTimeout(() => {
			if (pendingPokerActionGateRef.current.get(decisionId) !== pending) return;
			pendingPokerActionGateRef.current.delete(decisionId);
			pending.timeout = null;
			debug.warn('[wireSync] Poker action gate acknowledgement timed out', {
				decisionId: decisionId.slice(0, 24),
			});
			pending.resolve(false);
			// Once the reconnect window has produced a fresh connected transport,
			// an unanswered gate is an ambiguous commit: the opponent may have
			// applied the signed action while our ACK was lost. Freeze instead of
			// allowing a later action to build on an unknown Poker state.
			if (usePeerStore.getState().connectionState === 'connected') {
				quarantineP2PSession('poker_action_gate_timeout');
			}
		}, P2P_ACTION_APPLIED_WAIT_TIMEOUT_MS);
	}, []);

	const pausePendingPokerActionGateTimeouts = useCallback((): void => {
		for (const pending of pendingPokerActionGateRef.current.values()) {
			if (!pending.timeout) continue;
			clearTimeout(pending.timeout);
			pending.timeout = null;
		}
	}, []);

	const settlePokerActionGateAck = useCallback((ack: PokerActionTimeGateAck): void => {
		const pending = pendingPokerActionGateRef.current.get(ack.decisionId);
		if (!pending) return;
		if (pending.matchId !== ack.matchId || pending.turnId !== ack.turnId || pending.seq !== ack.seq) {
			debug.warn('[wireSync] Poker gate acknowledgement identity mismatch', {
				decisionId: ack.decisionId.slice(0, 24),
				matchId: ack.matchId,
				turnId: ack.turnId,
				seq: ack.seq,
			});
			if (pending.timeout) clearTimeout(pending.timeout);
			pending.timeout = null;
			pendingPokerActionGateRef.current.delete(ack.decisionId);
			pending.resolve(false);
			quarantineP2PSession('poker_action_gate_ack_mismatch');
			return;
		}
		if (pending.timeout) clearTimeout(pending.timeout);
		pending.timeout = null;
		if (!ack.allowed) {
			debug.warn('[wireSync] Poker action rejected by time gate', {
				decisionId: ack.decisionId.slice(0, 24),
				reason: ack.reason,
			});
			if (ack.reason === 'notary_pending' || ack.reason === 'missing_notary') {
				GameEventBus.emitNotification({
					level: 'warning',
					message: 'Poker turn is syncing with the opponent. Controls will unlock when both clocks agree.',
					duration: 3500,
				});
			}
			pendingPokerActionGateRef.current.delete(ack.decisionId);
			pending.resolve(false);
			return;
		}
		pending.gateAllowed = true;
		if (pending.applied) {
			pendingPokerActionGateRef.current.delete(ack.decisionId);
			pending.resolve(true);
		}
	}, []);

	const settlePokerActionApplied = useCallback((receipt: ActionAppliedMessage): void => {
		const pending = pendingPokerActionGateRef.current.get(receipt.decisionId);
		if (!pending) return;
		if (pending.matchId !== receipt.matchId || pending.seq !== receipt.seq) {
			debug.warn('[wireSync] Poker application receipt identity mismatch', {
				decisionId: receipt.decisionId.slice(0, 24),
			});
			if (pending.timeout) clearTimeout(pending.timeout);
			pending.timeout = null;
			pendingPokerActionGateRef.current.delete(receipt.decisionId);
			pending.resolve(false);
			quarantineP2PSession('poker_action_applied_mismatch');
			return;
		}
		pending.applied = true;
		if (pending.gateAllowed === true) {
			if (pending.timeout) clearTimeout(pending.timeout);
			pending.timeout = null;
			pendingPokerActionGateRef.current.delete(receipt.decisionId);
			pending.resolve(true);
		}
	}, []);

	const rejectPendingPokerActionGates = useCallback((): void => {
		for (const [decisionId, pending] of pendingPokerActionGateRef.current) {
			if (pending.timeout) clearTimeout(pending.timeout);
			pending.timeout = null;
			pending.resolve(false);
			pendingPokerActionGateRef.current.delete(decisionId);
		}
	}, []);

	const retryPendingPokerActionGates = useCallback((): void => {
		const peerState = usePeerStore.getState();
		const activeConnection = peerState.connection;
		if (peerState.connectionState !== 'connected' || !activeConnection || !matchIdRef.current) return;

		for (const [decisionId, pending] of pendingPokerActionGateRef.current) {
			if (pending.retrying || pending.matchId !== matchIdRef.current) continue;
			pending.retrying = true;
			let accepted = false;
			try {
				if (activeConnection.controlAvailable && activeConnection.sendControlMessage) {
					activeConnection.sendControlMessage(pending.controlMessage);
					accepted = true;
				} else {
					accepted = send(pending.gameplayMessage);
				}
			} catch (error) {
				debug.warn('[wireSync] Pending Poker action retry rejected by transport', {
					decisionId: decisionId.slice(0, 24),
					error,
				});
			} finally {
				pending.retrying = false;
			}

			// A synchronous fake/adapter may deliver the ACK during send(). Do not
			// arm a timer after that ACK already removed this pending entry.
			if (pendingPokerActionGateRef.current.get(decisionId) !== pending) continue;
			if (accepted || usePeerStore.getState().connectionState === 'connected') {
				armPokerActionGateTimeout(decisionId);
			}
		}
	}, [armPokerActionGateTimeout, send]);

	const sendDeliveryReceipt = useCallback((receipt: ActionAppliedMessage): void => {
		const active = usePeerStore.getState().connection;
		if (active?.controlAvailable && active.sendControlMessage) {
			try {
				active.sendControlMessage(receipt);
				return;
			} catch (error) {
				debug.warn('[wireSync] failed to send applied receipt on control plane', error);
			}
		}
		send(receipt);
	}, [send]);

	const cacheCardsAppliedReceipt = useCallback((receipt: ActionAppliedMessage): void => {
		cardsReceiptByCommandIdRef.current.set(receipt.decisionId, receipt);
		cardsReceiptCommandOrderRef.current.push(receipt.decisionId);
		while (cardsReceiptCommandOrderRef.current.length > SEEN_COMMAND_IDS_MAX) {
			const evicted = cardsReceiptCommandOrderRef.current.shift();
			if (evicted !== undefined) cardsReceiptByCommandIdRef.current.delete(evicted);
		}
	}, []);

	const armCardsActionGateTimeout = useCallback((commandId: string): void => {
		const pending = pendingCardsActionGateRef.current.get(commandId);
		if (!pending) return;
		if (pending.timeout) clearTimeout(pending.timeout);
		const onTimeout = (): void => {
			if (pendingCardsActionGateRef.current.get(commandId) !== pending) return;
			const peer = usePeerStore.getState();
			if (
				peer.battleLifecycle?.phase === 'pre_battle'
				&& peer.connectionState === 'connected'
				&& pending.attempts < PRE_BATTLE_CARDS_DELIVERY_ATTEMPTS
			) {
				pending.attempts += 1;
				pending.retrying = true;
				let accepted = false;
				try {
					accepted = send(pending.gameplayMessage);
				} catch (error) {
					debug.warn('[wireSync] Pre-battle cards command retry rejected by transport', {
						commandId: commandId.slice(0, 24),
						error,
					});
				} finally {
					pending.retrying = false;
				}
				recordSessionEvent('p2p_pre_battle_action_retry', {
					commandId,
					seq: pending.seq,
					attempt: pending.attempts,
					accepted,
				});
				GameEventBus.emitNotification({
					level: 'warning',
					message: 'Synchronizing match…',
					duration: 2_500,
				});
				if (pendingCardsActionGateRef.current.get(commandId) === pending) {
					pending.timeout = setTimeout(onTimeout, P2P_ACTION_APPLIED_WAIT_TIMEOUT_MS);
				}
				return;
			}
			pendingCardsActionGateRef.current.delete(commandId);
			pending.timeout = null;
			pending.resolve(null);
			if (peer.connectionState === 'connected') {
				quarantineP2PSession('cards_action_applied_timeout');
			}
		};
		pending.timeout = setTimeout(onTimeout, P2P_ACTION_APPLIED_WAIT_TIMEOUT_MS);
	}, [send]);

	const pausePendingCardsActionGateTimeouts = useCallback((): void => {
		for (const pending of pendingCardsActionGateRef.current.values()) {
			if (!pending.timeout) continue;
			clearTimeout(pending.timeout);
			pending.timeout = null;
		}
	}, []);

	const settleCardsActionApplied = useCallback((receipt: ActionAppliedMessage): void => {
		const pending = pendingCardsActionGateRef.current.get(receipt.decisionId);
		if (!pending) return;
		if (pending.matchId !== receipt.matchId || pending.seq !== receipt.seq) {
			if (pending.timeout) clearTimeout(pending.timeout);
			pending.timeout = null;
			pendingCardsActionGateRef.current.delete(receipt.decisionId);
			pending.resolve(null);
			quarantineP2PSession('cards_action_applied_mismatch');
			return;
		}
		if (pending.timeout) clearTimeout(pending.timeout);
		pending.timeout = null;
		pendingCardsActionGateRef.current.delete(receipt.decisionId);
		pending.resolve(receipt);
	}, []);

	const rejectPendingCardsActionGates = useCallback((): void => {
		for (const [commandId, pending] of pendingCardsActionGateRef.current) {
			if (pending.timeout) clearTimeout(pending.timeout);
			pending.timeout = null;
			pending.resolve(null);
			pendingCardsActionGateRef.current.delete(commandId);
		}
	}, []);

	const retryPendingCardsActionGates = useCallback((): void => {
		const peerState = usePeerStore.getState();
		if (peerState.connectionState !== 'connected' || !peerState.connection || !matchIdRef.current) return;
		for (const [commandId, pending] of pendingCardsActionGateRef.current) {
			if (pending.retrying || pending.matchId !== matchIdRef.current) continue;
			pending.retrying = true;
			pending.attempts += 1;
			let accepted = false;
			try {
				accepted = send(pending.gameplayMessage);
			} catch (error) {
				debug.warn('[wireSync] Pending cards command retry rejected by transport', {
					commandId: commandId.slice(0, 24),
					error,
				});
			} finally {
				pending.retrying = false;
			}
			if (pendingCardsActionGateRef.current.get(commandId) !== pending) continue;
			if (accepted || usePeerStore.getState().connectionState === 'connected') {
				armCardsActionGateTimeout(commandId);
			}
		}
	}, [armCardsActionGateTimeout, send]);

	// Last envelope send timestamp — used by `sendCommandEnvelope` to enforce a
	// short cooldown that avoids the prevStateHash race when the user clicks
	// faster than the host's gameState sync round-trip. Reset on disconnect via
	// the seed-exchange useEffect cleanup branch (short reconnects retain the
	// pending wire state for replay).
	const lastEnvelopeSentAtRef = useRef<number>(0);
	// Hash beacons are sampled every 2s. Keep a short stability window so a
	// beacon cannot compare the sender's post-send/pre-apply state with the
	// receiver's pre-send/post-receive state for a same-turn cards action.
	const lastCardsCommandAtRef = useRef<number>(0);

	// Dual-sig result state
	const pendingResultRef = useRef<{
		result: PackagedMatchResult;
		hash: string;
		broadcasterSig: string;
		resolve: (sigs: { broadcaster: string; counterparty: string }) => void;
		reject: (err: Error) => void;
	} | null>(null);

	// Chess send observer (C3): centralise transcript writes for outgoing
	// chess envelopes. The chess UI calls `sendChessMove`/`sendChessAttack`
	// which build+send the envelope; this observer fires post-send and
	// records the move under the bridge's identity policy. Mounted once
	// per bridge lifetime so transcripts always go through one chokepoint
		// (audit point for the deterministic transcript-order policy).
	useEffect(() => {
		setChessSendObserver((envelope, transcriptExtra) => {
			const canonicalOrder = typeof transcriptExtra.canonicalOrder === 'number'
				? transcriptExtra.canonicalOrder
				: undefined;
			const commandPayload = envelope.command.type === 'chess_mine_placement'
				? {
					owner: envelope.command.owner,
					kingId: envelope.command.kingId,
					position: envelope.command.position,
					...(envelope.command.direction === undefined ? {} : { direction: envelope.command.direction }),
					mineId: envelope.command.mineId,
					affectedTiles: envelope.command.affectedTiles,
					commandId: envelope.commandId,
					seq: envelope.seq,
					...transcriptExtra,
				}
				: {
					pieceId: envelope.command.pieceId,
					from: envelope.command.from,
					to: envelope.command.to,
					commandId: envelope.commandId,
					seq: envelope.seq,
					...transcriptExtra,
				};
			const recorded = recordMove(envelope.command.type, {
				...commandPayload,
			}, localPlayerId({
				hiveUsername: getNFTBridge().getUsername(),
				myPeerId: usePeerStore.getState().myPeerId,
			}), canonicalOrder);
			if (!recorded) quarantineP2PSession('local_chess_transcript_unavailable');
		});
		return () => setChessSendObserver(null);
	}, []);

	// Seed exchange: generate salt and send commitment when connection opens
	// Also send version_check and start a new transcript
	useEffect(() => {
		if (!connection || connectionState !== 'connected') {
			pendingActionEnvelopeQueueRef.current = [];
			deckVerificationGenerationRef.current += 1;
			if (connectionState === 'grace_period' || connectionState === 'reconnecting') {
				// Keep a signed Poker action whose referee ACK may have crossed the
				// network boundary. Its timeout is paused and the exact decision is
				// retried after the replacement transport opens.
				pausePendingPokerActionGateTimeouts();
				pausePendingCardsActionGateTimeouts();
				pausePendingChessReceiptTimeout();
				return undefined;
			}
			rejectPendingPokerActionGates();
			rejectPendingCardsActionGates();
			transcriptOrderGateRef.current?.reset('connection_lost');
			mySaltRef.current = null;
			theirCommitmentRef.current = null;
			seedResolvedRef.current = false;
			clearTranscript(); // also resets moveCounter inside the transcript module
			outgoingSeqCounter = 0;
			lastIncomingSeqRef.current = -1;
			seenCommandIdsRef.current.clear();
			seenCommandIdsOrderRef.current.length = 0;
				lastIncomingChessSeqRef.current = -1;
				seenChessCommandIdsRef.current.clear();
					seenChessCommandIdsOrderRef.current.length = 0;
					chessReceiptByCommandIdRef.current.clear();
					chessReceiptCommandOrderRef.current.length = 0;
					cardsReceiptByCommandIdRef.current.clear();
					cardsReceiptCommandOrderRef.current.length = 0;
					seenPokerDecisionIdsRef.current.clear();
					seenPokerDecisionIdsOrderRef.current.length = 0;
					pokerActionSeqRef.current = 0;
					pokerActionSignPendingRef.current = false;
					resetChessWireSender();
				phaseCheckpointClient.reset();
			lastEnvelopeSentAtRef.current = 0;
			lastCardsCommandAtRef.current = 0;
			sessionKeyRef.current = null;
			actionLogDbRef.current = null;
			actionLogEncKeyRef.current = null;
			sessionAuthorizeSentRef.current = false;
			opponentSessionPubkeyRef.current = null;
			opponentSessionHiveSigRef.current = null;
			battleReadySentMatchRef.current = null;
			battleReadyDebugRef.current = null;
			usePeerStore.getState().setP2pSessionAuthorization({
				localAuthorized: false,
				remoteAuthorized: false,
				error: null,
			});
			usePeerStore.getState().clearP2pBattleReady();
			signedTranscriptRef.current = null;
			myBroadcasterRef.current = null;
			return undefined;
		}

		const resumePeer = usePeerStore.getState();
		const resumeGame = useGameStore.getState();
		const isHardReloadResume = Boolean(
			resumePeer.hardReloadResume
			&& resumeGame.matchSeed
			&& resumeGame.matchId
			&& !seedResolvedRef.current,
		);
		// A new matchmaking connection must not inherit the previous match's
		// seed/perspective while the fresh commit-reveal is still in flight. The
		// deck handshake can arrive first; stale identity here would let it build
		// a valid-looking state for the wrong match. Normal reconnects retain the
		// resolved seed, and hard-reload resume explicitly retains the sealed one.
		if (!seedResolvedRef.current && !isHardReloadResume) {
			useGameStore.getState().resetGameState();
			useUnifiedCombatStore.getState().reset();
		}
		if (isHardReloadResume) {
			seedResolvedRef.current = true;
			matchIdRef.current = resumeGame.matchId;
		}
		let cancelled = false;
		const isActiveConnection = (): boolean => (
			!cancelled
			&& usePeerStore.getState().connection === connection
			&& usePeerStore.getState().connectionState === 'connected'
		);

		if (seedResolvedRef.current && matchIdRef.current) {
			const resumedMatchId = matchIdRef.current;
			const resumeAuthPolicy = resolveP2PResumeAuthPolicy({
				hardReloadResume: isHardReloadResume,
				// The current Alfa gameplay phase intentionally disables the
				// visible Keychain renewal ceremony. A normal same-tab reconnect
				// keeps its in-memory key; a full reload does not.
				renewalAvailable: false,
			});
			if (resumeAuthPolicy.kind === 'blocked') {
				usePeerStore.getState().setP2pSessionAuthorization({
					localAuthorized: false,
					remoteAuthorized: false,
					error: resumeAuthPolicy.reason,
				});
				debug.warn('[wireSync] Saved match cannot resume without session-key renewal', {
					matchId: resumedMatchId,
				});
				return undefined;
			}
			const timer = setTimeout(() => {
				if (!isActiveConnection()) return;
				void loadWasmEngine().then(() => {
					if (!isActiveConnection()) return;
					const wasmHash = getWasmHash();
					send({ type: 'wasm_hash_check', wasmHash });
				}).catch(err => {
					if (!cancelled) {
						GameEventBus.emitNotification({
							level: 'error',
							message: p2pEngineLoadNotice(err),
							duration: 15000,
						});
					}
				});
				const hash = typeof __BUILD_HASH__ !== 'undefined' ? __BUILD_HASH__ : 'dev';
				send({ type: 'version_check', buildHash: hash });
				send({
					type: 'state_sync_request',
					matchId: resumedMatchId,
					fromTurn: signedTranscriptRef.current?.leaves.length ?? 0,
				});
				debug.log('[wireSync] Reconnected existing P2P session without reseeding', {
					matchId: resumedMatchId,
					localLeaves: signedTranscriptRef.current?.leaves.length ?? 0,
				});
					retryPendingChessTransition();
					phaseCheckpointClient.retryPending(send);
					retryPendingPokerActionGates();
					retryPendingCardsActionGates();
				}, 0);
			return () => {
				cancelled = true;
				clearTimeout(timer);
			};
		}

		transcriptOrderGateRef.current?.reset('session_reset');
		startNewTranscript();
		const timer = setTimeout(() => {
			if (!isActiveConnection()) return;

			void loadWasmEngine().then(() => {
				if (!isActiveConnection()) return;
				const wasmHash = getWasmHash();
				send({ type: 'wasm_hash_check', wasmHash });
			}).catch(err => {
				if (!cancelled) {
					GameEventBus.emitNotification({
						level: 'error',
						message: p2pEngineLoadNotice(err),
						duration: 15000,
					});
				}
			});

			const salt = generateSalt();
			mySaltRef.current = salt;
			void sha256Hash(salt).then(commitment => {
				if (isActiveConnection()) send({ type: 'seed_commit', commitment });
			});

			const hash = typeof __BUILD_HASH__ !== 'undefined' ? __BUILD_HASH__ : 'dev';
			send({ type: 'version_check', buildHash: hash });

			// Announce our selected army so the opponent can render hero portraits
			// and both peers can seed chess piece ids. Without this both sides
			// fall back to `getDefaultArmySelection()`.
			try {
				const ourArmy = selectArmy(useWarbandStore.getState());
				if (ourArmy) {
					send({ type: 'army_announcement', army: ourArmy });
					debug.log('[wireSync] Sent army_announcement:', { king: ourArmy.king?.name });
				} else {
					debug.warn('[wireSync] No local army to announce — opponent will see default fallback');
				}
			} catch (err) {
				debug.warn('[wireSync] Failed to send army_announcement:', err);
			}

			try {
				const { selectedDeck, selectedHero, selectedHeroId } = useGame.getState();
				let savedDecksJson = '[]';
				try {
					savedDecksJson = localStorage.getItem(savedDecksStorageKey()) || '[]';
				} catch {
					savedDecksJson = '[]';
				}
				const warbandLoadout = selectDeckCardIdsByPiece(useWarbandStore.getState());
				const deckCardIdsByPiece = HERO_DECK_PIECE_TYPES.map((pieceType) => warbandLoadout[pieceType]);
				const localDeck = snapshotLocalCardsDeck({
					selectedDeckId: selectedDeck,
					selectedHeroClass: selectedHero,
					selectedHeroId,
					savedDecksJson,
					warbandCardIds: selectDeckCardIds(useWarbandStore.getState()),
					deckCardIdsByPiece,
					hiveCollection: readHiveCollectionForHandshake(),
				});
				let localClaims: readonly DeckCardClaim[] = [];
				if (requiresDeckOwnershipVerification()) {
					const bridge = getNFTBridge();
					const username = bridge.getUsername();
					if (!username) throw new Error('Shared-network deck verification requires a Hive account.');
					const parsed = buildClientDeckClaimsFromCardIds(localDeck.cardIds, bridge, localDeck.cardIdsByPiece);
					if (parsed.status !== 'parsed') {
						throw new Error(`Could not derive deck ownership claims: ${parsed.rejections[0]?.detail ?? 'invalid claims'}`);
					}
					localClaims = parsed.claims;
				}
				const localSnapshot = createDeckHandshakeSnapshot(localDeck, localClaims);
				localCardsDeckRef.current = localSnapshot;
				send({
					type: 'cards_deck',
					heroClass: localDeck.heroClass,
					...(localDeck.heroId ? { heroId: localDeck.heroId } : {}),
					cardIds: [...localDeck.cardIds],
					nftLevels: [...localDeck.nftLevels],
				});
				debug.log('[wireSync] Sent cards_deck', {
					heroClass: localDeck.heroClass,
					cardCount: localDeck.cardIds.length,
				});
				if (requiresDeckOwnershipVerification()) {
					const username = getNFTBridge().getUsername();
					if (!username) throw new Error('Shared-network deck verification requires a Hive account.');
					send({ type: 'deck_verify', hiveAccount: username, protocolVersion: 2, claims: [...localClaims] });
					debug.combat(`[wireSync] Sent deck_verify: ${localClaims.length} source-aware claim(s) for @${username}`);
				}
			} catch (err) {
				debug.warn('[wireSync] Failed to send cards_deck:', err);
				if (requiresDeckOwnershipVerification()) {
					GameEventBus.emitNotification({ level: 'error', message: 'Deck verification could not start. Shared-network match cannot continue.', duration: 6000 });
					usePeerStore.getState().disconnect();
				}
			}
		}, 0);
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [connection, connectionState, pausePendingCardsActionGateTimeouts, pausePendingPokerActionGateTimeouts, rejectPendingCardsActionGates, rejectPendingPokerActionGates, retryPendingCardsActionGates, retryPendingPokerActionGates, send]);

	useEffect(() => () => {
		rejectPendingPokerActionGates();
		rejectPendingCardsActionGates();
		transcriptOrderGateRef.current?.reset('session_reset');
		clearTranscript();
		resetChessWireSender();
		phaseCheckpointClient.reset();
	}, [rejectPendingCardsActionGates, rejectPendingPokerActionGates]);

	// Timeout after 10s if seed exchange stalls. Both peers init from the
	// deck handshake; this no longer re-sends host `init`.
	useEffect(() => {
		if (!connection || connectionState !== 'connected') {
			initSentRef.current = false;
			localCardsDeckRef.current = null;
			remoteCardsDeckRef.current = null;
			remoteDeckAnnounceRef.current = null;
			remoteDeckClaimsRef.current = null;
			remoteDeckVerificationRef.current = 'pending';
			battleReadySentMatchRef.current = null;
			battleReadyDebugRef.current = null;
			usePeerStore.getState().clearP2pBattleReady();
			return undefined;
		}
		if (seedResolvedRef.current) return undefined;
		const timeout = setTimeout(() => {
			if (!seedResolvedRef.current) {
				debug.error('[wireSync] Seed exchange timed out after 10s');
				GameEventBus.emitNotification({
					level: 'error',
					message: 'Seed exchange timed out. Disconnecting.',
					duration: 5000,
				});
				usePeerStore.getState().disconnect();
			}
		}, 10_000);
		return () => clearTimeout(timeout);
	}, [connection, connectionState]);

	// Build the canonical chess projection before BattleReady is emitted. The
	// coordinator is intentionally still unmounted at this point, so the
	// readiness proof cannot rely on a UI component having initialized the board.
	useEffect(() => {
		if (connectionState !== 'connected' || !p2pInitApplied || !matchId || !matchSeed || !myCanonicalSide || !opponentArmy) return;
		const localArmy = selectArmy(useWarbandStore.getState());
		if (!localArmy) return;
		ensureCanonicalP2PChessBoard({
			matchId,
			matchSeed,
			myCanonicalSide,
			localArmy,
			remoteArmy: opponentArmy,
		});
	}, [connectionState, matchId, matchSeed, myCanonicalSide, opponentArmy, p2pInitApplied]);

	// Battle readiness is a bilateral protocol fact, not an inference from the
	// transport being open. Both peers publish the same engine/ruleset/root
	// contract and the setup gate only opens after both proofs agree.
	const hasInitialGameState = useGameStore(state => state.gameState !== null);
	useEffect(() => {
		if (!connection || connectionState !== 'connected' || !p2pInitApplied || !hasInitialGameState || !boardBoundToCurrentMatch) {
			battleReadySentMatchRef.current = null;
			battleReadyDebugRef.current = null;
			return undefined;
		}
		const matchId = matchIdRef.current;
		if (!matchId || battleReadySentMatchRef.current === matchId) return undefined;
		const quickMatchCommitted = useMatchmakingStore.getState().matchCommitted;
		if (quickMatchCommitted && (!p2pSessionLocalAuthorized || !p2pSessionRemoteAuthorized)) return undefined;
		let cancelled = false;

		void (async () => {
			try {
				const cachedAcceptance = getCachedMatchAcceptance();
				await loadWasmEngine();
				const engineHash = cachedAcceptance?.offer.matchId === matchId
					? cachedAcceptance.proof.engineHash
					: getWasmHash();
				const rulesetHash = cachedAcceptance?.offer.matchId === matchId
					? cachedAcceptance.proof.rulesetHash
					: await getCardRegistryHash();
				const army = selectArmy(useWarbandStore.getState());
				if (!army) throw new Error('Local army is not available for battle readiness');
				const localDeckCardIds = selectDeckCardIds(useWarbandStore.getState());
				const loadoutHash = await sha256Hash(canonicalStringify(buildBattleReadyLoadoutCommitmentPayload({
					army,
					deckCardIds: localDeckCardIds,
				})));
				const remoteArmy = usePeerStore.getState().opponentArmy;
				const remoteDeck = remoteCardsDeckRef.current?.deck;
				if (!remoteArmy || !remoteDeck) throw new Error('Opponent loadout is not available for battle readiness');
				const expectedRemoteLoadoutHash = await sha256Hash(canonicalStringify(buildBattleReadyLoadoutCommitmentPayload({
					army: remoteArmy,
					deckCardIds: remoteDeck.cardIds,
				})));
				const gameState = useGameStore.getState().gameState;
				if (!gameState) throw new Error('Initial game state is not available for battle readiness');
				const cardsHash = parseHash256(computeCardsPrevStateHash(gameState, isCardsCanonicalPlayerFrame));
				if (!cardsHash) throw new Error('Initial cards state root is empty');
				const rootInput = {
					matchId,
					matchSeed: useGameStore.getState().matchSeed ?? '',
					engineHash,
					rulesetHash,
					cardsHash,
					localLoadoutHash: loadoutHash,
					remoteLoadoutHash: expectedRemoteLoadoutHash,
					combatStore: useUnifiedCombatStore.getState(),
				};
				const initialStateRoot = computeInitialMatchRoot(rootInput);
				if (!initialStateRoot) throw new Error('Initial game state root is empty');
				if (cancelled || !isCurrentConnectedMatch(matchId)) return;

				const proof: P2PBattleReadyProof = {
					matchId,
					engineHash,
					rulesetHash,
					loadoutHash,
					initialStateRoot,
				};
				const debugProof = computeInitialMatchRootDebug(rootInput);
				battleReadySentMatchRef.current = matchId;
				battleReadyDebugRef.current = debugProof;
				const remoteProof = usePeerStore.getState().p2pBattleReadyRemote;
				const comparison = remoteProof ? compareBattleReadyProofs(proof, remoteProof, {
					expectedRemoteLoadoutHash,
				}) : null;
				usePeerStore.getState().setP2pBattleReady({
					local: proof,
					expectedRemoteLoadoutHash,
					...(comparison && !comparison.ok ? { error: comparison.reason } : { error: null }),
				});
				send({
					type: 'battle_ready_v1',
					...proof,
					...(debugProof ? { debug: debugProof } : {}),
				});
				if (comparison && !comparison.ok) {
					quarantineP2PSession(SETUP_STATE_MISMATCH_REASON);
				}
			} catch (error) {
				if (cancelled) return;
				debug.error('[wireSync] battle readiness failed:', error);
				usePeerStore.getState().setP2pBattleReady({
					local: null,
					error: error instanceof Error ? error.message : 'Battle readiness failed',
				});
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [boardBoundToCurrentMatch, connection, connectionState, hasInitialGameState, isCardsCanonicalPlayerFrame, isCurrentConnectedMatch, p2pInitApplied, p2pSessionLocalAuthorized, p2pSessionRemoteAuthorized, send]);

	// Detect when connection closes and notify the player
	useEffect(() => {
		if (!connection) return;

		const handleClose = () => {
			debug.warn('[wireSync] Connection to opponent closed');
			const currentPeerState = usePeerStore.getState();
			if (currentPeerState.connectionState === 'grace_period'
				|| currentPeerState.connectionState === 'reconnecting') {
				pausePendingPokerActionGateTimeouts();
				pausePendingCardsActionGateTimeouts();
				pausePendingChessReceiptTimeout();
			} else {
				rejectPendingPokerActionGates();
				rejectPendingCardsActionGates();
			}
			// Clean up pending result to prevent stale closures
			if (pendingResultRef.current) {
				pendingResultRef.current.reject(new Error('Connection closed'));
				pendingResultRef.current = null;
			}
			// Clean up debounce timer
			if (pendingSyncRef.current) {
				clearTimeout(pendingSyncRef.current);
				pendingSyncRef.current = null;
			}
				pendingActionEnvelopeQueueRef.current = [];
			GameEventBus.emitNotification({
				level: 'warning',
				message: 'Connection lost. Reconnecting and preserving queued actions.',
				duration: 8000,
			});
		};

		connection.on('close', handleClose);
		return () => {
			connection.off('close', handleClose);
		};
	}, [connection, pausePendingCardsActionGateTimeouts, pausePendingPokerActionGateTimeouts, rejectPendingCardsActionGates, rejectPendingPokerActionGates]);

	useEffect(() => {
		if (!connection || (connectionState !== 'connected' && connectionState !== 'grace_period')) return;

		// Track heartbeat reception for diagnostics; log once on first arrival to confirm
		// the listener is wired, then again every 30s so the user can see the connection
		// is alive without spamming the console.
		let heartbeatLogState = { firstSeen: false, lastLoggedAt: 0 };
		const applyCardsDeckHandshakeIfReady = (): void => {
			if (usePeerStore.getState().p2pInitApplied) return;
			const { matchSeed, myCanonicalSide } = useGameStore.getState();
			const localDeck = localCardsDeckRef.current;
			const remoteDeck = remoteCardsDeckRef.current;
			if (!matchSeed || !myCanonicalSide || !localDeck || !remoteDeck) return;
			if (!canInitDeckHandshake({
				matchSeed,
				myCanonicalSide,
				localSnapshot: localDeck,
				remoteSnapshot: remoteDeck,
				sharedNetwork: requiresDeckOwnershipVerification(),
				remoteVerification: remoteDeckVerificationRef.current,
			})) return;
			useGameStore.getState().initGameFromHandshake({
				matchSeed,
				myCanonicalSide,
				localDeck: localDeck.deck,
				remoteDeck: remoteDeck.deck,
			});
			usePeerStore.getState().setP2pInitApplied(true);
			debug.log('[wireSync] cards handshake init applied', {
				myCanonicalSide,
				localHero: localDeck.deck.heroClass,
				remoteHero: remoteDeck.deck.heroClass,
			});
		};
		const rejectRemoteDeckVerification = (message: string): void => {
			remoteDeckVerificationRef.current = 'rejected';
			GameEventBus.emitNotification({ level: 'error', message, duration: 6000 });
			setTimeout(() => usePeerStore.getState().disconnect(), 2000);
		};
		const verifyRemoteDeck = (): void => {
			const announce = remoteDeckAnnounceRef.current;
			const envelope = remoteDeckClaimsRef.current;
			if (!announce || !envelope || remoteDeckVerificationRef.current === 'checking' || remoteDeckVerificationRef.current === 'approved') return;
			const identity = checkDeckVerificationIdentity(
				envelope.hiveAccount,
				opponentUsernameRef.current,
				seedResolvedRef.current,
			);
			if (identity === 'pending') return;
			if (identity === 'rejected') {
				rejectRemoteDeckVerification('Opponent deck identity is missing or does not match the announced Hive account. Disconnecting.');
				return;
			}
			const bound = bindDeckClaimsToAnnounce(announce, envelope.claims);
			if (bound.status !== 'bound') {
				rejectRemoteDeckVerification(`Opponent deck claims do not match the announced deck. Disconnecting.`);
				return;
			}
			remoteDeckVerificationRef.current = 'checking';
			remoteCardsDeckRef.current = bound.snapshot;
			const verificationGeneration = deckVerificationGenerationRef.current;
			Promise.all([
				verifyDeckOwnership(envelope.hiveAccount, envelope.claims.map(claim => (
					claim.authority === 'nft-custody'
						? { nft_id: claim.nftUid, cardId: claim.cardId, pieceIndex: claim.pieceIndex }
						: { cardId: claim.cardId, category: claim.authority === 'starter-entitlement' ? 'starter' as const : 'genesis' as const, pieceIndex: claim.pieceIndex }
				))),
				verifyDeckClaimsOnServer(envelope.hiveAccount, envelope.claims),
			]).then(([ownership, server]) => {
				if (!isCurrentDeckVerificationGeneration(verificationGeneration, deckVerificationGenerationRef.current)) return;
				if (!ownership.valid || !server.verified) {
					rejectRemoteDeckVerification('Opponent deck verification failed. The shared-network match was disconnected.');
					return;
				}
				remoteDeckVerificationRef.current = 'approved';
				applyCardsDeckHandshakeIfReady();
			}).catch(() => {
				if (!isCurrentDeckVerificationGeneration(verificationGeneration, deckVerificationGenerationRef.current)) return;
				rejectRemoteDeckVerification('Deck verification service unavailable. The shared-network match was disconnected.');
			});
		};
			const requeuePendingActionEnvelopes = (): void => {
				const pending = pendingActionEnvelopeQueueRef.current.splice(0);
				if (pending.length === 0) return;
				// `processQueue` is already active while session_authorize/session_renewal
				// is being handled. Put the envelopes back at its head so the signed
				// transcript is verified in the same order they arrived.
				messageQueue.unshift(...pending);
				debug.log('[wireSync] Requeued action envelopes after session authorization', {
					count: pending.length,
				});
			};
			// Each transport connection owns its queue and processing flag. Sharing
			// either across React effect epochs lets a slow verifier from an old room
			// block or clear messages that arrived on the replacement socket.
			const messageQueue: P2PMessage[] = [];
			let isProcessing = false;
			const processMessage = async (data: P2PMessage) => {
			// Heartbeat keepalive - handle before game-message dispatch.
			if (data.type === 'heartbeat') {
				// Bind liveness to this connection epoch. A heartbeat queued by an
				// obsolete socket must not refresh the replacement socket's watchdog.
				usePeerStore.getState().handleHeartbeat(connection);
				const now = Date.now();
				if (!heartbeatLogState.firstSeen) {
					debug.log('[wireSync] First heartbeat received from opponent — connection alive');
					heartbeatLogState = { firstSeen: true, lastLoggedAt: now };
				} else if (now - heartbeatLogState.lastLoggedAt > 30_000) {
					debug.log('[wireSync] Heartbeats flowing (alive, last 30s)');
					heartbeatLogState.lastLoggedAt = now;
				}
				return;
			}

			const lifecycle = usePeerStore.getState().battleLifecycle;
			if (lifecycle?.phase === 'resolved' || lifecycle?.phase === 'cancelled') {
				debug.warn('[wireSync] Dropped late message after terminal competitive result', {
					type: data.type,
					terminalEventId: lifecycle.terminalEventId,
				});
				return;
			}
			if (isGameplayWireMessage(data) && isP2PSessionQuarantined()) {
				debug.warn('[wireSync] Dropped gameplay message while P2P integrity is quarantined', {
					type: data.type,
				});
				return;
			}

				switch (data.type) {
				case 'phase_checkpoint_propose_v1':
					// The relay consumes proposals. Seeing one here would mean a
					// protocol boundary regression, so never treat it as peer data.
					debug.warn('[wireSync] Dropped peer-sent phase checkpoint proposal');
					break;

				case 'phase_checkpoint_commit_v1':
				case 'phase_checkpoint_dispute_v1': {
					const accepted = phaseCheckpointClient.handleServerMessage(data);
					if (!accepted) {
						debug.warn('[wireSync] Ignored stale or mismatched phase checkpoint response');
						break;
					}
					if (data.type === 'phase_checkpoint_dispute_v1' && isRetryablePhaseCheckpointDispute(data.reason)) {
						phaseCheckpointClient.retryPending(sendPhaseCheckpointProposal);
						GameEventBus.emitNotification({
							level: 'warning',
							message: 'Phase roots disagreed. The relay did not pick a winner — retrying the same boundary.',
							duration: 6000,
						});
					}
					break;
				}

				case 'poker_turn_notary_commit_v1': {
					const pokerAdapter = getP2PPokerCombatAdapter();
					pokerAdapter.applyNotarizedPokerTurnClock({
						turnId: data.turnId,
						combatId: data.combatId,
						phase: data.phase,
						activePlayerId: data.activePlayerId,
						actionsThisRound: data.actionsThisRound,
						remainingMsAtCommit: data.remainingMsAtCommit,
						receivedAtMs: Date.now(),
					});
					break;
				}

				case 'poker_turn_notary_dispute_v1': {
					debug.warn('[wireSync] poker turn notary dispute', { reason: data.reason, turnId: data.turnId });
					if (isRetryablePokerTurnNotaryDispute(data.reason)) {
						const pokerState = getP2PPokerCombatAdapter().getPokerState();
						if (pokerState?.turnId && pokerState.activePlayerId && isTimedPokerDecisionPhase(pokerState.phase)) {
							sendPokerTurnProposal({
								combatId: pokerState.combatId,
								turnId: pokerState.turnId,
								phase: pokerState.phase,
								activePlayerId: pokerState.activePlayerId,
								actionsThisRound: pokerState.actionsThisRound,
								durationMs: UNIVERSAL_POKER_TURN_CLOCK_POLICY.durationMs,
								sentAtMs: Date.now(),
							});
						}
						GameEventBus.emitNotification({
							level: 'warning',
							message: 'Poker clocks disagreed. The relay did not pick a winner — retrying the same turn.',
							duration: 6000,
						});
						break;
					}
					GameEventBus.emitNotification({
						level: 'warning',
						message: 'Poker turn clock frozen. Time-sensitive actions will not relay until recovery.',
						duration: 8000,
					});
					break;
				}

				case 'version_check': {
					const myHash = typeof __BUILD_HASH__ !== 'undefined' ? __BUILD_HASH__ : 'dev';
					if (data.buildHash !== myHash && data.buildHash !== 'dev' && myHash !== 'dev') {
						GameEventBus.emitNotification({
							level: 'warning',
							message: `Client version mismatch — your build: ${myHash.slice(0, 7)}, opponent: ${data.buildHash.slice(0, 7)}. Results may differ.`,
							duration: 8000,
						});
					}
					break;
				}

				case 'battle_ready_v1': {
					const activeMatchId = matchIdRef.current;
					if (!activeMatchId || data.matchId !== activeMatchId) {
						debug.warn('[wireSync] battle_ready_v1 ignored — match identity mismatch');
						break;
					}
					const remoteProof: P2PBattleReadyProof = {
						matchId: data.matchId,
						engineHash: data.engineHash,
						rulesetHash: data.rulesetHash,
						loadoutHash: data.loadoutHash,
						initialStateRoot: data.initialStateRoot,
					};
					const localProof = usePeerStore.getState().p2pBattleReadyLocal;
					const comparison = localProof ? compareBattleReadyProofs(localProof, remoteProof, {
						expectedRemoteLoadoutHash: usePeerStore.getState().p2pBattleReadyExpectedRemoteLoadoutHash,
					}) : null;
					if (comparison && !comparison.ok) {
						const diagnosis = describeBattleReadyDebugMismatch(
							battleReadyDebugRef.current,
							data.debug,
						);
						debug.error('[wireSync] battle-ready proof mismatch:', comparison.reason, '\n', diagnosis);
						usePeerStore.getState().setP2pBattleReady({
							remote: null,
							error: comparison.reason,
						});
						recordSessionEvent('p2p_pre_battle_failed', {
							reason: SETUP_STATE_MISMATCH_REASON,
							detail: comparison.reason,
							diagnosis,
						});
						quarantineP2PSession(SETUP_STATE_MISMATCH_REASON);
						break;
					}
					usePeerStore.getState().setP2pBattleReady({ remote: remoteProof, error: null });
					break;
				}

				case 'wasm_hash_check': {
					const myWasmHash = getWasmHash();
					const theirWasmHash = data.wasmHash;
					if (theirWasmHash !== myWasmHash && theirWasmHash !== 'dev' && myWasmHash !== 'dev') {
						GameEventBus.emitNotification({
							level: 'error',
							message: `WASM engine mismatch — disconnecting. Your engine: ${myWasmHash.slice(0, 12)}…, opponent: ${theirWasmHash.slice(0, 12)}…. Both players must use the same game version.`,
							duration: 10000,
						});
						usePeerStore.getState().disconnect();
					}
					break;
				}

				case 'transition_receipt_v1': {
					const confirmation = confirmChessTransitionReceipt(data);
					if (confirmation.status === 'confirmed') {
						debug.log('[wireSync] transition receipt confirmed', {
							commandId: confirmation.commandId.slice(0, 8),
						});
						break;
					}
					if (confirmation.status === 'ignored') {
						debug.warn(`[wireSync] transition receipt ignored — ${confirmation.reason}`);
						break;
					}
					recordSessionEvent('transition_integrity_quarantined', {
						reason: confirmation.divergence.reason,
						commandId: confirmation.divergence.commandId,
						detail: confirmation.divergence.detail,
					});
					quarantineP2PSession(`chess_transition_${confirmation.divergence.reason}`);
					break;
				}

				case 'hash_check': {
					if (!shouldCompareHashBeacon(usePeerStore.getState().battleLifecycle?.phase)) {
						debug.log('[wireSync] Ignored hash_check before battle commitment');
						break;
					}
					const gs = useGameStore.getState().gameState;
					if (!gs) break;
					// A beacon can cross an in-flight turn or reconnect replay. Do not
					// classify that ordinary ordering window as divergence; compare roots
					// only when both peers identify the same cards turn.
					if (gs.turnNumber !== data.turnNumber) {
						debug.log('[wireSync] Ignored stale cards hash beacon', {
							localTurn: gs.turnNumber,
							remoteTurn: data.turnNumber,
						});
						break;
					}
					const localLastSentCommandSeq = outgoingSeqCounter - 1;
					const localLastReceivedCommandSeq = lastIncomingSeqRef.current;
					if (
						(data.sentCommandSeq !== undefined && data.sentCommandSeq !== localLastReceivedCommandSeq)
						|| (data.receivedCommandSeq !== undefined && data.receivedCommandSeq !== localLastSentCommandSeq)
					) {
						debug.log('[wireSync] Ignored cards hash beacon with unsynchronised command sequence', {
							localLastSentCommandSeq,
							localLastReceivedCommandSeq,
							remoteLastSentCommandSeq: data.sentCommandSeq,
							remoteLastReceivedCommandSeq: data.receivedCommandSeq,
						});
						break;
					}
					const CARDS_HASH_STABILITY_WINDOW_MS = 4_000;
					if (Date.now() - lastCardsCommandAtRef.current < CARDS_HASH_STABILITY_WINDOW_MS) {
						debug.log('[wireSync] Ignored cards hash beacon during action stability window');
						break;
					}
					// Canonicalize to host perspective before hashing so both peers operate
					// on the same byte layout. The host stores `players.player = host`;
					// the client stores `players.player = client` (post-flip in the init/
					// gameState handlers). Without this flip the WASM hash always mismatches
					// because the byte order of `players.player` vs `players.opponent` differs.
					const canonicalState = isCardsCanonicalPlayerFrameRef.current ? gs : flipGameState(gs);
					const myHash = await computeStateHash(canonicalState);
					// Hashing may yield to WASM. Re-check the sequence/stability window
					// before classifying the result so a command applied during hashing
					// cannot become a false integrity failure.
					if (
						(data.sentCommandSeq !== undefined && data.sentCommandSeq !== lastIncomingSeqRef.current)
						|| (data.receivedCommandSeq !== undefined && data.receivedCommandSeq !== outgoingSeqCounter - 1)
						|| Date.now() - lastCardsCommandAtRef.current < CARDS_HASH_STABILITY_WINDOW_MS
					) {
						debug.log('[wireSync] Ignored cards hash result after command activity');
						break;
					}
					if (myHash !== data.stateHash) {
						debug.error(`[wireSync] Cards state hash mismatch at turn ${data.turnNumber}: local=${myHash.slice(0, 16)}, remote=${data.stateHash.slice(0, 16)}`);
						send({ type: 'hash_mismatch', turnNumber: data.turnNumber, myHash });
						quarantineP2PSession(`cards_hash_mismatch_turn_${data.turnNumber}`);

						if (shouldDeferSlashForHashMismatch(usePeerStore.getState().battleLifecycle?.phase) && isSharedNetworkEnvironment() && data.turnNumber !== lastSlashTurnRef.current) {
							lastSlashTurnRef.current = data.turnNumber;
							const matchSeed = useGameStore.getState().matchSeed;
							const opponentName = usePeerStore.getState().remotePeerId ?? 'unknown';
								if (matchSeed) {
									deferSlashEvidence({
										matchId: matchSeed,
										offender: opponentName,
										reason: 'forged_move',
										trxId1: matchSeed,
										trxId2: `hash_check_fail_cards_turn_${data.turnNumber}_${myHash.slice(0, 16)}`,
										notes: `Cards hash check failed at turn ${data.turnNumber}. Local: ${myHash.slice(0, 16)}, remote: ${data.stateHash.slice(0, 16)}`,
									});
								}
							}
					}

					// Chess hash check (TD-27c-chess F3). Empty on either side means
					// well-known race ('' from sender = no chess phase or WASM not
					// ready; '' from local = same on receiver). Skip rather than
					// reject — periodic beacon will retry in 2s.
					if (data.chessStateHash.length > 0) {
						const localChessSnapshot = useUnifiedCombatStore.getState().boardState ?? null;
						const myChessHash = computeChessPrevStateHash(localChessSnapshot);
						const localChessMoveCount = localChessSnapshot?.moveCount ?? -1;
						// Skip when the beacon is from a different chess turn than
						// our local state. The 2s beacon period is much slower than
						// chess move latency, so any active-play beacon is almost
						// always stale — comparing hashes across moveCounts is a
						// guaranteed false positive. Idle drift (the beacon's actual
						// purpose) keeps both peers on the same moveCount, so the
						// compare still fires there.
						const moveCountsMatch = data.chessMoveCount >= 0
							&& localChessMoveCount >= 0
							&& data.chessMoveCount === localChessMoveCount;
						if (moveCountsMatch && myChessHash.length > 0 && myChessHash !== data.chessStateHash) {
							debug.error(`[wireSync] Chess state hash mismatch at turn ${data.turnNumber}: local=${myChessHash.slice(0, 16)}, remote=${data.chessStateHash.slice(0, 16)}`);
							quarantineP2PSession(`chess_hash_mismatch_turn_${data.turnNumber}`);

							if (shouldDeferSlashForHashMismatch(usePeerStore.getState().battleLifecycle?.phase) && isSharedNetworkEnvironment() && data.turnNumber !== lastChessSlashTurnRef.current) {
								lastChessSlashTurnRef.current = data.turnNumber;
								const matchSeed = useGameStore.getState().matchSeed;
								const opponentName = usePeerStore.getState().remotePeerId ?? 'unknown';
									if (matchSeed) {
										deferSlashEvidence({
											matchId: matchSeed,
											offender: opponentName,
											reason: 'forged_move',
											trxId1: matchSeed,
											trxId2: `hash_check_fail_chess_turn_${data.turnNumber}_${myChessHash.slice(0, 16)}`,
											notes: `Chess hash check failed at turn ${data.turnNumber}. Local: ${myChessHash.slice(0, 16)}, remote: ${data.chessStateHash.slice(0, 16)}`,
										});
									}
								}
						}
					}
					break;
				}

				case 'poker_hash_check': {
					if (!shouldCompareHashBeacon(usePeerStore.getState().battleLifecycle?.phase)) {
						break;
					}
					const pokerState = getP2PPokerCombatAdapter().getPokerState();
					if (!pokerState
						|| pokerState.phase !== data.phase
						|| pokerState.turnId !== data.turnId
						|| pokerState.actionsThisRound !== data.actionsThisRound) {
						break;
					}
					const localPokerHash = computePokerCombatStateHash(pokerState);
					if (!localPokerHash || localPokerHash === data.pokerStateHash) break;
					debug.error(`[wireSync] Poker state hash mismatch at ${data.turnId}: local=${localPokerHash.slice(0, 16)}, remote=${data.pokerStateHash.slice(0, 16)}`);
					quarantineP2PSession(`poker_hash_mismatch_${data.turnId}`);
					recordSessionEvent('poker_integrity_mismatch', {
						turnId: data.turnId,
						phase: data.phase,
						actionsThisRound: data.actionsThisRound,
						localHash: localPokerHash,
						remoteHash: data.pokerStateHash,
					});
					GameEventBus.emitNotification({
						level: 'error',
						message: 'Poker state verification failed — the combat state diverged from the opponent.',
						duration: 8000,
					});
					break;
				}

				case 'hash_mismatch':
					if (!shouldCompareHashBeacon(usePeerStore.getState().battleLifecycle?.phase)) {
						debug.log('[wireSync] Ignored hash_mismatch before battle commitment');
						break;
					}
					debug.error(`[wireSync] Opponent reports hash mismatch at turn ${data.turnNumber}: theirHash=${data.myHash.slice(0, 16)}`);
					quarantineP2PSession(`opponent_reported_hash_mismatch_turn_${data.turnNumber}`);
					// Do not answer a divergence report with a peer-authored full state.
					// The receiver deliberately rejects gameState frames; recovery must
					// use the signed transcript from the agreed root or terminate.

					if (shouldDeferSlashForHashMismatch(usePeerStore.getState().battleLifecycle?.phase) && isSharedNetworkEnvironment()) {
						const matchSeed = useGameStore.getState().matchSeed;
						const opponentName = usePeerStore.getState().remotePeerId ?? 'unknown';
							if (matchSeed) {
								deferSlashEvidence({
									matchId: matchSeed,
									offender: opponentName,
									reason: 'forged_move',
									trxId1: matchSeed,
									trxId2: `hash_mismatch_turn_${data.turnNumber}_${data.myHash.slice(0, 16)}`,
									notes: `State hash mismatch at turn ${data.turnNumber}. Opponent hash: ${data.myHash.slice(0, 16)}`,
								});
							}
						}
					break;

				case 'seed_commit':
					if (seedResolvedRef.current) {
						debug.warn('[wireSync] Dropped late seed_commit after seed resolution');
						break;
					}
					if (theirCommitmentRef.current && theirCommitmentRef.current !== data.commitment) {
						// A commitment is immutable for the lifetime of this connection.
						// Replacing it would let a peer equivocate about the salt that
						// determines every deterministic battle state downstream.
						debug.error('[wireSync] Conflicting seed_commit — possible equivocation');
						quarantineP2PSession('seed_commit_equivocation');
						break;
					}
					if (theirCommitmentRef.current === data.commitment) {
						// Duplicate delivery is harmless, but keep the commitment stable
						// and re-send our reveal so a delayed frame can still converge.
						debug.warn('[wireSync] Duplicate seed_commit received');
						if (mySaltRef.current) {
							send({ type: 'seed_reveal', salt: mySaltRef.current, hiveUsername: getNFTBridge().getUsername() || undefined });
						}
						break;
					}
					theirCommitmentRef.current = data.commitment;
					if (mySaltRef.current) {
						send({ type: 'seed_reveal', salt: mySaltRef.current, hiveUsername: getNFTBridge().getUsername() || undefined });
					}
					break;

				case 'seed_reveal': {
					if (seedResolvedRef.current) {
						debug.warn('[wireSync] Dropped duplicate seed_reveal after seed resolution');
						break;
					}
					const theirSalt = data.salt;
					const theirCommitment = theirCommitmentRef.current;
					if (!theirCommitment) {
						debug.warn('[wireSync] Received seed_reveal before seed_commit');
						break;
					}

					const expectedCommitment = await sha256Hash(theirSalt);
					if (expectedCommitment !== theirCommitment) {
						debug.error('[wireSync] Seed commitment mismatch — possible cheating');
						GameEventBus.emitNotification({
							level: 'error',
							message: 'Seed verification failed. Disconnecting.',
							duration: 5000,
						});
						usePeerStore.getState().disconnect();
						break;
					}

					const myPeerId = usePeerStore.getState().myPeerId ?? '';
					const remotePeerId = usePeerStore.getState().remotePeerId ?? '';
					const mySalt = mySaltRef.current ?? '';
					const [first, second] = myPeerId < remotePeerId
						? [mySalt, theirSalt]
						: [theirSalt, mySalt];
					const matchSeed = await sha256Hash(first + second);

					// Derive each peer's canonical chess side from the resolved seed.
					// Both peers compute this BEFORE any chess state initializes so
					// `myCanonicalSide` is available to UI components on first render.
					// `isWsHost` is the WS-resolved hint (see wsTransport handshake).
					const myCanonicalSide = deriveCanonicalSide(matchSeed, isWsHostRef.current);
					useGameStore.setState({ matchSeed, myCanonicalSide });

					// Symmetric seeding for the chess phase: both peers mint the
					// same `_chessRng` / `_chessIdGen` from the resolved seed for
					// legacy chess-side randomness. P2P King mine placement uses an
					// action-scoped seed (`matchSeed + mineId`) in its signed payload,
					// so an async signer cannot consume a shared mutable stream.
					// Runs on host AND joiner. Cards gameState waits for the deck handshake.
					useUnifiedCombatStore.getState().initChessWithSeed?.(matchSeed);
					useGameStore.getState().bindCardsRng(matchSeed);

					seedResolvedRef.current = true;

					// Quick Match already has a server-issued room identity. Reuse
					// it so the relay room, acceptance proof, MatchContext, and
					// transcript all refer to one match. Manual rooms retain the
					// legacy deterministic identity until that flow is migrated.
					const [matchIdFirst, matchIdSecond] = myPeerId < remotePeerId
						? [myPeerId, remotePeerId]
						: [remotePeerId, myPeerId];
					const derivedMatchId = (await sha256Hash(matchSeed + matchIdFirst + matchIdSecond)).slice(0, 16);
					const cachedAcceptance = getCachedMatchAcceptance();
						const canonicalMatchId = cachedAcceptance?.offer.matchId ?? derivedMatchId;
						matchIdRef.current = canonicalMatchId;
						useGameStore.setState({ matchId: canonicalMatchId });
						const peerStore = usePeerStore.getState();
						if (!peerStore.battleLifecycle) {
							peerStore.initializeBattleLifecycle({
								matchId: canonicalMatchId,
								playerA: myPeerId,
								playerB: remotePeerId,
							});
						} else {
							peerStore.setBattleLifecycleMatchId(canonicalMatchId);
						}
					debug.log('[wireSync] seed_reveal RESOLVED', {
						matchSeed: matchSeed.slice(0, 12),
						matchId: canonicalMatchId,
						myCanonicalSide,
						isWsHost: isWsHostRef.current,
					});

					// ADR 0004 §Decision.4 (issue 03) — initialise the signed
					// transcript before any action can be appended. Broadcaster
					// label is canonical (A/B), derived from the WS host hint
					// at seed_reveal: WS host is 'A', client is 'B'. This is
					// the only place we mint the label; downstream code reads
					// `myBroadcasterRef.current`.
					signedTranscriptRef.current = emptyTranscript(canonicalMatchId);
					myBroadcasterRef.current = isWsHostRef.current ? 'A' : 'B';

					// Identity binding: capture opponent's Hive username
					if (data.hiveUsername) {
						opponentUsernameRef.current = data.hiveUsername;
					}
					if (requiresDeckOwnershipVerification()) {
						if (!data.hiveUsername && remoteDeckAnnounceRef.current) {
							rejectRemoteDeckVerification('Opponent did not announce a Hive identity for shared-network deck verification. Disconnecting.');
						} else {
							verifyRemoteDeck();
						}
					}

					// Quick Match carries the single explicit Accept proof into the
					// wire handshake. There is no second Keychain ceremony here.
					if (!sessionAuthorizeSentRef.current) {
						sessionAuthorizeSentRef.current = true;
						const localMatchId = canonicalMatchId;
						const quickMatchCommitted = useMatchmakingStore.getState().matchCommitted;
						if (cachedAcceptance && cachedAcceptance.offer.matchId === localMatchId) {
								sessionKeyRef.current = cachedAcceptance.sessionKey;
									setChessGameplaySigner((input) => signGameplayEnvelope(input, cachedAcceptance.sessionKey).then((signature) => ({
										signerPubkey: cachedAcceptance.sessionKey.pubkey,
										signature,
									})));
							const localProof = cachedAcceptance.proof;
							const localDelegation = getCachedMatchmakingDelegation()?.delegation;
							const localProofIsAuthorized = localProof.protocol === 'ragnarok-match-accept-v2'
								? Boolean(localDelegation
									&& localDelegation.delegationId === localProof.delegationId
									&& localDelegation.account === localProof.account)
								: Boolean(localProof.account && localProof.hiveSig);
							if (isSharedNetworkEnvironment() && !localProofIsAuthorized) {
								usePeerStore.getState().setP2pSessionAuthorization({
									localAuthorized: false,
									remoteAuthorized: false,
									error: 'Signed match acceptance is required for shared-network P2P',
								});
							} else if (isCurrentConnectedMatch(localMatchId)) {
								send({
									type: 'session_authorize',
									matchId: localMatchId,
									ephemeralPubkey: cachedAcceptance.sessionKey.pubkey,
									...(localProof.hiveSig ? { hiveSig: localProof.hiveSig } : {}),
									acceptance: localProof,
									...(localProof.protocol === 'ragnarok-match-accept-v2' && localDelegation
										? { delegation: localDelegation }
										: {}),
								});
								debug.log('[wireSync] Sent session_authorize', {
									matchId: localMatchId,
									mode: 'quick-match-acceptance',
									proofHasHiveSignature: Boolean(localProof.hiveSig),
								});
								usePeerStore.getState().setP2pSessionAuthorization({ localAuthorized: true, error: null });
								const localDelegationSig = localProof.hiveSig ?? localDelegation?.hiveSig;
								if (localDelegationSig) {
									try {
										const [db, encKey] = await Promise.all([
											openActionLog(),
											deriveActionLogEncKey(localDelegationSig, localMatchId),
										]);
										actionLogDbRef.current = db;
										actionLogEncKeyRef.current = encKey;
									} catch (logErr) {
										debug.warn('[wireSync] Action log unavailable — running without reload safety', logErr);
									}
								}
							} else {
								debug.warn('[wireSync] session_authorize skipped — quick match is no longer connected', {
									matchId: localMatchId,
								});
							}
						} else if (quickMatchCommitted) {
							debug.warn('[wireSync] Quick Match acceptance proof is unavailable — refusing legacy authorization fallback');
							usePeerStore.getState().setP2pSessionAuthorization({
								localAuthorized: false,
								remoteAuthorized: false,
								error: 'Quick Match acceptance proof is unavailable; return to the lobby',
							});
						} else if (!shouldRequestP2PSessionAuthorizePrompt()) {
							debug.log('[wireSync] session_authorize skipped — walletInvocation is disabled for this phase');
							usePeerStore.getState().setP2pSessionAuthorization({
								localAuthorized: false,
								remoteAuthorized: false,
								error: null,
							});
						} else {
							(async () => {
								try {
									const sessionKey = await generateSessionKey(localMatchId);
								sessionKeyRef.current = sessionKey;
									setChessGameplaySigner((input) => signGameplayEnvelope(input, sessionKey).then((signature) => ({
										signerPubkey: sessionKey.pubkey,
										signature,
									})));
									const localMatchChallenge = usePeerStore.getState().matchChallenge;
									if (localMatchChallenge && !isFreshMatchChallenge(localMatchChallenge)) {
										throw new Error('Match challenge is invalid or expired');
									}
									const localUsername = getNFTBridge().getUsername();
									if (!localUsername) {
										debug.warn('[wireSync] session_authorize skipped — no local Hive username');
										usePeerStore.getState().setP2pSessionAuthorization({
											localAuthorized: false,
											error: 'Missing local Hive session',
										});
										return;
									}
									if (!isCurrentConnectedMatch(localMatchId)) {
										debug.warn('[wireSync] session_authorize skipped — match no longer connected');
										return;
									}
									const localSessionMatchChallenge = localMatchChallenge
										? stripRelayMatchTicketFromSessionChallenge(localMatchChallenge)
										: null;
									const hiveSig = await signSessionAuthorize(localMatchId, sessionKey.pubkey, {
										username: localUsername,
										...(localSessionMatchChallenge ? { matchChallenge: localSessionMatchChallenge } : {}),
									});
									if (!isCurrentConnectedMatch(localMatchId)) {
										debug.warn('[wireSync] session_authorize signature ignored — match disconnected before approval');
										return;
									}
									send({
										type: 'session_authorize',
										matchId: localMatchId,
										ephemeralPubkey: sessionKey.pubkey,
										hiveSig,
										...(localSessionMatchChallenge ? { matchChallenge: localSessionMatchChallenge } : {}),
									});
									debug.log('[wireSync] Sent session_authorize', {
										matchId: localMatchId,
										mode: sessionKey.mode,
										pubkeyPrefix: sessionKey.pubkey.slice(0, 8),
									});
									usePeerStore.getState().setP2pSessionAuthorization({
										localAuthorized: true,
										error: null,
									});
									// ADR 0004 §Decision.6 (issue 04) — open the encrypted
									// action log alongside session_authorize. Reuse the same
									// Posting signature so match start has one Keychain prompt.
									try {
										const [db, encKey] = await Promise.all([
											openActionLog(),
											deriveActionLogEncKey(hiveSig, localMatchId),
										]);
										actionLogDbRef.current = db;
										actionLogEncKeyRef.current = encKey;
										debug.log('[wireSync] Action log opened', { matchId: localMatchId });
									} catch (logErr) {
										debug.warn('[wireSync] Action log unavailable — running without reload safety', logErr);
									}
								} catch (err) {
									if (!isCurrentConnectedMatch(localMatchId)) {
										debug.warn('[wireSync] session_authorize cancelled after disconnect');
										return;
									}
									debug.error('[wireSync] session_authorize failed:', err);
									usePeerStore.getState().setP2pSessionAuthorization({
										localAuthorized: false,
										error: err instanceof Error ? err.message : String(err),
									});
								}
							})();
						}
					}

					applyCardsDeckHandshakeIfReady();
					if (sendsCardsInitRef.current) {
						initSentRef.current = true;
						const updatedState = useGameStore.getState().gameState;
						if (updatedState && usePeerStore.getState().p2pInitApplied) {
							send({ type: 'init', ...encodeGameStateForWire(updatedState), isHost: true });
						}
					}
					break;
				}

				case 'cards_deck': {
					remoteDeckAnnounceRef.current = {
						heroClass: data.heroClass,
						...(data.heroId ? { heroId: data.heroId } : {}),
						cardIds: data.cardIds,
						nftLevels: data.nftLevels,
					};
					if (!requiresDeckOwnershipVerification()) {
						remoteCardsDeckRef.current = createDeckHandshakeSnapshot(remoteDeckAnnounceRef.current, []);
					} else if (seedResolvedRef.current && !opponentUsernameRef.current) {
						rejectRemoteDeckVerification('Opponent did not announce a Hive identity for shared-network deck verification. Disconnecting.');
					}
					verifyRemoteDeck();
					applyCardsDeckHandshakeIfReady();
					break;
				}

				case 'init':
					if (adoptsRemoteCardsInitRef.current) {
						if (usePeerStore.getState().p2pInitApplied) {
							debug.warn('[wireSync] Dropped extra init — match already live');
							break;
						}
						const receivedState = decodeWireGameState(data);
						if (!receivedState) {
							debug.warn('[wireSync] Dropped init with invalid compressed gameState');
							break;
						}
						useGameStore.setState({ gameState: flipGameState(receivedState) });
						usePeerStore.getState().setP2pInitApplied(true);
					} else if (usePeerStore.getState().p2pInitApplied) {
						debug.warn('[wireSync] Dropped extra init — match already live');
					}
					break;

				case 'game_command':
					if (usePeerStore.getState().p2pInitApplied) {
						// Resolve the remote peer's transcript identity once for all
						// recordMove sites in this case. Falls back to a guest sentinel
						// when the peer never announced a Hive username during seed_reveal.
						const remoteTranscriptId = remotePlayerId({
							opponentUsername: opponentUsernameRef.current,
							remotePeerId: usePeerStore.getState().remotePeerId,
						});
						const reject = (cause: string): void => {
							debug.warn(`[wireSync] game_command rejected: ${cause}`, {
								seq: data.seq,
								commandType: data.command?.type,
							});
							recordSessionEvent('command_rejected', {
								cause,
								seq: data.seq,
								commandType: data.command?.type,
							});
						};

						const expectedMatchId = matchIdRef.current;
						if (!expectedMatchId) {
							reject('no_match_id_yet');
							break;
						}
						if (data.matchId !== expectedMatchId) {
							reject('match_id_mismatch');
							break;
						}

						const cachedCardsReceipt = cardsReceiptByCommandIdRef.current.get(data.commandId);
						if (cachedCardsReceipt) {
							sendDeliveryReceipt(cachedCardsReceipt);
							break;
						}

							const expectedSeq = lastIncomingSeqRef.current + 1;
							if (data.seq !== expectedSeq) {
								if (data.seq > expectedSeq) {
									quarantineP2PSession('remote_cards_command_sequence_gap');
								}
								reject(`seq_non_contiguous_expected_${expectedSeq}_got_${data.seq}`);
							break;
						}

						const opponentPubkey = opponentSessionPubkeyRef.current;
						const sessionAuthorization = usePeerStore.getState();
						if (!sessionAuthorization.p2pSessionLocalAuthorized
							|| !sessionAuthorization.p2pSessionRemoteAuthorized
							|| !opponentPubkey
							|| !data.signerPubkey
							|| !data.signature) {
							reject('session_authorization_required');
							break;
						}
						if (data.signerPubkey !== opponentPubkey) {
							reject('signer_pubkey_mismatch');
							break;
						}
						if (!await verifyGameplayEnvelope({
							matchId: data.matchId,
							seq: data.seq,
							commandId: data.commandId,
							prevStateHash: data.prevStateHash,
							command: data.command,
						}, data.signature, data.signerPubkey)) {
							reject('invalid_gameplay_signature');
							break;
						}

						// commandId dedup — defense-in-depth alongside seq. Catches replays that
						// somehow bypass seq (e.g., a buggy peer that resets its counter mid-game).
						if (typeof data.commandId !== 'string' || data.commandId.length === 0) {
							reject('missing_command_id');
							break;
						}
						if (seenCommandIdsRef.current.has(data.commandId)) {
							reject(`duplicate_command_id_${data.commandId.slice(0, 8)}`);
							break;
						}

						// prevStateHash is required and must match. Earlier code short-circuited
						// when `data.prevStateHash` was falsy — that allowed a sender to bypass
						// the integrity check by omitting the field. With sender-side
						// `computeCardsPrevStateHash` always producing a string (empty only on
						// pre-init / WASM-not-ready edge cases that shouldn't happen during
							// play), we can validate strictly: non-empty string + exact match.
							if (typeof data.prevStateHash !== 'string' || data.prevStateHash.length === 0) {
								quarantineP2PSession('remote_cards_prev_state_hash_missing');
								reject('missing_prev_state_hash');
							break;
						}
							let localPrevHash = computeCardsPrevStateHash(
								useGameStore.getState().gameState,
											isCardsCanonicalPlayerFrameRef.current,
							);
							if (!localPrevHash) {
								// The receiver can observe the first signed command before its
								// eager WASM load settles. Complete the same load here before
								// classifying the frame as an integrity failure.
								try {
									await loadWasmEngine();
									localPrevHash = computeCardsPrevStateHash(
										useGameStore.getState().gameState,
										isCardsCanonicalPlayerFrameRef.current,
									);
								} catch (error) {
									debug.warn('[wireSync] receiver cards-state hash unavailable after WASM load', error);
								}
							}
							if (localPrevHash.length === 0) {
							// Receiver-side WASM eager-load race or null gameState. The
							// sender's hash is well-formed; the local recompute returns
							// '' per the documented failure-mode policy. Bouncing the
							// envelope so the sender can retry once WASM finishes
							// initializing avoids spurious mismatches at handshake-time.
							// Mirrors `local_prev_state_hash_unavailable` on the chess
							// branch.
								if (usePeerStore.getState().battleLifecycle?.phase === 'battle') {
									quarantineP2PSession('remote_cards_prev_state_hash_unavailable');
								} else {
									recordSessionEvent('p2p_pre_battle_hash_retry_requested', {
										commandId: data.commandId,
										seq: data.seq,
										reason: 'remote_cards_prev_state_hash_unavailable',
									});
								}
								reject('local_prev_state_hash_unavailable');
							break;
						}
						if (data.prevStateHash !== localPrevHash) {
							quarantineP2PSession(`cards_prev_hash_mismatch_seq_${data.seq}`);
							reject(`prev_state_hash_mismatch_local_${localPrevHash.slice(0, 16)}_got_${data.prevStateHash.slice(0, 16)}`);
							break;
						}

						const nowEnvelope = Date.now();
							actionTimestampsRef.current = actionTimestampsRef.current.filter(t => nowEnvelope - t < 1000);
							if (actionTimestampsRef.current.length >= MAX_ACTIONS_PER_SEC) {
								quarantineP2PSession('remote_cards_command_rate_limit_exceeded');
								reject('rate_limit_exceeded');
							break;
						}
						actionTimestampsRef.current.push(nowEnvelope);
						lastCardsCommandAtRef.current = nowEnvelope;

							const wireCommand = data.command;
							if (!wireCommand || typeof wireCommand !== 'object') {
								quarantineP2PSession('remote_command_malformed');
								reject('malformed_command');
								break;
							}
							// Once an authenticated, contiguous command reaches the reducer,
							// rejection is terminal for this session. Advancing past it would
							// create a sequence hole; leaving the peer live would let the two
							// browsers accept different battle histories. Both sides therefore
							// enter the same fail-closed quarantine.
							const rejectCanonicalCommand = (cause: string): void => {
								quarantineP2PSession(`remote_command_rejected_${wireCommand.type}`);
								reject(cause);
							};

						const gs = useGameStore.getState().gameState;
						const pokerStateForCommand = getP2PPokerCombatAdapter().getPokerState();
						const remoteOwnsPokerTurn = pokerStateForCommand !== null
							&& pokerStateForCommand.turnId !== null
							&& pokerStateForCommand.activePlayerId === pokerStateForCommand.opponent.playerId;
						const isMulliganCommand = wireCommand.type === GAME_COMMAND_TYPES.toggleMulliganCard
							|| wireCommand.type === GAME_COMMAND_TYPES.confirmMulligan
							|| wireCommand.type === GAME_COMMAND_TYPES.skipMulligan;
						const isActiveMulligan = gs.gamePhase === 'mulligan' && gs.mulligan?.active === true;
						if (gs.gamePhase === 'game_over'
							|| (!isMulliganCommand && !remoteOwnsPokerTurn && gs.currentTurn !== 'opponent')
							|| (isMulliganCommand && !isActiveMulligan)) {
								rejectCanonicalCommand('not_opponent_turn_or_game_over');
							break;
						}

						// Mark a successfully-applied envelope: advance seq and register commandId
						// in the dedup ring (FIFO eviction at SEEN_COMMAND_IDS_MAX). Post-apply
						// transcript recording and sync are settled alongside this callback.
		const markCommandApplied = (): void => {
							lastIncomingSeqRef.current = data.seq;
							seenCommandIdsRef.current.add(data.commandId);
							seenCommandIdsOrderRef.current.push(data.commandId);
							while (seenCommandIdsOrderRef.current.length > SEEN_COMMAND_IDS_MAX) {
								const evicted = seenCommandIdsOrderRef.current.shift();
								if (evicted !== undefined) seenCommandIdsRef.current.delete(evicted);
							}
							const resultingStateHash = computeCardsPrevStateHash(
								useGameStore.getState().gameState,
								isCardsCanonicalPlayerFrameRef.current,
							);
							if (!resultingStateHash) {
								quarantineP2PSession('cards_applied_hash_unavailable');
								return;
							}
							const receipt = buildActionAppliedMessage({
								matchId: expectedMatchId,
								transportEpoch: readConnectionTransportEpoch(usePeerStore.getState().connection),
								decisionId: data.commandId,
								seq: data.seq,
								resultingStateHash,
							});
							cacheCardsAppliedReceipt(receipt);
							sendDeliveryReceipt(receipt);
							if (!requiresSignedActionEnvelope(wireCommand.type)) return;
							const transcript = signedTranscriptRef.current;
							const gate = transcriptOrderGateRef.current;
							if (!transcript || !gate) {
								quarantineP2PSession('remote_action_transcript_unavailable');
								return;
							}
			if (!gate.expect(transcript.leaves.length)) {
				quarantineP2PSession('remote_action_transcript_barrier_conflict');
			}
		};
		const recordRemoteCanonicalMove = (
			action: string,
			payload: Record<string, unknown>,
		): boolean => {
			const actorId = usePeerStore.getState().remotePeerId;
			const canonicalOrder = actorId
				? commitNextP2PCanonicalAction({ actionId: data.commandId, actorId })
				: null;
			if (canonicalOrder === null) {
				quarantineP2PSession('remote_canonical_order_unavailable');
				reject('canonical_order_unavailable');
				return false;
			}
			if (!recordMove(action, payload, remoteTranscriptId, canonicalOrder)) {
				quarantineP2PSession('remote_transcript_unavailable');
				reject('transcript_unavailable');
				return false;
			}
			return true;
		};

						// Payload existence pre-check helpers. Rejecting BEFORE applyOpponentCommand
						// saves CPU on a flood of bogus IDs. From host POV the opponent's data
						// is gs.players.opponent.* and our own is gs.players.player.*.
						const HERO_TARGET_IDS = new Set(['player-hero', 'opponent-hero']);
						const isMinionInBattlefield = (id: string): boolean => (
							gs.players.opponent.battlefield.some(c => c.instanceId === id)
							|| gs.players.player.battlefield.some(c => c.instanceId === id)
						);

						// Lightweight payload validation; wireCommand is already a discriminated union.
						switch (wireCommand.type) {
							case GAME_COMMAND_TYPES.playCard:
								if (typeof wireCommand.cardId !== 'string' || wireCommand.cardId.length > 64) {
									rejectCanonicalCommand('invalid_play_card_payload');
									break;
								}
								if (!gs.players.opponent.hand.some(c => c.instanceId === wireCommand.cardId)) {
									rejectCanonicalCommand('play_card_id_not_in_opponent_hand');
									break;
								}
								if (wireCommand.targetId !== undefined
									&& !HERO_TARGET_IDS.has(wireCommand.targetId)
									&& !isMinionInBattlefield(wireCommand.targetId)) {
									rejectCanonicalCommand('play_card_target_not_found');
									break;
								}
								settleRemoteCommand(applyOpponentCommandToStore(wireCommand), {
									onApplied: () => {
										if (!recordRemoteCanonicalMove('playCard', {
									cardId: wireCommand.cardId,
									targetId: wireCommand.targetId,
									targetType: wireCommand.targetType,
									insertionIndex: wireCommand.insertionIndex,
									payWithBlood: wireCommand.payWithBlood,
									commandId: data.commandId,
											seq: data.seq,
										})) return;
										markCommandApplied();
										debouncedSyncRef.current?.();
									},
									onUnapplied: (reason) => rejectCanonicalCommand(reason),
								});
								break;
							case GAME_COMMAND_TYPES.attack:
								if (typeof wireCommand.attackerId !== 'string' || wireCommand.attackerId.length > 64) {
									rejectCanonicalCommand('invalid_attack_payload');
									break;
								}
								if (wireCommand.defenderId !== undefined && (typeof wireCommand.defenderId !== 'string' || wireCommand.defenderId.length > 64)) {
									rejectCanonicalCommand('invalid_attack_payload');
									break;
								}
								if (!gs.players.opponent.battlefield.some(c => c.instanceId === wireCommand.attackerId)) {
									rejectCanonicalCommand('attack_attacker_not_on_opponent_battlefield');
									break;
								}
								if (wireCommand.defenderId !== undefined
									&& !HERO_TARGET_IDS.has(wireCommand.defenderId)
									&& !gs.players.player.battlefield.some(c => c.instanceId === wireCommand.defenderId)) {
									rejectCanonicalCommand('attack_defender_not_on_player_battlefield');
									break;
								}
								settleRemoteCommand(applyOpponentCommandToStore(wireCommand), {
									onApplied: () => {
										if (!recordRemoteCanonicalMove('attack', {
											attackerId: wireCommand.attackerId,
											defenderId: wireCommand.defenderId,
											commandId: data.commandId,
											seq: data.seq,
										})) return;
										markCommandApplied();
										debouncedSyncRef.current?.();
									},
									onUnapplied: (reason) => rejectCanonicalCommand(reason),
								});
								break;
							case GAME_COMMAND_TYPES.endTurn:
								{
									const remoteEndTurnResult = applyOpponentCommandToStore(wireCommand);
									if (remoteEndTurnResult.status === 'applied') {
										// End Turn also folds the remote actor in the viewer-relative
										// Poker store. Apply this only after the cards command is
										// accepted so a rejected cards envelope cannot partially
										// mutate the cross-mode battle state.
										const pokerFold = applyEndTurnPokerFold('opponent');
										if (pokerFold.status === 'rejected') {
											quarantineP2PSession(`remote_end_turn_poker_fold_${pokerFold.reason}`);
												rejectCanonicalCommand(`remote_end_turn_poker_fold_${pokerFold.reason}`);
											break;
										}
									}
									settleRemoteCommand(remoteEndTurnResult, {
									onApplied: () => {
										if (!recordRemoteCanonicalMove('endTurn', {
											commandId: data.commandId,
											seq: data.seq,
										})) return;
										markCommandApplied();
										debouncedSyncRef.current?.();
									},
									onUnapplied: (reason) => rejectCanonicalCommand(reason),
									});
								}
								break;
						case GAME_COMMAND_TYPES.useHeroPower:
								if (wireCommand.targetId !== undefined
									&& !HERO_TARGET_IDS.has(wireCommand.targetId)
									&& !isMinionInBattlefield(wireCommand.targetId)) {
									rejectCanonicalCommand('hero_power_target_not_found');
									break;
								}
								settleRemoteCommand(applyOpponentCommandToStore(wireCommand), {
									onApplied: () => {
							if (!recordRemoteCanonicalMove('useHeroPower', {
								targetId: wireCommand.targetId,
								targetType: wireCommand.targetType,
								commandId: data.commandId,
											seq: data.seq,
										})) return;
										markCommandApplied();
										debouncedSyncRef.current?.();
									},
									onUnapplied: (reason) => rejectCanonicalCommand(reason),
									});
									break;
								case GAME_COMMAND_TYPES.frontlineAttack:
										settleRemoteCommand(applyOpponentCommandToStore(wireCommand), {
											onApplied: () => {
												if (!recordRemoteCanonicalMove('frontlineAttack', {
												mode: wireCommand.mode,
												actionId: wireCommand.actionId,
												commandId: data.commandId,
												seq: data.seq,
											})) return;
										markCommandApplied();
										debouncedSyncRef.current?.();
									},
											onUnapplied: (reason) => rejectCanonicalCommand(reason),
									});
									break;
								case GAME_COMMAND_TYPES.norseHeroPower:
									if (wireCommand.targetId !== undefined
										&& !HERO_TARGET_IDS.has(wireCommand.targetId)
										&& !isMinionInBattlefield(wireCommand.targetId)) {
											rejectCanonicalCommand('hero_power_target_not_found');
										break;
									}
									settleRemoteCommand(applyOpponentCommandToStore(wireCommand), {
										onApplied: () => {
											if (!recordRemoteCanonicalMove('norseHeroPower', {
												norseHeroId: wireCommand.norseHeroId,
												targetId: wireCommand.targetId,
												targetType: wireCommand.targetType,
												actionId: wireCommand.actionId,
												commandId: data.commandId,
												seq: data.seq,
										})) return;
										markCommandApplied();
										debouncedSyncRef.current?.();
									},
											onUnapplied: (reason) => rejectCanonicalCommand(reason),
									});
									break;
								case GAME_COMMAND_TYPES.weaponUpgrade:
									settleRemoteCommand(applyOpponentCommandToStore(wireCommand), {
										onApplied: () => {
											if (!recordRemoteCanonicalMove('weaponUpgrade', {
												norseHeroId: wireCommand.norseHeroId,
												actionId: wireCommand.actionId,
												commandId: data.commandId,
												seq: data.seq,
										})) return;
										markCommandApplied();
										debouncedSyncRef.current?.();
									},
										onUnapplied: (reason) => rejectCanonicalCommand(reason),
									});
									break;
								case GAME_COMMAND_TYPES.toggleMulliganCard:
								if (typeof wireCommand.cardId !== 'string' || wireCommand.cardId.length > 64) {
									rejectCanonicalCommand('invalid_mulligan_payload');
									break;
								}
								if (!gs.players.opponent.hand.some(card => card.instanceId === wireCommand.cardId)) {
									rejectCanonicalCommand('mulligan_card_id_not_in_opponent_hand');
									break;
								}
								settleRemoteCommand(applyOpponentCommandToStore(wireCommand), {
									onApplied: () => {
										if (!recordRemoteCanonicalMove('toggleMulliganCard', { cardId: wireCommand.cardId, commandId: data.commandId, seq: data.seq })) return;
									markCommandApplied();
									debouncedSyncRef.current?.();
								},
									onUnapplied: (reason) => rejectCanonicalCommand(reason),
								});
								break;
							case GAME_COMMAND_TYPES.confirmMulligan:
							case GAME_COMMAND_TYPES.skipMulligan:
								settleRemoteCommand(applyOpponentCommandToStore(wireCommand), {
									onApplied: () => {
										if (!recordRemoteCanonicalMove(
										wireCommand.type === GAME_COMMAND_TYPES.confirmMulligan ? 'confirmMulligan' : 'skipMulligan',
										{ commandId: data.commandId, seq: data.seq },
										)) return;
									markCommandApplied();
									debouncedSyncRef.current?.();
								},
									onUnapplied: (reason) => rejectCanonicalCommand(reason),
								});
								break;
							case GAME_COMMAND_TYPES.selectDiscoveryOption:
								settleRemoteCommand(applyOpponentCommandToStore(wireCommand), {
									onApplied: () => {
										if (!recordRemoteCanonicalMove('selectDiscoveryOption', {
											cardId: wireCommand.card?.id,
											seq: data.seq,
										})) return;
										markCommandApplied();
										debouncedSyncRef.current?.();
									},
									onUnapplied: (reason) => rejectCanonicalCommand(reason),
								});
								break;
							default:
									rejectCanonicalCommand(`unknown_command_type_${(wireCommand as { type: string }).type}`);
						}
					}
					break;

					case 'chess_command': {
					// Plan B chess: SYMMETRIC P2P. Both peers receive, validate, and
					// apply chess_command independently — no host-only routing. The
					// canonical board state is identical on both peers (post-3.5),
					// so the same envelope produces the same state transition.
					//
					// Surface (post C-Chess.8):
					//   - chess_move: quiet moves via `executeMove`.
					//   - chess_attack: instant-kill captures — receiver runs
					//     `beginChessAttack(attacker, defender, true)`.
					//   - chess_combat_initiated: non-instant captures — receiver
					//     runs the same attack command with `false`, then the
					//     coordinator boots poker from pendingCombat.
					//   - chess_mine_placement: signed King ability — receiver
					//     validates the seed-scoped tile list and mirrors the mine.
							debug.log('[wireSync] RECV chess_command', {
								seq: data.seq,
								commandId: data.commandId.slice(0, 8),
								isWsHost: isWsHostRef.current,
							});
							const reject = (cause: string): void => {
								debug.warn(`[wireSync] chess_command REJECTED: ${cause}`, {
									seq: data.seq,
									commandId: data.commandId,
								});
						recordSessionEvent('chess_command_rejected', { cause });
					};
					if (chessIntegrityMonitor.getState().status === 'quarantined') {
						reject('integrity_session_quarantined');
						break;
					}

					const envelope: ChessCommandEnvelope | null = tryParseChessCommandEnvelope(data);
					if (!envelope) {
						reject('schema_invalid');
						break;
					}

					const expectedMatchId = matchIdRef.current;
					if (!expectedMatchId) {
						reject('no_match_id_yet');
						break;
					}
					if (envelope.matchId !== expectedMatchId) {
						reject('match_id_mismatch');
						break;
					}
					const chessOpponentPubkey = opponentSessionPubkeyRef.current;
					const chessSession = usePeerStore.getState();
					if (!chessSession.p2pSessionLocalAuthorized
						|| !chessSession.p2pSessionRemoteAuthorized
						|| !chessOpponentPubkey
						|| !envelope.signerPubkey
						|| !envelope.signature) {
						reject('session_authorization_required');
						break;
					}
					if (envelope.signerPubkey !== chessOpponentPubkey
						|| !await verifyGameplayEnvelope({
							matchId: envelope.matchId,
							seq: envelope.seq,
							commandId: envelope.commandId,
							prevStateHash: `${envelope.prevChessStateHash}|${envelope.prevCardsStateHash}`,
							command: envelope.command,
						}, envelope.signature, envelope.signerPubkey)) {
						reject('invalid_gameplay_signature');
						break;
					}
					const cachedReceipt = chessReceiptByCommandIdRef.current.get(envelope.commandId);
						if (cachedReceipt) {
							send(cachedReceipt);
						debug.log('[wireSync] replayed cached transition receipt', {
							commandId: envelope.commandId.slice(0, 8),
						});
						break;
					}

					// WebSocket ordering plus one sender-local counter gives a strict,
					// contiguous sequence for this direction. Reject gaps and repeated
					// sequence numbers even when commandId differs: both would make a
					// transition receipt ambiguous during replay.
					const expectedChessSeq = lastIncomingChessSeqRef.current + 1;
					if (envelope.seq !== expectedChessSeq) {
						quarantineP2PSession(envelope.seq > expectedChessSeq
							? 'remote_chess_command_sequence_gap'
							: 'remote_chess_command_sequence_replay');
						reject(`seq_mismatch_expected_${expectedChessSeq}_got_${envelope.seq}`);
						break;
					}

					if (seenChessCommandIdsRef.current.has(envelope.commandId)) {
						reject(`duplicate_command_id_${envelope.commandId.slice(0, 8)}`);
						break;
					}

					// Rate limit shares the cards/poker bucket.
					const nowChess = Date.now();
					actionTimestampsRef.current = actionTimestampsRef.current.filter(t => nowChess - t < 1000);
					if (actionTimestampsRef.current.length >= MAX_ACTIONS_PER_SEC) {
						reject('rate_limit_exceeded');
						break;
					}
					actionTimestampsRef.current.push(nowChess);

					// Dual prev-state-hash validation (TD-27c-chess). Empty hashes
					// from the peer mean a well-known race (state pre-init, eager
					// WASM load) — drop without rejecting so the sender can retry on
					// the next attempt; same policy as missing_prev_state_hash on
					// the cards path. Mismatch with non-empty claim is a hard reject
					// with the domain-specific code so post-incident triage points
					// at the right slice.
					let preCheckpoint: ReturnType<typeof buildChessIntegrityCheckpoint> = null;
					{
						const senderChessHash = envelope.prevChessStateHash;
						const senderCardsHash = envelope.prevCardsStateHash;
						if (senderChessHash.length === 0 || senderCardsHash.length === 0) {
							reject('missing_prev_state_hash');
							break;
						}
						const lifecycle = usePeerStore.getState().battleLifecycle;
						if (lifecycle?.phase === 'resolved' || lifecycle?.phase === 'cancelled') {
							reject('match_terminal');
							break;
						}
						const localChessSnapshot = useUnifiedCombatStore.getState().boardState ?? null;
						const localChessHash = computeChessPrevStateHash(localChessSnapshot);
						const localCardsHash = computeCardsPrevStateHash(
							useGameStore.getState().gameState,
								isCardsCanonicalPlayerFrameRef.current,
						);
						if (localChessHash.length === 0 || localCardsHash.length === 0) {
							// Receiver-side race; ask sender to retry by bouncing the
							// envelope. Same fail-safe as the cards path.
							reject('local_prev_state_hash_unavailable');
							break;
						}
						if (senderChessHash !== localChessHash) {
							quarantineP2PSession(`chess_prev_hash_mismatch_seq_${envelope.seq}`);
							reject(`prev_chess_state_hash_mismatch_local_${localChessHash.slice(0, 16)}_got_${senderChessHash.slice(0, 16)}`);
							break;
						}
						if (senderCardsHash !== localCardsHash) {
							quarantineP2PSession(`chess_cards_prev_hash_mismatch_seq_${envelope.seq}`);
							reject(`prev_cards_state_hash_mismatch_local_${localCardsHash.slice(0, 16)}_got_${senderCardsHash.slice(0, 16)}`);
							break;
						}
						preCheckpoint = buildChessIntegrityCheckpoint({
							matchId: envelope.matchId,
							chessHash: localChessHash,
							cardsHash: localCardsHash,
						});
						if (preCheckpoint === null) {
							reject('integrity_root_unavailable');
							break;
						}
					}
					if (preCheckpoint === null) {
						break;
					}

						const cs = useUnifiedCombatStore.getState();
						const pieces = cs.boardState?.pieces ?? [];

					// Capture command in a const so TS preserves discriminated-union
					// narrowing across the branches below — accessing
					// `envelope.command` repeatedly loses the narrow because TS
					// treats property reads on objects as pessimistic.
					const cmd = envelope.command;
					const intentHash = computeTransitionIntentHash({
						matchId: envelope.matchId,
						seq: envelope.seq,
						commandId: envelope.commandId,
						prevRoot: preCheckpoint.root,
						action: cmd,
					});
					const emitTransitionReceipt = (receipt: TransitionReceiptMessage): void => {
						chessReceiptByCommandIdRef.current.set(receipt.commandId, receipt);
						chessReceiptCommandOrderRef.current.push(receipt.commandId);
						while (chessReceiptCommandOrderRef.current.length > SEEN_COMMAND_IDS_MAX) {
							const evicted = chessReceiptCommandOrderRef.current.shift();
							if (evicted !== undefined) {
								chessReceiptByCommandIdRef.current.delete(evicted);
							}
						}
						send(receipt);
					};

					// `myCanonicalSide` is available only after the seed handshake. A
					// remote mine must be authored by the other side, just like a remote
					// piece move; never trust the viewer-relative label from the UI.
					const mySide = useGameStore.getState().myCanonicalSide;
					if (!mySide) {
						reject('canonical_side_unresolved');
						break;
					}

					let transcriptAction: 'chess_move' | 'chess_attack' | 'chess_combat_initiated' | 'chess_mine_placement';
					let transcriptPayload: Record<string, unknown>;
					let mutationResult: ReturnType<typeof cs.executeMove> | null = null;

					if (cmd.type === 'chess_mine_placement') {
						if (cmd.owner === mySide) {
							reject('remote_attempting_to_place_my_mine');
							break;
						}
						if (cs.boardState?.currentTurn !== cmd.owner) {
							reject('not_current_turn');
							break;
						}
						const kingState = cmd.owner === 'player' ? cs.playerKingAbility : cs.opponentKingAbility;
						if (!kingState || kingState.kingId !== cmd.kingId) {
							reject('mine_king_mismatch');
							break;
						}
						const config = getKingAbilityConfig(cmd.kingId);
						if (!config) {
							reject('mine_king_configuration_unavailable');
							break;
						}
						if (requiresDirectionSelection(cmd.kingId) && cmd.direction === undefined) {
							reject('mine_direction_required');
							break;
						}
						if (!requiresDirectionSelection(cmd.kingId) && cmd.direction !== undefined) {
							reject('mine_direction_not_allowed');
							break;
						}
						if (cs.allActiveMines.some(mine => mine.id === cmd.mineId)) {
							reject('mine_id_already_used');
							break;
						}
						const matchSeed = useGameStore.getState().matchSeed;
						if (!matchSeed) {
							reject('mine_match_seed_unavailable');
							break;
						}
						const expectedTiles = getMineShapeTiles(
							cmd.kingId,
							cmd.position,
							cmd.direction,
							cmd.owner === 'player' ? 'opponent' : 'player',
							seededRngFromString(`${matchSeed}:king-mine:${cmd.mineId}`),
						);
						if (expectedTiles.length !== cmd.affectedTiles.length || expectedTiles.some((tile, index) => (
							tile.row !== cmd.affectedTiles[index]?.row || tile.col !== cmd.affectedTiles[index]?.col
						))) {
							reject('mine_tiles_not_deterministic');
							break;
						}
						const ownPieces = pieces.filter(piece => piece.owner === cmd.owner).map(piece => piece.position);
						const placementValidation = isValidMinePlacement(
							cmd.position,
							cmd.kingId,
							cs.allActiveMines,
							ownPieces,
							cmd.owner,
							cmd.direction,
							cmd.affectedTiles,
						);
						if (!placementValidation.valid) {
							reject(`mine_invalid_${placementValidation.reason ?? 'placement'}`);
							break;
						}
						if (!cs.placeMine || !cs.placeMine(cmd.owner, cmd.position, cmd.direction, {
							mineId: cmd.mineId,
							affectedTiles: cmd.affectedTiles,
						})) {
							reject('mine_reducer_rejected');
							break;
						}
						transcriptAction = 'chess_mine_placement';
						transcriptPayload = {
							owner: cmd.owner,
							kingId: cmd.kingId,
							position: cmd.position,
							...(cmd.direction === undefined ? {} : { direction: cmd.direction }),
							mineId: cmd.mineId,
							affectedTiles: cmd.affectedTiles,
						};
					} else {
						const attacker = pieces.find(p => p.id === cmd.pieceId);
						if (!attacker) {
							debug.warn('[wireSync] chess attacker_not_found roster dump', {
								expectedId: cmd.pieceId,
								commandType: cmd.type,
								from: cmd.from,
								to: cmd.to,
								localPieceCount: pieces.length,
								localIds: pieces.map(p => p.id.slice(0, 8)),
							});
							reject(`attacker_not_found_${cmd.pieceId.slice(0, 8)}`);
							break;
						}
						if (attacker.position.row !== cmd.from.row || attacker.position.col !== cmd.from.col) {
							reject('attacker_position_mismatch');
							break;
						}
						if (attacker.owner === mySide) {
							reject('remote_attempting_to_move_my_piece');
							break;
						}
						if (cs.boardState?.currentTurn !== attacker.owner) {
							reject('not_current_turn');
							break;
						}
						if (cmd.type === 'chess_move') {
							if (!cs.executeMove) {
								reject('execute_move_unavailable');
								break;
							}
							mutationResult = cs.executeMove(cmd.from, cmd.to);
							transcriptAction = 'chess_move';
							transcriptPayload = { pieceId: cmd.pieceId, from: cmd.from, to: cmd.to };
						} else {
							const defender = pieces.find(p => p.id === cmd.defenderId);
							if (!defender) {
								debug.warn('[wireSync] chess defender_not_found roster dump', {
									expectedId: cmd.defenderId,
									to: cmd.to,
									localPieceCount: pieces.length,
									localIds: pieces.map(p => p.id.slice(0, 8)),
								});
								reject(`defender_not_found_${cmd.defenderId.slice(0, 8)}`);
								break;
							}
							if (defender.position.row !== cmd.to.row || defender.position.col !== cmd.to.col) {
								reject('defender_position_mismatch');
								break;
							}
							if (defender.owner === attacker.owner) {
								reject('cannot_attack_own_piece');
								break;
							}
							if (!cs.beginChessAttack) {
								reject('begin_chess_attack_unavailable');
								break;
							}
							const instantKill = isChessAttackInstantKill({ attackerType: attacker.type, defenderType: defender.type });
							if (cmd.type === 'chess_attack' && !instantKill) {
								reject('chess_attack_requires_instant_capture');
								break;
							}
							if (cmd.type === 'chess_combat_initiated' && instantKill) {
								reject('chess_combat_initiated_requires_non_instant_capture');
								break;
							}
							mutationResult = cs.beginChessAttack(attacker, defender, instantKill);
							transcriptAction = cmd.type;
							transcriptPayload = {
								pieceId: cmd.pieceId,
								from: cmd.from,
								to: cmd.to,
								defenderId: cmd.defenderId,
								isInstantKill: instantKill,
							};
						}
					}

					if (mutationResult?.status === 'rejected') {
						emitTransitionReceipt({
							type: 'transition_receipt_v1',
							protocolVersion: CHESS_INTEGRITY_PROTOCOL_VERSION,
							scope: CHESS_INTEGRITY_SCOPE,
							matchId: envelope.matchId,
							seq: envelope.seq,
							commandId: envelope.commandId,
							intentHash,
							status: 'rejected',
							currentRoot: preCheckpoint.root,
							reason: mutationResult.reason,
						});
						reject(`reducer_${mutationResult.reason}`);
						break;
					}

					const postCheckpoint = captureChessIntegrityCheckpoint({
						matchId: envelope.matchId,
								isCardsAuthority: isCardsCanonicalPlayerFrameRef.current,
					});
					if (postCheckpoint === null) {
						chessIntegrityMonitor.quarantine({
							reason: 'local_checkpoint_unavailable',
							commandId: envelope.commandId,
							expectedRoot: preCheckpoint.root,
							receivedRoot: null,
							detail: 'post-transition chess+cards checkpoint is unavailable',
						});
						emitTransitionReceipt({
							type: 'transition_receipt_v1',
							protocolVersion: CHESS_INTEGRITY_PROTOCOL_VERSION,
							scope: CHESS_INTEGRITY_SCOPE,
							matchId: envelope.matchId,
							seq: envelope.seq,
							commandId: envelope.commandId,
							intentHash,
							status: 'rejected',
							currentRoot: preCheckpoint.root,
							reason: 'integrity-root-unavailable',
						});
						reject('post_integrity_root_unavailable');
						break;
					}

					emitTransitionReceipt({
						type: 'transition_receipt_v1',
						protocolVersion: CHESS_INTEGRITY_PROTOCOL_VERSION,
						scope: CHESS_INTEGRITY_SCOPE,
						matchId: envelope.matchId,
						seq: envelope.seq,
						commandId: envelope.commandId,
						intentHash,
						status: 'applied',
						prevRoot: preCheckpoint.root,
						nextRoot: postCheckpoint.root,
					});

					// Mark applied: advance chess seq + register commandId in dedup ring.
					lastIncomingChessSeqRef.current = envelope.seq;
					seenChessCommandIdsRef.current.add(envelope.commandId);
					seenChessCommandIdsOrderRef.current.push(envelope.commandId);
						while (seenChessCommandIdsOrderRef.current.length > SEEN_COMMAND_IDS_MAX) {
						const evicted = seenChessCommandIdsOrderRef.current.shift();
						if (evicted !== undefined) seenChessCommandIdsRef.current.delete(evicted);
						}
						const actorId = usePeerStore.getState().remotePeerId;
						const transcriptCanonicalOrder = actorId
							? commitNextP2PCanonicalAction({ actionId: envelope.commandId, actorId })
							: null;
						if (!actorId || transcriptCanonicalOrder === null) {
							quarantineP2PSession('remote_chess_canonical_order_unavailable');
							reject('canonical_order_unavailable');
							break;
						}
						if (cmd.type !== 'chess_mine_placement' && !startP2PBattleFromAcceptedChessAction({
							moveId: envelope.commandId,
							actorId,
							canonicalOrder: transcriptCanonicalOrder,
						})) {
							quarantineP2PSession('remote_chess_battle_start_unavailable');
							reject('battle_start_unavailable');
							break;
						}

						// Transcript: record under the remote peer's Hive identity so
					// the host's merkle root (which goes on-chain via
					// BlockchainSubscriber.ts:279) attributes the action correctly.
					const recorded = recordMove(transcriptAction, {
						...transcriptPayload,
						commandId: envelope.commandId,
						seq: envelope.seq,
						}, remotePlayerId({
							opponentUsername: opponentUsernameRef.current,
							remotePeerId: usePeerStore.getState().remotePeerId,
						}), transcriptCanonicalOrder);
					if (!recorded) {
						quarantineP2PSession('remote_chess_transcript_unavailable');
						reject('transcript_unavailable');
						break;
					}

						debug.log(cmd.type === 'chess_mine_placement'
							? `[wireSync] chess_command APPLIED: ${transcriptAction} mine=${cmd.mineId.slice(0, 8)} (${cmd.position.row},${cmd.position.col})`
							: `[wireSync] chess_command APPLIED: ${transcriptAction} piece=${cmd.pieceId.slice(0, 8)} (${cmd.from.row},${cmd.from.col})→(${cmd.to.row},${cmd.to.col})`);
						break;
					}

				case 'action_applied_v1': {
					settlePokerActionApplied(data);
					settleCardsActionApplied(data);
					break;
				}

				case 'poker_action': {
					const nowP = Date.now();
					actionTimestampsRef.current = actionTimestampsRef.current.filter(t => nowP - t < 1000);
					if (actionTimestampsRef.current.length >= MAX_ACTIONS_PER_SEC) break;
					actionTimestampsRef.current.push(nowP);
					const pokerMatchId = matchIdRef.current;
					const pokerSession = usePeerStore.getState();
					const pokerOpponentPubkey = opponentSessionPubkeyRef.current;
					if (!pokerMatchId
						|| !pokerSession.p2pSessionLocalAuthorized
						|| !pokerSession.p2pSessionRemoteAuthorized
						|| !pokerOpponentPubkey
						|| data.seq === undefined
						|| !data.prevStateHash
						|| !data.signerPubkey
						|| !data.signature
						|| data.signerPubkey !== pokerOpponentPubkey) break;
					const pokerSignatureCommand = buildPokerGameplayCommand({
						playerId: data.playerId,
						action: data.action,
						origin: data.origin,
						hpCommitment: data.hpCommitment,
						compact: data.compact,
						turnId: data.turnId,
						decisionId: data.decisionId,
						sentAtMs: data.sentAtMs ?? 0,
					});
					if (!await verifyGameplayEnvelope({
						matchId: pokerMatchId,
						seq: data.seq,
						commandId: data.decisionId,
						prevStateHash: data.prevStateHash,
						command: pokerSignatureCommand,
					}, data.signature, data.signerPubkey)) break;

						const combatAction = readCombatAction(data.action);
						if (!combatAction) break;
						if (data.hpCommitment !== undefined && (typeof data.hpCommitment !== 'number' || data.hpCommitment < 0 || data.hpCommitment > 500)) break;
						if (!isPokerActionCompactConsistent({
							action: data.action,
						hpCommitment: data.hpCommitment,
						compact: data.compact,
					})) {
						debug.warn('[wireSync] poker_action dropped — compact tuple mismatch', {
							action: data.action,
							hpCommitment: data.hpCommitment,
						});
						break;
					}

					const pokerAdapter = getP2PPokerCombatAdapter();
					const pokerState = pokerAdapter.getPokerState();
					if (!pokerState || pokerState.foldWinner) break;
					if (pokerState.phase === CombatPhase.RESOLUTION) break;
					if (computePokerCombatStateHash(pokerState) !== data.prevStateHash) {
						debug.warn('[wireSync] poker_action dropped — previous state hash mismatch');
						quarantineP2PSession(`poker_prev_hash_mismatch_${data.turnId}`);
						break;
					}

					if (typeof data.playerId !== 'string' || data.playerId.length > 128) break;
					if (!data.turnId || !pokerState.turnId || data.turnId !== pokerState.turnId) {
						debug.warn('[wireSync] poker_action dropped — turnId mismatch', {
							received: data.turnId,
							expected: pokerState.turnId,
						});
						break;
					}
					if (data.playerId !== pokerState.opponent.playerId) {
						debug.warn('[wireSync] poker_action dropped — remote actor mismatch', {
							received: data.playerId,
							expected: pokerState.opponent.playerId,
						});
						break;
					}
					if (pokerState.activePlayerId !== data.playerId) break;
					const pokerDecisionLedger = { seen: seenPokerDecisionIdsRef.current, order: seenPokerDecisionIdsOrderRef.current };
					if (hasRemotePokerDecision(pokerDecisionLedger, data.decisionId)) {
						debug.warn('[wireSync] poker_action dropped — duplicate decisionId', {
							decisionId: data.decisionId.slice(0, 24),
						});
						break;
					}
					const actionResult = pokerAdapter.applyRemotePokerAction({
						playerId: data.playerId,
						action: combatAction,
						origin: data.origin,
						hpCommitment: data.hpCommitment,
						nowMs: getCanonicalPokerActionNowMs({
							origin: data.origin,
							deadlineAtMs: pokerState.turnDeadlineAtMs,
						}),
					});
					settleRemotePokerAction(actionResult, {
						onRejected: (reason) => {
							debug.warn('[wireSync] poker_action rejected by engine', {
								reason,
								decisionId: data.decisionId.slice(0, 24),
							});
						},
						onApplied: () => {
							commitRemotePokerDecision(pokerDecisionLedger, data.decisionId, SEEN_COMMAND_IDS_MAX);
							const remoteActorId = usePeerStore.getState().remotePeerId;
							const canonicalOrder = remoteActorId
								? commitNextP2PCanonicalAction({ actionId: data.decisionId, actorId: remoteActorId })
								: null;
							if (canonicalOrder === null) {
								quarantineP2PSession('remote_poker_canonical_order_unavailable');
								return;
							}
							const recorded = recordMove('poker_action', {
								action: data.action,
								origin: data.origin,
								hpCommitment: data.hpCommitment,
								turnId: data.turnId,
								decisionId: data.decisionId,
							}, remotePlayerId({
								opponentUsername: opponentUsernameRef.current,
								remotePeerId: usePeerStore.getState().remotePeerId,
							}), canonicalOrder);
							if (!recorded) {
								quarantineP2PSession('remote_poker_transcript_unavailable');
								return;
							}
							pokerAdapter.maybeCloseBettingRound();
							const resultingStateHash = computePokerCombatStateHash(pokerAdapter.getPokerState());
							if (resultingStateHash && data.seq !== undefined) {
								const receipt = buildActionAppliedMessage({
									matchId: pokerMatchId,
									transportEpoch: readConnectionTransportEpoch(usePeerStore.getState().connection),
									decisionId: data.decisionId,
									seq: data.seq,
									resultingStateHash,
								});
								const active = usePeerStore.getState().connection;
								if (active?.controlAvailable && active.sendControlMessage) {
									try { active.sendControlMessage(receipt); }
									catch (error) { debug.warn('[wireSync] failed to send poker action applied receipt', error); }
								} else {
									send(receipt);
								}
							}
						},
					});
					break;
					}

					case 'poker_turn_started': {
						debug.warn('[wireSync] Dropped peer-sent poker_turn_started — relay consumes clock proposals');
						break;
					}

				case 'gameState':
					// A peer-authored full state is not an authority-bearing recovery
					// message. Applying it would let a forged frame overwrite canonical
					// cards state without replaying signed commands. Recovery is fail
					// closed until the agreed-root transcript replay path is complete.
					debug.warn('[wireSync] Dropped unsolicited gameState snapshot — signed replay required');
					break;

					case 'opponentDisconnected':
						debug.warn('[wireSync] Dropped peer-authored opponentDisconnected — transport close is the only disconnect signal');
						break;

					case 'p2p_leave': {
						const peer = usePeerStore.getState();
						const activeMatchId = matchIdRef.current ?? peer.battleLifecycle?.matchId;
						if (!activeMatchId || data.matchId !== activeMatchId) {
							debug.warn('[wireSync] p2p_leave rejected — match identity mismatch');
							break;
						}
						if (!peer.remotePeerId || data.participantId !== peer.remotePeerId) {
							debug.warn('[wireSync] p2p_leave rejected — participant is not the remote peer');
							break;
						}
						const lifecycle = peer.recordRemoteP2PLeave(data.participantId, data.eventId);
						debug.log('[wireSync] remote p2p_leave applied', {
							eventId: data.eventId,
							phase: lifecycle?.phase,
						});
						break;
					}

					case 'ping':
					send({ type: 'pong' });
					break;

				case 'pong':
					// Residual ack of our ping (legacy keepalive scheme — modern keepalive
					// is the dedicated `heartbeat` message handled at the top). No action
					// needed; just silently consume so the default branch doesn't log a
					// spurious "Unknown message type: pong" warning.
					break;

				case 'army_announcement':
					// Opponent announced their selected army. Store so the match coordinator
					// can render the real hero portraits instead of the default fallback.
					if (data.army && typeof data.army === 'object') {
						usePeerStore.getState().setOpponentArmy(data.army);
						debug.log('[wireSync] Opponent army received:', {
							king: data.army.king?.name,
							queen: data.army.queen?.name,
							rook: data.army.rook?.name,
						});
					}
					break;

				case 'deck_verify': {
					remoteDeckClaimsRef.current = { hiveAccount: data.hiveAccount, claims: data.claims };
					verifyRemoteDeck();
					break;
				}

				case 'result_propose': {
					if (!data.result || !data.hash || typeof data.hash !== 'string' ||
						!data.result.winner?.username || !data.result.loser?.username) {
						recordSessionEvent('result_rejected', {
							reason: 'malformed_proposal',
							proposalId: data.proposalId,
							matchId: data.result?.matchId,
							proposerWinner: data.result?.winner?.username,
							proposerLoser: data.result?.loser?.username,
						});
						send({ type: 'result_reject', reason: 'malformed_proposal' });
						break;
					}

					const localTranscript = getActiveTranscript();
					let localTranscriptRoot: string | null = null;
					if (localTranscript) {
						try {
							localTranscriptRoot = await localTranscript.buildMerkleTree();
						} catch (err) {
							debug.warn('[wireSync] Failed to build local transcript root for result proposal:', err);
						}
					}
					const transcriptCheck = verifyResultProposalTranscriptRoot({
						result: data.result as PackagedMatchResult,
						localRoot: localTranscriptRoot,
					});
					if (transcriptCheck.status === 'rejected') {
						recordSessionEvent('result_rejected', {
							reason: transcriptCheck.reason,
							proposalId: data.proposalId,
							matchId: data.result.matchId,
							proposerWinner: data.result.winner.username,
							proposerLoser: data.result.loser.username,
							localRootPrefix: transcriptCheck.localRoot?.slice(0, 12),
							proposedRootPrefix: transcriptCheck.proposedRoot?.slice(0, 12),
						});
						send({ type: 'result_reject', reason: transcriptCheck.reason });
						break;
					}

					const expectedCommitmentHash = await computeMatchResultCommitmentHash(data.result as PackagedMatchResult);
					if (expectedCommitmentHash !== data.hash) {
						recordSessionEvent('result_rejected', {
							reason: 'commitment_mismatch',
							proposalId: data.proposalId,
							matchId: data.result.matchId,
							proposerWinner: data.result.winner.username,
							proposerLoser: data.result.loser.username,
							expectedCommitmentHash,
							proposedCommitmentHash: data.hash,
						});
						send({ type: 'result_reject', reason: 'commitment_mismatch' });
						break;
					}

					if (isSharedNetworkEnvironment() && data.result.matchId) {
						const proposerUsername = data.result.winner?.username || data.result.loser?.username;
						findExistingMatchResult(data.result.matchId, proposerUsername)
							.then(existingTrxId => {
									if (existingTrxId) {
										deferSlashEvidence({
											matchId: data.result.matchId,
											offender: proposerUsername,
											reason: 'double_result',
											trxId1: existingTrxId,
											trxId2: data.hash,
											notes: `Duplicate match result proposed for matchId ${data.result.matchId}`,
										});
									}
								})
							.catch(err => debug.warn('[wireSync] Failed to check existing match result:', err));
					}

					const gs = useGameStore.getState().gameState;
					const myWinner = gs?.winner;

					const clientUsername = getNFTBridge().getUsername();
					const iAmWinner = myWinner === 'player';
					const resultSaysIWon = data.result.winner.username === clientUsername;
					const resultSaysILost = data.result.loser.username === clientUsername;

						if ((iAmWinner && resultSaysIWon) || (!iAmWinner && resultSaysILost)) {
							recordSessionEvent('result_rejected', {
								reason: 'signature_deferred',
								proposalId: data.proposalId,
								matchId: data.result.matchId,
								proposerWinner: data.result.winner.username,
								proposerLoser: data.result.loser.username,
								clientUsername,
								myWinner,
							});
							GameEventBus.emitNotification({
								level: 'warning',
								message: 'Opponent requested result signing. Hidden Keychain prompts are disabled until the result review flow is ready.',
								duration: 8000,
							});
							send({ type: 'result_reject', reason: 'signature_deferred' });
					} else if (!clientUsername) {
						recordSessionEvent('result_rejected', {
							reason: 'no_hive_account',
							proposalId: data.proposalId,
							matchId: data.result.matchId,
							proposerWinner: data.result.winner.username,
							proposerLoser: data.result.loser.username,
							myWinner,
						});
						send({ type: 'result_reject', reason: 'no_hive_account' });
					} else {
						// Strong divergence signal — proposer claims one outcome,
						// our local game state disagrees. Persist context for audit.
						recordSessionEvent('result_rejected', {
							reason: 'winner_mismatch',
							proposalId: data.proposalId,
							matchId: data.result.matchId,
							proposerWinner: data.result.winner.username,
							proposerLoser: data.result.loser.username,
							clientUsername,
							myWinner,
						});
						send({ type: 'result_reject', reason: 'winner_mismatch' });
					}
					break;
				}

				case 'result_countersign': {
					const pending = pendingResultRef.current;
					if (pending) {
						pending.resolve({
							broadcaster: pending.broadcasterSig,
							counterparty: data.counterpartySig,
						});
						pendingResultRef.current = null;
					}
					break;
				}

				case 'result_reject': {
					const pending = pendingResultRef.current;
					if (pending) {
						pending.reject(new Error(`Result rejected: ${data.reason}`));
						pendingResultRef.current = null;
					}
					break;
				}

				case 'session_authorize': {
					// Quick Match carries the already-verified Accept proof. V2 binds
					// the ephemeral key once at FIND and uses local Ed25519 at ACCEPT.
					if (data.matchId !== matchIdRef.current) {
						debug.warn('[wireSync] session_authorize matchId mismatch — ignoring', {
							received: data.matchId,
							expected: matchIdRef.current,
						});
						break;
					}
					if (data.acceptance) {
						const remoteAcceptance = readMatchAcceptanceProof(data.acceptance);
						if (!remoteAcceptance) {
							debug.warn('[wireSync] session_authorize dropped — malformed match acceptance');
							usePeerStore.getState().setP2pSessionAuthorization({
								remoteAuthorized: false,
								error: 'Opponent match acceptance verification failed',
							});
							break;
						}
						const remoteDelegation = data.delegation ? readMatchmakingDelegationProof(data.delegation) : null;
						const localAcceptance = getCachedMatchAcceptance();
						const offer = localAcceptance?.offer;
						const isV2 = remoteAcceptance?.protocol === 'ragnarok-match-accept-v2';
						const proofMatchesLocalOffer = Boolean(offer
							&& remoteAcceptance.offerId === offer.offerId
							&& remoteAcceptance.matchId === offer.matchId
							&& remoteAcceptance.peerId === offer.opponent.peerId
							&& remoteAcceptance.opponentPeerId === offer.player.peerId
							&& remoteAcceptance.serverNonce === offer.serverNonce
							&& remoteAcceptance.expiresAt === offer.expiresAt
							&& remoteAcceptance.ephemeralPubkey === data.ephemeralPubkey
							&& (isV2 ? remoteAcceptance.delegationId === remoteDelegation?.delegationId : remoteAcceptance.hiveSig === data.hiveSig)
							&& remoteAcceptance.rulesetHash === localAcceptance?.proof.rulesetHash
							&& remoteAcceptance.engineHash === localAcceptance?.proof.engineHash
							&& (!offer.player.username || remoteAcceptance.opponentAccount === offer.player.username)
							&& (!offer.opponent.username || remoteAcceptance.account === offer.opponent.username));
						let acceptanceValid = proofMatchesLocalOffer;
						if (acceptanceValid && isSharedNetworkEnvironment()) {
							if (isV2) {
								if (!remoteAcceptance.account || !remoteDelegation
									|| remoteDelegation.account !== remoteAcceptance.account
									|| remoteDelegation.peerId !== remoteAcceptance.peerId
									|| remoteDelegation.ephemeralPubkey !== remoteAcceptance.ephemeralPubkey
									|| remoteDelegation.rulesetHash !== remoteAcceptance.rulesetHash
									|| remoteDelegation.engineHash !== remoteAcceptance.engineHash
									|| !isCurrentMatchmakingDelegation(remoteDelegation)) {
									acceptanceValid = false;
								} else {
									const { hiveSig, ...delegationPayload } = remoteDelegation;
									const { sessionSig, ...acceptancePayload } = remoteAcceptance;
									const hiveValid = await verifyHiveSignature(
										remoteDelegation.account,
										buildMatchmakingDelegationMessage(delegationPayload),
										hiveSig,
									);
									const sessionValid = await verifyEnvelope(
										new TextEncoder().encode(buildMatchAcceptanceV2Message(acceptancePayload)),
										sessionSig,
										remoteAcceptance.ephemeralPubkey,
									);
									acceptanceValid = hiveValid && sessionValid;
								}
							} else if (!remoteAcceptance.account || !remoteAcceptance.hiveSig) {
								acceptanceValid = false;
							} else {
								const { hiveSig, ...payload } = remoteAcceptance;
								acceptanceValid = await verifyHiveSignature(
									remoteAcceptance.account,
									buildMatchAcceptanceMessage(payload),
									hiveSig,
								);
							}
						}
						if (!acceptanceValid) {
							debug.warn('[wireSync] session_authorize dropped — match acceptance verification failed');
							usePeerStore.getState().setP2pSessionAuthorization({
								remoteAuthorized: false,
								error: 'Opponent match acceptance verification failed',
							});
							break;
						}
						opponentSessionPubkeyRef.current = remoteAcceptance.ephemeralPubkey;
						opponentSessionHiveSigRef.current = remoteDelegation?.hiveSig ?? remoteAcceptance.hiveSig ?? data.hiveSig ?? null;
						usePeerStore.getState().setP2pSessionAuthorization({ remoteAuthorized: true, error: null });
						debug.log('[wireSync] Verified opponent match acceptance', { matchId: data.matchId });
						requeuePendingActionEnvelopes();
						break;
					}
					if (useMatchmakingStore.getState().matchCommitted) {
						debug.warn('[wireSync] Quick Match session_authorize missing acceptance proof');
						usePeerStore.getState().setP2pSessionAuthorization({
							remoteAuthorized: false,
							error: 'Opponent Quick Match acceptance proof is missing',
						});
						break;
					}

					const opponentUsername = opponentUsernameRef.current;
					if (!opponentUsername) {
						debug.warn('[wireSync] session_authorize dropped — no opponent Hive username');
						usePeerStore.getState().setP2pSessionAuthorization({
							remoteAuthorized: false,
							error: 'Missing opponent Hive username',
						});
						break;
					}

					const expectedChallenges = getSessionAuthChallenges();
					if (expectedChallenges.length > 0) {
						if (!data.matchChallenge) {
							debug.warn('[wireSync] session_authorize dropped — expected match challenge missing', {
								opponentUsername,
								matchId: data.matchId,
							});
							usePeerStore.getState().setP2pSessionAuthorization({
								remoteAuthorized: false,
								error: 'Missing opponent match challenge',
							});
							break;
						}
						const matchedChallenge = findMatchingSessionAuthChallenge(data.matchChallenge);
						if (!matchedChallenge) {
							debug.warn('[wireSync] session_authorize dropped — match challenge mismatch', {
								opponentUsername,
								matchId: data.matchId,
							});
							usePeerStore.getState().setP2pSessionAuthorization({
								remoteAuthorized: false,
								error: 'Opponent match challenge mismatch',
							});
							break;
						}
						if (!isFreshMatchChallenge(matchedChallenge)) {
							debug.warn('[wireSync] session_authorize dropped — opponent match challenge expired', {
								opponentUsername,
								matchId: data.matchId,
							});
							usePeerStore.getState().setP2pSessionAuthorization({
								remoteAuthorized: false,
								error: 'Opponent match challenge expired',
							});
							break;
						}
					}

					if (!data.hiveSig) {
						usePeerStore.getState().setP2pSessionAuthorization({
							remoteAuthorized: false,
							error: 'Missing Hive session authorization signature',
						});
						break;
					}
					const authorizeMessage = buildSessionAuthorizeMessage(
						data.matchId,
						data.ephemeralPubkey,
						data.matchChallenge,
					);
					const sigValid = await verifyHiveSignature(opponentUsername, authorizeMessage, data.hiveSig);
					if (!sigValid) {
						debug.warn('[wireSync] session_authorize dropped — Hive signature verification failed', {
							opponentUsername,
							matchId: data.matchId,
							pubkeyPrefix: data.ephemeralPubkey.slice(0, 8),
						});
						usePeerStore.getState().setP2pSessionAuthorization({
							remoteAuthorized: false,
							error: 'Opponent Hive signature verification failed',
						});
						break;
					}
					if (opponentSessionPubkeyRef.current && opponentSessionPubkeyRef.current !== data.ephemeralPubkey) {
						debug.warn('[wireSync] session_authorize replaced opponent pubkey mid-match — possible re-key', {
							before: opponentSessionPubkeyRef.current.slice(0, 8),
							after: data.ephemeralPubkey.slice(0, 8),
						});
					}
					opponentSessionPubkeyRef.current = data.ephemeralPubkey;
					opponentSessionHiveSigRef.current = data.hiveSig;
					usePeerStore.getState().setP2pSessionAuthorization({
						remoteAuthorized: true,
					});
					debug.log('[wireSync] Cached opponent session_authorize', {
						matchId: data.matchId,
						pubkeyPrefix: data.ephemeralPubkey.slice(0, 8),
					});
					requeuePendingActionEnvelopes();
					break;
				}

				case 'session_renewal': {
					// ADR 0004 §Decision.6 B–E (issue 06). Opponent reloaded;
					// they generated a fresh ephemeral keypair and re-bound it
					// to their Hive identity. Validate the Hive sig and accept
					// the new pubkey for the remainder of the match.
					const activeMatchId = matchIdRef.current;
					const opponentUsername = opponentUsernameRef.current;
					if (!activeMatchId || !opponentUsername) {
						debug.warn('[wireSync] session_renewal dropped — no active match or opponent username', {
							hasMatchId: !!activeMatchId,
							hasOpponent: !!opponentUsername,
						});
						break;
					}
					try {
						const result = await verifyInboundRenewal({
							matchId: data.matchId,
							newPubkey: data.newPubkey,
							hiveSig: data.hiveSig,
							activeMatchId,
							verifyHiveSig: async (message, sig) => {
								// Recover the signing pubkey from the Hive sig
								// and confirm it's a known Hive Posting
								// authority for the opponent. The existing
								// p2pRelay path already attests the opponent's
								// account via seed_reveal, so trusting the
								// account-name binding here matches that level.
								return verifyHiveSignature(opponentUsername, message, sig);
							},
						});
						if (result.accepted) {
							opponentSessionPubkeyRef.current = data.newPubkey;
							opponentSessionHiveSigRef.current = data.hiveSig;
							usePeerStore.getState().setP2pSessionAuthorization({
								remoteAuthorized: true,
							});
							const lastSeen = signedTranscriptRef.current?.merkleRoot ?? '0'.repeat(64);
							send({ type: 'session_resumed', matchId: activeMatchId, lastSeenStateHash: lastSeen });
							debug.log('[wireSync] Accepted opponent session_renewal', {
								matchId: data.matchId,
								newPubkeyPrefix: data.newPubkey.slice(0, 8),
							});
							requeuePendingActionEnvelopes();
						} else {
							debug.warn('[wireSync] session_renewal rejected', { reason: result.reason });
						}
					} catch (err) {
						debug.error('[wireSync] session_renewal verification error:', err);
					}
					break;
				}

				case 'session_resumed': {
					// ADR 0004 §Decision.6 — opponent acknowledged OUR renewal
					// and reported the last state hash they saw. The actual
					// state reconciliation belongs to issue 07's smoke harness
					// (state_sync_request fallback path); Phase 0 only logs
					// here so the protocol bookkeeping completes.
					debug.log('[wireSync] Opponent session_resumed', {
						matchId: data.matchId,
						lastSeenStateHashPrefix: data.lastSeenStateHash.slice(0, 8),
						localRootPrefix: signedTranscriptRef.current?.merkleRoot.slice(0, 8) ?? '0'.repeat(8),
					});
					break;
				}

				case 'state_sync_request': {
					// ADR 0004 §Decision.6 — the resuming peer's local action
					// log was unavailable (private browsing, corruption). Send
					// our copy of the signed transcript for replay; the
					// resuming peer verifies every signature against the
					// active pubkeys before applying. Phase 0 sends the full
					// in-memory transcript leaves; if signedTranscriptRef is
					// empty, reply with zero leaves so they fall back to
					// other recovery paths.
					const activeId = matchIdRef.current;
					if (!activeId || data.matchId !== activeId) break;
					const tr = signedTranscriptRef.current;
					const leaves = tr ? tr.leaves.slice(data.fromTurn) : [];
					debug.log('[wireSync] state_sync_request — replying with', {
						matchId: data.matchId,
						leafCount: leaves.length,
						fromTurn: data.fromTurn,
					});
					// Re-emit each leaf in chain order. A partial replay cannot repair
					// the receiver's transcript, so never leave a rejection invisible.
					const replay = replayTranscriptLeaves({
						matchId: data.matchId,
						leaves,
						fromTurn: 0,
						send,
					});
					if (!replay.accepted) {
						debug.warn('[wireSync] state sync replay was only partially accepted', replay);
						quarantineP2PSession('state_sync_replay_transport_rejected');
					}
					break;
				}

				case 'action_envelope': {
					// ADR 0004 §Decision.4 (issue 03). Per-action signed
					// envelopes feed a parallel transcript (additive to the
					// symmetric `game_command` flow); the engine still applies
					// state from gameStore as before. Hold an early envelope until
					// `session_authorize`/`session_renewal` has populated the
					// transcript key; dropping it would make the eventual Merkle
					// root diverge even though the legacy command was applied.
					const tr = signedTranscriptRef.current;
					const oppPubkey = opponentSessionPubkeyRef.current;
					const myRole = myBroadcasterRef.current;
					if (!tr || !oppPubkey || !myRole) {
						const canAwaitSessionAuthorization = Boolean(
							sessionKeyRef.current
								&& matchIdRef.current === data.matchId,
						);
						if (!canAwaitSessionAuthorization) {
							debug.warn('[wireSync] action_envelope rejected — no session authorization in flight', {
								hasTranscript: !!tr,
								hasOpponentKey: !!oppPubkey,
								hasBroadcasterRole: !!myRole,
							});
							quarantineP2PSession('action_envelope_without_session_authorization');
							break;
						}
						const enqueueResult = enqueueWireMessage(
							pendingActionEnvelopeQueueRef.current,
							data,
							MAX_INBOUND_WIRE_QUEUE_SIZE,
						);
						if (!enqueueResult.accepted) {
							debug.warn('[wireSync] pending action_envelope queue overflow', {
								maxSize: MAX_INBOUND_WIRE_QUEUE_SIZE,
							});
							quarantineP2PSession('pending_action_envelope_queue_overflow');
							break;
						}
						debug.warn('[wireSync] action_envelope held — session handshake not ready', {
							hasTranscript: !!tr,
							hasOpponentKey: !!oppPubkey,
							hasBroadcasterRole: !!myRole,
						});
						break;
					}
					if (data.matchId !== tr.matchId) {
						debug.warn('[wireSync] action_envelope matchId mismatch', {
							got: data.matchId,
							expected: tr.matchId,
						});
						quarantineP2PSession('action_envelope_match_mismatch');
						break;
					}
					// The remote's broadcaster label is the opposite of ours
					// (A/B is a per-match canonical labelling, not viewer-
					// relative). We never trust a self-reported broadcaster
					// from the envelope — derived locally from myBroadcasterRef.
					const remoteBroadcaster: Broadcaster = myRole === 'A' ? 'B' : 'A';
					try {
						const next = await verifyAndAppendRemote(
							tr,
							{
								type: 'action_envelope',
								matchId: data.matchId,
								seq: data.seq,
								prevHash: data.prevHash,
								action: data.action,
								sig: data.sig,
							},
							oppPubkey,
							remoteBroadcaster,
						);
						if (next === tr) {
							transcriptOrderGateRef.current?.settle(data.seq, tr.leaves.length);
							debug.log('[wireSync] duplicate action_envelope acknowledged as no-op', {
								seq: data.seq,
							});
							break;
						}
						signedTranscriptRef.current = next;
						transcriptOrderGateRef.current?.settle(data.seq, next.leaves.length);
						// Persist the remote leaf to the encrypted log (issue 04).
						// No-op if the log isn't open yet (early handshake gap).
						const logDb = actionLogDbRef.current;
						const logKey = actionLogEncKeyRef.current;
						if (logDb && logKey) {
							const appended = next.leaves[next.leaves.length - 1];
							const stored: StoredLeaf = { ...appended, matchId: data.matchId };
							void appendActionLogLeaf(logDb, stored, logKey).catch((e) => {
								debug.warn('[wireSync] action log write (remote) failed:', e);
							});
						}
					} catch (err) {
						debug.warn('[wireSync] action_envelope rejected:', err instanceof Error ? err.message : String(err));
						quarantineP2PSession('action_envelope_verification_failed');
					}
					break;
				}

					default: {
						const unreachable: never = data;
						void unreachable;
						debug.warn('[wireSync] Unknown message type after schema validation');
					}
				}
			};

		// Connection-scoped cancellation flag. Closed over by `processQueue` so a
		// long-running message processing loop bails out as soon as React unmounts
		// the hook (or `connection`/`connectionState` deps change). Without this,
		// `await processMessage(msg)` could continue post-cleanup, firing toasts /
		// audio / transcript writes against a session that no longer exists. Local
		// (not useRef) so each connection epoch starts fresh — no carry-over from
		// the previous cleanup.
		let cancelled = false;

			const processQueue = async () => {
				if (isProcessing) return;
				isProcessing = true;
				try {
					while (messageQueue.length > 0) {
						if (cancelled) {
							messageQueue.length = 0;
							break;
						}
						const msg = messageQueue.shift();
						if (!msg) break;
					try {
						await processMessage(msg);
					} catch (err) {
						debug.error(`[wireSync] Error processing ${msg.type}:`, err);
					}
					}
				} finally {
					isProcessing = false;
				}
		};

		const handleMessage = (data: unknown) => {
			// Trust boundary (TD-24a): every payload is validated against the
			// `WireMessage` zod union before it enters the queue. Any envelope
			// with the right discriminator but malformed scalars (missing
			// commandId, non-string prevStateHash, ...) is dropped here, so
			// downstream handlers can safely consume narrowed types without
			// per-field defensive checks for shape (semantic checks like
			// "this commandId hasn't been seen before" still belong inline).
				const msg = parseWireMessage(data);
			if (!msg) {
				const advertisedType = (data as { type?: unknown } | null)?.type;
				debug.warn('[wireSync] Dropped malformed wire message', { advertisedType });
				return;
			}
				const enqueueResult = enqueueWireMessage(
					messageQueue,
				msg,
				MAX_INBOUND_WIRE_QUEUE_SIZE,
			);
			if (!enqueueResult.accepted) {
				// Wire commands are contiguous and cannot be recovered by dropping a
				// frame. Quarantine immediately so the UI and every sender fail closed
				// instead of remaining connected with a permanent sequence hole.
				debug.warn(`[wireSync] Queue full (${MAX_INBOUND_WIRE_QUEUE_SIZE}), quarantining inbound session`, {
					type: msg.type,
				});
				quarantineP2PSession('incoming_wire_queue_overflow');
				return;
			}
			processQueue();
		};

		const handleControlMessage = (data: P2PControlServerMessage): void => {
			if (data.type === 'poker_action_time_gate_ack_v1') {
				settlePokerActionGateAck(data);
				return;
			}
			if (data.type === 'action_applied_v1') {
				settlePokerActionApplied(data);
				settleCardsActionApplied(data);
				return;
			}
			if (data.type === 'poker_action_time_gate_v1') {
				const { protocolVersion: _protocolVersion, matchId: _matchId, type: _controlType, ...wirePayload } = data;
				const message = parseWireMessage({ type: 'poker_action', ...wirePayload });
				if (message?.type === 'poker_action') handleMessage(message);
				return;
			}
			if (data.type !== 'phase_checkpoint_commit_v1'
				&& data.type !== 'phase_checkpoint_dispute_v1'
				&& data.type !== 'poker_turn_notary_commit_v1'
				&& data.type !== 'poker_turn_notary_dispute_v1') return;
			// Control WS and gameplay transport are independent sockets. Enqueue
			// referee messages beside gameplay frames so a checkpoint/notary result
			// cannot overtake an earlier command that is still being reduced.
			handleMessage(data);
		};

		const handleMessageWrapper = (data: unknown) => handleMessage(data);
		connection.on('data', handleMessageWrapper);
		const removeControlMessage = connection.onControlMessage?.(handleControlMessage);
		debug.log('[wireSync] Data listener attached to connection (heartbeats will now be processed)');

			return () => {
				cancelled = true;
				messageQueue.length = 0;
				connection.off('data', handleMessageWrapper);
			removeControlMessage?.();
			debug.log('[wireSync] Data listener detached');
			if (pendingSyncRef.current) {
				clearTimeout(pendingSyncRef.current);
				pendingSyncRef.current = null;
			}
		};
	}, [cacheCardsAppliedReceipt, connection, connectionState, send, sendDeliveryReceipt, sendPhaseCheckpointProposal, sendPokerTurnProposal, playCard, attackWithCard, endTurn, performHeroPower, toggleMulliganCard, confirmMulligan, skipMulligan, applyOpponentCommandToStore, isCurrentConnectedMatch, settleCardsActionApplied, settlePokerActionGateAck, settlePokerActionApplied]);

	const syncGameState = useCallback(() => {
		// Full-state frames are intentionally disabled. A peer-authored snapshot
		// is not an authority-bearing recovery primitive and is rejected on the
		// receive path; signed command replay is the only safe recovery route.
		return;
	}, []);

	const debouncedSync = useCallback(() => {
		if (pendingSyncRef.current) clearTimeout(pendingSyncRef.current);
		pendingSyncRef.current = setTimeout(() => {
			syncGameState();
			pendingSyncRef.current = null;
		}, 25);
	}, [syncGameState]);
	debouncedSyncRef.current = debouncedSync;

	type SentGameCommand = Readonly<{ commandId: string; seq: number; resultingStateHash: string }>;
	const sendCommandEnvelope = useCallback((command: WireGameCommand): Promise<SentGameCommand | null> => {
		const run = localCommandSignChainRef.current.then(async () => {
			if (isP2PSessionQuarantined()) {
				debug.warn('[wireSync] sendCommandEnvelope blocked — P2P integrity is quarantined');
				return null;
			}
			const lifecycle = usePeerStore.getState().battleLifecycle;
			if (lifecycle?.phase === 'resolved' || lifecycle?.phase === 'cancelled') {
				debug.warn('[wireSync] sendCommandEnvelope blocked — P2P lifecycle is terminal');
				return null;
			}
			const matchId = matchIdRef.current ?? '';
			if (!matchId) {
				debug.warn('[wireSync] sendCommandEnvelope skipped: no matchId yet');
				return null;
			}
			const sessionState = usePeerStore.getState();
			const key = sessionKeyRef.current;
			if (!key || !sessionState.p2pSessionLocalAuthorized || !sessionState.p2pSessionRemoteAuthorized) {
				debug.warn('[wireSync] sendCommandEnvelope blocked — session authorization incomplete');
				return null;
			}
			const transcriptOrderGate = transcriptOrderGateRef.current;
			if (transcriptOrderGate) {
				const orderResult = await transcriptOrderGate.waitUntilReady(
					signedTranscriptRef.current?.leaves.length ?? 0,
				);
				if (orderResult.status === 'blocked') {
					debug.warn('[wireSync] sendCommandEnvelope blocked by transcript order gate', {
						reason: orderResult.reason,
						expectedSeq: transcriptOrderGate.pendingExpectedSeq(),
					});
					if (orderResult.reason === 'timeout'
						&& usePeerStore.getState().connectionState === 'connected') {
						quarantineP2PSession('remote_action_envelope_timeout');
					}
					return null;
				}
			}
			// Cooldown: both peers now apply locally after hashing, so a second
			// click in the same tick would still share a prevStateHash if send
			// raced apply. 250ms is under human click cadence.
			const ENVELOPE_COOLDOWN_MS = 250;
			const nowSend = Date.now();
			if (nowSend - lastEnvelopeSentAtRef.current < ENVELOPE_COOLDOWN_MS) {
				debug.warn(`[wireSync] envelope cooldown active (${nowSend - lastEnvelopeSentAtRef.current}ms since last) — dropping ${command.type}`);
				GameEventBus.emitNotification({
					level: 'error',
					message: 'Action too fast — wait for opponent to sync',
					duration: 1500,
				});
				return null;
			}
			lastEnvelopeSentAtRef.current = nowSend;
			lastCardsCommandAtRef.current = nowSend;

			const localState = useGameStore.getState().gameState;
			let prevStateHash = computeCardsPrevStateHash(localState, isCardsCanonicalPlayerFrame);
			for (let attempt = 1; !prevStateHash && attempt <= PRE_BATTLE_HASH_RETRY_ATTEMPTS; attempt += 1) {
				// The cards handshake can complete in the same tick as the eager
				// WASM load. Finish that load at the command boundary rather than
				// signing an empty pre-state hash that the peer cannot verify.
				try {
					await loadWasmEngine();
					prevStateHash = computeCardsPrevStateHash(
						useGameStore.getState().gameState,
						isCardsCanonicalPlayerFrame,
					);
				} catch (error) {
					debug.warn('[wireSync] cards command hash unavailable after WASM load', error);
				}
				if (!prevStateHash && attempt < PRE_BATTLE_HASH_RETRY_ATTEMPTS) {
					GameEventBus.emitNotification({
						level: 'warning',
						message: 'Synchronizing match…',
						duration: 1_500,
					});
					await waitForPreBattleHashRetry();
				}
			}
			if (!prevStateHash) {
				quarantineP2PSession('local_cards_prev_state_hash_unavailable');
				return null;
			}
			const unsignedEnvelope = {
				type: 'game_command' as const,
				matchId,
				seq: outgoingSeqCounter,
				commandId: crypto.randomUUID(),
				prevStateHash,
				command,
			};
			const signature = await signGameplayEnvelope(unsignedEnvelope, key);
			if (usePeerStore.getState().connectionState !== 'connected'
				|| matchIdRef.current !== matchId
				|| sessionKeyRef.current !== key
				|| usePeerStore.getState().p2pIntegrityError !== null
				|| usePeerStore.getState().battleLifecycle?.phase === 'resolved'
				|| usePeerStore.getState().battleLifecycle?.phase === 'cancelled') {
				debug.warn('[wireSync] signed command became stale before send');
				return null;
			}
			const signedEnvelope: Extract<P2PMessage, { type: 'game_command' }> = {
				...unsignedEnvelope,
				signerPubkey: key.pubkey,
				signature,
			};
			const accepted = send(signedEnvelope);
			if (!accepted) {
				debug.warn('[wireSync] signed command was not accepted by transport/buffer');
				return null;
			}
			outgoingSeqCounter += 1;
			let resolveApplied: (receipt: ActionAppliedMessage | null) => void = () => undefined;
			const appliedPromise = new Promise<ActionAppliedMessage | null>((resolve) => {
				resolveApplied = resolve;
			});
			const pendingGate: PendingCardsActionGate = {
				matchId,
				commandId: unsignedEnvelope.commandId,
				seq: unsignedEnvelope.seq,
				gameplayMessage: signedEnvelope,
				resolve: resolveApplied,
				timeout: null,
				retrying: false,
				attempts: 1,
			};
			pendingCardsActionGateRef.current.set(unsignedEnvelope.commandId, pendingGate);
			armCardsActionGateTimeout(unsignedEnvelope.commandId);
			const receipt = await appliedPromise;
			if (!receipt) return null;
			return {
				commandId: unsignedEnvelope.commandId,
				seq: unsignedEnvelope.seq,
				resultingStateHash: receipt.resultingStateHash,
			};
		});
		localCommandSignChainRef.current = run.then(() => undefined, () => undefined);
		return run;
	}, [armCardsActionGateTimeout, send, isCardsCanonicalPlayerFrame]);

	const runCardsLocalAction = useCallback((
		command: WireGameCommand,
		applyLocal: () => ApplyGameCommandResult,
		onCommitted?: (sent: SentGameCommand | null) => void,
	): void => {
		if (isP2PMatch && isP2PSessionQuarantined()) {
			debug.warn('[wireSync] local cards action blocked — P2P integrity is quarantined', {
				type: command.type,
			});
			return;
		}
		const plan = planCardsLocalAction({
			connected: connectionState === 'connected',
			broadcastsCardsState,
			isP2PMatch,
		});
		if (plan.sendEnvelope) {
			if (localCardsCommandPendingRef.current) {
				GameEventBus.emitNotification({
					level: 'warning',
					message: 'Synchronizing match…',
					duration: 1_500,
				});
				return;
			}
			localCardsCommandPendingRef.current = true;
			void sendCommandEnvelope(command)
				.then((sent) => {
					if (sent && plan.applyLocal) {
						const localResult = applyLocal();
						if (!shouldCommitLocalCardsAction({
							isP2PMatch,
							localApplyStatus: localResult.status,
						})) {
							// The signed envelope already crossed the transport boundary.
							// A local reducer rejection means this browser and its peer
							// cannot advance the same contiguous command stream. Freeze
							// instead of recording a phantom canonical action.
							debug.error('[wireSync] local cards command was rejected after send', {
								type: command.type,
								reason: 'reason' in localResult ? localResult.reason : 'not_applied',
							});
							quarantineP2PSession(`local_command_rejected_after_send_${command.type}`);
							return;
						}
						const localHash = computeCardsPrevStateHash(
							useGameStore.getState().gameState,
							isCardsCanonicalPlayerFrame,
						);
						if (!localHash || localHash !== sent.resultingStateHash) {
							quarantineP2PSession(`cards_applied_hash_mismatch_${command.type}`);
							return;
						}
						onCommitted?.(sent);
					}
				})
				.catch((error: unknown) => {
					// A canonical cards action is never allowed to become local-only
					// when signing or transport preparation fails. Quarantine the
					// current P2P match and surface the same fail-closed state used by
					// chess/poker integrity checks.
					debug.error('[wireSync] cards command signing failed; quarantining P2P session', error);
					quarantineP2PSession(`cards_command_signing_failed_${command.type}`);
				})
				.finally(() => {
					localCardsCommandPendingRef.current = false;
				});
		} else if (plan.applyLocal) {
			applyLocal();
			onCommitted?.(null);
		} else {
			GameEventBus.emitNotification({
				level: 'warning',
				message: 'P2P reconnecting — action held until the peer connection recovers.',
				duration: 1800,
			});
		}
		if (plan.broadcastSnapshot) debouncedSync();
	}, [connectionState, broadcastsCardsState, isP2PMatch, sendCommandEnvelope, debouncedSync]);

	/**
	 * ADR 0004 §Decision.4 (issue 03) — sign + append the local action to
	 * the transcript and broadcast an `action_envelope`. Additive to the
	 * symmetric `game_command` flow: the cards engine still mutates state
	 * via `playCard`/`applyOpponentCommand`; the envelope is the audit
	 * record committed in `match_result.transcriptRoot`.
	 *
	 * Local envelopes are serialized and are never recorded before transport
	 * acceptance. Remote envelopes that arrive during async authorization are
	 * held in a bounded queue and replayed after the key is verified.
	 */
	const appendAndSendActionEnvelope = useCallback(async (action: Record<string, unknown>): Promise<void> => {
		if (isP2PSessionQuarantined()) {
			debug.warn('[wireSync] action_envelope blocked — P2P integrity is quarantined');
			return;
		}
		const invocationConnection = connection;
		const run = localTranscriptSignChainRef.current.then(async () => {
			if (isP2PSessionQuarantined()) {
				debug.warn('[wireSync] queued action_envelope blocked — P2P integrity is quarantined');
				return;
			}
			// Capture the concrete connection object. A reconnect may preserve the
			// match id and session key, so checking only `connectionState` would let
			// a late signature leak into the newly-created socket.
			const activeConnection = invocationConnection;
			if (connectionState !== 'connected' || !activeConnection) return;

			const broadcaster = myBroadcasterRef.current;
			if (!broadcaster) {
				debug.warn('[wireSync] action_envelope skipped — broadcaster not resolved');
				return;
			}

			// A remote envelope can be appended while WebCrypto is signing. Retry
			// once against the newer transcript instead of overwriting that leaf.
			for (let attempt = 0; attempt < 2; attempt += 1) {
				const key = sessionKeyRef.current;
				const tr = signedTranscriptRef.current;
				if (!key || !tr) {
					debug.warn('[wireSync] action_envelope skipped — session not ready', {
						hasKey: !!key,
						hasTranscript: !!tr,
					});
					return;
				}

				const { next, envelope } = await appendSelfAction(tr, action, key, broadcaster);
				const peerState = usePeerStore.getState();
				if (
					peerState.connection !== activeConnection
					|| peerState.connectionState !== 'connected'
					|| matchIdRef.current !== tr.matchId
					|| sessionKeyRef.current !== key
				) {
					debug.warn('[wireSync] action_envelope signature became stale before send');
					return;
				}
				if (signedTranscriptRef.current !== tr) {
					debug.warn('[wireSync] action_envelope transcript advanced while signing; retrying');
					continue;
				}

				// Publish first; if the transport closes in the send call, do not
				// advance the local transcript with an envelope the peer never saw.
				// `PeerStore.send` also returns false when the bounded reconnect
				// buffer is full. Treat that as an integrity boundary: recording a
				// local leaf that was not retained would make the next transcript
				// root diverge even though the cards command may have been accepted.
				const accepted = send(envelope);
				if (!accepted) {
					debug.warn('[wireSync] action_envelope was not retained by transport');
					quarantineP2PSession('action_envelope_transport_rejected');
					return;
				}
				signedTranscriptRef.current = next;
				// Persist the self leaf to the encrypted log (issue 04). No-op if
				// the log handle isn't ready yet (early-handshake gap).
				const logDb = actionLogDbRef.current;
				const logKey = actionLogEncKeyRef.current;
				if (logDb && logKey) {
					const stored: StoredLeaf = {
						seq: envelope.seq,
						prevHash: envelope.prevHash,
						action: envelope.action,
						sig: envelope.sig,
						broadcaster,
						matchId: tr.matchId,
					};
					void appendActionLogLeaf(logDb, stored, logKey).catch((e) => {
						debug.warn('[wireSync] action log write (self) failed:', e);
					});
				}
				return;
			}
			debug.warn('[wireSync] action_envelope skipped — transcript kept advancing during signing');
		});
		localTranscriptSignChainRef.current = run.then(() => undefined, () => undefined);
		try {
			await run;
		} catch (err) {
			debug.error('[wireSync] action_envelope build/send failed:', err);
		}
	}, [connection, connectionState, send]);

	// Local transcript identity: read fresh from the NFT bridge + peer store on
	// each move. Memoizing would be wrong — `getNFTBridge().getUsername()` can
	// flip mid-session if the user re-authenticates, and `myPeerId` flips on
	// reconnect. The function is cheap (two synchronous reads + one branch).
	const buildLocalTranscriptId = (): string => localPlayerId({
		hiveUsername: getNFTBridge().getUsername(),
		myPeerId: usePeerStore.getState().myPeerId,
	});

	// Sender wrappers: when the local player is the P2P client, the command travels
	// in the SENDER's perspective (e.g. `targetId: 'opponent-hero'` means "the host's hero
	// from the client's POV"). The host's applyOpponentCommand swaps player/opponent
	// before applying — no perspective translation is performed at the wire level.
	// Build a transcript-friendly action payload. Strips `undefined` keys so
	// the canonical-JSON serializer (which rejects `undefined`) sees only
	// the fields the wire actually carries. Mirrors the optionality of the
	// `WireGameCommand` discriminated union.
	const buildTranscriptAction = (
		type: typeof GAME_COMMAND_TYPES[keyof typeof GAME_COMMAND_TYPES],
		fields: Record<string, string | number | boolean | undefined>,
	): Record<string, unknown> => {
		const out: Record<string, unknown> = { type };
		for (const [k, v] of Object.entries(fields)) {
			if (v !== undefined) out[k] = v;
		}
		return out;
	};

	const recordLocalCanonicalMove = (
		action: string,
		payload: Record<string, unknown>,
		sent: SentGameCommand | null,
	): boolean => {
		const playerId = buildLocalTranscriptId();
		if (!isP2PMatch) {
			recordMove(action, payload, playerId);
			return true;
		}
		if (!sent) {
			quarantineP2PSession('local_canonical_order_missing_command');
			return false;
		}
		const actorId = usePeerStore.getState().myPeerId;
		const canonicalOrder = actorId
			? commitNextP2PCanonicalAction({ actionId: sent.commandId, actorId })
			: null;
		if (canonicalOrder === null) {
			quarantineP2PSession('local_canonical_order_unavailable');
			return false;
		}
		const recorded = recordMove(action, {
			...payload,
			commandId: sent.commandId,
			seq: sent.seq,
		}, playerId, canonicalOrder);
		if (!recorded) {
			quarantineP2PSession('local_transcript_unavailable');
			return false;
		}
		return true;
	};

	const wrappedPlayCard = useCallback((cardId: string, targetId?: string, targetType?: 'minion' | 'hero', insertionIndex?: number, payWithBlood?: boolean, onCommitted?: () => void) => {
		if (isP2PMatch && isP2PSessionQuarantined()) return;
		runCardsLocalAction({
			type: GAME_COMMAND_TYPES.playCard,
			cardId,
			targetId,
			targetType,
			insertionIndex,
			payWithBlood,
		}, () => playCard(cardId, targetId, targetType, insertionIndex, payWithBlood), (sent) => {
		if (!recordLocalCanonicalMove('playCard', { cardId, targetId, targetType, insertionIndex, payWithBlood }, sent)) return;
			void appendAndSendActionEnvelope(buildTranscriptAction(GAME_COMMAND_TYPES.playCard, {
				cardId, targetId, targetType, insertionIndex, payWithBlood,
			}));
			onCommitted?.();
		});
	}, [playCard, runCardsLocalAction, appendAndSendActionEnvelope, isP2PMatch]);

	const wrappedAttack = useCallback((attackerId: string, defenderId = 'opponent-hero', onCommitted?: () => void) => {
		if (isP2PMatch && isP2PSessionQuarantined()) return;
		runCardsLocalAction({
			type: GAME_COMMAND_TYPES.attack,
			attackerId,
			defenderId,
		}, () => attackWithCard(attackerId, defenderId), (sent) => {
			if (!recordLocalCanonicalMove('attack', { attackerId, defenderId }, sent)) return;
			void appendAndSendActionEnvelope(buildTranscriptAction(GAME_COMMAND_TYPES.attack, {
				attackerId, defenderId,
			}));
			onCommitted?.();
		});
	}, [attackWithCard, runCardsLocalAction, appendAndSendActionEnvelope, isP2PMatch]);

	const wrappedEndTurn = useCallback((onCommitted?: () => void) => {
		if (isP2PMatch && isP2PSessionQuarantined()) return;
		runCardsLocalAction({ type: GAME_COMMAND_TYPES.endTurn }, endTurn, (sent) => {
			if (!recordLocalCanonicalMove('endTurn', {}, sent)) return;
			void appendAndSendActionEnvelope({ type: GAME_COMMAND_TYPES.endTurn });
			onCommitted?.();
		});
	}, [endTurn, runCardsLocalAction, appendAndSendActionEnvelope, isP2PMatch]);

	const wrappedUseHeroPower = useCallback((targetId?: string, targetType?: 'card' | 'hero', onCommitted?: () => void) => {
		if (isP2PMatch && isP2PSessionQuarantined()) return;
		runCardsLocalAction({
			type: GAME_COMMAND_TYPES.useHeroPower,
			targetId,
			targetType,
		}, () => performHeroPower(targetId, targetType), (sent) => {
			if (!recordLocalCanonicalMove('useHeroPower', { targetId, targetType }, sent)) return;
			void appendAndSendActionEnvelope(buildTranscriptAction(GAME_COMMAND_TYPES.useHeroPower, {
				targetId, targetType,
			}));
			onCommitted?.();
		});
	}, [performHeroPower, runCardsLocalAction, appendAndSendActionEnvelope, isP2PMatch]);

	const wrappedFrontlineAttack = useCallback((mode: 'minion' | 'hero', actionId: string = crypto.randomUUID(), onCommitted?: () => void) => {
		if (isP2PMatch && isP2PSessionQuarantined()) return;
		const command = { type: GAME_COMMAND_TYPES.frontlineAttack, mode, actionId } as const;
		runCardsLocalAction(command, () => frontlineAttack(mode, actionId), (sent) => {
			if (!recordLocalCanonicalMove('frontlineAttack', { mode, actionId }, sent)) return;
			void appendAndSendActionEnvelope(buildTranscriptAction(command.type, { mode, actionId }));
			onCommitted?.();
		});
	}, [frontlineAttack, runCardsLocalAction, appendAndSendActionEnvelope, isP2PMatch]);

	const wrappedPerformNorseHeroPower = useCallback((
		norseHeroId: string,
		targetId?: string,
		targetType?: 'minion' | 'hero',
		actionId: string = crypto.randomUUID(),
		onCommitted?: () => void,
	) => {
		if (isP2PMatch && isP2PSessionQuarantined()) return;
		const command = { type: GAME_COMMAND_TYPES.norseHeroPower, norseHeroId, targetId, targetType, actionId } as const;
		runCardsLocalAction(command, () => performNorseHeroPower(norseHeroId, targetId, targetType, actionId), (sent) => {
			if (!recordLocalCanonicalMove('norseHeroPower', { norseHeroId, targetId, targetType, actionId }, sent)) return;
			void appendAndSendActionEnvelope(buildTranscriptAction(command.type, { norseHeroId, targetId, targetType, actionId }));
			onCommitted?.();
		});
	}, [performNorseHeroPower, runCardsLocalAction, appendAndSendActionEnvelope, isP2PMatch]);

	const wrappedWeaponUpgrade = useCallback((norseHeroId: string, actionId: string = crypto.randomUUID(), onCommitted?: () => void) => {
		if (isP2PMatch && isP2PSessionQuarantined()) return;
		const command = { type: GAME_COMMAND_TYPES.weaponUpgrade, norseHeroId, actionId } as const;
		runCardsLocalAction(command, () => weaponUpgrade(norseHeroId, actionId), (sent) => {
			if (!recordLocalCanonicalMove('weaponUpgrade', { norseHeroId, actionId }, sent)) return;
			void appendAndSendActionEnvelope(buildTranscriptAction(command.type, { norseHeroId, actionId }));
			onCommitted?.();
		});
	}, [weaponUpgrade, runCardsLocalAction, appendAndSendActionEnvelope, isP2PMatch]);

	const wrappedToggleMulliganCard = useCallback((cardId: string, onCommitted?: () => void) => {
		if (isP2PMatch && isP2PSessionQuarantined()) return;
			runCardsLocalAction(
			{ type: GAME_COMMAND_TYPES.toggleMulliganCard, cardId },
			() => toggleMulliganCard(cardId),
			(sent) => {
				if (!recordLocalCanonicalMove('toggleMulliganCard', { cardId }, sent)) return;
				onCommitted?.();
			},
		);
	}, [toggleMulliganCard, runCardsLocalAction, isP2PMatch]);

	const wrappedConfirmMulligan = useCallback((onCommitted?: () => void) => {
		if (isP2PMatch && isP2PSessionQuarantined()) return;
			runCardsLocalAction(
			{ type: GAME_COMMAND_TYPES.confirmMulligan },
			confirmMulligan,
			(sent) => {
				if (!recordLocalCanonicalMove('confirmMulligan', {}, sent)) return;
				onCommitted?.();
			},
		);
	}, [confirmMulligan, runCardsLocalAction, isP2PMatch]);

	const wrappedSkipMulligan = useCallback((onCommitted?: () => void) => {
		if (isP2PMatch && isP2PSessionQuarantined()) return;
			runCardsLocalAction(
			{ type: GAME_COMMAND_TYPES.skipMulligan },
			skipMulligan,
			(sent) => {
				if (!recordLocalCanonicalMove('skipMulligan', {}, sent)) return;
				onCommitted?.();
			},
		);
	}, [skipMulligan, runCardsLocalAction, isP2PMatch]);

	const wrappedSelectDiscoveryOption = useCallback((card: Parameters<typeof selectDiscoveryOption>[0], onCommitted?: () => void) => {
		if (isP2PMatch && isP2PSessionQuarantined()) return;
		const command = { type: GAME_COMMAND_TYPES.selectDiscoveryOption, card } as const;
		runCardsLocalAction(command, () => selectDiscoveryOption(card), (sent) => {
			if (!recordLocalCanonicalMove('selectDiscoveryOption', { cardId: card?.id }, sent)) return;
			void appendAndSendActionEnvelope(buildTranscriptAction(command.type, { cardId: card?.id }));
			onCommitted?.();
		});
	}, [selectDiscoveryOption, runCardsLocalAction, appendAndSendActionEnvelope, isP2PMatch]);

	const downloadSessionLog = useCallback((): void => {
		try {
			const blob = exportSessionLog({
				matchId: matchIdRef.current,
				buildHash: typeof __BUILD_HASH__ !== 'undefined' ? __BUILD_HASH__ : 'dev',
				runtime: buildRagnarokRuntimeEvidence(getRagnarokNetworkConfig()),
				connectionState,
				isHost: isWsHost,
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `ragnarok-session-${matchIdRef.current ?? 'unmatched'}-${Date.now()}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (err) {
			debug.error('[wireSync] downloadSessionLog failed:', err);
		}
	}, [connectionState, isWsHost]);

	// Forward gameState dumps are off. Recovery requires signed replay.

	// Client pings host every 10s to keep the connection alive
	useEffect(() => {
		if (connectionState !== 'connected' || !shouldSendGuestKeepAlive) return;
		const interval = setInterval(() => {
			send({ type: 'ping' });
		}, 10_000);
		return () => clearInterval(interval);
	}, [connectionState, shouldSendGuestKeepAlive, send]);

	// Host sends state hash check every 2s for anti-cheat verification
	useEffect(() => {
		if (!shouldEmitHashBeacon({
			connectionState,
			sendsHashBeacon,
			competitionPhase,
		})) return;
		let cancelled = false;
		let timerId: ReturnType<typeof setTimeout> | null = null;
		const scheduleCheck = () => {
			if (cancelled) return;
			timerId = setTimeout(async () => {
				if (cancelled) return;
				const gs = useGameStore.getState().gameState;
				if (gs && gs.gamePhase !== 'game_over') {
					// The beacon must use the same canonical player frame as the
					// receiver. The transport host is not necessarily the canonical
					// cards player after commit-reveal side derivation.
					const canonicalState = isCardsCanonicalPlayerFrameRef.current ? gs : flipGameState(gs);
					const stateHash = await computeStateHash(canonicalState);
					// Beacon-covered chess hash (TD-27c-chess F3). Closes the
					// cross-peer divergence-detection gap between chess moves: per-
					// envelope validation catches mid-move drift, but two peers can
					// drift while idle (no chess move, no game_command). Sync hash
					// over the local boardState; '' under WASM-not-ready / no-chess-
					// phase races so the receiver can skip rather than reject.
					const chessSnapshot = useUnifiedCombatStore.getState().boardState ?? null;
					const chessStateHash = computeChessPrevStateHash(chessSnapshot);
					// Stamp the snapshot's moveCount alongside the hash so the receiver
					// can skip the compare when it's on a different chess turn (in-
					// flight envelopes faster than 2s beacon → near-permanent stale-
					// snapshot mismatches without this gate). -1 = no chess snapshot.
					const chessMoveCount = chessSnapshot?.moveCount ?? -1;
					if (!cancelled) {
						send({
							type: 'hash_check',
							stateHash,
							chessStateHash,
							chessMoveCount,
							turnNumber: gs.turnNumber,
							sentCommandSeq: outgoingSeqCounter - 1,
							receivedCommandSeq: lastIncomingSeqRef.current,
						});
						const pokerState = getP2PPokerCombatAdapter().getPokerState();
						const pokerStateHash = computePokerCombatStateHash(pokerState);
						if (pokerStateHash && pokerState?.turnId && isTimedPokerDecisionPhase(pokerState.phase)) {
							send({
								type: 'poker_hash_check',
								pokerStateHash,
								phase: pokerState.phase,
								turnId: pokerState.turnId,
								actionsThisRound: pokerState.actionsThisRound,
							});
						}
					}
				}
				scheduleCheck();
			}, 2000);
		};
		scheduleCheck();
		return () => {
			cancelled = true;
			if (timerId) clearTimeout(timerId);
		};
	}, [competitionPhase, connectionState, sendsHashBeacon, send]);

	// Send source-aware deck claims to the opponent for ownership verification.
	const sendDeckVerification = useCallback((hiveAccount: string, claims: readonly DeckCardClaim[]) => {
		if (connectionState === 'connected') {
			send({ type: 'deck_verify', hiveAccount, protocolVersion: 2, claims });
		}
	}, [connectionState, send]);

	const sendPokerAction = useCallback(async (input: {
		playerId: string;
		action: CombatAction;
		origin: import('@shared/p2p-wire/combat').PokerActionOrigin;
		hpCommitment?: number;
		turnId?: string | null;
		prevStateHash?: string;
		decisionId?: string;
	}): Promise<boolean> => {
		if (connectionState !== 'connected') return false;
		if (isP2PSessionQuarantined()) {
			debug.warn('[wireSync] poker action blocked — P2P integrity is quarantined');
			return false;
		}
		if (pokerActionSignPendingRef.current) {
			debug.warn('[wireSync] poker action blocked — another gameplay signature is pending');
			return false;
		}
		const turnId = input.turnId;
		if (!turnId) return false;
		const matchId = matchIdRef.current;
		const key = sessionKeyRef.current;
		const peerState = usePeerStore.getState();
		if (!matchId || !key || !peerState.p2pSessionLocalAuthorized || !peerState.p2pSessionRemoteAuthorized) return false;
		const sentAtMs = Date.now();
		const pokerState = getP2PPokerCombatAdapter().getPokerState();
		const prevStateHash = input.prevStateHash ?? computePokerCombatStateHash(pokerState);
		if (!prevStateHash) return false;
		// Reserve the correlation number before the asynchronous WebCrypto call;
		// two fast clicks must never sign the same sequence number. Gaps caused by
		// a failed/stale signature are harmless because Poker deduplicates by the
		// signed decisionId and does not require contiguous delivery.
		pokerActionSignPendingRef.current = true;
		const pokerSeq = pokerActionSeqRef.current++;
		const pokerAction = {
			playerId: input.playerId,
			action: input.action,
			origin: input.origin,
			hpCommitment: input.hpCommitment,
			turnId,
			decisionId: input.decisionId ?? `${turnId}:${input.playerId}:${sentAtMs}`,
			sentAtMs,
			compact: encodePokerAction({
				action: input.action as CompactPokerActionName,
				hpCommitment: input.hpCommitment,
			}),
			seq: pokerSeq,
			prevStateHash,
		} as const;
		try {
			const signature = await signGameplayEnvelope({
				matchId,
				seq: pokerAction.seq,
				commandId: pokerAction.decisionId,
				prevStateHash,
				command: buildPokerGameplayCommand(pokerAction),
			}, key);
			const latestPeerState = usePeerStore.getState();
			if (
				latestPeerState.connectionState !== 'connected'
					|| matchIdRef.current !== matchId
					|| sessionKeyRef.current !== key
					|| latestPeerState.p2pIntegrityError !== null
					|| !latestPeerState.p2pSessionLocalAuthorized
				|| !latestPeerState.p2pSessionRemoteAuthorized
			) {
				debug.warn('[wireSync] poker gameplay signature became stale before send');
				return false;
			}
			const signedPokerAction = {
				...pokerAction,
				signerPubkey: key.pubkey,
				signature,
			} as const;
			const gameplayMessage: Extract<P2PMessage, { type: 'poker_action' }> = {
				type: 'poker_action',
				...signedPokerAction,
			};
			const controlMessage: P2PControlClientMessage = {
				type: 'poker_action_time_gate_v1',
				protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
				matchId,
				...signedPokerAction,
			};
			let resolveGate: (allowed: boolean) => void = () => undefined;
			const gateAckPromise = new Promise<boolean>((resolve) => {
				resolveGate = resolve;
			});
			const pendingGate: PendingPokerActionGate = {
				matchId,
				turnId,
				seq: pokerAction.seq,
				controlMessage,
				gameplayMessage,
				resolve: resolveGate,
				timeout: null,
				retrying: false,
				gateAllowed: null,
				applied: false,
			};
			pendingPokerActionGateRef.current.set(pokerAction.decisionId, pendingGate);
			armPokerActionGateTimeout(pokerAction.decisionId);
			const cancelGateAckWait = (): void => {
				const pending = pendingPokerActionGateRef.current.get(pokerAction.decisionId);
				if (!pending) return;
				if (pending.timeout) clearTimeout(pending.timeout);
				pending.timeout = null;
				pendingPokerActionGateRef.current.delete(pokerAction.decisionId);
				pending.resolve(false);
			};
			const activeConnection = latestPeerState.connection;
			if (activeConnection?.controlAvailable && activeConnection.sendControlMessage) {
				try {
					activeConnection.sendControlMessage(controlMessage);
				} catch (error) {
					cancelGateAckWait();
					throw error;
				}
				return await gateAckPromise;
			}
			const accepted = send(gameplayMessage);
			if (!accepted) {
				cancelGateAckWait();
				return false;
			}
			return await gateAckPromise;
		} catch (error) {
			debug.warn('[wireSync] poker gameplay signing/send failed', error);
			quarantineP2PSession('poker_action_signing_failed');
			return false;
		} finally {
			pokerActionSignPendingRef.current = false;
		}
	}, [armPokerActionGateTimeout, connectionState, send]);

	const sendPokerTurnStarted = useCallback((input: {
		combatId: string;
		turnId: string;
		phase: string;
		activePlayerId: string;
		actionsThisRound: number;
		durationMs: number;
		remainingMs?: number;
	}): boolean => {
		if (connectionState !== 'connected') return false;
		if (isP2PSessionQuarantined()) {
			debug.warn('[wireSync] poker turn proposal blocked — P2P integrity is quarantined');
			return false;
		}
		if (!isTimedPokerDecisionPhase(input.phase)) return false;
		return sendPokerTurnProposal({
			combatId: input.combatId,
			turnId: input.turnId,
			phase: input.phase,
			activePlayerId: input.activePlayerId,
			actionsThisRound: input.actionsThisRound,
			durationMs: input.durationMs,
			remainingMs: input.remainingMs,
			sentAtMs: Date.now(),
		});
	}, [connectionState, sendPokerTurnProposal]);

	/**
	 * Propose a match result to the opponent for dual-signature verification.
	 * Returns the signatures object if the opponent counter-signs within 30s,
	 * or null if they reject/timeout. Ranked broadcasters must treat null as
	 * a blocked result, not as permission to publish a single-sig result.
	 */
	const proposeResult = useCallback(async (
		result: PackagedMatchResult,
		hash: string,
		broadcasterSig: string,
	): Promise<{ broadcaster: string; counterparty: string } | null> => {
		if (connectionState !== 'connected') return null;
		if (isP2PSessionQuarantined()) {
			debug.warn('[wireSync] result proposal blocked — P2P integrity is quarantined');
			return null;
		}

		return new Promise((resolve) => {
			// Capture the timeout id so the success/reject paths can clear it
			// instead of letting it run to completion (it's a no-op once
			// `pendingResultRef.current` is null, but clearing is cheaper than
			// letting a 30s timer wait around for nothing).
			let timeoutId: ReturnType<typeof setTimeout> | null = null;

			const settle = (sigs: { broadcaster: string; counterparty: string } | null) => {
				if (timeoutId !== null) {
					clearTimeout(timeoutId);
					timeoutId = null;
				}
				resolve(sigs);
			};

			pendingResultRef.current = {
				result,
				hash,
				broadcasterSig,
				resolve: (sigs) => settle(sigs),
				reject: () => settle(null),
			};

			const proposalId = crypto.randomUUID();
			send({ type: 'result_propose', result, hash, broadcasterSig, proposalId });

				// 30s timeout — ranked settlement stays blocked without dual-sig.
			timeoutId = setTimeout(() => {
				if (pendingResultRef.current) {
					pendingResultRef.current = null;
					settle(null);
				}
			}, RESULT_SIGN_TIMEOUT_MS);
		});
	}, [connectionState, send]);

	/**
	 * ADR 0004 §Decision.4 (issue 03) — read the signed-transcript Merkle
	 * root. The broadcaster overlays this onto `PackagedMatchResult.
	 * transcriptRoot` *before* computing the match hash + dual sig so the
	 * committed root pins the full per-action history (not the legacy
	 * session-log digest). Returns `null` when the transcript is unset
	 * (handshake not yet complete) — callers fall back to the legacy
	 * transcriptRoot in that case.
	 */
	const getSignedTranscriptRoot = useCallback((): string | null => {
		return signedTranscriptRef.current?.merkleRoot ?? null;
	}, []);

	const requestPhaseCheckpoint = useCallback((input: {
		readonly fromPhase: PhaseCheckpointPhase;
		readonly toPhase: PhaseCheckpointPhase;
		readonly stateRoot: Hash256;
	}): Promise<PhaseCheckpointRequestResult> => {
		const matchId = matchIdRef.current;
		if (isP2PSessionQuarantined()) {
			return Promise.resolve({ status: 'unavailable', reason: 'integrity_quarantined' });
		}
		if (connectionState !== 'connected' || !matchId) {
			return Promise.resolve({ status: 'unavailable', reason: 'not_connected' });
		}
		return phaseCheckpointClient.request({
			matchId,
			fromPhase: input.fromPhase,
			toPhase: input.toPhase,
			stateRoot: input.stateRoot,
			send: sendPhaseCheckpointProposal,
		});
	}, [connectionState, sendPhaseCheckpointProposal]);

	return {
		syncGameState,
		playCard: wrappedPlayCard,
		attackWithCard: wrappedAttack,
		endTurn: wrappedEndTurn,
		performHeroPower: wrappedUseHeroPower,
		frontlineAttack: wrappedFrontlineAttack,
		performNorseHeroPower: wrappedPerformNorseHeroPower,
		weaponUpgrade: wrappedWeaponUpgrade,
		toggleMulliganCard: wrappedToggleMulliganCard,
		confirmMulligan: wrappedConfirmMulligan,
		skipMulligan: wrappedSkipMulligan,
		selectDiscoveryOption: wrappedSelectDiscoveryOption,
		sendPokerAction,
		sendPokerTurnStarted,
		sendDeckVerification,
		proposeResult,
		downloadSessionLog,
		getSignedTranscriptRoot,
		requestPhaseCheckpoint,
		isConnected: connectionState === 'connected',
		isHost: transportRole === 'host',
	};
}
