import { create } from 'zustand';
import { Howl } from 'howler';
import { proceduralAudio, type SoundType } from '../../game/audio/proceduralAudio';
import { assetPath } from '../../game/utils/assetPath';

/*
  Background music tracks. The four "core" tracks (main_menu, battle_theme,
  victory, defeat) are the original baseline. The MusicCueId values
  ('primordial_dread' | 'forge_anvil' | etc.) extend the catalog so the
  cinematic system + per-mission combat music can request thematic tracks
  by name.

  All Howler tracks are loaded with `preload: false` and wrapped in
  try/catch — playback fails silently if the mp3 isn't on disk yet. This
  is intentional: the wiring is ready, the content (recorded music) is
  shipping later. The game never crashes from a missing track.
*/
export type BackgroundMusicTrack =
	| 'main_menu'
	| 'battle_theme'
	| 'victory'
	| 'defeat'
	// Cinematic / mission cues — match MusicCueId in campaignTypes.ts
	| 'primordial_dread'
	| 'forge_anvil'
	| 'aesir_triumph'
	| 'vanir_war'
	| 'jotun_rage'
	| 'twilight_horn'
	| 'ragnarok'
	| 'rebirth'
	| 'mead_hall'
	| 'shadow_root'
	| 'olympian_hymn'
	| 'duat_passage'
	| 'celtic_mist'
	| 'celestial_court';
export type SoundEffectType =
	| 'card_play'
	| 'card_draw'
	| 'attack'
	| 'damage'
	| 'heal'
	| 'coin'
	| 'legendary'
	| 'spell'
	| 'freeze'
	| 'deathrattle'
	| 'battlecry'
	| 'discover'
	| 'secret_trigger'
	| 'game_start'
	| 'victory'
	| 'defeat'
	| 'card_hover'
	| 'card_click'
	| 'button_click'
	| 'error'
	| 'hero_power'
	| 'attack_prepare'
	| 'spell_charge'
	| 'spell_cast'
	| 'spell_impact'
	| 'fire_impact'
	| 'legendary_entrance'
	| 'turn_start'
	| 'turn_end'
	| 'damage_hero'
	| 'mana_fill'
	| 'mana_spend'
	| 'fatigue'
	| 'emote'
	| 'weapon_equip'
	| 'weapon_break'
	| 'secret_play'
	| 'silence'
	| 'buff'
	| 'summon'
	| 'death'
	| 'mythic_entrance'
	| 'pet_evolve'
	| 'card_burn'
	| 'card_attack'
	| 'card_place';

function createMusicTrack(src: string, loop: boolean, volume: number): Howl | null {
	try {
		return new Howl({ src: [src], volume, loop, preload: false });
	} catch {
		return null;
	}
}

interface AudioState {
	soundEnabled: boolean;
	musicEnabled: boolean;
	soundVolume: number;
	musicVolume: number;
	currentMusic?: Howl | null;
	currentMusicTrack?: BackgroundMusicTrack;
	musicTracks: Record<BackgroundMusicTrack, Howl | null>;

	toggleSound: () => void;
	toggleMusic: () => void;
	setSoundVolume: (volume: number) => void;
	setMusicVolume: (volume: number) => void;
	playSoundEffect: (type: SoundEffectType) => void;
	playBackgroundMusic: (track: BackgroundMusicTrack) => void;
	stopBackgroundMusic: () => void;
}

