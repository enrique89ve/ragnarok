import React, { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { GameEventBus } from '../../../core/events/GameEventBus';
import { debug } from '../../config/debugConfig';
import { usePeerStore } from '../../stores/peerStore';
import { MultiplayerLobby } from './MultiplayerLobby';
import RagnarokGameCoordinator from '../../coordinator/RagnarokGameCoordinator';
import { MatchSetupP2P } from '../../match';
import { ArmySelection as ArmySelectionType } from '../../types/ChessTypes';
import { Navigate, useNavigate } from 'react-router-dom';
import { routes } from '../../../lib/routes';
import { isHiveWalletAvailable } from '../../../data/HiveAuth';
import { getAuthenticatedHiveUsername, subscribeHiveSessionIdentity } from '../../../data/HiveSessionIdentity';
import {
	Button,
	Panel,
	PanelContent,
	PanelDescription,
	PanelHeader,
	PanelTitle,
} from '../../../components/ui-norse';
import { useMatchmaking } from '../../hooks/useMatchmaking';
import { useMatchmakingStore } from '../../stores/matchmakingStore';
import { useWarbandStore, selectArmy } from '../../../lib/stores/useWarbandStore';
import { P2PStatusBadge } from './P2PStatusBadge';
import { P2PStatusToast } from './P2PStatusToast';
import { useP2PMatchResume } from '../../p2p/useP2PMatchResume';
import { clearP2PMatchResume } from '../../p2p/p2pMatchResume';
import { resolveHeroPortrait } from '../../utils/art/artMapping';
import { P2PProvider } from '../../context/P2PContext';
import { computeP2PRenderGuard } from './multiplayerRenderGuard';
import { isSharedNetworkEnvironment } from '../../config/featureFlags';
import { HiveKeychainLogin } from '../HiveKeychainLogin';
import { useNFTUsername } from '../../nft/hooks';
import { resolveProtectedFlowAccess } from '../../auth/protectedFlowAccess';
import { useGameStore } from '../../stores/gameStore';
import { useGameFlowStore, selectFlowTag } from '../../stores/gameFlowStore';
import { recordSessionEvent } from '../../../data/blockchain/transcriptBuilder';
import { useMatchReloadGuard } from '../../coordinator/hooks/useMatchReloadGuard';
import {
	isLiveP2PReloadGuardTransport,
	shouldWarnOnMatchReload,
} from '../../coordinator/matchReloadGuard';
import { getWarbandEntryRoute } from '../../../lib/warbandRoutes';
import './MultiplayerGame.css';

function useAuthenticatedHiveUsername(): string | null {
	return useSyncExternalStore(
		subscribeHiveSessionIdentity,
		getAuthenticatedHiveUsername,
		getAuthenticatedHiveUsername,
	);
}

/*
  PvPVSScreen — 3-second dramatic splash showing "Player vs Opponent"
  with hero portraits. Triggered by the lobby AFTER its connection-confirmation
  delay, so the user has already seen who connected before this screen appears.
  Opponent hero identity isn't known until game state syncs (after this screen
  closes), so we show their peer ID as a stable identifier and a silhouette.
*/
function PvPVSScreen({ playerArmy, opponentArmy, opponentPeerId, playerUsername, opponentUsername, onComplete }: { playerArmy: ArmySelectionType; opponentArmy: ArmySelectionType | null; opponentPeerId: string | null; playerUsername: string | null | undefined; opponentUsername: string | null | undefined; onComplete: () => void }) {
	useEffect(() => {
		const timer = setTimeout(onComplete, 3200);
		return () => clearTimeout(timer);
	}, [onComplete]);

	const playerHeroId = playerArmy?.queen?.id || playerArmy?.rook?.id || 'hero-odin';
	const playerPortrait = resolveHeroPortrait(playerHeroId);
	const opponentHeroId = opponentArmy?.queen?.id || opponentArmy?.rook?.id || null;
	const opponentPortrait = opponentHeroId ? resolveHeroPortrait(opponentHeroId) : null;
		const playerLabel = playerUsername ? `@${playerUsername}` : 'YOU';
		const opponentLabel = opponentUsername ? `@${opponentUsername}` : opponentArmy?.king?.name?.toUpperCase()
			?? (opponentPeerId ? `${opponentPeerId.slice(0, 8)}…` : 'OPPONENT');
		return (
			<div className="pvp-vs-screen">
				<div className="pvp-vs-stage" role="status" aria-live="polite">
				{/* Player hero */}
				<div className="pvp-vs-fighter pvp-vs-fighter-left">
					<div className="pvp-vs-portrait-frame">
						<img src={playerPortrait} alt={`${playerLabel} hero portrait`} width={140} height={140} fetchPriority="high" decoding="async" />
					</div>
					<span className="pvp-vs-fighter-label">{playerLabel}</span>
				</div>

				{/* VS text */}
				<div className="pvp-vs-mark" role="img" aria-label="Versus">VS</div>

				{/* Opponent — real portrait when army announced, mystery silhouette otherwise */}
				<div className="pvp-vs-fighter pvp-vs-fighter-right">
					<div className={`pvp-vs-portrait-frame ${opponentPortrait ? '' : 'pvp-vs-portrait-frame--unknown'}`}>
					{opponentPortrait
						? <img src={opponentPortrait} alt={`${opponentLabel} hero portrait`} width={140} height={140} loading="lazy" decoding="async" />
						: <span aria-hidden={true}>?</span>}
					</div>
					<span className="pvp-vs-fighter-label">{opponentLabel}</span>
				</div>
			</div>
			</div>
		);
	}

function P2PHiveSessionRequired({ onBack }: { readonly onBack: () => void }) {
	const keychainAvailable = isHiveWalletAvailable();
	return (
		<div className="flex items-center justify-center min-h-screen bg-linear-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
			<Panel className="w-full max-w-md">
				<PanelHeader>
					<PanelTitle>Hive Keychain Required</PanelTitle>
					<PanelDescription>
						Testnet multiplayer needs a local Hive session before matchmaking or manual peer links can start.
					</PanelDescription>
				</PanelHeader>
				<PanelContent className="space-y-4">
					{!keychainAvailable && (
						<div className="rounded-lg border border-(--blood-500)/20 bg-(--blood-500)/10 p-3">
							<p className="text-sm text-(--blood-300)">
								Hive Keychain is not available in this browser profile.
							</p>
						</div>
					)}
					<HiveKeychainLogin />
					<Button onClick={onBack} variant="outline" className="w-full">
						Back
					</Button>
				</PanelContent>
			</Panel>
		</div>
	);
}
export const MultiplayerGame: React.FC = () => {
	const [gameStarted, setGameStarted] = useState(false);
	const [showVS, setShowVS] = useState(false);
	const connectAttemptRoomRef = useRef<string | null>(null);
	const persistedArmy = useWarbandStore(selectArmy);
	const navigate = useNavigate();
	const { status: matchmakingStatus, roomId, offer, joinQueue, leaveQueue } = useMatchmaking();
	const opponentArmyFromPeer = usePeerStore(s => s.opponentArmy);
	const p2pInitApplied = usePeerStore(s => s.p2pInitApplied);
	const p2pSessionLocalAuthorized = usePeerStore(s => s.p2pSessionLocalAuthorized);
	const p2pSessionRemoteAuthorized = usePeerStore(s => s.p2pSessionRemoteAuthorized);
	const p2pSessionAuthError = usePeerStore(s => s.p2pSessionAuthError);
	const connectionState = usePeerStore(s => s.connectionState);
	const reconnectCountdown = usePeerStore(s => s.reconnectCountdown);
	const reconnectAttemptCount = usePeerStore(s => s.reconnectAttemptCount);
	const battleLifecycle = usePeerStore(s => s.battleLifecycle);
	const myPeerId = usePeerStore(s => s.myPeerId);
	const hiveUsername = useNFTUsername();
	const authenticatedHiveUsername = useAuthenticatedHiveUsername();
	const requiresHiveSession = isSharedNetworkEnvironment();
	const p2pAccess = resolveProtectedFlowAccess({
		accountId: hiveUsername,
		authenticatedAccountId: authenticatedHiveUsername,
		sharedNetwork: requiresHiveSession,
		surface: 'multiplayer',
		requiresAuthenticatedSession: false,
	});
	const hasHiveSession = p2pAccess.kind === 'allowed' && (!requiresHiveSession || isHiveWalletAvailable());
	const resumeAccount = authenticatedHiveUsername ?? hiveUsername ?? 'local';
	const resumeBoot = useP2PMatchResume(hasHiveSession ? resumeAccount : null);
	const flowTag = useGameFlowStore(selectFlowTag);
	const cardsGamePhase = useGameStore((s) => s.gameState?.gamePhase ?? null);
	const shouldWarnBeforeUnload = shouldWarnOnMatchReload({
		hasActiveMatch: gameStarted || showVS || resumeBoot === 'applied',
		flowTag,
		cardsGamePhase,
	}) && isLiveP2PReloadGuardTransport(connectionState);
	useMatchReloadGuard({
		enabled: shouldWarnBeforeUnload,
		mode: 'p2p',
		connectionState,
	});

	// VS screen is now triggered ONLY when the lobby calls `onGameStart` (after its
	// own connection-confirmation delay). The previous flow auto-fired VS the instant
	// `connectionState` flipped to 'connected', which made the lobby's connected
	// panel invisible (1 React frame before VS pre-empted). Letting the lobby own
	// the "show who connected, then transition" sequence keeps the user oriented.

	// Handle matchmaking completion. Both peers run this — the WS server resolves
	// host vs client by order of arrival in the room, so we no longer branch on
	// the matchmaking-emitted isHost (which was advisory under WebRTC anyway).
	useEffect(() => {
		if (!roomId || !persistedArmy || gameStarted) {
			if (!roomId || gameStarted) connectAttemptRoomRef.current = null;
			return;
		}
		if (matchmakingStatus !== 'ready' && matchmakingStatus !== 'connecting') return;
		if (connectAttemptRoomRef.current === roomId) return;

		// Mark the room before opening any transport. `setStatus('connecting')`
		// changes this effect's dependency, and StrictMode can replay the effect
		// before the async call settles. A room gets a new attempt only after
		// matchmaking assigns a new room or this screen is reset.
		connectAttemptRoomRef.current = roomId;
		useMatchmakingStore.getState().setStatus('connecting');
		usePeerStore.getState().connectToRoom(roomId).catch(err => {
			debug.error('[MultiplayerGame] connectToRoom failed:', err);
		});
	}, [matchmakingStatus, roomId, persistedArmy, gameStarted]);

	useEffect(() => {
		if (resumeBoot === 'applied') setGameStarted(true);
	}, [resumeBoot]);

	const handleBack = () => {
		navigate(routes.home);
	};

	useEffect(() => {
		if (hasHiveSession) return;
		setShowVS(false);
		setGameStarted(false);
		usePeerStore.getState().disconnect();
		leaveQueue().catch(() => { /* best effort while rendering auth gate */ });
	}, [hasHiveSession, leaveQueue]);

	const handledLifecycleEventRef = useRef<string | null>(null);
	useEffect(() => {
		const result = battleLifecycle?.result;
		if (!result || result.kind !== 'technical_abandonment' || !myPeerId) return;
		if (handledLifecycleEventRef.current === result.eventId) return;
		handledLifecycleEventRef.current = result.eventId;

		const localWon = result.winnerId === myPeerId;
		const now = Date.now();
		void clearP2PMatchResume();
		recordSessionEvent('p2p_technical_result', {
			eventId: result.eventId,
			winnerId: result.winnerId,
			loserId: result.loserId,
			localOutcome: localWon ? 'victory' : 'defeat',
			reason: result.reason,
			runeSettlement: 'not_credited_from_result_only',
		});
		GameEventBus.emitNotification({
			level: localWon ? 'success' : 'error',
			message: localWon
				? 'Technical victory: opponent did not return before the reconnect window expired.'
				: result.reason === 'explicit_leave'
					? 'Technical defeat: leaving a committed PvP battle ends the match.'
					: 'Technical defeat: the reconnect window expired.',
			duration: 6_000,
		});
		const flow = useGameFlowStore.getState().current;
		if (flow?.tag === 'chess' || flow?.tag === 'vs_screen' || flow?.tag === 'poker_combat') {
			useGameFlowStore.getState().dispatch({ type: 'GAME_ENDED', initialSub: 'result' });
		}

		const { gameState } = useGameStore.getState();
		if (!gameState || gameState.gamePhase === 'game_over') return;
		useGameStore.setState({
			gameState: {
				...gameState,
				gamePhase: 'game_over',
				winner: localWon ? 'player' : 'opponent',
				gameLog: [
					...gameState.gameLog,
					{
						id: `p2p_forfeit_${result.eventId}`,
						type: 'effect',
						player: localWon ? 'opponent' : 'player',
						text: localWon
							? 'Technical victory: opponent did not reconnect in time.'
							: result.reason === 'explicit_leave'
								? 'Technical defeat: you left the committed PvP battle.'
								: 'Technical defeat: connection was not restored in time.',
						timestamp: now,
						turn: gameState.turnNumber,
					},
				],
			},
		});
	}, [battleLifecycle, myPeerId]);

	useEffect(() => {
		const eventId = battleLifecycle?.terminalEventId;
		if (battleLifecycle?.phase !== 'cancelled' || !eventId) return;
		if (handledLifecycleEventRef.current === eventId) return;
		handledLifecycleEventRef.current = eventId;
		void clearP2PMatchResume();
		GameEventBus.emitNotification({
			level: 'info',
			message: 'Match canceled before the first valid move. No competitive result was recorded.',
			duration: 5_000,
		});
		setShowVS(false);
		setGameStarted(false);
		useGameStore.getState().resetGameState();
		usePeerStore.getState().disconnect();
		leaveQueue().catch(() => { /* best effort after a pre-battle cancel */ });
	}, [battleLifecycle, leaveQueue]);

	// Clean up peer + matchmaking queue when leaving the multiplayer screen.
	// Without this, a peerId reserved for Quick Match (or a stale connection
	// from a prior attempt) lingers in peerStore. Next
	// time the user enters MultiplayerGame, `existingPeerId` is non-null and
	// the flow inherits zombie state instead of starting fresh.
	useEffect(() => {
		return () => {
			leaveQueue().catch(() => { /* best effort — leaving page anyway */ });
			const peer = usePeerStore.getState();
			if (peer.myPeerId && peer.battleLifecycle?.phase === 'battle') {
				const result = peer.requestP2PLeave(peer.myPeerId);
				if (result?.result?.kind === 'technical_abandonment') {
					recordSessionEvent('p2p_technical_result', {
						eventId: result.result.eventId,
						winnerId: result.result.winnerId,
						loserId: result.result.loserId,
						reason: result.result.reason,
						localOutcome: result.result.loserId === peer.myPeerId ? 'defeat' : 'victory',
						trigger: 'multiplayer_route_unmount',
					});
				}
			}
			peer.disconnect();
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	if (resumeBoot === 'checking') {
		return (
			<div className="flex items-center justify-center min-h-screen bg-linear-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
				<div className="text-center space-y-3 max-w-md px-4">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-(--gold-400) mx-auto" />
					<p className="text-sm text-(--ink-300)">Checking this device for a saved match…</p>
				</div>
			</div>
		);
	}

	if (!persistedArmy) {
		return <Navigate to={getWarbandEntryRoute('multiplayer')} replace />;
	}
	const readyArmy = persistedArmy;

	// P2PProvider wraps every render of this component so `useWireSync` is mounted
	// from the moment MultiplayerGame appears, regardless of whether we're in
	// the lobby, the VS screen, or in-game. This is critical:
	// without it, the data listener on the peer connection never attaches,
	// heartbeats from the remote peer are silently dropped, and peerStore declares
	// the connection dead after `HEARTBEAT_TIMEOUT_MS` (12s).
		const renderInner = () => {
		if (showVS && !gameStarted && resumeBoot !== 'applied') {
			return (
				<PvPVSScreen
					playerArmy={readyArmy}
					opponentArmy={opponentArmyFromPeer}
					opponentPeerId={usePeerStore.getState().remotePeerId}
					playerUsername={hiveUsername}
					opponentUsername={offer?.opponent.username}
					onComplete={() => { setShowVS(false); setGameStarted(true); }}
				/>
			);
		}

		if (!gameStarted && resumeBoot !== 'applied') {
			return (
				<MultiplayerLobby
					onGameStart={() => setShowVS(true)}
					joinQueue={joinQueue}
					leaveQueue={leaveQueue}
				/>
			);
		}

		// Multiplayer game UI. The hard gates wrap the coordinator:
		//   1. computeP2PRenderGuard — user-facing wait spinner. Two checks:
		//      a. opponentArmyFromPeer: the opponent's army announcement arrived.
		//         Without it, hero portraits fall back to defaults.
		//      b. p2pInitApplied: cards handshake init has populated local
		//         gameState (`initGameFromHandshake`). Until then the
		//         coordinator stays unmounted so input cannot hit empty/stale
		//         state (TD-15).
		//   2. <MatchSetupP2P/> — final P2P gate. Quick Match additionally waits
		//      for bilateral Accept proofs and its peer-specific relay ticket;
		//      direct challenges retain their ticket/auth compatibility path.
		//      Both paths require the bilateral BattleReady proof and handshake
		//      before wiring MatchContext and mounting the coordinator.
		// The P2PProvider wrapping all of renderInner keeps useWireSync mounted
		// behind the spinner so `cards_deck` / seed exchange still arrive.
		const guard = computeP2PRenderGuard({
			opponentArmyFromPeer,
			p2pInitApplied,
			p2pSessionLocalAuthorized,
			p2pSessionRemoteAuthorized,
			p2pSessionAuthError,
			connectionState,
			reconnectCountdown,
			reconnectAttemptCount,
			hardReloadResume: resumeBoot === 'applied',
			terminalLifecycle: battleLifecycle?.phase === 'resolved',
		});
		const spinner = (
			<div className="flex items-center justify-center min-h-screen bg-linear-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
				<div className="text-center space-y-3 max-w-md px-4">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-(--gold-400) mx-auto" />
					<p className="text-sm text-(--ink-300) break-words">{guard.kind === 'wait' ? guard.reason : 'Syncing match…'}</p>
				</div>
			</div>
		);
		if (guard.kind === 'wait') return spinner;
		return (
				<>
					<P2PStatusBadge />
					<MatchSetupP2P fallback={spinner}>
						<RagnarokGameCoordinator initialArmy={readyArmy} opponentArmy={opponentArmyFromPeer} />
					</MatchSetupP2P>
				</>
			);
		};

	if (!hasHiveSession) {
		return <P2PHiveSessionRequired onBack={handleBack} />;
	}
	return (
		<P2PProvider>
			<P2PStatusToast />
			{renderInner()}
		</P2PProvider>
	);
};
