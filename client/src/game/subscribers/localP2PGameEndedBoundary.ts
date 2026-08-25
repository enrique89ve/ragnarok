import type { GameState } from '../types';
import type { MatchContext } from '../match/types';
import type { RagnarokRuntimeEvidence } from '@shared/runtimeConfig';
import {
	settleLocalP2PGameOver,
	type LocalP2PSettlementDependencies,
	type LocalP2PSettlementResult,
} from './localP2PSettlement';

/** Terminal peer routing seam: local settlement has no external side effects. */
export function handleLocalP2PGameEnded(
	gameState: GameState,
	activeMatch: MatchContext,
	deps: LocalP2PSettlementDependencies,
): Promise<LocalP2PSettlementResult> {
	if (activeMatch.opponent.kind !== 'peer') return Promise.resolve({ status: 'skipped', reason: 'not_peer' });
	return settleLocalP2PGameOver(activeMatch, gameState, deps);
}

export type P2PGameEndedRouteResult =
	| { readonly route: 'local'; readonly result: LocalP2PSettlementResult }
	| { readonly route: 'external' }
	| { readonly route: 'skipped' };

export async function routeP2PGameEnded(input: {
	readonly gameState: GameState;
	readonly activeMatch: MatchContext | null;
	readonly runtimeEvidence: RagnarokRuntimeEvidence;
	readonly runLocalSettlement: () => Promise<LocalP2PSettlementResult>;
	readonly runExternalSettlement: () => Promise<void>;
}): Promise<P2PGameEndedRouteResult> {
	if (input.runtimeEvidence.phasePolicy.localSettlement) {
		if (!input.activeMatch || input.activeMatch.opponent.kind !== 'peer') return { route: 'skipped' };
		return { route: 'local', result: await input.runLocalSettlement() };
	}
	await input.runExternalSettlement();
	return { route: 'external' };
}
