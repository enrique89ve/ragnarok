import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { usePeerStore } from '../../stores/peerStore';
import { useMatchmaking } from '../../hooks/useMatchmaking';
import { useNFTUsername } from '../../nft/hooks';
import { useFriendStore, type OutgoingFriendChallenge } from '../../stores/friendStore';
import { useStarterStore } from '../../stores/starterStore';
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
import { readChallengeSendResponse, readPresenceHeartbeatResponse, type P2PMatchTicket, type ServerSignedChallenge } from '@shared/p2pAvailability';
import { ensureFriendSession, invalidateFriendSession } from '../social/friendSession';
import type { ArmySelection } from '../../types/ChessTypes';
import { isSharedNetworkEnvironment } from '../../config/featureFlags';
import { useGameStore } from '../../stores/gameStore';
import { computeP2PBattleReadiness } from '../../match/p2pBattleReadiness';
import { getAuthenticatedHiveUsername, subscribeHiveSessionIdentity } from '../../../data/HiveSessionIdentity';
import { resolveProtectedFlowAccess } from '../../auth/protectedFlowAccess';
import type { MatchOffer } from '@shared/p2pMatchAcceptance';

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

type DirectChallengeRoomCandidate = {
	readonly expiresAt: number;
	readonly matchTicket?: P2PMatchTicket | null;
};

export type DirectChallengeRoomAccess =
	| { readonly ok: true }
	| { readonly ok: false; readonly reason: 'busy' | 'expired' | 'missing_relay_ticket' | 'protected_flow'; readonly message?: string };

type DirectChallengeAccessContext = {
	readonly connectionState: P2PConnectionState;
	readonly matchmakingStatus: MatchmakingStatus;
	readonly now: number;
	readonly sharedNetwork: boolean;
	readonly protectedBlockMessage: string | null;
};

export function getDirectChallengeRoomAccess(params: {
	readonly challenge: DirectChallengeRoomCandidate;
	readonly connectionState: P2PConnectionState;
	readonly matchmakingStatus: MatchmakingStatus;
	readonly now: number;
	readonly sharedNetwork: boolean;
}): DirectChallengeRoomAccess {
	if (params.challenge.expiresAt <= params.now) return { ok: false, reason: 'expired' };
	if (params.connectionState !== 'disconnected' || params.matchmakingStatus !== 'idle') {
		return { ok: false, reason: 'busy' };
	}
	if (params.sharedNetwork && !params.challenge.matchTicket) {
		return { ok: false, reason: 'missing_relay_ticket' };
	}
	return { ok: true };
}

export function shouldClearDirectChallengeStateAfterPoll(status: number, payload: unknown): boolean {
	if (status !== 403) return false;
	const parsed = readChallengeSendResponse(payload);
	return !parsed.ok && parsed.reason === 'starter_claim_required';
}

export function getDirectChallengeProtectedBlockMessage(input: {
	readonly hiveUsername: string | null | undefined;
	readonly authenticatedHiveUsername: string | null | undefined;
	readonly sharedNetwork: boolean;
	readonly starterClaimed: boolean;
}): string | null {
	const access = resolveProtectedFlowAccess({
		accountId: input.hiveUsername,
		authenticatedAccountId: input.authenticatedHiveUsername,
		sharedNetwork: input.sharedNetwork,
		surface: 'multiplayer',
		requiresAuthenticatedSession: true,
		requiresStarterClaim: true,
		starterClaimed: input.starterClaimed,
	});
	return access.kind === 'allowed' ? null : access.message;
}

function getDirectChallengeRoomAccessFor(
	challenge: DirectChallengeRoomCandidate,
	context: DirectChallengeAccessContext,
): DirectChallengeRoomAccess {
	if (context.protectedBlockMessage) {
		return { ok: false, reason: 'protected_flow', message: context.protectedBlockMessage };
	}
	return getDirectChallengeRoomAccess({
		challenge,
		connectionState: context.connectionState,
		matchmakingStatus: context.matchmakingStatus,
		now: context.now,
		sharedNetwork: context.sharedNetwork,
	});
}

