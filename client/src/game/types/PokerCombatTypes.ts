/**
 * PokerCombatTypes.ts
 * 
 * Type definitions for the Ragnarok Poker-inspired combat system.
 * Integrates pet battles with poker mechanics for PvP battles.
 */

/**
 * Poker card suits
 */
export type CardSuit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

/**
 * Poker card values
 */
export type CardValue = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

/**
 * A single poker/playing card
 */
export interface PokerCard {
  suit: CardSuit;
  value: CardValue;
  numericValue: number; // For comparison (A=14, K=13, Q=12, J=11, etc.)
}

/**
 * Poker hand rankings with Ragnarok-themed names
 */
export enum PokerHandRank {
  HIGH_CARD = 1,
  RUNE_MARK = 2,           // One Pair
  DUAL_RUNES = 3,          // Two Pair
  THORS_HAMMER = 4,        // Three of a Kind
  FATES_PATH = 5,          // Straight
  ODINS_EYE = 6,           // Flush
  VALHALLAS_BLESSING = 7,  // Full House
  GODLY_POWER = 8,         // Four of a Kind
  DIVINE_ALIGNMENT = 9,    // Straight Flush
  RAGNAROK = 10            // Royal Flush
}

/**
 * Hand rank display names (Norse-themed)
 */
export const HAND_RANK_NAMES: Record<PokerHandRank, string> = {
  [PokerHandRank.HIGH_CARD]: '',
  [PokerHandRank.RUNE_MARK]: 'Rune Mark',
  [PokerHandRank.DUAL_RUNES]: 'Dual Runes',
  [PokerHandRank.THORS_HAMMER]: "Thor's Hammer",
  [PokerHandRank.FATES_PATH]: "Fate's Path",
  [PokerHandRank.ODINS_EYE]: "Odin's Eye",
  [PokerHandRank.VALHALLAS_BLESSING]: "Valhalla's Blessing",
  [PokerHandRank.GODLY_POWER]: 'Godly Power',
  [PokerHandRank.DIVINE_ALIGNMENT]: 'Divine Alignment',
  [PokerHandRank.RAGNAROK]: 'RAGNAROK'
};

/**
 * Traditional poker hand names for display
 */
export const TRADITIONAL_HAND_NAMES: Record<PokerHandRank, string> = {
  [PokerHandRank.HIGH_CARD]: '',
  [PokerHandRank.RUNE_MARK]: 'One Pair',
  [PokerHandRank.DUAL_RUNES]: 'Two Pair',
  [PokerHandRank.THORS_HAMMER]: 'Three of a Kind',
  [PokerHandRank.FATES_PATH]: 'Straight',
  [PokerHandRank.ODINS_EYE]: 'Flush',
  [PokerHandRank.VALHALLAS_BLESSING]: 'Full House',
  [PokerHandRank.GODLY_POWER]: 'Four of a Kind',
  [PokerHandRank.DIVINE_ALIGNMENT]: 'Straight Flush',
  [PokerHandRank.RAGNAROK]: 'Royal Flush'
};

/**
 * Get combined display name with Norse theme + traditional poker name
 */
export function getCombinedHandName(rank: PokerHandRank): string {
  const norse = HAND_RANK_NAMES[rank];
  const traditional = TRADITIONAL_HAND_NAMES[rank];
  if (norse === traditional) return norse;
  return `${norse} (${traditional})`;
}

// Poker combat uses pure NLH rules — no hand-rank damage multipliers.
// Best hand wins the pot. Skill is in betting, reading, and folding.

/**
 * Evaluated poker hand
 */
export interface EvaluatedHand {
  rank: PokerHandRank;
  cards: PokerCard[];
  highCard: PokerCard;
  multiplier: number;
  displayName: string;
  /**
   * Tie-breaker values for comparing same-ranked hands.
   * Order depends on hand type:
   * - High Card: [c1, c2, c3, c4, c5] all 5 cards descending
   * - One Pair: [pairValue, k1, k2, k3] pair value + 3 kickers
   * - Two Pair: [highPair, lowPair, kicker]
   * - Three of Kind: [tripValue, k1, k2]
   * - Straight: [highCard] (wheel = 5)
   * - Flush: [c1, c2, c3, c4, c5] all 5 cards descending
   * - Full House: [tripValue, pairValue]
   * - Four of Kind: [quadValue, kicker]
   * - Straight Flush/Royal: [highCard]
   */
  tieBreakers: number[];
}

/**
 * Combat phases in the poker attack system
 * IMPORTANT: Mulligan MUST happen first before any poker cards are dealt
 */
