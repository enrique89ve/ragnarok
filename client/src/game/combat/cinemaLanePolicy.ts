import { CINEMA_READ_MS, FEEDBACK_EXIT_MS } from './feedback/combatFeedback';
import {
	FIRST_STRIKE_CINEMA_HOLDER,
	PHASE_BANNER_CINEMA_HOLDER,
} from './openingReadGate';

export { PHASE_BANNER_CINEMA_HOLDER } from './openingReadGate';

/** Realm label shown once per match opening. */
export const REALM_ANNOUNCEMENT_CINEMA_HOLDER = 'realm-announcement';
export const ELEMENT_MATCHUP_CINEMA_HOLDER = 'element-matchup-banner';
export const SHOWDOWN_BADGE_CINEMA_HOLDER = 'showdown-badge';
/** GSAP center slams (hand rank, streak, Ragnarok) — not decorative shake-only VFX. */
export const POKER_CINEMA_SLAM_HOLDER = 'poker-cinema';

/**
 * Holders that compete for the center readout pixel. Timers here must never
 * preempt another member's full enter → read → exit beat (AAA-style phase card).
 */
export const CENTER_TITLE_CINEMA_HOLDERS: ReadonlySet<string> = new Set([
	FIRST_STRIKE_CINEMA_HOLDER,
	PHASE_BANNER_CINEMA_HOLDER,
	REALM_ANNOUNCEMENT_CINEMA_HOLDER,
	ELEMENT_MATCHUP_CINEMA_HOLDER,
	SHOWDOWN_BADGE_CINEMA_HOLDER,
	POKER_CINEMA_SLAM_HOLDER,
]);

export function isCenterTitleBlocked(
	cinemaHolders: readonly string[],
	selfHolder: string | null,
): boolean {
	return cinemaHolders.some(
		(id) => id !== selfHolder && CENTER_TITLE_CINEMA_HOLDERS.has(id),
	);
}

/** Phase title choreography — aligns React banner, cinema hold, and CSS slam. */
export const PHASE_BANNER_ENTER_MS = 350;
export const PHASE_BANNER_EXIT_MS = FEEDBACK_EXIT_MS;
export const PHASE_BANNER_READ_MS = CINEMA_READ_MS;
export const PHASE_BANNER_CINEMA_MS =
	PHASE_BANNER_ENTER_MS + PHASE_BANNER_READ_MS + PHASE_BANNER_EXIT_MS;
/** Visible through enter + read; exit animation starts afterward. */
export const PHASE_BANNER_VISIBLE_MS = PHASE_BANNER_ENTER_MS + PHASE_BANNER_READ_MS;