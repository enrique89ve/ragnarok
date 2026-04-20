/**
 * NFT Bridge React Hooks
 *
 * Thin hooks for components that just need to read NFT state.
 * Import these instead of useHiveDataStore directly.
 */

import { useSyncExternalStore } from 'react';
import type { HiveCardAsset, HivePlayerStats, HiveTokenBalance } from '@/data/schemas/HiveTypes';
import { getNFTBridge } from './index';

function subscribe(callback: () => void): () => void {
	const interval = setInterval(callback, 1000);
	return () => clearInterval(interval);
}

export function useNFTUsername(): string | null {
	return useSyncExternalStore(
		subscribe,
		() => getNFTBridge().getUsername(),
	);
}

export function useNFTCollection(): HiveCardAsset[] {
	return useSyncExternalStore(
		subscribe,
		() => getNFTBridge().getCardCollection(),
	);
}

export function useNFTStats(): HivePlayerStats | null {
	return useSyncExternalStore(
		subscribe,
		() => getNFTBridge().getStats(),
	);
}

export function useNFTTokenBalance(): HiveTokenBalance | null {
	return useSyncExternalStore(
		subscribe,
		() => getNFTBridge().getTokenBalance(),
	);
}

export function useIsHiveMode(): boolean {
	return getNFTBridge().isHiveMode();
}

export function useNFTElo(): number {
	return useSyncExternalStore(
		subscribe,
		() => getNFTBridge().getElo(),
	);
}
