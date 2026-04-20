/**
 * GainArmorAndImmunity SpellEffect Handler
 * 
 * Implements the "gain_armor_and_immunity" spellEffect effect.
 * Example card: Card ID: 3013
 */
import { GameState, CardInstance } from '../../../types';
import { SpellEffect } from '../../../types/CardTypes';

/**
 * Execute a gain_armor_and_immunity spellEffect effect
 * 
 * @param state Current game state
 * @param effect The effect to execute
 * @param sourceCard The card that triggered the effect
 * @param targetId Optional target ID if the effect requires a target
 * @returns Updated game state
 */
export function executeGainArmorAndImmunityGainArmorAndImmunity(
  state: GameState,
  effect: SpellEffect,
  sourceCard: CardInstance,
  targetId?: string
): GameState {
  // Create a new state to avoid mutating the original
  const newState = { ...state };
  
  
  const armorValue = effect.value || 0;
  const currentTurn = newState.currentTurn;

  newState.players = { ...state.players };
  if (currentTurn === 'player') {
    newState.players.player = { ...state.players.player };
    newState.players.player.heroArmor = Math.min(30, (newState.players.player.heroArmor || 0) + armorValue);
    (newState.players.player as any).isImmune = true;
  } else {
    newState.players.opponent = { ...state.players.opponent };
    newState.players.opponent.heroArmor = Math.min(30, (newState.players.opponent.heroArmor || 0) + armorValue);
    (newState.players.opponent as any).isImmune = true;
  }

  newState.gameLog = newState.gameLog || [];
  newState.gameLog.push({
    id: Math.random().toString(36).substring(2, 15),
    type: 'effect',
    player: newState.currentTurn,
    text: `${sourceCard.card.name} gained ${armorValue} armor and immunity`,
    timestamp: Date.now(),
    turn: newState.turnNumber,
    cardName: sourceCard.card.name,
    cardId: String(sourceCard.card.id)
  });
  
  return newState;
}

export default executeGainArmorAndImmunityGainArmorAndImmunity;