function getDirectChallengeBlockCopy(access: DirectChallengeRoomAccess): string | null {
	if (access.ok) return null;
	if (access.reason === 'protected_flow') return access.message ?? 'Complete account setup before opening P2P.';
	if (access.reason === 'expired') return 'This challenge has expired.';
	if (access.reason === 'missing_relay_ticket') {
		return 'This challenge is missing a relay ticket. Ask your opponent to send a new challenge.';
	}
	return 'Available only while idle and disconnected.';
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

type QuickMatchLobbyReadinessInput = {
	readonly serverMatchCommitted: boolean;
	readonly localAcceptanceVerified: boolean;
	readonly remoteAcceptanceVerified: boolean;
	readonly matchTicket: P2PMatchTicket | null;
	readonly expectedRoomId: string | null;
	readonly expectedPeerId: string | null;
	readonly connectionState: P2PConnectionState;
	readonly remotePeerId: string | null;
	readonly opponentArmy: ArmySelection | null;
	readonly p2pInitApplied: boolean;
	readonly matchId: string | null;
	readonly matchSeed: string | null;
	readonly localBattleReady: Parameters<typeof computeP2PBattleReadiness>[0]['localBattleReady'];
	readonly remoteBattleReady: Parameters<typeof computeP2PBattleReadiness>[0]['remoteBattleReady'];
	readonly expectedRemoteLoadoutHash: string | null;
	readonly now?: number;
};

export function getQuickMatchLobbyReadiness(input: QuickMatchLobbyReadinessInput): { readonly ready: boolean; readonly reason: string } {
	const readiness = computeP2PBattleReadiness({
		activeMatchKind: 'peer',
		serverMatchCommitted: input.serverMatchCommitted,
		localAcceptanceVerified: input.localAcceptanceVerified,
		remoteAcceptanceVerified: input.remoteAcceptanceVerified,
		matchTicket: input.matchTicket,
		expectedRoomId: input.expectedRoomId,
		expectedPeerId: input.expectedPeerId,
		connectionState: input.connectionState,
		remotePeerId: input.remotePeerId,
		matchId: input.matchId,
		matchSeed: input.matchSeed,
		opponentArmy: input.opponentArmy,
		p2pInitApplied: input.p2pInitApplied,
		expectedRemoteLoadoutHash: input.expectedRemoteLoadoutHash,
		localBattleReady: input.localBattleReady,
		remoteBattleReady: input.remoteBattleReady,
		now: input.now,
	});
	return readiness.ready
		? { ready: true, reason: 'Battle ready' }
		: { ready: false, reason: readiness.reason };
}

type AsyncVoidHandler = () => void | Promise<void>;

function IncomingChallengesPanel({
	challenges,
	accessContext,
	acceptingFrom,
	onAcceptChallenge,
	onDeclineChallenge,
}: {
	readonly challenges: readonly ServerSignedChallenge[];
	readonly accessContext: DirectChallengeAccessContext;
	readonly acceptingFrom: string | null;
	readonly onAcceptChallenge: (challenge: ServerSignedChallenge) => void | Promise<void>;
	readonly onDeclineChallenge: (challenge: ServerSignedChallenge) => void;
}) {
	if (challenges.length === 0) return null;

	return (
		<div className="space-y-2 rounded-lg border border-(--gold-500)/25 bg-(--gold-500)/10 p-3">
			<p className="text-xs font-semibold uppercase tracking-wide text-(--gold-300)">Incoming Challenges</p>
			{challenges.map(challenge => {
				const access = getDirectChallengeRoomAccessFor(challenge, accessContext);
				const acceptDisabled = !access.ok;
				return (
					<div key={`${challenge.from}:${challenge.nonce}`} className="space-y-2 rounded-md border border-(--gold-500)/15 bg-(--obsidian-900)/45 p-2">
						<div className="flex items-center justify-between gap-2">
							<div className="min-w-0">
								<p className="truncate text-sm font-medium text-(--ink-100)">@{challenge.from}</p>
								<p className="truncate text-xs text-(--ink-300)">
									Room {resolveDirectChallengeRoomId(challenge).slice(0, 12)}... expires in {formatChallengeTimeRemaining(challenge.expiresAt, accessContext.now)}
								</p>
							</div>
							<div className="flex shrink-0 gap-2">
								<Button
									type="button"
									size="sm"
									onClick={() => { void onAcceptChallenge(challenge); }}
									disabled={acceptDisabled || acceptingFrom === challenge.from}
								>
									<Check className="mr-1 h-3.5 w-3.5" />
									Accept
								</Button>
								<Button
									type="button"
									size="sm"
									variant="outline"
									onClick={() => onDeclineChallenge(challenge)}
									disabled={acceptingFrom === challenge.from}
								>
									<X className="mr-1 h-3.5 w-3.5" />
									Decline
								</Button>
							</div>
						</div>
						{acceptDisabled && <p className="text-xs text-(--ink-300)">{getDirectChallengeBlockCopy(access)}</p>}
					</div>
				);
			})}
		</div>
	);
}

function OutgoingChallengePanel({
	challenge,
	accessContext,
	openingOutgoing,
	onOpenRoom,
	onCancelChallenge,
}: {
	readonly challenge: OutgoingFriendChallenge | null;
	readonly accessContext: DirectChallengeAccessContext;
	readonly openingOutgoing: boolean;
	readonly onOpenRoom: AsyncVoidHandler;
	readonly onCancelChallenge: () => void;
}) {
	if (!challenge) return null;

	const access = getDirectChallengeRoomAccessFor(challenge, accessContext);

	return (
		<div className="space-y-2 rounded-lg border border-(--gold-500)/20 bg-(--obsidian-800) p-3">
			<div className="flex items-center justify-between gap-2">
				<div className="min-w-0">
					<p className="truncate text-sm font-medium text-(--ink-100)">Challenge sent to @{challenge.to}</p>
					<p className="truncate text-xs text-(--ink-300)">
						Room {challenge.peerId.slice(0, 12)}... expires in {formatChallengeTimeRemaining(challenge.expiresAt, accessContext.now)}
					</p>
				</div>
				<Button
					type="button"
					size="sm"
					onClick={() => { void onOpenRoom(); }}
					disabled={openingOutgoing || !access.ok}
				>
					<Users className="mr-1 h-3.5 w-3.5" />
					Open Room
				</Button>
			</div>
			<Button type="button" variant="ghost" size="sm" onClick={onCancelChallenge} className="w-full">
				Cancel Challenge
			</Button>
		</div>
	);
}

function IdleMatchControls({
	visible,
	joinId,
	onJoinIdChange,
	onQuickMatch,
	onHost,
	onJoin,
}: {
	readonly visible: boolean;
	readonly joinId: string;
	readonly onJoinIdChange: (value: string) => void;
	readonly onQuickMatch: AsyncVoidHandler;
	readonly onHost: AsyncVoidHandler;
	readonly onJoin: AsyncVoidHandler;
}) {
	if (!visible) return null;

	return (
		<div className="space-y-4">
			<Button onClick={() => { void onQuickMatch(); }} className="w-full" size="lg">
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
			<Button onClick={() => { void onHost(); }} className="w-full" variant="outline">
				Host Game
			</Button>
			<div className="space-y-2">
				<Input
					placeholder="Enter Game ID"
					value={joinId}
					onChange={(event) => onJoinIdChange(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === 'Enter') void onJoin();
					}}
				/>
				<Button onClick={() => { void onJoin(); }} className="w-full" variant="outline">
					Join Game
				</Button>
			</div>
		</div>
	);
}

