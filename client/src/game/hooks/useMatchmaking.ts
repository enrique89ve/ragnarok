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
		const failJoin = (message: string) => {
			setError(message);
			setStatus('error');
			setQueuePosition(null);
			return false;
		};

		const peerId = usePeerStore.getState().myPeerId;
		if (!peerId) {
			return failJoin('No peer ID available');
		}

		try {
			setStatus('queued');
			setError(null);

			const nftBridge = getNFTBridge();
			if (nftBridge.isHiveMode() && !hiveUsername) {
				return failJoin('Connect Hive Keychain before entering testnet matchmaking.');
			}

			if (nftBridge.isHiveMode() && hiveUsername) {
				const elo = nftBridge.getElo();

				const leaveFn = await broadcastQueueJoin({
					account: hiveUsername,
					mode: 'ranked',
					elo,
					peerId,
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
				return true;
			}

			const queueBody = hiveUsername
				? await nftBridge.buildAuthBody(hiveUsername, 'queue', { peerId, username: hiveUsername })
				: { peerId, username: hiveUsername };
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
				return true;
			}

			setQueuePosition(data.position || null);

			const interval = window.setInterval(async () => {
				try {
					const currentPeerId = usePeerStore.getState().myPeerId;
					if (!currentPeerId) {
						if (pollIntervalRef.current) {
							clearInterval(pollIntervalRef.current);
							pollIntervalRef.current = null;
						}
						setError('Peer connection closed while searching');
						setStatus('error');
						return;
					}

					const statusResponse = await fetch(`${API_BASE}/api/matchmaking/status/${currentPeerId}`);
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
			return true;
		} catch (err: unknown) {
			return failJoin(err instanceof Error ? err.message : 'Failed to join matchmaking queue');
		}
	}, [hiveUsername, setStatus, setError, setQueuePosition, setOpponent]);

	const leaveQueue = useCallback(async () => {
		const peerId = usePeerStore.getState().myPeerId;

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

		if (!peerId) {
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
					body: JSON.stringify({ peerId }),
				});
			} catch (err) {
				debug.error('[useMatchmaking] Failed to leave queue:', err);
			}
		}

		reset();
	}, [reset]);

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
