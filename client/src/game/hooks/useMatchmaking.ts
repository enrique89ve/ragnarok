import { useCallback } from 'react';
import { useMatchmakingStore } from '../stores/matchmakingStore';
import { usePeerStore } from '../stores/peerStore';
import { getNFTBridge } from '../nft';
import { useNFTUsername } from '../nft/hooks';
import { debug } from '../config/debugConfig';
import { isHiveWalletAvailable, signHiveMessage } from '../../data/HiveAuth';
import { getAuthenticatedHiveUsername } from '../../data/HiveSessionIdentity';
import { isSharedNetworkEnvironment } from '../config/featureFlags';
import { readP2PMatchTicket, readServerSignedChallenge } from '@shared/p2pAvailability';
import { buildP2PQueueAuthMessage } from '@shared/p2pMatchmakingAuth';
import { useStarterStore } from '../stores/starterStore';
import { ensureSharedNetworkStarterClaimReceipt } from '../data/starterClaim';
import {
	normalizeProtectedFlowAccountId,
	resolveProtectedFlowAccess,
	type ProtectedFlowAccess,
} from '../auth/protectedFlowAccess';

function getMatchmakingApiBase(): string {
	return import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
}
// Module-scoped by design: ArmySelection can start matchmaking, then
// MultiplayerGame/Lobby can render from the shared store while polling keeps
// running. A hook-local ref would stop polling when the starter component
// unmounts during that screen transition.
let serverStatusPollIntervalId: number | null = null;

function clearServerStatusPoller(): void {
	if (serverStatusPollIntervalId !== null) {
		window.clearInterval(serverStatusPollIntervalId);
		serverStatusPollIntervalId = null;
	}
}

function readOptionalMatchmakingChallenge(input: unknown, label: string) {
	if (input === undefined) return null;
	const challenge = readServerSignedChallenge(input);
	if (!challenge) throw new Error(`Matchmaking server returned an invalid ${label}`);
	return challenge;
}

type QuickMatchQueueAccess =
	| { readonly kind: 'allowed'; readonly accountId: string | null }
	| {
		readonly kind: 'blocked';
		readonly reason: Extract<ProtectedFlowAccess, { readonly kind: 'blocked' }>['reason'] | 'hive_wallet_unavailable';
		readonly message: string;
	};

type MatchmakingActions = Pick<
	ReturnType<typeof useMatchmakingStore.getState>,
	'setStatus' | 'setQueuePosition' | 'setOpponent' | 'setRoomId' | 'setQueueToken' | 'setError'
>;

