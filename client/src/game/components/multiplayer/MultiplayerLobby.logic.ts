import type { OutgoingFriendChallenge } from '../../stores/friendStore';
import type { MatchmakingStatus } from '../../stores/matchmakingStore';
import type { P2PConnectionState } from '../../stores/peerStore';
import type { ArmySelection } from '../../types/ChessTypes';
import { computeP2PBattleReadiness } from '../../match/p2pBattleReadiness';
import { resolveProtectedFlowAccess } from '../../auth/protectedFlowAccess';
import type { MatchOffer } from '@shared/p2pMatchAcceptance';
import { readChallengeSendResponse, type P2PMatchTicket, type ServerSignedChallenge } from '@shared/p2pAvailability';

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

export type DirectChallengeRoomCandidate = {
	readonly expiresAt: number;
	readonly matchTicket?: P2PMatchTicket | null;
};

export type DirectChallengeRoomAccess =
	| { readonly ok: true }
	| { readonly ok: false; readonly reason: 'busy' | 'expired' | 'missing_relay_ticket' | 'protected_flow'; readonly message?: string };

export type DirectChallengeAccessContext = {
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

export function getDirectChallengeRoomAccessFor(
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

export function getDirectChallengeBlockCopy(access: DirectChallengeRoomAccess): string | null {
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

export type LobbyProgressStep = 'find' | 'authorize' | 'connect';

export function resolveLobbyProgressStep(input: {
	readonly matchmakingStatus: MatchmakingStatus;
	readonly connectionState: P2PConnectionState;
	readonly matchCommitted: boolean;
	readonly matchOffer: MatchOffer | null;
	readonly battleReady: boolean;
}): number {
	if (input.battleReady) return 3;
	if (input.connectionState === 'connected' || input.matchmakingStatus === 'connecting') return 2;
	if (input.matchOffer || input.matchCommitted || input.matchmakingStatus === 'authorizing' || input.matchmakingStatus === 'accepting') return 1;
	return 0;
}

export function getLobbyProgressCopy(step: number, hasOffer: boolean): { readonly eyebrow: string; readonly title: string; readonly detail: string } {
	if (step >= 3) {
		return { eyebrow: 'Room sealed', title: 'Battle ready', detail: 'Entering now.' };
	}
	if (step === 2) {
		return { eyebrow: 'Link established', title: 'Preparing battle', detail: 'Checking shared state.' };
	}
	if (step === 1 || hasOffer) {
		return { eyebrow: 'Opponent found', title: 'Authorize match', detail: 'Accept to continue.' };
	}
	return { eyebrow: 'Gameplay-only P2P', title: 'Choose battle', detail: 'Find a peer.' };
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
			title: 'Reconnecting',
			detail: `${attempt}${countdown}`,
		};
	}
	if (input.connectionState !== 'connected') {
		return {
			ready: false,
			title: 'Connecting',
			detail: 'Waiting for peer.',
		};
	}
	if (!input.opponentArmy) {
		return {
			ready: false,
			title: 'Connected',
			detail: 'Waiting for loadout.',
		};
	}
	if (!input.p2pInitApplied) {
		return {
			ready: false,
			title: 'Syncing',
			detail: 'Preparing match.',
		};
	}
	return {
		ready: true,
		title: 'Ready',
		detail: 'Starting.',
	};
}

export type QuickMatchLobbyReadinessInput = {
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