function QueuePanel({
	status,
	queuePosition,
	onLeaveQueue,
}: {
	readonly status: MatchmakingStatus;
	readonly queuePosition: number | null;
	readonly onLeaveQueue: AsyncVoidHandler;
}) {
	if (status !== 'queued') return null;

	return (
		<div className="text-center space-y-4">
			<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-(--gold-400) mx-auto" />
			<p className="text-sm text-(--ink-300)">Searching for opponent...</p>
			{queuePosition !== null && (
				<p className="text-xs text-(--ink-300)">Position in queue: {queuePosition}</p>
			)}
			<Button onClick={() => { void onLeaveQueue(); }} variant="outline" className="w-full">
				Cancel Search
			</Button>
		</div>
	);
}

function MatchOfferPanel({
	offer,
	onAccept,
	onDecline,
	accepting,
	interactive,
}: {
	readonly offer: MatchOffer | null;
	readonly onAccept: AsyncVoidHandler;
	readonly onDecline: AsyncVoidHandler;
	readonly accepting: boolean;
	readonly interactive: boolean;
}) {
	if (!offer) return null;
	return (
		<div className="space-y-3 rounded-lg border border-(--gold-500)/35 bg-(--gold-500)/10 p-4">
			<div>
				<p className="text-xs font-semibold uppercase tracking-wide text-(--gold-300)">Match found</p>
				<p className="mt-1 text-base font-semibold text-(--ink-100)">
					{offer.opponent.username ? `@${offer.opponent.username}` : 'Opponent'}
				</p>
				<p className="text-xs text-(--ink-300)">{interactive ? `Accept within ${formatChallengeTimeRemaining(offer.expiresAt, Date.now())}.` : 'Waiting for both players to authorize the match.'}</p>
			</div>
			<div className="flex gap-2">
				<Button type="button" onClick={() => { void onAccept(); }} disabled={accepting || !interactive} className="flex-1">
					<Check className="mr-1 h-4 w-4" /> Accept
				</Button>
				<Button type="button" variant="outline" onClick={() => { void onDecline(); }} disabled={accepting || !interactive} className="flex-1">
					<X className="mr-1 h-4 w-4" /> Decline
				</Button>
			</div>
		</div>
	);
}

