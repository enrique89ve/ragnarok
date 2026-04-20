# Card Management System

This system provides a comprehensive solution for managing card data in the game. It centralizes card registration, retrieval, and filtering, making it easier to add new cards and maintain the existing card database.

## Key Features

- **Centralized Registry:** Single source of truth for all card data
- **Type-Safe Card Creation:** Fluent API for defining cards with proper validation
- **Powerful Filtering:** Filter cards by category, type, class, keywords, or custom criteria
- **Effect Management:** Generate effect handler boilerplate and automatically register handlers
- **Import/Export:** Import cards from external data formats or export for sharing

## Using the Card Builder API

### Creating a Basic Card

```typescript
import { createCard } from '../cardManagement';

// Create a simple minion
createCard()
  .id(1001)
  .name("Boulderfist Ogre")
  .manaCost(6)
  .attack(6)
  .health(7)
  .description("Me have good stats for the cost")
  .rarity("common")
  .type("minion")
  .heroClass("neutral")
  .build();
```

### Creating a Card with Keywords and Effects

```typescript
// Create a card with battlecry
createCard()
  .id(1002)
  .name("Acidic Swamp Ooze")
  .manaCost(2)
  .attack(3)
  .health(2)
  .description("Battlecry: Destroy your opponent's weapon.")
  .rarity("common")
  .type("minion")
  .heroClass("neutral")
  .addKeyword("battlecry")
  .battlecry({
    type: "destroy_weapon",
    targetType: "enemy_hero"
  })
  .build();
```

### Creating a Spell

```typescript
// Create a spell
createCard()
  .id(1003)
  .name("Fireball")
  .manaCost(4)
  .description("Deal 6 damage.")
  .rarity("common")
  .type("spell")
  .heroClass("mage")
  .spellEffect({
    type: "deal_damage",
    value: 6,
    targetType: "any",
    requiresTarget: true
  })
  .build();
```

## Accessing Cards

Once cards are registered, they can be accessed in various ways:

```typescript
import { 
  getCardById, 
  getCardByName, 
  getCardsByCategory, 
  getCardsByPredicate 
} from '../cardManagement';

// Get a card by ID
const ogreCard = getCardById(1001);

// Get a card by name
const fireball = getCardByName("Fireball");

// Get all cards of a specific type
const allSpells = getCardsByCategory("spell");

// Get all cards of a specific class
const mageCards = getCardsByCategory("mage");

// Get all cards with a specific keyword
const battlecryCards = getCardsByCategory("battlecry");

// Get cards matching multiple criteria (AND logic)
const mageSpells = getCardsByCategories(["mage", "spell"]);

// Get cards with custom filtering
const costlyMinions = getCardsByPredicate(card => 
  card.type === "minion" && card.manaCost >= 7
);
```

## Organizing Card Sets

Cards should be organized into related sets to keep the code maintainable:

```typescript
// basicSet.ts
export function registerBasicCards(): void {
  // Register all basic set cards here
}

// classicSet.ts
export function registerClassicCards(): void {
  // Register all classic set cards here
}

// index.ts
export function registerAllCardSets(): void {
  registerBasicCards();
  registerClassicCards();
  // ... register other sets
}
```

## Adding New Effect Handlers

The system includes tools to generate effect handler boilerplate:

```bash
# Generate a new battlecry effect handler
node generate_effect_handler.cjs --type battlecry --name freeze
```

This will create:
- `client/src/game/effects/handlers/battlecry/freezeHandler.ts`
- Update the index.ts file to include the new handler

You can then implement the handler logic and it will be automatically registered.

## Importing Cards from External Sources

```typescript
import { importCardsFromJson } from '../cardManagement';

// Import cards from JSON
const jsonData = `[
  {
    "id": 2001,
    "name": "Some Card",
    "cost": 3,
    "attack": 3,
    "health": 3,
    "type": "minion",
    "rarity": "common",
    "class": "neutral",
    "description": "Some description"
  }
]`;

const importedCards = importCardsFromJson(jsonData);
```

## Best Practices

1. **Always use the card builder API** for creating new cards to ensure type safety
2. **Organize cards into logical sets** based on expansion or card type
3. **Use categories** to tag cards for easier filtering and retrieval
4. **Generate effect handlers** using the provided tools rather than writing them manually
5. **Initialize the card database** at application startup
6. **Use the card registry** for card lookups instead of importing card files directly