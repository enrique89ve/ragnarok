import { CardData } from '../types';

// Base card database (Norse/Greek mythology themed cards)
export const fullCardDatabase: CardData[] = [
    {
    id: 1001,
    name: 'Sea Sprite Raider',
  description: 'A mystical servant of the sea.',
  
  flavorText: 'From the depths of Aegir\'s realm, they come with shells as shields!',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 1,
  
  attack: 2,
  health: 1,
  
  race: "Naga",
      class: "Neutral",
      collectible: true
  },
  {
    id: 1002,
    name: 'Fenris Cub',
  description: 'Young beast destined for greatness.',
  
  flavorText: 'A young spawn of the great wolf Fenrir, destined to grow mighty.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 2,
  
  attack: 3,
  health: 2,
  
  race: "Beast",
      class: "Neutral",
      collectible: true
  },
  {
    id: 1003,
    name: 'Midgard Serpent Spawn',
  description: 'A small but cunning serpent from the World Tree.',
  
  flavorText: 'A lesser offspring of Jörmungandr, the World Serpent.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 2,
  
  attack: 2,
  health: 3,
  
  race: "Beast",
      class: "Neutral",
      collectible: true
  },
  {
    id: 1004,
    name: 'Jotun Brute',
  description: 'A formidable frost giant warrior.',
  
  flavorText: 'From the frozen wastes of Jotunheim, a faithful warrior of the frost giants.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 4,
  
  attack: 4,
  health: 5,
      class: "Neutral",
      collectible: true
  },
  {
    id: 1008,
    name: 'Einherjar Guardian',
  description: 'Taunt',
  
  flavorText: 'Fallen warriors chosen by the Valkyries to defend Valhalla.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 4,
  
  attack: 3,
  health: 5,
  
  class: 'Neutral',
  keywords: ['taunt'],
      collectible: true
  },
  {
    id: 2002,
    name: 'Nidhogg Whelp',
      description: 'Spell Damage +1. Battlecry: Draw a card.',

      flavorText: 'Young kin of Níðhöggr, the dragon who gnaws at Yggdrasil\'s roots.',
      type: 'minion',

      rarity: 'rare',
      manaCost: 5,

      attack: 4,
      health: 4,

      race: "Dragon",
      class: 'Neutral',

      keywords: ['battlecry', 'spell_damage'],
      collectible: true,

      heroClass: 'neutral',
                  battlecry: {
        type: "draw",
      value: 1,

      requiresTarget: false,
      targetType: "none"

       }
    },
  {
    id: 3002,
    name: 'Titan of Olympus',
  description: 'Costs (1) less for each card in your hand.',
  
  flavorText: 'Before the gods, the Titans ruled from Mount Othrys.',
  type: 'minion',
  
  rarity: 'rare',
  manaCost: 12,
  
  attack: 8,
  health: 8,
  
  race: "Elemental",
      class: "Neutral"
  },
  {
    id: 3008,
    name: 'Valkyrie Champion',
  description: 'Battlecry: All minions lose Divine Shield. Gain +3/+3 for each Shield lost.',
  
  flavorText: 'The Valkyries choose who lives and who dies on the battlefield.',
  type: 'minion',
  
  rarity: 'rare',
  manaCost: 3,
  
  attack: 3,
  health: 3,
  
  class: 'Neutral',
  keywords: ['battlecry'],
      collectible: true
  },
  {
    id: 3010,
    name: 'All-Seeing Runesmith',
  description: 'Battlecry: Swap the Attack and Health of a minion.',
  
  flavorText: 'They weave fate with every inscription, seeing beyond the mortal realm.',
  type: 'minion',
  
  rarity: 'rare',
  manaCost: 2,
  
  attack: 2,
  health: 2,
  
  class: 'Neutral',
  keywords: ['battlecry'],
      collectible: true
  },
  {
    id: 4501,
    name: 'Glowing Draugr',
  description: 'Add 2 random Nagas to your hand.',
  
  flavorText: 'An undead Norse warrior whose eerie glow attracts sea spirits.',
  type: 'spell',
  
  rarity: 'common',
  manaCost: 3,
      class: "Neutral",
      collectible: true
  },
  {
    id: 4503,
    name: 'Norns\' Hourglass',
  description: 'Rune: When your opponent plays a minion, return it to their hand and it costs (2) more.',
  flavorText: 'The Norns weave fate at the roots of Yggdrasil.',
  
  type: 'spell',
  rarity: 'rare',
  
  manaCost: 3,
  class: 'Neutral',
  
  keywords: ['secret'],
      collectible: true
  },
  {
    id: 4505,
    name: 'Rune of Asgard',
  description: 'Give a minion +2/+2. If it\'s a Dragon, also give it Divine Shield.',
  flavorText: 'Sacred runes inscribed by Odin himself grant divine protection.',
  
  type: 'spell',
  rarity: 'common',
  
  manaCost: 3,
      class: "Neutral",
      collectible: true
  },
  {
    id: 4506,
    name: 'Yggdrasil\'s Gift',
  description: 'Refresh 2 Mana Crystals.',
  
  flavorText: 'The World Tree shares its infinite energy with those who are worthy.',
  type: 'spell',
  
  rarity: 'common',
  manaCost: 0,
      class: "Neutral",
      collectible: true
  },
  {
    id: 5100,
    name: 'Surtr\'s Cleaver',
  description: 'Forged in the fires of destruction.',
  
  flavorText: 'Forged in Muspelheim\'s eternal flames by the fire giant Surtr.',
  type: 'weapon',
  
  rarity: 'common',
  manaCost: 3,
  
  attack: 3,
  durability: 2,
  
  class: "Warrior",
      collectible: true
  },
  {
    id: 5009,
    name: 'Jotun Taskmaster',
      description: 'Battlecry: Deal 1 damage to a minion and give it +2 Attack.',

      flavorText: 'The frost giants drive their workers with icy discipline.',
      type: 'minion',

      rarity: 'common',
      manaCost: 2,

      attack: 2,
      health: 2,

      class: 'Warrior',
      keywords: ['battlecry'],
      collectible: true,
      battlecry: {
        type: 'damage_and_buff',
        value: 1,

        buffAttack: 2,
      targetType: 'any_minion',

      requiresTarget: true
    }
    },
  {
    id: 5012,
    name: 'Einherjar Commander',
      description: 'Your Charge minions have +1 Attack.',

      flavorText: 'In Valhalla, the einherjar fight and feast for eternity.',
      type: 'minion',

      rarity: 'common',
      manaCost: 3,

      attack: 2,
      health: 3,

      class: "Warrior",
  },
  {
    id: 5013,
    name: 'Berserker\'s Fury',
      description: 'Deal 1 damage to a minion and give it +2 Attack.',

      flavorText: 'Norse berserkers channeled divine rage in battle.',
      type: 'spell',

      rarity: 'common',
      manaCost: 0,

      class: "Warrior",
      collectible: true,

      spellEffect: {
        type: 'damage_and_buff',

        value: 1,


        buffAttack: 2,

      targetType: 'any_minion',
      requiresTarget: true

       }
    },
  {
    id: 5014,
    name: "Sovereign's Rally",
      description: "Your minions can't be reduced below 1 Health this turn. Draw a card.",

      flavorText: 'When the call echoes across the battlefield, none may fall.',
      type: 'spell',

      rarity: 'common',
      manaCost: 2,

      class: "Warrior",
      collectible: true,

      spellEffect: {
        type: 'commanding_shout',

        drawCards: 1
    }
    },
  {
    id: 5015,
    name: 'Thunder-Forged Berserker',
  description: 'Charge',
  
  flavorText: 'Warriors struck by lightning gain the fury of the storm.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 4,
  
  attack: 4,
  health: 3,
  
  class: 'Warrior',
  keywords: ['charge'],
      collectible: true
  },
  {
    id: 5017,
    name: 'Steadfast Bulwark',
  description: 'Taunt. Has +3 Attack while damaged.',
  
  flavorText: 'A shield that grows stronger as the battle rages.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 4,
  
  attack: 2,
  health: 6,
  
  class: 'Warrior',
  keywords: ['taunt'],
  
  
  collectible: true
  },
  {
    id: 5018,
    name: 'Thunderbolt Strike',
    description: 'Deal 2 damage to a minion. If it survives, draw a card.',
    flavorText: 'The fury of the storm always returns with power.',
      type: 'spell',

      rarity: 'common',
      manaCost: 2,

      class: "Warrior",
      collectible: true,

      spellEffect: {
        type: 'damage_draw_if_survives',

        value: 2,


        targetType: 'any_minion',

      requiresTarget: true
    }
    },
  {
    id: 5101,
    name: 'Mythic War-Sovereign',
      description: 'Battlecry: Equip a 4/2 Helgrind\'s Cleaver that also damages adjacent minions.',

      flavorText: 'A master of battle and heroic glory.',
      type: 'hero',

      rarity: 'epic',
      manaCost: 9,

      health: 100,
      armor: 5,

      class: 'Warrior',
      keywords: ['battlecry'],
      collectible: true,
                  battlecry: {
        type: 'equip_weapon',
      
      summonCardId: 5102

      
       }
    },
  {
    id: 14020,
    name: 'Phaethon\'s Fall',
      description: 'Deal 15 damage to a minion and 3 damage to adjacent ones.',

      flavorText: 'Like the son of Helios who fell from the sun chariot.',
      type: 'spell',

      rarity: 'epic',
      manaCost: 6,

      class: 'Mage',

      spellEffect: {
        type: 'damage_with_adjacent',

        value: 15,


        adjacentDamage: 3,

      targetType: 'any_minion',
      requiresTarget: true

       }
    },
  {
    id: 14021,
    name: 'Bifrost Gate',
    description: 'Foresee a random 8, 9, or 10-Cost minion.',
      flavorText: 'The rainbow bridge connects Midgard to Asgard.',

      type: 'spell',
      rarity: 'epic',

      manaCost: 5,
      class: "Mage",
      collectible: true,
      spellEffect: {
        type: 'discover',
      discoveryType: 'minion',

      discoveryManaCostRange: [8, 10],
      discoveryCount: 3

       }
    },
  {
    id: 7200,
    name: 'Call of the Wild Hunt',
      description: 'Summon a random Beast Companion.',

      flavorText: 'Odin leads the Wild Hunt across the winter skies.',
      type: 'spell',

      rarity: 'common',
      manaCost: 3,

      class: "Hunter",
      collectible: true,

      spellEffect: {
        type: 'summon_random',

        options: [7010, 7011, 7012],
      value: 1

       }
    },
  {
    id: 7007,
    name: 'Jörmungandr\'s Coils',
    description: 'Rune: When one of your minions is attacked, summon three 1/1 Snakes.',
      flavorText: 'The World Serpent\'s children slither to your defense.',

      type: 'spell',
      rarity: 'epic',

      manaCost: 2,
      class: 'Hunter',

      keywords: ['secret'],
      collectible: true,

      secretEffect: {
      type: 'summon',

        summonCardId: 7015,
      value: 3,

      triggerType: 'on_friendly_minion_attacked'
    }
    },
  {
    id: 7009,
    name: 'Untamed Wild-Fury',
      description: 'Give a Beast +2 Attack and Immune this turn.',

      flavorText: 'The wild animals protect their own with primal intensity.',
      type: 'spell',

      rarity: 'epic',
      manaCost: 1,

      class: "Hunter",
      collectible: true,

      spellEffect: {
        type: 'buff_and_immune',

        buffAttack: 2,
      targetType: 'friendly_beast',

      requiresTarget: true,
      duration: 'turn',

      grantKeywords: ['immune']
    }
    },
  {
    id: 7010,
    name: 'Bjorn, the Sacred Bear',
  description: 'Taunt',
  
  flavorText: 'A mighty bear blessed by the gods of the forest.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 3,
  
  attack: 4,
  health: 4,
  
  race: "Beast",
      class: 'Hunter',
  
  keywords: ['taunt'],
      collectible: false
  },
  {
    id: 7012,
    name: 'Sleipnir\'s Kin',
      description: 'Your other minions have +1 Attack.',

      flavorText: 'Descended from Odin\'s eight-legged steed.',
      type: 'minion',

      rarity: 'common',
      manaCost: 3,

      attack: 2,
      health: 4,

      race: "Beast",
      class: "Hunter",
      collectible: false,
      auraEffect: {
      type: 'buff_attack',
      value: 1,

      targetType: 'other_friendly_minions'
    }
    },
  {
    id: 7015,
    name: 'Serpent of Midgard',
  description: 'A small kin of the World Serpent.',
  
  flavorText: 'A tiny spawn of the great World Serpent.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 1,
  
  attack: 1,
  health: 1,
  
  race: "Beast",
      class: "Hunter",
      collectible: false
  },
  {
    id: 7017,
    name: 'Sun-Piercing Arrow',
      description: 'Destroy a random enemy minion.',

      flavorText: 'An arrow that carries the heat of the sun never misses.',
      type: 'spell',

      rarity: 'common',
      manaCost: 3,

      class: "Hunter",
      collectible: true,

      spellEffect: {
        type: 'destroy_random',

        targetType: 'enemy_minion'
    }
    },
  {
    id: 7019,
    name: 'Fenrir\'s Pup',
      description: 'Your other Beasts have +1 Attack.',

      flavorText: 'Young wolves of Fenrir\'s bloodline inspire their pack.',
      type: 'minion',

      rarity: 'rare',
      manaCost: 1,

      attack: 1,
      health: 1,

      race: "Beast",
      class: "Hunter",
      collectible: true,
      auraEffect: {
      type: 'buff_attack',
      value: 1,

      targetType: 'other_friendly_beasts'
    }
    },
  {
    id: 7020,
    name: 'Huntress\'s Mark',
      description: 'Change a minion\'s Health to 1.',

      flavorText: 'Artemis marks her prey for the kill.',
      type: 'spell',

      rarity: 'common',
      manaCost: 1,

      class: "Hunter",
      collectible: true,

      spellEffect: {
        type: 'set_health',

        value: 1,


        targetType: 'any_minion',

      requiresTarget: true
    }
    },
  {
    id: 7021,
    name: 'Golden Charge-Boar',
      description: 'Your Beasts have Charge.',

      flavorText: 'Freyr\'s golden boar could run faster than any horse.',
      type: 'minion',

      rarity: 'common',
      manaCost: 5,

      attack: 2,
      health: 5,

      race: "Beast",
      class: "Hunter",
      collectible: true,
      auraEffect: {
      type: 'grant_keyword',
      keyword: 'charge',

      targetType: 'friendly_beasts'
    }
    },
  {
    id: 7022,
    name: 'Raven\'s Sight',
      description: 'Look at the top 3 cards of your deck. Draw one and discard the others.',

      flavorText: 'Huginn and Muninn see all for the Allfather.',
      type: 'spell',

      rarity: 'common',
      manaCost: 1,

      class: "Hunter",
      collectible: true,

      spellEffect: {
        type: 'discover_from_deck',

        count: 3,
      drawCount: 1

       }
    },
  {
    id: 7023,
    name: 'Thunder Bolt',
      description: 'Deal 5 damage to a minion and 2 damage to adjacent ones.',

      flavorText: 'Zeus\'s wrath strikes true and spreads.',
      type: 'spell',

      rarity: 'rare',
      manaCost: 5,

      class: "Hunter",
      collectible: true,

      spellEffect: {
        type: 'damage_with_adjacent',

        primaryDamage: 5,
      adjacentDamage: 2,

      targetType: 'any_minion',
      requiresTarget: true

       }
    },
  {
    id: 7024,
    name: "Chaos-Weaver's Trick",
    description: 'Rune: When an enemy attacks your hero, instead it attacks another random character.',
      flavorText: 'Chaos delights in the confusion of battle.',

      type: 'spell',
      rarity: 'rare',

      manaCost: 2,
      class: 'Hunter',

      keywords: ['secret'],
      collectible: true,

      secretEffect: {
      type: 'redirect_attack',

        targetType: 'random_character',
      triggerType: 'on_hero_attack'

       }
    },
  {
    id: 8001,
    name: 'Blade of Freyr',
    description: 'Whenever your hero attacks, restore 2 Health to it.',
    flavorText: 'Freyr\'s sword fights on its own for a worthy wielder.',
      type: 'weapon',

      rarity: 'common',
      manaCost: 4,

      attack: 4,
      durability: 2,

      class: "Paladin",
      collectible: true,

      weaponEffect: {
      type: 'heal_on_attack',

        value: 2,


        targetType: 'friendly_hero'

       }
    },
  {
    id: 8006,
    name: 'Ragnarök\'s Balance',
      description: 'Change the Health of ALL minions to 1.',

      flavorText: 'In the twilight of the gods, all shall be equal.',
      type: 'spell',

      rarity: 'rare',
      manaCost: 2,

      class: "Paladin",
      collectible: true,

      spellEffect: {
        type: 'set_health',

        value: 1,


        targetType: 'all_minions'

       }
    },
  {
    id: 8008,
    name: 'Radiant Dawn',
      description: 'Restore 6 Health.',

      flavorText: 'The light of a new day brings hope and healing.',
      type: 'spell',

      rarity: 'common',
      manaCost: 2,

      class: "Paladin",
      collectible: true,

      spellEffect: {
        type: 'heal',

        value: 6,


        targetType: 'any',

      requiresTarget: true
    }
    },
  {
    id: 8009,
    name: "Golden Weaver's Blessing",
      description: 'Draw cards until you have as many in hand as your opponent.',

      flavorText: 'Luck and fortune bestow favor upon the worthy.',
      type: 'spell',

      rarity: 'rare',
      manaCost: 3,

      class: "Paladin",
      collectible: true,

      spellEffect: {
        type: 'draw_to_match_opponent',

        targetType: 'none'
    }
    },
  {
    id: 8012,
    name: "Storm-Hammer's Blessing",
      description: 'Give a minion +3 Attack.',

      flavorText: 'The strength of thunder grants immense power.',
      type: 'spell',

      rarity: 'common',
      manaCost: 1,

      class: "Paladin",
      collectible: true,

      spellEffect: {
        type: 'buff_attack',

        value: 3,


        targetType: 'any_minion',

      requiresTarget: true
    }
    },
  {
    id: 8013,
    name: "Tactic-Master's Insight",
    description: 'Choose a minion. Whenever it attacks, draw a card.',
    flavorText: 'A strategic mind finds opportunity in every strike.',
      type: 'spell',

      rarity: 'common',
      manaCost: 1,

      class: "Paladin",
      collectible: true,

      spellEffect: {
        type: 'enchant',

        targetType: 'any_minion',
      requiresTarget: true,

      enchantEffect: {
      type: 'draw_on_attack',

        value: 1
      }
    }
    },
  {
    id: 8014,
    name: 'Sacrifice to the Gods',
    description: 'Rune: When an enemy attacks, summon a 2/1 Defender as the new target.',
    flavorText: 'The worthy give their lives for divine protection.',
      type: 'spell',

      rarity: 'common',
      manaCost: 1,

      class: 'Paladin',
      keywords: ['secret'],
      collectible: true,
      secretEffect: {
      type: 'summon_defender',
    summonCardId: 8015,
      triggerType: 'on_enemy_attack'

       }
    },
  {
    id: 8015,
    name: 'Temple Guardian',
  description: 'Guardian summoned to protect the divine.',
  
  flavorText: 'Sacred protectors of the divine temples.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 1,
  
  attack: 2,
  health: 1,
  
  class: "Paladin",
      collectible: false
  },
  {
    id: 8016,
    name: 'Wrath of the Furies',
    description: 'Rune: When your hero takes damage, deal that much damage to the enemy hero.',
      flavorText: 'The Furies demand vengeance for every slight.',

      type: 'spell',
      rarity: 'common',

      manaCost: 1,
      class: 'Paladin',

      keywords: ['secret'],
      collectible: true,

      secretEffect: {
      type: 'mirror_damage',

        triggerType: 'on_hero_damage'
    }
    },
  {
    id: 8018,
    name: 'Valkyrie\'s Vengeance',
    description: 'Rune: When one of your minions dies, give a random friendly minion +3/+2.',
      flavorText: 'The Valkyries empower those who witness their fallen comrades.',

      type: 'spell',
      rarity: 'common',

      manaCost: 1,
      class: 'Paladin',

      keywords: ['secret'],
      collectible: true,

      secretEffect: {
      type: 'buff_random',

        buffAttack: 3,
      buffHealth: 2,

      targetType: 'random_friendly_minion',
      triggerType: 'on_friendly_minion_death'

       }
    },
  {
    id: 8019,
    name: 'Sentinel of Asgard',
      description: 'Battlecry: Restore 6 Health to your hero.',

      flavorText: 'The eternal guardians of the golden realm.',
      type: 'minion',

      rarity: 'common',
      manaCost: 7,

      attack: 5,
      health: 6,

      class: 'Paladin',
      keywords: ['battlecry'],
      collectible: true,
                  battlecry: {
        type: 'heal',
      value: 6,

      targetType: 'friendly_hero'
    }
    },
  {
    id: 8020,
    name: 'Shield-Maiden of Baldur',
      description: 'Battlecry: Give a friendly minion Divine Shield.',

      flavorText: 'Blessed by the god of light, her shield protects all.',
      type: 'minion',

      rarity: 'common',
      manaCost: 2,

      attack: 2,
      health: 2,

      class: 'Paladin',
      keywords: ['battlecry'],
                  battlecry: {
        type: 'give_divine_shield',
      targetType: 'friendly_minion',

      requiresTarget: true
    }
    },
  {
    id: 8021,
    name: 'Aspirant of Valhalla',
  description: 'A warrior training for the eternal halls.',
  
  flavorText: 'Young warriors training for their place in the eternal halls.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 1,
  
  attack: 1,
  health: 1,
  
  class: "Paladin",
      collectible: false
  },
  {
    id: 8022,
    name: 'Sword of Heimdall',
    description: 'After you summon a minion, give it +1/+1 and this loses 1 Durability.',
      flavorText: 'Heimdall\'s blade, forged to defend the Bifrost.',

      type: 'weapon',
      rarity: 'epic',

      manaCost: 3,
      attack: 1,

      durability: 5,
      class: "Paladin",
      collectible: true,
      onSummonEffect: {
      type: 'buff_minion_lose_durability',
      buffAttack: 1,

      buffHealth: 1,
      durabilityLoss: 1

       }
    },
  {
    id: 8023,
    name: 'Curse of Nemesis',
    description: 'Rune: After your opponent plays a minion, reduce its Health to 1.',
      flavorText: 'The goddess of retribution weakens the arrogant.',

      type: 'spell',
      rarity: 'common',

      manaCost: 1,
      class: 'Paladin',

      keywords: ['secret'],
      collectible: true,

      secretEffect: {
      type: 'reduce_health',

        value: 1,


        triggerType: 'after_enemy_minion_played'

       }
    },
  {
    id: 8024,
    name: 'Divine-Metal Bulwark',
      description: 'Give a minion Divine Shield.',

      flavorText: 'Divine metal protects the worthy.',
      type: 'spell',

      rarity: 'common',
      manaCost: 1,

      class: "Paladin",
      collectible: true,

      spellEffect: {
        type: 'give_divine_shield',

        targetType: 'any_minion',
      requiresTarget: true

       }
    },
  {
    id: 8025,
    name: 'Baldur, Shield of Light',
      description: 'Battlecry: Equip a 5/3 Ashbringer.',

      flavorText: 'The beloved god of light and purity.',
      type: 'hero',

      rarity: 'epic',
      manaCost: 9,

      armor: 5,
      class: 'Paladin',

      keywords: ['battlecry'],
      collectible: true,

                  battlecry: {
        type: 'equip_weapon',

        summonCardId: 8003
    
    },
      heroPower: {
    name: 'The Four Heralds of Ragnarök',
    cost: 2,
    used: false,
    description: 'Hero Power: Summon a 2/2 Herald. If you have all 4, destroy the enemy hero.',
    effect: {
      type: 'summon_horseman',
      summonCardIds: [8027, 8028, 8029, 8030],
      winCondition: 'all_four_horsemen'
    },
    class: "Neutral"
  }
    },
  {
    id: 8027,
    name: 'Herald of Fimbulvetr',
  description: 'One of the Four Heralds of Ragnarök.',

  flavorText: 'Three winters with no summer between. The world starves, and brother slays brother for a crust of bread. (Vafþrúðnismál 44)',
  type: 'minion',
  
  rarity: 'epic',
  manaCost: 2,
  
  attack: 2,
  health: 2,
  
  class: "Paladin",
      collectible: false
  },
  {
    id: 8028,
    name: 'Herald of Naglfar',
  description: 'One of the Four Heralds of Ragnarök.',

  flavorText: 'Naglfar, the ship made from dead men\'s fingernails, carries Hel\'s legions across the black sea to the final battle. (Gylfaginning 51)',
  type: 'minion',
  
  rarity: 'epic',
  manaCost: 2,
  
  attack: 2,
  health: 2,
  
  class: "Paladin",
      collectible: false
  },
  {
    id: 8029,
    name: 'Herald of Fenrir',
  description: 'One of the Four Heralds of Ragnarök.',

  flavorText: 'When Fenrir breaks free from Gleipnir, his jaws stretch from earth to sky. Even the Allfather cannot escape them. (Völuspá 53)',
  type: 'minion',
  
  rarity: 'epic',
  manaCost: 2,
  
  attack: 2,
  health: 2,
  
  class: "Paladin",
      collectible: false
  },
  {
    id: 8030,
    name: 'Herald of Hel',
  description: 'One of the Four Heralds of Ragnarök.',

  flavorText: 'Half her face is living, half is dead. When Hel rides out at Ragnarök, even the gods feel the cold of Niflheim. (Gylfaginning 34)',
  type: 'minion',
  
  rarity: 'epic',
  manaCost: 2,
  
  attack: 2,
  health: 2,
  
  class: "Paladin",
      collectible: false
  },
  {
    id: 3001,
    name: 'Helheim\'s Touch',
    description: 'Deal 3 damage to an enemy, or restore 3 Health to a friendly character.',
    flavorText: 'The realm of Hel grants power over life and death.',
      type: 'spell',

      rarity: 'common',
      manaCost: 2,

      class: "DeathKnight",
      collectible: true,

      spellEffect: {
        type: 'death_coil',

        value: 3,


        targetType: 'any',

      requiresTarget: true
    }
    },
  {
    id: 3005,
    name: 'Host of Helheim',
      description: 'Summon three 2/2 Ghouls with Taunt.',

      flavorText: 'The dead of Helheim rise to serve.',
      type: 'spell',

      rarity: 'rare',
      manaCost: 6,

      class: "DeathKnight",
      collectible: true,

      spellEffect: {
        type: 'summon',

        summonCardId: 9051,
      value: 3,

      targetType: 'none'
    }
    },
  {
    id: 3007,
    name: 'Fimbulwinter',
      description: 'Freeze all enemy minions. Deal 2 damage to all Frozen enemies.',

      flavorText: 'The great winter that precedes Ragnarök.',
      type: 'spell',

      rarity: 'rare',
      manaCost: 4,

      class: "DeathKnight",
      collectible: true,

      spellEffect: {
        type: 'freeze_and_damage',

        value: 2,


        targetType: 'all_enemy_minions'

       }
    },
  {
      id: 7201,
      name: 'Gram, Sword of Heroes',
      description: 'After your hero attacks and kills a minion, summon that minion to your side.',
      flavorText: 'The legendary sword that slew the dragon Fafnir.',
      type: 'weapon',

      rarity: 'rare',
      manaCost: 7,

      attack: 5,
      durability: 3,

      class: "DeathKnight",
      collectible: true,

      onKillEffect: {
      type: 'raise_enemy'
      }
    },
  {
    id: 3011,
    name: 'Blood of the Fallen',
    description: 'Deal 1 damage to all minions. If any die, restore 3 Health to your hero.',
      flavorText: 'The blood of warriors feeds the goddess Hel.',

      type: 'spell',
      rarity: 'common',

      manaCost: 2,
      class: "DeathKnight",
      collectible: true,
      spellEffect: {
        type: 'aoe_with_on_kill',
      value: 1,

      healValue: 3,
      targetType: 'all_minions'

       }
    },
  {
    id: 3012,
    name: 'Runic Blade of the Norns',
      description: 'Your weapon has +1 Attack for each Rune you have active.',

      flavorText: 'Inscribed with runes that fate itself has woven.',
      type: 'weapon',

      rarity: 'rare',
      manaCost: 3,

      attack: 2,
      durability: 3,

      class: "DeathKnight",
      collectible: true,

      runeEffect: {
      type: 'weapon_attack_per_rune'

         }
    },
  {
    id: 3013,
    name: 'Niflheim\'s Embrace',
      description: 'Give your hero +5 Armor and Immunity this turn.',

      flavorText: 'The primordial realm of ice and mist shields the worthy.',
      type: 'spell',

      rarity: 'rare',
      manaCost: 4,

      class: "DeathKnight",
      collectible: true,

      spellEffect: {
        type: 'gain_armor_and_immunity',

        value: 5,


        targetType: 'friendly_hero',

      duration: 'current_turn'
    }
    },
  {
    id: 3014,
    name: 'Hel\'s Command',
      description: 'Take control of an enemy minion with 3 or less Attack until end of turn.',

      flavorText: 'The queen of the dead commands all who enter her realm.',
      type: 'spell',

      rarity: 'common',
      manaCost: 3,

      class: "DeathKnight",
      collectible: true,

      spellEffect: {
        type: 'mind_control_temporary',

        targetType: 'enemy_minion',
      requiresTarget: true,

      condition: 'attack_less_than_4',
      duration: 'end_of_turn'

       }
    },
  {
    id: 3015,
    name: 'Hel, Queen of the Dead',
      description: 'Battlecry: Equip Gram and gain 5 Armor.',

      flavorText: 'Half living, half dead, she rules over Helheim.',
      type: 'hero',

      rarity: 'rare',
      manaCost: 9,

      armor: 5,
      class: 'DeathKnight',

      keywords: ['battlecry'],
      collectible: true,

                  battlecry: {
        type: 'equip_helgrind',

        summonCardId: 3009
    
    },
      heroPower: {
    name: 'Twilight of the Gods',
    cost: 2,
    used: false,
    description: 'Deal 3 damage to all enemies.',
    effect: {
      type: 'aoe_damage',
      value: 3,
      targetType: 'all_enemies'
    },
    class: "Neutral"
  }
    },
  {
    id: 3017,
    name: 'Gate to Helheim',
      description: 'Summon a random friendly minion that died this game.',

      flavorText: 'The gates of Hel\'s realm open to release the fallen.',
      type: 'spell',

      rarity: 'rare',
      manaCost: 4,

      class: "DeathKnight",
      collectible: true,

      spellEffect: {
        type: 'resurrect_random',

        value: 1,


        targetType: 'none'

       }
    },
  {
    id: 3018,
    name: 'Shield of the Draugr',
    description: 'Give a minion +2 Health and "After this minion survives damage, summon a 1/1 Skeleton."',
    flavorText: 'The undead Norse warriors share their resilience.',
      type: 'spell',

      rarity: 'common',
      manaCost: 2,

      class: "DeathKnight",
      collectible: true,

      spellEffect: {
        type: 'buff_and_enchant',

        buffHealth: 2,
      targetType: 'any_minion',

      requiresTarget: true,
      enchantEffect: {
      type: 'on_survive_damage_summon',
          summonCardId: 3019

           }
    }
    },
  {
    id: 3019,
    name: 'Draugr Bones',
  description: 'The cursed remains of a draugr warrior.',
  
  flavorText: 'The remains of fallen Norse warriors, restless in death.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 1,
  
  attack: 1,
  health: 1,
  
  class: "DeathKnight",
      collectible: false
  },
  {
    id: 3021,
    name: 'Crimson Aegis',
      description: 'Give your hero +4 Armor and Lifesteal this turn.',

      flavorText: 'Blood magic forges an impenetrable shield.',
      type: 'spell',

      rarity: 'common',
      manaCost: 3,

      class: "DeathKnight",
      collectible: true,

      spellEffect: {
        type: 'gain_armor_and_lifesteal',

        value: 4,


        targetType: 'friendly_hero',

      duration: 'current_turn'
    }
    },
  {
    id: 3022,
    name: 'Breath of Niflheim',
      description: 'Freeze an enemy and all adjacent minions.',

      flavorText: 'The frozen breath of the primordial ice realm.',
      type: 'spell',

      rarity: 'common',
      manaCost: 3,

      class: "DeathKnight",
      collectible: true,

      spellEffect: {
        type: 'freeze_adjacent',

        targetType: 'enemy_minion',
      requiresTarget: true

       }
    },
  {
    id: 3023,
    name: 'Curse of Hel',
      description: 'Give all your minions +1/+1 and "Deathrattle: Deal 1 damage to all enemies."',

      flavorText: 'Hel\'s curse lingers beyond death.',
      type: 'spell',

      rarity: 'rare',
      manaCost: 4,

      class: "DeathKnight",
      collectible: true,

      spellEffect: {
        type: 'buff_all_with_deathrattle',

        buffAttack: 1,
      buffHealth: 1,

      targetType: 'friendly_minions',
      deathrattleEffect: {
      type: 'damage',
          value: 1,

          targetType: 'all_enemies'
      }
    }
    },
  {
    id: 3024,
    name: 'Blade of the Draugr',
  description: 'Weapon wielded by undead warriors.',
  
  flavorText: 'Forged in the cold depths of ancient barrows.',
  type: 'weapon',
  
  rarity: 'common',
  manaCost: 2,
  
  attack: 2,
  durability: 2,
  
  class: "DeathKnight",
      collectible: true
  },
  {
    id: 3025,
    name: 'Icy Bonds of Niflheim',
      description: 'Freeze an enemy. Draw a card.',

      flavorText: 'The chains of the ice realm hold fast.',
      type: 'spell',

      rarity: 'common',
      manaCost: 2,

      class: "DeathKnight",
      collectible: true,

      spellEffect: {
        type: 'freeze_and_draw',

        targetType: 'any_enemy',
      requiresTarget: true,

      drawCards: 1
    }
    },
  {
    id: 3026,
    name: 'Strike of the Fallen',
      description: 'Deal damage equal to your missing Health. Restore 3 Health to your hero.',

      flavorText: 'The closer to death, the stronger the blow.',
      type: 'spell',

      rarity: 'epic',
      manaCost: 4,

      class: "DeathKnight",
      collectible: true,

      spellEffect: {
        type: 'damage_based_on_missing_health',

        healValue: 3,
      targetType: 'any',

      requiresTarget: true
    }
    },
  {
    id: 3027,
    name: 'Draugr Initiate',
      description: 'Battlecry: Give your weapon +1/+1.',

      flavorText: 'Newly risen from their barrow, eager to serve.',
      type: 'minion',

      rarity: 'common',
      manaCost: 2,

      attack: 2,
      health: 3,

      class: 'DeathKnight',
      keywords: ['battlecry'],
      collectible: true,
                  battlecry: {
        type: 'buff_weapon',
      buffAttack: 1,

      buffDurability: 1
    }
    },
  {
    id: 3029,
    name: 'Champion of Helheim',
      description: 'Battlecry: Give a friendly minion +2/+2 and Taunt.',

      flavorText: 'Hel\'s mightiest warriors lead the armies of the dead.',
      type: 'minion',

      rarity: 'rare',
      manaCost: 4,

      attack: 3,
      health: 3,

      class: 'DeathKnight',
      keywords: ['battlecry'],
                  battlecry: {
        type: 'buff_and_taunt',
      buffAttack: 2,

      buffHealth: 2,
      targetType: 'friendly_minion',

      requiresTarget: true
    }
    },
  {
    id: 3030,
    name: 'Harvester of Souls',
    description: 'After this destroys a minion, gain +2/+2.',
      flavorText: 'Each soul claimed makes the blade hungrier.',

      type: 'weapon',
      rarity: 'epic',

      manaCost: 4,
      attack: 3,

      durability: 2,
      class: "DeathKnight",
      collectible: true,
      onKillEffect: {
      type: 'buff_weapon',
      buffAttack: 2,

      buffDurability: 2
    }
    },
  {
    id: 9008,
    name: 'Spirit Amplification',
      description: 'Double a minion\'s Health.',

      flavorText: 'The divine essence flows twice as strong.',
      type: 'spell',

      rarity: 'common',
      manaCost: 2,

      class: "Priest",
      collectible: true,

      spellEffect: {
        type: 'double_health',

        targetType: 'any_minion',
      requiresTarget: true

       }
    },
  {
    id: 9011,
    name: 'Wisdom of the Seer',
      description: 'Copy 2 cards from your opponent\'s deck and add them to your hand.',

      flavorText: 'The völva sees all, past and future.',
      type: 'spell',

      rarity: 'common',
      manaCost: 3,

      class: "Priest",
      collectible: true,

      spellEffect: {
        type: 'copy_from_opponent',

        value: 2,


        source: 'deck'

       }
    },
  {
    id: 9013,
    name: 'Radiant Spirit',
  description: 'This minion\'s Attack is always equal to its Health.',
  
  flavorText: 'A spirit of pure divine light, its power mirrors its vitality.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 4,
  
  attack: 0,
  health: 5,
  
  class: 'Priest',
  
  
  collectible: true
  },
  {
    id: 9014,
    name: 'Priestess of Hel',
  description: 'Your cards and powers that restore Health now deal damage instead.',
  
  flavorText: 'Hel\'s priestesses channel death through healing.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 4,
  
  attack: 3,
  health: 5,
  
  class: 'Priest',
  
  
  collectible: true
  },
  {
    id: 9016,
    name: 'Sacred Flame',
      description: 'Change a minion\'s Attack to be equal to its Health.',

      flavorText: 'The eternal flame of Olympus transforms the spirit.',
      type: 'spell',

      rarity: 'common',
      manaCost: 1,

      class: "Priest",
      collectible: true,

      spellEffect: {
        type: 'attack_equals_health',

        targetType: 'any_minion',
      requiresTarget: true

       }
    },
  {
    id: 9017,
    name: 'Oracle\'s Vision',
      description: 'Put a copy of a random card in your opponent\'s hand into your hand.',

      flavorText: 'The Oracle of Delphi sees into all minds.',
      type: 'spell',

      rarity: 'common',
      manaCost: 1,

      class: "Priest",
      collectible: true,

      spellEffect: {
        type: 'copy_from_opponent',

        value: 1,


        source: 'hand'

       }
    },
  {
    id: 9019,
    name: 'Madness of Dionysus',
      description: 'Gain control of an enemy minion with 3 or less Attack until end of turn.',

      flavorText: 'The god of wine and madness bends weak minds.',
      type: 'spell',

      rarity: 'common',
      manaCost: 4,

      class: "Priest",
      collectible: true,

      spellEffect: {
        type: 'mind_control_temporary',

        targetType: 'enemy_minion',
      condition: 'attack_less_than_4',

      requiresTarget: true
    }
    },
  {
    id: 9021,
    name: 'Well of Mimir',
  description: 'At the start of your turn, restore 3 Health to a damaged friendly character.',
  flavorText: 'Wisdom and healing flow from Mimir\'s sacred well.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 2,
  
  attack: 0,
  health: 5,
  
  class: 'Priest',
  
  
  collectible: true
  },
  {
    id: 9022,
    name: 'Sacred Blaze',
    description: 'Deal 5 damage. Restore 5 Health to your hero.',
    flavorText: 'Hephaestus\'s forge fire purifies and heals.',
    type: 'spell',
    
    rarity: 'common',
    manaCost: 6,
    
    class: "Priest",
    collectible: true,
    
    spellEffect: {
      type: 'damage_and_heal_hero',
      value: 5,
      healValue: 5,
      targetType: 'any',
      requiresTarget: true
    }
  },
  {
    id: 13001,
    name: 'Lightning Bolt of Zeus',
  description: 'Deal 3 damage. Overload: (1)',
  
  flavorText: 'Zeus hurls his thunderbolts from Mount Olympus.',
  type: 'spell',
  
  rarity: 'common',
  manaCost: 1,
  
  class: 'Shaman',
  keywords: ['overload'],
      collectible: true
  },
  {
    id: 13002,
    name: 'Rockbiter Blessing',
  description: 'Give a friendly character +3 Attack this turn.',
  
  flavorText: 'The earth itself lends its strength.',
  type: 'spell',
  
  rarity: 'common',
  manaCost: 1,
  
  class: "Shaman",
      collectible: true
  },
  {
    id: 13003,
    name: 'Poseidon\'s Wrath',
  description: 'Deal 4-5 damage. Overload: (2)',
  
  flavorText: 'The sea god\'s fury strikes unpredictably.',
  type: 'spell',
  
  rarity: 'rare',
  manaCost: 2,
  
  class: "Shaman",
      collectible: true
  },
  {
    id: 13004,
    name: 'Fenrir\'s Call',
  description: 'Summon two 2/3 Spirit Wolves with Taunt. Overload: (2)',
  
  flavorText: 'Geri and Freki, the wolves of Odin.',
  type: 'spell',
  
  rarity: 'common',
  manaCost: 3,
  
  class: 'Shaman',
  keywords: ['overload'],
      collectible: true
  },
  {
    id: 13005,
    name: 'Spirit Wolf',
  description: 'Taunt',
  
  flavorText: 'A spectral wolf bound to serve.',
  type: 'minion',
  
  rarity: 'rare',
  manaCost: 2,
  
  attack: 2,
  health: 3,
  
  class: 'Shaman',
  keywords: ['taunt'],
      collectible: false
  },
  {
    id: 13006,
    name: 'Seiðr Hex',
  description: 'Transform a minion into a 0/1 Frog with Taunt.',

  flavorText: 'The völva traces a stave in the air and speaks the galdr. What was once a warrior is now something much smaller. (Völuspá 22)',
  type: 'spell',
  
  rarity: 'rare',
  manaCost: 4,
  
  class: "Shaman",
      collectible: true
  },
  {
    id: 13007,
    name: 'Muspelheim Elemental',
  description: 'A powerful elemental from the realm of fire.',
  
  flavorText: 'Born from the realm of fire and chaos.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 4,
  
  attack: 5,
  health: 4,
  
  race: "Elemental",
      class: "Shaman",
      collectible: true
  },
  {
    id: 13008,
    name: 'Stormforged Battle-Axe',
  description: 'Overload: (1)',
  
  flavorText: 'Forged in the heart of a thunderstorm.',
  type: 'weapon',
  
  rarity: 'common',
  manaCost: 2,
  
  attack: 2,
  durability: 3,
  
  class: 'Shaman',
  keywords: ['overload'],
      collectible: true
  },
  {
    id: 13009,
    name: 'Al\'Akir, Lord of Storms',
  description: 'Windfury, Charge, Divine Shield, Taunt',
  
  flavorText: 'The Windlord commands all four winds.',
  type: 'minion',
  
  rarity: 'rare',
  manaCost: 8,
  
  attack: 3,
  health: 5,
  
  race: "Elemental",
      class: 'Shaman',
  
  keywords: ['windfury', 'charge', 'divine_shield', 'taunt'],
      collectible: true
  },
  {
    id: 13010,
    name: 'Einherjar Spirit',
  description: 'Give a minion "Deathrattle: Resummon this minion."',
  
  flavorText: 'The spirits of the ancestors grant rebirth.',
  type: 'spell',
  
  rarity: 'rare',
  manaCost: 2,
  
  class: "Shaman",
      collectible: true
  },
  {
    id: 13011,
    name: 'Runestone Totem',
  description: 'A totem inscribed with ancient runes.',
  
  flavorText: 'Ancient runes carved by the first shamans.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 2,
  
  attack: 0,
  health: 2,
  
  race: "Spirit",
      class: "Shaman",
      collectible: true
  },
  {
    id: 13012,
    name: 'Magni Stormcaller, Worldshaper',
  description: 'Battlecry: Evolve all friendly minions.',
  
  flavorText: 'He shapes the elements and the world itself.',
  type: 'hero',
  
  rarity: 'epic',
  manaCost: 9,
  
  armor: 5,
  class: "Shaman",
      collectible: true
  },
  {
    id: 13013,
    name: 'Flame Tongue Totem',
  description: 'Adjacent minions have +2 Attack.',
  
  flavorText: 'The flame tongue speaks of ancient power.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 2,
  
  attack: 0,
  health: 3,
  
  race: "Spirit",
      class: "Shaman",
      collectible: true
  },
  {
    id: 13014,
    name: 'Ragnarök Storm',
  description: 'Deal 4-5 damage to all minions. Overload: (5)',
  
  flavorText: 'The elements rage indiscriminately.',
  type: 'spell',
  
  rarity: 'epic',
  manaCost: 3,
  
  class: 'Shaman',
  keywords: ['overload'],
      collectible: true
  },
  {
    id: 13015,
    name: 'Muspel Burst',
  description: 'Deal 5 damage. Overload: (2)',
  
  flavorText: 'Muspelheim\'s fury erupts.',
  type: 'spell',
  
  rarity: 'rare',
  manaCost: 3,
  
  class: 'Shaman',
  keywords: ['overload'],
      collectible: true
  },
  {
    id: 13016,
    name: 'Searing Totem',
  description: 'A totem blazing with primal fire.',
  
  flavorText: 'A totem of living flame.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 1,
  
  attack: 1,
  health: 1,
  
  race: "Spirit",
  
  class: "Shaman",
      collectible: true
  },
  {
    id: 13017,
    name: 'Wave Nymph Warleader',
  description: 'Your other Nagas have +2/+1.',
  
  flavorText: 'The sea spirits follow their champion.',
  type: 'minion',
  
  rarity: 'epic',
  manaCost: 3,
  
  attack: 3,
  health: 3,
  
  race: "Naga",
      class: "Shaman",
      collectible: true
  },
  {
    id: 13018,
    name: 'Volcanic Surge',
  description: 'Deal 2 damage. Unlock your Overloaded Mana Crystals.',
  
  flavorText: 'Release the stored power of the elements.',
  type: 'spell',
  
  rarity: 'rare',
  manaCost: 2,
  
  class: "Shaman",
      collectible: true
  },
  {
    id: 13020,
    name: 'Aegir\'s Herald',
  description: 'Battlecry: Restore 6 Health. Overload: (1)',
  
  flavorText: 'A messenger from the sea god Aegir.',
  type: 'minion',
  
  rarity: 'rare',
  manaCost: 4,
  
  attack: 4,
  health: 4,
  
  class: 'Shaman',
  keywords: ['battlecry', 'overload'],
      collectible: true
  },
  {
    id: 13022,
    name: 'De-evolution Curse',
  description: 'Transform all enemy minions into random ones that cost (1) less.',
  
  flavorText: 'The Norns unweave their fates.',
  type: 'spell',
  
  rarity: 'rare',
  manaCost: 2,
  
  class: "Shaman",
      collectible: true
  },
  {
    id: 13025,
    name: 'Bog Lurker',
  description: 'Battlecry: Return a friendly minion to your hand and give it +2/+2.',
  
  flavorText: 'From the swamps of Niflheim, it emerges.',
  type: 'minion',
  
  rarity: 'rare',
  manaCost: 3,
  
  attack: 3,
  health: 3,
  
  race: "Naga",
      class: 'Shaman',
  
  keywords: ['battlecry'],
      collectible: true
  },
  {
    id: 13026,
    name: 'Rán, Queen of the Sea',
  description: 'Battlecry: Return all spells you played last turn to your hand.',
  
  flavorText: 'The sea goddess collects what the waves take.',
  type: 'minion',
  
  rarity: 'epic',
  manaCost: 6,
  
  attack: 6,
  health: 6,
  
  race: "Beast",
      class: 'Shaman',
  
  keywords: ['battlecry'],
      collectible: true
  },
  {
    id: 13027,
    name: 'Call of the Elements',
  description: 'Foresee a (?) Cost minion. Transform a friendly minion into it. (Upgraded for each Overloaded Mana Crystal.)',
  
  flavorText: 'The elements answer those who have paid the price.',
  type: 'spell',
  
  rarity: 'epic',
  manaCost: 3,
  
  class: "Shaman",
      collectible: true
  },
  {
    id: 13028,
    name: 'Primal Seeker',
  description: 'Battlecry: Draw a spell. If it\'s a Nature spell, also draw an Elemental.',
  flavorText: 'Seeking the ancient secrets of the elements.',
  type: 'minion',
  
  rarity: 'rare',
  manaCost: 3,
  
  attack: 3,
  health: 4,
  
  class: 'Shaman',
  keywords: ['battlecry'],
      collectible: true
  },
  {
    id: 13029,
    name: 'Beaker of Lightning',
  description: 'Deal 1 damage to all minions. Overload: (2)',
  
  flavorText: 'Zeus stores his spare thunderbolts here.',
  type: 'spell',
  
  rarity: 'common',
  manaCost: 0,
  
  class: 'Shaman',
  keywords: ['overload'],
      collectible: true
  },
  {
    id: 13030,
    name: 'Stormcaller of Asgard',
  description: 'Battlecry: If you control all 4 basic Totems, summon Al\'Akir the Windlord.',
  flavorText: 'She speaks with the voice of thunder.',
  
  type: 'minion',
  rarity: 'epic',
  
  manaCost: 5,
  attack: 5,
  
  health: 5,
  class: 'Shaman',
  
  keywords: ['battlecry'],
      collectible: true
  },
  {
    id: 13031,
    name: 'Totemic Mirror',
  description: 'Give a minion +2/+2. If it\'s a Totem, summon a copy of it.',
  flavorText: 'The totem gazes into its reflection.',
  
  type: 'spell',
  rarity: 'common',
  
  manaCost: 3,
  class: "Shaman",
      collectible: true
  },
  {
    id: 13032,
    name: 'Völva\'s Brew',
  description: 'Restore 4 Health. Repeatable this turn.',
  
  flavorText: 'The wise woman brews potions of renewal.',
  type: 'spell',
  
  rarity: 'rare',
  manaCost: 2,
  
  class: 'Shaman',
  keywords: ['repeatable'],
      collectible: true
  },
  {
    id: 13033,
    name: 'Tidal Blessing',
  description: 'Lifesteal. Deal 4 damage to a minion.',
  
  flavorText: 'The sea gives and the sea takes.',
  type: 'spell',
  
  rarity: 'common',
  manaCost: 4,
  
  class: 'Shaman',
  keywords: ['lifesteal'],
      collectible: true
  },
  {
    id: 13034,
    name: 'Walking Spring',
  description: 'Lifesteal, Rush, Windfury',
  flavorText: 'A living fountain of healing waters.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 8,
  
  attack: 4,
  health: 8,
  
  race: "Elemental",
      class: 'Shaman',
  
  keywords: ['lifesteal', 'rush', 'windfury'],
      collectible: true
  },
  {
    id: 13035,
    name: 'Gaia\'s Might',
  description: 'Give a minion +2/+2. If it\'s an Elemental, add a random Elemental to your hand.',
  flavorText: 'Mother Earth empowers her children.',
  
  type: 'spell',
  rarity: 'rare',
  
  manaCost: 2,
  class: "Shaman",
      collectible: true
  },
  {
    id: 13036,
    name: 'Thunder Caller',
    description: 'Battlecry: Deal 1 damage to all enemy minions for each Overloaded Mana Crystal.',
    flavorText: 'He speaks in thunder and lightning.',
    
    type: 'minion',
    rarity: 'rare',
    
    manaCost: 4,
    attack: 3,
    health: 4,
    
    class: "Shaman",
    collectible: true
  },
  {
    id: 13037,
    name: 'Totem Empowerment',
    description: 'Give your Totems +2 Attack.',
    flavorText: 'The runes flare with power.',
    
    type: 'spell',
    rarity: 'common',
    
    manaCost: 1,
    class: "Shaman",
    collectible: true
  },
  {
    id: 13038,
    name: 'Elemental Ascension',
    description: 'Transform your minions into random Elementals that cost (2) more.',
    flavorText: 'The elements consume and transform.',
    
    type: 'spell',
    rarity: 'epic',
    
    manaCost: 5,
    class: "Shaman",
    collectible: true
  },
  {
    id: 13039,
    name: 'Spirit of Aegir',
    description: 'Stealth for 1 turn. Your Battlecry effects trigger twice.',
    flavorText: 'The sea god\'s essence doubles all gifts.',
    
    type: 'minion',
    rarity: 'rare',
    
    manaCost: 3,
    attack: 0,
    health: 3,
    
    class: "Shaman",
    collectible: true,
    keywords: ["stealth"]
  },
  {
    id: 13040,
    name: 'Tempest Herald',
    description: 'Battlecry: Deal 2 damage to all enemy minions.',
    flavorText: 'She announces the coming storm.',
    
    type: 'minion',
    rarity: 'common',
    
    manaCost: 5,
    attack: 3,
    health: 4,
    
    class: "Shaman",
    collectible: true
  },
  {
    id: 13041,
    name: 'Rejuvenating Rain',
    description: 'Restore 4 Health to all friendly characters.',
    flavorText: 'The blessed rains of the gods.',
    
    type: 'spell',
    rarity: 'common',
    
    manaCost: 3,
    class: "Shaman",
    collectible: true
  },
  {
    id: 13042,
    name: 'Wave Nymph Tidecaller',
    description: 'Whenever you summon a Naga, gain +1 Attack.',
    flavorText: 'She calls the tides and the tides answer.',
    
    type: 'minion',
    rarity: 'rare',
    race: "Naga",
    
    manaCost: 1,
    attack: 1,
    health: 2,
    
    class: "Shaman",
    collectible: true
  },
  {
    id: 13043,
    name: 'Storm King',
    description: 'Battlecry: If you played an Elemental last turn, gain Windfury.',
    flavorText: 'The elements bow to his command.',
    
    type: 'minion',
    rarity: 'rare',
    race: "Elemental",
    
    manaCost: 6,
    attack: 5,
    health: 6,
    
    class: "Shaman",
    collectible: true
  },
  {
    id: 13044,
    name: 'Ancient Waterspout',
    description: 'Battlecry: Return a friendly minion to your hand. It costs (2) less.',
    flavorText: 'The primordial waters rise.',
    
    type: 'minion',
    rarity: 'common',
    race: "Elemental",
    
    manaCost: 4,
    attack: 3,
    health: 3,
    
    class: "Shaman",
    collectible: true
  },
  {
    id: 13045,
    name: 'Earthen Sentinel',
    description: 'Taunt. Battlecry: Gain +1/+1 for each Overloaded Mana Crystal.',
    flavorText: 'Born of stone and lightning.',
    
    type: 'minion',
    rarity: 'rare',
    race: "Elemental",
    
    manaCost: 3,
    attack: 2,
    health: 4,
    
    class: "Shaman",
    collectible: true,
    keywords: ["taunt"]
  },
  {
    id: 13046,
    name: 'Tidal Devastation',
    description: 'Deal 3 damage to all minions. Restore Health equal to damage dealt.',
    flavorText: 'Poseidon\'s wrath heals as it destroys.',
    
    type: 'spell',
    rarity: 'epic',
    
    manaCost: 8,
    class: "Shaman",
    collectible: true,
    keywords: ["lifesteal"]
  },
  {
    id: 13047,
    name: 'Seiðr Shapeshifter',
    description: 'Whenever you cast a spell, transform a random enemy minion into a 0/1 Frog with Taunt.',
    flavorText: 'Odin himself practiced seiðr, though the Æsir deemed it unmanly. Those who master it reshape flesh like clay. (Ynglinga Saga 7)',
    
    type: 'minion',
    rarity: 'epic',
    
    manaCost: 6,
    attack: 4,
    health: 6,
    
    class: "Shaman",
    collectible: true
  },
  {
    id: 13048,
    name: 'Totem Destroyer',
    description: 'Rush. Gain +1/+1 for each friendly Totem.',
    flavorText: 'Powered by totemic energy.',
    
    type: 'minion',
    rarity: 'rare',
    
    manaCost: 5,
    attack: 3,
    health: 3,
    
    class: "Shaman",
    collectible: true,
    keywords: ["rush"]
  },
  {
    id: 13049,
    name: 'Icy Touch',
    description: 'Deal 1 damage to an enemy character and Freeze it.',
    flavorText: 'The cold grasp of Niflheim.',
    
    type: 'spell',
    rarity: 'common',
    
    manaCost: 1,
    class: "Shaman",
    collectible: true,
    keywords: ["freeze"]
  },
  {
    id: 13050,
    name: 'Ancestral Blessing',
    description: 'Restore a minion to full Health and give it Taunt.',
    flavorText: 'The ancestors protect the worthy.',
    
    type: 'spell',
    rarity: 'common',
    
    manaCost: 0,
    class: "Shaman",
    collectible: true
  },
  {
    id: 13051,
    name: 'Cyclone of Aeolus',
    description: 'Return all minions to their owner\'s hand.',
    flavorText: 'The wind god clears the battlefield.',
    
    type: 'spell',
    rarity: 'rare',
    
    manaCost: 7,
    class: "Shaman",
    collectible: true
  },
  {
    id: 13052,
    name: 'Totem Duplication',
    description: 'Choose a friendly Totem. Summon a copy of it.',
    flavorText: 'The totem echoes itself.',
    
    type: 'spell',
    rarity: 'common',
    
    manaCost: 2,
    class: "Shaman",
    collectible: true
  },
  {
    id: 13053,
    name: 'Frozen Current',
    description: 'Freeze all enemy minions. Gain 1 Mana Crystal for each frozen minion.',
    flavorText: 'The cold brings power.',
    
    type: 'spell',
    rarity: 'epic',
    
    manaCost: 5,
    class: "Shaman",
    collectible: true,
    keywords: ["freeze"]
  },
  {
    id: 13054,
    name: 'Sea Sprite Hunter',
    description: 'Battlecry: Give your other Nagas +1/+1.',
    flavorText: 'Leading the sea sprites to battle.',
    
    type: 'minion',
    rarity: 'common',
    race: "Naga",
    
    manaCost: 2,
    attack: 2,
    health: 1,
    
    class: "Shaman",
    collectible: true,
    keywords: ["battlecry"]
  },
  {
    id: 13055,
    name: 'Runic Totem of Fate',
    description: 'At the end of your turn, add a random Shaman spell to your hand.',
    flavorText: 'The runes whisper secrets.',
    
    type: 'minion',
    rarity: 'rare',
    race: "Spirit",
    
    manaCost: 3,
    attack: 0,
    health: 3,
    
    class: "Shaman",
    collectible: true
  },
  {
    id: 9004,
    name: 'Bone Harvester',
  description: 'Deathrattle: Deal 1 damage to all enemy minions.',
  
  flavorText: 'Collecting bones for the halls of Hel.',
  type: 'minion',
  
  rarity: 'rare',
  manaCost: 4,
  
  attack: 3,
  health: 3,
  
  class: 'DeathKnight',
  keywords: ['deathrattle'],
      collectible: true
  },
  {
    id: 9102,
    name: 'Shadow Step',
      description: 'Your hero is Immune this turn.',

      flavorText: 'Moving between shadows, unseen by mortal eyes.',
      type: 'spell',

      rarity: 'rare',
      manaCost: 0,

      class: 'Berserker',
      keywords: ['immune'],
      collectible: true,
      spellEffect: {
        type: 'grant_immunity',
      targetType: 'friendly_hero',

      duration: 'turn'
    }
    },
  {
    id: 9103,
    name: 'Blades of the Erinyes',
    description: 'After attacking a minion, your hero may attack again.',
      flavorText: 'Forged by the Furies for endless vengeance.',

      type: 'weapon',
      rarity: 'common',

      manaCost: 5,
      attack: 4,

      durability: 2,
      class: "Berserker",
      collectible: true,
      weaponEffect: {
      type: 'attack_again',
      condition: 'after_attacking_minion'

       }
    },
  {
    id: 9108,
    name: 'Abyssal Chaos-Burst',
      description: 'Deal 4 damage to all minions.',

      flavorText: 'The deepest pit of the void unleashes its fury.',
      type: 'spell',

      rarity: 'rare',
      manaCost: 5,

      class: "Berserker",
      collectible: true,

      spellEffect: {
        type: 'damage',

        value: 4,


        targetType: 'all_minions'

       }
    },
  {
    id: 9110,
    name: 'Skull of Mímir',
      description: 'Draw 3 cards. Outcast: Reduce their cost by (3).',

      flavorText: 'Odin carries Mímir\'s head to every gathering of consequence. It never lies — but it never comforts, either. (Völuspá 46)',
      type: 'spell',

      rarity: 'rare',
      manaCost: 6,

      class: 'Berserker',
      keywords: ['outcast'],
      collectible: true,
      spellEffect: {
        type: 'draw',
      
      value: 3

      
       },
      outcast: {
      type: 'reduce_drawn_card_cost',
      value: 3

       }
    },
  {
    id: 9111,
    name: 'Fury-Bound Warrior',
    description: 'Battlecry: If your hero attacked this turn, deal 4 damage.',
      flavorText: 'Bound by oath to the Furies.',

      type: 'minion',
      rarity: 'rare',

      manaCost: 5,
      attack: 6,

      health: 4,
      class: 'Berserker',

      keywords: ['battlecry'],
      collectible: true,

                  battlecry: {
        type: 'damage',

        value: 4,


        targetType: 'any',

      requiresTarget: true,
      condition: 'hero_attacked_this_turn'

       }
    },
  {
    id: 9112,
    name: 'Swift-Winged Messenger-Fiend',
    description: 'After you play the left- or right-most card in your hand, deal 1 damage to all enemies.',
      flavorText: 'A blur of wings and malice striking from unexpected angles.',

      type: 'minion',
      rarity: 'rare',

      manaCost: 4,
      attack: 4,

      health: 3,
      class: "Berserker",
  },
  {
    id: 9113,
    name: 'Titanic Transformation',
    description: 'Swap your Hero Power to "Deal 4 damage." After 2 uses, swap back.',
      flavorText: 'Channel the primordial power of the Titans.',

      type: 'spell',
      rarity: 'rare',

      manaCost: 5,
      class: "Berserker",
      collectible: true,
      spellEffect: {
        type: 'swap_hero_power',
    heropower: 9114,
      usesBeforeSwapBack: 2

       }
    },
  {
    id: 9114,
    name: 'Titan\'s Wrath',
      description: 'Deal 4 damage.',

      flavorText: 'After 2 uses, swap back.',
      type: 'spell',

      rarity: 'epic',
      manaCost: 1,

      class: "Berserker",
      collectible: false,

      spellEffect: {
        type: 'damage',

        value: 4,


        targetType: 'any',

      requiresTarget: true
    }
    },
  {
    id: 9116,
    name: 'Coordinated Hunt',
      description: 'Summon three 1/1 Hunters with Rush.',

      flavorText: 'Artemis\'s hunters strike as one.',
      type: 'spell',

      rarity: 'common',
      manaCost: 3,

      class: "Berserker",
      collectible: true,

      spellEffect: {
        type: 'summon',

        value: 3,


        summonCardId: 9117

       }
    },
  {
    id: 9117,
    name: 'Hunter of Artemis',
  description: 'Rush',
  
  flavorText: 'Sworn to the goddess of the hunt.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 1,
  
  attack: 1,
  health: 1,
  
  race: "Titan",
      class: 'Berserker',
  
  keywords: ['rush'],
      collectible: false
  },
  {
    id: 9120,
    name: 'Priestess of Vengeance',
    description: 'At the end of your turn, deal 6 damage randomly split among all enemies.',
    flavorText: 'She serves the Furies with zealous devotion.',
      type: 'minion',

      rarity: 'rare',
      manaCost: 7,

      attack: 6,
      health: 7,

      race: "Titan",
      class: "Berserker",
      collectible: true,
      endOfTurn: {
      type: 'damage_split_randomly',
      value: 6,

      targetType: 'all_enemies'
    }
    },
  {
    id: 9121,
    name: 'Wings of Darkness',
      description: 'Battlecry: Summon two 1/1 Darkwings.',

      flavorText: 'From the depths of Erebus.',
      type: 'weapon',

      rarity: 'rare',
      manaCost: 2,

      attack: 1,
      durability: 2,

      class: 'Berserker',
      keywords: ['battlecry'],
      collectible: true,
                  battlecry: {
        type: 'summon',
      value: 2,

      summonCardId: 9122
    }
    },
  {
    id: 9122,
    name: 'Shade of Erebus',
      description: 'A dark spirit born from primordial darkness.',

      flavorText: 'Born from primordial darkness.',
      type: 'minion',

      rarity: 'common',
      manaCost: 1,

      attack: 1,
      health: 1,

      race: "Titan",
      class: "Berserker"
  },
  {
    id: 9123,
    name: 'Typhon\'s Heir',
      description: 'Battlecry: Summon two random 0-Cost minions. (Upgrades each time a friendly minion dies while this is in your hand.)',

      flavorText: 'Father of all monsters, his legacy grows.',
      type: 'minion',

      rarity: 'epic',
      manaCost: 9,

      attack: 8,
      health: 8,

      race: "Dragon",
      class: 'Berserker',

      keywords: ['battlecry'],
      collectible: true,

                  battlecry: {
        type: 'summon_random_minions',

        value: 2,


        manaCost: 0,

      upgradesInHand: true
    }
    },
  {
    id: 14007,
    name: 'Rune of Denial',
    description: 'Rune: When your opponent casts a spell, Counter it.',
      flavorText: 'Ancient runes that negate all magic.',

      type: 'spell',
      rarity: 'rare',

      manaCost: 3,
      class: 'Mage',

      keywords: ['secret'],

      secretEffect: {
      type: 'counter_spell',

        triggerType: 'on_spell_cast',
      target: 'enemy_spell'

       }
    },
  {
    id: 14009,
    name: 'Loki\'s Shapecraft',
      description: 'Transform a minion into a 1/1 Sheep.',

      flavorText: 'Loki once became a mare to distract Svaðilfari — and bore Sleipnir, the eight-legged horse. A sheep is mercy by comparison. (Gylfaginning 42)',
      type: 'spell',

      rarity: 'common',
      manaCost: 4,

      class: 'Mage',

      spellEffect: {
        type: 'polymorph',

        transformInto: 14010,
      targetType: 'any_minion',

      requiresTarget: true
    }
    },
  {
    id: 14010,
    name: 'Cursed Sheep',
  description: 'A victim of magical transformation.',
  
  flavorText: 'Once a proud warrior, now just wool.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 1,
  
  attack: 1,
  health: 1,
  
  race: "Beast",
      class: "Neutral",
      collectible: false
  },
  {
    id: 14012,
    name: 'Vanishing Mist',
    description: 'Rune: When a minion attacks your hero, destroy it.',
    flavorText: 'The mists of Niflheim consume the unwary.',
      type: 'spell',

      rarity: 'common',
      manaCost: 3,

      class: 'Mage',
      keywords: ['secret'],
      collectible: true,
      secretEffect: {
      type: 'destroy',

        triggerType: 'on_minion_attack',
      target: 'attacking_minion',

      condition: 'targets_hero'
    }
    },
  {
    id: 14013,
    name: 'Ice Spear',
    description: 'Freeze a character. If it was already Frozen, deal 4 damage instead.',
      flavorText: 'Shards from the frozen heart of Niflheim.',

      type: 'spell',
      rarity: 'common',

      manaCost: 1,
      class: 'Mage',

      keywords: ['freeze'],
      collectible: true,

      spellEffect: {
        type: 'conditional_freeze_or_damage',

        value: 4,


        targetType: 'any',

      requiresTarget: true,
      condition: 'is_frozen'

       }
    },
  {
    id: 14017,
    name: 'Spell Reflection',
    description: 'Rune: When an enemy casts a spell on a minion, summon a 1/3 as the new target.',
    flavorText: 'Ancient rune magic redirects hostile spells.',
      type: 'spell',

      rarity: 'epic',
      manaCost: 3,

      class: 'Mage',
      keywords: ['secret'],
      collectible: true,
      secretEffect: {
      type: 'redirect_spell',
      triggerType: 'on_spell_cast',

      target: 'enemy_spell',
      condition: 'targets_minion',

      summonCardId: 14018
    }
    },
  {
    id: 15007,
    name: 'Void Spawn of the Abyss',
      description: 'Battlecry: Destroy adjacent minions and gain their Attack and Health.',

      flavorText: 'From the deepest pit of the void.',
      type: 'minion',

      rarity: 'rare',
      manaCost: 3,

      attack: 3,
      health: 3,

      race: "Titan",
      class: 'Warlock',

      keywords: ['battlecry'],
      collectible: true,

                  battlecry: {
        type: 'consume_adjacent',

        gainStats: true
    }
    },
  {
    id: 15010,
    name: 'Guardian of the Void-Gate',
      description: 'Taunt. Battlecry: Destroy one of your Mana Crystals.',

      flavorText: 'The gates of the void demand a price.',
      type: 'minion',

      rarity: 'rare',
      manaCost: 3,

      attack: 3,
      health: 5,

      race: "Titan",
      class: 'Warlock',

      keywords: ['taunt', 'battlecry'],

                  battlecry: {
        type: 'destroy_mana_crystal',

        value: 1
    }
    },
  {
    id: 15011,
    name: 'Void-Soul Blessing',
    description: 'Give a friendly minion +4/+4 until end of turn. Then, it dies. Horribly.',
      flavorText: 'The essence of the void grants power, but all must return to the dark.',

      type: 'spell',
      rarity: 'common',

      manaCost: 1,
      class: "Warlock",
      collectible: true,
      spellEffect: {
        type: 'buff_then_destroy',
      buffAttack: 4,

      buffHealth: 4,
      targetType: 'friendly_minion',

      requiresTarget: true,
      duration: 'turn'

       }
    },
  {
    id: 15012,
    name: 'Call of the Deep-Dark',
      description: 'Draw 2 Titans from your deck.',

      flavorText: 'The void summons its servants from below.',
      type: 'spell',

      rarity: 'common',
      manaCost: 3,

      class: "Warlock",
      collectible: true,

      spellEffect: {
        type: 'draw_specific',

        value: 2,


        race: 'Titan'

       }
    },
  {
    id: 15013,
    name: 'Shade Pack Leader',
    description: 'Whenever this minion takes damage, summon a 1/1 Shade.',
    flavorText: 'The shades of the void multiply endlessly.',
      type: 'minion',

      rarity: 'common',
      manaCost: 3,

      attack: 2,
      health: 4,

      race: "Titan",
      class: "Warlock",
      collectible: true,
      onDamage: {
      type: 'summon',
    summonCardId: 15014,
      trigger: 'on_damage_received'

       }
    },
  {
    id: 15014,
    name: 'Abyssal Shade-Fiend',
  description: 'A spirit whisper from the void.',
  
  flavorText: 'A whisper of the void.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 1,
  
  attack: 1,
  health: 1,
  
  race: "Titan",
      class: "Warlock",
      collectible: false
  },
  {
    id: 15016,
    name: 'INFERNO OF MUSPELHEIM!',
      description: 'Summon a 6/6 Infernal.',

      flavorText: '',
    type: 'spell',
      rarity: 'common',

      manaCost: 2,
      class: "Warlock",
      collectible: false,
      spellEffect: {
        type: 'summon',
      
    summonCardId: 15018,
      value: 1

       }
    },
  {
    id: 15017,
    name: 'Fury of Ares',
  description: 'Weapon blessed with the war god\'s wrath.',
  
  flavorText: 'The war god\'s weapon thirsts for battle.',
  type: 'weapon',
  
  rarity: 'common',
  manaCost: 3,
  
  attack: 3,
  durability: 8,
  
  class: "Warlock",
      collectible: false
  },
  {
    id: 15018,
    name: 'Muspel Infernal',
  description: 'A titan summoned from the fires of Muspelheim.',
  
  flavorText: 'Born in the fires of Muspelheim.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 6,
  
  attack: 6,
  health: 6,
  
  race: "Titan",
      class: "Warlock",
      collectible: false
  },
  {
    id: 15019,
    name: 'Abyssal Soul-Reaper',
      description: 'Battlecry: Summon all friendly Titans that died this game.',

      flavorText: 'Ruler of the depths, he commands all departed souls.',
      type: 'hero',

      rarity: 'epic',
      manaCost: 10,

      health: 100,
      armor: 5,

      class: 'Warlock',
      keywords: ['battlecry'],
      collectible: true,
                  battlecry: {
        type: 'resurrect_all',
      race: 'Titan',

      source: 'friendly_graveyard'
    }
    },
  {
    id: 15020,
    name: 'Blood Pact',
      description: 'Your next spell this turn costs Health instead of Mana.',

      flavorText: 'Power through sacrifice.',
      type: 'spell',

      rarity: 'epic',
      manaCost: 2,

      class: 'Warlock',

      spellEffect: {
        type: 'next_spell_costs_health',

        duration: 'turn'
    }
    },
  {
    id: 16017,
    name: 'Warriors of Valhalla',
      description: 'Add a copy of each damaged friendly minion to your hand.',

      flavorText: 'The wounded warriors of Odin return for more.',
      type: 'spell',

      rarity: 'epic',
      manaCost: 3,

      class: "Warrior",
      collectible: true,

      spellEffect: {
        type: 'copy_to_hand',

        targetType: 'friendly_minion',
      condition: 'is_damaged',

      targetsAll: true
    }
    },
  {
    id: 16018,
    name: 'Bloodied Axe of Tyr',
      description: 'Deathrattle: Deal 1 damage to all minions.',

      flavorText: 'The one-handed god\'s axe demands blood from all.',
      type: 'weapon',

      rarity: 'common',
      manaCost: 4,

      attack: 2,
      durability: 2,

      class: 'Warrior',
      keywords: ['deathrattle'],
      collectible: true,
      deathrattle: {
        type: 'damage',
      value: 1,

      targetType: 'all_minions'
    }
    },
  {
    id: 16019,
    name: 'Ravaging Draugr',
      description: 'Battlecry: Deal 1 damage to all other minions.',

      flavorText: 'The undead Norse warriors ravage all in their path.',
      type: 'minion',

      rarity: 'common',
      manaCost: 3,

      attack: 3,
      health: 3,

      class: 'Warrior',
      keywords: ['battlecry'],
                  battlecry: {
        type: 'damage',
      value: 1,

      targetType: 'all_other_minions'
    }
    },
  {
    id: 16020,
    name: 'Hephaestus, Divine Smith',
    description: 'Battlecry: For the rest of the game, your Automatons have Rush.',
      flavorText: 'The god of the forge crafts automatons for battle.',

      type: 'hero',
      rarity: 'epic',

      manaCost: 9,
      armor: 7,

      health: 100,
      class: 'Warrior',

      keywords: ['battlecry'],

                  battlecry: {
        type: 'grant_persistent_effect',

        effect: 'rush',
      targetType: 'friendly_mech',

      permanent: true
    }
    },
  {
    id: 5016,
    name: 'Daedalus the Inventor',
      description: 'Battlecry: Summon an AWESOME invention.',

      flavorText: 'Creator of the Labyrinth and wings of wax.',
      type: 'minion',

      rarity: 'rare',
      manaCost: 6,

      attack: 6,
      health: 6,

      class: 'Neutral',
      keywords: ['battlecry'],
      collectible: true,
                  battlecry: {
        type: 'summon_random',
      value: 1,

      targetType: 'friendly_battlefield'
    }
    },
  {
      id: 5019.1,

      name: 'Golden Apple',
      description: 'Give a minion +1/+1.',

      type: 'spell',
      rarity: 'common',

      manaCost: 1,
      class: 'Neutral',
      spellEffect: {
        type: 'buff',
      buffAttack: 1,

      buffHealth: 1,
      targetType: 'any_minion',

      requiresTarget: true
    }
    },
  {
    id: 5102,
    name: 'Wounded Berserker',
      description: 'Battlecry: Deal 4 damage to HIMSELF.',

      flavorText: 'True berserkers feel no pain—well, almost none.',
      type: 'minion',

      rarity: 'rare',
      manaCost: 3,

      attack: 4,
      health: 7,

      class: 'Neutral',
      keywords: ['battlecry'],
      collectible: true,
                  battlecry: {
        type: 'damage',
      value: 4,

      targetType: 'self'
    }
    },
  {
    id: 5103,
    name: 'Automaton of Hephaestus',
  description: 'At the start of your turn, swap this minion with a random one in your hand.',
  flavorText: 'Forged by the divine smith, it moves of its own accord.',
  
  type: 'minion',
  rarity: 'common',
  
  manaCost: 3,
  attack: 0,
  
  health: 3,
  race: 'Automaton',
  
  
  
  class: "Neutral"
  },
  {
    id: 5104,
    name: 'Siege Engine of Troy',
  description: 'At the start of your turn, deal 2 damage to a random enemy.',
  flavorText: 'Built for the siege of the great city.',
  
  type: 'minion',
  rarity: 'common',
  
  manaCost: 3,
  attack: 1,
  
  health: 4,
  race: 'Automaton',
  class: "Neutral",
      collectible: true
  },
  {
    id: 5105,
    name: 'Golem of Olympus',
      description: 'Charge. Battlecry: Give your opponent a Mana Crystal.',

      flavorText: 'The gods\' gift comes with a price.',
      type: 'minion',

      rarity: 'rare',
      manaCost: 3,

      attack: 4,
      health: 2,

      class: 'Neutral',
    keywords: ['charge', 'battlecry'],
      collectible: true,

                  battlecry: {
        type: 'give_mana',

        value: 1,


        targetType: 'opponent',

      permanent: true
    }
    },
  {
    id: 5106,
    name: 'Will-o-wisp',
  description: 'A mischievous spirit of ethereal light.',
  
  flavorText: 'Ethereal lights that guide—or mislead—travelers.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 0,
  
  attack: 1,
  health: 1,
      class: "Neutral"
  },
  {
    id: 5107,
    name: 'Young Hippogriff',
  description: 'Windfury',
  
  flavorText: 'Half eagle, half horse, fully magnificent.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 1,
  
  attack: 1,
  health: 1,
  
  race: "Beast",
      class: 'Neutral',
  
  keywords: ['windfury'],
      collectible: true
  },
  {
    id: 5029,
    name: 'Ebony Abyss-Panther',
  description: 'Stealth',
  
  flavorText: 'The shadow cats prowl the void\'s borders.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 3,
  
  attack: 4,
  health: 2,
  
  race: "Beast",
      class: 'Neutral',
  
  keywords: ['stealth'],
      collectible: true
  },
  {
    id: 5030,
    name: 'Crusader of Baldur',
  description: 'Divine Shield',
  
  flavorText: 'Protected by the god of light\'s blessing.',
  type: 'minion',
  rarity: 'common',
  
  manaCost: 3,
  attack: 3,
  
  health: 1,
  class: 'Neutral',
  
  keywords: ['divine_shield'],
      collectible: true
  },
  {
    id: 5031,
    name: 'Seer of the Norns',
  description: 'Windfury',
  
  flavorText: 'Glimpsing the threads of fate grants swiftness.',
  type: 'minion',
  
  rarity: 'rare',
  manaCost: 3,
  
  attack: 2,
  health: 3,
  
  class: 'Neutral',
  keywords: ['windfury'],
      collectible: true
  },
  {
    id: 5032,
    name: 'Guardian of Alfheim',
  description: 'Divine Shield',
  
  flavorText: 'The light elves\' protector shines with divine light.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 4,
  
  attack: 3,
  health: 3,
  
  class: 'Neutral',
  keywords: ['divine_shield'],
      collectible: true
  },
  {
    id: 5033,
    name: 'Tinkerer of Midgard',
      description: 'Battlecry: Summon a 2/1 Automaton Construct.',

      flavorText: 'Inspired by the dwarves\' craftsmanship.',
      type: 'minion',

      rarity: 'common',
      manaCost: 4,

      attack: 2,
      health: 4,

      class: 'Neutral',
      keywords: ['battlecry'],
      collectible: true,
                  battlecry: {
        type: 'summon',
    summonCardId: 5034,
      targetType: 'friendly_battlefield'

       }
    },
  {
    id: 5034,
    name: 'Mechanical Construct',
      description: 'An automated creation of dwarven craftsmanship.',

      type: 'minion',
      rarity: 'common',

      manaCost: 1,
      attack: 2,

      health: 1,
      race: "Automaton",
      class: "Neutral"
  },
  {
    id: 5035,
    name: 'Harpy of the Storm',
  description: 'Windfury',
  
  flavorText: 'The harpies served the gods by punishing the wicked.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 6,
  
  attack: 4,
  health: 5,
  
  class: 'Neutral',
  keywords: ['windfury'],
      collectible: true
  },
  {
    id: 5036,
    name: 'Shade Assassin',
      description: 'Battlecry: Deal 3 damage to the enemy hero.',

      flavorText: 'Shadows from the underworld strike without warning.',
      type: 'minion',

      rarity: 'common',
      manaCost: 5,

      attack: 4,
      health: 4,

      class: 'Neutral',
      keywords: ['battlecry'],
      collectible: true,
                  battlecry: {
        type: 'damage',
      value: 3,

      targetType: 'enemy_hero'
    }
    },
  {
    id: 5037,
    name: 'Priestess of Freyja',
      description: 'Battlecry: Restore 4 Health to your hero.',

      flavorText: 'Freyja\'s priestesses channel her healing light.',
      type: 'minion',

      rarity: 'common',
      manaCost: 6,

      attack: 5,
      health: 4,

      class: 'Neutral',
      keywords: ['battlecry'],
                  battlecry: {
        type: 'heal',
      value: 4,

      targetType: 'friendly_hero'
    }
    },
  {
    id: 5038,
    name: 'Ancient Rune Master',
      description: 'Battlecry: Give adjacent minions Spell Damage +1.',

      flavorText: 'The rune masters of old knew secrets now lost.',
      type: 'minion',

      rarity: 'rare',
      manaCost: 4,

      attack: 2,
      health: 5,

      class: 'Neutral',
      keywords: ['battlecry'],
      collectible: true,
                  battlecry: {
        type: 'buff_adjacent',
      buffType: 'spell_damage',

      value: 1,


      targetType: 'adjacent_minions'

       }
    },
  {
    id: 5039,
    name: 'Mana Wraith of Niflheim',
  description: 'ALL minions cost (1) more.',
  
  flavorText: 'The cold mists drain magical energy.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 2,
  
  attack: 2,
  health: 2,
  
  
  
  class: "Neutral"
  },
  {
    id: 5040,
    name: 'Cyclops Guardian',
  description: 'Taunt',
  
  flavorText: 'The one-eyed giants serve as eternal guardians.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 4,
  
  attack: 1,
  health: 7,
  
  class: 'Neutral',
  keywords: ['taunt'],
      collectible: true
  },
  {
    id: 5042,
    name: 'Champion of Olympus',
  description: 'Charge, Divine Shield',
  flavorText: 'Blessed by the gods for valorous combat.',
  type: 'minion',
  
  rarity: 'rare',
  manaCost: 6,
  
  attack: 4,
  health: 2,
  
  class: 'Neutral',
  keywords: ['charge', 'divine_shield'],
      collectible: true
  },
  {
    id: 5043,
    name: 'Trampling Centaur',
      description: 'Battlecry: Destroy a random enemy minion with 2 or less Attack.',

      flavorText: 'The wild centaurs of the Greek wilds show no mercy.',
      type: 'minion',

      rarity: 'rare',
      manaCost: 5,

      attack: 3,
      health: 5,

      race: "Beast",
      class: 'Neutral',

      keywords: ['battlecry'],
      collectible: true,

                  battlecry: {
        type: 'destroy',

        targetType: 'random_enemy_minion',
      condition: 'attack_less_than_3'

       }
    },
  {
    id: 5044,
    name: 'Sentinel of Helheim',
      description: 'Taunt',

      flavorText: 'Guarding the gates between the living and dead.',
      type: 'minion',

      rarity: 'common',
      manaCost: 2,

      attack: 2,
      health: 2,

      class: 'Neutral',
      keywords: ['taunt'],
  },
  {
    id: 5045,
    name: 'Elder Gorilla of the Forest',
  description: 'Taunt',
  
  flavorText: 'The wise apes protect their sacred groves.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 3,
  
  attack: 1,
  health: 4,
  
  race: "Beast",
      class: 'Neutral',
  
  keywords: ['taunt'],
      collectible: true
  },
  {
    id: 5046,
    name: 'Armored Bear of Thor',
  description: 'Taunt',
  
  flavorText: 'Thor\'s sacred bears wear armor of divine steel.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 3,
  
  attack: 3,
  health: 3,
  
  race: "Beast",
      class: 'Neutral',
  
  keywords: ['taunt'],
      collectible: true
  },
  {
    id: 5047,
    name: 'Swamp Turtle of Midgard',
  description: 'An ancient guardian of the swamps.',
  
  flavorText: 'Ancient turtles that have witnessed the ages.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 4,
  
  attack: 2,
  health: 7,
  
  race: "Beast",
      class: "Neutral",
      collectible: true
  },
  {
    id: 5048,
    name: 'Mercenary of Sparta',
  description: 'Taunt',
  
  flavorText: 'Spartan warriors fight for gold as well as glory.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 5,
  
  attack: 5,
  health: 4,
  
  class: 'Neutral',
  keywords: ['taunt'],
      collectible: true
  },
  {
    id: 5049,
    name: 'Marsh Stalker',
  description: 'Taunt',
  
  flavorText: 'Lurking in the swamps between realms.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 5,
  
  attack: 3,
  health: 6,
  
  class: 'Neutral',
  keywords: ['taunt'],
      collectible: true
  },
  {
    id: 5050,
    name: 'Spiteful Smith of Svartalfheim',
  description: 'Enrage: Your weapon has +2 Attack.',
  
  flavorText: 'The dark elves\' smiths forge with fury.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 5,
  
  attack: 4,
  health: 6,
  
  class: 'Neutral',
  keywords: ['enrage'],
  
  
  collectible: true
  },
  {
    id: 5051,
    name: 'Sea Sprite Oracle',
  description: 'ALL other Nagas have +1 Attack.',
  
  flavorText: 'The wisest of the sea sprites, they say.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 1,
  
  attack: 1,
  health: 1,
  
  race: 'Naga',
  class: "Neutral",
      collectible: true
  },
  {
    id: 5052,
    name: 'Sea Sprite Hunter',
      description: 'Battlecry: Summon a 1/1 Sea Sprite Scout.',

      flavorText: 'Hunting the waves for Aegir\'s glory.',
      type: 'minion',

      rarity: 'common',
      manaCost: 2,

      attack: 2,
      health: 1,

      race: "Naga",
      class: 'Neutral',

      keywords: ['battlecry'],
      collectible: true,

                  battlecry: {
        type: 'summon',

        summonCardId: 5053,
      targetType: 'friendly_battlefield'

       }
    },
  {
    id: 5053,
    name: 'Sea Sprite Scout',
      description: 'A small servant of the sea.',

      type: 'minion',
      rarity: 'common',

      manaCost: 1,
      attack: 1,

      health: 1,
      race: "Naga",
      class: "Neutral"
  },
  {
    id: 5054,
    name: 'Grim Einherjar',
  description: 'After this minion survives damage, summon another Grim Einherjar.',
  flavorText: 'For Valhalla! Everyone, get in here!',
  
  type: 'minion',
  rarity: 'common',
  
  manaCost: 5,
  attack: 3,
  
  health: 3,
  class: "Neutral",
      collectible: true
  },
  {
    id: 5055,
    name: 'Shade Summoner',
  description: 'At the end of your turn, deal 1 damage to this minion and summon a 1/1 Shade.',
  flavorText: 'Calling forth spirits from the underworld.',
  
  type: 'minion',
  rarity: 'common',
  
  manaCost: 3,
  attack: 1,
  
  health: 5,
  class: "Neutral",
      collectible: true
  },
  {
    id: 5057,
    name: 'Academy Sage',
  description: 'Whenever you cast a spell, summon a 1/1 Apprentice.',
  flavorText: 'Teaching the arts of magic at the Academy of Athens.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 4,
  
  attack: 3,
  health: 5,
  class: "Neutral",
      collectible: true
  },
  {
    id: 5058,
    name: 'Apprentice Mage',
  description: 'A young mage in training.',
  
  type: 'minion',
  rarity: 'common',
  
  manaCost: 1,
  attack: 1,
  
  health: 1,
  class: "Neutral",
      collectible: false
  },
  {
    id: 5059,
    name: 'Silent Abyss-Stalker',
  description: 'Stealth',
  
  flavorText: 'The elite assassins strike from the shadows of the void.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 7,
  
  attack: 7,
  health: 5,
  
  class: 'Neutral',
  keywords: ['stealth'],
      collectible: true
  },
  {
    id: 5062,
    name: 'Glacial Jotunn of Jotunheim',
      description: 'Battlecry: Freeze a character.',

      flavorText: 'The frost giants bring eternal winter.',
      type: 'minion',

      rarity: 'common',
      manaCost: 6,

      attack: 5,
      health: 5,

      race: "Elemental",
      class: 'Neutral',

      keywords: ['battlecry'],
      collectible: true,

                  battlecry: {
        type: 'freeze',

        targetType: 'any',
      requiresTarget: true

       }
    },
  {
    id: 5070,
    name: 'Transmutation Engine',
    description: 'At the start of your turn, transform a random minion into a 1/1 Chicken.',
      flavorText: 'One of Daedalus\'s more... creative inventions.',

      type: 'minion',
      rarity: 'common',

      manaCost: 1,
      attack: 0,

      health: 3,
      race: "Automaton",
      class: "Neutral"
  },
  {
    id: 5071,
    name: 'Restoration Golem',
  description: 'At the end of your turn, restore 6 Health to a damaged character.',
  flavorText: 'A healing automaton from the divine forge.',

  type: 'minion',
  rarity: 'epic',

  manaCost: 1,
  attack: 0,

  health: 3,
  race: "Automaton",
      class: "Neutral",
      collectible: false
  },
  {
    id: 5072,
    name: 'Transformed Fowl',
  description: 'A creature twisted by magic.',
  
  flavorText: 'It used to be something else before the magic hit it.',
  type: 'minion',
  
  rarity: 'common',
  manaCost: 1,
  
  attack: 1,
  health: 1,
  
  race: "Beast",
      class: "Neutral",
      collectible: false
  },
  {
    id: 3004,
    name: 'Fin of the Deep One',
  description: 'Part of Giga-Fin. Taunt. Deathrattle: Deal 2 damage to all enemy minions.',
  
  type: 'minion',
  rarity: 'rare',
  
  manaCost: 3,
  attack: 3,
  
  health: 3,
  class: 'Warlock',
  
  race: 'Naga',
  keywords: ['taunt', 'deathrattle'],
      collectible: false
  },
  {
    id: 3100,
    name: 'Shield of the Colossus',
  description: 'Part of Colossus of the Moon. Taunt. Divine Shield. Can\'t attack.',
  
  type: 'minion',
  rarity: 'rare',
  
  manaCost: 4,
  attack: 0,
  
  health: 5,
  class: 'Neutral',
  
  keywords: ['taunt', 'divine_shield'],
      collectible: false
  },
  {
    id: 3101,
    name: 'Hand of Poseidon',
  description: 'Part of Neptulon the Tidehunter. After this attacks, add a random Elemental to your hand.',
  type: 'minion',
  
  rarity: 'epic',
  manaCost: 4,
  
  attack: 4,
  health: 2,
  
  class: 'Shaman',
  race: 'Elemental',
      collectible: false
  }
      ];

