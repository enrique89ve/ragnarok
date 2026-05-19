/**
 * Public surface of the match module.
 *
 * Anyone outside match/ imports from HERE, not from internal files.
 * Specifically, NO consumer should import from match/modes/<X>/ —
 * those are mode-internal (ESLint enforces this rule, added in Fase 6
 * of the migration).
 */

export type {
	MatchContext,
	MatchIdentity,
	OpponentSpec,
	AiOpponent,
	ScriptedOpponent,
	PeerOpponent,
	ScriptPayload,
	RewardChannel,
} from './types';

export { useMatchStore } from './store';

export { deriveAuthority, deriveOpponentArmyForMode, deriveIntro, deriveIWonForPhase } from './derived';
export type { Authority, IntroSpec, WinnerSignal } from './derived';

export { selectOnWinHandler, markDailyQuestClaimsPendingAfterMatch } from './onWinDispatch';
export type { MatchEndContext } from './onWinDispatch';

// ── Economy surface ───────────────────────────────────────────────────────
// Centralized per-mode reward configuration. Designer-tunable from a
// single file; resolvers read MATCH_ECONOMY and translate to the
// MatchContext.reward shape via modeEconomyToReward.

export {
	POOL_REWARDS,
	MATCH_ECONOMY,
	modeEconomyToReward,
	getEconomyFootprint,
} from './economy';
export type { ModeEconomy, ModeKey } from './economy';

export {
	createMatchIdentityFactory,
	cryptoMatchIdentityFactory,
} from './identityFactory';
export type { MatchIdentityFactory, MatchIdGenerator } from './identityFactory';

// ── Mode resolvers ────────────────────────────────────────────────────────
// Public callers (menu / route handlers / matchmaking flow) construct a
// MatchContext via these resolvers, then push the result into useMatchStore
// before the coordinator mounts. modes/X internal files (lifecycle,
// providers, setup components) remain mode-private and will be ESLint-
// fenced from cross-mode imports in Fase 6.

export { resolveSingle } from './modes/single';
export type { SingleResolveArgs } from './modes/single';
export { MatchSetupSingle } from './modes/single';

export { resolveCampaign } from './modes/campaign';
export type { CampaignResolveArgs, CampaignResolveResult } from './modes/campaign';
export { MatchSetupCampaign } from './modes/campaign';

export { resolveP2P } from './modes/p2p';
export type { P2PHandshake } from './modes/p2p';
