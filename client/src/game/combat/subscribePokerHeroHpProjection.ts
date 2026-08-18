import { useUnifiedCombatStore } from '../stores/unifiedCombatStore';
import { projectPokerHeroHpToCards } from './projectPokerHeroHp';

export function subscribePokerHeroHpProjection(): () => void {
	projectPokerHeroHpToCards(useUnifiedCombatStore.getState().pokerCombatState);
	return useUnifiedCombatStore.subscribe((state, previous) => {
		if (!state.pokerIsActive || !state.pokerCombatState) return;
		if (state.pokerCombatState === previous.pokerCombatState) return;
		projectPokerHeroHpToCards(state.pokerCombatState);
	});
}
