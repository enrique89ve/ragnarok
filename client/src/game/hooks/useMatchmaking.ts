import { useEffect, useRef, useCallback } from 'react';
import { useMatchmakingStore } from '../stores/matchmakingStore';
import { usePeerStore } from '../stores/peerStore';
import { getNFTBridge } from '../nft';
import { useNFTUsername } from '../nft/hooks';
import { debug } from '../config/debugConfig';
import {
	broadcastQueueJoin,
	broadcastQueueLeave,
	startQueuePoller,
} from '../../data/blockchain/matchmakingOnChain';

const API_BASE = import.meta.env.VITE_API_URL || (window.location.origin);

export function useMatchmaking() {
	const { myPeerId } = usePeerStore();
	const hiveUsername = useNFTUsername();
	const {
		status,
		queuePosition,
		opponentPeerId,
		isHost,
		error,
		setStatus,
		setQueuePosition,
		setOpponent,
		setError,
		reset,
	} = useMatchmakingStore();

	const pollIntervalRef = useRef<number | null>(null);
	const chainPollerCancelRef = useRef<(() => void) | null>(null);
	const chainLeaveFnRef = useRef<(() => Promise<void>) | null>(null);

	const joinQueue = useCallback(async () => {
		if (!myPeerId) {
			setError('No peer ID available');
			return;
		}

		try {
			setStatus('queued');
			setError(null);

			if (getNFTBridge().isHiveMode() && hiveUsername) {
				const elo = getNFTBridge().getElo();

				const leaveFn = await broadcastQueueJoin({
					account: hiveUsername,
					mode: 'ranked',
					elo,
					peerId: myPeerId,
					deckHash: '',
				});
				chainLeaveFnRef.current = leaveFn;

				const cancelPoller = startQueuePoller(
					hiveUsername,
					'ranked',
					elo,
					(match) => {
						setStatus('matched');
						setOpponent(match.peerId, true);
						setQueuePosition(null);
						chainPollerCancelRef.current = null;
					},
				);
				chainPollerCancelRef.current = cancelPoller;
				return;
			}

			const queueBody = hiveUsername
				? await getNFTBridge().buildAuthBody(hiveUsername, 'queue', { peerId: myPeerId, username: hiveUsername })
				: { peerId: myPeerId, username: hiveUsername };
			const response = await fetch(`${API_BASE}/api/matchmaking/queue`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(queueBody),
			}).catch(() => {
				throw new Error('Matchmaking service unavailable. Please use manual match.');
			});

			if (!response.ok) {
				throw new Error('Matchmaking service unavailable. Please use manual match.');
			}

			const data = await response.json();

			if (!data.success) {
				throw new Error(data.error || 'Failed to join queue');
			}

			if (data.status === 'matched') {
				setStatus('matched');
				setOpponent(data.opponentPeerId, data.isHost);
				setQueuePosition(null);
				return;
			}

			setQueuePosition(data.position || null);

			const interval = window.setInterval(async () => {
				try {
					const statusResponse = await fetch(`${API_BASE}/api/matchmaking/status/${myPeerId}`);
					if (!statusResponse.ok) return;
					const statusData = await statusResponse.json();

					if (statusData.success && statusData.status === 'matched') {
						setStatus('matched');
						setOpponent(statusData.opponentPeerId, statusData.isHost);
						setQueuePosition(null);
						if (pollIntervalRef.current) {
							clearInterval(pollIntervalRef.current);
							pollIntervalRef.current = null;
						}
					} else if (statusData.success && statusData.status === 'queued') {
						setQueuePosition(statusData.position || null);
					}
				} catch {
					// Server unavailable — stop polling
					if (pollIntervalRef.current) {
						clearInterval(pollIntervalRef.current);
						pollIntervalRef.current = null;
					}
					setError('Matchmaking server unavailable');
					setStatus('error');
				}
			}, 2000);

			pollIntervalRef.current = interval;
		} catch (err: any) {
			setError(err.message || 'Failed to join matchmaking queue');
			setStatus('error');
		}
	}, [myPeerId, hiveUsername, setStatus, setError, setQueuePosition, setOpponent]);

	const leaveQueue = useCallback(async () => {
		if (chainPollerCancelRef.current) {
			chainPollerCancelRef.current();
			chainPollerCancelRef.current = null;
		}

		if (chainLeaveFnRef.current) {
			try {
				await chainLeaveFnRef.current();
			} catch (err) {
				debug.error('[useMatchmaking] Failed to leave on-chain queue:', err);
			}
			chainLeaveFnRef.current = null;
		}

		if (!myPeerId) {
			reset();
			return;
		}

		if (pollIntervalRef.current) {
			clearInterval(pollIntervalRef.current);
			pollIntervalRef.current = null;
		}

		if (!getNFTBridge().isHiveMode()) {
			try {
				await fetch(`${API_BASE}/api/matchmaking/leave`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ peerId: myPeerId }),
				});
			} catch (err) {
				debug.error('[useMatchmaking] Failed to leave queue:', err);
			}
		}

		reset();
	}, [myPeerId, reset]);

	useEffect(() => {
		return () => {
			if (pollIntervalRef.current) {
				clearInterval(pollIntervalRef.current);
			}
			if (chainPollerCancelRef.current) {
				chainPollerCancelRef.current();
			}
		};
	}, []);

	return {
		status,
		queuePosition,
		opponentPeerId,
		isHost,
		error,
		joinQueue,
		leaveQueue,
	};
}
