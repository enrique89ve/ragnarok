import { create } from 'zustand';
import { createCardInstance } from '../utils/cards/cardUtils';
import { debug } from '../config/debugConfig';
import { MAX_HAND_SIZE } from '../constants/gameConstants';
import type { GameState } from '../types';

const MAX_POKER_REWARD_RETRIES = 10;

interface PokerRewardStore {
	retries: number;
	grantPokerHandRewards: (gameState: GameState) => GameState | null;
	shouldDeferForDiscovery: (gameState: GameState) => boolean;
	resetRetries: () => void;
	incrementRetries: () => number;
	isMaxRetries: () => boolean;
}

export const usePokerRewardStore = create<PokerRewardStore>()((set, get) => ({
	retries: 0,

	grantPokerHandRewards: (gameState: GameState): GameState | null => {
		if (gameState?.mulligan?.active) {
			debug.log('[PokerRewards] Blocked: card game mulligan still active');
			return null;
		}

		set({ retries: 0 });

		try {
			debug.log('[PokerRewards] Granting poker hand rewards - card draw and +1 mana crystal');

			const player = gameState.players.player;
			const opponent = gameState.players.opponent;

			const MAX_MANA = 10;

			const newPlayerHand = [...player.hand];
			const newPlayerDeck = [...player.deck];

			// Base draw: 1 card per player
			let playerDrawCount = 1;
			let opponentDrawCount = 1;

			// Wager bonus draws from last resolution
			try {
				const combatStore = (globalThis as Record<string, any>).__ragnarokCombatStore;
				const lastState = combatStore?.getState?.();
				// Read wager AOE/draw from the most recent combat state
				const pBf = gameState.players?.player?.battlefield || [];
				const oBf = gameState.players?.opponent?.battlefield || [];
				for (const m of pBf) {
					const w = (m as any).card?.wagerEffect;
					if (!w) continue;
					if (w.type === 'showdown_hand_rank_draw' || w.type === 'showdown_win_draw_and_damage') {
						// Already counted in resolution.wagerDrawPlayer — check unified store
					}
					if (w.type === 'showdown_aoe_damage') {
						// Apply AOE damage to opponent's minions
						for (const om of (gameState.players?.opponent?.battlefield || [])) {
							if (om.card) (om.card as any).health = Math.max(0, ((om.card as any).health ?? 0) - (w.value || 0));
						}
					}
					if (w.type === 'all_in_buff_minions' && lastState?.pokerCombatState?.isAllInShowdown) {
						// Buff player's minions with +Attack
						for (const pm of pBf) {
							if (pm.card) (pm.card as any).attack = ((pm.card as any).attack ?? 0) + (w.buffAttack || 0);
						}
					}
				}
				for (const m of oBf) {
					const w = (m as any).card?.wagerEffect;
					if (!w) continue;
					if (w.type === 'showdown_aoe_damage') {
						for (const pm of (gameState.players?.player?.battlefield || [])) {
							if (pm.card) (pm.card as any).health = Math.max(0, ((pm.card as any).health ?? 0) - (w.value || 0));
						}
					}
					if (w.type === 'all_in_buff_minions' && lastState?.pokerCombatState?.isAllInShowdown) {
						for (const om of oBf) {
							if (om.card) (om.card as any).attack = ((om.card as any).attack ?? 0) + (w.buffAttack || 0);
						}
					}
				}
			} catch { /* safe to skip wager processing */ }

			for (let i = 0; i < playerDrawCount; i++) {
				if (newPlayerDeck.length > 0 && newPlayerHand.length < MAX_HAND_SIZE) {
					const drawnCardData = newPlayerDeck.pop()!;
					const cardInstance = createCardInstance(drawnCardData);
					newPlayerHand.push(cardInstance);
					debug.log(`[PokerRewards] Player drew card: ${cardInstance.card.name}`);
				}
			}

			const newOpponentHand = [...opponent.hand];
			const newOpponentDeck = [...opponent.deck];

			for (let i = 0; i < opponentDrawCount; i++) {
				if (newOpponentDeck.length > 0 && newOpponentHand.length < MAX_HAND_SIZE) {
					const drawnCardData = newOpponentDeck.pop()!;
					const cardInstance = createCardInstance(drawnCardData);
					newOpponentHand.push(cardInstance);
					debug.log(`[PokerRewards] Opponent drew card: ${cardInstance.card.name}`);
				}
			}

			const newPlayerMax = Math.min(player.mana.max + 1, MAX_MANA);
			const newOpponentMax = Math.min(opponent.mana.max + 1, MAX_MANA);

			const playerOverloaded = player.mana.overloaded || 0;
			const opponentOverloaded = opponent.mana.overloaded || 0;

			const newPlayerMana = {
				...player.mana,
				max: newPlayerMax,
				current: Math.max(0, newPlayerMax - playerOverloaded),
				overloaded: playerOverloaded,
				pendingOverload: player.mana.pendingOverload || 0
			};

			const newOpponentMana = {
				...opponent.mana,
				max: newOpponentMax,
				current: Math.max(0, newOpponentMax - opponentOverloaded),
				overloaded: opponentOverloaded,
				pendingOverload: opponent.mana.pendingOverload || 0
			};

			debug.log(`[PokerRewards] Player mana: ${player.mana.max} → ${newPlayerMana.max} (${newPlayerMana.current} available, ${playerOverloaded} overloaded)`);
			debug.log(`[PokerRewards] Opponent mana: ${opponent.mana.max} → ${newOpponentMana.max} (${newOpponentMana.current} available, ${opponentOverloaded} overloaded)`);

			const clearSummoningSickness = (battlefield: typeof player.battlefield) =>
				battlefield.map(m => m.isSummoningSick
					? { ...m, isSummoningSick: false, canAttack: !m.isFrozen, attacksPerformed: 0 }
					: { ...m, attacksPerformed: 0 }
				);

			const newState: GameState = {
				...gameState,
				players: {
					...gameState.players,
					player: {
						...player,
						hand: newPlayerHand,
						deck: newPlayerDeck,
						mana: newPlayerMana,
						battlefield: clearSummoningSickness(player.battlefield)
					},
					opponent: {
						...opponent,
						hand: newOpponentHand,
						deck: newOpponentDeck,
						mana: newOpponentMana,
						battlefield: clearSummoningSickness(opponent.battlefield)
					}
				}
			};

			debug.log(`[PokerRewards] Card draw and mana grant complete`);
			return newState;
		} catch (error) {
			debug.error('[PokerRewards] Error granting rewards:', error);
			return null;
		}
	},

	shouldDeferForDiscovery: (gameState: GameState): boolean => {
		if (!gameState?.discovery?.active) return false;
		const { retries } = get();
		if (retries >= MAX_POKER_REWARD_RETRIES) {
			debug.error('[PokerRewards] Max retries reached while waiting for discovery — granting anyway');
			set({ retries: 0 });
			return false;
		}
		set({ retries: retries + 1 });
		debug.combat(`[PokerRewards] Deferred: discovery active, retry ${retries + 1}/${MAX_POKER_REWARD_RETRIES}`);
		return true;
	},

	resetRetries: () => set({ retries: 0 }),

	incrementRetries: (): number => {
		const next = get().retries + 1;
		set({ retries: next });
		return next;
	},

	isMaxRetries: (): boolean => {
		return get().retries >= MAX_POKER_REWARD_RETRIES;
	},
}));
