import { CombatPhase } from '../../types/PokerCombatTypes';
import type { PokerTurnProcessMode } from './pokerTurnPolicy';
import { isTimedPokerDecisionPhase } from '../../../../../shared/p2p-wire/pokerTurnClock';

/** Prepare local-AI card state when a normal poker decision window opens. */
export function shouldPrepareLocalAiCards(input: {
	readonly phase: CombatPhase | null | undefined;
	readonly isActive: boolean;
	readonly isMulliganActive: boolean;
	readonly processMode: PokerTurnProcessMode;
	readonly setupAlreadyApplied: boolean;
}): boolean {
	return input.isActive
		&& !input.isMulliganActive
		&& input.phase !== null
		&& input.phase !== undefined
		&& isTimedPokerDecisionPhase(input.phase)
		&& input.processMode === 'local_ai'
		&& !input.setupAlreadyApplied;
}
