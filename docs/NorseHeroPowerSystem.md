# Norse Hero Power System - Complete Implementation Guide

## Overview

This document defines the complete ability system for Ragnarok Poker, featuring Norse mythology characters. The system has two distinct character types:

### Heroes vs Kings - Key Distinction

| Aspect | Heroes | Kings |
|--------|--------|-------|
| **Role** | Fighters - participate in combat | Summoners - passive army buffs |
| **Can Attack** | Yes | No |
| **Takes Damage** | Yes | No |
| **Active Abilities** | Hero Power (2 mana, once/turn) | None |
| **Passive Effects** | Personal (synergy with element) | Army-wide (affects all minions) |
| **Weapon Upgrades** | Yes (5-mana spell) | No |
| **Count** | 36 heroes | 9 kings |

---

## Existing Systems to Leverage

| System | Location | Status |
|--------|----------|--------|
| Mana System | `GameContext.ts`, `types.ts` | ✅ Implemented |
| Hero Power Execution | `heroPowerUtils.ts` | ✅ Implemented |
| Hero Power Component | `HeroPower.tsx` | ✅ Implemented |
| Upgraded Powers | `getUpgradedHeroPower()` | ✅ Implemented |
| Keywords | `CardTypes.ts`, `types.ts` | ✅ Implemented |
| Element System | `ChessTypes.ts` | ✅ Implemented |
| King Passives | `ChessPieceConfig.ts` | ⚠️ Needs update |

## Supported Keywords (Already Exist)

- `taunt` - Must be attacked first
- `divineShield` / `hasDivineShield` - Ignores first damage
- `stealth` - Cannot be targeted until it attacks
- `rush` / `isRush` - Can attack minions on turn summoned
- `charge` - Can attack immediately
- `poisonous` / `isPoisonous` - Destroys any minion damaged
- `lifesteal` / `hasLifesteal` - Heals hero for damage dealt
- `windfury` - Can attack twice per turn
- `frozen` / `isFrozen` - Cannot attack next turn
- `spell_damage` - Increases spell damage
- `armor` - Absorbs damage before health

---

# PART 1: KINGS (SUMMONERS) - PASSIVE RULE MODIFIERS

## Core Rules for All Kings

1. A King is **always active** while in play
2. King effects:
   - Apply **continuously** to all friendly minions
   - Do **NOT** stack with duplicate Kings
   - Cannot be disabled unless explicitly stated by a card
3. Kings **do not count as minions**
4. Kings **do not attack or take damage**
5. Kings reshape the battlefield simply by existing

---

## King Roster (9 Primordial Beings)

### 1. Ymir — The Primordial Frost Giant

**Role:** Tempo Pressure / Attack Skew  
**Element:** Water (Ice)

#### Passive Effects
| Effect | Description |
|--------|-------------|
| **Frost Giant's Might** | All friendly minions gain **+2 Attack** |
| **Chilling Presence** | All enemy minions suffer **–1 Attack** |

#### Rules Clarification
- These modifiers:
  - Apply immediately when a minion enters play
  - Update dynamically if control of a minion changes
- If a minion's Attack would drop below **0**, it is treated as **0**
- This does **not** permanently modify base stats (buffs are aura-based)

#### Gameplay Impact
- Early trades heavily favor the Ymir player
- Small minions become lethal threats
- Enemy boards struggle to stabilize

#### Design Intent
> Ymir **forces combat**. He compresses the game timeline and punishes slow setups.
> **If you hesitate, Ymir wins.**

---

### 2. Buri — The First God

**Role:** Attrition / Scaling Defense  
**Element:** Light

#### Passive Effects
| Effect | Description |
|--------|-------------|
| **Primordial Shield** | All friendly minions gain **+1 Armor** |
| **Eternal Growth** | At the **start of your turn**, all friendly minions gain **+1 Health** |

#### Rules Clarification
- Armor reduces incoming damage before Health is affected
- Start-of-turn Health gain:
  - Can exceed original maximum Health
  - Is **permanent** (not temporary buff)
- Triggers before other start-of-turn effects (priority: King passives first)

#### Gameplay Impact
- Boards grow harder to clear over time
- Chip damage becomes ineffective
- Favors long, grinding games

#### Design Intent
> Buri rewards **patience and survival**.
> **You don't win quickly. You win by outlasting everything.**

---

### 3. Surtr — The Fire Giant

**Role:** Pressure / Board Erosion  
**Element:** Fire

#### Passive Effects
| Effect | Description |
|--------|-------------|
| **Flame Touched** | All friendly minions gain **+1 Attack** |
| **Muspelheim's Burn** | At the **end of your turn**, deal **1 damage to all enemy minions** |

#### Rules Clarification
- End-of-turn damage:
  - Occurs after all attacks and abilities resolve
  - Can destroy minions (triggers deathrattles)
  - Does **not** damage the enemy King or Hero
- Damage is applied simultaneously to all enemy minions

#### Gameplay Impact
- Enemy boards slowly melt away
- Low-health units cannot remain idle
- Forces opponents into suboptimal trades

#### Design Intent
> Surtr makes **doing nothing lethal**.
> **If you don't act, the fire will.**

---

### 4. Borr — The Primordial Father

**Role:** Death Value / Board Persistence  
**Element:** Grass (Earth)

#### Passive Effects
| Effect | Description |
|--------|-------------|
| **Father's Blessing** | All friendly minions gain **+1 Health** |
| **Echo of Life** | When a friendly minion dies, summon a **1/1 Echo of Borr with Taunt** in its place |

#### Rules Clarification
- The Echo:
  - Occupies the same board position
  - Is a **new minion** (can be buffed, targeted, killed)
  - Has Summoning Sickness (cannot attack that turn)
  - Does NOT trigger when tokens die (unless explicitly stated)
- Echo summons happen after deathrattle effects resolve

#### Gameplay Impact
- Removing minions never fully clears the board
- Trades become awkward and inefficient for opponent
- Excellent counter against burst damage and AoE

#### Design Intent
> Borr **denies clean victories**.
> **Death is not an ending — it's a delay.**

---

### 5. Yggdrasil — The World Tree

**Role:** Growth Engine / Scaling Power  
**Element:** Grass (Nature)

#### Passive Effects
| Effect | Description |
|--------|-------------|
| **Life Spring** | At the **start of your turn**, restore **2 Health** to all friendly minions |
| **Roots of Power** | Whenever a friendly minion is healed, it gains **+1 Attack permanently** |

#### Rules Clarification
- Healing includes:
  - This passive's healing
  - Any other heal effects (spells, hero powers, abilities)
- **Overhealing still counts** as "healed" (even if at full HP)
- Attack gain stacks without limit
- Multiple heals in one turn = multiple Attack gains

#### Gameplay Impact
- Minions scale every single turn
- Defensive boards become offensive threats
- Opponents must disrupt early or lose to snowball

#### Design Intent
> Yggdrasil converts **survival into dominance**.
> **Growth is inevitable if left unchecked.**

---

### 6. Auðumbla — The Primordial Cow

**Role:** Sustain / Board Stability  
**Element:** Water (Life)

