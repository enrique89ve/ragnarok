import { CombatPhase } from '../types/PokerCombatTypes';

/** Center copy that must finish before the elemental matchup may appear. */
export const FIRST_STRIKE_CINEMA_HOLDER = 'first-strike';
export const PHASE_BANNER_CINEMA_HOLDER = 'phase-banner';

export const OPENING_BANNER_PHASES: ReadonlySet<CombatPhase> = new Set([
	CombatPhase.PRE_FLOP,
	CombatPhase.FAITH,
	CombatPhase.FORESIGHT,
	CombatPhase.DESTINY,
]);

export interface OpeningMatchupGate {
	readonly phase: CombatPhase;
	readonly firstStrikeVisible: boolean;
	readonly firstStrikePending: boolean;
	readonly cinemaHolders: readonly string[];
	/** A phase title was owed and has not finished its read yet. */
	readonly bannerArmed: boolean;
	/** The phase title actually took the center at least once. */
	readonly bannerSeen: boolean;
	readonly matchupAlreadyShown: boolean;
}

/**
 * Opening notices share one center pixel. The matchup waits until First
 * Strike, the phase title, and mulligan are each finished.
 */
export function canStartOpeningMatchup(gate: OpeningMatchupGate): boolean {
	if (gate.matchupAlreadyShown) return false;
	if (gate.phase === CombatPhase.MULLIGAN || gate.phase === CombatPhase.FIRST_STRIKE) return false;
	if (gate.firstStrikeVisible || gate.firstStrikePending) return false;
	if (gate.cinemaHolders.length > 0) return false;
	if (gate.bannerArmed && !gate.bannerSeen) return false;
	return true;
}
