/**
 * Effect System Initialization
 *
 * Registers all handler dictionaries with the static EffectRegistry.
 * The registry itself is NOT wired into the live game loop — the game
 * executes effects through battlecryUtils, deathrattleUtils, and
 * spellUtils directly.  Registration is kept so that handler metadata
 * (e.g. getRegisteredHandlers()) remains queryable for tooling / tests.
 */
import { registerAllEffectHandlers } from './handlers/registerHandlers';
import { registerWarriorHandlers } from './warriorHandlers';

export function initEffectSystem() {
	registerAllEffectHandlers();
	registerWarriorHandlers();
}

export default initEffectSystem;
