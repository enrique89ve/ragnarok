import { useCallback } from 'react';
import { useMatchmakingStore } from '../stores/matchmakingStore';
import { usePeerStore } from '../stores/peerStore';
import { useNFTUsername } from '../nft/hooks';
import { debug } from '../config/debugConfig';
import { signHiveMessage } from '../../data/HiveAuth';
import { getHiveKeychainError } from '../../data/HiveKeychain';
import { getAuthenticatedHiveUsername } from '../../data/HiveSessionIdentity';
import { isSharedNetworkEnvironment } from '../config/featureFlags';
import { readP2PMatchTicket, readServerSignedChallenge } from '@shared/p2pAvailability';
import {
	buildMatchAcceptanceV2Message,
	readMatchOffer,
	type MatchAcceptanceProof,
	type MatchAcceptanceV1,
	type MatchOffer,
} from '@shared/p2pMatchAcceptance';
import { useStarterStore } from '../stores/starterStore';
import { hasSharedNetworkStarterClaimReceipt } from '../data/starterClaim';
import { getCardRegistryHash } from '../data/effects/registryHash';
import { getWasmHash, loadWasmEngine } from '../engine/wasmLoader';
import { bindSessionKey, generateEphemeralSigningKey, generateSessionKey } from '../protocol/sessionKey';
import { invokeClientWalletAction } from '../../data/wallet/clientWalletInvocation';
import {
	cacheMatchAcceptance,
	cacheMatchmakingDelegation,
	clearCachedMatchAcceptance,
	clearCachedMatchmakingDelegation,
	getCachedMatchAcceptance,
	getCachedMatchmakingDelegation,
} from '../p2p/matchAcceptance';
import {
	buildMatchmakingDelegationMessage,
	readMatchmakingDelegationChallenge,
	type MatchmakingDelegationProof,
} from '@shared/p2pMatchDelegation';
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

type QuickMatchInFlight = {
	intentId: string;
	promise: Promise<boolean>;
};

// Quick Match is one logical user operation even when ArmySelection and the
// lobby both expose the shared action. Keep the promise at module scope so a
// second click or a screen transition cannot prepare/sign/enqueue twice.
let quickMatchInFlight: QuickMatchInFlight | null = null;

