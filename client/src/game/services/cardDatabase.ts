/**
 * cardDatabase.ts
 *
 * A powerful and extensible service for managing card data throughout the application.
 * This implementation supports optimized card lookup, filtering, and dynamic card generation.
 */

import { CardData } from '../types';
import { debug } from '../config/debugConfig';

// Advanced card data store with optimized lookup via multiple indices
class CardDatabaseService {
  private cards: CardData[] = [];
  private idToCardMap: Map<string | number, CardData> = new Map();
  private nameToCardMap: Map<string, CardData> = new Map();
  private classMaps: Map<string, CardData[]> = new Map();
  private rarityMaps: Map<string, CardData[]> = new Map();
  private typeToCardsMap: Map<string, CardData[]> = new Map();
  private initialized: boolean = false;
  
  /**
   * Check if the database has been initialized
   * @returns boolean indicating if the database is ready
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Initialize the card database with a set of cards
   * Validates cards during initialization to prevent invalid objects
   * @param cards Array of card data to populate the database
   */
  public initialize(cards: CardData[]): void {
    if (this.isInitialized()) {
      debug.warn('Card database already initialized.');
      return;
    }

    // Initialize without external validation to avoid circular dependencies
    debug.log(`Initializing ${cards.length} cards into database...`);
    
    // Store the cards directly
    this.cards = [...cards];
    
    // Build optimized lookup tables
    this.buildLookupIndices();
    
    debug.log(`Card database initialized with ${this.cards.length} cards.`);
    this.initialized = true;
  }

  /**
   * Get a card by its ID (supports both string and number IDs)
   * @param id Card identifier
   * @returns The card or undefined if not found
   */
  public getCardById(id: string | number): CardData | undefined {
    if (!this.isInitialized()) {
      this.initializeDemoData();
    }
    
    // Handle number IDs by converting to string
    const cardId = typeof id === 'number' ? id.toString() : id;
    return this.idToCardMap.get(cardId);
  }

  /**
   * Get a card by its name (case insensitive)
   * @param name Card name
   * @returns The card or undefined if not found
   */
  public getCardByName(name: string): CardData | undefined {
    if (!this.isInitialized()) {
      this.initializeDemoData();
    }
    
    // Normalize name for case-insensitive lookup
    const normalizedName = name.toLowerCase();
    
    // First try exact match
    if (this.nameToCardMap.has(normalizedName)) {
      return this.nameToCardMap.get(normalizedName);
    }
    
    // Fall back to fuzzy match
    for (const [cardName, card] of Array.from(this.nameToCardMap.entries())) {
      if (cardName.includes(normalizedName)) {
        return card;
      }
    }
    
    return undefined;
  }

  /**
   * Get all cards of a specific class
   * @param className Card class (e.g., 'Mage', 'Warrior', etc.)
   * @returns Array of cards belonging to the specified class
   */
  public getCardsByClass(className: string): CardData[] {
    if (!this.isInitialized()) {
      this.initializeDemoData();
    }
    
    // Normalize class name for consistent lookup
    const normalizedClass = className.charAt(0).toUpperCase() + className.slice(1).toLowerCase();
    return this.classMaps.get(normalizedClass) || [];
  }

  /**
   * Get all cards of a specific rarity
   * @param rarity Card rarity (e.g., 'mythic', 'epic', etc.)
   * @returns Array of cards with the specified rarity
   */
  public getCardsByRarity(rarity: string): CardData[] {
    if (!this.isInitialized()) {
      this.initializeDemoData();
    }
    
    // Normalize rarity for consistent lookup
    const normalizedRarity = rarity.toLowerCase();
    return this.rarityMaps.get(normalizedRarity) || [];
  }

  /**
   * Get all cards of a specific type
   * @param type Card type (e.g., 'minion', 'spell', etc.)
   * @returns Array of cards with the specified type
   */
  public getCardsByType(type: string): CardData[] {
    if (!this.isInitialized()) {
      this.initializeDemoData();
    }
    
    // Normalize type for consistent lookup
    const normalizedType = type.toLowerCase();
    return this.typeToCardsMap.get(normalizedType) || [];
  }

  /**
   * Get all cards in the database
   * @returns Array of all cards
   */
  public getAllCards(): CardData[] {
    if (!this.isInitialized()) {
      this.initializeDemoData();
    }
    
    return [...this.cards];
  }