function MatchedProgressPanel({
	status,
	connectionState,
	matchProgress,
}: {
	readonly status: MatchmakingStatus;
	readonly connectionState: P2PConnectionState;
	readonly matchProgress: ConnectedMatchProgress;
}) {
	if (status !== 'ready' && status !== 'connecting') return null;
	if (connectionState === 'connected') return null;

	return (
		<div className="text-center space-y-2">
			<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-(--gold-400) mx-auto" />
			<p className="text-sm font-medium text-(--ink-100)">{matchProgress.title}...</p>
			<p className="text-xs text-(--ink-300)">{matchProgress.detail}</p>
		</div>
	);
}

function MatchmakingErrorPanel({
	error,
	onTryAgain,
	onUseManualMatch,
}: {
	readonly error: string | null;
	readonly onTryAgain: AsyncVoidHandler;
	readonly onUseManualMatch: () => void;
}) {
	if (!error) return null;

	return (
		<div className="p-4 bg-(--blood-500)/10 border border-(--blood-500)/20 rounded-lg">
			<p className="text-sm text-(--blood-300)">{error}</p>
			<div className="flex gap-2 mt-2">
				<Button onClick={() => { void onTryAgain(); }} variant="outline" className="flex-1">
					Try Again
				</Button>
				<Button onClick={onUseManualMatch} variant="outline" className="flex-1">
					Use Manual Match
				</Button>
			</div>
		</div>
	);
}

function ConnectingPanel({
	connectionState,
	isHost,
}: {
	readonly connectionState: P2PConnectionState;
	readonly isHost: boolean;
}) {
	if (connectionState !== 'connecting') return null;

	return (
		<div className="text-center space-y-2">
			<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-(--gold-400) mx-auto" />
			<p className="text-sm text-(--ink-300)">
				{isHost ? 'Creating game...' : 'Connecting...'}
			</p>
		</div>
	);
}

function CopyIdButton({
	copied,
	onCopyId,
}: {
	readonly copied: boolean;
	readonly onCopyId: AsyncVoidHandler;
}) {
	return (
		<Button
			variant="ghost"
			size="sm"
			onClick={() => { void onCopyId(); }}
			className="h-8 w-8 p-0"
		>
			{copied ? (
				<Check className="w-4 h-4 text-green-500" />
			) : (
				<Copy className="w-4 h-4" />
			)}
		</Button>
	);
}

function PeerIdCard({
	peerId,
	copied,
	onCopyId,
	helperText,
}: {
	readonly peerId: string;
	readonly copied: boolean;
	readonly onCopyId: AsyncVoidHandler;
	readonly helperText?: string;
}) {
	return (
		<div className="p-4 bg-(--obsidian-800) rounded-lg">
			<div className="flex items-center justify-between mb-2">
				<span className="text-sm font-medium">Your Game ID:</span>
				<CopyIdButton copied={copied} onCopyId={onCopyId} />
			</div>
			<code className="text-xs font-mono break-all">{peerId}</code>
			{helperText && (
				<p className="text-xs text-(--ink-300) mt-2">{helperText}</p>
			)}
		</div>
	);
}

function WaitingPanel({
	connectionState,
	myPeerId,
	copied,
	onCopyId,
	onDisconnect,
}: {
	readonly connectionState: P2PConnectionState;
	readonly myPeerId: string | null;
	readonly copied: boolean;
	readonly onCopyId: AsyncVoidHandler;
	readonly onDisconnect: () => void;
}) {
	if (connectionState !== 'waiting' || !myPeerId) return null;

	return (
		<div className="space-y-4">
			<PeerIdCard
				peerId={myPeerId}
				copied={copied}
				onCopyId={onCopyId}
				helperText="Share this ID with your opponent"
			/>
			<div className="text-center space-y-2">
				<div className="flex justify-center gap-1">
					<div className="animate-bounce h-2 w-2 rounded-full bg-(--gold-400)" style={{ animationDelay: '0ms' }} />
					<div className="animate-bounce h-2 w-2 rounded-full bg-(--gold-400)" style={{ animationDelay: '150ms' }} />
					<div className="animate-bounce h-2 w-2 rounded-full bg-(--gold-400)" style={{ animationDelay: '300ms' }} />
				</div>
				<p className="text-sm text-(--ink-300)">Waiting for opponent to join...</p>
			</div>
			<Button onClick={onDisconnect} variant="destructive" className="w-full">
				<X className="w-4 h-4 mr-2" />
				Cancel
			</Button>
		</div>
	);
}

