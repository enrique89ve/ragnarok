/**
 * CardDatabase.ts
 * 
 * A service that handles loading and retrieving card data.
 * This service caches card data to improve performance and provides
 * methods for searching, filtering, and retrieving cards by various criteria.
 */

import { CardData } from '../game/types';

// Sample cards for the premium card rendering system
const sampleCards: CardData[] = [
  {
    id: 1001,
    name: "Fireball",
    description: "Deal 6 damage to a character.",
    type: "spell" as "spell",
    rarity: "common",
    manaCost: 4,
    class: "Mage",
    collectible: true
  },
  {
    id: 2002,
    name: "Azure Drake",
    description: "Spell Damage +1. Battlecry: Draw a card.",
    type: "minion" as "minion",
    rarity: "rare",
    manaCost: 5,
    attack: 4,
    health: 4,
    class: "Neutral",
    race: "Dragon",
    collectible: true,
    keywords: ["battlecry"]
  },
  {
    id: 3003,
    name: "Truesilver Champion",
    description: "Whenever your hero attacks, restore 2 Health to your hero.",
    type: "weapon" as "weapon",
    rarity: "common",
    manaCost: 4,
    attack: 4,
    durability: 2,
    class: "Paladin",
    collectible: true
  },
  {
    id: 4004,
    name: "Deathwing",
    description: "Battlecry: Destroy all other minions and discard your hand.",
    type: "minion" as "minion",
    rarity: "mythic",
    manaCost: 10,
    attack: 12,
    health: 12,
    class: "Neutral",
    race: "Dragon",
    collectible: true,
    keywords: ["battlecry"]
  },
  {
    id: 5005,
    name: "Frost Nova",
    description: "Freeze all enemy minions.",
    type: "spell" as "spell",
    rarity: "common",
    manaCost: 3,
    class: "Mage",
    collectible: true
  },
  {
    id: 6006,
    name: "Frostbolt",
    description: "Deal 3 damage to a character and Freeze it.",
    type: "spell" as "spell",
    rarity: "common",
    manaCost: 2,
    class: "Mage",
    collectible: true
  },
  {
    id: 7007,
    name: "Fiery War Axe",
    description: "",
    type: "weapon" as "weapon",
    rarity: "common",
    manaCost: 3,
    attack: 3,
    durability: 2,
    class: "Warrior",
    collectible: true
  },
  {
    id: 8008,
    name: "Týr, Champion of Justice",
    description: "Divine Shield. Taunt. Deathrattle: Equip a 5/3 Ashbringer.",
    type: "minion" as "minion",
    rarity: "mythic",
    manaCost: 8,
    attack: 6,
    health: 6,
    class: "Paladin",
    collectible: true,
    keywords: ["divine shield", "taunt", "deathrattle"]
  }
];

/**
 * CardDatabase class for managing card data
 */
class CardDatabase {
  private cards: Map<string | number, CardData> = new Map();
  private isInitialized: boolean = false;

  /**
   * Constructor
   */
  constructor() {
    // Load sample cards
    this.loadSampleCards();
  }

  /**
   * Load sample cards for testing
   */
  private loadSampleCards(): void {
    // Add sample cards to the database
    for (const card of sampleCards) {
      this.cards.set(card.id, card);
      // Card registered (no production logging)
    }
    this.isInitialized = true;
  }

  /**
   * Get a card by its ID
   */
  getCard(id: string | number): CardData | undefined {
    return this.cards.get(id);
  }

  /**
   * Get all cards
   */
  getAllCards(): CardData[] {
    return Array.from(this.cards.values());
  }

  /**
   * Get cards by class
   */
  getCardsByClass(className: string): CardData[] {
    return this.getAllCards().filter(card => card.class?.toLowerCase() === className.toLowerCase());
  }

  /**
   * Get cards by type
   */
  getCardsByType(type: "minion" | "spell" | "weapon" | "hero"): CardData[] {
    return this.getAllCards().filter(card => card.type === type);
  }

  /**
   * Search cards by name
   */
  searchCardsByName(query: string): CardData[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllCards().filter(card => 
      card.name.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Check if the database is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

// Create a singleton instance
export const cardDatabase = new CardDatabase();

// Export the type for use elsewhere
export type { CardData };