import React, { useState, useCallback, useEffect, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Crosshair, UserPlus, Users, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { useNFTUsername } from '../../nft/hooks';
import { useFriendStore, type Friend, type FriendPresence, type OutgoingFriendChallenge } from '../../stores/friendStore';
import { usePeerStore } from '../../stores/peerStore';
import { useStarterStore } from '../../stores/starterStore';
import { routes } from '../../../lib/routes';
import { ensureFriendSession } from './friendSession';
import { getAuthenticatedHiveUsername, subscribeHiveSessionIdentity } from '../../../data/HiveSessionIdentity';
import { isSharedNetworkEnvironment } from '../../config/featureFlags';
import { resolveProtectedFlowAccess } from '../../auth/protectedFlowAccess';
import {
	CHALLENGE_STALE_THRESHOLD_MS,
	readChallengeSendResponse,
	type ChallengeRejectReason,
	type P2PAvailabilityState,
} from '@shared/p2pAvailability';

type ChallengeButtonState = {
	readonly disabled: boolean;
	readonly label: string;
	readonly detail: string;
};

const AVAILABILITY_LABELS: Record<P2PAvailabilityState, string> = {
	available: 'Available',
	challenging: 'Challenging',
	challenge_pending: 'Pending',
	matchmaking: 'Matchmaking',
	in_match: 'In match',
	reconnecting: 'Reconnecting',
	busy: 'Busy',
	offline: 'Offline',
};

const CHALLENGE_REJECT_LABELS: Record<ChallengeRejectReason, string> = {
	offline: 'Player is offline.',
	busy: 'Player is busy.',
	matchmaking: 'Player is matchmaking.',
	in_match: 'Player is in a match.',
	reconnecting: 'Player is reconnecting.',
	not_warband: 'Warband acceptance is required.',
	rate_limited: 'Challenge cooldown active.',
	stale_peer: 'Refresh presence before challenging.',
	self_challenge: 'You cannot challenge yourself.',
	server_unconfigured: 'P2P challenge signing is not configured.',
	starter_claim_required: 'Claim starter before challenging.',
	invalid_input: 'Challenge request was invalid.',
};

function normalizeFriendUsername(value: string): string {
	return value.trim().toLowerCase().replace(/^@/, '');
}

export function formatRetryAfterMs(retryAfterMs: number): string {
	const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.ceil(seconds / 60);
	return `${minutes}m`;
}

export function challengeRejectReasonLabel(reason: ChallengeRejectReason, retryAfterMs?: number): string {
	if (reason === 'rate_limited' && typeof retryAfterMs === 'number') {
		return `Wait ${formatRetryAfterMs(retryAfterMs)} before challenging again.`;
	}
	return CHALLENGE_REJECT_LABELS[reason];
}

function getLocalChallengeBlock(params: {
	readonly friendName: string;
	readonly hiveUsername: string | null;
	readonly p2pBlockedDetail?: string | null;
}): ChallengeButtonState | null {
	if (!params.hiveUsername) return { disabled: true, label: 'Challenge', detail: 'Connect Hive' };
	if (params.hiveUsername === params.friendName) return { disabled: true, label: 'Challenge', detail: 'Self challenge' };
	if (params.p2pBlockedDetail) return { disabled: true, label: 'Challenge', detail: params.p2pBlockedDetail };
	return null;
}

export function buildFriendChallengeRequest(params: {
	readonly from: string;
	readonly to: string;
	readonly peerId: string;
}): { readonly from: string; readonly to: string; readonly peerId: string } {
	return {
		from: normalizeFriendUsername(params.from),
		to: normalizeFriendUsername(params.to),
		peerId: params.peerId,
	};
}

export function getFriendChallengeButtonState(params: {
	readonly friend: Pick<Friend, 'hiveUsername' | 'relationStatus'>;
	readonly presence?: FriendPresence;
	readonly hiveUsername?: string | null;
	readonly cooldownUntil?: number;
	readonly outgoingChallenge?: OutgoingFriendChallenge | null;
	readonly p2pBlockedDetail?: string | null;
	readonly now: number;
}): ChallengeButtonState {
	const friendName = normalizeFriendUsername(params.friend.hiveUsername);
	const hiveUsername = params.hiveUsername ? normalizeFriendUsername(params.hiveUsername) : null;
	if (params.friend.relationStatus !== 'accepted') {
		return { disabled: true, label: 'Challenge', detail: 'Invite required' };
	}
	const localBlock = getLocalChallengeBlock({ friendName, hiveUsername, p2pBlockedDetail: params.p2pBlockedDetail });
	if (localBlock) return localBlock;
	if (params.cooldownUntil && params.cooldownUntil > params.now) {
		return {
			disabled: true,
			label: 'Cooldown',
			detail: `Wait ${formatRetryAfterMs(params.cooldownUntil - params.now)}`,
		};
	}
	if (
		params.outgoingChallenge
		&& params.outgoingChallenge.to === friendName
		&& params.outgoingChallenge.expiresAt > params.now
	) {
		return { disabled: true, label: 'Pending', detail: 'Challenge sent' };
	}
	if (!params.presence?.online) {
		return { disabled: true, label: 'Challenge', detail: 'Offline' };
	}

	const availability = params.presence.availability ?? 'available';
	if (params.presence.canReceiveChallenge === false || availability !== 'available') {
		return {
			disabled: true,
			label: 'Challenge',
			detail: AVAILABILITY_LABELS[availability],
		};
	}

	return { disabled: false, label: 'Challenge', detail: 'Available' };
}

function getP2PChallengeBlockDetail(reason: ReturnType<typeof resolveProtectedFlowAccess>): string | null {
	if (reason.kind === 'allowed') return null;
	if (reason.reason === 'starter_claim_required') return 'Claim starter';
	if (reason.reason === 'hive_session_required') return 'Sign Keychain';
	if (reason.reason === 'hive_session_mismatch') return 'Account mismatch';
	return 'Connect Hive';
}

function AddFriendDialog({ onAdd, onClose }: { onAdd: (name: string) => void; onClose: () => void }) {
	const [name, setName] = useState('');

	return (
		<div className="bg-gray-800/90 border border-gray-600 rounded-lg p-3 space-y-2">
			<p className="text-xs text-gray-400">Enter Hive username</p>
			<div className="flex gap-2">
				<input
					type="text"
					value={name}
					onChange={e => setName(e.target.value)}
					onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onAdd(name.trim()); }}
					placeholder="@username"
					autoFocus
					className="flex-1 min-w-0 px-2 py-1 bg-gray-900 border border-gray-600 rounded text-sm text-white placeholder-gray-600 focus:outline-hidden focus:border-amber-500"
				/>
				<button
					onClick={() => { if (name.trim()) onAdd(name.trim()); }}
					disabled={!name.trim()}
					className="px-2 py-1 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 text-white rounded text-xs font-semibold transition-colors"
				>
					Add
				</button>
				<button onClick={onClose} className="px-2 py-1 text-gray-500 hover:text-gray-300 text-xs">
					Cancel
				</button>
			</div>
		</div>
	);
}

