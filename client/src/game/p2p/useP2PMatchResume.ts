import { useEffect, useRef, useState } from 'react';

import { debug } from '../config/debugConfig';
import { usePeerStore } from '../stores/peerStore';
import { useGameStore } from '../stores/gameStore';
import {
	clearP2PMatchResume,
	loadP2PMatchResume,
	saveP2PMatchResume,
} from './p2pMatchResume';
import { applyP2PMatchResume, collectP2PMatchResume } from './p2pMatchResumeBridge';

export type P2PResumeBoot = 'checking' | 'none' | 'applied';

export function useP2PMatchResume(account: string | null): P2PResumeBoot {
	const [boot, setBoot] = useState<P2PResumeBoot>('checking');
	const persistTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const p2pInitApplied = usePeerStore((s) => s.p2pInitApplied);
	const gamePhase = useGameStore((s) => s.gameState?.gamePhase ?? null);

	useEffect(() => {
		if (!account) {
			setBoot('none');
			return;
		}
		let cancelled = false;
		void loadP2PMatchResume(account).then((record) => {
			if (cancelled) return;
			if (!record) {
				setBoot('none');
				return;
			}
			try {
				if (!applyP2PMatchResume(record)) {
					debug.warn('[p2pResume] Refused snapshot that failed seal or rewind checks');
					void clearP2PMatchResume();
					setBoot('none');
					return;
				}
				usePeerStore.getState().rejoinPersistedRoom(record.roomId);
				setBoot('applied');
				debug.log('[p2pResume] Restored local match snapshot', {
					matchId: record.matchId,
					roomId: record.roomId.slice(0, 16),
				});
			} catch (error) {
				debug.warn('[p2pResume] Failed to apply snapshot', error);
				void clearP2PMatchResume();
				setBoot('none');
			}
		});
		return () => {
			cancelled = true;
		};
	}, [account]);

	useEffect(() => {
		if (boot === 'checking') return;
		if (!p2pInitApplied) return;
		if (gamePhase === 'game_over' || gamePhase === 'ended') {
			void clearP2PMatchResume();
			return;
		}
		const persist = (): void => {
			const record = collectP2PMatchResume();
			if (!record) return;
			void saveP2PMatchResume(record);
		};

		persist();
		if (persistTimerRef.current) clearInterval(persistTimerRef.current);
		persistTimerRef.current = setInterval(persist, 2500);
		window.addEventListener('pagehide', persist);
		return () => {
			if (persistTimerRef.current) clearInterval(persistTimerRef.current);
			window.removeEventListener('pagehide', persist);
		};
	}, [boot, p2pInitApplied, gamePhase]);

	return boot;
}
