/**
 * Single mode — AI opponent, no Match XP / RUNE / ranking.
 *
 * Public surface:
 *   - resolver:   resolveSingle(args)
 *   - lifecycle:  onSingleMatchEnd()  (local win/loss streak only)
 *   - setup:      <MatchSetupSingle/>
 *
 * Cross-mode rule: code in modes/campaign/ and modes/p2p/ MUST NOT
 * import from this module. Enforced by ESLint.
 */

export { resolveSingle } from './resolver';
export type { SingleResolveArgs } from './resolver';
export { onSingleMatchEnd } from './lifecycle';
export { MatchSetupSingle } from './MatchSetupSingle';
