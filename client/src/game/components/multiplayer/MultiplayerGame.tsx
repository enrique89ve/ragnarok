import React, { useState, useEffect } from 'react';
import { debug } from '../../config/debugConfig';
import { usePeerStore } from '../../stores/peerStore';
import { MultiplayerLobby } from './MultiplayerLobby';
import RagnarokGameCoordinator from '../../coordinator/RagnarokGameCoordinator';
import ArmySelectionComponent from '../ArmySelection';
import { ArmySelection as ArmySelectionType } from '../../types/ChessTypes';
import { useNavigate } from 'react-router-dom';
import { routes } from '../../../lib/routes';
import { useMatchmaking } from '../../hooks/useMatchmaking';
import { useWarbandStore, selectArmy } from '../../../lib/stores/useWarbandStore';
import { ToastProvider } from '../../../components/ui-norse';
import { P2PStatusBadge } from './P2PStatusBadge';
import { resolveHeroPortrait } from '../../utils/art/artMapping';
import { P2PProvider } from '../../context/P2PContext';
import { computeP2PRenderGuard } from './multiplayerRenderGuard';

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
		<div style={{
			position: 'fixed', inset: 0, zIndex: 9000, display: 'flex',
			alignItems: 'center', justifyContent: 'center', gap: 60,
			background: 'radial-gradient(ellipse, rgba(8,6,14,0.92) 0%, #000 100%)',
			fontFamily: "'Cinzel', Georgia, serif",
		}}>
			{/* Player hero */}
			<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, animation: 'pvp-vs-slide-left 0.6s ease-out' }}>
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
			<div style={{
				fontSize: 56, fontWeight: 900, color: '#ef4444', letterSpacing: '0.15em',
				textShadow: '0 0 40px rgba(239,68,68,0.6), 0 4px 20px rgba(0,0,0,0.9)',
				animation: 'pvp-vs-pulse 1.5s ease-in-out infinite',
			}}>
				VS
			</div>

			{/* Opponent — real portrait when army announced, mystery silhouette otherwise */}
			<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, animation: 'pvp-vs-slide-right 0.6s ease-out' }}>
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

			<style>{`
				@keyframes pvp-vs-slide-left { from { opacity: 0; transform: translateX(-60px); } to { opacity: 1; transform: translateX(0); } }
				@keyframes pvp-vs-slide-right { from { opacity: 0; transform: translateX(60px); } to { opacity: 1; transform: translateX(0); } }
				@keyframes pvp-vs-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
			`}</style>
		</div>
	);
}

export const MultiplayerGame: React.FC = () => {
	const [gameStarted, setGameStarted] = useState(false);
	const [showVS, setShowVS] = useState(false);
	const persistedArmy = useWarbandStore(selectArmy);
	const setWarband = useWarbandStore(s => s.setWarband);
	const [armySelected, setArmySelected] = useState(false);
	const [playerArmy, setPlayerArmy] = useState<ArmySelectionType | null>(persistedArmy);
	const navigate = useNavigate();
	const { status: matchmakingStatus, roomId, joinQueue, leaveQueue } = useMatchmaking();
	const opponentArmyFromPeer = usePeerStore(s => s.opponentArmy);
	const p2pInitApplied = usePeerStore(s => s.p2pInitApplied);

	// VS screen is now triggered ONLY when the lobby calls `onGameStart` (after its
	// own connection-confirmation delay). The previous flow auto-fired VS the instant
	// `connectionState` flipped to 'connected', which made the lobby's connected
	// panel invisible (1 React frame before VS pre-empted). Letting the lobby own
	// the "show who connected, then transition" sequence keeps the user oriented.

	// Handle matchmaking completion. Both peers run this — the WS server resolves
	// host vs client by order of arrival in the room, so we no longer branch on
	// the matchmaking-emitted isHost (which was advisory under WebRTC anyway).
	useEffect(() => {
		if (matchmakingStatus === 'matched' && roomId && armySelected && !gameStarted) {
			usePeerStore.getState().connectToRoom(roomId).catch(err => {
				debug.error('[MultiplayerGame] connectToRoom failed:', err);
			});
		}
	}, [matchmakingStatus, roomId, armySelected, gameStarted]);

	const handleArmyComplete = (army: ArmySelectionType) => {
		setWarband(army, []);
		setPlayerArmy(army);
		setArmySelected(true);
	};

	// ArmySelection now just commits the army; the lobby owns the matchmaking
	// choice. Previously this function pre-allocated a peer and pushed the user
	// into the queue from ArmySelection, which made the lobby render with
	// `matchmakingStatus === 'queued'` — hiding the Host Game / Join Game options
	// the user expected to see.
	const handleMatchmakingStart = async (army: ArmySelectionType) => {
		setWarband(army, []);
		setPlayerArmy(army);
		setArmySelected(true);
	};

	const handleBack = () => {
		navigate(routes.home);
	};

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

	// P2PProvider wraps every render of this component so `useP2PSync` is mounted
	// from the moment MultiplayerGame appears, regardless of whether we're in
	// army selection, the lobby, the VS screen, or in-game. This is critical:
	// without it, the data listener on the peer connection never attaches,
	// heartbeats from the remote peer are silently dropped, and peerStore declares
	// the connection dead after `HEARTBEAT_TIMEOUT_MS` (12s).
	const renderInner = () => {
		if (!armySelected) {
			return (
				<ArmySelectionComponent
					onComplete={handleArmyComplete}
					onBack={handleBack}
					isMultiplayer={true}
					onMatchmakingStart={handleMatchmakingStart}
				/>
			);
		}

		if (showVS && !gameStarted && playerArmy) {
			return (
				<PvPVSScreen
					playerArmy={playerArmy}
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

		// Multiplayer game UI: pass the opponent army announced via P2P so the
		// coordinator renders real hero portraits instead of the default fallback.
		// Two gates here:
		//   1. opponentArmyFromPeer: the opponent's army announcement arrived.
		//   2. p2pInitApplied: the host's `init` envelope has been applied
		//      locally (host: after initGameWithSeed; client: after the case
		//      'init' handler ran setState). Until both are true the
		//      coordinator stays unmounted so user input cannot reach an empty
		//      / stale gameState. The P2PProvider wrapping all of renderInner
		//      keeps useP2PSync mounted behind the spinner so the init
		//      envelope is still received.
		const guard = computeP2PRenderGuard({ opponentArmyFromPeer, p2pInitApplied });
		if (guard.kind === 'wait') {
			return (
				<div className="flex items-center justify-center min-h-screen bg-linear-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
					<div className="text-center space-y-3">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-(--gold-400) mx-auto" />
						<p className="text-sm text-(--ink-300)">{guard.reason}</p>
					</div>
				</div>
			);
		}
		return (
			<>
				<ToastProvider position="top-right" richColors />
				<P2PStatusBadge />
				<RagnarokGameCoordinator initialArmy={playerArmy} opponentArmy={opponentArmyFromPeer} />
			</>
		);
	};

	return <P2PProvider>{renderInner()}</P2PProvider>;
};