export enum CombatPhase {
  FIRST_STRIKE = 'first_strike', // First strike animation - attacker deals 15 damage
  MULLIGAN = 'mulligan',      // Mulligan phase - replace cards in hand (MUST be first)
  SPELL_PET = 'spell_pet',    // Cast spells and use pets
  PRE_FLOP = 'pre_flop',      // Pre-flop betting round (blinds posted, no community cards)
  FAITH = 'faith',            // First 3 cards (flop)
  FORESIGHT = 'foresight',    // 4th card (turn)
  DESTINY = 'destiny',        // 5th card (river)
  RESOLUTION = 'resolution'   // Resolve combat
}

/**
 * Combat action types (poker-inspired)
 */
export enum CombatAction {
  ATTACK = 'attack',           // Bet - commit HP to deal damage
  COUNTER_ATTACK = 'counter',  // Reraise - increase attack commitment
  ENGAGE = 'engage',           // Call - match opponent's attack
  BRACE = 'brace',             // Fold - defensive stance with small HP penalty
  DEFEND = 'defend'            // Check - no action, maintain position
}

/**
 * Combat action details
 */
export interface CombatActionDetails {
  action: CombatAction;
  hpCommitment?: number;       // HP committed for attack/counter
  timestamp: number;
}

/**
 * Elemental types for pets - imported from utils/elements for single source of truth
 */
import { type ElementType, ELEMENT_STRENGTHS, getElementAdvantage, ELEMENT_COLORS, ELEMENT_ICONS } from '../utils/elements';
export type { ElementType };
export { ELEMENT_STRENGTHS, getElementAdvantage, ELEMENT_COLORS, ELEMENT_ICONS };

/**
 * Elemental interaction results
 */
export type ElementalAdvantage = 'strong' | 'weak' | 'neutral';

/**
 * Elemental damage modifiers (used for poker damage calculations - currently unused)
 */
export const ELEMENTAL_MODIFIERS: Record<ElementalAdvantage, number> = {
  strong: 1.25,
  weak: 0.75,
  neutral: 1.0
};

/**
 * Pet statistics
 */
export interface PetStats {
  maxHealth: number;
  currentHealth: number;
  maxStamina: number;
  currentStamina: number;
  /** @deprecated Speed system removed - kept for data compatibility */
  speed: number;
  attack: number;
  /** @deprecated Rage system removed - kept for data compatibility */
  rage: number;
  /** @deprecated Rage system removed - kept for data compatibility */
  maxRage: number;
  level: number;            // 1-9
  element: ElementType;
}

/**
 * Pet ability types
 */
export type PetAbilityType = 'passive' | 'active' | 'ultimate';

/**
 * Pet ability definition
 */
export interface PetAbility {
  id: string;
  name: string;
  type: PetAbilityType;
  description: string;
  staminaCost?: number;     // For active abilities
  /** @deprecated Rage system removed - kept for data compatibility */
  rageCost?: number;
  cooldown?: number;        // Turns until usable again
  currentCooldown?: number;
  effect: PetAbilityEffect;
}

/**
 * Pet ability effect
 */
export interface PetAbilityEffect {
  type: string;
  value?: number;
  duration?: number;
  targetType?: 'self' | 'ally' | 'enemy' | 'all';
  statusEffect?: StatusEffectType; // Status effect to apply (for buff/debuff types)
}

/**
 * Complete pet data structure
 */
export interface PetData {
  id: string;
  name: string;
  imageUrl?: string;
  rarity: 'basic' | 'common' | 'rare' | 'epic' | 'mythic';
  petClass: 'pawn' | 'standard' | 'queen' | 'king';
  stats: PetStats;
  abilities: PetAbility[];
  spellSlots: number;       // Based on class
  equippedSpells: string[]; // Spell IDs
  battleHistory?: BattleRecord[];
  nftId?: string;           // For NFT integration
  norseHeroId?: string;     // Links to NorseHero for hero power/weapon/passive
}

/**
 * Battle record for pet history
 */
export interface BattleRecord {
  opponentId: string;
  opponentName: string;
  result: 'victory' | 'defeat' | 'draw';
  damageDealt: number;
  damageTaken: number;
  timestamp: number;
}

/**
 * Status effects that can be applied to pets
 */
export type StatusEffectType = 
  | 'poisoned'
  | 'blessed'
  | 'cursed'
  | 'burning'
  | 'frozen'
  | 'shielded'
  | 'enraged';

/**
 * Active status effect on a pet
 */
export interface StatusEffect {
  type: StatusEffectType;
  duration: number;         // Remaining turns
  value?: number;           // Effect strength
  sourceId: string;         // Who applied it
}

/**
 * Elemental buff applied at combat start
 */
