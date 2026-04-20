/**
 * attackUtils.ts
 * 
 * SINGLE SOURCE OF TRUTH for attack eligibility in the game.
 * All attack checks MUST use these functions to ensure consistent behavior.
 * 
 * Attack rules:
 * - Minions have summoning sickness when first played
 * - Charge: Can attack immediately, including heroes
 * - Rush: Can attack minions immediately, heroes only after sickness wears off
 * - Windfury: Can attack twice per turn
 * - Frozen: Cannot attack
 */

import { CardInstance } from '../types';
import { debug } from '../config/debugConfig';
import { hasKeyword } from '../utils/cards/keywordUtils';

export interface AttackEligibilityResult {
  canAttack: boolean;
  reason?: string;
}

/**
 * AUTHORITATIVE function to determine if a card can attack.
 * This is the single source of truth - all other attack checks should use this.
 * 
 * @param card The card instance to check
 * @param isPlayerTurn Whether it's currently the player's turn
 * @param verbose Whether to log debug info (default: false)
 * @returns AttackEligibilityResult with canAttack boolean and optional reason
 */
export function canCardAttack(
  card: CardInstance, 
  isPlayerTurn: boolean,
  verbose: boolean = false
): boolean {
  const result = getAttackEligibility(card, isPlayerTurn);
  
  if (verbose) {
    debug.combat(`[canCardAttack] ${card.card.name}: ${result.canAttack ? 'CAN attack' : `CANNOT attack - ${result.reason}`}`);
  }
  
  return result.canAttack;
}

/**
 * Get detailed attack eligibility with reason for why a card can or cannot attack.
 * Useful for UI feedback and debugging.
 */
export function getAttackEligibility(card: CardInstance, isPlayerTurn: boolean): AttackEligibilityResult {
  // Must be player's turn
  if (!isPlayerTurn) {
    return { canAttack: false, reason: 'Not your turn' };
  }
  
  // Card must be a minion to attack
  if (card.card.type !== 'minion') {
    return { canAttack: false, reason: 'Only minions can attack' };
  }
  
  // Check for cant_attack keyword
  if (hasKeyword(card, 'cant_attack')) {
    return { canAttack: false, reason: 'Minion cannot attack' };
  }

  // Check for 0 attack
  const attackValue = (card.card as any).attack || 0;
  if (attackValue <= 0) {
    return { canAttack: false, reason: 'Minion has 0 attack' };
  }
  
  // Check if frozen
  if (card.isFrozen) {
    return { canAttack: false, reason: 'Minion is frozen' };
  }
  
  // Card needs the canAttack flag (set by turn reset logic)
  if (!card.canAttack) {
    return { canAttack: false, reason: 'Minion cannot attack (exhausted or disabled)' };
  }
  
  // Check summoning sickness
  const hasCharge = hasKeyword(card, 'charge');
  const hasRush = hasKeyword(card, 'rush');
  
  if (card.isSummoningSick && !hasCharge && !hasRush) {
    return { canAttack: false, reason: 'Summoning sickness' };
  }
  
  // Check attack limit (Windfury allows 2 attacks, Mega-Windfury allows 4)
  const hasWindfury = hasKeyword(card, 'windfury');
  const hasMegaWindfury = hasKeyword(card, 'mega_windfury');
  const attackLimit = hasMegaWindfury ? 4 : (hasWindfury ? 2 : 1);
  const attacksPerformed = card.attacksPerformed || 0;
  
  if (attacksPerformed >= attackLimit) {
    return { canAttack: false, reason: `Already attacked ${attacksPerformed}/${attackLimit} times` };
  }
  
  // All checks passed
  return { canAttack: true };
}

/**
 * Determines if a target is valid for an attack
 */
export function isValidAttackTarget(
  attackingCard: CardInstance, 
  targetCard: CardInstance, 
  opponentTauntCards: CardInstance[]
): boolean {
  // Check if opponent has any taunt minions
  const hasTaunt = opponentTauntCards.length > 0;

  // Flying minions bypass taunt — they can attack any target
  const hasFlying = hasKeyword(attackingCard, 'flying');

  // If opponent has taunt minions, can only attack those, unless target is also a taunt
  // Exception: flying minions ignore taunt
  if (hasTaunt && !hasFlying &&
      !opponentTauntCards.some(card => card.instanceId === targetCard.instanceId) &&
      targetCard.card.type !== 'hero') {
    return false;
  }
  
  // Can't attack friendly minions
  if (attackingCard.isPlayerOwned === targetCard.isPlayerOwned) {
    return false;
  }
  
  // If the attacker has rush, it can only attack minions (not heroes) in the turn it's played
  if (attackingCard.isSummoningSick && hasKeyword(attackingCard, 'rush') && targetCard.card.type === 'hero') {
    return false;
  }
  
  // Target is valid
  return true;
}

/**
 * Gets all valid targets for an attacking card
 */
export function getValidTargets(
  attackingCard: CardInstance,
  opponentCards: CardInstance[],
  opponentHero: CardInstance
): CardInstance[] {
  // If card can't attack, no valid targets
  if (!attackingCard.canAttack) return [];
  
  // Check for taunt minions
  const tauntMinions = opponentCards.filter(card =>
    hasKeyword(card, 'taunt')
  );

  // Flying minions bypass taunt — all targets remain valid
  const attackerFlying = hasKeyword(attackingCard, 'flying');

  // If there are taunt minions and attacker is NOT flying, they are the only valid targets
  if (tauntMinions.length > 0 && !attackerFlying) {
    return tauntMinions;
  }
  
  // Otherwise, all opponent cards and hero are valid targets
  // Exception: Rush minions can't attack heroes in the turn they're played
  const hasRushLimitation = attackingCard.isSummoningSick &&
                         hasKeyword(attackingCard, 'rush');
  
  const targets = [...opponentCards];
  
  // Only add hero as target if not restricted by rush
  if (!hasRushLimitation) {
    targets.push(opponentHero);
  }
  
  return targets;
}