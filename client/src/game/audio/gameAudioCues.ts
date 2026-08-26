/*
 * Authored one-shot cues used by the chess and poker battle transitions.
 *
 * The OGG source is first so browsers that support it use the exact authored
 * duration. MP3 remains as a compatibility fallback for older WebViews.
 */

export type GameAudioCueId =
	| 'chess_battle_intro'
	| 'frontline_tactical_sting'
	| 'new_phase_sting'
	| 'showdown_escalation'
	| 'final_battle_cadence';

export type GameAudioCueDefinition = {
	readonly sources: readonly [string, string];
	readonly durationMs: number;
	readonly volume: number;
	readonly preload: boolean;
};

const AUDIO_ROOT = '/assets/audio/runa-de-guerra';

const cue = (
	fileName: string,
	durationMs: number,
	volume: number,
	preload = false,
): GameAudioCueDefinition => ({
	sources: [
		`${AUDIO_ROOT}/${fileName}.ogg`,
		`${AUDIO_ROOT}/${fileName}.mp3`,
	],
	durationMs,
	volume,
	preload,
});

export const GAME_AUDIO_CUES: Readonly<Record<GameAudioCueId, GameAudioCueDefinition>> = {
	chess_battle_intro: cue('01_chess_battle_intro', 4_700, 0.88, true),
	frontline_tactical_sting: cue('02_frontline_tactical_sting', 3_050, 0.72),
	new_phase_sting: cue('03_new_phase_sting', 4_200, 0.68),
	showdown_escalation: cue('04_showdown_escalation', 4_700, 0.8),
	final_battle_cadence: cue('05_final_battle_cadence', 9_550, 0.84),
};