function ConnectedPanel({
	connectionState,
	myPeerId,
	remotePeerId,
	isHost,
	copied,
	matchStarting,
	matchProgress,
	onCopyId,
	onDisconnect,
}: {
	readonly connectionState: P2PConnectionState;
	readonly myPeerId: string | null;
	readonly remotePeerId: string | null;
	readonly isHost: boolean;
	readonly copied: boolean;
	readonly matchStarting: boolean;
	readonly matchProgress: ConnectedMatchProgress;
	readonly onCopyId: AsyncVoidHandler;
	readonly onDisconnect: () => void;
}) {
	if (connectionState !== 'connected' || !myPeerId) return null;

	const helperText = isHost && !remotePeerId ? 'Share this ID with your opponent to let them join' : undefined;

	return (
		<div className="space-y-4">
			<PeerIdCard peerId={myPeerId} copied={copied} onCopyId={onCopyId} helperText={helperText} />
			{isHost && !remotePeerId && (
				<p className="text-sm text-(--ink-300) text-center">Waiting for opponent to join...</p>
			)}
			{remotePeerId && (
				<div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg space-y-2">
					<p className="text-sm font-medium text-green-600 dark:text-green-400">
						<Check size={14} className="inline -mt-0.5 mr-1" aria-hidden={true} /> Connected to {isHost ? 'opponent' : 'host'}
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
						<p className="mt-1 text-xs text-(--ink-300)">{matchProgress.detail}</p>
					</div>
				</div>
			)}
			{!matchStarting && (
				<Button onClick={onDisconnect} variant="destructive" className="w-full">
					<X className="w-4 h-4 mr-2" />
					Disconnect
				</Button>
			)}
		</div>
	);
}

function ConnectionErrorPanel({
	connectionState,
	error,
	onDisconnect,
}: {
	readonly connectionState: P2PConnectionState;
	readonly error: string | null;
	readonly onDisconnect: () => void;
}) {
	if (connectionState !== 'error' || !error) return null;

	return (
		<div className="p-4 bg-(--blood-500)/10 border border-(--blood-500)/20 rounded-lg">
			<p className="text-sm text-(--blood-300)">{error}</p>
			<Button onClick={onDisconnect} variant="outline" className="w-full mt-2">
				Try Again
			</Button>
		</div>
	);
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
	const [matchStarting, setMatchStarting] = useState(false);
	const [now, setNow] = useState(() => Date.now());
	const [acceptingFrom, setAcceptingFrom] = useState<string | null>(null);
	const [openingOutgoing, setOpeningOutgoing] = useState(false);
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
	const p2pHandshakeActive = connectionState !== 'disconnected' || matchCommitted || Boolean(matchTicket);
	const matchProgress = p2pHandshakeActive
		? quickBattleReadiness.ready
			? { ready: true as const, title: 'Battle ready', detail: 'Both players are authorized and the battle state matches.' }
			: { ready: false as const, title: 'Preparing battle', detail: quickBattleReadiness.reason }
		: legacyMatchProgress;

	const fetchIncomingChallenges = useCallback(async (signal?: AbortSignal) => {
		if (!hiveUsername) return;
		try {
			const normalizedUsername = hiveUsername.toLowerCase();
			if (!await ensureFriendSession(normalizedUsername)) return;

			let response = await fetch(`/api/friends/challenges/${encodeURIComponent(normalizedUsername)}`, {
				method: 'GET',
				signal,
			});

			if (response.status === 401) {
				invalidateFriendSession();
				if (!await ensureFriendSession(normalizedUsername)) return;
				response = await fetch(`/api/friends/challenges/${encodeURIComponent(normalizedUsername)}`, {
					method: 'GET',
					signal,
				});
			}

			if (!response.ok) {
				const payload: unknown = await response.json().catch(() => null);
				if (shouldClearDirectChallengeStateAfterPoll(response.status, payload)) {
					clearChallenges();
					clearOutgoingChallenge();
				}
				return;
			}
			const payload: unknown = await response.json();
			const parsed = readPresenceHeartbeatResponse(payload);
			addChallenges(parsed.challenges);
			pruneExpiredChallenges();
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') return;
		}
	}, [hiveUsername, addChallenges, clearChallenges, clearOutgoingChallenge, pruneExpiredChallenges]);

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
					<MatchOfferPanel
						offer={matchOffer}
						onAccept={async () => { await acceptOffer(); }}
						onDecline={declineOffer}
						accepting={matchmakingStatus === 'accepting'}
						interactive={matchmakingStatus === 'offered'}
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
	);
};
