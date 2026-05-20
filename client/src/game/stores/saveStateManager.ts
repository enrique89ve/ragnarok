/**
 * saveStateManager.ts — Portable Save State (3-Tier System)
 *
 * Tier 1: File export/import — universal fallback for all players
 * Tier 2: QR/WebRTC transfer — convenience (handled by existing PeerJS infra)
 *
 * State payload: ~2KB compressed (campaign progress, decks, quest state,
 * Eitr balance, settings, tutorial flags). Does NOT include NFT cards or
 * starter card IDs — starter is a fixed entitlement reconstructed from code.
 */

import { debug } from '../config/debugConfig';
import { createRuntimeStorageKey } from '../config/networkConfig';

const LEGACY_STARTER_DECKS_STORAGE_KEY = createRuntimeStorageKey('ragnarok-decks');

// ── Auto-Save on Milestones ──

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

export function triggerAutoSave(): void {
	if (autoSaveTimer) clearTimeout(autoSaveTimer);
	autoSaveTimer = setTimeout(() => {
		autoSaveTimer = null;
	}, 5000);
}

// ── State Shape (what gets saved/restored) ──

export interface PortableSaveState {
	version: 3;
	timestamp: number;
	// Campaign progress.
	// `rewardsClaimed` is vestigial since the per-mission reward claim was
	// collapsed into `rp_campaign_result` (single chain op writes progress
	// AND credits first-clear RUNE). The field is kept for v3 save compat
	// and always serialized as []; the import path ignores it.
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
	// Economy — Eitr is chain-derived per ADR 0001; this field is vestigial
	// and kept only for backward compat with v3 saves. Always written as 0;
	// never restored.
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

function isObjectRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function hasValidStarterClaimFlag(value: unknown): value is Pick<PortableSaveState, 'starterClaimed'> {
	return isObjectRecord(value) && typeof value.starterClaimed === 'boolean';
}

// ── Collect State from All Stores ──

export async function collectSaveState(): Promise<PortableSaveState> {
	// Lazy-import stores to avoid circular deps
	const { useCampaignStore } = await import('../campaign/campaignStore');
	const { useTutorialStore } = await import('../tutorial/tutorialStore');
	const { useStarterStore } = await import('./starterStore');
	const { useSettingsStore } = await import('./settingsStore');

	const campaign = useCampaignStore.getState() as unknown as Record<string, unknown>;
	const tutorial = useTutorialStore.getState() as unknown as Record<string, unknown>;
	const starter = useStarterStore.getState();
	const settings = useSettingsStore.getState() as unknown as Record<string, unknown>;

	// Collect completed mission IDs from campaign store
	const rawMissions = campaign.completedMissions;
	const missionIds: string[] = rawMissions && typeof rawMissions === 'object'
		? Object.keys(rawMissions as Record<string, unknown>)
		: Array.isArray(rawMissions) ? rawMissions as string[] : [];

	// Collect deck configs from localStorage
	const decksRaw = localStorage.getItem(LEGACY_STARTER_DECKS_STORAGE_KEY);
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
		version: 3,
		timestamp: Date.now(),
		campaign: {
			completedMissions: missionIds,
			rewardsClaimed: [],
			difficulty: String(campaign.difficulty ?? 'normal'),
		},
		decks,
		quests: {
			activeQuestIds: [],
			completedToday: [],
			lastRefresh: 0,
		},
		eitr: 0,
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
				// Continue anyway — starter entitlement has no economic value
			}
		}

		const { useCampaignStore } = await import('../campaign/campaignStore');
		const { useTutorialStore } = await import('../tutorial/tutorialStore');
		const { useStarterStore } = await import('./starterStore');
		const { getNFTBridge } = await import('../nft');

		// Restore campaign (set state directly via Zustand).
		// `rewardsClaimed` from v3 saves is intentionally ignored — the per-mission
		// reward claim was collapsed into `rp_campaign_result` and the field is
		// no longer part of the campaign store.
		if (state.campaign) {
			const campStore = useCampaignStore.getState() as unknown as Record<string, unknown>;
			campStore.completedMissions = state.campaign.completedMissions;
		}

		// Eitr is chain-derived per ADR 0001 — no local restore. The vestigial
		// `state.eitr` field is ignored; balance always comes from the chain.

		// Restore tutorial state
		if (state.tutorialCompleted) {
			const tutStore = useTutorialStore.getState() as unknown as Record<string, unknown>;
			const completeFn = (tutStore.complete ?? tutStore.markComplete) as (() => void) | undefined;
			if (completeFn) completeFn();
		}

		// Restore starter claimed. Ownership is universal (no materialization);
		// the seed of hero decks happens via ensureBridgeRuntime on next boot.
		if (state.starterClaimed) {
			useStarterStore.getState().markClaimed(getNFTBridge().getUsername());
		}

		// Restore decks
		if (state.decks.length > 0) {
			localStorage.setItem(LEGACY_STARTER_DECKS_STORAGE_KEY, JSON.stringify(state.decks));
		}

		debug.log(`[SaveState] Restored: starter=${state.starterClaimed}, ${state.decks.length} decks, Eitr: ${state.eitr}`);
		return { success: true };
	} catch (err) {
		debug.warn('[SaveState] Restore failed:', err);
		return { success: false, error: String(err) };
	}
}

// ── Legacy Hive Save/Restore ──

const HIVE_SAVE_DISABLED_ERROR =
	'Hive cloud save is disabled. Ragnarok only broadcasts canonical protocol ops; use a local backup file for portable saves.';

export async function saveToHive(): Promise<{ success: boolean; trxId?: string; error?: string }> {
	return { success: false, error: HIVE_SAVE_DISABLED_ERROR };
}

export async function restoreFromHive(): Promise<{ success: boolean; error?: string }> {
	return { success: false, error: HIVE_SAVE_DISABLED_ERROR };
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
		const parsed: unknown = JSON.parse(text);
		if (!isObjectRecord(parsed)) {
			return { success: false, error: 'Invalid save file format' };
		}

		if (parsed.version !== 3 || typeof parsed.timestamp !== 'number' || !hasValidStarterClaimFlag(parsed)) {
			return { success: false, error: 'Invalid save file format' };
		}

		const state = parsed as PortableSaveState;
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
		c: state.campaign.completedMissions.sort(),
		e: state.eitr,
		s: state.starterClaimed,
	});
	const buffer = new TextEncoder().encode(str);
	const hash = await crypto.subtle.digest('SHA-256', buffer);
	return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}