type QueueBodyBuildResult =
	| { readonly ok: true; readonly body: Record<string, unknown> }
	| { readonly ok: false; readonly message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function resolveQuickMatchAccountId(input: {
	readonly hiveUsername?: string | null;
	readonly authenticatedHiveUsername?: string | null;
}): string | null {
	return normalizeProtectedFlowAccountId(input.hiveUsername)
		?? normalizeProtectedFlowAccountId(input.authenticatedHiveUsername);
}

export function resolveQuickMatchQueueAccess(input: {
	readonly accountId: string | null;
	readonly authenticatedHiveUsername: string | null;
	readonly sharedNetwork: boolean;
	readonly starterClaimed: boolean;
	readonly hiveWalletAvailable: boolean;
}): QuickMatchQueueAccess {
	const p2pAccess = resolveProtectedFlowAccess({
		accountId: input.accountId,
		authenticatedAccountId: input.authenticatedHiveUsername,
		sharedNetwork: input.sharedNetwork,
		surface: 'quick_match',
		requiresAuthenticatedSession: true,
		requiresStarterClaim: true,
		starterClaimed: input.starterClaimed,
	});
	if (p2pAccess.kind === 'blocked') {
		return {
			kind: 'blocked',
			reason: p2pAccess.reason,
			message: p2pAccess.message,
		};
	}

	if (input.sharedNetwork && !input.hiveWalletAvailable) {
		return {
			kind: 'blocked',
			reason: 'hive_wallet_unavailable',
			message: 'Hive Keychain is not available in this browser profile.',
		};
	}

	return { kind: 'allowed', accountId: p2pAccess.accountId };
}

function readQuickMatchStarterClaimed(input: {
	readonly accountId: string | null;
	readonly sharedNetwork: boolean;
}): boolean {
	if (!input.sharedNetwork) return useStarterStore.getState().hasClaimed(input.accountId);
	return Boolean(input.accountId && useStarterStore.getState().hasClaimed(input.accountId));
}

export async function buildQuickMatchQueueBody(input: {
	readonly peerId: string;
	readonly accountId: string | null;
	readonly sharedNetwork: boolean;
	readonly starterClaimed: boolean;
	readonly hiveMode: boolean;
}): Promise<QueueBodyBuildResult> {
	if (input.accountId && input.hiveMode) {
		const timestamp = Date.now();
		const message = buildP2PQueueAuthMessage({
			username: input.accountId,
			peerId: input.peerId,
			starterClaimed: input.starterClaimed,
			timestamp,
		});
		try {
			const result = await signHiveMessage(message, {
				username: input.accountId,
				title: 'Ragnarok: queue',
			});
			if (!result.success || !result.signature) {
				return { ok: false, message: 'Hive Keychain signature required before entering matchmaking.' };
			}
			return {
				ok: true,
				body: {
					peerId: input.peerId,
					username: input.accountId,
					timestamp,
					signature: result.signature,
					starterClaimed: input.starterClaimed,
				},
			};
		} catch (err) {
			debug.warn('[useMatchmaking] Hive auth body build failed:', err);
			if (input.sharedNetwork) {
				return { ok: false, message: 'Hive Keychain signature required before entering matchmaking.' };
			}
		}
	}
	if (input.sharedNetwork) {
		return { ok: false, message: 'Hive account required before entering matchmaking.' };
	}
	return { ok: true, body: { peerId: input.peerId } };
}

async function readSharedNetworkStarterReceiptError(input: {
	readonly sharedNetwork: boolean;
	readonly accountId: string | null;
}): Promise<string | null> {
	if (!input.sharedNetwork || !input.accountId) return null;
	const receipt = await ensureSharedNetworkStarterClaimReceipt(input.accountId);
	return receipt.success ? null : receipt.error;
}

export async function readMatchmakingError(response: Response): Promise<string> {
	let serverError = `HTTP ${response.status}`;
	try {
		const errBody: unknown = await response.json();
		if (isRecord(errBody) && typeof errBody.error === 'string') {
			serverError = `${errBody.error} (HTTP ${response.status})`;
		}
	} catch { /* not JSON, use status code */ }
	return serverError;
}

function readMatchmakingPosition(data: Record<string, unknown>): number | null {
	return typeof data.position === 'number' ? data.position : null;
}

function applyMatchedMatchmakingPayload(data: Record<string, unknown>, actions: MatchmakingActions): void {
	const matchTicket = readP2PMatchTicket(data.matchTicket);
	if (!matchTicket) throw new Error('Matchmaking server did not return a valid P2P match ticket');
	if (typeof data.opponentPeerId !== 'string') {
		throw new Error('Matchmaking server did not return an opponent peer id');
	}
	if (typeof data.isHost !== 'boolean') {
		throw new Error('Matchmaking server did not return host assignment');
	}

	const localMatchChallenge = readOptionalMatchmakingChallenge(data.matchChallenge, 'match challenge');
	const opponentMatchChallenge = readOptionalMatchmakingChallenge(data.opponentMatchChallenge, 'opponent match challenge');
	usePeerStore.getState().setMatchChallenges(
		localMatchChallenge ?? null,
		opponentMatchChallenge ?? null,
	);
	usePeerStore.getState().setMatchTicket(matchTicket);
	actions.setStatus('matched');
	actions.setOpponent(data.opponentPeerId, data.isHost);
	if (typeof data.matchId === 'string') actions.setRoomId(data.matchId);
	actions.setQueueToken(null);
	actions.setQueuePosition(null);
}

function applyQueuedMatchmakingPayload(
	data: Record<string, unknown>,
	fallbackQueueToken: string | null,
	actions: MatchmakingActions,
): void {
	const queuedToken = typeof data.queueToken === 'string' && data.queueToken.length > 0
		? data.queueToken
		: fallbackQueueToken;
	if (!queuedToken) {
		throw new Error('Matchmaking server did not return a queue token');
	}
	actions.setQueueToken(queuedToken);
	actions.setQueuePosition(readMatchmakingPosition(data));
}

export function failQueuedStatus(message: string, actions: MatchmakingActions): void {
	clearServerStatusPoller();
	usePeerStore.getState().clearMatchChallenges();
	actions.setQueueToken(null);
	actions.setQueuePosition(null);
	actions.setOpponent(null, null);
	actions.setRoomId(null);
	actions.setError(message);
	actions.setStatus('error');
}

async function pollMatchmakingStatus(actions: MatchmakingActions): Promise<void> {
	const currentPeerId = usePeerStore.getState().myPeerId;
	if (!currentPeerId) {
		failQueuedStatus('Peer connection closed while searching', actions);
		return;
	}

	const activeQueueToken = useMatchmakingStore.getState().queueToken;
	if (!activeQueueToken) {
		throw new Error('Missing matchmaking queue token');
	}
	const statusResponse = await fetch(`${getMatchmakingApiBase()}/api/matchmaking/status/${currentPeerId}`, {
		headers: { 'x-p2p-queue-token': activeQueueToken },
	});
	if (!statusResponse.ok) {
		const serverError = await readMatchmakingError(statusResponse);
		throw new Error(`Matchmaking status rejected: ${serverError}`);
	}
	const statusData: unknown = await statusResponse.json();
	if (!isRecord(statusData) || statusData.success !== true) return;

	if (statusData.status === 'matched') {
		applyMatchedMatchmakingPayload(statusData, actions);
		clearServerStatusPoller();
		return;
	}
	if (statusData.status === 'queued') {
		actions.setQueuePosition(readMatchmakingPosition(statusData));
		return;
	}
	if (statusData.status === 'not_queued') {
		failQueuedStatus('Matchmaking queue entry expired or was not found.', actions);
	}
}

function startServerStatusPoller(actions: MatchmakingActions): void {
	clearServerStatusPoller();
	serverStatusPollIntervalId = window.setInterval(() => {
		void pollMatchmakingStatus(actions).catch((err: unknown) => {
			failQueuedStatus(err instanceof Error ? err.message : 'Matchmaking server unavailable', actions);
		});
	}, 2000);
}

export function useMatchmaking() {
	const hiveUsername = useNFTUsername();
	const {
		status,
		queuePosition,
		opponentPeerId,
		isHost,
		roomId,
		queueToken,
		error,
		setStatus,
		setQueuePosition,
		setOpponent,
		setRoomId,
		setQueueToken,
		setError,
		reset,
	} = useMatchmakingStore();

	const joinQueue = useCallback(async () => {
		clearServerStatusPoller();
		const failJoin = (message: string) => {
			clearServerStatusPoller();
			usePeerStore.getState().clearMatchChallenges();
			setQueueToken(null);
			setError(message);
			setStatus('error');
			setQueuePosition(null);
			setOpponent(null, null);
			setRoomId(null);
			return false;
		};

		usePeerStore.getState().clearMatchChallenges();

		const peerId = usePeerStore.getState().myPeerId;
		if (!peerId) {
			return failJoin('No peer ID available');
		}

		try {
			setStatus('queued');
			setError(null);

			const nftBridge = getNFTBridge();
			const sharedNetwork = isSharedNetworkEnvironment();
			const authenticatedHiveUsername = getAuthenticatedHiveUsername();
			const matchmakingAccountId = resolveQuickMatchAccountId({
				hiveUsername,
				authenticatedHiveUsername,
			});
			const starterClaimed = readQuickMatchStarterClaimed({
				accountId: matchmakingAccountId,
				sharedNetwork,
			});
			const p2pAccess = resolveQuickMatchQueueAccess({
				accountId: matchmakingAccountId,
				authenticatedHiveUsername,
				sharedNetwork,
				starterClaimed,
				hiveWalletAvailable: isHiveWalletAvailable(),
			});
			if (p2pAccess.kind === 'blocked') {
				return failJoin(p2pAccess.message);
			}
			const starterReceiptError = await readSharedNetworkStarterReceiptError({
				sharedNetwork,
				accountId: p2pAccess.accountId,
			});
			if (starterReceiptError) return failJoin(starterReceiptError);

			const queueBodyResult = await buildQuickMatchQueueBody({
				peerId,
				accountId: p2pAccess.accountId,
				sharedNetwork,
				starterClaimed,
				hiveMode: nftBridge.isHiveMode(),
			});
			if (!queueBodyResult.ok) return failJoin(queueBodyResult.message);

			const existingQueueToken = queueToken;
			const response = await fetch(`${getMatchmakingApiBase()}/api/matchmaking/queue`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(existingQueueToken ? { 'x-p2p-queue-token': existingQueueToken } : {}),
				},
				body: JSON.stringify(queueBodyResult.body),
			}).catch((err) => {
				// Network-level failure (server not running, CORS, browser offline).
				// Surface the actual error so we don't lose diagnosability behind a
				// generic "service unavailable" message.
				debug.error('[useMatchmaking] queue fetch failed:', err);
				throw new Error(`Matchmaking service unreachable: ${err instanceof Error ? err.message : String(err)}`);
			});

			if (!response.ok) {
				const serverError = await readMatchmakingError(response);
				debug.error('[useMatchmaking] queue rejected by server:', serverError);
				throw new Error(`Matchmaking error: ${serverError}`);
			}

			const data: unknown = await response.json();

			if (!isRecord(data) || data.success !== true) {
				throw new Error(isRecord(data) && typeof data.error === 'string' ? data.error : 'Failed to join queue');
			}

			if (data.status === 'matched') {
				applyMatchedMatchmakingPayload(data, {
					setStatus,
					setQueuePosition,
					setOpponent,
					setRoomId,
					setQueueToken,
					setError,
				});
				return true;
			}

			applyQueuedMatchmakingPayload(data, queueToken, {
				setStatus,
				setQueuePosition,
				setOpponent,
				setRoomId,
				setQueueToken,
				setError,
			});
			startServerStatusPoller({
				setStatus,
				setQueuePosition,
				setOpponent,
				setRoomId,
				setQueueToken,
				setError,
			});

			return true;
		} catch (err: unknown) {
			return failJoin(err instanceof Error ? err.message : 'Failed to join matchmaking queue');
		}
	}, [hiveUsername, queueToken, setStatus, setError, setQueuePosition, setOpponent, setRoomId, setQueueToken]);

	const leaveQueue = useCallback(async () => {
		const peerId = usePeerStore.getState().myPeerId;
		usePeerStore.getState().clearMatchChallenges();
		clearServerStatusPoller();

		if (!peerId) {
			reset();
			return;
		}

		try {
			const activeQueueToken = useMatchmakingStore.getState().queueToken;
			await fetch(`${getMatchmakingApiBase()}/api/matchmaking/leave`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(activeQueueToken ? { 'x-p2p-queue-token': activeQueueToken } : {}),
				},
				body: JSON.stringify({ peerId }),
			});
		} catch (err) {
			debug.error('[useMatchmaking] Failed to leave queue:', err);
		}

		reset();
	}, [reset]);

	return {
		status,
		queuePosition,
		opponentPeerId,
		isHost,
		roomId,
		error,
		joinQueue,
		leaveQueue,
	};
}
