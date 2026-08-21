/**
 * Pure projection from legacy store fields to a MatchContext.
 *
 * Lives separately from legacyBridge.ts (which contains the React
 * hook + Zustand store imports) so tests can exercise the projection
 * without pulling in client-only modules. gameStore.ts imports from
 * useGame.tsx which reads localStorage at module init — that crashes
 * Vitest's node environment, so the hook layer must stay out of the
 * test path.
 *
 * Branch order:
 *   1. P2P → null. <MatchSetupP2P/> (Fase 5) owns the peer ctx; the
 *      legacy bridge stays out of the way so it cannot race with — or
 *      overwrite — what the wrapper just installed.
 *   2. Campaign (mission set in campaignStore).
 *   3. Single (default fallback — local AI).
 *
 * THIS FILE IS THROWAWAY — Fase 7 deletes the bridge once single /
 * campaign flows shift to a menu-driven resolver path. The retained
 * isP2PConnected gate documents the boundary between "what the bridge
 * synthesizes" and "what MatchSetupP2P owns".
 */

import type { Difficulty } from '../campaign/campaignTypes';
// Direct sub-file imports (NOT barrels) so this projection stays
// node-test-safe. The mode barrels re-export React setup components
// (e.g. MatchSetupP2P) whose transitive deps touch localStorage at
// module load and crash vitest's node environment.
import { cryptoMatchIdentityFactory, type MatchIdentityFactory } from './identityFactory';
import { resolveCampaign } from './modes/campaign/resolver';
import { resolveSingle } from './modes/single/resolver';
import type { MatchContext } from './types';

export interface LegacySynthInputs {
	isP2PConnected: boolean;
	campaignMission: string | null;
	campaignDifficulty: Difficulty;
}

export function synthesizeLegacyMatchContext(
	input: LegacySynthInputs,
	identityFactory: MatchIdentityFactory = cryptoMatchIdentityFactory,
): MatchContext | null {
	if (input.isP2PConnected) {
		// P2P MatchContext is built by <MatchSetupP2P/> (Fase 5). Returning
		// null here is the contract that "the legacy bridge does not touch
		// peer matches". The bridge's caller separately guards against
		// clearing an active peer ctx (see useLegacyMatchContextBridge).
		return null;
	}

	if (input.campaignMission) {
		const result = resolveCampaign({
			identity: identityFactory.create(),
			missionId: input.campaignMission,
			difficulty: input.campaignDifficulty,
			// legacy bridge does not participate in protocol v1 — null
			// matches the contract that this synth is the pre-protocol
			// path that will go away with Fase 7.
			localRunId: null,
		});
		if (!result.ok) return null;
		return result.ctx;
	}

	// Single. Difficulty/deckSource defaults match the implicit
	// pre-Fase-3 behavior — coordinator and warband flow today do not
	// expose difficulty selection for single matches, so 'normal' is the
	// only real value. When Fase 7's menu lands, real user input populates
	// these.
	return resolveSingle({
		identity: identityFactory.create(),
		difficulty: 'normal',
		deckSource: 'warband',
	});
}