function FriendCard({
	friend,
	presence,
	buttonState,
	isSending,
	onChallenge,
}: {
	readonly friend: Friend;
	readonly presence?: FriendPresence;
	readonly buttonState: ChallengeButtonState;
	readonly isSending: boolean;
	readonly onChallenge: (username: string) => void;
}) {
	const removeFriend = useFriendStore(s => s.removeFriend);
	const isAccepted = friend.relationStatus === 'accepted';
	const isOnline = presence?.online ?? false;
	const statusLabel = isAccepted
		? (isOnline ? AVAILABILITY_LABELS[presence?.availability ?? 'available'] : 'Offline')
		: 'Invite required';

		return (
			<div className="flex items-center justify-between rounded-xl border border-white/5 bg-gray-900/35 px-3 py-2.5 transition-colors hover:bg-gray-800/40 group">
				<div className="flex min-w-0 items-center gap-2">
					<div className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${isAccepted && isOnline ? 'bg-green-500/12 text-green-300' : 'bg-slate-500/12 text-slate-400'}`}>
						{isAccepted && isOnline
							? <Wifi size={14} strokeWidth={2} />
							: isAccepted
								? <WifiOff size={14} strokeWidth={2} />
								: <UserPlus size={14} strokeWidth={2} />}
					</div>
					<div className="min-w-0">
						<span className="block truncate text-sm font-medium text-gray-200">
							{friend.nickname || `@${friend.hiveUsername}`}
						</span>
						<span className="block truncate text-[11px] text-gray-500">{statusLabel}</span>
					</div>
				</div>
				<div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
					{isAccepted && (
						<button
							type="button"
							title={buttonState.detail}
							onClick={() => onChallenge(friend.hiveUsername)}
							disabled={buttonState.disabled || isSending}
							className="inline-flex items-center gap-1 text-xs font-semibold text-amber-300 transition-colors hover:text-amber-100 disabled:cursor-not-allowed disabled:text-gray-500"
						>
							<Crosshair size={13} strokeWidth={2} />
							{isSending ? 'Sending' : buttonState.label}
						</button>
					)}
					{isAccepted && buttonState.disabled && !isSending && (
						<span className="max-w-24 truncate text-[11px] text-gray-500" title={buttonState.detail}>
							{buttonState.detail}
						</span>
					)}
					<button
						type="button"
						onClick={() => removeFriend(friend.hiveUsername)}
						className="text-xs text-gray-500 hover:text-red-300"
					>
						Remove
					</button>
			</div>
		</div>
	);
}

export default function FriendsPanel() {
	const hiveUsername = useNFTUsername();
	const authenticatedHiveUsername = useSyncExternalStore(
		subscribeHiveSessionIdentity,
		getAuthenticatedHiveUsername,
		getAuthenticatedHiveUsername,
	);
	const sharedNetwork = isSharedNetworkEnvironment();
	const starterClaimed = useStarterStore(state => (
		sharedNetwork
			? Boolean(hiveUsername && state.hasClaimed(hiveUsername))
			: state.hasClaimed(hiveUsername)
	));
	const p2pChallengeAccess = resolveProtectedFlowAccess({
		accountId: hiveUsername,
		authenticatedAccountId: authenticatedHiveUsername,
		sharedNetwork,
		surface: 'multiplayer',
		requiresAuthenticatedSession: true,
		requiresStarterClaim: true,
		starterClaimed,
	});
	const p2pBlockedDetail = getP2PChallengeBlockDetail(p2pChallengeAccess);
	const friends = useFriendStore(s => s.friends);
	const onlineStatus = useFriendStore(s => s.onlineStatus);
	const outgoingChallenge = useFriendStore(s => s.outgoingChallenge);
	const challengeCooldowns = useFriendStore(s => s.challengeCooldowns);
	const presenceCooldownUntil = useFriendStore(s => s.presenceCooldownUntil);
	const addFriend = useFriendStore(s => s.addFriend);
	const setOutgoingChallenge = useFriendStore(s => s.setOutgoingChallenge);
	const setChallengeCooldown = useFriendStore(s => s.setChallengeCooldown);
	const clearChallengeCooldown = useFriendStore(s => s.clearChallengeCooldown);
	const pruneExpiredChallenges = useFriendStore(s => s.pruneExpiredChallenges);
	const navigate = useNavigate();
	const [showAdd, setShowAdd] = useState(false);
	const [expanded, setExpanded] = useState(true);
	const [sendingTo, setSendingTo] = useState<string | null>(null);
	// Reactive `now`: cooldown + outgoing-challenge expiry are time-relative.
	// Stale `now` (captured at render) froze the countdown + button state until
	// the next render trigger. Tick every 1s — granularity matches minute-scale
	// cooldowns (3-5m) and 2m stale threshold. Component-test gap: no RTL in stack.
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const id = window.setInterval(() => setNow(Date.now()), 1000);
		return () => window.clearInterval(id);
	}, []);

	const handleChallenge = useCallback(async (username: string) => {
		if (!hiveUsername) {
			toast.error('Connect Hive before sending a challenge.');
			return;
		}
		const currentAuthenticatedHiveUsername = getAuthenticatedHiveUsername();
		const currentSharedNetwork = isSharedNetworkEnvironment();
		const currentStarterClaimed = useStarterStore.getState().hasClaimed(hiveUsername);
		const currentAccess = resolveProtectedFlowAccess({
			accountId: hiveUsername,
			authenticatedAccountId: currentAuthenticatedHiveUsername,
			sharedNetwork: currentSharedNetwork,
			surface: 'multiplayer',
			requiresAuthenticatedSession: true,
			requiresStarterClaim: true,
			starterClaimed: currentStarterClaimed,
		});
		if (currentAccess.kind === 'blocked') {
			toast.error(currentAccess.message);
			return;
		}
		const target = normalizeFriendUsername(username);
		setSendingTo(target);
		try {
			let peerId = usePeerStore.getState().myPeerId;
			if (!peerId) {
				usePeerStore.getState().prepareForMatchmaking();
				peerId = usePeerStore.getState().myPeerId;
			}
			if (!peerId) {
				toast.error('Could not create a peer reservation.');
				return;
			}
			if (!await ensureFriendSession(hiveUsername)) {
				toast.error('Connect Hive before sending a challenge.');
				return;
			}

			const response = await fetch('/api/friends/challenge', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(buildFriendChallengeRequest({
					from: hiveUsername,
					to: target,
					peerId,
				})),
			});
			const payload: unknown = await response.json().catch(() => null);
			const parsed = readChallengeSendResponse(payload);

			if (!response.ok || !parsed.ok) {
				const reason = parsed.ok ? 'invalid_input' : parsed.reason;
				if (!parsed.ok && reason === 'rate_limited' && typeof parsed.retryAfterMs === 'number') {
					setChallengeCooldown(target, parsed.retryAfterMs);
				}
				toast.error(challengeRejectReasonLabel(reason, !parsed.ok ? parsed.retryAfterMs : undefined));
				return;
			}

			const sentAt = Date.now();
			setOutgoingChallenge({
				to: target,
				peerId,
				sentAt,
				expiresAt: parsed.challenge?.expiresAt ?? sentAt + CHALLENGE_STALE_THRESHOLD_MS,
				matchChallenge: parsed.opponentMatchChallenge ?? parsed.challenge,
				opponentMatchChallenge: parsed.challenge,
				matchTicket: parsed.opponentMatchChallenge?.matchTicket ?? null,
			});
			clearChallengeCooldown(target);
			pruneExpiredChallenges(sentAt);
			toast.success(`Challenge sent to @${target}.`);
			navigate(routes.multiplayer);
		} catch {
			toast.error('Challenge service is unavailable.');
		} finally {
			setSendingTo(null);
		}
	}, [hiveUsername, setOutgoingChallenge, setChallengeCooldown, clearChallengeCooldown, pruneExpiredChallenges, navigate]);

	const acceptedFriends = friends.filter(f => f.relationStatus === 'accepted');
	const localFriends = friends.filter(f => f.relationStatus !== 'accepted');
	const onlineFriends = acceptedFriends.filter(f => onlineStatus[f.hiveUsername]?.online);
	const offlineFriends = acceptedFriends.filter(f => !onlineStatus[f.hiveUsername]?.online);

	return (
		<div className="social-warband-panel w-64 space-y-3">
			<button
				onClick={() => setExpanded(!expanded)}
				className="flex w-full items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-left"
			>
				<div className="flex items-center gap-2">
					<Users size={15} strokeWidth={2} className="text-amber-300" />
					<h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-200/80">
						Warband ({friends.length})
					</h3>
				</div>
				<span className="text-gray-500 text-xs" title={presenceCooldownUntil !== null && presenceCooldownUntil > now ? `Refresh cooldown: ${formatRetryAfterMs(presenceCooldownUntil - now)}` : undefined}>
					{expanded ? <ChevronUp size={15} strokeWidth={2} /> : <ChevronDown size={15} strokeWidth={2} />}
				</span>
			</button>

			{expanded && (
				<div className="space-y-2">
					{presenceCooldownUntil !== null && presenceCooldownUntil > now && (
						<p className="px-1 text-[11px] text-amber-300">
							Presence refresh cooldown: wait {formatRetryAfterMs(presenceCooldownUntil - now)}.
						</p>
					)}
					{onlineFriends.length > 0 && (
						<>
							<p className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-green-400/75">Online</p>
							{onlineFriends.map(f => (
								<FriendCard
									key={f.hiveUsername}
									friend={f}
									presence={onlineStatus[f.hiveUsername]}
									buttonState={getFriendChallengeButtonState({
										friend: f,
										presence: onlineStatus[f.hiveUsername],
										hiveUsername,
										cooldownUntil: challengeCooldowns[f.hiveUsername]?.until,
										outgoingChallenge,
										p2pBlockedDetail,
										now,
									})}
									isSending={sendingTo === f.hiveUsername}
									onChallenge={handleChallenge}
								/>
							))}
						</>
					)}
					{offlineFriends.length > 0 && (
						<>
							<p className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400/75">Offline</p>
							{offlineFriends.map(f => (
								<FriendCard
									key={f.hiveUsername}
									friend={f}
									presence={onlineStatus[f.hiveUsername]}
									buttonState={getFriendChallengeButtonState({
										friend: f,
										presence: onlineStatus[f.hiveUsername],
										hiveUsername,
										cooldownUntil: challengeCooldowns[f.hiveUsername]?.until,
										outgoingChallenge,
										p2pBlockedDetail,
										now,
									})}
									isSending={sendingTo === f.hiveUsername}
									onChallenge={handleChallenge}
								/>
							))}
						</>
					)}
					{localFriends.length > 0 && (
						<>
							<p className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200/70">Invite required</p>
							{localFriends.map(f => (
								<FriendCard
									key={f.hiveUsername}
									friend={f}
									presence={onlineStatus[f.hiveUsername]}
									buttonState={getFriendChallengeButtonState({
										friend: f,
										presence: onlineStatus[f.hiveUsername],
										hiveUsername,
										cooldownUntil: challengeCooldowns[f.hiveUsername]?.until,
										outgoingChallenge,
										p2pBlockedDetail,
										now,
									})}
									isSending={sendingTo === f.hiveUsername}
									onChallenge={handleChallenge}
								/>
							))}
						</>
					)}
					{friends.length === 0 && (
						<div className="rounded-xl border border-dashed border-white/8 bg-black/10 px-3 py-3">
							<p className="text-sm font-medium text-gray-300">No warband contacts yet.</p>
							<p className="mt-1 text-xs leading-relaxed text-gray-500">
								Add a Hive player here and challenge them directly from the multiplayer lobby when they are online.
							</p>
						</div>
					)}

					{showAdd ? (
						<AddFriendDialog
							onAdd={(name) => { addFriend(name); setShowAdd(false); }}
							onClose={() => setShowAdd(false)}
						/>
						) : (
							<button
								onClick={() => setShowAdd(true)}
								className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-amber-400/20 hover:bg-gray-800/40 hover:text-amber-100"
							>
								<UserPlus size={15} strokeWidth={2} />
								Add Contact
							</button>
						)}
					</div>
			)}
		</div>
	);
}
