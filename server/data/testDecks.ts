/**
 * Test Decks for AI Game Simulation
 * 
 * This module defines a set of predefined test decks that can be used for 
 * AI game simulations. These decks are designed to test specific game mechanics,
 * edge cases, or common card interactions.
 */

// Test deck interface
interface TestDeck {
  id: string;
  name: string;
  class: string;
  description: string;
  cards: Record<string, number>;
}

/**
 * Collection of test decks for simulation
 */
export const testDecks: TestDeck[] = [
  // Basic Aggro Deck
  {
    id: 'test-aggro-warrior',
    name: 'Test Aggro Warrior',
    class: 'Warrior',
    description: 'A basic aggro warrior deck with mostly low-cost minions',
    cards: {
      // Basic warrior cards
      '1001': 2, // Basic Warrior Minion
      '1002': 2, // Basic Warrior Spell
      '2001': 2, // Low-cost minion
      '2002': 2, // Low-cost minion with charge
      '2003': 2, // Low-cost spell
      '3001': 2, // Mid-cost minion
      '3002': 2, // Mid-cost spell
      '4001': 2, // High-cost minion
      '4002': 2, // High-cost spell
      '5001': 2, // Mythic minion
      '5002': 2, // Mythic spell
      '6001': 2, // Weapon
      '7001': 2, // Taunt minion
      '8001': 2, // Card draw spell
      '9001': 2  // Direct damage spell
    }
  },
  
  // Basic Control Deck
  {
    id: 'test-control-mage',
    name: 'Test Control Mage',
    class: 'Mage',
    description: 'A basic control mage deck with mostly spells and high-cost minions',
    cards: {
      // Basic mage cards
      '1101': 2, // Basic Mage Minion
      '1102': 2, // Basic Mage Spell
      '2101': 2, // Low-cost spell
      '2102': 2, // Low-cost spell
      '2103': 2, // Low-cost minion
      '3101': 2, // Mid-cost spell
      '3102': 2, // Mid-cost spell
      '4101': 2, // High-cost minion
      '4102': 2, // High-cost spell
      '5101': 2, // Mythic minion
      '5102': 2, // Mythic spell
      '6101': 2, // AoE spell
      '7101': 2, // Card draw spell
      '8101': 2, // Freeze spell
      '9101': 2  // Direct damage spell
    }
  },
  
  // Basic Midrange Deck
  {
    id: 'test-midrange-druid',
    name: 'Test Midrange Druid',
    class: 'Druid',
    description: 'A basic midrange druid deck with a mix of minions and spells',
    cards: {
      // Basic druid cards
      '1201': 2, // Basic Druid Minion
      '1202': 2, // Basic Druid Spell
      '2201': 2, // Low-cost minion
      '2202': 2, // Low-cost spell
      '2203': 2, // Ramp spell
      '3201': 2, // Mid-cost minion
      '3202': 2, // Mid-cost spell
      '4201': 2, // High-cost minion
      '4202': 2, // High-cost spell
      '5201': 2, // Mythic minion
      '5202': 2, // Mythic spell
      '6201': 2, // Taunt minion
      '7201': 2, // Card draw spell
      '8201': 2, // Healing spell
      '9201': 2  // Choose one spell
    }
  },
  
  // Edge Case Test Deck - Fatigue
  {
    id: 'test-fatigue',
    name: 'Test Fatigue Warlock',
    class: 'Warlock',
    description: 'A deck designed to test fatigue mechanics with minimal cards',
    cards: {
      // Only a few cards to test fatigue quickly
      '1301': 2, // Basic Warlock Minion
      '1302': 2, // Basic Warlock Spell
      '2301': 2, // Low-cost minion
      '2302': 2, // Low-cost spell
      '3301': 2  // Card draw spell
    }
  },
  
  // Edge Case Test Deck - Full Hand
  {
    id: 'test-full-hand',
    name: 'Test Full Hand Priest',
    class: 'Priest',
    description: 'A deck designed to test full hand mechanics with lots of card draw',
    cards: {
      // Many card draw spells
      '1401': 2, // Basic Priest Minion
      '1402': 2, // Basic Priest Spell
      '2401': 2, // Low-cost minion
      '2402': 2, // Low-cost spell
      '3401': 2, // Card draw spell
      '3402': 2, // Card draw spell
      '3403': 2, // Card draw spell
      '3404': 2, // Card draw spell
      '3405': 2, // Card draw spell
      '4401': 2, // Healing spell
      '4402': 2, // Healing spell
      '5401': 2, // Mythic minion
      '5402': 2, // Mythic spell
      '6401': 2, // Taunt minion
      '7401': 2  // AoE spell
    }
  },
  
  // Basic Berserker Deck for Testing
  {
    id: 'test-berserker',
    name: 'Test Berserker',
    class: 'Berserker',
    description: 'A standard berserker deck for testing',
    cards: {
      // Basic berserker cards
      '1501': 2, // Basic Berserker Minion
      '1502': 2, // Basic Berserker Spell
      '2501': 2, // Low-cost minion
      '2502': 2, // Low-cost spell
      '2503': 2, // Weapon
      '3501': 2, // Mid-cost minion
      '3502': 2, // Mid-cost spell
      '4501': 2, // High-cost minion
      '4502': 2, // High-cost spell
      '5501': 2, // Mythic minion
      '5502': 2, // Mythic spell
      '6501': 2, // Taunt minion
      '7501': 2, // Card draw spell
      '8501': 2, // Direct damage spell
      '9501': 2  // AoE spell
    }
  }
];