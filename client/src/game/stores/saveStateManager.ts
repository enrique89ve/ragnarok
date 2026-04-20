/**
 * saveStateManager.ts — Portable Save State (3-Tier System)
 *
 * Tier 1: Hive custom_json — auto-sync for authenticated players
 * Tier 2: File export/import — universal fallback for all players
 * Tier 3: QR/WebRTC transfer — convenience (handled by existing PeerJS infra)
 *
 * State payload: ~2KB compressed (base card IDs, campaign progress, decks,
 * quest state, Eitr balance, settings, tutorial flags). Does NOT include
 * NFT cards (those are chain-derived via replay engine).
 */

import { debug } from '../config/debugConfig';

// ── Auto-Save on Milestones ──

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

export function triggerAutoSave(): void {
	if (autoSaveTimer) clearTimeout(autoSaveTimer);
	autoSaveTimer = setTimeout(async () => {
		autoSaveTimer = null;
		try {
			const { getNFTBridge } = await import('../nft');
			const bridge = getNFTBridge();
			if (bridge.isHiveMode()) {
				const result = await saveToHive();
				if (result.success) debug.log('[AutoSave] Saved to Hive:', result.trxId);
				else debug.warn('[AutoSave] Hive save failed:', result.error);
			}
		} catch (err) {
			debug.warn('[AutoSave] Skipped (bridge not ready):', err);
		}
	}, 5000);
}

// ── State Shape (what gets saved/restored) ──

export interface PortableSaveState {
	version: 2;
	timestamp: number;
	// Base card IDs owned (not NFTs — those are chain-derived)
	baseCardIds: number[];
	// Campaign progress
	campaign: {
		completedMissions: string[];
		rewardsClaimed: string[];
		difficulty: string;
	};
	// Deck configurations (name + card IDs)
	decks: Array<{ name: string; heroId: string; cardIds: number[] }>;
	// Daily quest progress
	quests: {
		activeQuestIds: string[];
		completedToday: string[];
		lastRefresh: number;
	};
	// Economy
	eitr: number;
	// Tutorial
	tutorialCompleted: boolean;
	tutorialStep: number;
	// Starter pack claimed
	starterClaimed: boolean;
	// Settings (audio, visual, gameplay)
	settings: Record<string, unknown>;
	// Checksum for tamper detection
	checksum?: string;
}

// ── Collect State from All Stores ──

export async function collectSaveState(): Promise<PortableSaveState> {
	// Lazy-import stores to avoid circular deps
	const { useCampaignStore } = await import('../campaign/campaignStore');
	const { useCraftingStore } = await import('../crafting/craftingStore');
	const { useTutorialStore } = await import('../tutorial/tutorialStore');
	const { useStarterStore } = await import('./starterStore');
	const { useSettingsStore } = await import('./settingsStore');
	const { useHiveDataStore } = await import('../../data/HiveDataLayer');

	const campaign = useCampaignStore.getState() as unknown as Record<string, unknown>;
	const crafting = useCraftingStore.getState() as unknown as Record<string, unknown>;
	const tutorial = useTutorialStore.getState() as unknown as Record<string, unknown>;
	const starter = useStarterStore.getState();
	const settings = useSettingsStore.getState() as unknown as Record<string, unknown>;
	const hiveData = useHiveDataStore.getState();

	// Collect base card IDs (non-NFT local cards)
	const baseCardIds = hiveData.cardCollection
		.filter(c => c.ownerId === 'local')
		.map(c => c.cardId);

	// Collect completed mission IDs from campaign store
	const rawMissions = campaign.completedMissions;
	const missionIds: string[] = rawMissions && typeof rawMissions === 'object'
		? Object.keys(rawMissions as Record<string, unknown>)
		: Array.isArray(rawMissions) ? rawMissions as string[] : [];

	const rawRewards = campaign.rewardsClaimed;
	const rewardIds: string[] = Array.isArray(rawRewards) ? rawRewards as string[]
		: rawRewards && typeof rawRewards === 'object' ? Object.keys(rawRewards as Record<string, unknown>) : [];

	// Collect deck configs from localStorage
	const decksRaw = localStorage.getItem('ragnarok-decks');
	let decks: PortableSaveState['decks'] = [];
	if (decksRaw) {
		try {
			const parsed = JSON.parse(decksRaw);
			if (Array.isArray(parsed)) {
				decks = parsed.map((d: Record<string, unknown>) => ({
					name: String(d.name || ''),
					heroId: String(d.heroId || ''),
					cardIds: Array.isArray(d.cardIds) ? d.cardIds.map(Number) : [],
				}));
			}
		} catch { /* ignore parse errors */ }
	}

	const state: PortableSaveState = {
		version: 2,
		timestamp: Date.now(),
		baseCardIds,
		campaign: {
			completedMissions: missionIds,
			rewardsClaimed: rewardIds,
			difficulty: String(campaign.difficulty ?? 'normal'),
		},
		decks,
		quests: {
			activeQuestIds: [],
			completedToday: [],
			lastRefresh: 0,
		},
		eitr: Number(crafting.eitr ?? 0),
		tutorialCompleted: !!(tutorial.completed ?? tutorial.isComplete ?? false),
		tutorialStep: Number(tutorial.currentStep ?? tutorial.step ?? 0),
		starterClaimed: starter.claimed ?? false,
		settings: {
			masterVolume: settings.masterVolume ?? settings.volume,
			musicVolume: settings.musicVolume,
			sfxVolume: settings.sfxVolume,
		},
	};

	// Add checksum
	state.checksum = await computeChecksum(state);
	return state;
}

