import React, { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { debug } from '../../config/debugConfig';
import { usePeerStore } from '../../stores/peerStore';
import { MultiplayerLobby } from './MultiplayerLobby';
import RagnarokGameCoordinator from '../../coordinator/RagnarokGameCoordinator';
import { MatchSetupP2P } from '../../match/modes/p2p';
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
import { useWarbandStore, selectArmy } from '../../../lib/stores/useWarbandStore';
import { P2PStatusBadge } from './P2PStatusBadge';
import { resolveHeroPortrait } from '../../utils/art/artMapping';
import { P2PProvider } from '../../context/P2PContext';
import { computeP2PRenderGuard } from './multiplayerRenderGuard';
import { isSharedNetworkEnvironment } from '../../config/featureFlags';
import { HiveKeychainLogin } from '../HiveKeychainLogin';
import { useNFTUsername } from '../../nft/hooks';
import { resolveProtectedFlowAccess } from '../../auth/protectedFlowAccess';
import { useGameStore } from '../../stores/gameStore';
import { recordSessionEvent } from '../../../data/blockchain/transcriptBuilder';
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
function PvPVSScreen({ playerArmy, opponentArmy, opponentPeerId, onComplete }: { playerArmy: ArmySelectionType; opponentArmy: ArmySelectionType | null; opponentPeerId: string | null; onComplete: () => void }) {
	useEffect(() => {
		const timer = setTimeout(onComplete, 3200);
		return () => clearTimeout(timer);
	}, [onComplete]);

	const playerHeroId = playerArmy?.queen?.id || playerArmy?.rook?.id || 'hero-odin';
	const playerPortrait = resolveHeroPortrait(playerHeroId);
	const opponentHeroId = opponentArmy?.queen?.id || opponentArmy?.rook?.id || null;
	const opponentPortrait = opponentHeroId ? resolveHeroPortrait(opponentHeroId) : null;
		const opponentLabel = opponentArmy?.king?.name?.toUpperCase()
			?? (opponentPeerId ? `${opponentPeerId.slice(0, 8)}…` : 'OPPONENT');
		return (
			<div className="pvp-vs-screen">
				{/* Player hero */}
				<div className="pvp-vs-fighter pvp-vs-fighter-left">
					<div style={{
						width: 140, height: 140, borderRadius: '50%', overflow: 'hidden',
						border: '3px solid rgba(212,175,55,0.7)',
						boxShadow: '0 0 30px rgba(212,175,55,0.3)',
					}}>
						<img src={playerPortrait} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
					</div>
					<span style={{ color: '#ffd97a', fontSize: 18, fontWeight: 700, letterSpacing: '0.1em' }}>YOU</span>
				</div>

				{/* VS text */}
				<div className="pvp-vs-mark">
					VS
				</div>

				{/* Opponent — real portrait when army announced, mystery silhouette otherwise */}
				<div className="pvp-vs-fighter pvp-vs-fighter-right">
					<div style={{
						width: 140, height: 140, borderRadius: '50%', overflow: 'hidden',
						border: '3px solid rgba(150,30,30,0.7)',
					boxShadow: '0 0 30px rgba(150,30,30,0.3)',
					background: opponentPortrait ? undefined : 'radial-gradient(circle, rgba(60,20,20,0.8) 0%, rgba(20,5,5,0.9) 100%)',
					display: 'flex', alignItems: 'center', justifyContent: 'center',
					fontSize: 48, color: 'rgba(239,68,68,0.5)',
				}}>
					{opponentPortrait
						? <img src={opponentPortrait} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
						: '?'}
					</div>
					<span style={{ color: '#f17070', fontSize: 18, fontWeight: 700, letterSpacing: '0.1em' }}>{opponentLabel}</span>
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
	const persistedArmy = useWarbandStore(selectArmy);
	const navigate = useNavigate();
	const { status: matchmakingStatus, roomId, joinQueue, leaveQueue } = useMatchmaking();
	const opponentArmyFromPeer = usePeerStore(s => s.opponentArmy);
	const p2pInitApplied = usePeerStore(s => s.p2pInitApplied);
	const p2pSessionLocalAuthorized = usePeerStore(s => s.p2pSessionLocalAuthorized);
	const p2pSessionRemoteAuthorized = usePeerStore(s => s.p2pSessionRemoteAuthorized);
	const p2pSessionAuthError = usePeerStore(s => s.p2pSessionAuthError);
	const connectionState = usePeerStore(s => s.connectionState);
	const reconnectCountdown = usePeerStore(s => s.reconnectCountdown);
	const reconnectAttemptCount = usePeerStore(s => s.reconnectAttemptCount);
	const forfeitSide = usePeerStore(s => s.forfeitSide);
	const hiveUsername = useNFTUsername();
	const authenticatedHiveUsername = useAuthenticatedHiveUsername();
	const reloadGuardPromptedRef = useRef(false);
	const requiresHiveSession = isSharedNetworkEnvironment();
	const p2pAccess = resolveProtectedFlowAccess({
		accountId: hiveUsername,
		authenticatedAccountId: authenticatedHiveUsername,
		sharedNetwork: requiresHiveSession,
		surface: 'multiplayer',
		requiresAuthenticatedSession: true,
	});
	const hasHiveSession = p2pAccess.kind === 'allowed' && (!requiresHiveSession || isHiveWalletAvailable());
	const shouldWarnBeforeUnload = gameStarted
		&& (
			connectionState === 'connected'
			|| connectionState === 'reconnecting'
			|| connectionState === 'grace_period'
		);

	// VS screen is now triggered ONLY when the lobby calls `onGameStart` (after its
	// own connection-confirmation delay). The previous flow auto-fired VS the instant
	// `connectionState` flipped to 'connected', which made the lobby's connected
	// panel invisible (1 React frame before VS pre-empted). Letting the lobby own
	// the "show who connected, then transition" sequence keeps the user oriented.

	// Handle matchmaking completion. Both peers run this — the WS server resolves
	// host vs client by order of arrival in the room, so we no longer branch on
	// the matchmaking-emitted isHost (which was advisory under WebRTC anyway).
	useEffect(() => {
		if (matchmakingStatus === 'matched' && roomId && persistedArmy && !gameStarted) {
			usePeerStore.getState().connectToRoom(roomId).catch(err => {
				debug.error('[MultiplayerGame] connectToRoom failed:', err);
			});
		}
	}, [matchmakingStatus, roomId, persistedArmy, gameStarted]);

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

	useEffect(() => {
		if (!shouldWarnBeforeUnload) {
			reloadGuardPromptedRef.current = false;
			return undefined;
		}
		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			if (!reloadGuardPromptedRef.current) {
				reloadGuardPromptedRef.current = true;
				recordSessionEvent('p2p_reload_guard_prompted', {
					connectionState,
					policy: 'hard_reload_loses_in_memory_game_state',
					evidence: 'download_session_log_if_reload_is_cancelled',
				});
			}
			const warning = 'A live P2P match is in progress. Reloading may forfeit the local session.';
			event.preventDefault();
			Reflect.set(event, 'returnValue', warning);
			return warning;
		};
		window.addEventListener('beforeunload', handleBeforeUnload);
		return () => window.removeEventListener('beforeunload', handleBeforeUnload);
	}, [connectionState, shouldWarnBeforeUnload]);

	useEffect(() => {
		if (!gameStarted || !forfeitSide) return;
		const { gameState } = useGameStore.getState();
		if (!gameState || gameState.gamePhase === 'game_over') return;

		const localLost = forfeitSide !== 'opponent';
		const now = Date.now();
		recordSessionEvent('p2p_technical_result', {
			forfeitSide,
			localOutcome: localLost ? 'defeat' : 'victory',
			reason: 'reconnect_window_expired',
			runeSettlement: 'not_credited_from_result_only',
		});
		useGameStore.setState({
			gameState: {
				...gameState,
				gamePhase: 'game_over',
				winner: localLost ? 'opponent' : 'player',
				gameLog: [
					...gameState.gameLog,
					{
						id: `p2p_forfeit_${now}`,
						type: 'effect',
						player: localLost ? 'player' : 'opponent',
						text: localLost
							? 'Technical defeat: connection was not restored within 60 seconds.'
							: 'Technical victory: opponent did not reconnect within 60 seconds.',
						timestamp: now,
						turn: gameState.turnNumber,
					},
				],
			},
		});
	}, [gameStarted, forfeitSide]);

	// Clean up peer + matchmaking queue when leaving the multiplayer screen.
	// Without this, a peer created by host() in the lobby's Quick Match path
	// (or a stale connection from a prior attempt) lingers in peerStore. Next
	// time the user enters MultiplayerGame, `existingPeerId` is non-null and
	// the flow inherits zombie state instead of starting fresh.
	useEffect(() => {
		return () => {
			leaveQueue().catch(() => { /* best effort — leaving page anyway */ });
			usePeerStore.getState().disconnect();
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

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
		if (showVS && !gameStarted) {
			return (
				<PvPVSScreen
					playerArmy={readyArmy}
					opponentArmy={opponentArmyFromPeer}
					opponentPeerId={usePeerStore.getState().remotePeerId}
					onComplete={() => { setShowVS(false); setGameStarted(true); }}
				/>
			);
		}

		if (!gameStarted) {
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
		//      b. p2pInitApplied: the host's `init` envelope has been applied
		//         locally (host: after initGameWithSeed; client: after the
		//         `case 'init'` handler ran setState). Until then the coordinator
		//         stays unmounted so user input cannot reach an empty / stale
		//         gameState (TD-15).
		//   2. <MatchSetupP2P/> — silent ctx wiring. Once seed_reveal +
		//      p2pInitApplied are in, calls resolveP2P() and pushes the
		//      MatchContext into useMatchStore BEFORE the coordinator mounts.
		//      The coordinator's mode-aware code (Fase 3-4) reads ctx as
		//      non-null from its first render.
		// Hive session authorization is intentionally not a hard gameplay gate
		// in closed beta. It feeds audit/settlement transcript evidence, but P2P
		// gameplay must not fail just because a wallet prompt is pending.
		// The P2PProvider wrapping all of renderInner keeps useWireSync mounted
		// behind the spinner so the init envelope is still received.
		const guard = computeP2PRenderGuard({
			opponentArmyFromPeer,
			p2pInitApplied,
			p2pSessionLocalAuthorized,
			p2pSessionRemoteAuthorized,
			p2pSessionAuthError,
			connectionState,
			reconnectCountdown,
			reconnectAttemptCount,
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
	return <P2PProvider>{renderInner()}</P2PProvider>;
};
