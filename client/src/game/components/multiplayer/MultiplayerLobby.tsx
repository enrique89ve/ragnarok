import { useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePeerStore } from '../../stores/peerStore';
import { useMatchmaking } from '../../hooks/useMatchmaking';
import { useNFTUsername } from '../../nft/hooks';
import { useFriendStore } from '../../stores/friendStore';
import { useStarterStore } from '../../stores/starterStore';
import { useWarbandStore, selectArmy } from '../../../lib/stores/useWarbandStore';
import { routes } from '../../../lib/routes';
import { getWarbandEntryRoute } from '../../../lib/warbandRoutes';
import {
	Panel,
	PanelContent,
	PanelHeader,
	PanelTitle,
} from '../../../components/ui-norse';
import {
	ArrowLeft,
	Swords,
	Users,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ServerSignedChallenge } from '@shared/p2pAvailability';
import FriendsPanel from '../social/FriendsPanel';
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
	resolveLobbyStatusBadge,
	type DirectChallengeAccessContext,
	type LobbyStatusTone,
} from './MultiplayerLobby.logic';
import {
	ConnectedPanel,
	ConnectingPanel,
	ConnectionErrorPanel,
	HiveAvatar,
	IdleMatchControls,
	IncomingChallengesPanel,
	LobbyStepper,
	LobbyWarbandPreview,
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
	const friends = useFriendStore(s => s.friends);
	const onlineStatus = useFriendStore(s => s.onlineStatus);
	const addChallenges = useFriendStore(s => s.addChallenges);
	const dismissChallenge = useFriendStore(s => s.dismissChallenge);
	const clearOutgoingChallenge = useFriendStore(s => s.clearOutgoingChallenge);
	const clearChallenges = useFriendStore(s => s.clearChallenges);
	const pruneExpiredChallenges = useFriendStore(s => s.pruneExpiredChallenges);
	const selectedArmy = useWarbandStore(selectArmy);
	const navigate = useNavigate();

	const [joinId, setJoinId] = useState('');
	const [copied, setCopied] = useState(false);
	const [, setMode] = useState<'manual' | 'quick'>('manual');
	const [acceptingFrom, setAcceptingFrom] = useState<string | null>(null);
	const [openingOutgoing, setOpeningOutgoing] = useState(false);
	const [friendsOpen, setFriendsOpen] = useState(false);

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
	const statusBadge = resolveLobbyStatusBadge({
		matchmakingStatus,
		connectionState,
		matchReady: matchProgress.ready,
		hasError: Boolean(matchmakingError || (connectionState === 'error' && error)),
	});
	const statusToneClasses: Record<LobbyStatusTone, { readonly pill: string; readonly dot: string }> = {
		idle: {
			pill: 'border-obsidian-600/90 bg-obsidian-950/75 text-ink-200',
			dot: 'bg-bifrost-300',
		},
		active: {
			pill: 'border-gold-300/50 bg-gold-300/12 text-gold-100',
			dot: 'bg-gold-300 shadow-[0_0_8px_var(--gold-300)]',
		},
		syncing: {
			pill: 'border-bifrost-300/45 bg-bifrost-500/12 text-bifrost-100',
			dot: 'bg-bifrost-200 shadow-[0_0_8px_var(--bifrost-300)]',
		},
		ready: {
			pill: 'border-rune-300/50 bg-rune-500/14 text-rune-200',
			dot: 'bg-rune-300 shadow-[0_0_8px_var(--rune-300)]',
		},
		error: {
			pill: 'border-blood-300/55 bg-blood-500/15 text-blood-200',
			dot: 'bg-blood-300',
		},
	};
	const activeTone = statusToneClasses[statusBadge.tone];
	const onlineFriendCount = friends.filter(friend =>
		friend.relationStatus === 'accepted' && Boolean(onlineStatus[friend.hiveUsername]?.online),
	).length;
	const canEditWarband = idleControlsVisible;

	return (
		<div className="multiplayer-lobby-shell min-h-dvh w-full overflow-y-auto px-4 py-4 text-ink-0 sm:px-6 sm:py-6">
			<div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-6xl flex-col justify-between gap-6 sm:min-h-[calc(100dvh-3rem)]">
				<header className="flex flex-wrap items-center justify-between gap-3 border-b border-obsidian-700/80 pb-3.5">
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => navigate(routes.home)}
							className="inline-flex min-h-10 items-center gap-1.5 rounded-sm border border-obsidian-700 bg-obsidian-950/75 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink-200 transition-colors hover:border-gold-400/60 hover:text-gold-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300"
						>
							<ArrowLeft className="h-3.5 w-3.5" aria-hidden={true} />
							Home
						</button>
						<button
							type="button"
							onClick={() => navigate(getWarbandEntryRoute('multiplayer'))}
							disabled={!canEditWarband}
							className="inline-flex min-h-10 items-center gap-1.5 rounded-sm border border-obsidian-700 bg-obsidian-950/75 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink-200 transition-colors hover:border-gold-400/60 hover:text-gold-200 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300"
						>
							<Swords className="h-3.5 w-3.5 text-gold-300" aria-hidden={true} />
							Warband
						</button>
					</div>

					<div className="flex items-center gap-2.5">
						<div className="flex items-center gap-2.5 rounded-sm border border-obsidian-700/90 bg-obsidian-950/80 px-2.5 py-1.5">
							<HiveAvatar
								username={hiveUsername}
								fallback={sharedNetwork ? 'H' : 'L'}
								label={hiveUsername ? `@${hiveUsername}` : 'Local player'}
								accent="gold"
								className="h-7 w-7 text-xs"
							/>
							<div className="min-w-0 leading-tight">
								<p className="truncate font-mono text-xs font-bold text-ink-100">
									{hiveUsername ? `@${hiveUsername}` : 'Local workshop'}
								</p>
								<p className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-300">
									<span
										className={`h-1.5 w-1.5 rounded-full ${
											!sharedNetwork || starterClaimed ? 'bg-rune-300' : 'bg-amber-400'
										}`}
										aria-hidden={true}
									/>
									{!sharedNetwork
										? 'Local F1'
										: starterClaimed
											? 'Starter verified'
											: 'Starter claim needed'}
								</p>
							</div>
						</div>
					</div>
				</header>

				<div className="my-auto grid w-full items-start gap-6 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:items-center lg:gap-10">
					<section className="multiplayer-lobby-intro min-w-0 space-y-5 text-left" aria-labelledby="p2p-lobby-title">
						<div className="space-y-3">
							<div className="flex items-center gap-3 text-gold-200">
								<span className="grid h-9 w-9 place-items-center rounded-sm border border-gold-300/45 bg-gold-300/10">
									<Swords className="h-4 w-4" aria-hidden={true} />
								</span>
								<span className="h-px w-10 bg-gold-500/60" aria-hidden={true} />
								<span className="font-display text-[11px] font-black uppercase tracking-[0.22em] text-gold-200">
									Ragnarok Multiplayer
								</span>
							</div>
							<h1 id="p2p-lobby-title" className="multiplayer-lobby-title font-display text-3xl font-black uppercase leading-[1.04] tracking-[0.04em] text-ink-0 sm:text-4xl">
								{progressCopy.title}
							</h1>
							<p className="max-w-md text-sm leading-relaxed text-ink-200 sm:text-base">
								{progressCopy.detail}
							</p>
						</div>

						<LobbyStepper
							currentStep={currentProgressStep}
							matchmakingStatus={matchmakingStatus}
						/>

						<LobbyWarbandPreview
							army={selectedArmy}
							canEdit={canEditWarband}
							onEditWarband={() => navigate(getWarbandEntryRoute('multiplayer'))}
						/>
					</section>

					<Panel className="multiplayer-lobby-panel w-full max-w-none overflow-hidden rounded-md">
						<PanelHeader className="border-b border-obsidian-700/80 p-0">
							<div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
								<PanelTitle className="flex items-center gap-2 text-lg sm:text-xl">
									<Users className="h-4 w-4 text-gold-300" aria-hidden={true} />
									Choose battle
								</PanelTitle>
								<span className={`inline-flex shrink-0 items-center gap-2 rounded-sm border px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] ${activeTone.pill}`}>
									<span className={`h-2 w-2 rounded-full ${activeTone.dot}`} aria-hidden={true} />
									{statusBadge.label}
								</span>
							</div>
						</PanelHeader>
						<PanelContent className="space-y-4 p-5 sm:p-6">
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
								sharedNetwork={sharedNetwork}
								joinId={joinId}
								onJoinIdChange={setJoinId}
								onQuickMatch={handleQuickMatch}
								onHost={handleHost}
								onJoin={handleJoin}
								friendCount={friends.length}
								onlineFriendCount={onlineFriendCount}
								friendsOpen={friendsOpen}
								onToggleFriends={() => setFriendsOpen(open => !open)}
								friendsSlot={<FriendsPanel />}
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
								manualRoomsEnabled={!sharedNetwork}
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
		</div>
	);
};
