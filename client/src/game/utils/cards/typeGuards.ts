/**
 * Type Guards for Card System
 * 
 * Provides type-safe narrowing for the CardData discriminated union.
 * These guards enable proper TypeScript type inference when accessing
 * type-specific properties like attack, health, durability, etc.
 * 
 * These guards work with both CardData (from types.ts) and Card (from CardTypes.ts)
 * to support the dual type system used in the codebase.
 * 
 * Usage:
 *   if (isMinion(card)) {
 *     console.log(card.attack); // TypeScript knows attack exists
 *   }
 */

import {
  CardData,
  MinionCardData,
  SpellCardData,
  WeaponCardData,
  HeroCardData,
  SecretCardData,
  LocationCardData,
  CardInstance
} from '../../types';

import { Card } from '../../types/CardTypes';

// Combined type that accepts both CardData and Card
type AnyCard = CardData | Card | null | undefined;
type OverloadCard = Exclude<AnyCard, null | undefined> & { overload?: { amount: number } };

// =============================================================================
// PRIMARY CARD TYPE GUARDS (Discriminated Union Narrowing)
// =============================================================================

/**
 * Type guard for minion cards
 * Narrows CardData/Card to MinionCardData when card.type === 'minion'
 */
export function isMinion(card: AnyCard): card is MinionCardData {
  return card != null && card.type === 'minion';
}

/**
 * Type guard for spell cards
 * Narrows CardData/Card to SpellCardData when card.type === 'spell'
 */
export function isSpell(card: AnyCard): card is SpellCardData {
  return card != null && card.type === 'spell';
}

/**
 * Type guard for weapon cards
 * Narrows CardData/Card to WeaponCardData when card.type === 'weapon'
 */
export function isWeapon(card: AnyCard): card is WeaponCardData {
  return card != null && card.type === 'weapon';
}

/**
 * Type guard for hero cards
 * Narrows CardData/Card to HeroCardData when card.type === 'hero'
 */
export function isHero(card: AnyCard): card is HeroCardData {
  return card != null && card.type === 'hero';
}

/**
 * Type guard for secret cards
 * Narrows CardData/Card to SecretCardData when card.type === 'secret'
 */
export function isSecret(card: AnyCard): card is SecretCardData {
  return card != null && card.type === 'secret';
}

/**
 * Type guard for location cards
 * Narrows CardData/Card to LocationCardData when card.type === 'location'
 */
export function isLocation(card: AnyCard): card is LocationCardData {
  return card != null && card.type === 'location';
}

/**
 * Type guard for pet cards (minions with a petStage field)
 */
export function isPet(card: AnyCard): boolean {
  return card != null && card.type === 'minion' && !!(card as any).petStage;
}

// =============================================================================
// PROPERTY-BASED TYPE GUARDS (For accessing optional properties safely)
// =============================================================================

/**
 * Check if a card has attack property (minions and weapons)
 */
export function hasAttack(card: AnyCard): card is MinionCardData | WeaponCardData {
  return card != null && (card.type === 'minion' || card.type === 'weapon');
}

/**
 * Check if a card has health property (minions and heroes)
 */
export function hasHealth(card: AnyCard): card is MinionCardData | HeroCardData {
  return card != null && (card.type === 'minion' || card.type === 'hero');
}

/**
 * Check if a card has durability property (weapons and locations)
 */
export function hasDurability(card: AnyCard): card is WeaponCardData | LocationCardData {
  return card != null && (card.type === 'weapon' || card.type === 'location');
}

/**
 * Check if a card can have combat stats (attack and health/durability)
 * Used for cards that can participate in combat
 */
export function hasCombatStats(card: AnyCard): card is MinionCardData | WeaponCardData {
  return card != null && (card.type === 'minion' || card.type === 'weapon');
}

// =============================================================================
// EFFECT-BASED TYPE GUARDS (For cards with specific effects)
// =============================================================================

/**
 * Check if a card has a battlecry effect (typically minions)
 */
export function hasBattlecry(card: AnyCard): boolean {
  return isMinion(card) && card.battlecry != null;
}

/**
 * Check if a card has a deathrattle effect (typically minions)
 */
export function hasDeathrattle(card: AnyCard): boolean {
  return isMinion(card) && card.deathrattle != null;
}

