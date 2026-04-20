/**
 * Card Builder System
 * 
 * Provides a fluent API for creating type-safe card definitions.
 * This makes it easier to create cards with proper validation and reduces errors.
 */
import { CardData, CardType, CardRarity, BattlecryEffect, DeathrattleEffect, SpellEffect } from '../../types';
import { registerCard } from './cardRegistry';

/**
 * Interface for Choose One effect options
 */
export interface ChooseOneEffect {
  id: string;
  name: string;
  description: string;
  effect: any;
}

/**
 * Builder class for creating cards with a fluent API
 */
export class CardBuilder {
  private card: Record<string, any> = {};
  private categories: string[] = [];
  
  /**
   * Set the card ID
   * @param id - Unique identifier for the card
   */
  id(id: number): CardBuilder {
    this.card.id = id;
    return this;
  }
  
  /**
   * Set the card name
   * @param name - Display name of the card
   */
  name(name: string): CardBuilder {
    this.card.name = name;
    return this;
  }
  
  /**
   * Set the card's mana cost
   * @param cost - Mana cost value
   */
  manaCost(cost: number): CardBuilder {
    this.card.manaCost = cost;
    return this;
  }
  
  /**
   * Set the card description/card text
   * @param text - Card text that appears on the card
   */
  description(text: string): CardBuilder {
    this.card.description = text;
    return this;
  }
  
  /**
   * Set the card flavor text (lore description)
   * @param text - Flavor text for the card
   */
  flavorText(text: string): CardBuilder {
    this.card.flavorText = text;
    return this;
  }
  
  /**
   * Set the card type (minion, spell, weapon, etc.)
   * @param type - Type of the card
   */
  type(type: CardType): CardBuilder {
    this.card.type = type;
    return this;
  }
  
  /**
   * Set the card rarity (common, rare, epic, mythic)
   * @param rarity - Rarity of the card
   */
  rarity(rarity: CardRarity): CardBuilder {
    this.card.rarity = rarity;
    return this;
  }
  
  /**
   * Set the card attack value (for minions and weapons)
   * @param value - Attack value
   */
  attack(value: number): CardBuilder {
    this.card.attack = value;
    return this;
  }
  
  /**
   * Set the card health value (for minions)
   * @param value - Health value
   */
  health(value: number): CardBuilder {
    this.card.health = value;
    return this;
  }
  
  /**
   * Set the weapon durability (for weapons)
   * @param value - Durability value
   */
  durability(value: number): CardBuilder {
    this.card.durability = value;
    return this;
  }
  
  /**
   * Add a keyword to the card (taunt, battlecry, etc.)
   * @param keyword - Keyword to add
   */
  addKeyword(keyword: string): CardBuilder {
    if (!this.card.keywords) {
      this.card.keywords = [];
    }
    if (!this.card.keywords.includes(keyword)) {
      this.card.keywords.push(keyword);
    }
    return this;
  }
  
  /**
   * Set the card race/tribe (naga, beast, etc.)
   * @param race - Race/tribe of the card
   */
  race(race: string): CardBuilder {
    this.card.race = race;
    return this;
  }
  
  /**
   * Alternative to race() for cards that use tribe instead
   * @param tribe - Tribe of the card
   */
  tribe(tribe: string): CardBuilder {
    this.card.tribe = tribe;
    return this;
  }
  
  /**
   * Set the hero class for the card
   * @param heroClass - Class the card belongs to (or "neutral")
   */
  heroClass(heroClass: string): CardBuilder {
    this.card.heroClass = heroClass;
    return this;
  }
  
  /**
   * Set the card's class property
   * @param className - Class name (Hunter, Mage, etc.) with proper capitalization
   */
  class(className: string): CardBuilder {
    this.card.class = className;
    return this;
  }
  
  /**
   * Set the expansion set the card belongs to
   * @param set - Set name
   */
  set(set: string): CardBuilder {
    this.card.set = set;
    return this;
  }
  
  /**
   * Add a custom category for filtering
   * @param category - Custom category name
   */
  addCategory(category: string): CardBuilder {
    this.categories.push(category);
    return this;
  }
  