#### Passive Effects
| Effect | Description |
|--------|-------------|
| **Nourishing Presence** | All friendly minions gain **+1 Health** |
| **Gift of Life** | Whenever you play a minion, restore **1 Health** to all friendly minions |

#### Rules Clarification
- Healing triggers immediately after a minion enters play
- Playing multiple minions in one turn = multiple heals
- Does NOT heal the King or Hero (only minions)
- Synergizes with Yggdrasil's heal-to-attack conversion

#### Gameplay Impact
- Swarm strategies thrive under Auðumbla
- Boards recover rapidly after trades
- Excellent counter against chip damage and poke strategies

#### Design Intent
> Auðumbla rewards **presence and numbers**.
> **Life feeds life.**

---

### 7. Blainn — The Dark One

**Role:** Control / Disruption  
**Element:** Dark (Shadow)

#### Passive Effects
| Effect | Description |
|--------|-------------|
| **Shadow's Embrace** | All friendly minions gain **+1 Health** |
| **Touch of Frost** | At the **start of your turn**, Freeze a **random enemy minion** |

#### Rules Clarification
- Frozen minions:
  - Cannot attack
  - Cannot activate attack-based abilities
  - Remain frozen until their controller's next turn ends
- Random selection:
  - Ignores Stealth (can freeze stealthed minions)
  - If only one enemy minion exists, it is always chosen

#### Gameplay Impact
- Key enemy threats are delayed
- Tempo swings without dealing damage
- Excellent counter against single-threat/big minion decks

#### Design Intent
> Blainn **wins by denial**, not force.
> **You don't lose your army — you lose your momentum.**

---

### 8. Brimir — The Bloody Moisture

**Role:** Aggression Through Death  
**Element:** Fire (Blood)

#### Passive Effects
| Effect | Description |
|--------|-------------|
| **Blood Rage** | All friendly minions gain **+1 Attack** |
| **Death's Echo** | When a friendly minion dies, deal **1 damage to all enemy minions** |

#### Rules Clarification
- Triggers per death:
  - Multiple minions dying = multiple damage instances
  - Can chain-kill enemy minions (which may trigger their deathrattles)
- Damage resolves even if the board becomes empty
- Does NOT damage enemy King or Hero

#### Gameplay Impact
- Sacrificial play becomes optimal strategy
- AoE damage builds up naturally through trades
- Opponents are punished for killing your units

#### Design Intent
> Brimir turns **loss into pressure**.
> **Blood spills both ways.**

---

### 9. Ginnungagap — Primordial Chaos

**Role:** Chaos / Variance / Adaptation  
**Element:** Dark (Void)

#### Passive Effects
| Effect | Description |
|--------|-------------|
| **Void Spawn** | At the **end of your turn**, summon a **1/1 Void Spawn** with a **random keyword** |

#### Rules Clarification
- Keywords are chosen from the standard keyword pool:
  - Taunt, Divine Shield, Stealth, Rush, Charge, Poisonous, Lifesteal, Windfury
- Excludes King-exclusive effects
- Void Spawns:
  - Count as friendly minions (affected by other King passives)
  - Have Summoning Sickness
  - Can stack keywords if multiple spawns exist

#### Gameplay Impact
- Board state constantly mutates and evolves
- Unpredictable threats emerge every turn
- High variance, high creativity ceiling

#### Design Intent
> Ginnungagap rewards **embracing uncertainty**.
> **Creation is chaos made solid.**

---

## King Balance Summary

| King | Core Axis | How It Wins | Counter Strategy |
|------|-----------|-------------|------------------|
| **Ymir** | Tempo | Faster, deadlier trades | Wide boards, healing |
| **Buri** | Attrition | Outlasting removal | Burst damage, silence |
| **Surtr** | Pressure | Passive board damage | High-health minions |
| **Borr** | Persistence | Death doesn't clear board | Transform effects, exile |
| **Yggdrasil** | Scaling | Healing becomes attack | Early aggression |
| **Auðumbla** | Sustain | Constant recovery | Burst, prevent healing |
| **Blainn** | Control | Delayed threats | Wide boards, Rush |
| **Brimir** | Aggro | Death fuels damage | High-health minions |
| **Ginnungagap** | Chaos | Unpredictable advantage | Consistent strategy |

---

## King Passive Implementation

### Data Structure

```typescript
interface KingPassive {
  id: string;
  kingId: string;
  name: string;
  description: string;
  trigger: KingPassiveTrigger;
  effect: KingPassiveEffect;
}

type KingPassiveTrigger = 
  | 'always'           // Continuous aura (stat buffs)
  | 'start_of_turn'    // Beginning of owner's turn
  | 'end_of_turn'      // End of owner's turn
  | 'on_minion_play'   // When owner plays a minion
  | 'on_minion_death'; // When a friendly minion dies

interface KingPassiveEffect {
  type: 'buff_friendly' | 'debuff_enemy' | 'damage_enemy' | 'heal_friendly' | 
        'summon' | 'freeze' | 'grant_attack' | 'grant_health' | 'grant_armor';
  value?: number;
  targetType?: 'all_friendly' | 'all_enemy' | 'random_enemy' | 'dying_minion_position';
  isAura?: boolean; // Removed when King dies
  isPermanent?: boolean; // Persists after King dies
  summonData?: {
    attack: number;
    health: number;
    keywords?: string[];
    randomKeyword?: boolean;
  };
}
```

### Trigger Priority Order

1. **King Passives** (start of turn)
2. **Hero Passives** (start of turn)
3. **Card Effects** (start of turn triggers)
4. **Player Actions** (main phase)
5. **Card Effects** (end of turn triggers)
6. **Hero Passives** (end of turn)
7. **King Passives** (end of turn)

---

# PART 2: HEROES - ACTIVE COMBATANTS

## Hero Overview

Heroes are the fighters in your army. Unlike Kings, they:
- Participate in combat (attack and take damage)
- Have **Hero Powers** (2 mana, once per turn active abilities)
- Have **Weapon Upgrades** (5-mana spells that permanently enhance hero power)
- Have **Personal Passives** (element synergy effects)

---

## Complete Norse Hero List (36 Heroes)

### TIER 1: PRIMARY GODS (22 Heroes)

---

#### 1. Odin - The Allfather
- **Element:** Light
- **Weakness:** Dark
- **Starting Health:** 150
- **Hero Power:** Wisdom of the Ravens
  - **Cost:** 2 mana
  - **Effect:** Reveal a random card in opponent's hand and draw a card
  - **Target:** None (auto)
- **Weapon:** Gungnir (5-mana spell)
  - **Immediate:** Reveal opponent's entire hand this turn
  - **Upgrade:** Wisdom of the Ravens+ - Reveal 2 cards and draw 2
- **Passive:** Illuminated Path - Playing a Light minion reveals a random opponent card

---

#### 2. Thor - God of Thunder
- **Element:** Electric
- **Weakness:** Light
- **Starting Health:** 100
- **Hero Power:** Mjolnir's Wrath
  - **Cost:** 2 mana
  - **Effect:** Deal 2 damage to all enemy minions
  - **Target:** None (AoE)
- **Weapon:** Mjolnir (5-mana spell)
  - **Immediate:** Deal 5 damage to all enemy minions
  - **Upgrade:** Mjolnir's Wrath+ - Deal 3 damage to all enemy minions
