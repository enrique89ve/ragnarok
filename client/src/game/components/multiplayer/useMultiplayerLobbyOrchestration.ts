import { useCallback, useEffect, useRef, useState } from 'react';
import type { MatchOffer } from '@shared/p2pMatchAcceptance';
import type { ServerSignedChallenge } from '@shared/p2pAvailability';
import type { OutgoingFriendChallenge } from '../../stores/friendStore';
import type { MatchmakingStatus } from '../../stores/matchmakingStore';
import type { P2PConnectionState } from '../../stores/peerStore';
import {
	DIRECT_CHALLENGE_POLL_MS,
	LOBBY_CLOCK_INTERVAL_MS,
	MATCH_START_DELAY_MS,
	shouldAutoAcceptQuickMatchOffer,
	shouldRunLobbyClock,
} from './MultiplayerLobby.logic';
import { pollIncomingChallenges } from './multiplayerChallengePoll';

export function usePageVisibility(): boolean {
	const [pageVisible, setPageVisible] = useState(
		() => typeof document === 'undefined' || document.visibilityState === 'visible',
	);

	useEffect(() => {
		const handleVisibilityChange = () => setPageVisible(document.visibilityState === 'visible');
		document.addEventListener('visibilitychange', handleVisibilityChange);
		return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
	}, []);

	return pageVisible;
}

export function useAutoAcceptQuickMatchOffer(input: {
	readonly matchmakingStatus: MatchmakingStatus;
	readonly matchOffer: MatchOffer | null;
	readonly pageVisible: boolean;
	readonly acceptOffer: () => void | Promise<unknown>;
}): void {
	const autoAcceptedOfferRef = useRef<string | null>(null);

	useEffect(() => {
		if (!shouldAutoAcceptQuickMatchOffer({
			status: input.matchmakingStatus,
			offer: input.matchOffer,
			pageVisible: input.pageVisible,
			searchIntentActive: input.matchmakingStatus !== 'idle' && input.matchmakingStatus !== 'error',
		}) || !input.matchOffer) return;
		if (autoAcceptedOfferRef.current === input.matchOffer.offerId) return;
		autoAcceptedOfferRef.current = input.matchOffer.offerId;
		void input.acceptOffer();
	}, [input.acceptOffer, input.matchOffer, input.matchmakingStatus, input.pageVisible]);
}

export function useIncomingChallengePoll(input: {
	readonly hiveUsername: string | null | undefined;
	readonly ensureSession: (normalizedUsername: string) => Promise<boolean>;
	readonly invalidateSession: () => void;
	readonly addChallenges: (challenges: readonly ServerSignedChallenge[]) => void;
	readonly clearChallenges: () => void;
	readonly clearOutgoingChallenge: () => void;
	readonly pruneExpiredChallenges: (now?: number) => void;
}): void {
	const fetchIncomingChallenges = useCallback(async (signal?: AbortSignal) => {
		if (!input.hiveUsername) return;
		try {
			await pollIncomingChallenges({
				username: input.hiveUsername,
				signal,
				callbacks: {
					onChallenges: (challenges) => {
						input.addChallenges(challenges);
						input.pruneExpiredChallenges();
					},
					onStarterGateBlocked: () => {
						input.clearChallenges();
						input.clearOutgoingChallenge();
					},
				},
				deps: {
					ensureSession: input.ensureSession,
					invalidateSession: input.invalidateSession,
				},
			});
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') return;
		}
	}, [
		input.hiveUsername,
		input.addChallenges,
		input.clearChallenges,
		input.clearOutgoingChallenge,
		input.pruneExpiredChallenges,
		input.ensureSession,
		input.invalidateSession,
	]);

	useEffect(() => {
		if (!input.hiveUsername) return undefined;
		const controller = new AbortController();
		void fetchIncomingChallenges(controller.signal);
		const interval = window.setInterval(() => {
			void fetchIncomingChallenges(controller.signal);
		}, DIRECT_CHALLENGE_POLL_MS);
		return () => {
			controller.abort();
			window.clearInterval(interval);
		};
	}, [input.hiveUsername, fetchIncomingChallenges]);
}

export function useLobbyClock(input: {
	readonly pendingChallengeCount: number;
	readonly outgoingChallenge: OutgoingFriendChallenge | null;
	readonly matchOffer: MatchOffer | null;
	readonly pruneExpiredChallenges: (now?: number) => void;
}): number {
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		if (!shouldRunLobbyClock({
			pendingChallengeCount: input.pendingChallengeCount,
			outgoingChallenge: input.outgoingChallenge,
			matchOffer: input.matchOffer,
		})) return undefined;
		const interval = window.setInterval(() => {
			const nextNow = Date.now();
			setNow(nextNow);
			input.pruneExpiredChallenges(nextNow);
		}, LOBBY_CLOCK_INTERVAL_MS);
		return () => window.clearInterval(interval);
	}, [
		input.pendingChallengeCount,
		input.outgoingChallenge,
		input.matchOffer,
		input.pruneExpiredChallenges,
	]);

	return now;
}

export function useMatchStartDelay(input: {
	readonly connectionState: P2PConnectionState;
	readonly myPeerId: string | null;
	readonly remotePeerId: string | null;
	readonly matchProgressReady: boolean;
	readonly onGameStart: () => void;
}): boolean {
	const [matchStarting, setMatchStarting] = useState(false);

	useEffect(() => {
		if (
			input.connectionState !== 'connected'
			|| !input.myPeerId
			|| !input.remotePeerId
			|| !input.matchProgressReady
		) {
			setMatchStarting(false);
			return;
		}
		setMatchStarting(true);
		const timer = setTimeout(() => {
			input.onGameStart();
		}, MATCH_START_DELAY_MS);
		return () => clearTimeout(timer);
	}, [
		input.connectionState,
		input.matchProgressReady,
		input.myPeerId,
		input.remotePeerId,
		input.onGameStart,
	]);

	return matchStarting;
}