  /**
   * Credit the card artist
   * @param artistName - Name of the artist
   */
  artist(artistName: string): CardBuilder {
    this.card.artist = artistName;
    return this;
  }
  
  /**
   * Add a battlecry effect to the card
   * @param effect - Battlecry effect definition
   */
  battlecry(effect: BattlecryEffect): CardBuilder {
    this.card.battlecry = effect;
    this.addKeyword('battlecry');
    return this;
  }
  
  /**
   * Add a deathrattle effect to the card
   * @param effect - Deathrattle effect definition
   */
  deathrattle(effect: DeathrattleEffect): CardBuilder {
    this.card.deathrattle = effect;
    this.addKeyword('deathrattle');
    return this;
  }
  
  /**
   * Add a spell effect to the card
   * @param effect - Spell effect definition
   */
  spellEffect(effect: SpellEffect): CardBuilder {
    this.card.spellEffect = effect;
    return this;
  }
  
  /**
   * Add Choose One effects to the card
   * @param effects - Array of Choose One effect options
   */
  chooseOneEffects(effects: ChooseOneEffect[]): CardBuilder {
    this.card.chooseOneEffects = effects;
    this.addKeyword('choose_one');
    return this;
  }
  
  /**
   * Set whether the card is collectible
   * @param isCollectible - Whether the card can be collected (defaults to true)
   */
  collectible(isCollectible: boolean = true): CardBuilder {
    this.card.collectible = isCollectible;
    return this;
  }
  
  /**
   * Set card image URL
   * @param imageUrl - URL to the card image
   */
  image(imageUrl: string): CardBuilder {
    this.card.img = imageUrl;
    return this;
  }
  
  /**
   * Set golden card image URL
   * @param imageUrl - URL to the golden card image
   */
  goldenImage(imageUrl: string): CardBuilder {
    this.card.imgGold = imageUrl;
    return this;
  }
  
  /**
   * Set mechanics array (for compatibility with existing code)
   * @param mechanics - Array of mechanics
   */
  mechanics(mechanics: string[]): CardBuilder {
    this.card.mechanics = mechanics;
    return this;
  }
  
  /**
   * Add a custom property to the card
   * @param key - Property name
   * @param value - Property value
   */
  customProperty(key: string, value: any): CardBuilder {
    // Add custom property to the card using dynamic accessors
    this.card[key] = value;
    return this;
  }
  
  /**
   * Validate and build the card
   * @returns The complete card data
   * @throws Error if the card is missing required fields
   */
  build(): CardData {
    // Validate required fields
    const requiredFields = ['id', 'name', 'type', 'rarity', 'manaCost'];
    const missingFields = requiredFields.filter(field => !(field in this.card));
    
    if (missingFields.length > 0) {
      throw new Error(`Card is missing required fields: ${missingFields.join(', ')}`);
    }
    
    // Type-specific validations
    if (this.card.type === 'minion' && this.card.health === undefined) {
      throw new Error(`Minion card "${this.card.name}" is missing health value`);
    }
    
    if (this.card.type === 'minion' && this.card.attack === undefined) {
      throw new Error(`Minion card "${this.card.name}" is missing attack value`);
    }
    
    if (this.card.type === 'weapon' && this.card.durability === undefined) {
      throw new Error(`Weapon card "${this.card.name}" is missing durability value`);
    }
    
    if (this.card.type === 'weapon' && this.card.attack === undefined) {
      throw new Error(`Weapon card "${this.card.name}" is missing attack value`);
    }
    
    // Set collectible to true by default if not specified
    if (this.card.collectible === undefined) {
      this.card.collectible = true;
    }
    
    // Convert to a complete CardData object
    const builtCard = this.card as CardData;
    
    // Register the card with the registry
    registerCard(builtCard, this.categories);
    
    return builtCard;
  }
}

/**
 * Factory function for creating a new card builder
 * @returns A new CardBuilder instance
 */
export function createCard(): CardBuilder {
  return new CardBuilder();
}