- **Passive:** Thunderous Presence - Electric minions have +1 Attack

---

#### 3. Loki - The Trickster
- **Element:** Dark
- **Weakness:** Grass
- **Starting Health:** 120
- **Hero Power:** Deceptive Grasp
  - **Cost:** 2 mana
  - **Effect:** Copy a random card from opponent's hand
  - **Target:** None (auto)
- **Weapon:** Laevateinn (5-mana spell)
  - **Immediate:** Copy 2 random cards from opponent's hand
  - **Upgrade:** Deceptive Grasp+ - Copy 2 random cards
- **Passive:** Shadow's Trick - Playing a Dark minion copies a random card from opponent's deck

---

#### 4. Freya - Goddess of Love and War
- **Element:** Grass
- **Weakness:** Electric
- **Starting Health:** 125
- **Hero Power:** Blessing of Valhalla
  - **Cost:** 2 mana
  - **Effect:** Give a friendly minion +1/+1 and restore 2 HP to hero
  - **Target:** Friendly minion
- **Weapon:** Brísingamen (5-mana spell)
  - **Immediate:** Give all friendly minions +2/+2 and restore 10 HP
  - **Upgrade:** Blessing of Valhalla+ - Give +2/+2 and restore 4 HP
- **Passive:** Nature's Embrace - End of turn: Restore 1 HP to all Grass minions

---

#### 5. Bragi - God of Poetry
- **Element:** Light
- **Weakness:** Dark
- **Starting Health:** 110
- **Hero Power:** Inspiring Verse
  - **Cost:** 2 mana
  - **Effect:** Give a random friendly minion +2 Attack this turn
  - **Target:** Random friendly
- **Weapon:** Harp of Harmony (5-mana spell)
  - **Immediate:** Give all friendly minions +2/+2 until next turn
  - **Upgrade:** Inspiring Verse+ - Give +3 Attack and +1 Health permanently
- **Passive:** Luminous Words - Light minions gain +1 Attack when you cast a spell

---

#### 6. Eir - Goddess of Healing
- **Element:** Grass
- **Weakness:** Electric
- **Starting Health:** 115
- **Hero Power:** Herbal Remedy
  - **Cost:** 2 mana
  - **Effect:** Restore 3 health to hero or a friendly minion
  - **Target:** Friendly character
- **Weapon:** Staff of Renewal (5-mana spell)
  - **Immediate:** Restore 10 HP to hero and summon a 3/3 Healing Bloom with Taunt
  - **Upgrade:** Herbal Remedy+ - Restore 5 health
- **Passive:** Vital Growth - Grass minions restore 2 HP to themselves when they attack

---

#### 7. Forseti - God of Justice
- **Element:** Light
- **Weakness:** Dark
- **Starting Health:** 110
- **Hero Power:** Balanced Verdict
  - **Cost:** 2 mana
  - **Effect:** Deal 1 damage to an enemy minion and restore 1 HP to a friendly minion
  - **Target:** Enemy minion + Friendly minion
- **Weapon:** Axe of Truth (5-mana spell)
  - **Immediate:** Deal 3 damage to an enemy and restore 3 HP to all friendlies
  - **Upgrade:** Balanced Verdict+ - Deal 2 and restore 2
- **Passive:** Just Radiance - Light minions have +1 Health when attacked

---

#### 8. Frey - God of Fertility
- **Element:** Grass
- **Weakness:** Electric
- **Starting Health:** 125
- **Hero Power:** Bountiful Seed
  - **Cost:** 2 mana
  - **Effect:** Summon a 1/1 Sapling with Deathrattle: Summon a 2/2 Treant
  - **Target:** None
- **Weapon:** Gullinbursti (5-mana spell)
  - **Immediate:** Transform a friendly minion into a 5/5 Golden Boar with Charge
  - **Upgrade:** Bountiful Seed+ - Summon a 2/2 Treant with Deathrattle: Summon 3/3
- **Passive:** Fertile Roots - Grass minions gain +1/+1 when summoned

---

#### 9. Idunn - Goddess of Youth
- **Element:** Grass
- **Weakness:** Electric
- **Starting Health:** 115
- **Hero Power:** Apple of Eternity
  - **Cost:** 2 mana
  - **Effect:** Give a friendly minion Deathrattle: Restore 3 HP to hero
  - **Target:** Friendly minion
- **Weapon:** Orchard's Bounty (5-mana spell)
  - **Immediate:** Give all friendly minions Deathrattle: Summon a 2/2 Apple Tree
  - **Upgrade:** Apple of Eternity+ - Deathrattle: Restore 5 HP and draw a card
- **Passive:** Evergreen Youth - Grass minions have +2 Health

---

#### 10. Ran - Goddess of the Drowned
- **Element:** Water
- **Weakness:** Electric
- **Starting Health:** 120
- **Hero Power:** Net of Fate
  - **Cost:** 2 mana
  - **Effect:** Reduce an enemy minion's Attack by 2 this turn
  - **Target:** Enemy minion
- **Weapon:** Golden Net (5-mana spell)
  - **Immediate:** Silence all enemy minions and deal 1 damage to them
  - **Upgrade:** Net of Fate+ - Reduce Attack by 3 permanently
- **Passive:** Drowned Souls - When an enemy minion dies, Water minions gain +1 Attack this turn

---

#### 11. Sol - Goddess of the Sun
- **Element:** Fire
- **Weakness:** Water
- **Starting Health:** 120
- **Hero Power:** Solar Flare
  - **Cost:** 2 mana
  - **Effect:** Deal 2 damage to a random enemy minion
  - **Target:** Random enemy minion
- **Weapon:** Chariot of Flame (5-mana spell)
  - **Immediate:** Deal 3 damage to all enemy minions and 5 to enemy hero
  - **Upgrade:** Solar Flare+ - Deal 3 to random enemy and 1 to all others
- **Passive:** Burning Light - Fire minions deal +1 damage to enemy hero when attacking

---

#### 12. Mani - God of the Moon
- **Element:** Dark
- **Weakness:** Grass
- **Starting Health:** 115
- **Hero Power:** Lunar Shadow
  - **Cost:** 2 mana
  - **Effect:** Give a friendly minion Stealth until your next turn
  - **Target:** Friendly minion
- **Weapon:** Sickle of Night (5-mana spell)
  - **Immediate:** Deal 4 damage to an enemy and give all friendlies Stealth this turn
  - **Upgrade:** Lunar Shadow+ - Give Stealth and +2 Attack until next turn
- **Passive:** Moonlit Prowl - Dark minions have +1/+1 while they have Stealth

---

#### 13. Hoder - Blind God of Winter
- **Element:** Dark
- **Weakness:** Grass
- **Starting Health:** 105
- **Hero Power:** Blind Shot
  - **Cost:** 2 mana
  - **Effect:** Deal 3 damage to a random enemy character
  - **Target:** Random enemy
- **Weapon:** Bow of Misfortune (5-mana spell)
  - **Immediate:** Deal 5 damage randomly split among all enemies
  - **Upgrade:** Blind Shot+ - Deal 4 damage to random enemy and 1 to enemy hero
- **Passive:** Shroud of Gloom - Dark minions take 1 less damage from abilities

