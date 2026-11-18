/** Canvas modal (in-arena mulligan). */
export const MULLIGAN_OVERLAY_CLASS =
	'mulligan-chamber absolute inset-0 z-10 pointer-events-auto flex flex-col items-center justify-center overflow-hidden';

/** Opening hand — LoL-style full physical viewport (not letterboxed 1920 canvas). */
export const MULLIGAN_FULLSCREEN_SHELL_CLASS =
	'mulligan-chamber mulligan-chamber--fullscreen mulligan-chamber--backdrop-host fixed inset-0 z-[24] pointer-events-auto flex flex-col items-center justify-center overflow-hidden';

export const MULLIGAN_TITLE_CLASS =
	'font-display font-black text-white uppercase leading-none ' +
	'text-[52px] tracking-[8px] mb-3 ' +
	'[text-shadow:0_0_30px_rgba(251,191,36,0.5),0_4px_8px_rgba(0,0,0,0.8)]';

export const MULLIGAN_SUBTITLE_CLASS =
	'text-[11px] font-bold tracking-[4px] uppercase text-amber-400/55';