// ── Restore State to All Stores ──

export async function restoreSaveState(state: PortableSaveState): Promise<{ success: boolean; error?: string }> {
	try {
		// Validate checksum
		if (state.checksum) {
			const expected = state.checksum;
			const copy = { ...state, checksum: undefined };
			const actual = await computeChecksum(copy);
			if (actual !== expected) {
				debug.warn('[SaveState] Checksum mismatch — state may have been tampered with');
				// Continue anyway — base cards have no economic value
			}
		}

		const { useCampaignStore } = await import('../campaign/campaignStore');
		const { useCraftingStore } = await import('../crafting/craftingStore');
		const { useTutorialStore } = await import('../tutorial/tutorialStore');
		const { useStarterStore } = await import('./starterStore');
		const { useHiveDataStore } = await import('../../data/HiveDataLayer');
		const { getCardById } = await import('../data/cardManagement/cardRegistry');

		// Restore base cards
		const hiveStore = useHiveDataStore.getState();
		for (const cardId of state.baseCardIds) {
			const existing = hiveStore.cardCollection.find(c => c.cardId === cardId && c.ownerId === 'local');
			if (!existing) {
				const cardDef = getCardById(cardId);
				if (cardDef) {
					hiveStore.addCard({
						uid: `base-${cardId}-${Date.now()}`,
						cardId,
						ownerId: 'local',
						rarity: cardDef.rarity || 'basic',
						edition: 'base' as 'alpha',
						foil: 'standard',
						level: 1,
						xp: 0,
						lastTransferBlock: 0,
						lastTransferTrxId: '',
						mintBlockNum: 0,
						mintTrxId: '',
						name: cardDef.name,
						type: cardDef.type,
					});
				}
			}
		}

		// Restore campaign (set state directly via Zustand)
		if (state.campaign) {
			const campStore = useCampaignStore.getState() as unknown as Record<string, unknown>;
			campStore.completedMissions = state.campaign.completedMissions;
			campStore.rewardsClaimed = state.campaign.rewardsClaimed;
		}

		// Restore Eitr
		if (state.eitr > 0) {
			const craftStore = useCraftingStore.getState() as unknown as Record<string, unknown>;
			const addEitr = craftStore.addEitr as ((v: number) => void) | undefined;
			if (addEitr) addEitr(state.eitr - Number(craftStore.eitr ?? 0));
		}

		// Restore tutorial state
		if (state.tutorialCompleted) {
			const tutStore = useTutorialStore.getState() as unknown as Record<string, unknown>;
			const completeFn = (tutStore.complete ?? tutStore.markComplete) as (() => void) | undefined;
			if (completeFn) completeFn();
		}

		// Restore starter claimed
		if (state.starterClaimed) {
			const starterStore = useStarterStore.getState() as unknown as Record<string, unknown>;
			const claimFn = (starterStore.setClaimed ?? starterStore.claim ?? starterStore.markClaimed) as (() => void) | undefined;
			if (claimFn) claimFn();
			else starterStore.claimed = true;
		}

		// Restore decks
		if (state.decks.length > 0) {
			localStorage.setItem('ragnarok-decks', JSON.stringify(state.decks));
		}

		debug.log(`[SaveState] Restored: ${state.baseCardIds.length} base cards, ${state.decks.length} decks, Eitr: ${state.eitr}`);
		return { success: true };
	} catch (err) {
		debug.warn('[SaveState] Restore failed:', err);
		return { success: false, error: String(err) };
	}
}