/**
 * Check if a card has a spell effect (spells)
 */
export function hasSpellEffect(card: AnyCard): boolean {
  return isSpell(card) && card.spellEffect != null;
}

/**
 * Check if a card has an aura effect (typically minions)
 */
export function hasAura(card: AnyCard): boolean {
  return isMinion(card) && card.aura != null;
}

/**
 * Check if a card has overload
 */
export function hasOverload(card: AnyCard): card is OverloadCard {
  if (card == null) return false;
  return 'overload' in card && card.overload != null;
}

// =============================================================================
// CARD INSTANCE TYPE GUARDS
// =============================================================================

/**
 * Check if a CardInstance contains a minion card
 */
export function isMinionInstance(instance: CardInstance | null | undefined): boolean {
  return instance != null && isMinion(instance.card);
}

/**
 * Check if a CardInstance contains a spell card
 */
export function isSpellInstance(instance: CardInstance | null | undefined): boolean {
  return instance != null && isSpell(instance.card);
}

/**
 * Check if a CardInstance contains a weapon card
 */
export function isWeaponInstance(instance: CardInstance | null | undefined): boolean {
  return instance != null && isWeapon(instance.card);
}

/**
 * Get attack value safely from a card (returns 0 if not applicable)
 */
export function getAttack(card: AnyCard): number {
  if (isMinion(card)) return card.attack ?? 0;
  if (isWeapon(card)) return card.attack ?? 0;
  // Fallback for Card type from CardTypes.ts
  if (card != null && 'attack' in card && typeof (card as any).attack === 'number') {
    return (card as any).attack;
  }
  return 0;
}

/**
 * Get health value safely from a card (returns 0 if not applicable)
 */
export function getHealth(card: AnyCard): number {
  if (isMinion(card)) return card.health ?? 0;
  if (isHero(card)) return card.health ?? 0;
  // Fallback for Card type from CardTypes.ts
  if (card != null && 'health' in card && typeof (card as any).health === 'number') {
    return (card as any).health;
  }
  return 0;
}

/**
 * Get durability value safely from a card (returns 0 if not applicable)
 */
export function getDurability(card: AnyCard): number {
  if (isWeapon(card)) return card.durability ?? 0;
  if (isLocation(card)) return card.durability ?? 0;
  // Fallback for Card type from CardTypes.ts
  if (card != null && 'durability' in card && typeof (card as any).durability === 'number') {
    return (card as any).durability;
  }
  return 0;
}

/**
 * Get mana cost value safely from a card (returns 0 if not set)
 */
export function getManaCost(card: AnyCard): number {
  if (card == null) return 0;
  return card.manaCost ?? 0;
}

// =============================================================================
// UTILITY TYPE GUARDS
// =============================================================================

/**
 * Check if value is a valid CardData object
 */
export function isCardData(value: unknown): value is CardData {
  if (value == null || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    (typeof obj.id === 'number' || typeof obj.id === 'string') &&
    typeof obj.name === 'string' &&
    typeof obj.type === 'string' &&
    ['minion', 'spell', 'weapon', 'hero', 'secret', 'location'].includes(obj.type as string)
  );
}

/**
 * Check if value is a valid CardInstance object
 */
export function isCardInstance(value: unknown): value is CardInstance {
  if (value == null || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.instanceId === 'string' &&
    isCardData(obj.card)
  );
}

/**
 * Assert that a card is a minion, throwing if not
 * Use when you're certain the card should be a minion
 */
export function assertMinion(card: AnyCard): asserts card is MinionCardData {
  if (!isMinion(card)) {
    throw new Error(`Expected minion card, got ${card?.type ?? 'null/undefined'}`);
  }
}

/**
 * Assert that a card is a spell, throwing if not
 */
export function assertSpell(card: AnyCard): asserts card is SpellCardData {
  if (!isSpell(card)) {
    throw new Error(`Expected spell card, got ${card?.type ?? 'null/undefined'}`);
  }
}

/**
 * Assert that a card is a weapon, throwing if not
 */
export function assertWeapon(card: AnyCard): asserts card is WeaponCardData {
  if (!isWeapon(card)) {
    throw new Error(`Expected weapon card, got ${card?.type ?? 'null/undefined'}`);
  }
}

// Export the AnyCard type for use elsewhere
export type { AnyCard };
