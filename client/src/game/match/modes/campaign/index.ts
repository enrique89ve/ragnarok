/**
 * Campaign mode — scripted opponent (mission + boss rules + fixed deck),
 * partial economic reward (xpRunes percentage, default 0.1), no ranking.
 *
 * Public surface (filled in later phases):
 *   - resolver:    resolveCampaign(args)                  [x] Fase 2
 *   - lifecycle:   onWin(ctx, finalState)                  — Fase 4
 *                  → dispatch CampaignReward + markMissionComplete
 *   - bossRules:   moves useBossRuleEffects + boss data here — Fase 4
 *   - armyBuilder: moves campaignArmyBuilder here            — Fase 4
 *
 * Cross-mode rule: code in modes/single/ and modes/p2p/ MUST NOT
 * import from this module. Enforced by ESLint.
 */

export { resolveCampaign } from './resolver';
export type { CampaignResolveArgs, CampaignResolveResult } from './resolver';
export { onCampaignMatchEnd } from './lifecycle';
export { MatchSetupCampaign } from './MatchSetupCampaign';
