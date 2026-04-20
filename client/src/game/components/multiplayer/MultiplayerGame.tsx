import React, { useState, useEffect, useRef } from 'react';
import { debug } from '../../config/debugConfig';
import { usePeerStore } from '../../stores/peerStore';
import { MultiplayerLobby } from './MultiplayerLobby';
import RagnarokChessGame from '../chess/RagnarokChessGame';
import ArmySelectionComponent from '../ArmySelection';
import { ArmySelection as ArmySelectionType } from '../../types/ChessTypes';
import { useNavigate } from 'react-router-dom';
import { routes } from '../../../lib/routes';
import { useMatchmaking } from '../../hooks/useMatchmaking';
import { Toaster } from '../../../components/ui/sonner';
import { P2PStatusBadge } from './P2PStatusBadge';
import { resolveHeroPortrait } from '../../utils/art/artMapping';

/*
  PvPVSScreen — 3-second dramatic splash showing "Player vs Opponent"
  with hero portraits. Fires once when the P2P connection is established
  and army is selected, before the chess board loads.
*/
function PvPVSScreen({ playerArmy, onComplete }: { playerArmy: ArmySelectionType; onComplete: () => void }) {
	useEffect(() => {
		const timer = setTimeout(onComplete, 3200);
		return () => clearTimeout(timer);
	}, [onComplete]);

	const playerHeroId = playerArmy?.queen?.id || playerArmy?.rook?.id || 'hero-odin';
	const playerPortrait = resolveHeroPortrait(playerHeroId);
	// Opponent hero isn't known until game state syncs, show mystery silhouette
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

			{/* Opponent (mystery) */}
			<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, animation: 'pvp-vs-slide-right 0.6s ease-out' }}>
				<div style={{
					width: 140, height: 140, borderRadius: '50%', overflow: 'hidden',
					border: '3px solid rgba(150,30,30,0.7)',
					boxShadow: '0 0 30px rgba(150,30,30,0.3)',
					background: 'radial-gradient(circle, rgba(60,20,20,0.8) 0%, rgba(20,5,5,0.9) 100%)',
					display: 'flex', alignItems: 'center', justifyContent: 'center',
					fontSize: 48, color: 'rgba(239,68,68,0.5)',
				}}>
					?
				</div>
				<span style={{ color: '#f17070', fontSize: 18, fontWeight: 700, letterSpacing: '0.1em' }}>OPPONENT</span>
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
	const { connectionState } = usePeerStore();
	const [gameStarted, setGameStarted] = useState(false);
	const [showVS, setShowVS] = useState(false);
	const [armySelected, setArmySelected] = useState(false);
	const [playerArmy, setPlayerArmy] = useState<ArmySelectionType | null>(null);
	const navigate = useNavigate();
	const { status: matchmakingStatus, opponentPeerId, isHost: matchmakingIsHost, joinQueue } = useMatchmaking();
	const { host, join } = usePeerStore();
	const vsShownRef = useRef(false);

	// Show VS screen when connected, then start game after 3s
	useEffect(() => {
		if (connectionState === 'connected' && armySelected && !vsShownRef.current) {
			vsShownRef.current = true;
			setShowVS(true);
		}
	}, [connectionState, armySelected]);

	// Handle matchmaking completion
	useEffect(() => {
		if (matchmakingStatus === 'matched' && opponentPeerId && armySelected && !gameStarted) {
			const connectToOpponent = async () => {
				try {
					if (!matchmakingIsHost) {
						// Client connects to the host's already-running peer
						await join(opponentPeerId);
					}
					// Host already has a running peer from the initial host() call in handleMatchmakingStart
					// The client will connect to us - no action needed
				} catch (err) {
					debug.error('Failed to connect to opponent:', err);
				}
			};
			connectToOpponent();
		}
	}, [matchmakingStatus, opponentPeerId, matchmakingIsHost, armySelected, gameStarted, join]);

	const handleArmyComplete = (army: ArmySelectionType) => {
		setPlayerArmy(army);
		setArmySelected(true);
	};

	const handleMatchmakingStart = async (army: ArmySelectionType) => {
		setPlayerArmy(army);
		setArmySelected(true);
		// Create peer only if ArmySelection hasn't already done so
		const { myPeerId: existingPeerId } = usePeerStore.getState();
		if (!existingPeerId) {
			try {
				await host();
			} catch (err) {
				debug.error('[MultiplayerGame] Failed to initialize peer for matchmaking:', err);
				return;
			}
		}
		await joinQueue();
	};

	const handleBack = () => {
		navigate(routes.home);
	};

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
				onComplete={() => { setShowVS(false); setGameStarted(true); }}
			/>
		);
	}

	if (!gameStarted) {
		return <MultiplayerLobby onGameStart={() => setGameStarted(true)} />;
	}

	return (
		<>
			<Toaster position="top-right" richColors />
			<P2PStatusBadge />
			<RagnarokChessGame initialArmy={playerArmy} />
		</>
	);
};
