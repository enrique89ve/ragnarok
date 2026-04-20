import { useCallback } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useUnifiedUIStore } from '../../stores/unifiedUIStore';
import { ALL_NORSE_HEROES } from '../../data/norseHeroes';
import { canCardAttack as canCardAttackCheck } from '../attackUtils';
import { emitBattlecryTriggered } from '../../actions/gameActions';
import { debug } from '../../config/debugConfig';
import type { GameState } from '../../types';

interface UsePokerCardClickHandlersParams {
	isPlayerTurn: boolean;
	heroPowerTargeting?: {
		active: boolean;
		norseHeroId: string;
		targetType: string;
		effectType: string;
		value: number;
		secondaryValue?: number;
		powerName: string;
		heroName: string;
		manaCost: number;
	} | null;
	executeHeroPowerEffect?: (norseHero: any, heroPower: any, target: any) => void;
	addShakingTarget: (targetId: string, duration?: number) => void;
	gameState: GameState | null;
}

export function usePokerCardClickHandlers({
	isPlayerTurn,
	heroPowerTargeting,
	executeHeroPowerEffect,
	addShakingTarget,
	gameState,
}: UsePokerCardClickHandlersParams) {
	const playCard = useGameStore(s => s.playCard);
	const rawAttackingCard = useGameStore(s => s.attackingCard);
	const selectAttacker = useGameStore(s => s.selectAttacker);
	const attackWithCard = useGameStore(s => s.attackWithCard);
	const selectedCard = useGameStore(s => s.selectedCard);
	const selectCard = useGameStore(s => s.selectCard);

	const handlePlayerCardClick = useCallback((card: any) => {
		if (heroPowerTargeting?.active && executeHeroPowerEffect) {
			const targetType = heroPowerTargeting.targetType;
			if (targetType === 'friendly_minion' || targetType === 'friendly_mech' || targetType === 'any_minion' || targetType === 'any') {
				const norseHero = ALL_NORSE_HEROES[heroPowerTargeting.norseHeroId];
				if (norseHero) {
					executeHeroPowerEffect(norseHero, norseHero.heroPower, card);
				}
				return;
			}
		}

		if (selectedCard) {
			const targetType = (selectedCard.card as any)?.spellEffect?.targetType || (selectedCard.card as any)?.battlecry?.targetType;
			debug.combat('[Battlecry Debug] Player minion clicked while selectedCard set:', {
				selectedCardName: selectedCard.card?.name,
				targetType,
				clickedMinion: card.card?.name
			});
			if (targetType === 'friendly_minion' || targetType === 'friendly_mech' || targetType === 'any_minion' || targetType === 'any' || targetType === 'minion' || targetType === 'any_character' || targetType === 'character') {
				const cardId = selectedCard.instanceId || (selectedCard as any).id;
				debug.combat('[Battlecry Debug] Playing card with target:', { cardId, targetId: card.instanceId });
				playCard(cardId, card.instanceId, 'minion');
				return;
			}
		}

		if (!isPlayerTurn) {
			debug.combat('[Attack Debug] Not player turn - ignoring click');
			return;
		}
		if (rawAttackingCard) {
			if (card.instanceId === rawAttackingCard.instanceId) {
				debug.combat('[Attack Debug] Deselecting attacker:', card.card?.name);
				selectAttacker(null);
			} else {
				debug.combat('[Attack Debug] Already have attacker selected - cannot select another');
			}
		} else {
			const freshBattlefield = gameState?.players?.player?.battlefield || [];
			const freshCard = freshBattlefield.find((c: any) => c.instanceId === card.instanceId);
			const cardToCheck = freshCard || card;

			debug.combat('[Attack Debug] Checking if card can attack:', {
				name: card.card?.name,
				freshCardFound: !!freshCard,
				canAttackFresh: freshCard?.canAttack,
				canAttackAdapted: card.canAttack,
				isSummoningSickFresh: freshCard?.isSummoningSick,
				isSummoningSickAdapted: card.isSummoningSick,
				attacksPerformed: cardToCheck.attacksPerformed,
				isFrozen: cardToCheck.isFrozen
			});

			const canAttackNow = cardToCheck.canAttack === true &&
				!cardToCheck.isSummoningSick &&
				!cardToCheck.isFrozen;

			if (canAttackNow) {
				debug.combat('[Attack Debug] Selecting attacker:', card.card?.name);
				selectAttacker(card);
			} else {
				const cardAsInstance = {
					...cardToCheck,
					card: card.card,
					instanceId: card.instanceId,
					isSummoningSick: cardToCheck.isSummoningSick ?? true,
					canAttack: cardToCheck.canAttack ?? false,
					attacksPerformed: cardToCheck.attacksPerformed ?? 0,
					isFrozen: cardToCheck.isFrozen ?? false
				};

				const canAttackResult = canCardAttackCheck(cardAsInstance as any, isPlayerTurn, true);

				if (canAttackResult) {
					debug.combat('[Attack Debug] Authoritative check passed, selecting attacker:', card.card?.name);
					selectAttacker(card);
				} else {
					debug.combat('[Attack Debug] Card cannot attack - summoning sickness or exhausted');
					addShakingTarget(card.instanceId);
				}
			}
		}
	}, [isPlayerTurn, rawAttackingCard, selectAttacker, selectedCard, playCard, heroPowerTargeting, executeHeroPowerEffect, gameState?.players?.player?.battlefield, addShakingTarget]);

	const handleOpponentCardClick = useCallback((card: any) => {
		if (heroPowerTargeting?.active && executeHeroPowerEffect) {
			const targetType = heroPowerTargeting.targetType;
			if (targetType === 'enemy_minion' || targetType === 'any_minion' || targetType === 'any') {
				const norseHero = ALL_NORSE_HEROES[heroPowerTargeting.norseHeroId];
				if (norseHero) {
					executeHeroPowerEffect(norseHero, norseHero.heroPower, card);
				}
				return;
			}
		}

		if (selectedCard) {
			const targetType = (selectedCard.card as any)?.spellEffect?.targetType || (selectedCard.card as any)?.battlecry?.targetType;
			debug.combat('[Battlecry Debug] Opponent minion clicked while selectedCard set:', {
				selectedCardName: selectedCard.card?.name,
				targetType,
				clickedMinion: card.card?.name
			});
			if (targetType === 'enemy_minion' || targetType === 'any_minion' || targetType === 'any' || targetType === 'enemy' || targetType === 'minion' || targetType === 'any_character' || targetType === 'character') {
				const cardId = selectedCard.instanceId || (selectedCard as any).id;
				debug.combat('[Battlecry Debug] Playing card with enemy target:', { cardId, targetId: card.instanceId });
				playCard(cardId, card.instanceId, 'minion');
				return;
			}
		}

		if (!isPlayerTurn || !rawAttackingCard) {
			debug.combat('[Attack Debug] handleOpponentCardClick - no attacker selected or not player turn');
			return;
		}
		debug.combat('[Attack Debug] Attacking', card.card?.name, 'with', rawAttackingCard?.card?.name);
		attackWithCard(rawAttackingCard.instanceId, card.instanceId);
	}, [isPlayerTurn, rawAttackingCard, attackWithCard, selectedCard, playCard, heroPowerTargeting, executeHeroPowerEffect]);

	const handleCardPlay = useCallback((card: any) => {
		debug.combat('[handleCardPlay Debug] Card clicked:', {
			name: card.card?.name || card.name,
			type: card.card?.type || card.type,
			hasBattlecry: !!(card.card?.battlecry || card.battlecry),
			battlecry: card.card?.battlecry || card.battlecry,
			keywords: card.card?.keywords || card.keywords,
			cardStructure: Object.keys(card)
		});

		if (!isPlayerTurn) return;
		const cardId = card.instanceId || card.id;
		if (!cardId) return;

		const spellEffect = card.card?.spellEffect;
		const targetType = spellEffect?.targetType || '';
		const isAoE = targetType.startsWith('all_') || targetType === 'all' || targetType === 'none' || targetType === 'self';
		const needsTarget = spellEffect?.requiresTarget === true ||
			(!isAoE && spellEffect?.requiresTarget !== false && spellEffect?.targetType && (
				spellEffect.targetType.includes('minion') ||
				spellEffect.targetType.includes('character') ||
				spellEffect.targetType.includes('enemy') ||
				spellEffect.targetType.includes('friendly') ||
				spellEffect.targetType === 'any'
			));
		if (card.card?.type === 'spell' && needsTarget) {
			const playerMinions = gameState?.players?.player?.battlefield || [];
			const opponentMinions = gameState?.players?.opponent?.battlefield || [];
			const spellTargetType = spellEffect?.targetType || '';

			let hasValidTargets = true;
			if (spellTargetType.includes('friendly_minion') || spellTargetType === 'friendly_minion') {
				hasValidTargets = playerMinions.length > 0;
			} else if (spellTargetType.includes('enemy_minion') || spellTargetType === 'enemy_minion') {
				hasValidTargets = opponentMinions.length > 0;
			} else if (spellTargetType.includes('any_minion') || spellTargetType === 'any_minion') {
				hasValidTargets = playerMinions.length > 0 || opponentMinions.length > 0;
			}

			if (!hasValidTargets) {
				const { addAnnouncement } = useUnifiedUIStore.getState();
				addAnnouncement({
					type: 'warning',
					title: 'No Valid Targets',
					subtitle: `${card.card.name} requires a minion to target`,
					icon: '⚔',
					duration: 2000
				});
				return;
			}

			selectCard(card);
			return;
		}

		const cardType = card.card?.type || card.type;
		const battlecry = card.card?.battlecry || card.battlecry;

		if (cardType === 'minion' && battlecry?.requiresTarget) {
			debug.combat('[Battlecry Debug] Card requires battlecry target, selecting:', card.card?.name || card.name);
			debug.combat('[Battlecry Debug] Battlecry details:', battlecry);
			selectCard(card);
			return;
		}

		// Emit battlecry VFX for minions with battlecries (freeze, damage, buff, etc.)
		if (cardType === 'minion' && battlecry) {
			const effectType = battlecry.type || 'default';
			const isAoEBattlecry = effectType === 'aoe_damage' || (effectType === 'damage' && battlecry.affectsAllEnemies);
			setTimeout(() => {
				emitBattlecryTriggered({
					sourceId: cardId,
					sourceName: card.card?.name || card.name || '',
					effectType: isAoEBattlecry ? 'aoe_damage' : effectType,
					player: 'player',
					value: battlecry.value ?? battlecry.buffAttack ?? 0
				});
			}, 150);
		}

		const useBlood = !!(card as any).payWithBlood;
		playCard(cardId, undefined, undefined, undefined, useBlood);
	}, [isPlayerTurn, playCard, selectCard, gameState]);

	return { handlePlayerCardClick, handleOpponentCardClick, handleCardPlay };
}