---

#### 14. Kvasir - God of Wisdom
- **Element:** Light
- **Weakness:** Dark
- **Starting Health:** 110
- **Hero Power:** Sip of Insight
  - **Cost:** 2 mana
  - **Effect:** Look at top card of deck; may put it on bottom
  - **Target:** None
- **Weapon:** Horn of Knowledge (5-mana spell)
  - **Immediate:** Draw 3 cards, discard 1 at random
  - **Upgrade:** Sip of Insight+ - Look at top 2, draw 1, bottom the other
- **Passive:** Wise Brew - Light minions cost 1 less after you draw a card

---

#### 15. Magni - God of Strength
- **Element:** Fire
- **Weakness:** Water
- **Starting Health:** 100
- **Hero Power:** Hammer Strike
  - **Cost:** 2 mana
  - **Effect:** Deal 1 damage to enemy minion and give a random friendly +1 Attack
  - **Target:** Enemy minion
- **Weapon:** Forge Maul (5-mana spell)
  - **Immediate:** Deal 3 damage to enemy minion and summon a 3/3 Golem with Rush
  - **Upgrade:** Hammer Strike+ - Deal 2 damage and give +2 Attack
- **Passive:** Molten Craft - Fire minions gain +1 Attack after you play a Rush minion

---

#### 16. Sinmara - Giantess of Muspelheim
- **Element:** Fire
- **Weakness:** Water
- **Starting Health:** 125
- **Hero Power:** Burning Gaze
  - **Cost:** 2 mana
  - **Effect:** Deal 1 damage to enemy minion and give it -1 Attack this turn
  - **Target:** Enemy minion
- **Weapon:** Blade of Embers (5-mana spell)
  - **Immediate:** Deal 4 damage to enemy minion and give all enemies -2 Attack
  - **Upgrade:** Burning Gaze+ - Deal 2 damage and give -1 Attack
- **Passive:** Blazing Dominion - Fire minions have +1 Attack while an enemy has reduced Attack

---

#### 17. Skadi - Goddess of Winter
- **Element:** Ice
- **Weakness:** Fire
- **Starting Health:** 100
- **Hero Power:** Frostbite Strike
  - **Cost:** 2 mana
  - **Effect:** Freeze an enemy minion
  - **Target:** Enemy minion
- **Weapon:** Spear of Icewind (5-mana spell)
  - **Immediate:** Freeze all enemy minions and deal 2 damage to them
  - **Upgrade:** Frostbite Strike+ - Freeze and deal 1 damage
- **Passive:** Glacial Chill - Ice minions have +1 Attack while an enemy is Frozen

---

#### 18. Heimdall - The Watchful Guardian
- **Element:** Light
- **Weakness:** Dark
- **Starting Health:** 135
- **Hero Power:** Guardian's Call
  - **Cost:** 2 mana
  - **Effect:** Give a friendly minion +2 Health and Taunt
  - **Target:** Friendly minion
- **Weapon:** Gjallarhorn (5-mana spell)
  - **Immediate:** Give all friendly minions Taunt and take 2 less damage until next turn
  - **Upgrade:** Guardian's Call+ - Give +3 Health and Taunt
- **Passive:** Vigilant Watch - When a friendly minion is attacked, attacker gets -1 Attack permanently

---

#### 19. Vili - God of Will
- **Element:** Light
- **Weakness:** Dark
- **Starting Health:** 140
- **Hero Power:** Strategic Insight
  - **Cost:** 2 mana
  - **Effect:** Look at top card; may draw it or put on bottom
  - **Target:** None
- **Weapon:** Spear of Will (5-mana spell)
  - **Immediate:** Give all friendly minions +2 Attack this turn
  - **Upgrade:** Strategic Insight+ - Look at top 2, draw 1, bottom the other
- **Passive:** Illuminated Mind - Playing a spell gives a random friendly +1 Attack

---

#### 20. Ve - God of Holiness
- **Element:** Grass
- **Weakness:** Electric
- **Starting Health:** 135
- **Hero Power:** Gift of Life
  - **Cost:** 2 mana
  - **Effect:** Summon a 1/2 Plant with Taunt
  - **Target:** None
- **Weapon:** Staff of Creation (5-mana spell)
  - **Immediate:** Summon three 2/2 Treants
  - **Upgrade:** Gift of Life+ - Summon a 2/3 Plant with Taunt
- **Passive:** Nature's Bounty - Grass minions have +1 Health

---

#### 21. Gerd - Giantess of Fertile Earth
- **Element:** Grass
- **Weakness:** Electric
- **Starting Health:** 120
- **Hero Power:** Bounty of the Soil
  - **Cost:** 2 mana
  - **Effect:** Summon a 1/2 Plant with Taunt
  - **Target:** None
- **Weapon:** Sickle of Growth (5-mana spell)
  - **Immediate:** Summon three 2/3 Plants with Taunt
  - **Upgrade:** Bounty of the Soil+ - Summon a 2/3 Plant with Taunt
- **Passive:** Verdant Roots - Grass minions have +1 Health per friendly Taunt minion

---

#### 22. Aegir - God of the Brewing Sea
- **Element:** Water
- **Weakness:** Electric
- **Starting Health:** 115
- **Hero Power:** Brewmaster's Toast
  - **Cost:** 2 mana
  - **Effect:** Give a friendly minion +2 Attack this turn
  - **Target:** Friendly minion
- **Weapon:** Tankard of Storms (5-mana spell)
  - **Immediate:** Give all friendlies +3 Attack this turn and +1 Health permanently
  - **Upgrade:** Brewmaster's Toast+ - Give +3 Attack this turn
- **Passive:** Tidal Brew - Water minions have +1 Health after they attack

---

### TIER 2: ADDITIONAL HEROES (14 Heroes)

Extended roster for variety. These heroes have simplified power sets but full weapon upgrades and passives.

---

#### 23. Thorgrim - Thunder Warrior
- **Element:** Electric
- **Weakness:** Grass
- **Starting Health:** 120
- **Hero Power:** Lightning Strike
  - **Cost:** 2 mana
  - **Effect:** Deal 1 damage and Freeze target
  - **Target:** Enemy minion
- **Weapon:** Storm Hammer (5-mana spell)
  - **Immediate:** Deal 2 damage and Freeze all enemies
  - **Upgrade:** Lightning Strike+ - Deal 2 damage and Freeze target
- **Passive:** Static Field - Electric minions deal +1 damage to Frozen enemies

---

#### 24. Gefjon - Goddess of Plowing
- **Element:** Grass
- **Weakness:** Fire
- **Starting Health:** 115
- **Hero Power:** Furrow's Gift
  - **Cost:** 2 mana
  - **Effect:** Summon a 0/3 Totem with Taunt and Deathrattle: Give a random friendly +2/+2
  - **Target:** None
- **Weapon:** Plow of Ages (5-mana spell)
  - **Immediate:** Summon two 0/4 Totems with Taunt
  - **Upgrade:** Furrow's Gift+ - Summon a 0/4 Totem with Deathrattle: +3/+3 to random
- **Passive:** Fertile Ground - Grass minions have +1 Health

---