// Combine all card sources for the full database
// Removed duplicate export to use the cardDatabase.ts file instead

// Helper function to get cards by various filters
export const getCardsByFilter = (
      filters: {
      class?: string;
    type?: string;
    rarity?: string;
    manaCost?: number | 'all';
    searchText?: string;
  }
) => {
  return fullCardDatabase.filter(card => {
    // Filter by collectible
    if (!card.collectible) return false;
    
    // Filter by class
    if (filters.class && filters.class !== 'all' && 
        card.class !== filters.class && card.class !== 'Neutral') {
      return false;
    }
    
    // Filter by type
    if (filters.type && filters.type !== 'all' && card.type !== filters.type) {
      return false;
    }
    
    // Filter by rarity
    if (filters.rarity && filters.rarity !== 'all' && card.rarity !== filters.rarity) {
      return false;
    }
    
    // Filter by mana cost
    if (filters.manaCost && filters.manaCost !== 'all') {
      if (filters.manaCost === 7) {
        if (!card.manaCost || card.manaCost < 7) return false;
      } else if (card.manaCost !== filters.manaCost) {
        return false;
      }
    }
    
    // Filter by search text
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      const nameMatch = card.name.toLowerCase().includes(searchLower);
      const descMatch = card.description ? card.description.toLowerCase().includes(searchLower) : false;
      const raceMatch = card.race ? card.race.toLowerCase().includes(searchLower) : false;
      
      if (!nameMatch && !descMatch && !raceMatch) {
        return false;
      }
    }
    
    return true;
  });
};

// Export the database as default for compatibility
export default fullCardDatabase;