export interface ElementBuff {
  hasAdvantage: boolean;
  attackBonus: number;
  healthBonus: number;
  armorBonus: number;
}

/**
 * Player's combat state during a battle
 */
export interface PlayerCombatState {
  playerId: string;
  playerName: string;
  pet: PetData;
  holeCards: PokerCard[];   // Player's 2 private cards
  currentAction?: CombatAction;
  hpCommitted: number;      // Total HP at risk (blind + ante + bets)
  preBlindHealth: number;   // HP BEFORE blinds/antes were deducted (for proper HP persistence back to chess)
  heroArmor: number;        // Armor that absorbs damage before HP, granted by elemental advantage (+20)
  statusEffects: StatusEffect[];
  mana: number;
  maxMana: number;
  isReady: boolean;
  elementBuff?: ElementBuff; // Elemental advantage buff applied at combat start
}

/**
 * Community cards state (Faith/Foresight/Destiny)
 */
export interface CommunityCards {
  faith: PokerCard[];       // First 3 cards
  foresight?: PokerCard;    // 4th card
  destiny?: PokerCard;      // 5th card
}

/**
 * Position roles in poker (fixed for entire match in Ragnarok)
 */
export type PokerPosition = 'small_blind' | 'big_blind';

/**
 * Blind configuration for standard poker
 * BB = 10, SB = 5, Ante = 0.5 each
 */
export interface BlindConfig {
  bigBlind: number;        // 10 HP
  smallBlind: number;      // 5 HP
  ante: number;            // 0.5 HP per player
}

/**
 * Default blind configuration
 */
export const DEFAULT_BLIND_CONFIG: BlindConfig = {
  bigBlind: 10,
  smallBlind: 5,
  ante: 0.5
};

/**
 * Complete poker combat state
 */
export interface PokerCombatState {
  combatId: string;
  phase: CombatPhase;
  player: PlayerCombatState;
  opponent: PlayerCombatState;
  communityCards: CommunityCards;
  currentBet: number;       // Current HP commitment to match
  pot: number;              // Total committed HP
  turnTimer: number;        // Seconds remaining
  maxTurnTime: number;      // Default 27 seconds
  actionHistory: CombatActionDetails[];
  winner?: 'player' | 'opponent' | 'draw' | null;
  minBet: number;           // Minimum bet/raise amount (5 HP = big blind in Ragnarok)
  openerIsPlayer: boolean;  // True if player acts first (SB acts first preflop)
  preflopBetMade: boolean;  // True once a raise has been made beyond the big blind
  foldWinner?: 'player' | 'opponent'; // Set when someone folds - winner by forfeit
  
  // Active player tracking - single source of truth for whose turn it is
  activePlayerId: string | null;  // Player ID whose turn it is, null if round is complete
  actionsThisRound: number;       // Number of actions taken this betting round (resets each phase)
  
  // Blind/Ante system (standard poker rules)
  blindConfig: BlindConfig;
  playerPosition: PokerPosition;   // Player's fixed position for entire match
  opponentPosition: PokerPosition; // Opponent's fixed position for entire match
  blindsPosted: boolean;           // True once blinds have been collected this hand
  
  // All-in showdown - when both players have no HP left to bet
  isAllInShowdown: boolean;        // True when both players are all-in, auto-reveal remaining cards
  
  // First strike system - attacker deals 15 damage at combat start
  firstStrike?: {
    damage: number;
    target: 'player' | 'opponent'; // Who receives the damage (the defender)
    completed: boolean;
  };
  
  // SPELL_PET phase timing - used to give players time to play cards
  spellPetPhaseStartTime?: number; // Timestamp when SPELL_PET phase started
}

/**
 * Combat resolution result
 */
export interface CombatResolution {
  winner: 'player' | 'opponent' | 'draw';
  resolutionType: 'fold' | 'showdown';
  playerHand: EvaluatedHand;
  opponentHand: EvaluatedHand;
  playerDamage: number;
  opponentDamage: number;
  playerFinalHealth: number;
  opponentFinalHealth: number;
  foldPenalty?: number; // Damage taken by folder (SB + ANTE + committed HP = ~6+ HP)
  whoFolded?: 'player' | 'opponent'; // Who folded (also loses 1 STA)
  // Wager effect metadata for post-combat card game layer
  wagerDrawPlayer?: number;          // Cards to draw for player
  wagerDrawOpponent?: number;        // Cards to draw for opponent
  wagerAoeDamagePlayer?: number;     // AOE to enemy minions (player's wager)
  wagerAoeDamageOpponent?: number;   // AOE to enemy minions (opponent's wager)
}

/**
 * Spell data for combat
 */
