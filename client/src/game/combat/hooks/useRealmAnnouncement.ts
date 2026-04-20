import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';

export function useRealmAnnouncement() {
	const activeRealmId = useGameStore(state => state.gameState?.activeRealm?.id);
	const activeRealmName = useGameStore(state => state.gameState?.activeRealm?.name);
	const [realmAnnouncement, setRealmAnnouncement] = useState<string | null>(null);
	const prevRealmRef = useRef<string | undefined>(undefined);

	useEffect(() => {
		if (activeRealmId && activeRealmId !== prevRealmRef.current) {
			const isShift = prevRealmRef.current !== undefined;
			prevRealmRef.current = activeRealmId;
			if (isShift) {
				setRealmAnnouncement(activeRealmName || activeRealmId);
				const timer = setTimeout(() => setRealmAnnouncement(null), 2500);
				return () => clearTimeout(timer);
			}
		} else if (!activeRealmId && prevRealmRef.current) {
			prevRealmRef.current = undefined;
		}
		return undefined;
	}, [activeRealmId, activeRealmName]);

	// IMPORTANT: do NOT default to 'realm-midgard' when no campaign realm is set.
	// PvP / play / dev test have no activeRealm, and the realm-midgard CSS uses
	// !important on its background, which would clobber the default arena
	// background defined in GameViewport.css. Returning '' lets the base
	// .game-viewport rule win in non-campaign matches. Campaign missions that
	// want Midgard still get it via gameState.activeRealm.id === 'midgard'.
	const realmClass = activeRealmId ? `realm-${activeRealmId}` : '';

	return { realmAnnouncement, realmClass, activeRealmId, activeRealmName };
}