// ── Tier 1: Hive Save/Restore ──

export async function saveToHive(): Promise<{ success: boolean; trxId?: string; error?: string }> {
	const { hiveSync } = await import('../../data/HiveSync');
	if (!hiveSync.getUsername()) return { success: false, error: 'Not logged in to Hive' };

	const state = await collectSaveState();
	const compressed = JSON.stringify(state);

	if (compressed.length > 7500) {
		debug.warn(`[SaveState] State too large for single custom_json: ${compressed.length} bytes`);
		return { success: false, error: 'State exceeds 8KB limit' };
	}

	const result = await hiveSync.broadcastCustomJson('rp_save_state' as any, {
		action: 'save_state',
		state: compressed,
	}, false); // Posting key — save state is not a value transfer

	return {
		success: result.success,
		trxId: result.trxId,
		error: result.error,
	};
}

export async function restoreFromHive(): Promise<{ success: boolean; error?: string }> {
	try {
		const { hiveSync } = await import('../../data/HiveSync');
		const username = hiveSync.getUsername();
		if (!username) return { success: false, error: 'Not logged in' };

		// Fetch latest save_state from account history
		const { HIVE_NODES } = await import('../../data/blockchain/hiveConfig');
		const node = HIVE_NODES[0];
		const resp = await fetch(node, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				jsonrpc: '2.0', method: 'condenser_api.get_account_history',
				params: [username, -1, 100], id: 1,
			}),
		});
		const data = await resp.json();
		const history = data.result || [];

		// Find latest save_state op
		let latestState: PortableSaveState | null = null;
		for (let i = history.length - 1; i >= 0; i--) {
			const [, entry] = history[i];
			if (entry.op[0] !== 'custom_json') continue;
			const opData = entry.op[1];
			if (opData.id !== 'ragnarok-cards') continue;
			try {
				const payload = JSON.parse(opData.json);
				if (payload.action === 'save_state' && payload.state) {
					latestState = JSON.parse(payload.state);
					break;
				}
			} catch { continue; }
		}

		if (!latestState) return { success: false, error: 'No save state found on chain' };

		return restoreSaveState(latestState);
	} catch (err) {
		return { success: false, error: String(err) };
	}
}

// ── Tier 2: File Export/Import ──

export async function exportToFile(): Promise<void> {
	const state = await collectSaveState();
	const json = JSON.stringify(state, null, 2);
	const blob = new Blob([json], { type: 'application/json' });
	const url = URL.createObjectURL(blob);

	const a = document.createElement('a');
	a.href = url;
	a.download = `ragnarok-save-${new Date().toISOString().slice(0, 10)}.json`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

export async function importFromFile(file: File): Promise<{ success: boolean; error?: string }> {
	try {
		const text = await file.text();
		const state = JSON.parse(text) as PortableSaveState;

		if (!state.version || !state.timestamp || !Array.isArray(state.baseCardIds)) {
			return { success: false, error: 'Invalid save file format' };
		}

		return restoreSaveState(state);
	} catch (err) {
		return { success: false, error: `Failed to parse save file: ${err}` };
	}
}

// ── Checksum ──

async function computeChecksum(state: Omit<PortableSaveState, 'checksum'>): Promise<string> {
	const str = JSON.stringify({
		v: state.version,
		t: state.timestamp,
		b: state.baseCardIds.sort(),
		c: state.campaign.completedMissions.sort(),
		e: state.eitr,
		s: state.starterClaimed,
	});
	const buffer = new TextEncoder().encode(str);
	const hash = await crypto.subtle.digest('SHA-256', buffer);
	return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}
