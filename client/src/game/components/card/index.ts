/**
 * card/ — public API.
 *
 * Unified card chrome surface. Replaces the hand-rolled tile JSX in
 * CollectionPage / HeroDeckBuilder and the SimpleCard-driven minion
 * renders. See `docs/RULEBOOK.md` + the session log for the staged
 * migration plan.
 */

export { CardFrame, default as CardFrameDefault } from './CardFrame';
export * from './types';
export { resolveCardDims } from './sizing';
export { useCardFramePngStatus } from './useCardFramePngStatus';
export type { CardFramePngStatus } from './useCardFramePngStatus';
