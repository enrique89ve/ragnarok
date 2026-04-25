# Card Art Template — Ragnarok Card Game

**Purpose:** Standardized format for adding new card art entries. The seed script (`scripts/seedCards.ts`) parses this format and merges into `cards.json`.

---

## Format Rules

1. Every card starts with `## ` followed by a **sequential number**, a **dot**, and the **card name**
2. The **metadata line** uses pipe-separated `**Key:** Value` pairs (always on one line, right after the name)
3. The **Art Prompt** section uses `**Art Prompt:**` on its own line, followed by the prompt text on the next line
4. Optional **Flavor Text** uses `> "quoted text"` format
5. Cards are separated by `---`
6. Top-level headings (`# `) are used for group labels (ignored by parser)

---

## Metadata Line — Required Fields

| Field | Values | Notes |
|---|---|---|
| `Card ID` | Unique numeric ID | Must not overlap with existing IDs |
| `Type` | `hero`, `minion`, `spell`, `weapon`, `secret` | Determines which prompt template applies |
| `Class` | `Warrior`, `Mage`, `Priest`, `Rogue`, `Hunter`, `Warlock`, `Shaman`, `Paladin`, `Druid`, `Berserker`, `DeathKnight`, `Necromancer`, `Neutral` | Drives color palette, enchantment, lighting pools |
| `Rarity` | `mythic`, `epic`, `rare`, `common` | Controls intensity, material quality, atmosphere |

### Optional Metadata Fields

| Field | Values | Notes |
|---|---|---|
| `Attack` | Number | For weapons/minions |
| `Health` | Number | For minions, armor value for armor pieces |
| `Mana` | Number | Mana cost |
| `Race` | Free text | Creature type or armor slot (Helm/Chest/Greaves) |
| `Gender` | `male`, `female`, `neutral` | For humanoid characters |

---

## Art Prompt — How to Write Effective Prompts

### Core Principle: FORM over NARRATIVE

Image generation models respond to **visual descriptors** (shape, material, color, light, scale), not to **stories or lore**. Every word in the prompt should describe something the model can render.

### Prompt Structure (ordered by priority)

```
1. SUBJECT      — What is it? Shape, silhouette, proportions
2. MATERIALS    — Surface textures, metals, fabrics, organic matter
3. KEY DETAILS  — 2-3 distinctive visual features that make it unique
4. COLOR        — Dominant palette (max 3-4 colors)
5. LIGHTING     — Light direction, quality, mood
6. CONTEXT      — Minimal background hint (not a full scene)
```

### Token Budget

| Card Type | Target Words | Max Words |
|---|---|---|
| Weapon/Armor | 40-60 | 80 |
| Spell/Secret | 40-60 | 80 |
| Minion | 50-70 | 100 |
| Hero | 60-80 | 120 |

### Good vs Bad Prompt Writing

#### BAD — Narrative/Story (wastes tokens, model ignores it)

```
A legendary spear that has been wielded by the Allfather himself since
the dawn of creation. It never misses its mark, and its wisdom flows
through every incantation cast by the god of knowledge. The ravens
Huginn and Muninn circle around it as it blazes with cosmic power
from the void of Ginnungagap.
```
**Problems:** Story-driven, abstract concepts (wisdom, knowledge), model can't render "never misses its mark"

#### GOOD — Visual Form (every word is renderable)

```
Tall slender golden spear, leaf-shaped blade, spiral Norse runes
glowing blue-white along shaft. Ansuz rune blazing at spearhead
center. Dark cosmic void background with faint Yggdrasil branch
silhouettes. Aged gold, midnight blue, silver glow.
```
**Why it works:** Shape (tall, slender, leaf-shaped), material (golden), details (spiral runes, Ansuz rune), color (gold, blue, silver), context (cosmic void)

### Prompt Writing Checklist

- [ ] **Start with the physical form** — shape, size, proportions
- [ ] **Name specific materials** — "hammered dark iron" not "powerful metal"
- [ ] **Use visual adjectives** — "jagged", "coiled", "translucent", not "ancient", "legendary", "wise"
- [ ] **Limit to 2-3 unique details** — the features that make THIS item different from generic ones
- [ ] **State colors explicitly** — "deep crimson + charcoal black" not "the colors of war"
- [ ] **Keep background minimal** — 5-8 words max, or omit entirely
- [ ] **No gameplay mechanics** — remove Battlecry, Deathrattle, mana costs, damage numbers
- [ ] **No character actions** — for weapons: no "wielded by", "held by"; for spells: no "cast by"
- [ ] **No emotions or abstract concepts** — "wisdom", "fury", "hope" are not visible

### Visual Adjective Reference

| Category | Use These | Avoid These |
|---|---|---|
| Size | massive, slender, compact, towering, miniature | powerful, mighty, legendary |
| Shape | jagged, curved, angular, spiral, tapered, forked | mystical, ancient, eternal |
| Surface | hammered, polished, rough-hewn, etched, riveted | enchanted, blessed, cursed |
| Light | glowing, crackling, pulsing, flickering, dim | magical, divine, infernal |
| State | cracked, weathered, corroded, pristine, molten | old, new, legendary, epic |
| Color | crimson, obsidian, copper-green, bone-white | dark, light, colorful |

---

## Complete Card Examples

### Weapon Example

