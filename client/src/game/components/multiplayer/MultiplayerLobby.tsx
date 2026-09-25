import { useState, useSyncExternalStore } from 'react';
import { usePeerStore } from '../../stores/peerStore';
import { useMatchmaking } from '../../hooks/useMatchmaking';
import { useNFTUsername } from '../../nft/hooks';
import { useFriendStore } from '../../stores/friendStore';
import { useStarterStore } from '../../stores/starterStore';
import {
	Panel,
	PanelContent,
	PanelDescription,
	PanelHeader,
	PanelTitle,
} from '../../../components/ui-norse';
import {
	Radio,
	Search,
	ShieldCheck,
	Swords,
	Users,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ServerSignedChallenge } from '@shared/p2pAvailability';
import { ensureFriendSession, invalidateFriendSession } from '../social/friendSession';
import { isSharedNetworkEnvironment } from '../../config/featureFlags';
import { useGameStore } from '../../stores/gameStore';
import { getAuthenticatedHiveUsername, subscribeHiveSessionIdentity } from '../../../data/HiveSessionIdentity';
import {
	getActiveIncomingChallenges,
	getConnectedMatchProgress,
	getDirectChallengeBlockCopy,
	getDirectChallengeProtectedBlockMessage,
	getDirectChallengeRoomAccessFor,
	getQuickMatchLobbyReadiness,
	getLobbyProgressCopy,
	isOutgoingChallengeActive,
	resolveDirectChallengeRoomId,
	resolveLobbyMatchProgress,
	resolveLobbyProgressStep,
	type DirectChallengeAccessContext,
} from './MultiplayerLobby.logic';
import {
	ConnectedPanel,
	ConnectingPanel,
	ConnectionErrorPanel,
	IdleMatchControls,
	IncomingChallengesPanel,
	MatchmakingAuthorizingPanel,
	MatchmakingErrorPanel,
	MatchedProgressPanel,
	MatchOfferPanel,
	OutgoingChallengePanel,
	QueuePanel,
	WaitingPanel,
} from './MultiplayerLobbyPanels';
import {
	useAutoAcceptQuickMatchOffer,
	useIncomingChallengePoll,
	useLobbyClock,
	useMatchStartDelay,
	usePageVisibility,
} from './useMultiplayerLobbyOrchestration';
import './MultiplayerLobby.css';