export const useAudio = create<AudioState>((set, get) => ({
	soundEnabled: true,
	musicEnabled: true,
	soundVolume: 0.7,
	musicVolume: 0.5,

	musicTracks: {
		main_menu: createMusicTrack(assetPath('/assets/audio/main_menu.mp3'), true, 0.5),
		battle_theme: createMusicTrack(assetPath('/assets/audio/battle_theme.mp3'), true, 0.5),
		victory: createMusicTrack(assetPath('/assets/audio/victory_music.mp3'), false, 0.5),
		defeat: createMusicTrack(assetPath('/assets/audio/defeat_music.mp3'), false, 0.5),
		// Cinematic / per-mission cues. Files are placeholders until composer
		// delivers — Howler swallows missing-file errors thanks to preload:false.
		primordial_dread: createMusicTrack(assetPath('/assets/audio/cue_primordial_dread.mp3'), true, 0.45),
		forge_anvil: createMusicTrack(assetPath('/assets/audio/cue_forge_anvil.mp3'), true, 0.45),
		aesir_triumph: createMusicTrack(assetPath('/assets/audio/cue_aesir_triumph.mp3'), true, 0.45),
		vanir_war: createMusicTrack(assetPath('/assets/audio/cue_vanir_war.mp3'), true, 0.45),
		jotun_rage: createMusicTrack(assetPath('/assets/audio/cue_jotun_rage.mp3'), true, 0.45),
		twilight_horn: createMusicTrack(assetPath('/assets/audio/cue_twilight_horn.mp3'), true, 0.45),
		ragnarok: createMusicTrack(assetPath('/assets/audio/cue_ragnarok.mp3'), true, 0.5),
		rebirth: createMusicTrack(assetPath('/assets/audio/cue_rebirth.mp3'), true, 0.45),
		mead_hall: createMusicTrack(assetPath('/assets/audio/cue_mead_hall.mp3'), true, 0.45),
		shadow_root: createMusicTrack(assetPath('/assets/audio/cue_shadow_root.mp3'), true, 0.45),
		olympian_hymn: createMusicTrack(assetPath('/assets/audio/cue_olympian_hymn.mp3'), true, 0.45),
		duat_passage: createMusicTrack(assetPath('/assets/audio/cue_duat_passage.mp3'), true, 0.45),
		celtic_mist: createMusicTrack(assetPath('/assets/audio/cue_celtic_mist.mp3'), true, 0.45),
		celestial_court: createMusicTrack(assetPath('/assets/audio/cue_celestial_court.mp3'), true, 0.45),
	},

	toggleSound: () => {
		const enabled = !get().soundEnabled;
		proceduralAudio.setEnabled(enabled);
		set({ soundEnabled: enabled });
	},

	toggleMusic: () => {
		const enabled = !get().musicEnabled;
		const currentMusic = get().currentMusic;
		if (currentMusic) {
			try {
				currentMusic.volume(enabled ? get().musicVolume : 0);
			} catch {
				// music file may not exist
			}
		}
		set({ musicEnabled: enabled });
	},

	setSoundVolume: (volume: number) => {
		proceduralAudio.setVolume(volume);
		set({ soundVolume: volume });
	},

	setMusicVolume: (volume: number) => {
		const currentMusic = get().currentMusic;
		if (currentMusic && get().musicEnabled) {
			try {
				currentMusic.volume(volume);
			} catch {
				// music file may not exist
			}
		}
		set({ musicVolume: volume });
	},

	playSoundEffect: (type: SoundEffectType) => {
		if (!get().soundEnabled) return;
		proceduralAudio.play(type as SoundType);
	},

	playBackgroundMusic: (track: BackgroundMusicTrack) => {
		const current = get().currentMusic;
		const tracks = get().musicTracks;

		if (current) {
			try {
				current.stop();
			} catch {
				// ignore
			}
		}

		const newTrack = tracks[track];
		if (newTrack) {
			try {
				newTrack.volume(get().musicEnabled ? get().musicVolume : 0);
				newTrack.play();
				set({
					currentMusic: newTrack,
					currentMusicTrack: track,
				});
			} catch {
				set({
					currentMusic: null,
					currentMusicTrack: track,
				});
			}
		}
	},

	stopBackgroundMusic: () => {
		const current = get().currentMusic;
		if (current) {
			try {
				current.stop();
			} catch {
				// ignore
			}
			set({
				currentMusic: undefined,
				currentMusicTrack: undefined,
			});
		}
	},
}));

export default useAudio;
