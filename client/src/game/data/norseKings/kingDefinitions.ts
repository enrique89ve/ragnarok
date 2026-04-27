/**
 * kingDefinitions.ts
 *
 * Definitions for the 14 Kings (Summoners) in Ragnarok Poker:
 *   - 11 Primordial Kings (Genesis NFT, finite supply)
 *   - 3 Starter Kings (free, every player owns them — Leif, Askr, Embla)
 *
 * Kings provide passive army-wide buffs and do not participate in combat
 * directly. The `portrait` field is the single source of truth for which
 * `.webp` file under `client/public/art/nfts/` represents this king;
 * `resolveHeroPortrait()` reads it and `npm run audit:art` validates it.
 */

import { NorseKing } from '../../types/NorseTypes';

export const NORSE_KINGS: Record<string, NorseKing> = {
  
  // ==================== 1. YMIR ====================
  'king-ymir': {
    id: 'king-ymir',
      portrait: '8f78-n51onie8',
    name: 'Ymir',
    title: 'The Primordial Jotunn',
    description: 'The first being in Norse mythology, born from the collision of fire and ice alongside his brother Brimir. From his body the world was created.',
    role: 'Tempo Pressure / Attack Skew',
    designIntent: 'Ymir forces combat. He compresses the game timeline and punishes slow setups. If you hesitate, Ymir wins. Where Brimir is blood and fury, Ymir is frost and inevitability.',
    hasSpells: false,
    passives: [
      {
        id: 'ymir-passive-1',
        name: "Jotunn's Might",
        description: 'All friendly minions gain +2 Attack.',
        trigger: 'always',
        effectType: 'buff_attack',
        value: 2,
        isAura: true
      },
      {
        id: 'ymir-passive-2',
        name: 'Chilling Presence',
        description: 'All enemy minions suffer -1 Attack.',
        trigger: 'always',
        effectType: 'debuff_attack',
        value: 1,
        isAura: true
      }
    ]
  },

  // ==================== 2. BURI ====================
  'king-buri': {
    id: 'king-buri',
      portrait: '984f-0o06zvr0',
    name: 'Buri',
    title: 'The First God',
    description: 'The first of the gods, licked free from the ice by the primordial cow Auðumbla.',
    role: 'Attrition / Scaling Defense',
    designIntent: 'Buri rewards patience and survival. You don\'t win quickly. You win by outlasting everything.',
    hasSpells: false,
    passives: [
      {
        id: 'buri-passive-1',
        name: 'Primordial Shield',
        description: 'All friendly minions gain +1 Armor.',
        trigger: 'always',
        effectType: 'buff_armor',
        value: 1,
        isAura: true
      },
      {
        id: 'buri-passive-2',
        name: 'Eternal Growth',
        description: 'At the start of your turn, all friendly minions gain +1 Health permanently.',
        trigger: 'start_of_turn',
        effectType: 'buff_health',
        value: 1,
        isAura: false  // Permanent, not removed when King dies
      }
    ]
  },

  // ==================== 3. SURTR ====================
  'king-surtr': {
    id: 'king-surtr',
      portrait: 'dbeb-b0mibte9',
    name: 'Surtr',
    title: 'The Fire Giant',
    description: 'The lord of Muspelheim who will set the world ablaze at Ragnarok.',
    role: 'Pressure / Board Erosion',
    designIntent: 'Surtr makes doing nothing lethal. If you don\'t act, the fire will.',
    hasSpells: false,
    passives: [
      {
        id: 'surtr-passive-1',
        name: 'Flame Touched',
        description: 'All friendly minions gain +1 Attack.',
        trigger: 'always',
        effectType: 'buff_attack',
        value: 1,
        isAura: true
      },
      {
        id: 'surtr-passive-2',
        name: "Muspelheim's Burn",
        description: 'At the end of your turn, deal 1 damage to all enemy minions.',
        trigger: 'end_of_turn',
        effectType: 'damage_all_enemies',
        value: 1,
        isAura: false
      }
    ]
  },

  // ==================== 4. BORR ====================
  'king-borr': {
    id: 'king-borr',
      portrait: '78e9-6mupjfob',
    name: 'Borr',
    title: 'The Primordial Father',
    description: 'Father of Odin, Vili, and Ve. The bridge between primordial beings and the Aesir.',
    role: 'Death Value / Board Persistence',
    designIntent: 'Borr denies clean victories. Death is not an ending — it\'s a delay.',
    hasSpells: false,
    passives: [
      {
        id: 'borr-passive-1',
        name: "Father's Blessing",
        description: 'All friendly minions gain +1 Health.',
        trigger: 'always',
        effectType: 'buff_health',
        value: 1,
        isAura: true
      },
      {
        id: 'borr-passive-2',
        name: 'Echo of Life',
        description: 'When a friendly minion dies, summon a 1/1 Echo of Borr with Taunt in its place.',
        trigger: 'on_minion_death',
        effectType: 'summon_token',
        value: 0,
        isAura: false,
        summonData: {
          name: 'Echo of Borr',
          attack: 1,
          health: 1,
          keywords: ['taunt']
        }
      }
    ]
  },

  // ==================== 5. YGGDRASIL ====================
  'king-yggdrasil': {
    id: 'king-yggdrasil',
      portrait: 'a913-axqs13eu',
    name: 'Yggdrasil',
    title: 'The World Tree',
    description: 'The immense sacred tree that connects the nine worlds of Norse cosmology.',
    role: 'Growth Engine / Scaling Power',
    designIntent: 'Yggdrasil converts survival into dominance. Growth is inevitable if left unchecked.',
    hasSpells: false,
    passives: [
      {
        id: 'yggdrasil-passive-1',
        name: 'Life Spring',
        description: 'At the start of your turn, restore 2 Health to all friendly minions.',
        trigger: 'start_of_turn',
        effectType: 'heal_all_friendly',
        value: 2,
        isAura: false
      },
      {
        id: 'yggdrasil-passive-2',
        name: 'Roots of Power',
        description: 'Whenever a friendly minion is healed, it gains +1 Attack permanently.',
        trigger: 'on_heal',
        effectType: 'grant_attack_on_heal',
        value: 1,
        isAura: false
      }
    ]
  },

  // ==================== 6. AUDUMBLA ====================
  'king-audumbla': {
    id: 'king-audumbla',
      portrait: '4655-o4xbxsth',
    name: 'Auðumbla',
    title: 'The Primordial Cow',
    description: 'The primordial cow whose milk nourished Ymir and who licked Buri free from the ice.',
    role: 'Sustain / Board Stability',
    designIntent: 'Auðumbla rewards presence and numbers. Life feeds life.',
    hasSpells: false,
    passives: [
      {
        id: 'audumbla-passive-1',
        name: 'Nourishing Presence',
        description: 'All friendly minions gain +1 Health.',
        trigger: 'always',
        effectType: 'buff_health',
        value: 1,
        isAura: true
      },
      {
        id: 'audumbla-passive-2',
        name: 'Gift of Life',
        description: 'Whenever you play a minion, restore 1 Health to all friendly minions.',
        trigger: 'on_minion_play',
        effectType: 'heal_all_friendly',
        value: 1,
        isAura: false
      }
    ]
  },

  // ==================== 7. GAIA ====================
  'king-gaia': {
    id: 'king-gaia',
      portrait: 'c838-ebed9878',
    name: 'Gaia',
    title: 'Mother Earth',
    description: 'The primordial goddess of the Earth — patient, nurturing, and terrifyingly powerful when roused to anger.',
    role: 'Control / Disruption',
    designIntent: 'Gaia wins by denial, not force. The earth endures while all others wither.',
    hasSpells: false,
    passives: [
      {
        id: 'gaia-king-passive-1',
        name: "Earth's Embrace",
        description: 'All friendly minions gain +1 Health.',
        trigger: 'always',
        effectType: 'buff_health',
        value: 1,
        isAura: true
      },
      {
        id: 'gaia-king-passive-2',
        name: "Wither and Root",
        description: 'At the start of your turn, a random enemy minion loses 1 Attack permanently.',
        trigger: 'start_of_turn',
        effectType: 'debuff_attack',
        value: 1,
        isAura: false
      }
    ]
  },

  // ==================== 8. BRIMIR ====================
  'king-brimir': {
    id: 'king-brimir',
      portrait: 'b1f2-3e7dd08d',
    name: 'Brimir',
    title: 'The Bloody Moisture',
    description: 'Brother of Ymir, born alongside him from the primordial collision of fire and ice. Where Ymir became flesh and bone, Brimir became blood and marrow — the violent half of creation.',
    role: 'Aggression Through Death',
    designIntent: 'Brimir turns loss into pressure. Blood spills both ways. As Ymir\'s brother, he represents the destructive cost of creation — the price paid in blood for every world that was shaped from their shared origin.',
    hasSpells: false,
    passives: [
      {
        id: 'brimir-passive-1',
        name: 'Blood Rage',
        description: 'All friendly minions gain +1 Attack.',
        trigger: 'always',
        effectType: 'buff_attack',
        value: 1,
        isAura: true
      },
      {
        id: 'brimir-passive-2',
        name: "Death's Echo",
        description: 'When a friendly minion dies, deal 1 damage to all enemy minions.',
        trigger: 'on_minion_death',
        effectType: 'damage_all_enemies',
        value: 1,
        isAura: false
      }
    ]
  },

  // ==================== 9. GINNUNGAGAP ====================
  'king-ginnungagap': {
    id: 'king-ginnungagap',
      portrait: '1d49-jajdixap',
    name: 'Ginnungagap',
    title: 'Primordial Chaos',
    description: 'The primordial void that existed before creation, from which all things emerged.',
    role: 'Chaos / Variance / Adaptation',
    designIntent: 'Ginnungagap rewards embracing uncertainty. Creation is chaos made solid.',
    hasSpells: false,
    passives: [
      {
        id: 'ginnungagap-passive-1',
        name: 'Void Spawn',
        description: 'At the end of your turn, summon a 1/1 Void Spawn with a random keyword.',
        trigger: 'end_of_turn',
        effectType: 'summon_token',
        value: 0,
        isAura: false,
        summonData: {
          name: 'Void Spawn',
          attack: 1,
          health: 1,
          randomKeyword: true
        }
      }
    ]
  }
  ,

  // ==================== 10. TARTARUS ====================
  'king-tartarus': {
    id: 'king-tartarus',
      portrait: '6c5f-enclx79l',
    name: 'Tartarus',
    title: 'The Abyss Below',
    description: 'The prison beneath the underworld where even gods fear to tread. Titans and the worst souls are chained in his depths, guarded by hundred-handed giants for eternity.',
    role: 'Attrition / Symmetrical Drain',
    designIntent: 'Tartarus punishes everything equally. The abyss does not distinguish friend from foe — it swallows all. Build high-health minions to outlast the constant drain while your enemy crumbles.',
    hasSpells: false,
    passives: [
      {
        id: 'tartarus-passive-1',
        name: 'Abyssal Gravity',
        description: 'ALL minions (friendly and enemy) have -1 Attack.',
        trigger: 'always',
        effectType: 'debuff_attack',
        value: 1,
        isAura: true,
        affectsAll: true
      },
      {
        id: 'tartarus-passive-2',
        name: 'Eternal Imprisonment',
        description: 'At the end of each turn, deal 1 damage to ALL minions.',
        trigger: 'end_of_turn',
        effectType: 'damage_all',
        value: 1,
        isAura: false,
        affectsAll: true
      }
    ]
  }
  ,

  // ==================== 11. URANUS ====================
  'king-uranus': {
    id: 'king-uranus',
      portrait: '523f-0ovd1djs',
    name: 'Uranus',
    title: 'The Sky Father',
    description: 'The primordial god of the sky whose body became the eternal dome of stars. His divine blood birthed the Furies and giants — even in defeat, his essence breeds power.',
    role: 'Aggro / Splash Damage',
    designIntent: 'Uranus commands from above. His minions strike harder and their blows echo across the battlefield, punishing clustered defenses. The sky does not miss.',
    hasSpells: false,
    passives: [
      {
        id: 'uranus-passive-1',
        name: 'Celestial Might',
        description: 'All friendly minions gain +1 Attack.',
        trigger: 'always',
        effectType: 'buff_attack',
        value: 1,
        isAura: true
      },
      {
        id: 'uranus-passive-2',
        name: 'Starfall',
        description: 'When a friendly minion attacks, deal 1 damage to a random adjacent enemy minion.',
        trigger: 'on_minion_attack',
        effectType: 'damage_adjacent_random',
        value: 1,
        isAura: false
      }
    ]
  },

  // ==================== 12. LEIF (STARTER — BASE / FREE) ====================
  'king-leif': {
    id: 'king-leif',
    name: 'Leif the Wayfinder',
    title: 'The Starter King',
    description: 'A young Norse explorer-king. The first king every player commands.',
    role: 'Sustain / Beginner-Friendly',
    designIntent: 'Leif teaches the basics of the King role: a small persistent buff plus a gentle heal. Welcoming to new players, never punishing.',
    portrait: '4a86-873y8lih',
    hasSpells: false,
    passives: [
      {
        id: 'leif-passive-1',
        name: "Wayfinder's Resolve",
        description: 'All friendly minions gain +1 Health.',
        trigger: 'always',
        effectType: 'buff_health',
        value: 1,
        isAura: true
      },
      {
        id: 'leif-passive-2',
        name: 'Mending Light',
        description: 'At the start of your turn, restore 1 Health to your most damaged minion.',
        trigger: 'start_of_turn',
        effectType: 'heal_all_friendly',
        value: 1,
        isAura: false
      }
    ]
  },

  // ==================== 13. ASKR (STARTER — COMMON) ====================
  'king-askr': {
    id: 'king-askr',
    name: 'Askr',
    title: 'The First Man',
    description: 'Carved from an ash tree by Odin, Vili and Vé. Simple but relentless, the first male of mortal kind.',
    role: 'Attack Pressure',
    designIntent: 'Askr is unsubtle: more attack, more pressure. Where Leif heals, Askr punches. He suits players who like a clear, aggressive plan.',
    portrait: '1fa1-0bt3p0qe',
    hasSpells: false,
    passives: [
      {
        id: 'askr-passive-1',
        name: "First Man's Vigor",
        description: 'All friendly minions gain +1 Attack.',
        trigger: 'always',
        effectType: 'buff_attack',
        value: 1,
        isAura: true
      }
    ]
  },

  // ==================== 14. EMBLA (STARTER — COMMON) ====================
  'king-embla': {
    id: 'king-embla',
    name: 'Embla',
    title: 'The First Woman',
    description: 'Carved from an elm tree by Odin, Vili and Vé. Mother of mortal kind, source of resilience.',
    role: 'Sustain / Endurance',
    designIntent: 'Embla rewards survival. Persistent passive healing keeps her board breathing while Askr swings. The pair completes the starter triad with Leif.',
    portrait: 'e7cc-8r1oubzy',
    hasSpells: false,
    passives: [
      {
        id: 'embla-passive-1',
        name: "First Woman's Endurance",
        description: 'All friendly minions gain +1 Health.',
        trigger: 'always',
        effectType: 'buff_health',
        value: 1,
        isAura: true
      },
      {
        id: 'embla-passive-2',
        name: 'Tree of Life',
        description: 'At the end of your turn, restore 1 Health to all friendly minions.',
        trigger: 'end_of_turn',
        effectType: 'heal_all_friendly',
        value: 1,
        isAura: false
      }
    ]
  }
};

export const KING_LIST = Object.values(NORSE_KINGS);

export const getKingById = (id: string): NorseKing | undefined => {
  return NORSE_KINGS[id];
};

export const getAllKings = (): NorseKing[] => {
  return KING_LIST;
};
