# Card Data Audit Report
**Generated:** February 2, 2026

## Executive Summary

The card data system has significant duplication and architectural fragmentation. There are **1,165 unique card IDs** but **1,446 total definitions** across files, with **262 duplicate IDs** appearing in multiple files. The codebase has two competing aggregation systems: `cardRegistry` (intended canonical) and `allCards.ts` (legacy aggregation).

---

## 1. Card Files Inventory

### PRIMARY SOURCE: cardRegistry/ (Canonical)

| File Path | Card Count | Types | Status |
|-----------|------------|-------|--------|
| `cardRegistry/sets/core/neutrals/index.ts` | 551 | minion, spell, weapon | **PRIMARY** |
| `cardRegistry/sets/core/classes/druid.ts` | 58 | minion, spell | **PRIMARY** |
| `cardRegistry/sets/core/classes/warlock.ts` | 56 | minion, spell | **PRIMARY** |
| `cardRegistry/sets/core/classes/warrior.ts` | 53 | minion, spell, weapon | **PRIMARY** |
| `cardRegistry/sets/core/classes/rogue.ts` | 48 | minion, spell, weapon | **PRIMARY** |
| `cardRegistry/sets/core/classes/shaman.ts` | 47 | minion, spell | **PRIMARY** |
| `cardRegistry/sets/core/classes/mage.ts` | 42 | minion, spell | **PRIMARY** |
| `cardRegistry/sets/core/classes/hunter.ts` | 42 | minion, spell, weapon | **PRIMARY** |
| `cardRegistry/sets/core/classes/priest.ts` | 40 | minion, spell | **PRIMARY** |
| `cardRegistry/sets/core/classes/paladin.ts` | 31 | minion, spell, weapon | **PRIMARY** |
| `cardRegistry/sets/core/classes/necromancer.ts` | 28 | minion, spell | **PRIMARY** |
| `cardRegistry/sets/core/classes/berserker.ts` | 21 | minion, spell | **PRIMARY** |
| `cardRegistry/sets/core/classes/deathknight.ts` | 18 | minion, spell | **PRIMARY** |
| `cardRegistry/sets/core/heroes/index.ts` | 65 | hero | **PRIMARY** |
| `cardRegistry/sets/norse/index.ts` | 79 | minion (legendary) | **PRIMARY** |
| `cardRegistry/sets/tokens/index.ts` | 49 | minion (non-collectible) | **PRIMARY** |

**cardRegistry Total: 1,228 cards**

### DUPLICATE FILES (Root Level)

| File Path | Card Count | Types | Status |
|-----------|------------|-------|--------|
| `cards.ts` | 219 | minion, spell, weapon | **DUPLICATE** - Overlaps with cardRegistry |
| `neutralMinions.ts` | 104 | minion | **DUPLICATE** |
| `additionalSpellCards.ts` | 54 | spell | **DUPLICATE** |
| `druidCards.ts` | 56 | minion, spell | **DUPLICATE** |
| `warlockCards.ts` | 36 | minion, spell | **DUPLICATE** |
| `modernLegendaryCards.ts` | 39 | minion (legendary) | **DUPLICATE** |
| `iconicLegendaryCards.ts` | 37 | minion (legendary) | **DUPLICATE** |
| `mechanicCards.ts` | 33 | minion | **DUPLICATE** |
| `expansionLegendaryCards.ts` | 30 | minion (legendary) | **DUPLICATE** |
| `discoverPools.ts` | 28 | discover options | **SPECIAL** |
| `additionalClassMinions.ts` | 28 | minion | **DUPLICATE** |
| `legendaryCards.ts` | 27 | minion (legendary) | **DUPLICATE** |
| `rogueCards.ts` | 25 | minion, spell | **DUPLICATE** |
| `finalLegendaryCards.ts` | 22 | minion (legendary) | **DUPLICATE** |
| `overloadCards.ts` | 17 | minion, spell | **ORPHANED** |
| `additionalLegendaryCards.ts` | 16 | minion (legendary) | **DUPLICATE** |
| `discoverCards.ts` | 16 | minion, spell | **DUPLICATE** |
| `adaptCards.ts` | 16 | adaptation options | **SPECIAL** |
| `pokerSpellCards.ts` | 15 | poker spell | **SPECIAL** |
| `corruptCards.ts` | 15 | minion | **DUPLICATE** |
| `classCards.ts` | 14 | minion | **ORPHANED** |
| `questCards.ts` | 12 | quest | **SPECIAL** |
| `oldGodsCards.ts` | 11 | minion | **ORPHANED** |
| `dormantCards.ts` | 11 | minion | **DUPLICATE** |
| `spellCards.ts` | 10 | spell | **DUPLICATE** |
| `selfDamageCards.ts` | 10 | minion | **DUPLICATE** |
| `rebornCards.ts` | 10 | minion | **DUPLICATE** |
| `neutralSpellsAndTech.ts` | 10 | spell | **DUPLICATE** |
| `magneticCards.ts` | 9 | minion | **DUPLICATE** |
| `frenzyCards.ts` | 9 | minion | **DUPLICATE** |
| `spellburstCards.ts` | 8 | minion | **DUPLICATE** |
| `specialEffectNeutrals.ts` | 7 | minion | **DUPLICATE** |
| `rushLifestealCards.ts` | 7 | minion | **DUPLICATE** |
| `recruitCards.ts` | 7 | minion | **DUPLICATE** |
| `outcastCards.ts` | 7 | minion | **DUPLICATE** |
| `jadeGolemCards.ts` | 7 | minion | **ORPHANED** |
| `heroCards.ts` | 7 | hero | **ORPHANED** |
| `colossalCards.ts` | 7 | minion | **DUPLICATE** |
| `inspireCards.ts` | 6 | minion | **DUPLICATE** |
| `tradeableCards.ts` | 5 | minion | **DUPLICATE** |
| `dualClassCards.ts` | 5 | minion | **DUPLICATE** |
| `classMinions.ts` | 5 | minion | **DUPLICATE** |
| `echoCards.ts` | 4 | minion | **DUPLICATE** |
| `secretCards.ts` | 2 | spell (secret) | **DUPLICATE** |

