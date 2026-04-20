/**
 * Card Types
 * 
 * This file defines the type interfaces for cards in the game.
 */
import { 
  CardEffect,
  BattlecryEffectType,
  SpellEffectTypeString,
  DeathrattleEffectType 
} from './EffectTypes';

export type CardType = 'minion' | 'spell' | 'weapon' | 'hero' | 'hero_power' | 'poker_spell' | 'artifact' | 'armor';
export type CardRarity = 'basic' | 'common' | 'rare' | 'epic' | 'mythic' | 'token';
export type HeroClass = 
  | 'neutral' 
  | 'mage' 
  | 'warrior' 
  | 'priest' 
  | 'paladin' 
  | 'hunter' 
  | 'druid' 
  | 'warlock' 
  | 'shaman' 
  | 'rogue' 
  | 'berserker' 
  | 'deathknight';

export type MinionRace = 
  | 'none' 
  | 'beast' 
  | 'dragon' 
  | 'elemental' 
  | 'undead'
  | 'giant'
  | 'automaton'
  | 'titan'
  | 'naga'
  | 'einherjar'
  | 'spirit'
  | 'treant'
  | 'all'
  | 'demon'
  | 'mech'
  | 'murloc'
  | 'pirate'
  | 'totem';

// Battlecry effect interface with typed effect type
export interface BattlecryEffect {
  type: BattlecryEffectType | string;
  [key: string]: any;
}

// Deathrattle effect interface with typed effect type
export interface DeathrattleEffect {
  type: DeathrattleEffectType | string;
  targetType?: string;
  value?: number;
  condition?: string;
  summonCardId?: number | string;
  buffAttack?: number;
  buffHealth?: number;
  cardId?: string;
  targetFromBattlecry?: boolean;
  count?: number;
  [key: string]: any;
}

// Spell effect interface with typed effect type
export interface SpellEffect {
  type: SpellEffectTypeString | string;
  [key: string]: any;
}

// ==================== POKER SPELL TYPES ====================

export type PokerSpellEffectType = 
  | 'bluff_rune'           // Fake raise token - opponent sees pot increase, actual unchanged
  | 'fate_peek'            // Reveal 1 opponent hole card
  | 'stamina_shield'       // Absorb 1 STA on fold penalty
  | 'hole_swap'            // Swap 1 your/1 opp hole card
  | 'echo_bet'             // Repeat last bet action free
  | 'shadow_fold'          // Fold without revealing hand
  | 'run_twice'            // Dual boards on all-in, average hands
  | 'river_rewrite'        // Reroll River card once
  | 'norns_glimpse'        // Peek at next community card
  | 'fold_curse'           // Next opp fold: -1 extra STA
  | 'blood_bet'            // Pay 1 STA: Force opponent to match or fold
  | 'void_stare'           // Nullify opponent's bluff token
  | 'all_in_aura'          // Next all-in: +0.1× hand multiplier
  | 'ragnarok_gambit'      // Reveal all cards, skip remaining betting
  | 'destiny_override';    // Choose River card from 3 options

export type PokerSpellTiming = 'pre_deal' | 'on_bet' | 'on_fold' | 'on_all_in' | 'on_river';

export interface PokerSpellEffect {
  effectType: PokerSpellEffectType;
  timing: PokerSpellTiming;
  duration?: 'instant' | 'this_combat' | 'next_action';
  targetSelf?: boolean;
  targetOpponent?: boolean;
  value?: number;
}

// Combo effect interface
export interface ComboEffect {
  type: string;
  [key: string]: any;
}

// Base Card interface - common properties for all card types
export interface Card {
  id: number | string;
  name: string;
  description?: string;
  manaCost: number;
  type: CardType;
  rarity?: CardRarity;
  heroClass?: HeroClass | string;
  keywords?: string[];
  flavorText?: string;
  collectible?: boolean;
  
  // Effect properties
  battlecry?: BattlecryEffect;
  deathrattle?: DeathrattleEffect;
  spellEffect?: SpellEffect;
  pokerSpellEffect?: PokerSpellEffect;
  combo?: ComboEffect;
  aura?: any;
  onDeath?: any;
  onPlay?: any;
  endOfTurn?: any;
  startOfTurn?: any;
  
  // Minion-specific properties
  attack?: number;
  health?: number;
  race?: MinionRace;
  attacksPerTurn?: number;
  
  // Weapon-specific properties
  durability?: number;
  
  // Hero-specific properties
  armor?: number;
  heroPower?: any;
}

// Minion card interface
export interface MinionCard extends Card {
  type: 'minion';
  attack: number;
  health: number;
  race?: MinionRace;
}

// Spell card interface
export interface SpellCard extends Card {
  type: 'spell';
  spellEffect?: SpellEffect;
}

// Weapon card interface
export interface WeaponCard extends Card {
  type: 'weapon';
  attack: number;
  durability: number;
}

// Hero card interface
export interface HeroCard extends Card {
  type: 'hero';
  armor: number;
  heroPower: any;
}

// Hero power card interface
export interface HeroPowerCard extends Card {
  type: 'hero_power';
  spellEffect: SpellEffect;
}

// Poker spell card interface - spells that affect poker combat
export interface PokerSpellCard extends Card {
  type: 'poker_spell';
  pokerSpellEffect: PokerSpellEffect;
}

// Artifact card interface
export interface ArtifactCard extends Card {
  type: 'artifact';
  attack: number;
  heroId: string;
}

// Armor card interface
export interface ArmorCard extends Card {
  type: 'armor';
  armorSlot: 'helm' | 'chest' | 'greaves';
  armorValue: number;
  setId?: string;
  armorPassive?: {
    type: string;
    value?: number;
    condition?: string;
  };
}

// Card instance with game state
export interface CardInstance {
  instanceId: string;
  card: Card;
  currentHealth?: number;
  currentAttack?: number;
  canAttack: boolean;
  isPlayed: boolean;
  isSummoningSick: boolean;
  hasDivineShield?: boolean;
  isPoisonous?: boolean;
  hasLifesteal?: boolean;
  isRush?: boolean;
  isMagnetic?: boolean;
  isFrozen?: boolean;
  attacksPerformed: number;
  mechAttachments?: CardInstance[];
  
  // Status Effects (Ragnarok unique system)
  isPoisonedDoT?: boolean;     // Takes 3 damage at start of turn
  isBleeding?: boolean;        // Takes +3 damage when damaged
  isParalyzed?: boolean;       // 50% chance to fail actions
  isWeakened?: boolean;        // Has -3 Attack
  isVulnerable?: boolean;      // Takes +3 damage from all sources
  isMarked?: boolean;          // Can always be targeted (ignores stealth/protection)
  isSilenced?: boolean;        // Cannot use abilities
  isBurning?: boolean;         // Takes 3 damage when attacking, deals +3 damage
  
  hasReborn?: boolean;
  isPlayerOwned?: boolean;

  // Instance-level keyword overrides (takes precedence over card.keywords when present)
  instanceKeywords?: string[];

  // Extension fields
  animationPosition?: {
    x: number;
    y: number;
  };

  // NFT — present if this is a Hive L1 NFT card; absent for demo/dev cards
  nft_id?: string;
}

// Card database interface
export interface CardDatabase {
  getCardById(id: number): Card | undefined;
  getAllCards(): Card[];
  getCardsByClass(heroClass: HeroClass): Card[];
  getCardsByType(type: CardType): Card[];
  getCollectibleCards(): Card[];
}

export default Card;