import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { StorageKeys } from '../config/storageKeys';

export interface SettingsState {
	musicVolume: number;
	sfxVolume: number;
	musicEnabled: boolean;
	sfxEnabled: boolean;

	animationsEnabled: boolean;
	reduceMotion: boolean;
	enhancedVFX: boolean;
	cardQuality: 'low' | 'medium' | 'high';

	autoEndTurn: boolean;
	confirmAttacks: boolean;
	showDamageNumbers: boolean;

	keybindings: Record<string, string>;
}

interface SettingsActions {
	setSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
	resetToDefaults: () => void;
}

const DEFAULT_KEYBINDINGS: Record<string, string> = {
	endTurn: 'Space',
	useHeroPower: 'h',
	showGameLog: 'l',
	concede: '',
	toggleFullscreen: 'f',
};

const DEFAULT_SETTINGS: SettingsState = {
	musicVolume: 0.5,
	sfxVolume: 0.7,
	musicEnabled: true,
	sfxEnabled: true,
	animationsEnabled: true,
	reduceMotion: false,
	enhancedVFX: true,
	cardQuality: 'high',
	autoEndTurn: false,
	confirmAttacks: false,
	showDamageNumbers: true,
	keybindings: DEFAULT_KEYBINDINGS,
};

export const useSettingsStore = create<SettingsState & SettingsActions>()(
	persist(
		(set) => ({
			...DEFAULT_SETTINGS,

			setSetting: (key, value) => set({ [key]: value }),

			resetToDefaults: () => set({ ...DEFAULT_SETTINGS, keybindings: { ...DEFAULT_KEYBINDINGS } }),
		}),
		{
			name: StorageKeys.GAME_SETTINGS,
			partialize: (state) => {
				const { setSetting: _a, resetToDefaults: _b, ...data } = state;
				return data;
			},
		}
	)
);
