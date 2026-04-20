/**
 * WagerEffectsHUD — Shows active wager keyword effects during poker combat.
 * Reads wager effects from both player and opponent battlefields.
 */

import React, { useMemo } from 'react';
import { useGameStore } from '../../stores/gameStore';

interface WagerEffectEntry {
	cardName: string;
	type: string;
	description: string;
}

const WAGER_DESCRIPTIONS: Record<string, string> = {
	double_blinds: 'Blinds doubled',
	reduce_fold_penalty: 'Fold penalty −2 HP',
	showdown_coin_flip: '50% bonus showdown dmg',
	increase_min_bet: 'Min bet increased',
	hide_actions: 'Betting actions hidden',
	peek_next_card: 'Peek next community card',
	all_in_bonus: 'All-in: bonus damage',
	showdown_armor: 'Showdown win: +5 armor',
	strong_hand_draw: 'Strong hand: draw cards',
	showdown_aoe: 'Showdown: AoE damage',
	fold_heal: 'Opponent folds: heal',
	all_in_buff: 'All-in: buff minions',
	hand_rank_up: 'Hand rank +1',
	showdown_rank_damage: 'Showdown dmg = hand rank',
	see_hole_cards: 'See opponent hole cards',
	double_showdown: 'Showdown stakes doubled',
};

function getWagerDescription(type: string): string {
	return WAGER_DESCRIPTIONS[type] || type.replace(/_/g, ' ');
}

export const WagerEffectsHUD: React.FC = React.memo(() => {
	const gameState = useGameStore(s => s.gameState);

	const effects = useMemo(() => {
		const result: { player: WagerEffectEntry[]; opponent: WagerEffectEntry[] } = { player: [], opponent: [] };
		if (!gameState?.players) return result;

		for (const side of ['player', 'opponent'] as const) {
			const bf = gameState.players[side]?.battlefield || [];
			for (const m of bf) {
				const wager = (m.card as any)?.wagerEffect;
				if (wager?.type) {
					result[side].push({
						cardName: m.card?.name || 'Unknown',
						type: wager.type,
						description: getWagerDescription(wager.type),
					});
				}
			}
		}
		return result;
	}, [gameState?.players]);

	const hasAny = effects.player.length > 0 || effects.opponent.length > 0;
	if (!hasAny) return null;

	return (
		<div className="wager-effects-hud">
			{effects.player.length > 0 && (
				<div className="wager-section wager-player">
					<span className="wager-label">🎲 Your Wagers</span>
					{effects.player.map((e, i) => (
						<div key={i} className="wager-entry" title={e.cardName}>
							{e.description}
						</div>
					))}
				</div>
			)}
			{effects.opponent.length > 0 && (
				<div className="wager-section wager-opponent">
					<span className="wager-label">🎲 Enemy Wagers</span>
					{effects.opponent.map((e, i) => (
						<div key={i} className="wager-entry wager-enemy" title={e.cardName}>
							{e.description}
						</div>
					))}
				</div>
			)}
		</div>
	);
});

WagerEffectsHUD.displayName = 'WagerEffectsHUD';