#### 25. Logi - Fire Giant
- **Element:** Fire
- **Weakness:** Water
- **Starting Health:** 125
- **Hero Power:** Blazing Spark
  - **Cost:** 2 mana
  - **Effect:** Deal 2 damage to a random enemy minion
  - **Target:** Random enemy minion
- **Weapon:** Flame of Consumption (5-mana spell)
  - **Immediate:** Deal 3 damage to all enemy minions
  - **Upgrade:** Blazing Spark+ - Deal 3 damage to random enemy minion
- **Passive:** Consuming Flame - Fire minions have +1 Attack

---

#### 26. Fjorgyn - Earth Mother
- **Element:** Grass
- **Weakness:** Fire
- **Starting Health:** 100
- **Hero Power:** Thunder's Call
  - **Cost:** 2 mana
  - **Effect:** Deal 1 damage to all enemy minions
  - **Target:** None (AoE)
- **Weapon:** Staff of the Earth (5-mana spell)
  - **Immediate:** Deal 2 damage to all enemies and restore 5 HP to hero
  - **Upgrade:** Thunder's Call+ - Deal 2 damage to all enemy minions
- **Passive:** Earthen Shield - Grass minions have +1 Health

---

#### 27. Valthrud - Storm Shaman
- **Element:** Electric
- **Weakness:** Grass
- **Starting Health:** 110
- **Hero Power:** Thunder Whisper
  - **Cost:** 2 mana
  - **Effect:** Deal 1 damage and give -1 Attack this turn
  - **Target:** Enemy minion
- **Weapon:** Thunder Staff (5-mana spell)
  - **Immediate:** Deal 2 damage to all enemies and give them -1 Attack
  - **Upgrade:** Thunder Whisper+ - Deal 2 damage and give -1 Attack permanently
- **Passive:** Storm Calling - Electric minions have +1 Attack

---

#### 28. Ylva - Wolf Mother
- **Element:** Grass
- **Weakness:** Fire
- **Starting Health:** 115
- **Hero Power:** Pack Call
  - **Cost:** 2 mana
  - **Effect:** Summon a 1/1 Wolf with Rush
  - **Target:** None
- **Weapon:** Fenrir's Fang (5-mana spell)
  - **Immediate:** Summon two 2/2 Wolves with Rush
  - **Upgrade:** Pack Call+ - Summon a 2/1 Wolf with Rush
- **Passive:** Pack Tactics - Grass minions have +1 Attack when attacking

---

#### 29. Brakki - Forge Master
- **Element:** Fire
- **Weakness:** Water
- **Starting Health:** 125
- **Hero Power:** Forge Spark
  - **Cost:** 2 mana
  - **Effect:** Give a friendly minion +1/+1
  - **Target:** Friendly minion
- **Weapon:** Brakki's Anvil (5-mana spell)
  - **Immediate:** Give all friendly minions +2/+2
  - **Upgrade:** Forge Spark+ - Give a friendly minion +2/+2
- **Passive:** Smith's Blessing - Fire minions have +1 Health

---

#### 30. Lirien - Wave Priestess
- **Element:** Water
- **Weakness:** Grass
- **Starting Health:** 110
- **Hero Power:** Wave Thread
  - **Cost:** 2 mana
  - **Effect:** Restore 3 health to a friendly minion
  - **Target:** Friendly minion
- **Weapon:** Trident of Tides (5-mana spell)
  - **Immediate:** Restore 5 health to all friendly minions
  - **Upgrade:** Wave Thread+ - Restore 5 health to a friendly minion
- **Passive:** Tidal Healing - Water minions restore 1 HP to themselves at end of turn

---

#### 31. Solvi - Dawn Knight
- **Element:** Light
- **Weakness:** Dark
- **Starting Health:** 120
- **Hero Power:** Morning Glow
  - **Cost:** 2 mana
  - **Effect:** Give a friendly minion +1 Attack and Divine Shield
  - **Target:** Friendly minion
- **Weapon:** Blade of Dawn (5-mana spell)
  - **Immediate:** Give all friendly minions +2 Attack and Divine Shield
  - **Upgrade:** Morning Glow+ - Give +2 Attack and Divine Shield
- **Passive:** Radiant Aura - Light minions have +1 Attack

---

#### 32. Gormr - Venom Wyrm
- **Element:** Dark
- **Weakness:** Light
- **Starting Health:** 105
- **Hero Power:** Venom Fang
  - **Cost:** 2 mana
  - **Effect:** Deal 1 damage and apply Poisonous this turn
  - **Target:** Enemy minion
- **Weapon:** Fang of Nidhogg (5-mana spell)
  - **Immediate:** Deal 2 damage to all enemies and give your minions Poisonous this turn
  - **Upgrade:** Venom Fang+ - Deal 2 damage and apply Poisonous
- **Passive:** Toxic Blood - Dark minions have Poisonous

---

#### 33. Thryma - Storm Caller
- **Element:** Electric
- **Weakness:** Grass
- **Starting Health:** 115
- **Hero Power:** Storm Step
  - **Cost:** 2 mana
  - **Effect:** Deal 2 damage; if target survives, return it to hand
  - **Target:** Enemy minion
- **Weapon:** Storm Orb (5-mana spell)
  - **Immediate:** Deal 3 damage to all enemies and return the weakest to hand
  - **Upgrade:** Storm Step+ - Deal 3 damage; if survives, return to hand
- **Passive:** Electrified - Electric minions have +1 Attack

---

#### 34. Eldrin - Ember Mage
- **Element:** Fire
- **Weakness:** Water
- **Starting Health:** 110
- **Hero Power:** Cinder Trail
  - **Cost:** 2 mana
  - **Effect:** Deal 1 damage and give -1 Health this turn
  - **Target:** Enemy minion
- **Weapon:** Phoenix Feather (5-mana spell)
  - **Immediate:** Deal 2 damage to all enemies and give them -1 Health
  - **Upgrade:** Cinder Trail+ - Deal 2 damage and give -1 Health permanently
- **Passive:** Burning Aura - Fire minions deal +1 damage

---

#### 35. Myrka - Bog Witch
- **Element:** Water
- **Weakness:** Grass
- **Starting Health:** 115
- **Hero Power:** Bog Grasp
  - **Cost:** 2 mana
  - **Effect:** Reduce an enemy minion's Attack by 2 this turn
  - **Target:** Enemy minion
- **Weapon:** Swamp Cauldron (5-mana spell)
  - **Immediate:** Reduce all enemy Attack by 2 and Freeze them
  - **Upgrade:** Bog Grasp+ - Reduce Attack by 3 permanently
- **Passive:** Murky Waters - Water minions have +1 Health

---

#### 36. Fjora - Nature Oracle
- **Element:** Grass
- **Weakness:** Fire
- **Starting Health:** 120
- **Hero Power:** Root Sight
  - **Cost:** 2 mana
  - **Effect:** Discover a Grass minion and give it +1/+1
  - **Target:** None
- **Weapon:** Yggdrasil Branch (5-mana spell)
  - **Immediate:** Summon a 3/5 Ancient with Taunt and Lifesteal
  - **Upgrade:** Root Sight+ - Discover a Grass minion and give it +2/+2
- **Passive:** Living Roots - Grass minions have Lifesteal

---

---

