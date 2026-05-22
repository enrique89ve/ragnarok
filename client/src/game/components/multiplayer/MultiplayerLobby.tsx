import { useState, useEffect, useCallback } from 'react';
import { usePeerStore } from '../../stores/peerStore';
import { useMatchmaking } from '../../hooks/useMatchmaking';
import { useNFTUsername } from '../../nft/hooks';
import { useFriendStore, type OutgoingFriendChallenge } from '../../stores/friendStore';
import type { MatchmakingStatus } from '../../stores/matchmakingStore';
import type { P2PConnectionState } from '../../stores/peerStore';
import {
	Button,
	Input,
	Panel,
	PanelContent,
	PanelDescription,
	PanelHeader,
	PanelTitle,
} from '../../../components/ui-norse';
import { Copy, Check, X, Users, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { readPresenceHeartbeatResponse, type ServerSignedChallenge } from '@shared/p2pAvailability';
import type { ArmySelection } from '../../types/ChessTypes';

interface MultiplayerLobbyProps {
	onGameStart: () => void;
	joinQueue: () => Promise<boolean>;
	leaveQueue: () => Promise<void>;
}

const DIRECT_CHALLENGE_POLL_MS = 15_000;

export function getActiveIncomingChallenges(
	challenges: readonly ServerSignedChallenge[],
	now: number,
): readonly ServerSignedChallenge[] {
	return challenges.filter(challenge => challenge.expiresAt > now);
}

export function resolveDirectChallengeRoomId(challenge: ServerSignedChallenge): string {
	return challenge.peerId;
}

export function canAcceptDirectChallenge(params: {
	readonly challenge: ServerSignedChallenge;
	readonly connectionState: P2PConnectionState;
	readonly matchmakingStatus: MatchmakingStatus;
	readonly now: number;
}): boolean {
	return params.challenge.expiresAt > params.now
		&& params.connectionState === 'disconnected'
		&& params.matchmakingStatus === 'idle';
}

export function isOutgoingChallengeActive(
	challenge: OutgoingFriendChallenge | null,
	now: number,
): challenge is OutgoingFriendChallenge {
	return challenge !== null && challenge.expiresAt > now;
}

export function formatChallengeTimeRemaining(expiresAt: number, now: number): string {
	const seconds = Math.max(1, Math.ceil((expiresAt - now) / 1000));
	if (seconds < 60) return `${seconds}s`;
	return `${Math.ceil(seconds / 60)}m`;
}

export type ConnectedMatchProgressInput = {
	readonly connectionState: P2PConnectionState;
	readonly opponentArmy: ArmySelection | null;
	readonly p2pInitApplied: boolean;
	readonly p2pSessionLocalAuthorized: boolean;
	readonly p2pSessionRemoteAuthorized: boolean;
	readonly p2pSessionAuthError: string | null;
	readonly reconnectCountdown: number;
	readonly reconnectAttemptCount: number;
};

export type ConnectedMatchProgress =
	| { readonly ready: false; readonly title: string; readonly detail: string }
	| { readonly ready: true; readonly title: string; readonly detail: string };

export function getConnectedMatchProgress(input: ConnectedMatchProgressInput): ConnectedMatchProgress {
	if (input.connectionState === 'reconnecting' || input.connectionState === 'grace_period') {
		const attempt = input.reconnectAttemptCount > 0 ? `Attempt ${input.reconnectAttemptCount}/2. ` : '';
		const countdown = input.reconnectCountdown > 0 ? `${input.reconnectCountdown}s before technical result.` : 'Trying to restore the room.';
		return {
			ready: false,
			title: 'Reconnecting with opponent',
			detail: `${attempt}${countdown}`,
		};
	}
	if (input.connectionState !== 'connected') {
		return {
			ready: false,
			title: 'Connecting with opponent',
			detail: 'Opening the P2P room and waiting for the other browser.',
		};
	}
	if (!input.opponentArmy) {
		return {
			ready: false,
			title: 'Connected to opponent',
			detail: 'Waiting for the opponent loadout.',
		};
	}
	if (!input.p2pInitApplied) {
		return {
			ready: false,
			title: 'Connected to opponent',
			detail: 'Syncing the initial match state.',
		};
	}
	return {
		ready: true,
		title: 'Opponent connected',
		detail: 'Starting match.',
	};
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
		reconnectCountdown,
		reconnectAttemptCount,
		host,
		join,
		connectToRoom,
		disconnect,
		setRemotePeerId,
	} = usePeerStore();

	const {
		status: matchmakingStatus,
		queuePosition,
		error: matchmakingError,
	} = useMatchmaking();
	const hiveUsername = useNFTUsername();
	const pendingChallenges = useFriendStore(s => s.pendingChallenges);
	const outgoingChallenge = useFriendStore(s => s.outgoingChallenge);
	const addChallenges = useFriendStore(s => s.addChallenges);
	const dismissChallenge = useFriendStore(s => s.dismissChallenge);
	const clearOutgoingChallenge = useFriendStore(s => s.clearOutgoingChallenge);
	const pruneExpiredChallenges = useFriendStore(s => s.pruneExpiredChallenges);

	const [joinId, setJoinId] = useState('');
	const [copied, setCopied] = useState(false);
	const [, setMode] = useState<'manual' | 'quick'>('manual');
	const [matchStarting, setMatchStarting] = useState(false);
	const [now, setNow] = useState(() => Date.now());
	const [acceptingFrom, setAcceptingFrom] = useState<string | null>(null);
	const [openingOutgoing, setOpeningOutgoing] = useState(false);
	const activeIncomingChallenges = getActiveIncomingChallenges(pendingChallenges, now);
	const activeOutgoingChallenge = isOutgoingChallengeActive(outgoingChallenge, now) ? outgoingChallenge : null;
	const matchProgress = getConnectedMatchProgress({
		connectionState,
		opponentArmy,
		p2pInitApplied,
		p2pSessionLocalAuthorized,
		p2pSessionRemoteAuthorized,
		p2pSessionAuthError,
		reconnectCountdown,
		reconnectAttemptCount,
	});

	const fetchIncomingChallenges = useCallback(async (signal?: AbortSignal) => {
		if (!hiveUsername) return;
		try {
			const response = await fetch(`/api/friends/challenges/${encodeURIComponent(hiveUsername)}`, { signal });
			if (!response.ok) return;
			const payload: unknown = await response.json();
			const parsed = readPresenceHeartbeatResponse(payload);
			addChallenges(parsed.challenges);
			pruneExpiredChallenges();
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') return;
		}
	}, [hiveUsername, addChallenges, pruneExpiredChallenges]);

	useEffect(() => {
		if (!hiveUsername) return undefined;
		const controller = new AbortController();
		void fetchIncomingChallenges(controller.signal);
		const interval = window.setInterval(() => {
			void fetchIncomingChallenges(controller.signal);
		}, DIRECT_CHALLENGE_POLL_MS);
		return () => {
			controller.abort();
			window.clearInterval(interval);
		};
	}, [hiveUsername, fetchIncomingChallenges]);

	useEffect(() => {
		if (pendingChallenges.length === 0 && !outgoingChallenge) return undefined;
		const interval = window.setInterval(() => {
			const nextNow = Date.now();
			setNow(nextNow);
			pruneExpiredChallenges(nextNow);
		}, 1000);
		return () => window.clearInterval(interval);
	}, [pendingChallenges.length, outgoingChallenge, pruneExpiredChallenges]);

	// Hold the lobby visible briefly after the link establishes so the user can
	// see who connected (peer ID of the remote opponent) before the match UI mounts.
	// Without this delay the connected panel never renders — the effect fires the
	// instant `connectionState` flips to 'connected' and the parent unmounts the lobby.
	const MATCH_START_DELAY_MS = 1200;
	useEffect(() => {
		if (connectionState !== 'connected' || !myPeerId || !remotePeerId || !matchProgress.ready) {
			setMatchStarting(false);
			return;
		}
		setMatchStarting(true);
		const timer = setTimeout(() => {
			onGameStart();
		}, MATCH_START_DELAY_MS);
		return () => clearTimeout(timer);
	}, [connectionState, matchProgress.ready, myPeerId, remotePeerId, onGameStart]);

	const handleHost = async () => {
		try {
			await host();
			toast.success('Game created! Share your ID with your opponent.');
		} catch (_err) {
			toast.error('Failed to create game. Please try again.');
		}
	};

	const handleJoin = async () => {
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
		leaveQueue();
		setJoinId('');
		setRemotePeerId(null);
		setMode('manual');
		toast.info('Disconnected from game');
	};

	const handleQuickMatch = async () => {
		setMode('quick');
		// Quick Match only needs a peerId for the matchmaking handshake; the
		// transport opens later against the matchId emitted by the server.
		// Calling host() here would open a transport against the wrong room.
		if (!myPeerId) usePeerStore.getState().prepareForMatchmaking();
		const queued = await joinQueue();
		if (!queued) {
			toast.error('Failed to join matchmaking queue');
		}
	};

	const handleAcceptChallenge = async (challenge: ServerSignedChallenge) => {
		if (!canAcceptDirectChallenge({ challenge, connectionState, matchmakingStatus, now })) {
			toast.error('Finish the current P2P state before accepting this challenge.');
			return;
		}
		setAcceptingFrom(challenge.from);
		try {
			dismissChallenge(challenge.from);
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
		if (connectionState !== 'disconnected' || matchmakingStatus !== 'idle') {
			toast.error('Finish the current P2P state before opening this challenge room.');
			return;
		}
		setOpeningOutgoing(true);
		try {
			await connectToRoom(activeOutgoingChallenge.peerId);
			toast.success(`Challenge room opened for @${activeOutgoingChallenge.to}.`);
		} catch {
			toast.error('Could not open the challenge room.');
		} finally {
			setOpeningOutgoing(false);
		}
	};

	return (
		<div className="flex items-center justify-center min-h-screen bg-linear-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
			<Panel className="w-full max-w-md">
				<PanelHeader>
					<PanelTitle className="flex items-center gap-2">
						<Users className="w-5 h-5" />
						P2P Multiplayer
					</PanelTitle>
					<PanelDescription>
						Host a game or join with a friend's ID. All gameplay is peer-to-peer.
					</PanelDescription>
				</PanelHeader>
				<PanelContent className="space-y-4">
					{activeIncomingChallenges.length > 0 && (
						<div className="space-y-2 rounded-lg border border-(--gold-500)/25 bg-(--gold-500)/10 p-3">
							<p className="text-xs font-semibold uppercase tracking-wide text-(--gold-300)">Incoming Challenges</p>
							{activeIncomingChallenges.map(challenge => {
								const acceptDisabled = !canAcceptDirectChallenge({ challenge, connectionState, matchmakingStatus, now });
								return (
									<div key={`${challenge.from}:${challenge.nonce}`} className="space-y-2 rounded-md border border-(--gold-500)/15 bg-(--obsidian-900)/45 p-2">
										<div className="flex items-center justify-between gap-2">
											<div className="min-w-0">
												<p className="truncate text-sm font-medium text-(--ink-100)">@{challenge.from}</p>
												<p className="truncate text-xs text-(--ink-300)">
													Room {resolveDirectChallengeRoomId(challenge).slice(0, 12)}... expires in {formatChallengeTimeRemaining(challenge.expiresAt, now)}
												</p>
											</div>
											<div className="flex shrink-0 gap-2">
												<Button
													type="button"
													size="sm"
													onClick={() => handleAcceptChallenge(challenge)}
													disabled={acceptDisabled || acceptingFrom === challenge.from}
												>
													<Check className="mr-1 h-3.5 w-3.5" />
													Accept
												</Button>
												<Button
													type="button"
													size="sm"
													variant="outline"
													onClick={() => handleDeclineChallenge(challenge)}
													disabled={acceptingFrom === challenge.from}
												>
													<X className="mr-1 h-3.5 w-3.5" />
													Decline
												</Button>
											</div>
										</div>
										{acceptDisabled && (
											<p className="text-xs text-(--ink-300)">Available only while idle and disconnected.</p>
										)}
									</div>
								);
							})}
						</div>
					)}

					{activeOutgoingChallenge && (
						<div className="space-y-2 rounded-lg border border-(--gold-500)/20 bg-(--obsidian-800) p-3">
							<div className="flex items-center justify-between gap-2">
								<div className="min-w-0">
									<p className="truncate text-sm font-medium text-(--ink-100)">Challenge sent to @{activeOutgoingChallenge.to}</p>
									<p className="truncate text-xs text-(--ink-300)">
										Room {activeOutgoingChallenge.peerId.slice(0, 12)}... expires in {formatChallengeTimeRemaining(activeOutgoingChallenge.expiresAt, now)}
									</p>
								</div>
								<Button
									type="button"
									size="sm"
									onClick={handleOpenOutgoingRoom}
									disabled={openingOutgoing || connectionState !== 'disconnected' || matchmakingStatus !== 'idle'}
								>
									<Users className="mr-1 h-3.5 w-3.5" />
									Open Room
								</Button>
							</div>
							<Button type="button" variant="ghost" size="sm" onClick={clearOutgoingChallenge} className="w-full">
								Cancel Challenge
							</Button>
						</div>
					)}

					{connectionState === 'disconnected' && matchmakingStatus === 'idle' && (
						<div className="space-y-4">
							<Button onClick={handleQuickMatch} className="w-full" size="lg">
								<Zap className="w-4 h-4 mr-2" />
								Quick Match
							</Button>
							<div className="relative">
								<div className="absolute inset-0 flex items-center">
									<span className="w-full border-t" />
								</div>
								<div className="relative flex justify-center text-xs uppercase">
									<span className="bg-(--obsidian-900) px-2 text-(--ink-300)">Or</span>
								</div>
							</div>
							<Button onClick={handleHost} className="w-full" variant="outline">
								Host Game
							</Button>
							<div className="space-y-2">
								<Input
									placeholder="Enter Game ID"
									value={joinId}
									onChange={(e) => setJoinId(e.target.value)}
									onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
								/>
								<Button onClick={handleJoin} className="w-full" variant="outline">
									Join Game
								</Button>
							</div>
						</div>
					)}

					{matchmakingStatus === 'queued' && (
						<div className="text-center space-y-4">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-(--gold-400) mx-auto" />
							<p className="text-sm text-(--ink-300)">Searching for opponent...</p>
							{queuePosition !== null && (
								<p className="text-xs text-(--ink-300)">
									Position in queue: {queuePosition}
								</p>
							)}
							<Button onClick={leaveQueue} variant="outline" className="w-full">
								Cancel Search
							</Button>
						</div>
					)}

					{matchmakingStatus === 'matched' && connectionState !== 'connected' && (
						<div className="text-center space-y-2">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-(--gold-400) mx-auto" />
							<p className="text-sm font-medium text-(--ink-100)">{matchProgress.title}...</p>
							<p className="text-xs text-(--ink-300)">{matchProgress.detail}</p>
						</div>
					)}

					{matchmakingError && (
						<div className="p-4 bg-(--blood-500)/10 border border-(--blood-500)/20 rounded-lg">
							<p className="text-sm text-(--blood-300)">{matchmakingError}</p>
							<div className="flex gap-2 mt-2">
								<Button onClick={leaveQueue} variant="outline" className="flex-1">
									Try Again
								</Button>
								<Button
									onClick={() => {
										leaveQueue();
										setMode('manual');
									}}
									variant="outline"
									className="flex-1"
								>
									Use Manual Match
								</Button>
							</div>
						</div>
					)}

					{connectionState === 'connecting' && (
						<div className="text-center space-y-2">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-(--gold-400) mx-auto" />
							<p className="text-sm text-(--ink-300)">
								{isHost ? 'Creating game...' : 'Connecting...'}
							</p>
						</div>
					)}


					{connectionState === 'waiting' && myPeerId && (
						<div className="space-y-4">
							<div className="p-4 bg-(--obsidian-800) rounded-lg">
								<div className="flex items-center justify-between mb-2">
									<span className="text-sm font-medium">Your Game ID:</span>
									<Button
										variant="ghost"
										size="sm"
										onClick={handleCopyId}
										className="h-8 w-8 p-0"
									>
										{copied ? (
											<Check className="w-4 h-4 text-green-500" />
										) : (
											<Copy className="w-4 h-4" />
										)}
									</Button>
								</div>
								<code className="text-xs font-mono break-all">{myPeerId}</code>
								<p className="text-xs text-(--ink-300) mt-2">
									Share this ID with your opponent
								</p>
							</div>
							<div className="text-center space-y-2">
								<div className="flex justify-center gap-1">
									<div className="animate-bounce h-2 w-2 rounded-full bg-(--gold-400)" style={{ animationDelay: '0ms' }} />
									<div className="animate-bounce h-2 w-2 rounded-full bg-(--gold-400)" style={{ animationDelay: '150ms' }} />
									<div className="animate-bounce h-2 w-2 rounded-full bg-(--gold-400)" style={{ animationDelay: '300ms' }} />
								</div>
								<p className="text-sm text-(--ink-300)">Waiting for opponent to join...</p>
							</div>
							<Button onClick={handleDisconnect} variant="destructive" className="w-full">
								<X className="w-4 h-4 mr-2" />
								Cancel
							</Button>
						</div>
					)}

					{connectionState === 'connected' && myPeerId && (
						<div className="space-y-4">
							<div className="p-4 bg-(--obsidian-800) rounded-lg">
								<div className="flex items-center justify-between mb-2">
									<span className="text-sm font-medium">Your Game ID:</span>
									<Button
										variant="ghost"
										size="sm"
										onClick={handleCopyId}
										className="h-8 w-8 p-0"
									>
										{copied ? (
											<Check className="w-4 h-4 text-green-500" />
										) : (
											<Copy className="w-4 h-4" />
										)}
									</Button>
								</div>
								<code className="text-xs font-mono break-all">{myPeerId}</code>
								{isHost && !remotePeerId && (
									<p className="text-xs text-(--ink-300) mt-2">
										Share this ID with your opponent to let them join
									</p>
								)}
							</div>
							{isHost && !remotePeerId && (
								<p className="text-sm text-(--ink-300) text-center">
									Waiting for opponent to join...
								</p>
							)}
							{remotePeerId && (
								<div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg space-y-2">
									<p className="text-sm font-medium text-green-600 dark:text-green-400">
										✓ Connected to {isHost ? 'opponent' : 'host'}
									</p>
									<div>
										<span className="text-xs text-(--ink-300) uppercase tracking-wide">
											{isHost ? 'Opponent ID' : 'Host ID'}
										</span>
										<code className="block text-xs font-mono break-all text-(--ink-100) mt-1">
											{remotePeerId}
										</code>
									</div>
									<div className="pt-2 border-t border-green-500/20">
										<p className="text-xs font-semibold uppercase tracking-wide text-(--gold-300)">
											{matchStarting ? 'Starting match' : matchProgress.title}
										</p>
										<p className="mt-1 text-xs text-(--ink-300)">
											{matchProgress.detail}
										</p>
									</div>
								</div>
							)}
							{!matchStarting && (
								<Button onClick={handleDisconnect} variant="destructive" className="w-full">
									<X className="w-4 h-4 mr-2" />
									Disconnect
								</Button>
							)}
						</div>
					)}

					{connectionState === 'error' && error && (
						<div className="p-4 bg-(--blood-500)/10 border border-(--blood-500)/20 rounded-lg">
							<p className="text-sm text-(--blood-300)">{error}</p>
							<Button onClick={handleDisconnect} variant="outline" className="w-full mt-2">
								Try Again
							</Button>
						</div>
					)}
				</PanelContent>
			</Panel>
		</div>
	);
};
