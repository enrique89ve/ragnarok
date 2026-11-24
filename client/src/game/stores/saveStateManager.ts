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

import { z } from 'zod';
import { debug } from '../config/debugConfig';
import { createRuntimeStorageKey } from '../config/networkConfig';
import { StorageKeys } from '../config/storageKeys';
import type { Difficulty } from '../campaign/campaignTypes';
import { getNFTBridge } from '../nft';
import { useStarterStore } from './starterStore';

const STARTER_DECKS_STORAGE_KEY = createRuntimeStorageKey(StorageKeys.STARTER_DECKS);

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

const DifficultySchema = z.enum(['normal', 'heroic', 'mythic']).catch('normal' as const);

export const PortableSaveStateSchema = z.object({
	version: z.literal(3),
	timestamp: z.number().finite().nonnegative(),
	campaign: z.object({
		completedMissions: z.array(z.string().min(1)),
		rewardsClaimed: z.array(z.string()).optional().default([]),
		difficulty: DifficultySchema,
	}),
	decks: z.array(z.object({
		name: z.string(),
		heroId: z.string(),
		cardIds: z.array(z.number().int()),
	})),
	quests: z.object({
		activeQuestIds: z.array(z.string()),
		completedToday: z.array(z.string()),
		lastRefresh: z.number(),
	}).optional(),
	eitr: z.number().optional().default(0),
	tutorialCompleted: z.boolean(),
	tutorialStep: z.number().int().nonnegative(),
	starterClaimed: z.boolean(),
	settings: z.record(z.string(), z.unknown()),
	checksum: z.string().optional(),
});

function parsePortableSaveState(input: unknown): { success: true; data: PortableSaveState } | { success: false; error: string } {
	const result = PortableSaveStateSchema.safeParse(input);
	if (!result.success) {
		return { success: false, error: 'Invalid save file format' };
	}
	const parsed = result.data;
	return {
		success: true,
		data: {
			...parsed,
			campaign: {
				completedMissions: parsed.campaign.completedMissions,
				rewardsClaimed: parsed.campaign.rewardsClaimed ?? [],
				difficulty: parsed.campaign.difficulty,
			},
			quests: parsed.quests ?? {
				activeQuestIds: [],
				completedToday: [],
				lastRefresh: 0,
			},
			eitr: parsed.eitr ?? 0,
		},
	};
}

function isVolumeInRange(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function resolveImportDifficulty(raw: string): Difficulty {
	if (raw === 'heroic' || raw === 'mythic') return raw;
	return 'normal';
}

// ── Collect State from All Stores ──

export async function collectSaveState(): Promise<PortableSaveState> {
	// Lazy-import stores to avoid circular deps
	const { useCampaignStore } = await import('../campaign/campaignStore');
	const { useTutorialStore } = await import('../tutorial/tutorialStore');
	const { useSettingsStore } = await import('./settingsStore');

	const campaign = useCampaignStore.getState() as unknown as Record<string, unknown>;
	const tutorial = useTutorialStore.getState();
	const starter = useStarterStore.getState();
	const settings = useSettingsStore.getState() as unknown as Record<string, unknown>;

	// Collect completed mission IDs from campaign store
	const rawMissions = campaign.completedMissions;
	const missionIds: string[] = rawMissions && typeof rawMissions === 'object'
		? Object.keys(rawMissions as Record<string, unknown>)
		: Array.isArray(rawMissions) ? rawMissions as string[] : [];

	// Collect deck configs from localStorage
	const decksRaw = localStorage.getItem(STARTER_DECKS_STORAGE_KEY);
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
			difficulty: String(campaign.currentDifficulty ?? campaign.difficulty ?? 'normal'),
		},
		decks,
		quests: {
			activeQuestIds: [],
			completedToday: [],
			lastRefresh: 0,
		},
		eitr: 0,
		tutorialCompleted: tutorial.tutorialDismissed,
		tutorialStep: tutorial.currentStepIndex,
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

export async function restoreSaveState(
	state: PortableSaveState,
	options?: { allowInvalidChecksum?: boolean },
): Promise<{ success: boolean; error?: string }> {
	const parsed = parsePortableSaveState(state);
	if (!parsed.success) {
		return { success: false, error: parsed.error };
	}
	const validated = parsed.data;

	try {
		if (validated.checksum) {
			const expected = validated.checksum;
			const copy = { ...validated, checksum: undefined };
			const actual = await computeChecksum(copy);
			if (actual !== expected) {
				if (!options?.allowInvalidChecksum) {
					return { success: false, error: 'Save file checksum mismatch' };
				}
				debug.warn('[SaveState] Checksum mismatch — override allowed');
			}
		}

		const { useCampaignStore } = await import('../campaign/campaignStore');
		const { useTutorialStore } = await import('../tutorial/tutorialStore');
		const { useSettingsStore } = await import('./settingsStore');

		const importDifficulty = resolveImportDifficulty(validated.campaign.difficulty);

		useCampaignStore.setState((prev) => {
			const merged = { ...prev.completedMissions };
			for (const missionId of validated.campaign.completedMissions) {
				const existing = merged[missionId];
				if (existing) {
					continue;
				}
				merged[missionId] = {
					difficulty: importDifficulty,
					completedAt: validated.timestamp,
					bestTurns: 99,
					bestDifficulty: importDifficulty,
				};
			}
			return { completedMissions: merged };
		});

		// Eitr is chain-derived per ADR 0001 — no local restore. The vestigial
		// `state.eitr` field is ignored; balance always comes from the chain.

		useTutorialStore.setState({
			tutorialDismissed: validated.tutorialCompleted,
			currentStepIndex: validated.tutorialStep,
		});

		const settings = validated.settings;
		const settingsStore = useSettingsStore.getState();
		if (isVolumeInRange(settings.musicVolume)) {
			settingsStore.setSetting('musicVolume', settings.musicVolume);
		}
		if (isVolumeInRange(settings.sfxVolume)) {
			settingsStore.setSetting('sfxVolume', settings.sfxVolume);
		}

		// Restore starter claimed. Ownership is universal (no materialization);
		// the seed of hero decks happens via ensureBridgeRuntime on next boot.
		if (validated.starterClaimed) {
			useStarterStore.getState().markClaimed(getNFTBridge().getUsername());
		}

		// Restore decks
		if (validated.decks.length > 0) {
			localStorage.setItem(STARTER_DECKS_STORAGE_KEY, JSON.stringify(validated.decks));
		}

		debug.log(`[SaveState] Restored: starter=${validated.starterClaimed}, ${validated.decks.length} decks, Eitr: ${validated.eitr}`);
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
		const validated = parsePortableSaveState(parsed);
		if (!validated.success) {
			return { success: false, error: validated.error };
		}
		return restoreSaveState(validated.data);
	} catch (err) {
		return { success: false, error: `Failed to parse save file: ${err}` };
	}
}

// ── Checksum ──

async function computeChecksum(state: Omit<PortableSaveState, 'checksum'>): Promise<string> {
	const str = JSON.stringify({
		v: state.version,
		t: state.timestamp,
		c: [...state.campaign.completedMissions].sort(),
		d: state.campaign.difficulty,
		decks: state.decks,
		tc: state.tutorialCompleted,
		ts: state.tutorialStep,
		e: state.eitr,
		s: state.starterClaimed,
	});
	const buffer = new TextEncoder().encode(str);
	const hash = await crypto.subtle.digest('SHA-256', buffer);
	return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}