export function runQuickMatchSingleFlight(runAttempt: (intentId: string) => Promise<boolean>): Promise<boolean> {
	if (quickMatchInFlight) return quickMatchInFlight.promise;

	const attempt: QuickMatchInFlight = {
		intentId: crypto.randomUUID(),
		promise: Promise.resolve(false),
	};
	quickMatchInFlight = attempt;
	const promise = Promise.resolve().then(() => runAttempt(attempt.intentId));
	attempt.promise = promise;
	void promise.then(
		() => {
			if (quickMatchInFlight === attempt) quickMatchInFlight = null;
		},
		() => {
			if (quickMatchInFlight === attempt) quickMatchInFlight = null;
		},
	);
	return promise;
}

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
> & Partial<Pick<ReturnType<typeof useMatchmakingStore.getState>, 'setOffer' | 'setMatchCommitted'>>;

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
	readonly hiveWalletAvailable?: boolean;
	readonly requiresAuthenticatedSession?: boolean;
}): QuickMatchQueueAccess {
	const p2pAccess = resolveProtectedFlowAccess({
		accountId: input.accountId,
		authenticatedAccountId: input.authenticatedHiveUsername,
		sharedNetwork: input.sharedNetwork,
		surface: 'quick_match',
		requiresAuthenticatedSession: input.requiresAuthenticatedSession ?? true,
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

	return { kind: 'allowed', accountId: p2pAccess.accountId };
}

function readQuickMatchStarterClaimed(input: {
	readonly accountId: string | null;
	readonly sharedNetwork: boolean;
}): boolean {
	if (!input.sharedNetwork) return useStarterStore.getState().hasClaimed(input.accountId);
	return Boolean(input.accountId && useStarterStore.getState().hasClaimed(input.accountId));
}

function unsignedQueueBody(input: {
	readonly peerId: string;
	readonly accountId: string;
	readonly starterClaimed: boolean;
}): Record<string, unknown> {
	return {
		peerId: input.peerId,
		username: input.accountId,
		starterClaimed: input.starterClaimed,
	};
}

type MatchmakingDelegationBuildResult = Readonly<{
	delegation: MatchmakingDelegationProof;
	ephemeralKey: Awaited<ReturnType<typeof generateEphemeralSigningKey>>;
}>;

export async function buildMatchmakingDelegation(input: {
	readonly peerId: string;
	readonly accountId: string;
	readonly rulesetHash: string;
	readonly engineHash: string;
}): Promise<MatchmakingDelegationBuildResult> {
	const ephemeralKey = await generateEphemeralSigningKey();
	const challengeResponse = await fetch(`${getMatchmakingApiBase()}/api/matchmaking/delegation-challenge`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({
			account: input.accountId,
			peerId: input.peerId,
			rulesetHash: input.rulesetHash,
			engineHash: input.engineHash,
		}),
	});
	if (!challengeResponse.ok) throw new Error(`Matchmaking authorization challenge rejected: ${await readMatchmakingError(challengeResponse)}`);
	const challengePayload: unknown = await challengeResponse.json();
	const challenge = isRecord(challengePayload)
		? readMatchmakingDelegationChallenge(challengePayload.challenge)
		: null;
	if (!challenge) throw new Error('Matchmaking server returned an invalid authorization challenge');
	const delegation = {
		...challenge,
		ephemeralPubkey: ephemeralKey.pubkey,
	};
	const signed = await invokeClientWalletAction(
		{ kind: 'p2p_matchmaking_delegation', authority: 'Posting', label: 'Find opponent' },
		() => signHiveMessage(buildMatchmakingDelegationMessage(delegation), {
			username: input.accountId,
			title: 'Ragnarok: find opponent',
		}),
	);
	if (!signed.success || !signed.signature) {
		throw new Error(getHiveKeychainError({ success: false, error: signed.error }, 'Matchmaking authorization signature rejected.'));
	}
	return {
		delegation: { ...delegation, hiveSig: signed.signature },
		ephemeralKey,
	};
}

export async function buildQuickMatchQueueBody(input: {
	readonly peerId: string;
	readonly searchIntentId: string;
	readonly accountId: string | null;
	readonly sharedNetwork: boolean;
	readonly starterClaimed: boolean;
	readonly walletAuthMode?: 'unsigned-local' | 'hive-body-auth';
	readonly delegation?: MatchmakingDelegationProof;
}): Promise<QueueBodyBuildResult> {
	void input.walletAuthMode;
	if (input.sharedNetwork && !input.accountId) {
		return { ok: false, message: 'Hive account required before entering matchmaking.' };
	}
	if (input.accountId) {
		return {
			ok: true,
			body: {
				searchIntentId: input.searchIntentId,
				...unsignedQueueBody({
					peerId: input.peerId,
					accountId: input.accountId,
					starterClaimed: input.starterClaimed,
				}),
				...(input.delegation ? { delegation: input.delegation } : {}),
			},
		};
	}
	return { ok: true, body: { peerId: input.peerId, searchIntentId: input.searchIntentId } };
}

export function buildMatchAcceptance(input: {
	readonly offer: MatchOffer;
	readonly peerId: string;
	readonly account?: string | null;
	readonly ephemeralPubkey: string;
	readonly rulesetHash: string;
	readonly engineHash: string;
}): MatchAcceptanceV1 {
	return {
		protocol: 'ragnarok-match-accept-v1',
		offerId: input.offer.offerId,
		matchId: input.offer.matchId,
		...(input.account ? { account: input.account } : {}),
		peerId: input.peerId,
		...(input.offer.opponent.username ? { opponentAccount: input.offer.opponent.username } : {}),
		opponentPeerId: input.offer.opponent.peerId,
		ephemeralPubkey: input.ephemeralPubkey,
		rulesetHash: input.rulesetHash,
		engineHash: input.engineHash,
		serverNonce: input.offer.serverNonce,
		expiresAt: input.offer.expiresAt,
	};
}

async function readSharedNetworkStarterReceiptError(input: {
	readonly sharedNetwork: boolean;
	readonly accountId: string | null;
}): Promise<string | null> {
	if (!input.sharedNetwork || !input.accountId) return null;
	return await hasSharedNetworkStarterClaimReceipt(input.accountId)
		? null
		: 'Complete the starter claim before searching for a PvP opponent.';
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

function applyReadyMatchmakingPayload(data: Record<string, unknown>, actions: MatchmakingActions): void {
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
	actions.setOffer?.(null);
	actions.setMatchCommitted?.(true);
	actions.setStatus('ready');
	actions.setOpponent(data.opponentPeerId, data.isHost);
	if (typeof data.matchId === 'string') actions.setRoomId(data.matchId);
	actions.setQueuePosition(null);
}

function applyOfferedMatchmakingPayload(
	data: Record<string, unknown>,
	fallbackQueueToken: string | null,
	actions: MatchmakingActions,
): void {
	const offer = readMatchOffer(data.offer);
	if (!offer) {
		const rawOffer = isRecord(data.offer) ? data.offer : null;
		debug.warn('[useMatchmaking] server offer rejected by client parser', {
			rawType: typeof data.offer,
			keys: rawOffer ? Object.keys(rawOffer).sort() : [],
			protocol: rawOffer?.protocol,
			matchIdLength: typeof rawOffer?.matchId === 'string' ? rawOffer.matchId.length : null,
			playerPeerIdLength: isRecord(rawOffer?.player) && typeof rawOffer.player.peerId === 'string' ? rawOffer.player.peerId.length : null,
			opponentPeerIdLength: isRecord(rawOffer?.opponent) && typeof rawOffer.opponent.peerId === 'string' ? rawOffer.opponent.peerId.length : null,
		});
		throw new Error('Matchmaking server did not return a valid match offer');
	}
	const offeredToken = typeof data.queueToken === 'string' && data.queueToken.length > 0
		? data.queueToken
		: fallbackQueueToken;
	if (!offeredToken) throw new Error('Matchmaking server did not return a queue token');
	actions.setQueueToken(offeredToken);
	actions.setOffer?.(offer);
	actions.setMatchCommitted?.(false);
	actions.setOpponent(offer.opponent.peerId, null);
	actions.setRoomId(offer.matchId);
	actions.setQueuePosition(null);
	actions.setStatus('offered');
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
	actions.setStatus('queued');
}

export function isMatchOfferForPeer(offer: MatchOffer, peerId: string): boolean {
	// Offer freshness is server authority. The status/accept endpoints reject an
	// expired offer; comparing against the browser wall clock here can reject a
	// valid offer when client and server clocks differ.
	return offer.player.peerId === peerId;
}

export function failQueuedStatus(message: string, actions: MatchmakingActions): void {
	clearServerStatusPoller();
	usePeerStore.getState().clearMatchChallenges();
	clearCachedMatchAcceptance();
	actions.setQueueToken(null);
	actions.setQueuePosition(null);
	actions.setOpponent(null, null);
	actions.setRoomId(null);
	actions.setOffer?.(null);
	actions.setMatchCommitted?.(false);
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
		credentials: 'include',
		cache: 'no-store',
	});
	// Older proxies may still answer a conditional poll with 304. The state is
	// unchanged, so keep the current offer/token and let the next poll continue.
	if (statusResponse.status === 304) return;
	if (!statusResponse.ok) {
		const serverError = await readMatchmakingError(statusResponse);
		throw new Error(`Matchmaking status rejected: ${serverError}`);
	}
	const statusData: unknown = await statusResponse.json();
	if (!isRecord(statusData) || statusData.success !== true) return;

	if (statusData.status === 'offered' || statusData.status === 'waiting_opponent') {
		applyOfferedMatchmakingPayload(statusData, activeQueueToken, actions);
		if (statusData.status === 'waiting_opponent') actions.setStatus('waiting_opponent');
		return;
	}
	if (statusData.status === 'ready') {
		applyReadyMatchmakingPayload(statusData, actions);
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
		error,
		offer,
		matchCommitted,
		setStatus,
		setQueuePosition,
		setOpponent,
		setRoomId,
		setQueueToken,
		setError,
		setOffer,
		setMatchCommitted,
		reset,
	} = useMatchmakingStore();

	const joinQueue = useCallback((): Promise<boolean> => runQuickMatchSingleFlight(async (searchIntentId) => {
		clearServerStatusPoller();
		const failJoin = (message: string) => {
			clearServerStatusPoller();
			usePeerStore.getState().clearMatchChallenges();
			clearCachedMatchAcceptance();
			setQueueToken(null);
			setError(message);
			setStatus('error');
			setQueuePosition(null);
			setOpponent(null, null);
			setRoomId(null);
			setOffer(null);
			setMatchCommitted(false);
			return false;
		};

		usePeerStore.getState().clearMatchChallenges();

		const peerId = usePeerStore.getState().myPeerId;
		if (!peerId) {
			return failJoin('No peer ID available');
		}

		try {
			setStatus('authorizing');
			setError(null);

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
				hiveWalletAvailable: true,
				requiresAuthenticatedSession: false,
			});
			if (p2pAccess.kind === 'blocked') {
				return failJoin(p2pAccess.message);
			}
			const starterReceiptError = await readSharedNetworkStarterReceiptError({
				sharedNetwork,
				accountId: p2pAccess.accountId,
			});
			if (starterReceiptError) return failJoin(starterReceiptError);

			let delegation: MatchmakingDelegationProof | undefined;
			if (sharedNetwork && p2pAccess.accountId) {
				await loadWasmEngine();
				const [rulesetHash] = await Promise.all([getCardRegistryHash()]);
				const cachedDelegation = getCachedMatchmakingDelegation();
				const cachedIsReusable = cachedDelegation
					&& cachedDelegation.delegation.account === p2pAccess.accountId
					&& cachedDelegation.delegation.peerId === peerId
					&& cachedDelegation.delegation.rulesetHash === rulesetHash
					&& cachedDelegation.delegation.engineHash === getWasmHash()
					&& cachedDelegation.delegation.expiresAt > Date.now();
				if (cachedIsReusable) {
					delegation = cachedDelegation.delegation;
				} else {
					const built = await buildMatchmakingDelegation({
						peerId,
						accountId: p2pAccess.accountId,
						rulesetHash,
						engineHash: getWasmHash(),
					});
					delegation = built.delegation;
					cacheMatchmakingDelegation(built);
				}
			}

			const queueBodyResult = await buildQuickMatchQueueBody({
				peerId,
				searchIntentId,
				accountId: p2pAccess.accountId,
				sharedNetwork,
				starterClaimed,
				delegation,
			});
			if (!queueBodyResult.ok) return failJoin(queueBodyResult.message);

			const existingQueueToken = useMatchmakingStore.getState().queueToken;
			const response = await fetch(`${getMatchmakingApiBase()}/api/matchmaking/queue`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(existingQueueToken ? { 'x-p2p-queue-token': existingQueueToken } : {}),
				},
				credentials: 'include',
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

			const actions: MatchmakingActions = {
				setStatus,
				setQueuePosition,
				setOpponent,
				setRoomId,
				setQueueToken,
				setError,
				setOffer,
				setMatchCommitted,
			};
			const fallbackQueueToken = useMatchmakingStore.getState().queueToken;
			if (data.status === 'offered') {
				applyOfferedMatchmakingPayload(data, fallbackQueueToken, actions);
			} else if (data.status === 'ready') {
				applyReadyMatchmakingPayload(data, actions);
				clearServerStatusPoller();
				return true;
			} else {
				applyQueuedMatchmakingPayload(data, fallbackQueueToken, actions);
			}
			startServerStatusPoller(actions);

			return true;
		} catch (err: unknown) {
			return failJoin(err instanceof Error ? err.message : 'Failed to join matchmaking queue');
		}
	}), [hiveUsername, setStatus, setError, setQueuePosition, setOpponent, setRoomId, setQueueToken, setOffer, setMatchCommitted]);

	const acceptOffer = useCallback(async (): Promise<boolean> => {
		const currentOffer = useMatchmakingStore.getState().offer ?? offer;
		const peerId = usePeerStore.getState().myPeerId;
		if (!currentOffer || !peerId || !isMatchOfferForPeer(currentOffer, peerId)) {
			setError('This match offer is no longer available.');
			return false;
		}

		setStatus('accepting');
		setError(null);
		// The offer remains authoritative while the proof is being prepared.
		// Polling it as if the client were still idle can clear the offer during
		// WASM/hash preparation and race the Accept request with expiry cleanup.
		clearServerStatusPoller();
		try {
			const cached = getCachedMatchAcceptance();
			const cachedForOffer = cached
				&& cached.offer.offerId === currentOffer.offerId
				&& cached.offer.matchId === currentOffer.matchId
				? cached
				: null;
			let proof: MatchAcceptanceProof;
			if (cachedForOffer) {
				// A lost HTTP response must be retryable without opening Keychain a
				// second time. The proof and ephemeral key are bound to this offer.
				proof = cachedForOffer.proof;
			} else {
				await loadWasmEngine();
				const [rulesetHash] = await Promise.all([getCardRegistryHash()]);
				const account = getAuthenticatedHiveUsername() ?? hiveUsername ?? undefined;
				if (isSharedNetworkEnvironment()) {
					const delegation = getCachedMatchmakingDelegation();
					if (!delegation || delegation.delegation.expiresAt <= Date.now()) {
						throw new Error('Matchmaking authorization expired; search again to accept this offer.');
					}
					if (delegation.delegation.account !== account || delegation.delegation.rulesetHash !== rulesetHash || delegation.delegation.engineHash !== getWasmHash()) {
						throw new Error('Matchmaking authorization no longer matches this client. Search again.');
					}
					const sessionKey = bindSessionKey(delegation.ephemeralKey, currentOffer.matchId);
					const acceptance = {
						...buildMatchAcceptance({
							offer: currentOffer,
							peerId,
							account: delegation.delegation.account,
							ephemeralPubkey: sessionKey.pubkey,
							rulesetHash,
							engineHash: getWasmHash(),
						}),
						protocol: 'ragnarok-match-accept-v2' as const,
						delegationId: delegation.delegation.delegationId,
					};
					const sessionSig = await sessionKey.sign(new TextEncoder().encode(buildMatchAcceptanceV2Message(acceptance)));
					proof = { ...acceptance, sessionSig };
					cacheMatchAcceptance({ offer: currentOffer, proof, sessionKey });
				} else {
					const sessionKey = await generateSessionKey(currentOffer.matchId);
					proof = buildMatchAcceptance({
						offer: currentOffer,
						peerId,
						account,
						ephemeralPubkey: sessionKey.pubkey,
						rulesetHash,
						engineHash: getWasmHash(),
					});
					cacheMatchAcceptance({ offer: currentOffer, proof, sessionKey });
				}
			}
			const response = await fetch(`${getMatchmakingApiBase()}/api/matchmaking/accept`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(useMatchmakingStore.getState().queueToken ? { 'x-p2p-queue-token': useMatchmakingStore.getState().queueToken as string } : {}),
				},
				credentials: 'include',
				body: JSON.stringify({ peerId, offerId: currentOffer.offerId, acceptance: proof }),
			});
			if (!response.ok) throw new Error(`Match acceptance rejected: ${await readMatchmakingError(response)}`);
			const data: unknown = await response.json();
			if (!isRecord(data) || data.success !== true) throw new Error('Match acceptance failed.');
			if (data.status === 'ready') {
				applyReadyMatchmakingPayload(data, {
					setStatus, setQueuePosition, setOpponent, setRoomId, setQueueToken, setError, setOffer, setMatchCommitted,
				});
				return true;
			}
			if (data.status !== 'waiting_opponent') throw new Error('Unexpected match acceptance status.');
			applyOfferedMatchmakingPayload(data, useMatchmakingStore.getState().queueToken, {
				setStatus, setQueuePosition, setOpponent, setRoomId, setQueueToken, setError, setOffer, setMatchCommitted,
			});
			setStatus('waiting_opponent');
			startServerStatusPoller({
				setStatus, setQueuePosition, setOpponent, setRoomId, setQueueToken, setError, setOffer, setMatchCommitted,
			});
			return true;
		} catch (err: unknown) {
			const cachedAfterFailure = getCachedMatchAcceptance();
			if (!cachedAfterFailure || cachedAfterFailure.offer.offerId !== currentOffer.offerId) {
				clearCachedMatchAcceptance();
			}
			setStatus('offered');
			setError(err instanceof Error ? err.message : 'Could not accept this match.');
			return false;
		}
	}, [offer, hiveUsername, setStatus, setError, setQueuePosition, setOpponent, setRoomId, setQueueToken, setOffer, setMatchCommitted]);

	const declineOffer = useCallback(async (): Promise<void> => {
		const currentOffer = useMatchmakingStore.getState().offer ?? offer;
		const peerId = usePeerStore.getState().myPeerId;
		if (currentOffer && peerId) {
			await fetch(`${getMatchmakingApiBase()}/api/matchmaking/decline`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(useMatchmakingStore.getState().queueToken ? { 'x-p2p-queue-token': useMatchmakingStore.getState().queueToken as string } : {}),
				},
				credentials: 'include',
				body: JSON.stringify({ peerId, offerId: currentOffer.offerId }),
			}).catch((err: unknown) => debug.warn('[useMatchmaking] decline failed:', err));
		}
		clearCachedMatchAcceptance();
		clearCachedMatchmakingDelegation();
		reset();
	}, [offer, reset]);

	const leaveQueue = useCallback(async () => {
		const peerId = usePeerStore.getState().myPeerId;
		usePeerStore.getState().clearMatchChallenges();
		clearCachedMatchAcceptance();
		clearCachedMatchmakingDelegation();
		clearServerStatusPoller();
		const pendingJoin = quickMatchInFlight?.promise;
		if (pendingJoin) await pendingJoin.catch(() => false);

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
				credentials: 'include',
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
		offer,
		matchCommitted,
		joinQueue,
		acceptOffer,
		declineOffer,
		leaveQueue,
	};
}