export interface CombatSpell {
  id: string;
  name: string;
  manaCost: number;
  level: number;            // 1-9
  description: string;
  targetType: 'self' | 'ally' | 'enemy' | 'all';
  effect: SpellEffect;
}

/**
 * Spell effect definition
 */
export interface SpellEffect {
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'summon' | 'draw' | 'special';
  value?: number;
  duration?: number;
  statusEffect?: StatusEffectType;
}

/**
 * Extra damage modifiers
 */
export interface DamageModifiers {
  extraDamage: number;      // Flat bonus
  oppWeakAttack: number;    // Percentage reduction to opponent attack
  slowerOppStamina: number; // Percentage slower stamina regen for opponent
  /** @deprecated Critical strike system removed for simplicity */
  criticalChance: number;   // Chance for 2x damage (deprecated)
}

/**
 * Calculate final damage based on all factors
 * @deprecated Elemental modifiers are now applied as pet buffs at combat start, not per-damage
 */
export function calculateFinalDamage(
  baseAttack: number,
  hpBet: number,
  handMultiplier: number,
  _elementalModifier: number = 1.0, // Deprecated parameter, kept for API compatibility
  extraDamage: number = 0
): number {
  // NOTE: Elemental modifiers removed - now applied as pre-match pet buffs
  return Math.floor((baseAttack + hpBet) * handMultiplier + extraDamage);
}

/**
 * Get elemental advantage between two elements
 * Uses ELEMENT_STRENGTHS from ChessTypes for consistency
 */
export function getElementalAdvantage(attacker: ElementType, defender: ElementType): ElementalAdvantage {
  if (attacker === 'neutral' || defender === 'neutral') return 'neutral';
  
  // Check if attacker is strong against defender
  const strengths = ELEMENT_STRENGTHS[attacker];
  if (strengths && strengths.includes(defender)) {
    return 'strong';
  }
  
  // Check if defender is strong against attacker (meaning attacker is weak)
  const defenderStrengths = ELEMENT_STRENGTHS[defender];
  if (defenderStrengths && defenderStrengths.includes(attacker)) {
    return 'weak';
  }
  
  return 'neutral';
}

/**
 * Get spell slots based on pet class
 */
export function getSpellSlots(petClass: PetData['petClass']): number {
  switch (petClass) {
    case 'pawn': return 22;
    case 'standard': return 30;
    case 'queen': return 33;
    case 'king': return 35;
  }
}

/**
 * Create a standard 52-card deck
 */
export function createPokerDeck(): PokerCard[] {
  const suits: CardSuit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
  const values: CardValue[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck: PokerCard[] = [];
  
  for (const suit of suits) {
    for (const value of values) {
      const numericValue = value === 'A' ? 14 
        : value === 'K' ? 13 
        : value === 'Q' ? 12 
        : value === 'J' ? 11 
        : parseInt(value);
      
      deck.push({ suit, value, numericValue });
    }
  }
  
  return deck;
}

/**
 * Shuffle a deck of cards
 */
export function shuffleDeck(deck: PokerCard[]): PokerCard[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Helper: Calculate stamina from HP (1 stamina per 10 HP)
 */
export function calculateStaminaFromHP(maxHealth: number): number {
  return Math.floor(maxHealth / 10);
}

/**
 * Default pet stats by class
 * Stamina is derived from HP: 1 stamina per 10 HP
 */
export const DEFAULT_PET_STATS: Record<PetData['petClass'], Omit<PetStats, 'element'>> = {
  pawn: {
    maxHealth: 100,
    currentHealth: 100,
    maxStamina: 10, // Flat 100 HP / 10 STA for all heroes
    currentStamina: 10,
    speed: 5.0,
    attack: 10,
    rage: 0,
    maxRage: 10,
    level: 1
  },
  standard: {
    maxHealth: 100,
    currentHealth: 100,
    maxStamina: 10, // Flat 100 HP / 10 STA for all heroes
    currentStamina: 10,
    speed: 5.0,
    attack: 15,
    rage: 0,
    maxRage: 10,
    level: 1
  },
  queen: {
    maxHealth: 100,
    currentHealth: 100,
    maxStamina: 10, // Flat 100 HP / 10 STA for all heroes
    currentStamina: 10,
    speed: 6.0,
    attack: 18,
    rage: 0,
    maxRage: 10,
    level: 1
  },
  king: {
    maxHealth: 100,
    currentHealth: 100,
    maxStamina: 10, // Flat 100 HP / 10 STA for all heroes
    currentStamina: 10,
    speed: 4.0,
    attack: 20,
    rage: 0,
    maxRage: 10,
    level: 1
  }
};