## PART 3: HERO-TO-CHESS-PIECE MAPPING

Each chess piece type has specific Norse heroes available for selection. Heroes draw from class-specific spell pools.

### Queen - Freya's Domain (Magic/Death)
**Spell Pools:** Mage, Warlock, Necromancer

| Hero | Class | Element | Role |
|------|-------|---------|------|
| **Odin** | Mage | Light | Card reveal and draw control |
| **Bragi** | Mage | Light | Buff allies with poetry |
| **Kvasir** | Mage | Light | Deck manipulation |
| **Forseti** | Warlock | Light | Divine shield and protection |
| **Mani** | Warlock | Dark | Stealth and shadow strikes |
| **Sol** | Necromancer | Fire | Radiant ally buffs |
| **Sinmara** | Necromancer | Fire | Fire damage dealer |
| **Eldrin** | Mage | Fire | Burn damage specialist |
| **Thryma** | Warlock | Electric | Bounce and damage control |

---

### Rook - Thor's Domain (Strength/Power)
**Spell Pools:** Warrior, Death Knight, Paladin

| Hero | Class | Element | Role |
|------|-------|---------|------|
| **Thor** | Warrior | Electric | AoE lightning damage |
| **Thorgrim** | Warrior | Electric | Freeze + damage combos |
| **Valthrud** | Warrior | Electric | Debuff attacks |
| **Magni** | Death Knight | Fire | Damage + ally buffs |
| **Brakki** | Death Knight | Fire | Forge buffs |
| **Tyr** | Paladin | Light | Sacrifice for power |
| **Vidar** | Paladin | Light | Vengeance mechanics |
| **Heimdall** | Paladin | Light | Taunt and protection |
| **Vili** | Warrior | Light | Strategic deck manipulation |

---

### Bishop - Frigg's Domain (Healing/Support)
**Spell Pools:** Priest, Druid, Shaman

| Hero | Class | Element | Role |
|------|-------|---------|------|
| **Freya** | Priest | Grass | Healing and life deathrattles |
| **Eir** | Priest | Grass | Pure healing |
| **Frey** | Priest | Grass | Nature tokens |
| **Idunn** | Druid | Grass | Youth restoration |
| **Ve** | Druid | Grass | Token summoner |
| **Fjorgyn** | Druid | Grass | Earth/taunt buffs |
| **Gerd** | Shaman | Grass | Totem summoner |
| **Gefjon** | Shaman | Grass | Deathrattle totems |
| **Ran** | Shaman | Water | Freeze and debuffs |

---

### Knight - Loki's Domain (Trickery/Speed)
**Spell Pools:** Rogue, Hunter, Berserker

| Hero | Class | Element | Role |
|------|-------|---------|------|
| **Loki** | Rogue | Dark | Copy and steal |
| **Hoder** | Rogue | Dark | Random damage |
| **Gormr** | Rogue | Dark | Poison damage |
| **Skadi** | Hunter | Ice | Freeze specialist |
| **Aegir** | Hunter | Water | Buff and freeze |
| **Fjora** | Hunter | Grass | Nature discover |
| **Myrka** | Berserker | Water | Debuff control |
| **Ylva** | Berserker | Grass | Wolf summons |
| **Lirien** | Rogue | Water | Heal and freeze |

---

### King - Primordial Entities (Passive Summoners)
**No Spells** - Kings provide passive army buffs only

| King | Element | Passive 1 | Passive 2 |
|------|---------|-----------|-----------|
| **Ymir** | Water | +2 Attack (aura) | -1 Attack to enemies (aura) |
| **Buri** | Light | +1 Armor (aura) | +1 Health at turn start |
| **Surtr** | Fire | +1 Attack (aura) | 1 damage to enemies at turn end |
| **Borr** | Grass | +1 Health (aura) | Summon 1/1 Taunt on minion death |
| **Yggdrasil** | Grass | Heal all 2 at turn start | +1 Attack when healed |
| **Auðumbla** | Water | +1 Health (aura) | Heal all on minion play |
| **Blainn** | Dark | +1 Health (aura) | Freeze random enemy at turn start |
| **Brimir** | Fire | +1 Attack (aura) | 1 damage to enemies on minion death |
| **Ginnungagap** | Dark | Summon 1/1 with random keyword at turn end | - |

---

## PART 4: FIXED SPELL ASSIGNMENTS

Each hero has **10 fixed cards**: 1 signature minion + 9 spells from their class pool.

### Queen Heroes (Mage/Warlock/Necromancer)

#### Mage Heroes (Odin, Bragi, Kvasir, Eldrin)

**Signature Minion:** Archmage Antonidas (14005) - Mythic spell synergy

| Spell Pool A (Odin) | Spell Pool B (Bragi) | Spell Pool C (Kvasir) |
|---------------------|----------------------|----------------------|
| Frost Nova (32003) | Arcane Missiles (32002) | Flamecannon (32010) |
| Niflheim's Embrace (32009) | Arcane Blast (32001) | Flame Strike (32005) |
| Ice Lance (14013) | Unstable Portal (31002) | Arcane Missiles (32002) |
| Ice Block (31004) | Mirror Entity (32011) | Arcane Blast (32001) |
| Polymorph (14009) | Vaporize (14012) | Mirror Image (32008) |
| Arcane Intellect (32006) | Arcane Intellect (32006) | Frost Nova (32003) |
| Flame Strike (32005) | Polymorph (14009) | Polymorph (14009) |
| Mirror Image (32008) | Frost Nova (32003) | Arcane Intellect (32006) |
| Flamecannon (32010) | Mirror Image (32008) | Ice Lance (14013) |

#### Warlock Heroes (Forseti, Mani, Thryma)

**Signature Minion:** Doomguard (17004) - 5/7 Charge demon

| Spell Pool A (Forseti) | Spell Pool B (Mani) |
|------------------------|---------------------|
| Lord Jaraxxus (17101) | Soulfire (17005) |
| Sense Demons (17102) | Fist of Jaraxxus (17104) |
| Siphon Soul (17006) | Shadow Bolt (17002) |
| Twisting Nether (17009) | Hellfire (17003) |
| Shadow Bolt (17002) | Shadowflame (17105) |
| Hellfire (17003) | Siphon Soul (17006) |
| Sacrificial Pact (17103) | Twisting Nether (17009) |
| Soulfire (17005) | Sense Demons (17102) |
| Shadowflame (17105) | Sacrificial Pact (17103) |

#### Necromancer Heroes (Sol, Sinmara)

**Signature Minion:** Lich Queen (4009) - 9 mana 4/8 mythic undead

| Spell Pool A (Sol) | Spell Pool B (Sinmara) |
|--------------------|------------------------|
| Mass Resurrection (4111) | Undead Horde (4106) |
| Eternal Servitude (4110) | Necrotic Plague (4107) |
| Graveyard Ritual (4103) | Death's Toll (4101) |
| Raise Dead (4100) | Death's Embrace (4108) |
| Soul Drain (4105) | Dark Ritual (4109) |
| Death's Toll (4101) | Raise Dead (4100) |
| Death's Embrace (4108) | Graveyard Ritual (4103) |
| Dark Ritual (4109) | Soul Drain (4105) |
| Necrotic Plague (4107) | Eternal Servitude (4110) |