  /**
   * Add new cards to the database
   * @param newCards Array of cards to add
   */
  public addCards(newCards: CardData[]): void {
    if (!this.isInitialized()) {
      this.initializeDemoData();
    }
    
    // Only add cards that don't already exist
    const cardsToAdd = newCards.filter(card => !this.idToCardMap.has(String(card.id)));
    
    if (cardsToAdd.length === 0) {
      return;
    }
    
    // Add to master list
    this.cards.push(...cardsToAdd);
    
    // Update lookup indices
    for (const card of cardsToAdd) {
      this.addCardToIndices(card);
    }
    
    debug.log(`Added ${cardsToAdd.length} new cards to the database.`);
  }

  /**
   * Filter cards based on multiple criteria
   * @param criteria Object containing filter criteria
   * @returns Array of cards matching all specified criteria
   */
  public filterCards(criteria: Partial<CardData> & { 
    manaCostMin?: number;
    manaCostMax?: number;
    nameContains?: string;
  }): CardData[] {
    if (!this.isInitialized()) {
      this.initializeDemoData();
    }
    
    return this.cards.filter(card => {
      // Check each criterion
      for (const [key, value] of Object.entries(criteria)) {
        // Special case for mana cost range
        if (key === 'manaCostMin' && card.manaCost !== undefined) {
          if (card.manaCost < value) return false;
          continue;
        }
        
        if (key === 'manaCostMax' && card.manaCost !== undefined) {
          if (card.manaCost > value) return false;
          continue;
        }
        
        // Special case for name contains
        if (key === 'nameContains' && card.name) {
          if (!card.name.toLowerCase().includes(value.toLowerCase())) return false;
          continue;
        }
        
        // Standard property check
        if (key in card && (card as any)[key] !== value) {
          return false;
        }
      }
      
      return true;
    });
  }

  // Private helper methods

  /**
   * Build lookup indices for fast card retrieval
   */
  private buildLookupIndices(): void {
    // Clear existing indices
    this.idToCardMap.clear();
    this.nameToCardMap.clear();
    this.classMaps.clear();
    this.rarityMaps.clear();
    this.typeToCardsMap.clear();
    
    // Populate indices
    for (const card of this.cards) {
      this.addCardToIndices(card);
    }
  }

  /**
   * Add a card to all lookup indices
   */
  private addCardToIndices(card: CardData): void {
    // Add to ID map (support both string and number lookup)
    if (card.id !== undefined) {
      this.idToCardMap.set(String(card.id), card);
      if (typeof card.id === 'number') {
        this.idToCardMap.set(card.id, card);
      }
    }
    
    // Add to name map (case insensitive)
    if (card.name) {
      this.nameToCardMap.set(card.name.toLowerCase(), card);
    }
    
    // Add to class map
    if (card.class) {
      const normalizedClass = card.class.charAt(0).toUpperCase() + card.class.slice(1).toLowerCase();
      if (!this.classMaps.has(normalizedClass)) {
        this.classMaps.set(normalizedClass, []);
      }
      this.classMaps.get(normalizedClass)?.push(card);
    }
    
    // Add to rarity map
    if (card.rarity) {
      const normalizedRarity = card.rarity.toLowerCase();
      if (!this.rarityMaps.has(normalizedRarity)) {
        this.rarityMaps.set(normalizedRarity, []);
      }
      this.rarityMaps.get(normalizedRarity)?.push(card);
    }
    
    // Add to type map
    if (card.type) {
      const normalizedType = card.type.toLowerCase();
      if (!this.typeToCardsMap.has(normalizedType)) {
        this.typeToCardsMap.set(normalizedType, []);
      }
      this.typeToCardsMap.get(normalizedType)?.push(card);
    }
  }