interface MultiplayerLobbyProps {
	onGameStart: () => void;
	joinQueue: () => Promise<boolean>;
	leaveQueue: () => Promise<void>;
}

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({ onGameStart, joinQueue, leaveQueue }) => {
	const {
		myPeerId,
		remotePeerId,
		connectionState,
		isHost,
		error,
		opponentArmy,
		p2pInitApplied,
		p2pSessionLocalAuthorized,
		p2pSessionRemoteAuthorized,
		p2pSessionAuthError,
		p2pBattleReadyLocal,
		p2pBattleReadyRemote,
		p2pBattleReadyExpectedRemoteLoadoutHash,
		reconnectCountdown,
		reconnectAttemptCount,
		host,
		join,
		connectToRoom,
		disconnect,
		setMyPeerId,
		setMatchChallenges,
		setMatchTicket,
		clearMatchChallenges,
		setRemotePeerId,
	} = usePeerStore();

	const {
		status: matchmakingStatus,
		queuePosition,
		roomId: matchmakingRoomId,
		error: matchmakingError,
		offer: matchOffer,
		matchCommitted,
		acceptOffer,
		declineOffer,
	} = useMatchmaking();
	const hiveUsername = useNFTUsername();
	const authenticatedHiveUsername = useSyncExternalStore(
		subscribeHiveSessionIdentity,
		getAuthenticatedHiveUsername,
		getAuthenticatedHiveUsername,
	);
	const pendingChallenges = useFriendStore(s => s.pendingChallenges);
	const outgoingChallenge = useFriendStore(s => s.outgoingChallenge);
	const addChallenges = useFriendStore(s => s.addChallenges);
	const dismissChallenge = useFriendStore(s => s.dismissChallenge);
	const clearOutgoingChallenge = useFriendStore(s => s.clearOutgoingChallenge);
	const clearChallenges = useFriendStore(s => s.clearChallenges);
	const pruneExpiredChallenges = useFriendStore(s => s.pruneExpiredChallenges);

	const [joinId, setJoinId] = useState('');
	const [copied, setCopied] = useState(false);
	const [, setMode] = useState<'manual' | 'quick'>('manual');
	const [acceptingFrom, setAcceptingFrom] = useState<string | null>(null);
	const [openingOutgoing, setOpeningOutgoing] = useState(false);

	const pageVisible = usePageVisibility();
	useAutoAcceptQuickMatchOffer({
		matchmakingStatus,
		matchOffer,
		pageVisible,
		acceptOffer,
	});
	useIncomingChallengePoll({
		hiveUsername,
		ensureSession: ensureFriendSession,
		invalidateSession: invalidateFriendSession,
		addChallenges,
		clearChallenges,
		clearOutgoingChallenge,
		pruneExpiredChallenges,
	});
	const now = useLobbyClock({
		pendingChallengeCount: pendingChallenges.length,
		outgoingChallenge,
		matchOffer,
		pruneExpiredChallenges,
	});

	const activeIncomingChallenges = getActiveIncomingChallenges(pendingChallenges, now);
	const activeOutgoingChallenge = isOutgoingChallengeActive(outgoingChallenge, now) ? outgoingChallenge : null;
	const sharedNetwork = isSharedNetworkEnvironment();
	const starterClaimed = useStarterStore(state => Boolean(hiveUsername && state.hasClaimed(hiveUsername)));
	const protectedBlockMessage = getDirectChallengeProtectedBlockMessage({
		hiveUsername,
		authenticatedHiveUsername,
		sharedNetwork,
		starterClaimed,
	});
	const challengeAccessContext = {
		connectionState,
		matchmakingStatus,
		now,
		sharedNetwork,
		protectedBlockMessage,
	} satisfies DirectChallengeAccessContext;
	const idleControlsVisible = connectionState === 'disconnected' && matchmakingStatus === 'idle';
	const legacyMatchProgress = getConnectedMatchProgress({
		connectionState,
		opponentArmy,
		p2pInitApplied,
		p2pSessionLocalAuthorized,
		p2pSessionRemoteAuthorized,
		p2pSessionAuthError,
		reconnectCountdown,
		reconnectAttemptCount,
	});
	const matchTicket = usePeerStore(state => state.matchTicket);
	const matchId = useGameStore(state => state.matchId);
	const matchSeed = useGameStore(state => state.matchSeed);
	const quickBattleReadiness = getQuickMatchLobbyReadiness({
		serverMatchCommitted: matchCommitted,
		localAcceptanceVerified: p2pSessionLocalAuthorized,
		remoteAcceptanceVerified: p2pSessionRemoteAuthorized,
		matchTicket,
		expectedRoomId: matchmakingRoomId,
		expectedPeerId: myPeerId,
		connectionState,
		remotePeerId,
		opponentArmy,
		p2pInitApplied,
		matchId,
		matchSeed,
		localBattleReady: p2pBattleReadyLocal,
		remoteBattleReady: p2pBattleReadyRemote,
		expectedRemoteLoadoutHash: p2pBattleReadyExpectedRemoteLoadoutHash,
		now,
	});
	const matchProgress = resolveLobbyMatchProgress({
		connectionState,
		matchCommitted,
		matchTicket,
		quickBattleReadiness,
		legacyMatchProgress,
	});
	const matchStarting = useMatchStartDelay({
		connectionState,
		myPeerId,
		remotePeerId,
		matchProgressReady: matchProgress.ready,
		onGameStart,
	});

	const handleHost = async () => {
		if (isSharedNetworkEnvironment()) {
			toast.error('Manual rooms are disabled on the secured relay. Use Quick Match or Warband Challenge.');
			return;
		}
		try {
			await host();
			toast.success('Game created! Share your ID with your opponent.');
		} catch (_err) {
			toast.error('Failed to create game. Please try again.');
		}
	};

	const handleJoin = async () => {
		if (isSharedNetworkEnvironment()) {
			toast.error('Manual rooms are disabled on the secured relay. Use Quick Match or Warband Challenge.');
			return;
		}
		if (!joinId.trim()) {
			toast.error('Please enter a game ID');
			return;
		}
		try {
			await join(joinId.trim());
			toast.success('Connecting to game...');
		} catch (_err) {
			toast.error('Failed to join game. Check the ID and try again.');
		}
	};

	const handleCopyId = async () => {
		if (myPeerId) {
			await navigator.clipboard.writeText(myPeerId);
			setCopied(true);
			toast.success('Game ID copied to clipboard!');
			setTimeout(() => setCopied(false), 2000);
		}
	};

	const handleDisconnect = () => {
		disconnect();
		clearMatchChallenges();
		void leaveQueue();
		setJoinId('');
		setRemotePeerId(null);
		setMode('manual');
		toast.info('Disconnected from game');
	};

	const handleUseManualMatch = () => {
		void leaveQueue();
		setMode('manual');
	};

	const handleQuickMatch = async () => {
		setMode('quick');
		if (!myPeerId) usePeerStore.getState().prepareForMatchmaking();
		const queued = await joinQueue();
		if (!queued) {
			toast.error('Failed to join matchmaking queue');
		}
	};

	const handleAcceptChallenge = async (challenge: ServerSignedChallenge) => {
		const access = getDirectChallengeRoomAccessFor(challenge, challengeAccessContext);
		if (!access.ok) {
			toast.error(getDirectChallengeBlockCopy(access) ?? 'Could not accept this challenge.');
			return;
		}
		setAcceptingFrom(challenge.from);
		try {
			dismissChallenge(challenge.from);
			setMatchChallenges(challenge, null);
			setMatchTicket(challenge.matchTicket ?? null);
			if (challenge.matchTicket) setMyPeerId(challenge.matchTicket.peerId);
			await join(resolveDirectChallengeRoomId(challenge));
			toast.success(`Joining @${challenge.from}.`);
		} catch {
			toast.error('Could not join the challenge room.');
		} finally {
			setAcceptingFrom(null);
		}
	};

	const handleDeclineChallenge = (challenge: ServerSignedChallenge) => {
		dismissChallenge(challenge.from);
		toast.info(`Declined @${challenge.from}.`);
	};

	const handleOpenOutgoingRoom = async () => {
		if (!activeOutgoingChallenge) return;
		const access = getDirectChallengeRoomAccessFor(activeOutgoingChallenge, challengeAccessContext);
		if (!access.ok) {
			const message = access.reason === 'missing_relay_ticket'
				? 'This challenge is missing a relay ticket. Send a new challenge.'
				: (getDirectChallengeBlockCopy(access) ?? 'Could not open this challenge room.');
			toast.error(message);
			if (access.reason === 'missing_relay_ticket') clearOutgoingChallenge();
			return;
		}
		setOpeningOutgoing(true);
		try {
			setMatchChallenges(
				activeOutgoingChallenge.matchChallenge ?? null,
				activeOutgoingChallenge.opponentMatchChallenge ?? null,
			);
			setMatchTicket(activeOutgoingChallenge.matchTicket ?? null);
			setMyPeerId(activeOutgoingChallenge.matchTicket?.peerId ?? activeOutgoingChallenge.peerId);
			await connectToRoom(activeOutgoingChallenge.peerId);
			toast.success(`Challenge room opened for @${activeOutgoingChallenge.to}.`);
		} catch {
			toast.error('Could not open the challenge room.');
		} finally {
			setOpeningOutgoing(false);
		}
	};

	const currentProgressStep = resolveLobbyProgressStep({
		matchmakingStatus,
		connectionState,
		matchCommitted,
		matchOffer,
		battleReady: quickBattleReadiness.ready,
	});
	const progressCopy = getLobbyProgressCopy(currentProgressStep, Boolean(matchOffer), matchmakingStatus);

	return (
		<div className="multiplayer-lobby-shell min-h-dvh w-full overflow-y-auto px-4 py-6 text-ink-0 sm:px-6 sm:py-10">
			<div className="mx-auto grid min-h-[calc(100dvh-3rem)] w-full max-w-6xl items-center gap-6 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:gap-10">
				<section className="multiplayer-lobby-intro min-w-0 flex flex-col items-center justify-center py-2 text-center lg:py-8" aria-labelledby="p2p-lobby-title">
					<div className="mb-5 flex items-center justify-center gap-3 text-gold-200">
						<span className="grid h-10 w-10 place-items-center border border-gold-300/50 bg-gold-300/10">
							<Swords className="h-5 w-5" aria-hidden={true} />
						</span>
						<span className="h-px w-12 bg-gold-500/60" />
						<span className="font-display text-[10px] font-black uppercase tracking-[0.22em]">P2P / War table</span>
					</div>
					<p className="font-display text-[10px] font-black uppercase tracking-[0.22em] text-bifrost-100">{progressCopy.eyebrow}</p>
					<h1 id="p2p-lobby-title" className="multiplayer-lobby-title mt-3 w-full max-w-full font-display text-3xl font-black uppercase leading-[1.02] tracking-[0.04em] text-ink-0 sm:text-4xl lg:text-[clamp(2.25rem,3.8vw,3.75rem)]">
						{progressCopy.title}
					</h1>
					<p className="mt-4 max-w-sm text-base leading-relaxed text-ink-200 sm:text-lg">{progressCopy.detail}</p>
					<div className="mt-7 flex max-w-md flex-wrap justify-center gap-x-4 gap-y-2 border-t border-obsidian-700/80 pt-4 text-xs text-ink-200">
						<div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-rune-300" aria-hidden={true} /><span>Peer-authorized</span></div>
						<div className="flex items-center gap-2"><Search className="h-4 w-4 text-gold-200" aria-hidden={true} /><span>Shared state</span></div>
						<div className="flex items-center gap-2"><Radio className="h-4 w-4 text-bifrost-100" aria-hidden={true} /><span>P2P gameplay</span></div>
					</div>
				</section>

				<Panel className="multiplayer-lobby-panel w-full max-w-none rounded-md overflow-hidden">
					<PanelHeader className="border-b-0 p-0">
						<div className="flex flex-col items-center gap-3 p-5 text-center sm:p-6">
							<div>
								<p className="font-display text-[10px] font-black uppercase tracking-[0.2em] text-gold-200">Ragnarok multiplayer</p>
								<PanelTitle className="mt-2 flex items-center justify-center gap-2 text-xl sm:text-2xl">
									<Users className="h-5 w-5 text-gold-300" aria-hidden={true} />
									Choose battle
								</PanelTitle>
								<PanelDescription className="mt-2 max-w-lg">Peer-authorized P2P.</PanelDescription>
							</div>
							<span className="inline-flex shrink-0 items-center gap-2 border border-bifrost-300/35 bg-bifrost-500/8 px-3 py-2 font-display text-[10px] font-black uppercase tracking-[0.14em] text-bifrost-100">
								<span className="h-2 w-2 rounded-full bg-bifrost-100 shadow-[0_0_10px_var(--bifrost-300)]" />
								Peer link
							</span>
						</div>
					</PanelHeader>
					<PanelContent className="space-y-5 p-5 sm:p-6">
					<IncomingChallengesPanel
						challenges={activeIncomingChallenges}
						accessContext={challengeAccessContext}
						acceptingFrom={acceptingFrom}
						onAcceptChallenge={handleAcceptChallenge}
						onDeclineChallenge={handleDeclineChallenge}
					/>
					<OutgoingChallengePanel
						challenge={activeOutgoingChallenge}
						accessContext={challengeAccessContext}
						openingOutgoing={openingOutgoing}
						onOpenRoom={handleOpenOutgoingRoom}
						onCancelChallenge={clearOutgoingChallenge}
					/>
					<IdleMatchControls
						visible={idleControlsVisible}
						manualRoomsEnabled={!sharedNetwork}
						joinId={joinId}
						onJoinIdChange={setJoinId}
						onQuickMatch={handleQuickMatch}
						onHost={handleHost}
						onJoin={handleJoin}
					/>
					<QueuePanel
						status={matchmakingStatus}
						queuePosition={queuePosition}
						onLeaveQueue={leaveQueue}
					/>
					<MatchmakingAuthorizingPanel status={matchmakingStatus} />
						<MatchOfferPanel
							offer={matchOffer}
							localUsername={hiveUsername}
							onAccept={async () => { await acceptOffer(); }}
							onDecline={declineOffer}
							status={matchmakingStatus}
							accepting={matchmakingStatus === 'accepting'}
							interactive={matchmakingStatus === 'offered'}
							now={now}
					/>
					<MatchedProgressPanel
						status={matchmakingStatus}
						connectionState={connectionState}
						matchProgress={matchProgress}
					/>
					<MatchmakingErrorPanel
						error={matchmakingError}
						onTryAgain={leaveQueue}
						onUseManualMatch={handleUseManualMatch}
					/>
					<ConnectingPanel connectionState={connectionState} isHost={isHost} />
					<WaitingPanel
						connectionState={connectionState}
						myPeerId={myPeerId}
						copied={copied}
						onCopyId={handleCopyId}
						onDisconnect={handleDisconnect}
					/>
					<ConnectedPanel
						connectionState={connectionState}
						myPeerId={myPeerId}
						remotePeerId={remotePeerId}
						isHost={isHost}
						copied={copied}
						matchStarting={matchStarting}
						matchProgress={matchProgress}
						onCopyId={handleCopyId}
						onDisconnect={handleDisconnect}
					/>
					<ConnectionErrorPanel
						connectionState={connectionState}
						error={error}
						onDisconnect={handleDisconnect}
					/>
					</PanelContent>
				</Panel>
			</div>
		</div>
	);
};
