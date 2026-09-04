import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from 'react';
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
import {
	Check,
	Copy,
	LoaderCircle,
	Radio,
	Search,
	ShieldCheck,
	Swords,
	Users,
	X,
	Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { readPresenceHeartbeatResponse, type ServerSignedChallenge } from '@shared/p2pAvailability';
import { ensureFriendSession, invalidateFriendSession } from '../social/friendSession';
import { isSharedNetworkEnvironment } from '../../config/featureFlags';
import { useGameStore } from '../../stores/gameStore';
import { getAuthenticatedHiveUsername, subscribeHiveSessionIdentity } from '../../../data/HiveSessionIdentity';
import type { MatchOffer } from '@shared/p2pMatchAcceptance';
import { getHiveAvatarUrl } from '../../../components/account/hiveAvatar';
import {
	formatChallengeTimeRemaining,
	getActiveIncomingChallenges,
	getConnectedMatchProgress,
	getDirectChallengeBlockCopy,
	getDirectChallengeProtectedBlockMessage,
	getDirectChallengeRoomAccessFor,
	getPlayerFacingMatchmakingError,
	getQuickMatchLobbyReadiness,
	getLobbyProgressCopy,
	isOutgoingChallengeActive,
	resolveDirectChallengeRoomId,
	resolveLobbyProgressStep,
	shouldAutoAcceptQuickMatchOffer,
	shouldClearDirectChallengeStateAfterPoll,
	type ConnectedMatchProgress,
	type DirectChallengeAccessContext,
} from './MultiplayerLobby.logic';
import './MultiplayerLobby.css';

interface MultiplayerLobbyProps {
	onGameStart: () => void;
	joinQueue: () => Promise<boolean>;
	leaveQueue: () => Promise<void>;
}

const DIRECT_CHALLENGE_POLL_MS = 15_000;

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
		<div className="space-y-3 rounded-md border border-gold-500/40 bg-gold-300/6 p-4">
			<div className="flex items-start gap-3">
				<div className="grid h-9 w-9 shrink-0 place-items-center border border-gold-300/40 bg-gold-300/10 text-gold-200">
					<Swords className="h-4 w-4" aria-hidden={true} />
				</div>
				<div>
					<p className="font-display text-xs font-black uppercase tracking-[0.16em] text-gold-100">Warband challenge</p>
					<p className="mt-1 text-xs leading-relaxed text-ink-200">A player has opened a direct room for you.</p>
				</div>
				<span className="ml-auto shrink-0 rounded-sm border border-gold-500/50 px-2 py-1 font-display text-[10px] font-black uppercase tracking-[0.12em] text-gold-200">{challenges.length} pending</span>
			</div>
			{challenges.map(challenge => {
				const access = getDirectChallengeRoomAccessFor(challenge, accessContext);
				const acceptDisabled = !access.ok;
				return (
					<div key={`${challenge.from}:${challenge.nonce}`} className="space-y-3 border border-obsidian-600/80 bg-obsidian-950/55 p-3">
						<div className="flex items-center justify-between gap-2">
							<div className="min-w-0">
								<p className="truncate font-display text-sm font-black uppercase tracking-[0.08em] text-ink-0">@{challenge.from}</p>
								<p className="mt-1 truncate font-mono text-[11px] text-ink-300">
									Room {resolveDirectChallengeRoomId(challenge).slice(0, 12)}... expires in {formatChallengeTimeRemaining(challenge.expiresAt, accessContext.now)}
								</p>
							</div>
							<div className="flex shrink-0 gap-2">
								<Button
									type="button"
									size="sm"
						onClick={() => { void onAcceptChallenge(challenge); }}
						disabled={acceptDisabled || acceptingFrom === challenge.from}
						className="hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300 active:translate-y-px disabled:opacity-50"
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
					className="hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300 active:translate-y-px disabled:opacity-50"
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
		<div className="space-y-3 rounded-md border border-bifrost-300/35 bg-bifrost-500/8 p-4">
			<div className="flex items-start gap-3">
				<div className="grid h-9 w-9 shrink-0 place-items-center border border-bifrost-300/40 bg-bifrost-500/15 text-bifrost-100">
					<Radio className="h-4 w-4" aria-hidden={true} />
				</div>
				<div className="min-w-0">
					<p className="font-display text-xs font-black uppercase tracking-[0.16em] text-bifrost-100">Challenge sent</p>
					<p className="mt-1 text-xs leading-relaxed text-ink-200">Waiting for @{challenge.to} to enter the room.</p>
				</div>
			</div>
			<div className="flex items-center justify-between gap-2">
				<div className="min-w-0">
					<p className="truncate font-mono text-[11px] text-ink-300">
						Room {challenge.peerId.slice(0, 12)}... expires in {formatChallengeTimeRemaining(challenge.expiresAt, accessContext.now)}
					</p>
				</div>
				<Button
					type="button"
					size="sm"
				onClick={() => { void onOpenRoom(); }}
				disabled={openingOutgoing || !access.ok}
				className="hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300 active:translate-y-px disabled:opacity-50"
				>
					<Users className="mr-1 h-3.5 w-3.5" />
					Open Room
				</Button>
			</div>
			<Button type="button" variant="ghost" size="sm" onClick={onCancelChallenge} className="w-full hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300 active:translate-y-px disabled:opacity-50">
				Cancel Challenge
			</Button>
		</div>
	);
}

function IdleMatchControls({
	visible,
	manualRoomsEnabled,
	joinId,
	onJoinIdChange,
	onQuickMatch,
	onHost,
	onJoin,
}: {
	readonly visible: boolean;
	readonly manualRoomsEnabled: boolean;
	readonly joinId: string;
	readonly onJoinIdChange: (value: string) => void;
	readonly onQuickMatch: AsyncVoidHandler;
	readonly onHost: AsyncVoidHandler;
	readonly onJoin: AsyncVoidHandler;
}) {
	if (!visible) return null;

	return (
		<div className="space-y-5">
			<div className="grid gap-3 rounded-md border border-gold-300/45 bg-linear-to-br from-gold-300/14 to-obsidian-900/40 p-4 shadow-[0_0_28px_-12px_color-mix(in_srgb,var(--gold-300)_55%,transparent)]">
				<div className="flex items-start justify-between gap-3">
					<div className="flex items-start gap-3">
						<div className="grid h-10 w-10 shrink-0 place-items-center border border-gold-200/70 bg-gold-300 text-obsidian-950">
							<Zap className="h-5 w-5" aria-hidden={true} />
						</div>
						<div>
							<p className="font-display text-[10px] font-black uppercase tracking-[0.18em] text-gold-100">Recommended</p>
							<h3 className="mt-1 font-display text-lg font-black uppercase tracking-[0.08em] text-ink-0">Quick Match</h3>
							<p className="mt-1 max-w-md text-xs leading-relaxed text-ink-200">Find an opponent.</p>
						</div>
					</div>
					<span className="shrink-0 rounded-sm border border-gold-200/50 px-2 py-1 font-display text-[10px] font-black uppercase tracking-[0.1em] text-gold-100">Fastest</span>
				</div>
				<Button onClick={() => { void onQuickMatch(); }} variant="primary" className="w-full hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300 active:translate-y-px disabled:opacity-50" size="lg" ornate>
					Find opponent
				</Button>
			</div>
			<div className="border-t border-obsidian-700/80 pt-4">
				<div className="mb-3 flex items-center gap-2">
					<span className="h-px flex-1 bg-obsidian-700" />
					<span className="font-display text-[10px] font-black uppercase tracking-[0.18em] text-ink-300">Direct room</span>
					<span className="h-px flex-1 bg-obsidian-700" />
				</div>
				<p id="manual-room-help" className="mb-3 text-xs leading-relaxed text-ink-300">
					{manualRoomsEnabled ? 'Use a peer ID.' : 'Unavailable on secured relay.'}
				</p>
				<div className="grid gap-2 sm:grid-cols-2">
					<Button onClick={() => { void onHost(); }} variant="outline" disabled={!manualRoomsEnabled} className="hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300 active:translate-y-px disabled:opacity-50">
						Host
					</Button>
					<div className="flex min-w-0 gap-2 sm:col-span-2">
						<Input
							className="min-w-0 flex-1"
							placeholder="Peer ID"
							aria-label="Peer ID to join"
							value={joinId}
							disabled={!manualRoomsEnabled}
							aria-describedby="manual-room-help"
							onChange={(event) => onJoinIdChange(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === 'Enter') void onJoin();
							}}
						/>
						<Button onClick={() => { void onJoin(); }} variant="outline" disabled={!manualRoomsEnabled || !joinId.trim()} className="hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300 active:translate-y-px disabled:opacity-50">
							Join
						</Button>
					</div>
				</div>
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
		<div className="space-y-5" role="status" aria-live="polite">
			<div className="flex items-start gap-3">
				<div className="grid h-10 w-10 shrink-0 place-items-center border border-gold-300/45 bg-gold-300/10 text-gold-200">
					<LoaderCircle className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden={true} />
				</div>
				<div>
					<p className="font-display text-sm font-black uppercase tracking-[0.14em] text-ink-0">Searching</p>
					<p className="mt-1 text-xs leading-relaxed text-ink-200">Peer only. No AI.</p>
				</div>
			</div>
			<div className="flex items-center justify-between border-y border-obsidian-700/80 py-3">
				<span className="font-display text-[10px] font-black uppercase tracking-[0.16em] text-ink-300">Position</span>
				<span className="font-mono text-lg text-gold-200">{queuePosition ?? '—'}</span>
			</div>
			<Button onClick={() => { void onLeaveQueue(); }} variant="outline" className="w-full hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300 active:translate-y-px disabled:opacity-50">
				Cancel search
			</Button>
		</div>
	);
}

function MatchmakingAuthorizingPanel({
	status,
}: {
	readonly status: MatchmakingStatus;
}) {
	if (status !== 'authorizing') return null;

	return (
		<div className="flex items-start gap-3" role="status" aria-live="polite" aria-busy={true}>
			<div className="grid h-10 w-10 shrink-0 place-items-center border border-gold-300/45 bg-gold-300/10 text-gold-200">
				<LoaderCircle className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden={true} />
			</div>
			<div>
				<p className="font-display text-sm font-black uppercase tracking-[0.14em] text-ink-0">Authorizing</p>
				<p className="mt-1 text-xs leading-relaxed text-ink-200">Approve the one-time matchmaking request in Hive Keychain.</p>
			</div>
		</div>
	);
}

function HiveAvatar({
	username,
	fallback,
	label,
	accent,
	className = '',
}: {
	readonly username: string | null | undefined;
	readonly fallback: string;
	readonly label: string;
	readonly accent: 'gold' | 'blood';
	readonly className?: string;
}) {
	const [avatarFailed, setAvatarFailed] = useState(false);
	useEffect(() => setAvatarFailed(false), [username]);
	const displayName = username?.trim().replace(/^@/, '') || fallback;
	const accentClasses = accent === 'gold'
		? 'border-gold-200/70 bg-gold-300/15 text-gold-100'
		: 'border-blood-300/60 bg-blood-500/15 text-blood-100';

	return (
		<div className={`grid h-14 w-14 place-items-center overflow-hidden border ${accentClasses} ${className}`}>
			{username && !avatarFailed ? (
				<img
					src={getHiveAvatarUrl(username)}
					alt={`${label} Hive avatar`}
					className="h-full w-full object-cover"
					width={56}
					height={56}
					loading="eager"
					onError={() => setAvatarFailed(true)}
				/>
			) : (
				<span className="font-display text-xl font-black uppercase" aria-hidden={true}>{displayName.charAt(0)}</span>
			)}
		</div>
	);
}

function MatchOfferPanel({
	offer,
	localUsername,
	onAccept,
	onDecline,
	status,
	accepting,
	interactive,
}: {
	readonly offer: MatchOffer | null;
	readonly localUsername: string | null;
	readonly onAccept: AsyncVoidHandler;
	readonly onDecline: AsyncVoidHandler;
	readonly status: MatchmakingStatus;
	readonly accepting: boolean;
	readonly interactive: boolean;
}) {
	if (!offer) return null;
	const approvalPending = status === 'accepting' || status === 'waiting_opponent';
	const localDisplayName = localUsername ? `@${localUsername}` : 'You';
	const opponentDisplayName = offer.opponent.username ? `@${offer.opponent.username}` : 'Opponent';
	return (
		<div className="p2p-matchup space-y-4 rounded-md border border-gold-200/70 bg-linear-to-br from-gold-300/18 via-gold-300/7 to-obsidian-900/80 p-4 shadow-[0_0_32px_-14px_color-mix(in_srgb,var(--gold-300)_65%,transparent)] sm:p-5">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="font-display text-[10px] font-black uppercase tracking-[0.2em] text-gold-100">{approvalPending ? 'Approval pending' : 'Match found'}</p>
					<h3 className="mt-1 font-display text-xl font-black uppercase tracking-[0.06em] text-ink-0">{approvalPending ? 'Awaiting approval' : 'Authorize match'}</h3>
				</div>
				<div className="shrink-0 text-right">
					<p className="font-display text-[10px] font-black uppercase tracking-[0.14em] text-ink-300">Expires</p>
					<p className="mt-1 font-mono text-sm text-gold-200">{formatChallengeTimeRemaining(offer.expiresAt, Date.now())}</p>
				</div>
			</div>
			<div className="p2p-matchup__faceoff grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-y border-gold-200/20 py-5 sm:gap-4">
				<div className="p2p-matchup__identity p2p-matchup__identity--local min-w-0 text-center">
					<div className="mb-2 flex justify-center"><HiveAvatar username={localUsername} fallback="Y" label={localDisplayName} accent="gold" className="p2p-matchup__avatar-frame" /></div>
					<p className="truncate font-display text-sm font-black uppercase tracking-[0.08em] text-ink-0">{localDisplayName}</p>
					<p className="mt-1 font-display text-[10px] font-black uppercase tracking-[0.14em] text-gold-100">Your side</p>
				</div>
				<div className="p2p-matchup__versus" role="img" aria-label="Versus"><span aria-hidden={true}>VS</span></div>
				<div className="p2p-matchup__identity p2p-matchup__identity--opponent min-w-0 text-right">
					<div className="mb-2 flex justify-end"><HiveAvatar username={offer.opponent.username} fallback="O" label={opponentDisplayName} accent="blood" className="p2p-matchup__avatar-frame" /></div>
					<p className="truncate font-display text-sm font-black uppercase tracking-[0.08em] text-ink-0">{opponentDisplayName}</p>
					<p className="mt-1 font-display text-[10px] font-black uppercase tracking-[0.14em] text-blood-200">Opponent</p>
				</div>
			</div>
			{approvalPending ? (
				<div
					className="p2p-matchup__approval-wait"
					role="status"
					aria-live="polite"
					aria-busy={status === 'accepting'}
				>
					<LoaderCircle className="h-5 w-5 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden={true} />
					<div>
						<p className="font-display text-xs font-black uppercase tracking-[0.14em]">{status === 'accepting' ? 'Sending approval' : 'Waiting for opponent approval'}</p>
						<p className="mt-1 text-xs leading-relaxed text-ink-200">Match locked.</p>
					</div>
				</div>
			) : (
				<div className="flex flex-col gap-2 sm:flex-row">
					<Button type="button" variant="outline" onClick={() => { void onDecline(); }} disabled={accepting || !interactive} className="flex-1 hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300 active:translate-y-px disabled:opacity-50">
						<X className="mr-1 h-4 w-4" /> Decline
					</Button>
					<Button type="button" onClick={() => { void onAccept(); }} disabled={accepting || !interactive} className="p2p-matchup__accept-button flex-1 hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300 active:translate-y-px disabled:opacity-50">
						<ShieldCheck className="h-4 w-4" /> Accept
					</Button>
				</div>
			)}
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
		<div className="flex items-start gap-3" role="status" aria-live="polite">
			<div className="grid h-9 w-9 shrink-0 place-items-center border border-bifrost-300/45 bg-bifrost-500/10 text-bifrost-100">
				<LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden={true} />
			</div>
			<div>
				<p className="font-display text-xs font-black uppercase tracking-[0.14em] text-ink-0">{matchProgress.title}</p>
				<p className="mt-1 text-xs leading-relaxed text-ink-200">{matchProgress.detail}</p>
			</div>
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
		<div className="space-y-3 border border-blood-300/45 bg-blood-500/10 p-4" role="alert">
			<div className="flex items-start gap-3">
				<div className="grid h-8 w-8 shrink-0 place-items-center border border-blood-300/60 bg-blood-500/20 font-display font-black text-blood-200">!</div>
				<div>
					<p className="font-display text-xs font-black uppercase tracking-[0.14em] text-blood-200">Could not find opponent</p>
					<p className="mt-1 text-sm leading-relaxed text-ink-100">{getPlayerFacingMatchmakingError(error)}</p>
				</div>
			</div>
			<div className="flex flex-col gap-2 sm:flex-row">
				<Button onClick={() => { void onTryAgain(); }} variant="outline" className="flex-1 hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300 active:translate-y-px disabled:opacity-50">
					Try again
				</Button>
				<Button onClick={onUseManualMatch} variant="outline" className="flex-1 hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300 active:translate-y-px disabled:opacity-50">
					Manual room
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
		<div className="flex items-start gap-3" role="status" aria-live="polite">
			<div className="grid h-9 w-9 shrink-0 place-items-center border border-bifrost-300/45 bg-bifrost-500/10 text-bifrost-100">
				<LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden={true} />
			</div>
			<div>
				<p className="font-display text-xs font-black uppercase tracking-[0.14em] text-ink-0">{isHost ? 'Opening your room' : 'Connecting to room'}</p>
				<p className="mt-1 text-xs leading-relaxed text-ink-200">Authenticated room link. A VPN or IP change can reconnect without changing your player identity.</p>
			</div>
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
			aria-label={copied ? 'Peer ID copied' : 'Copy peer ID'}
			title={copied ? 'Peer ID copied' : 'Copy peer ID'}
			onClick={() => { void onCopyId(); }}
			className="h-11 w-11 min-h-11 min-w-11 p-0"
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
		<div className="border border-obsidian-600/80 bg-obsidian-950/70 p-4">
			<div className="mb-2 flex items-center justify-between gap-2">
				<span className="font-display text-[10px] font-black uppercase tracking-[0.16em] text-ink-200">Your peer ID</span>
				<CopyIdButton copied={copied} onCopyId={onCopyId} />
			</div>
			<code className="block break-all font-mono text-xs leading-relaxed text-gold-100">{peerId}</code>
			{helperText && (
				<p className="mt-2 text-xs text-ink-300">{helperText}</p>
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
					helperText="Share with opponent"
			/>
			<div className="flex items-start gap-3 border border-bifrost-300/30 bg-bifrost-500/8 p-3" role="status" aria-live="polite">
				<Radio className="mt-0.5 h-4 w-4 shrink-0 text-bifrost-100" aria-hidden={true} />
				<div>
					<p className="font-display text-xs font-black uppercase tracking-[0.14em] text-bifrost-100">Room open</p>
					<p className="mt-1 text-xs leading-relaxed text-ink-200">Waiting for peer.</p>
				</div>
			</div>
			<Button onClick={onDisconnect} variant="destructive" className="w-full hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300 active:translate-y-px disabled:opacity-50">
				<X className="w-4 h-4 mr-2" />
				Close
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

	const helperText = isHost && !remotePeerId ? 'Share with opponent' : undefined;

	return (
		<div className="space-y-4">
			<PeerIdCard peerId={myPeerId} copied={copied} onCopyId={onCopyId} helperText={helperText} />
			{isHost && !remotePeerId && (
				<p className="text-sm text-(--ink-300) text-center">Waiting for opponent...</p>
			)}
			{remotePeerId && (
					<div className="space-y-3 border border-rune-300/35 bg-rune-500/8 p-4">
						<p className="flex items-center gap-2 font-display text-xs font-black uppercase tracking-[0.14em] text-rune-300">
							<Check size={14} aria-hidden={true} /> Connected
						</p>
						<div>
							<span className="font-display text-[10px] font-black uppercase tracking-[0.14em] text-ink-300">
								{isHost ? 'Opponent ID' : 'Host ID'}
							</span>
							<code className="mt-1 block break-all font-mono text-xs text-ink-100">
								{remotePeerId}
							</code>
						</div>
						<div className="border-t border-rune-300/20 pt-3">
							<p className="font-display text-xs font-black uppercase tracking-[0.14em] text-gold-100">
								{matchStarting ? 'Starting match' : matchProgress.title}
							</p>
							<p className="mt-1 text-xs leading-relaxed text-ink-200">{matchProgress.detail}</p>
					</div>
				</div>
			)}
			{!matchStarting && (
				<Button onClick={onDisconnect} variant="destructive" className="w-full hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300 active:translate-y-px disabled:opacity-50">
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
			<p className="font-display text-xs font-black uppercase tracking-[0.14em] text-(--blood-300)">Match interrupted</p>
			<p className="mt-1 text-sm text-(--ink-200)">We could not reconnect this room.</p>
				<Button onClick={onDisconnect} variant="outline" className="w-full mt-2 hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300 active:translate-y-px disabled:opacity-50">
				Leave match
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
	const [pageVisible, setPageVisible] = useState(() => typeof document === 'undefined' || document.visibilityState === 'visible');
	const autoAcceptedOfferRef = useRef<string | null>(null);
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

	useEffect(() => {
		const handleVisibilityChange = () => setPageVisible(document.visibilityState === 'visible');
		document.addEventListener('visibilitychange', handleVisibilityChange);
		return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
	}, []);

	useEffect(() => {
		if (!shouldAutoAcceptQuickMatchOffer({
			status: matchmakingStatus,
			offer: matchOffer,
			pageVisible,
			searchIntentActive: matchmakingStatus !== 'idle' && matchmakingStatus !== 'error',
		}) || !matchOffer) return;
		if (autoAcceptedOfferRef.current === matchOffer.offerId) return;
		autoAcceptedOfferRef.current = matchOffer.offerId;
		void acceptOffer();
	}, [acceptOffer, matchOffer, matchmakingStatus, pageVisible]);

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