---

### Rook Heroes (Warrior/Death Knight/Paladin)

#### Warrior Heroes (Thor, Thorgrim, Valthrud, Vili)

**Signature Minion:** Frothing Berserker (5030) - Damage scaling

| Spell Pool A (Thor) | Spell Pool B (Thorgrim) | Spell Pool C (Valthrud) |
|---------------------|-------------------------|-------------------------|
| Shield Slam (5022) | Fiery War Axe (5001) | Inner Rage (5013) |
| Shield Block (5026) | Gorehowl (5031) | Battle Rage (5019) |
| Brawl (5023) | Battle Rage (5019) | Execute (5025) |
| Execute (5025) | Commanding Shout (5014) | Slam (5018) |
| Gorehowl (5031) | Execute (5025) | Cleave (5029) |
| Slam (5018) | Cleave (5029) | Brawl (5023) |
| Inner Rage (5013) | Brawl (5023) | Fiery War Axe (5001) |
| Commanding Shout (5014) | Slam (5018) | Commanding Shout (5014) |
| Cleave (5029) | Inner Rage (5013) | Shield Block (5026) |

#### Death Knight Heroes (Magni, Brakki)

**Signature Minion:** Scourge Champion (3029) - Elite undead

| Spell Pool A (Magni) | Spell Pool B (Brakki) |
|----------------------|----------------------|
| Frostmourne (3009) | Army of the Dead (3005) |
| Remorseless Winter (3007) | Unholy Presence (3023) |
| Frost Presence (3022) | Bone Shield (3018) |
| Chains of Ice (3025) | Blood Boil (3011) |
| Icebound Fortitude (3013) | Blood Presence (3021) |
| Death Coil (3001) | Dark Command (3014) |
| Army of the Dead (3005) | Death Strike (3026) |
| Death Gate (3017) | Runeforged Blade (3012) |
| Runeblade (3024) | Death Coil (3001) |

#### Paladin Heroes (Tyr, Vidar, Heimdall)

**Signature Minion:** Tirion Fordring (8001) - 8 mana 6/6 Divine Shield/Taunt

| Spell Pool A (Tyr) | Spell Pool B (Vidar) | Spell Pool C (Heimdall) |
|--------------------|----------------------|-------------------------|
| Consecration (8002) | Consecration (8002) | Consecration (8002) |
| Blessing of Kings (8004) | Blessing of Kings (8004) | Blessing of Kings (8004) |
| Equality (8005) | Lay on Hands (8006) | Equality (8005) |
| Lay on Hands (8006) | Avenging Wrath (8010) | Lay on Hands (8006) |
| Holy Light (8007) | Holy Light (8007) | Avenging Wrath (8010) |
| Hammer of Wrath (8009) | Divine Favor (8008) | Blessing of Might (8011) |
| Blessing of Might (8011) | Humility (8013) | Hand of Protection (8012) |
| Hand of Protection (8012) | Repentance (8014) | Redemption (8015) |
| Redemption (8015) | Noble Sacrifice (8016) | Noble Sacrifice (8016) |

---

### Bishop Heroes (Priest/Druid/Shaman)

#### Priest Heroes (Freya, Eir, Frey)

**Signature Minion:** Murozond the Infinite (5114) - 8/8 mythic

| Spell Pool A (Freya) | Spell Pool B (Eir) | Spell Pool C (Frey) |
|----------------------|---------------------|---------------------|
| Holy Fire (9022) | Shadow Madness (9019) | Shadow Madness (9019) |
| Renew (6005) | Mind Vision (9017) | Mind Vision (9017) |
| Power Infusion (6004) | Holy Fire (9022) | Holy Fire (9022) |
| Apotheosis (6006) | Power Infusion (6004) | Apotheosis (6006) |
| Lightwell (9021) | Inner Fire (9016) | Power Infusion (6004) |
| Inner Fire (9016) | Renew (6005) | Renew (6005) |
| Power Word: Replicate (6003) | Apotheosis (6006) | Inner Fire (9016) |
| Raza the Chained (70001) | Power Word: Replicate (6003) | Power Word: Replicate (6003) |
| Shadow Madness (9019) | Raza the Chained (70001) | Lightwell (9021) |

#### Druid Heroes (Idunn, Ve, Fjorgyn)

**Signature Minion:** Cenarius (33003) - 9 mana 5/8 mythic choose one

| Spell Pool A (Idunn/Fjorgyn) | Spell Pool B (Ve) |
|------------------------------|-------------------|
| Innervate (11003) | Force of Nature (11058) |
| Overgrowth (11050) | Soul of the Forest (11016) |
| Nourish (33001) | Mark of the Wild (11015) |
| Rejuvenation (11040) | Jade Blossom (85002) |
| Force of Nature (11058) | Wildgrowth Surge (11042) |
| Mark of the Wild (11015) | Feral Instinct (11043) |
| Soul of the Forest (11016) | Rejuvenation (11040) |
| Flourish (11052) | Keeper of the Grove (33002) |
| Jade Blossom (85002) | Innervate (11003) |

#### Shaman Heroes (Gerd, Gefjon, Ran)

**Signature Minion:** Al'Akir the Windlord (5117) - 8 mana mythic

| Spell Pool A (Gerd/Ran) | Spell Pool B (Gefjon) |
|-------------------------|----------------------|
| Lightning Bolt (4101) | Hex (4103) |
| Lightning Storm (4102) | Lightning Bolt (4101) |
| Hex (4103) | Lightning Storm (4102) |
| Dunk Tank (4104) | Dunk Tank (4104) |
| Landslide (4105) | Landslide (4105) |
| Frog (4501) | Frog (4501) |
| Vashj Prime (4502) | Vashj Prime (4502) |
| The Lurker Below (5116) | The Lurker Below (5116) |
| Lady Vashj (5115) | Lady Vashj (5115) |

---

### Knight Heroes (Rogue/Hunter/Berserker)

#### Rogue Heroes (Loki, Hoder, Gormr, Lirien)

**Signature Minion:** Edwin VanCleef (12404) - Combo scaling mythic

| Spell Pool A (Loki/Lirien) | Spell Pool B (Hoder) | Spell Pool C (Gormr) |
|----------------------------|----------------------|----------------------|
| Backstab (12101) | Backstab (12101) | Preparation (12102) |
| Preparation (12102) | Assassinate (12110) | Shadowstep (12103) |
| Eviscerate (12107) | Sap (12106) | Sinister Strike (12105) |
| Shadowstep (12103) | Eviscerate (12107) | Eviscerate (12107) |
| Fan of Knives (12108) | Deadly Poison (12104) | Blade Flurry (12109) |
| Assassinate (12110) | Assassin's Blade (12303) | Assassin's Blade (12303) |
| Sap (12106) | Perdition's Blade (12304) | Perdition's Blade (12304) |
| Deadly Poison (12104) | Fan of Knives (12108) | Sap (12106) |
| Sinister Strike (12105) | Preparation (12102) | Deadly Poison (12104) |

#### Hunter Heroes (Skadi, Aegir, Fjora)

**Signature Minion:** Fang Commander (7020) - 7 mana 5/5 mythic

