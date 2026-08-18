import type { GameState } from '../types';
import { useUnifiedCombatStore } from '../stores/unifiedCombatStore';
import { readCardsHeroHp } from './combatHeroHp';
import { applyPokerHpDelta, pokerHpChannelId } from './pokerCombatHp';
import { isPokerHeroHpProjectionLocked } from './hpProjectionLock';

/**
 * When a cards command changes heroHealth during poker, apply the same
 * integer delta to that viewer's HP channel. The channel remains authority.
 */
export function absorbCardsHeroHpDelta(before: GameState, after: GameState): void {
	if (isPokerHeroHpProjectionLocked()) return;
	const combatStore = useUnifiedCombatStore.getState();
	if (!combatStore.pokerIsActive || !combatStore.pokerCombatState) return;

	let next = combatStore.pokerCombatState;
	let changed = false;
	for (const slot of ['player', 'opponent'] as const) {
		const delta = readCardsHeroHp(after.players[slot]).current
			- readCardsHeroHp(before.players[slot]).current;
		if (delta === 0) continue;
		const write = applyPokerHpDelta(next, pokerHpChannelId(next, slot), delta);
		if (!write) continue;
		next = write.state;
		changed = true;
	}
	if (changed) {
		useUnifiedCombatStore.setState({ pokerCombatState: next });
	}
}