```markdown
## 1. Gungnir — Odin's Spear

**Card ID:** 29800 | **Type:** weapon | **Class:** Mage | **Rarity:** rare | **Attack:** 1

> "The Allfather's spear never misses its mark."

**Art Prompt:**
Tall slender golden spear, leaf-shaped blade with shifting gold-silver metal. Spiral Norse runes glowing blue-white along shaft, Ansuz rune blazing at spearhead center. Two raven silhouettes circling the shaft. Aged gold, midnight blue, silver rune-glow. Dramatic top-lighting, dark cosmic void background.
```

### Armor Example

```markdown
## A1. Iron Helm

**Card ID:** 29810 | **Type:** weapon | **Class:** Neutral | **Rarity:** common | **Race:** Helm | **Health:** 1

**Art Prompt:**
Simple round Norse spangenhelm, dark iron with nose guard. Battle-dented surface, hint of rust. Single faint rune glowing on brow. Dark iron, warm rust-brown. Flat even lighting, wooden armory rack background.
```

### Hero Example

```markdown
## 1. Thor — God of Thunder

**Card ID:** 30100 | **Type:** hero | **Class:** Warrior | **Rarity:** mythic | **Gender:** male

> "Only the worthy may wield the hammer of the Thunder God."

**Art Prompt:**
Massive broad-shouldered Norse warrior god, red-bearded, fierce blue eyes. Winged steel helm, dark uru-metal arm guards, chainmail over thick leather tunic. Heavy fur-lined crimson cape. Storm clouds behind, lightning arcing from raised fist. Storm-steel blue, crackling white-gold, deep crimson.
```

### Minion Example

```markdown
## 1. Einherjar Shieldbearer

**Card ID:** 30200 | **Type:** minion | **Class:** Warrior | **Rarity:** common | **Gender:** male | **Race:** Human | **Attack:** 2 | **Health:** 3

> "The chosen dead fight on."

**Art Prompt:**
Weathered Norse warrior, short beard, scarred face, determined expression. Round wooden shield with iron boss, worn chainmail over padded gambeson. Battered iron helm, leather bracers. Muted iron-grey, faded blue cloth, aged wood-brown. Overcast lighting, misty battlefield background.
```

### Spell Example

```markdown
## 1. Runeburst

**Card ID:** 30300 | **Type:** spell | **Class:** Mage | **Rarity:** epic | **Mana:** 4

**Art Prompt:**
Radial explosion of Elder Futhark runes, each rune a sharp angular shard of crystallized blue-white energy. Central fracture point with branching arc-lines. Shattered stone debris lifted by shockwave. Electric blue-white, deep purple, gold sparks. Rim lighting from center, dark void background.
```

### Secret Example

```markdown
## 1. Mist Veil

**Card ID:** 30400 | **Type:** secret | **Class:** Rogue | **Rarity:** rare | **Mana:** 2

**Art Prompt:**
Thin translucent rune-circle half-dissolved into shadow smoke. Angular glyphs flickering at edges, fading in and out. Poison-green wire-thin traces threading through dark mist. Shadow black, toxic green rim, faint silver glint. Diffused ambient light, deep dark void.
```

---

## Armor Set Format (Grouped)

For class armor sets with 3 pieces sharing a visual theme:

```markdown
## STORMCALLER SET (Zeus — Mage)

**IDs:** 29820-29822 | **Rarity:** rare

**Helm (Stormcaller Crown):**
Greek Corinthian helm, storm-bronze with miniature storm-cloud crest. Tiny lightning bolts crackling across surface. Blue-white electrical discharge at temples.

**Chest (Stormcaller Robes):**
Flowing Greek chiton, cloud-fabric weave with lightning threading through. Bronze thunderbolt shoulder clasps. Fabric rippling with static electricity.

**Greaves (Stormcaller Treads):**
Bronze greaves with silver lightning-bolt etchings. Tiny sparks discharging from ankles. Greek meander border at top edge.

**Set Palette:** Storm bronze, lightning blue-white, cloud grey-white, silver etchings.
```

---

## Field-to-Prompt Pipeline

Understanding how the markdown fields feed into the prompt system:

```
seedPrompt (Art Prompt text)
    |
    v
seedParser.ts --> extracts visual anchors
    |
    v
promptBuilder.ts --> selects template by card type
    |
    v
[weapon|hero|minion|spell|secret]Template.ts
    |
    +--> identity block    <-- name, type, class
    +--> style block       <-- rarity (controls intensity)
    +--> form block        <-- seedPrompt anchors OR pool selections
    +--> palette block     <-- class (drives color pool)
    +--> environment block <-- culture inference from name/flavor
    +--> negative block    <-- card type (drives anti-drift)
    |
    v
Final prompt string (sent to image model)
```

**Key insight:** The `Art Prompt` text becomes the `seedPrompt` field. When present, its visual anchors **override** the random pool selections. This means a well-written Art Prompt gives you direct control over the final image — the pools only fill gaps you didn't specify.

---

## Batch File Checklist

Before submitting a new batch `.md` file:

- [ ] All Card IDs are unique and don't overlap with existing ranges
- [ ] Every card has the metadata line with at least: Card ID, Type, Class, Rarity
- [ ] Art Prompts use visual-form language (shape, material, color, light)
- [ ] Art Prompts stay within token budget (40-80 words for items, 60-120 for characters)
- [ ] No gameplay text in prompts (Battlecry, Deathrattle, mana, damage)
- [ ] No narrative/story language in prompts (no "ancient wisdom", "legendary power")
- [ ] Flavor text is separate from Art Prompt (flavor goes in `> "..."`, not in prompt)
- [ ] Cards are separated by `---`
- [ ] File uses `## ` for card headings and `# ` for group labels only