### cardSets/ Directory

| File Path | Card Count | Status |
|-----------|------------|--------|
| `cardSets/norseMythologyCards.ts` | 117 | **DUPLICATE** - Same content as `cardRegistry/sets/norse/` |
| `cardSets/druidCards.ts` | 7 | **DUPLICATE** |
| `cardSets/necromancerCards.ts` | 1 | **MOSTLY EMPTY** |
| `cardSets/deathknightCards.ts` | 1 | **MOSTLY EMPTY** |
| Other class files | 0 | **EMPTY SHELLS** |

### Hero/King Definition Files (Separate System)

| File Path | Count | Type |
|-----------|-------|------|
| `norseHeroes/heroDefinitions.ts` | 52 | Norse hero definitions |
| `norseHeroes/additionalHeroes.ts` | 14 | Additional Norse heroes |
| `norseHeroes/egyptianHeroes.ts` | 5 | Egyptian pantheon heroes |
| `norseHeroes/japaneseHeroes.ts` | 5 | Japanese pantheon heroes |
| `norseKings/kingDefinitions.ts` | 9 | King definitions |
| `ChessPieceConfig.ts` | 76 | Hero references for chess pieces |

---

## 2. Canonical Sources Analysis

### Current State

**Two Competing Systems:**

1. **`cardRegistry/index.ts`** - Intended canonical source
   - Imports from organized sets: `core/neutrals`, `core/classes`, `core/heroes`, `norse`, `tokens`
   - Uses validation to deduplicate
   - **20 files** import from cardRegistry

2. **`allCards.ts`** - Legacy aggregation
   - Imports from 30+ scattered files
   - No deduplication
   - **10 files** import from allCards

### Recommendation

**`cardRegistry/` should be the SINGLE canonical source.**

The validation in `cardRegistry/validation.ts` handles deduplication, and the structure follows standard conventions (Core Set → Class Cards → Expansion Sets → Tokens).

---

## 3. Exact Card Counts

### In cardRegistry (Canonical)

| Category | Count | Notes |
|----------|-------|-------|
| **Core Neutral Cards** | 551 | Includes minions, spells, weapons |
| **Class Cards** | 484 | Across 12 classes |
| **Hero Cards** | 65 | Hero card type for hero powers |
| **Norse Mythology** | 79 | Legendary creatures |
| **Tokens** | 49 | Non-collectible summoned cards |
| **Total cardRegistry** | **1,228** | |

### By Card Type (cardRegistry)

| Type | Count |
|------|-------|
| Minions | ~1,100 |
| Spells | ~100 |
| Weapons | ~28 |
| Heroes | 65 |

### Heroes & Kings (Separate System)

| Category | Count | Expected | Status |
|----------|-------|----------|--------|
| **Norse Heroes** | 52 + 14 = 66 | | Primary heroes |
| **Egyptian Heroes** | 5 | | Expansion |
| **Japanese Heroes** | 5 | | Expansion |
| **Total Heroes** | **76** | 76 | ✅ MATCHES |
| **Kings** | **9** | 9 | ✅ MATCHES |

### Token Cards

| Source | Count |
|--------|-------|
| `cardRegistry/sets/tokens/index.ts` | 49 |
| All non-collectible (collectible: false) | 49 |