| Spell Pool A (Skadi/Fjora) | Spell Pool B (Aegir) |
|----------------------------|----------------------|
| Unleash the Hounds (7001) | Explosive Trap (7101) |
| Animal Companion (7002) | Freezing Trap (7102) |
| Call of the Wild (7108) | Snipe (7109) |
| Wild Growth (7106) | Misdirection (7110) |
| Beast Command (7107) | Eaglehorn Bow (7003) |
| Deadly Shot (7005) | Multi-Shot (7103) |
| Explosive Trap (7101) | Tracking Shot (7100) |
| Freezing Trap (7102) | Deadly Shot (7005) |
| Multi-Shot (7103) | Hunter's Mark (7105) |

#### Berserker Heroes (Myrka, Ylva)

**Signature Minion:** Altruis the Outcast (9112) - Outcast AoE minion

| Spell Pool A (Myrka) | Spell Pool B (Ylva) |
|----------------------|---------------------|
| Skull of Gul'dan (9105) | Chaos Strike (9101) |
| Eye Beam (50001) | Mana Burn (9104) |
| Spectral Sight (50002) | Coordinated Strike (9116) |
| Metamorphosis (9113) | Flamereaper (10008) |
| Chaos Strike (9101) | Eye Beam (50001) |
| Soul Cleave (9102) | Soul Cleave (9102) |
| Blur (9103) | Blur (9103) |
| Coordinated Strike (9116) | Spectral Sight (50002) |
| Mana Burn (9104) | Skull of Gul'dan (9105) |

---

## Hero Power Effect Types

Map hero powers to existing effect handlers:

| Power Type | Effect Handler | Example Heroes |
|------------|---------------|----------------|
| `damage_single` | `executeMagePower` pattern | Blind Shot |
| `damage_aoe` | AoE damage handler | Mjolnir's Wrath, Thunder's Call |
| `damage_random` | Random target selection | Solar Flare, Blazing Spark |
| `heal_single` | `executePriestPower` pattern | Herbal Remedy, Wave Thread |
| `buff_single` | Modify minion stats | Blessing of Valhalla, Forge Spark |
| `buff_aoe` | Buff all friendly minions | Inspiring Verse |
| `summon` | `executePaladinPower` pattern | Bountiful Seed, Gift of Life |
| `debuff` | Reduce enemy stats | Net of Fate, Burning Gaze |
| `freeze` | Set `isFrozen = true` | Frostbite Strike |
| `stealth` | Grant stealth keyword | Lunar Shadow |
| `draw` | Card manipulation | Wisdom of Ravens |
| `copy` | Copy opponent cards | Deceptive Grasp |
| `reveal` | Reveal opponent hand | Wisdom of Ravens |

---

## Weapon Upgrade System

### Overview
Each hero has a unique 5-mana Weapon Spell that:
1. Provides an immediate powerful effect
2. Permanently upgrades their hero power for the rest of the game

### Data Structure

```typescript
interface WeaponUpgradeCard {
  id: number;
  name: string;
  type: 'weapon_upgrade';
  manaCost: 5; // Always 5 mana
  heroId: string; // Links to specific hero
  immediateEffect: SpellEffect;
  upgradesHeroPowerTo: string; // Name of upgraded power
  description: string;
  flavorText?: string;
}
```

### Upgrade Execution Flow
1. Player plays weapon card (must have 5 mana)
2. Deduct 5 mana from player
3. Execute `immediateEffect`
4. Replace `player.heroPower` with upgraded version
5. Set `heroPower.isUpgraded = true`
6. Weapon card is consumed (goes to graveyard)

---

## Hero Passive System

### Passive Trigger Types

```typescript
type HeroPassiveTrigger = 
  | 'on_minion_play'      // When hero plays a minion
  | 'on_spell_cast'       // When hero casts a spell  
  | 'on_minion_attack'    // When a friendly minion attacks
  | 'on_minion_death'     // When any minion dies
  | 'on_damage_dealt'     // When hero/minion deals damage
  | 'on_heal'             // When any heal occurs
  | 'on_draw'             // When hero draws a card
  | 'end_of_turn'         // At end of hero's turn
  | 'start_of_turn'       // At start of hero's turn
  | 'always';             // Continuous aura effect
```

### Passive Condition Filters

```typescript
interface PassiveCondition {
  minionElement?: 'fire' | 'water' | 'grass' | 'light' | 'dark' | 'electric' | 'ice';
  minionKeyword?: string;
  targetType?: 'friendly' | 'enemy' | 'any';
  requiresStealth?: boolean;
  requiresFrozen?: boolean;
}
```

---

## Implementation Priority

### Phase 1: Core Data
1. Add 36 hero definitions to `norseHeroes/heroDefinitions.ts`
2. Add 36 hero power definitions to `norseHeroes/heroPowers.ts`
3. Add 9 king definitions to `norseKings/kingDefinitions.ts`

### Phase 2: Execution Logic
1. Extend `heroPowerUtils.ts` for Norse hero powers
2. Create `kingPassiveUtils.ts` for King passive execution
3. Wire passives into combat event system

### Phase 3: Weapon Upgrades
1. Create 36 weapon upgrade cards
2. Implement upgrade execution logic
3. Add upgraded power variants

### Phase 4: UI Integration
1. Update hero selection to show powers
2. Add King passive indicators
3. Show weapon upgrade status

---

## File Structure

```
client/src/game/
├── data/
│   ├── norseHeroes/
│   │   ├── index.ts           # Export all heroes
│   │   ├── heroDefinitions.ts # 36 hero base data
│   │   ├── heroPowers.ts      # Hero power definitions
│   │   ├── heroPassives.ts    # Hero passive definitions
│   │   └── heroWeapons.ts     # Weapon upgrade cards
│   └── norseKings/
│       ├── index.ts           # Export all kings
│       ├── kingDefinitions.ts # 9 king base data
│       └── kingPassives.ts    # King passive definitions
├── utils/
│   ├── norseHeroPowerUtils.ts # Norse hero power execution
│   └── kingPassiveUtils.ts    # King passive execution
└── types/
    └── NorseTypes.ts          # Type definitions for all Norse characters
```

---

## Element System Reference

> **NOTE:** This hero element system is a DESIGN DOCUMENT for hero theming and abilities. 
> The actual **chess piece element system** (used in PokerCombatStore for combat buffs) only supports: 
> `fire | water | wind | earth | holy | shadow | neutral`
> 
> Hero elements like "Electric" and "Ice" map to the chess system as follows:
> - Electric → maps to Fire in chess combat
> - Ice → maps to Water in chess combat
> See `docs/ElementWeaknessSystem.md` for the implemented chess piece element mechanics.

| Element | Color | Strong Against | Weak Against |
|---------|-------|----------------|--------------|
| Fire | Red/Orange | Earth | Water |
| Water | Blue | Fire | Wind |
| Wind | Green | Water | Earth |
| Earth | Brown | Wind | Fire |
| Light/Holy | Gold/White | Dark/Shadow | Dark/Shadow (mutual) |
| Dark/Shadow | Purple/Black | Light/Holy | Light/Holy (mutual) |
| Neutral | Gray | - | - |

**Chess Combat Bonus (when strong against opponent):** +2 Attack, +2 Health, +20 Armor