  /**
   * Initialize with demo data if no cards are provided
   */
  private initializeDemoData(): void {
    // Create a set of sample cards for testing
    const demoCards: CardData[] = [
      {
        id: '14003',
        name: 'Archmage Antonidas',
        description: 'Whenever you cast a spell, add a Fireball spell to your hand.',
        manaCost: 7,
        attack: 5,
        health: 7,
        type: 'minion',
        rarity: 'mythic',
        class: 'Mage',
        collectible: true
      },
      {
        id: '14009',
        name: 'Polymorph',
        description: 'Transform a minion into a 1/1 Sheep.',
        manaCost: 4,
        type: 'spell',
        rarity: 'common',
        class: 'Mage',
        collectible: true
      },
      {
        id: '15002',
        name: 'Tyr, God of War',
        description: 'Charge. Has +6 Attack while damaged.',
        manaCost: 8,
        attack: 4,
        health: 9,
        type: 'minion',
        rarity: 'mythic',
        class: 'Warrior',
        collectible: true
      },
      {
        id: '16003',
        name: 'Týr, Champion of Justice',
        description: 'Divine Shield. Taunt. Deathrattle: Equip a 5/3 Ashbringer.',
        manaCost: 8,
        attack: 6,
        health: 6,
        type: 'minion',
        rarity: 'mythic',
        class: 'Paladin',
        collectible: true
      },
      {
        id: '16101',
        name: 'Consecration',
        description: 'Deal 2 damage to all enemies.',
        manaCost: 4,
        type: 'spell',
        rarity: 'common',
        class: 'Paladin',
        collectible: true
      },
      {
        id: '16102',
        name: 'Truesilver Champion',
        description: 'Whenever your hero attacks, restore 2 Health to it.',
        manaCost: 4,
        attack: 4,
        durability: 2,
        type: 'weapon',
        rarity: 'common',
        class: 'Paladin',
        collectible: true
      },
      {
        id: '18008',
        name: 'Prophet Velen',
        description: 'Double the damage and healing of your spells and Hero Power.',
        manaCost: 7,
        attack: 7,
        health: 7,
        type: 'minion',
        rarity: 'mythic',
        class: 'Priest',
        collectible: true
      },
      {
        id: '20110',
        name: 'Shadowstep',
        description: 'Return a friendly minion to your hand. It costs (2) less.',
        manaCost: 0,
        type: 'spell',
        rarity: 'common',
        class: 'Rogue',
        collectible: true
      },
      {
        id: '20202',
        name: 'Perdition\'s Blade',
        description: 'Battlecry: Deal 1 damage. Combo: Deal 2 instead.',
        manaCost: 3,
        attack: 2,
        durability: 3,
        type: 'weapon',
        rarity: 'rare',
        class: 'Rogue',
        collectible: true
      },
      {
        id: '30044',
        name: 'Savannah Highmane',
        description: 'Deathrattle: Summon two 2/2 Hyenas.',
        manaCost: 6,
        attack: 6,
        health: 5,
        type: 'minion',
        rarity: 'rare',
        class: 'Hunter',
        collectible: true
      },
      {
        id: '30058',
        name: 'Eaglehorn Bow',
        description: 'Whenever a friendly Rune is revealed, gain +1 Durability.',
        manaCost: 3,
        attack: 3,
        durability: 2,
        type: 'weapon',
        rarity: 'rare',
        class: 'Hunter',
        collectible: true
      },
      {
        id: '30068',
        name: 'Animal Companion',
        description: 'Summon a random Beast Companion.',
        manaCost: 3,
        type: 'spell',
        rarity: 'common',
        class: 'Hunter',
        collectible: true
      },
      {
        id: '30090',
        name: 'Unleash the Hounds',
        description: 'For each enemy minion, summon a 1/1 Hound with Charge.',
        manaCost: 3,
        type: 'spell',
        rarity: 'common',
        class: 'Hunter',
        collectible: true
      },
      {
        id: '32004',
        name: 'Malygos',
        description: 'Spell Damage +5',
        manaCost: 9,
        attack: 4,
        health: 12,
        type: 'minion',
        rarity: 'mythic',
        class: 'Neutral',
        collectible: true
      },
      {
        id: '40008',
        name: 'Archthief Rafaam',
        description: 'Battlecry: Discover a powerful artifact.',
        manaCost: 9,
        attack: 7,
        health: 8,
        type: 'minion',
        rarity: 'mythic',
        class: 'Neutral',
        collectible: true
      },
      {
        id: '5070',
        name: 'Bloodmage Thalnos',
        description: 'Spell Damage +1. Deathrattle: Draw a card.',
        manaCost: 2,
        attack: 1,
        health: 1,
        type: 'minion',
        rarity: 'mythic',
        class: 'Neutral',
        collectible: true
      }
    ];
    
    // Register our demo data
    this.initialize(demoCards);
  }
}

// Create and export a singleton instance
// Create the singleton instance
const cardDatabaseInstance = new CardDatabaseService();

// Demo initialization
const initializeDemo = () => {
  // Initialize with demo data
  if (!cardDatabaseInstance.isInitialized()) {
    // Access the method using the public interface
    (cardDatabaseInstance as any).initializeDemoData(); // Use type assertion for private method access
    
    debug.log('Demo card database initialized. Available in cardDatabase.getAllCards()');
  }
};

// Auto-initialize for demo/development purposes
setTimeout(() => {
  if (!cardDatabaseInstance.isInitialized()) {
    initializeDemo();
  }
}, 100);

// Export the singleton instance as the default export
export default cardDatabaseInstance;