---

## 4. Duplicate Card Names & IDs

### Sample Duplicate Card IDs (Found in Multiple Files)

| ID | Found In |
|----|----------|
| 1001-1004 | `cards.ts`, `heroes.ts` |
| 2002 | `cards.ts`, `heroes.ts` |
| 4300-4303 | `cardSets/norseMythologyCards.ts`, `cardRegistry/sets/norse/index.ts` |
| 20620-20621 | `cardSets/norseMythologyCards.ts`, `cardRegistry/sets/norse/index.ts`, `cardRegistry/sets/tokens/index.ts` |
| 10001-10002 | Multiple files |
| 12001-12002 | Multiple files |

**Total duplicate IDs: 262**

### Sample Duplicate Card Names

- Abyssal Kraken
- Aegir, Lord of the Deep
- Apophis, World Ender
- Audhumla, the Primordial Cow
- Baldur, God of Light
- Bjorn, the Sacred Bear
- Briareos, the Hundred-Armed
- Daedalus the Inventor
- (and 20+ more)

---

## 5. Consolidation Recommendations

### Files to KEEP (Primary Sources)

```
cardRegistry/
├── index.ts                    # Main entry point
├── validation.ts               # Deduplication logic
└── sets/
    ├── core/
    │   ├── classes/            # 12 class files
    │   ├── neutrals/           # Core neutral cards
    │   └── heroes/             # Hero power cards
    ├── norse/                  # Norse mythology expansion
    └── tokens/                 # Non-collectible cards

norseHeroes/                    # Hero definitions (separate system)
norseKings/                     # King definitions
ChessPieceConfig.ts            # Chess piece → hero mapping
sets/superMinions/             # Hero-linked super minions
```

### Files to DEPRECATE

#### High Priority (Orphaned - Not Imported)
- `classCards.ts` - 14 cards, not imported
- `heroCards.ts` - 7 cards, not imported  
- `initializeGame.ts` - Not used
- `jadeGolemCards.ts` - 7 cards, not imported
- `oldGodsCards.ts` - 11 cards, not imported
- `overloadCards.ts` - 17 cards, not imported

#### Medium Priority (Duplicates of cardRegistry)
- `cards.ts` - 219 cards (migrate unique cards to cardRegistry)
- `neutralMinions.ts` - 104 cards
- All legendary files: `legendaryCards.ts`, `iconicLegendaryCards.ts`, `expansionLegendaryCards.ts`, `modernLegendaryCards.ts`, `finalLegendaryCards.ts`, `additionalLegendaryCards.ts`
- Class-specific files at root level: `druidCards.ts`, `warlockCards.ts`, `rogueCards.ts`

#### Low Priority (Empty/Minimal)
- `cardSets/` directory - Most files are empty shells
  - Keep only if planning future expansions
  - Consider merging `norseMythologyCards.ts` content into `cardRegistry/sets/norse/`

### Migration Strategy

1. **Audit unique cards** in deprecated files not present in cardRegistry
2. **Migrate unique cards** to appropriate cardRegistry location
3. **Update imports** from `allCards.ts` to use `cardRegistry`
4. **Delete deprecated files** after migration complete
5. **Consolidate cardSets/norseMythologyCards.ts** with cardRegistry/sets/norse/index.ts

---

## 6. Architectural Issues

### Current Problems

1. **Dual aggregation systems** - `cardRegistry` vs `allCards.ts` causes confusion
2. **No clear ownership** - Same cards defined in multiple places
3. **Import chain complexity** - `allCards.ts` imports from 30+ files
4. **Empty shell files** - `cardSets/*.ts` files mostly empty
5. **Orphaned files** - 6 files not imported anywhere

### Recommended Architecture

```
client/src/game/data/
├── cardRegistry/              # SINGLE SOURCE OF TRUTH
│   ├── index.ts               # Exports validated cardRegistry
│   ├── validation.ts          # Deduplication & validation
│   └── sets/
│       ├── core/              # Base game cards
│       ├── norse/             # Norse expansion
│       ├── tokens/            # Summoned cards
│       └── [future-expansions]/
├── norseHeroes/               # Hero definitions
├── norseKings/                # King definitions  
├── ChessPieceConfig.ts        # Game configuration
├── discoverPools.ts           # Runtime discover logic
└── pokerSpellCards.ts         # Poker combat spells
```

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| Unique Card IDs | 1,165 |
| Total Card Definitions | 1,446 |
| Duplicate IDs | 262 |
| cardRegistry Cards | 1,228 |
| Heroes | 76 ✅ |
| Kings | 9 ✅ |
| Tokens | 49 |
| Orphaned Files | 6 |
| Files to Deprecate | ~25 |
