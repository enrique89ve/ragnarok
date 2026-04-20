/**
 * NFT Bridge — Factory + Public API
 *
 * Game code imports { getNFTBridge } from '@/game/nft' to access NFT operations.
 * The bridge is initialized at app startup via initializeNFTBridge().
 *
 * In hive mode:  HiveNFTBridge (delegates to HiveSync, HiveEvents, replayEngine)
 * In local mode: LocalNFTBridge (localStorage-only, chain ops are no-ops)
 */

import type { INFTBridge } from './INFTBridge';
import { getDataLayerMode } from '@/game/config/featureFlags';
import { LocalNFTBridge } from './LocalNFTBridge';

let bridge: INFTBridge = new LocalNFTBridge();

export function getNFTBridge(): INFTBridge {
	return bridge;
}

export async function initializeNFTBridge(): Promise<INFTBridge> {
	const mode = getDataLayerMode();

	if (mode === 'hive') {
		const { HiveNFTBridge } = await import('./HiveNFTBridge');
		bridge = new HiveNFTBridge();
	} else {
		bridge = new LocalNFTBridge();
	}

	return bridge;
}

export function setBridge(b: INFTBridge): void {
	bridge = b;
}

export type { INFTBridge } from './INFTBridge';
export type {
	DataLayerMode,
	BroadcastResult,
	AuthBody,
	NFTEventType,
	NFTEventCallback,
} from './INFTBridge';
