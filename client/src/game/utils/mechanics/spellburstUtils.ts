import { GameState, CardInstance, CardData } from '../../types';
import { MAX_BATTLEFIELD_SIZE, MAX_HAND_SIZE } from '../../constants/gameConstants';
import { hasKeyword } from '../cards/keywordUtils';
import { debug } from '../../config/debugConfig';
import allCards from '../../data/allCards';
import { createCardInstance } from '../cards/cardUtils';
import { destroyCard } from '../zoneUtils';

export function processSpellburst(state: GameState, spellCard: CardData): GameState {
	const currentPlayer = state.currentTurn;
	const bf = state.players[currentPlayer].battlefield;

	for (let i = 0; i < bf.length; i++) {
		const minion = bf[i];
		if (minion.spellburstUsed) continue;
		if (minion.silenced || minion.isSilenced) continue;
		if (!hasKeyword(minion, 'spellburst')) continue;

		const effect = (minion.card as any).spellburstEffect;
		if (!effect) continue;

		minion.spellburstUsed = true;
		debug.log(`[Spellburst] ${minion.card.name} triggered`);
		state = executeSpellburstEffect(state, minion, effect, spellCard);
	}

	return state;
}

function executeSpellburstEffect(
	state: GameState,
	minion: CardInstance,
	effect: any,
	spellCard: CardData
): GameState {
	const currentPlayer = state.currentTurn;
	const player = state.players[currentPlayer];
	const enemySide: 'player' | 'opponent' = currentPlayer === 'player' ? 'opponent' : 'player';
	const opponent = state.players[enemySide];

	switch (effect.type) {
		case 'damage': {
			const totalDmg = effect.value || 1;
			const targets = opponent.battlefield.filter(m => (m.currentHealth ?? 1) > 0);
			if (targets.length === 0) break;
			let remaining = totalDmg;
			while (remaining > 0 && targets.length > 0) {
				const idx = Math.floor(Math.random() * targets.length);
				const t = targets[idx];
				if (t.hasDivineShield) {
					t.hasDivineShield = false;
				} else {
					t.currentHealth = (t.currentHealth ?? 1) - 1;
				}
				remaining--;
				if ((t.currentHealth ?? 0) <= 0) {
					targets.splice(idx, 1);
				}
			}
			const dead = opponent.battlefield.filter(m => (m.currentHealth ?? 1) <= 0);
			for (const d of dead) {
				state = destroyCard(state, d.instanceId, enemySide);
			}
			break;
		}
		case 'buff': {
			const minionOnBf = player.battlefield.find(m => m.instanceId === minion.instanceId);
			if (!minionOnBf) break;

			if (effect.targetType === 'none') {
				player.mana.current = player.mana.max;
				break;
			}

			let atkBuff = effect.buffAttack || 0;
			let hpBuff = effect.buffHealth || 0;
			if (!atkBuff && !hpBuff && spellCard.manaCost) {
				atkBuff = spellCard.manaCost;
				hpBuff = spellCard.manaCost;
			}
			minionOnBf.currentAttack = (minionOnBf.currentAttack ?? (minionOnBf.card as any).attack ?? 0) + atkBuff;
			minionOnBf.currentHealth = (minionOnBf.currentHealth ?? (minionOnBf.card as any).health ?? 0) + hpBuff;

			if (hasKeyword(minion, 'divine_shield') && !minionOnBf.hasDivineShield) {
				minionOnBf.hasDivineShield = true;
			}
			break;
		}
		case 'discover': {
			const count = effect.value || 1;
			const heroClass = (player as any).heroClass || player.heroPower?.class || 'Neutral';
			const classSpells = allCards.filter(c =>
				c.type === 'spell' &&
				(c.class || '').toLowerCase() === heroClass.toLowerCase()
			);
			if (classSpells.length === 0) break;
			for (let i = 0; i < count; i++) {
				if (player.hand.length >= MAX_HAND_SIZE) break;
				const pick = classSpells[Math.floor(Math.random() * classSpells.length)];
				const inst = createCardInstance(pick);
				player.hand.push(inst);
			}
			break;
		}
		case 'draw': {
			if (effect.targetType === 'spell' && spellCard) {
				if (player.hand.length < MAX_HAND_SIZE) {
					const copy = createCardInstance(spellCard);
					player.hand.push(copy);
				}
			}
			break;
		}
		case 'summon': {
			if (player.battlefield.length < MAX_BATTLEFIELD_SIZE) {
				const summonId = effect.summonCardId || effect.value;
				if (summonId) {
					const cardDef = allCards.find(c => c.id === Number(summonId));
					if (cardDef) {
						const summoned = createCardInstance(cardDef as CardData);
						summoned.isSummoningSick = true;
						summoned.canAttack = false;
						player.battlefield.push(summoned);
					}
				}
			}
			break;
		}
	}

	return state;
}
