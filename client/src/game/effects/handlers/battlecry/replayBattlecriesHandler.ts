/**
 * ReplayBattlecries Battlecry Handler
 *
 * Implements the "replay_battlecries" battlecry effect.
 * Replays all battlecries played this game (Jormungandr, Echo Serpent style).
 * Handles 15+ common effect types with random targeting.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { getCardById } from '../../../data/cardManagement/cardRegistry';
import { isMinion, getHealth } from '../../../utils/cards/typeGuards';
import { MAX_BATTLEFIELD_SIZE, MAX_HAND_SIZE } from '../../../constants/gameConstants';

function replayEffect(
	context: GameContext,
	effect: any,
	sourceCard: Card,
	sourceMinion: any
): void {
	const type = effect.type;

	switch (type) {
		case 'damage': {
			const targets = context.getTargets(effect.targetType || 'random_enemy', sourceMinion);
			if (targets.length > 0) {
				const target = targets[Math.floor(Math.random() * targets.length)];
				context.dealDamage(target, effect.value || 1);
			}
			break;
		}
		case 'conditional_damage': {
			const targets = context.getTargets('random_enemy', sourceMinion);
			if (targets.length > 0) {
				const target = targets[Math.floor(Math.random() * targets.length)];
				context.dealDamage(target, effect.value || effect.damage || 1);
			}
			break;
		}
		case 'heal': {
			const targets = context.getTargets(effect.targetType || 'random_friendly', sourceMinion);
			if (targets.length > 0) {
				const target = targets[Math.floor(Math.random() * targets.length)];
				context.healTarget(target, effect.value || 1);
			}
			break;
		}
		case 'buff': {
			const buffTargets = context.getFriendlyMinions();
			if (buffTargets.length > 0) {
				const target = buffTargets[Math.floor(Math.random() * buffTargets.length)];
				target.currentAttack = (target.currentAttack || target.card.attack || 0) + (effect.buffAttack || 0);
				target.currentHealth = (target.currentHealth || target.card.health || 0) + (effect.buffHealth || 0);
			}
			break;
		}
		case 'buff_adjacent': {
			if (sourceMinion) {
				const board = context.currentPlayer.board;
				const idx = board.indexOf(sourceMinion);
				if (idx >= 0) {
					for (const offset of [-1, 1]) {
						const adj = board[idx + offset];
						if (adj) {
							adj.currentAttack = (adj.currentAttack || adj.card.attack || 0) + (effect.buffAttack || 0);
							adj.currentHealth = (adj.currentHealth || adj.card.health || 0) + (effect.buffHealth || 0);
						}
					}
				}
			}
			break;
		}
		case 'buff_hand': {
			const hand = context.currentPlayer.hand;
			for (const card of hand) {
				if (card.card?.type === 'minion') {
					(card as any).currentAttack = ((card as any).currentAttack || card.card.attack || 0) + (effect.buffAttack || 0);
					(card as any).currentHealth = ((card as any).currentHealth || card.card.health || 0) + (effect.buffHealth || 0);
				}
			}
			break;
		}
		case 'draw':
		case 'draw_multiple': {
			context.drawCards(effect.value || effect.count || 1);
			break;
		}
		case 'freeze': {
			const enemies = context.getTargets('random_enemy_minion', sourceMinion);
			if (enemies.length > 0) {
				const target = enemies[Math.floor(Math.random() * enemies.length)];
				(target as any).isFrozen = true;
			}
			break;
		}
		case 'summon': {
			const summonId = effect.summonCardId;
			if (summonId && context.currentPlayer.board.length < MAX_BATTLEFIELD_SIZE) {
				const cardToSummon = getCardById(Number(summonId));
				if (cardToSummon && isMinion(cardToSummon)) {
					const minionHealth = getHealth(cardToSummon);
					const newMinion: any = {
						instanceId: `replay-summon-${Date.now()}`,
						card: cardToSummon,
						currentHealth: minionHealth,
						maxHealth: minionHealth,
						canAttack: false,
						isPlayed: true,
						isSummoningSick: true,
						attacksPerformed: 0,
					};
					context.currentPlayer.board.push(newMinion);
				}
			}
			break;
		}
		case 'add_card': {
			if (context.currentPlayer.hand.length < MAX_HAND_SIZE) {
				context.drawCards(1);
			}
			break;
		}
		case 'set_stats': {
			const allMinions = [...context.getFriendlyMinions(), ...context.getEnemyMinions()];
			for (const m of allMinions) {
				if (m !== sourceMinion) {
					if (effect.setAttack !== undefined) m.currentAttack = effect.setAttack;
					if (effect.setHealth !== undefined) m.currentHealth = effect.setHealth;
				}
			}
			break;
		}
		case 'gain_keyword':
		case 'divine_shield_gain': {
			if (sourceMinion) {
				const keyword = effect.keyword || 'divine_shield';
				if (keyword === 'divine_shield') (sourceMinion as any).hasDivineShield = true;
				if (keyword === 'taunt') (sourceMinion as any).isTaunt = true;
				if (keyword === 'windfury') (sourceMinion as any).hasWindfury = true;
			}
			break;
		}
		case 'destroy_weapon': {
			const opWeapon = context.opponentPlayer as any;
			if (opWeapon.weapon) {
				opWeapon.weapon = null;
			}
			break;
		}
		case 'shuffle_card': {
			context.logGameEvent(`Replayed shuffle_card effect (no-op in replay)`);
			break;
		}
		default:
			context.logGameEvent(`Skipping unsupported replay effect type: ${type}`);
	}
}

export default function executeReplayBattlecries(
	context: GameContext,
	effect: BattlecryEffect,
	sourceCard: Card
): EffectResult {
	try {
		context.logGameEvent(`Executing battlecry:replay_battlecries for ${sourceCard.name}`);

		const isRandom = effect.isRandom !== false;
		const maxBattlecries = effect.maxBattlecries || 30;

		const battlecriesPlayed = (context as any).battlecriesPlayedThisGame || [];

		if (battlecriesPlayed.length === 0) {
			context.logGameEvent(`No battlecries have been played this game`);
			return { success: true, additionalData: { battlecriesReplayed: 0 } };
		}

		let battlecriesToReplay = [...battlecriesPlayed];

		if (isRandom) {
			for (let i = battlecriesToReplay.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[battlecriesToReplay[i], battlecriesToReplay[j]] = [battlecriesToReplay[j], battlecriesToReplay[i]];
			}
		}

		battlecriesToReplay = battlecriesToReplay.slice(0, maxBattlecries);

		const replayedEffects: string[] = [];
		const sourceMinion = context.getFriendlyMinions().find(m => m.card.id === sourceCard.id);

		for (const battlecry of battlecriesToReplay) {
			if (!sourceMinion || (sourceMinion.currentHealth !== undefined && sourceMinion.currentHealth <= 0)) {
				context.logGameEvent(`${sourceCard.name} died, stopping battlecry replay`);
				break;
			}

			try {
				const effectData = battlecry.effect;
				if (!effectData) continue;

				const effectType = effectData.type || 'unknown';
				const cardName = battlecry.cardName || 'Unknown Card';

				if (effectType === 'replay_battlecries' || effectType === 'replay_spells') {
					context.logGameEvent(`Skipping ${effectType} to prevent recursion`);
					continue;
				}

				context.logGameEvent(`Replaying ${cardName}'s battlecry (${effectType})`);
				replayedEffects.push(`${cardName}: ${effectType}`);

				replayEffect(context, effectData, sourceCard, sourceMinion);
			} catch (err) {
				debug.error(`Error replaying battlecry:`, err);
			}
		}

		context.logGameEvent(`${sourceCard.name} replayed ${replayedEffects.length} battlecries`);

		return {
			success: true,
			additionalData: {
				battlecriesReplayed: replayedEffects.length,
				effects: replayedEffects
			}
		};
	} catch (error) {
		debug.error(`Error executing battlecry:replay_battlecries:`, error);
		return {
			success: false,
			error: `Error executing battlecry:replay_battlecries: ${error instanceof Error ? error.message : String(error)}`
		};
	}
}
