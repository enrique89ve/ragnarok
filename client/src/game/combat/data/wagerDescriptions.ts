/**
 * Wager effect descriptions — single source of truth.
 *
 * A "wager" is a keyword effect on a minion's card that triggers under
 * specific poker-combat conditions (e.g. fold, showdown, all-in). The
 * description shown to the player is intentionally short (battle-intel
 * panel chips), so heroic specificity ("Fold penalty −2 HP") is omitted
 * in favour of a compact reading ("Fold penalty reduced").
 *
 * Used by:
 *   - RagnarokCombatArena.tsx (battle-intel panel wager section)
 *
 * If you change a wording here, the battle-intel chip text updates
 * everywhere automatically.
 */

export const WAGER_DESCRIPTIONS: Record<string, string> = {
	double_blinds: 'Blinds doubled',
	reduce_fold_penalty: 'Fold penalty reduced',
	showdown_coin_flip: 'Bonus showdown coin flip',
	increase_min_bet: 'Minimum bet increased',
	hide_actions: 'Betting actions obscured',
	peek_next_card: 'Peek next community card',
	all_in_bonus: 'All-in damage bonus',
	showdown_armor: 'Showdown win grants armor',
	strong_hand_draw: 'Strong hands draw cards',
	showdown_aoe: 'Showdown hits the whole board',
	fold_heal: 'Enemy folds heal you',
	all_in_buff: 'All-in buffs minions',
	hand_rank_up: 'Hand rank increased',
	showdown_rank_damage: 'Showdown damage scales with rank',
	see_hole_cards: 'See enemy hole cards',
	double_showdown: 'Showdown stakes doubled',
};

export function getWagerDescription(type: string): string {
	return WAGER_DESCRIPTIONS[type] ?? type.replace(/_/g, ' ');
}
