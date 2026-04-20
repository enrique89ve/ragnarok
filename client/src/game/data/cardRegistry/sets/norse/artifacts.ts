import { ArtifactCardData } from '../../../../types';

const norseArtifacts: ArtifactCardData[] = [
	{
		id: 29800,
		name: 'Gungnir',
		manaCost: 7,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'mage',
		heroId: 'hero-odin',
		attack: 1,
		description: 'Your spells cost (1) less. After you cast a spell, deal 1 damage to all enemy minions.',
		flavorText: 'The Allfather\'s spear never misses its mark, and its wisdom flows through every incantation.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'gungnir',
			spellCostReduction: 1,
			onSpellCast: { damage: 1, targetType: 'all_enemy_minions' }
		},
		categories: ['norse_artifact']
	},
	{
		id: 29801,
		name: 'Master Bolt',
		manaCost: 6,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'mage',
		heroId: 'hero-zeus',
		attack: 2,
		description: 'Your first spell each turn deals double damage. Activated (1): Deal 1 damage to a random enemy.',
		flavorText: 'Forged in the heart of Olympus, it crackles with the fury of the storm.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'master_bolt',
			firstSpellDouble: true,
			activated: { manaCost: 1, damage: 1, targetType: 'random_enemy' }
		},
		categories: ['greek_artifact']
	},
	{
		id: 29802,
		name: 'Mjolnir',
		manaCost: 7,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'warrior',
		heroId: 'hero-thor',
		attack: 2,
		description: 'After your hero attacks, deal 1 damage to all enemy minions. Lightning spells refresh your hero attack.',
		flavorText: 'Only the worthy may wield the hammer of the Thunder God.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'mjolnir',
			onHeroAttack: { damage: 1, targetType: 'all_enemy_minions' },
			onLightningSpell: 'refresh_hero_attack'
		},
		categories: ['norse_artifact']
	},
	{
		id: 29803,
		name: 'Lævateinn',
		manaCost: 5,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'rogue',
		heroId: 'hero-loki',
		attack: 1,
		description: 'Whenever you play a card that summons a minion, also summon a 1/1 Illusion. Your Illusions have +1/+1.',
		flavorText: 'The damage-twig, named in the Fjölsvinnsmál. Loki retrieved it from beneath the gates of death. What it cuts never heals.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'dagger_of_deceit',
			onMinionPlay: { summon: 'illusion_1_1' },
			illusionBuff: { attack: 1, health: 1 }
		},
		categories: ['norse_artifact']
	},
	{
		id: 29804,
		name: 'The Aegis',
		manaCost: 5,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'paladin',
		heroId: 'hero-athena',
		attack: 0,
		description: 'Your minions have +1 Health. Once per turn, prevent the first damage dealt to your hero.',
		flavorText: 'Forged by Hephaestus, borne by Zeus and lent to Athena. The Aegis needs no modifier — it IS divine protection.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'aegis_of_strategy',
			minionHealthBuff: 1,
			preventFirstHeroDamage: true
		},
		categories: ['norse_artifact']
	},
	{
		id: 29805,
		name: 'Enyalios',
		manaCost: 6,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'warrior',
		heroId: 'hero-ares',
		attack: 3,
		description: 'After your hero kills a minion, gain +1 Attack permanently. Your hero takes 1 damage after attacking.',
		flavorText: 'Enyalios — the war-name of Ares, invoked by Spartans before battle. The blade answers only to that name.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'blade_of_carnage',
			onHeroKill: { permanentAttackBonus: 1 },
			selfDamageOnAttack: 1
		},
		categories: ['norse_artifact']
	},
	{
		id: 29806,
		name: 'Cap of Invisibility',
		manaCost: 5,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'warlock',
		heroId: 'hero-hades',
		attack: 1,
		description: 'Whenever any minion dies, gain +1 Soul. Spend 3 Souls: Summon a 3/3 Spirit.',
		flavorText: 'The Kynee of Hades, forged by the Cyclopes. Perseus borrowed it to slay Medusa. Its wearer vanishes from sight and memory.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'helm_of_underworld',
			onAnyMinionDeath: { gainSouls: 1 },
			soulSpend: { cost: 3, summon: 'spirit_3_3' }
		},
		categories: ['norse_artifact']
	},
	{
		id: 29807,
		name: 'Brisingamen',
		manaCost: 7,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'priest',
		heroId: 'hero-freya',
		attack: 0,
		description: 'After you summon a minion, give it +1/+1. If you control 3+ minions, they all have Lifesteal.',
		flavorText: 'The necklace of the Vanir goddess blesses all who fight beside her.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'brisingamen',
			onSummon: { buffAttack: 1, buffHealth: 1 },
			lifestealThreshold: 3
		},
		categories: ['norse_artifact']
	},
	{
		id: 29808,
		name: 'Trident of the Deep',
		manaCost: 6,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'shaman',
		heroId: 'hero-poseidon',
		attack: 2,
		description: 'After your hero attacks, Freeze the target. If the target is already Frozen, destroy it.',
		flavorText: 'The seas obey only one master — and his trident brooks no defiance.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'trident_of_deep',
			onHeroAttack: { freeze: true, destroyIfFrozen: true }
		},
		categories: ['norse_artifact']
	},
	{
		id: 29809,
		name: 'Oathblade',
		manaCost: 7,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'paladin',
		heroId: 'hero-tyr',
		attack: 2,
		description: 'If your hero was damaged this turn, gain +2 Armor at end of turn. Once per game: Prevent lethal damage, set HP to 5.',
		flavorText: 'Tyr gave his hand for an oath. His blade remembers the cost of honor.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'oathblade',
			onDamagedEndOfTurn: { gainArmor: 2 },
			preventLethal: { setHealth: 5, oneTimeUse: true }
		},
		categories: ['norse_artifact']
	},

	// ═══════════════════════════════════════════════════════════════
	// NORSE — QUEENS (Mage)
	// ═══════════════════════════════════════════════════════════════

	{
		id: 29900,
		name: 'Harp of Bragi',
		manaCost: 6,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'mage',
		heroId: 'hero-bragi',
		attack: 1,
		description: 'After you cast a spell, add a random spell to your hand (costs 1 less). Your spells have +1 Spell Damage.',
		flavorText: 'His harp made stones weep and trees dance. Runes carved on his tongue sing the saga of creation.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'harp_of_bragi',
			onSpellCast: { addRandomSpell: true, spellCostReduction: 1 },
			spellDamageBonus: 1
		},
		categories: ['norse_artifact']
	},
	{
		id: 29901,
		name: 'Odrerir',
		manaCost: 5,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'mage',
		heroId: 'hero-kvasir',
		attack: 0,
		description: 'After you cast a spell, Foresee a spell from any class. End of turn: if you cast 3+ spells this turn, draw 2 cards.',
		flavorText: 'The Mead of Poetry, brewed from the blood of the wisest being ever to live. One sip grants the gift of verse.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'odrerir',
			onSpellCast: { discoverSpell: true },
			endOfTurn: { drawIfSpellThreshold: 3, drawCount: 2 }
		},
		categories: ['norse_artifact']
	},

	// ═══════════════════════════════════════════════════════════════
	// NORSE — QUEENS (Warlock)
	// ═══════════════════════════════════════════════════════════════

	{
		id: 29902,
		name: 'Gavel of Glitnir',
		manaCost: 5,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'warlock',
		heroId: 'hero-forseti',
		attack: 1,
		description: 'Whenever a friendly minion is destroyed, deal 2 damage to the enemy hero. End of turn: if both players lost a minion, draw a card.',
		flavorText: 'In Glitnir, pillars of gold hold up a roof of silver. All who enter leave with their dispute settled — one way or another.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'gavel_of_glitnir',
			onFriendlyMinionDeath: { damageEnemyHero: 2 },
			endOfTurn: { drawIfBothLostMinion: true }
		},
		categories: ['norse_artifact']
	},
	{
		id: 29903,
		name: "Mani's Lunar Chariot",
		manaCost: 5,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'warlock',
		heroId: 'hero-mani',
		attack: 1,
		description: 'Your cards cost (1) less during your opponent\'s turns. End of turn: if your hand has 3 or fewer cards, draw 2.',
		flavorText: 'The Moon races across the sky, forever chased by the wolf Hati. In that desperate flight, power is forged.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'mani_lunar_chariot',
			opponentTurnCostReduction: 1,
			endOfTurn: { drawIfHandSizeBelow: 3, drawCount: 2 }
		},
		categories: ['norse_artifact']
	},

	// ═══════════════════════════════════════════════════════════════
	// NORSE — QUEENS (Necromancer)
	// ═══════════════════════════════════════════════════════════════

	{
		id: 29904,
		name: "Sol's Sunfire Chariot",
		manaCost: 6,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'necromancer',
		heroId: 'hero-sol',
		attack: 2,
		description: 'At end of turn, deal 1 damage to all enemy minions. This damage increases by 1 each turn.',
		flavorText: 'Arvakr and Alsvior pull the sun ever onward, and in their wake the world burns brighter — and hotter.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'sol_sunfire_chariot',
			endOfTurn: { escalatingAoE: true, baseDamage: 1, increment: 1 }
		},
		categories: ['norse_artifact']
	},
	{
		id: 29905,
		name: 'Laevateinn',
		manaCost: 6,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'necromancer',
		heroId: 'hero-sinmara',
		attack: 3,
		description: 'After your hero attacks, destroy any minion with 3 or less Health. Your spells that deal damage deal +1.',
		flavorText: 'The Damage-Twig, locked in a chest with nine locks beneath Yggdrasil. Only Sinmara holds the key.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'laevateinn',
			onHeroAttack: { destroyIfHealthBelow: 3 },
			spellDamageBonus: 1
		},
		categories: ['norse_artifact']
	},
	{
		id: 29906,
		name: 'Hungr & Sultr',
		manaCost: 5,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'necromancer',
		heroId: 'hero-hel',
		attack: 1,
		description: 'Whenever an enemy minion takes damage, drain 1 Health from it (heal your hero). On minion death: 50% chance to raise a 1/1 copy.',
		flavorText: 'Her dish is Hunger, her knife is Famine. Her bed is Sickness, her curtains Gleaming Misfortune.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'hungr_sultr',
			onEnemyMinionDamaged: { drain: 1 },
			onMinionDeath: { raiseChance: 50, raiseStats: { attack: 1, health: 1 } }
		},
		categories: ['norse_artifact']
	},

	// ═══════════════════════════════════════════════════════════════
	// NORSE — ROOKS (Warrior)
	// ═══════════════════════════════════════════════════════════════

	{
		id: 29907,
		name: "Vili's Mantle of Awakening",
		manaCost: 5,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'warrior',
		heroId: 'hero-vili',
		attack: 1,
		description: 'After you play a minion, give it +1 Attack and "Can\'t be Frozen." +1 hero Attack while you control 3+ minions.',
		flavorText: 'Vili gave humanity wit and feeling. His mantle stirs that same spark in all who fight beside him.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'vili_mantle',
			onMinionPlay: { buffAttack: 1, grantFreezeImmunity: true },
			heroAttackWhileMinions: { threshold: 3, bonus: 1 }
		},
		categories: ['norse_artifact']
	},
	{
		id: 29908,
		name: 'The Mammen Axe',
		manaCost: 6,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'warrior',
		heroId: 'hero-thorgrim',
		attack: 3,
		description: 'After your hero attacks, gain +2 Armor. If your hero has 5+ Armor, your hero attacks deal +2 damage.',
		flavorText: 'Unearthed from a 10th-century Viking burial at Mammen, Denmark. Silver-inlaid with Yggdrasil — a mortal weapon worthy of the gods.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'thorgrim_battleaxe',
			onHeroAttack: { gainArmor: 2 },
			armorAttackBonus: { threshold: 5, bonus: 2 }
		},
		categories: ['norse_artifact']
	},
	{
		id: 29909,
		name: 'Seidstafr',
		manaCost: 5,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'warrior',
		heroId: 'hero-valthrud',
		attack: 0,
		description: 'After you cast a spell, give a random friendly minion +1/+2. End of turn: if you control 4+ minions, give them all +1 Health.',
		flavorText: 'The seidr-staff in Old Norse. Völvas carried the seidstafr to channel galdr magic. Even Odin sought their counsel.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'seidr_staff',
			onSpellCast: { buffRandomMinion: { attack: 1, health: 2 } },
			endOfTurn: { healthBuffIfMinions: { threshold: 4, buff: 1 } }
		},
		categories: ['norse_artifact']
	},
	{
		id: 29910,
		name: "Logi's Consuming Flame",
		manaCost: 6,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'warrior',
		heroId: 'hero-logi',
		attack: 2,
		description: 'After your hero attacks, deal 2 damage to adjacent minions. Your hero is Immune while attacking.',
		flavorText: 'He devoured the food, the trencher, and the table itself. Wildfire consumes all it touches.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'logi_flame',
			onHeroAttack: { adjacentDamage: 2 },
			heroImmuneWhileAttacking: true
		},
		categories: ['norse_artifact']
	},

	// ═══════════════════════════════════════════════════════════════
	// NORSE — ROOKS (Death Knight)
	// ═══════════════════════════════════════════════════════════════

	{
		id: 29911,
		name: 'Megingjord',
		manaCost: 7,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'DeathKnight',
		heroId: 'hero-magni',
		attack: 2,
		description: 'Your hero has +2 Attack. After your hero attacks, if the target died, your hero can attack again this turn.',
		flavorText: 'Thor\'s belt of strength doubles the might of its wearer. Magni, who lifted Hrungnir\'s leg, needs no such aid — but wears it still.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'megingjord',
			passiveAttackBonus: 2,
			onHeroKill: { refreshAttack: true }
		},
		categories: ['norse_artifact']
	},
	{
		id: 29912,
		name: 'Gleipnir',
		manaCost: 6,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'DeathKnight',
		heroId: 'hero-brakki',
		attack: 2,
		description: 'After your hero attacks, Freeze the target for 2 turns. Frozen enemy minions have -2 Attack.',
		flavorText: 'The fetter that binds Fenrir, forged by dwarves from impossible things: a cat\'s footstep, a mountain\'s roots, a fish\'s breath.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'brakki_chains',
			onHeroAttack: { freeze: true, freezeDuration: 2 },
			frozenEnemyDebuff: { attackReduction: 2 }
		},
		categories: ['norse_artifact']
	},
	{
		id: 29913,
		name: "Thrymr's Stolen Crown",
		manaCost: 5,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'DeathKnight',
		heroId: 'hero-thryma',
		attack: 1,
		description: 'Whenever your opponent plays a card that costs 4+, gain a copy (costs 2 less). Gain +1 Armor when you play a stolen card.',
		flavorText: 'The frost giant king who stole Mjolnir and demanded a goddess as ransom. Theft is in his nature.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'thrymr_crown',
			onOpponentPlayCard: { costThreshold: 4, copyReduction: 2 },
			onPlayStolenCard: { gainArmor: 1 }
		},
		categories: ['norse_artifact']
	},

	// ═══════════════════════════════════════════════════════════════
	// NORSE — ROOKS (Paladin)
	// ═══════════════════════════════════════════════════════════════

	{
		id: 29914,
		name: "Vidarr's Iron Boot",
		manaCost: 6,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'paladin',
		heroId: 'hero-vidar',
		attack: 2,
		description: 'After your hero attacks, if the target has 5+ Attack, destroy it instantly. No counter-damage from Taunt minions.',
		flavorText: 'Assembled over all of history from leather scraps. At Ragnarok, Vidarr places it on Fenrir\'s jaw and tears the wolf asunder.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'vidarr_boot',
			onHeroAttack: { destroyIfAttackAbove: 5 },
			ignoreTauntCounterDamage: true
		},
		categories: ['norse_artifact']
	},
	{
		id: 29915,
		name: 'Gjallarhorn',
		manaCost: 7,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'paladin',
		heroId: 'hero-heimdall',
		attack: 0,
		description: 'Start of turn: reveal top card of opponent\'s deck. Minions have +1/+1 at full hero Health. Once per game: give all minions Divine Shield.',
		flavorText: 'When Heimdallr blows this horn, it will signal the end of all things. Until then, it watches.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'gjallarhorn',
			startOfTurn: { revealOpponentTopCard: true },
			minionBuffAtFullHealth: { attack: 1, health: 1 },
			oncePerGame: { giveAllDivineShield: true }
		},
		categories: ['norse_artifact']
	},
	{
		id: 29916,
		name: "Baldur's Radiance",
		manaCost: 5,
		type: 'artifact',
		rarity: 'mythic',
		heroClass: 'paladin',
		heroId: 'hero-baldur',
		attack: 0,
		description: 'Your minions can\'t take more than 2 damage from a single source. End of turn: restore 2 Health to all friendly characters.',
		flavorText: 'So radiant that light shines from him. Every substance in creation swore to spare him — all but one.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'baldur_radiance',
			minionDamageCap: 2,
			endOfTurn: { healAllFriendly: 2 }
		},
		categories: ['norse_artifact']
	},
	{
		id: 29917,
		name: "Solvi's Oath-Ring",
		manaCost: 5,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'paladin',
		heroId: 'hero-solvi',
		attack: 1,
		description: 'When you play a minion, give it "Deathrattle: Give a random friendly minion +2/+2." Gain +1 Armor on Deathrattle triggers.',
		flavorText: 'Blood oaths sworn on sacred arm-rings bind the living to the dead, and the dead to vengeance.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'solvi_oath_ring',
			onMinionPlay: { grantDeathrattle: { buffRandom: { attack: 2, health: 2 } } },
			onDeathrattleTrigger: { gainArmor: 1 }
		},
		categories: ['norse_artifact']
	},
	{
		id: 29918,
		name: "Delling's Shard",
		manaCost: 5,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'paladin',
		heroId: 'hero-eldrin',
		attack: 1,
		description: 'After you play a spell, give your hero +1 Attack this turn. Start of turn: if your hero has Armor, refresh your Hero Power.',
		flavorText: 'Delling, father of Dagr, is the dawn-god of Norse myth. This shard carries the first light that broke over Ginnungagap.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'eldrin_dawn_shard',
			onSpellPlay: { heroAttackThisTurn: 1 },
			startOfTurn: { refreshHeroPowerIfArmored: true }
		},
		categories: ['norse_artifact']
	},

	// ═══════════════════════════════════════════════════════════════
	// NORSE — BISHOPS (Priest)
	// ═══════════════════════════════════════════════════════════════

	{
		id: 29919,
		name: "Eir's Mercy",
		manaCost: 5,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'priest',
		heroId: 'hero-eir',
		attack: 0,
		description: 'End of turn: restore 3 Health to your most damaged character. First friendly minion death each turn: restore it to 1 Health instead.',
		flavorText: 'On Lyfjaberg, the Healing Hill, Eir tends wounds that no mortal hand can mend.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'eir_mercy',
			endOfTurn: { healMostDamaged: 3 },
			preventFirstDeathPerTurn: true
		},
		categories: ['norse_artifact']
	},
	{
		id: 29920,
		name: 'Sumarbrander',
		manaCost: 5,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'priest',
		heroId: 'hero-frey',
		attack: 2,
		description: 'Your minions have +1 Attack. When a friendly minion attacks alone (no others attacked this turn), it deals double damage.',
		flavorText: 'The Summer Sword fights on its own. Freyr gave it away to win Gerd\'s love — and at Ragnarok, he will fall for it.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'sumarbrander',
			passiveMinionAttackBuff: 1,
			soloAttackDoubleDamage: true
		},
		categories: ['norse_artifact']
	},
	{
		id: 29921,
		name: "Hoenir's Spirit-Gift",
		manaCost: 5,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'priest',
		heroId: 'hero-hoenir',
		attack: 0,
		description: 'After you play a minion, give it a random keyword (Taunt, Divine Shield, Lifesteal, or Rush). Draw a card when a minion gains a keyword.',
		flavorText: 'Hoenir gave humanity divine inspiration. Without Mimir to advise him, he could only say: "Let others decide."',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'hoenir_spirit_gift',
			onMinionPlay: { grantRandomKeyword: ['taunt', 'divine_shield', 'lifesteal', 'rush'] },
			onKeywordGained: { drawCard: true }
		},
		categories: ['norse_artifact']
	},

	// ═══════════════════════════════════════════════════════════════
	// NORSE — BISHOPS (Druid)
	// ═══════════════════════════════════════════════════════════════

	{
		id: 29922,
		name: "Idunn's Golden Apples",
		manaCost: 5,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'druid',
		heroId: 'hero-idunn',
		attack: 0,
		description: 'Start of turn: give a random friendly minion +0/+2 and "Can\'t be destroyed by spells." At full hero Health: also +1/+0.',
		flavorText: 'Without Idunn\'s apples, the gods age and grey. With them, eternity is just another morning.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'idunn_apples',
			startOfTurn: { buffRandomMinion: { health: 2, spellImmunity: true }, bonusAtFullHealth: { attack: 1 } }
		},
		categories: ['norse_artifact']
	},
	{
		id: 29923,
		name: "Fjorgyn's Earthroot Staff",
		manaCost: 4,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'druid',
		heroId: 'hero-fjorgyn',
		attack: 0,
		description: 'After you play a minion, summon a 0/2 Earthroot with Taunt. End of turn: all 0-Attack minions gain +1 Attack.',
		flavorText: 'Jord is the Earth herself — mother of Thor, lover of Odin. Her roots hold the Nine Realms together.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'fjorgyn_staff',
			onMinionPlay: { summonToken: { name: 'Earthroot', attack: 0, health: 2, keywords: ['taunt'] } },
			endOfTurn: { buffZeroAttackMinions: { attack: 1 } }
		},
		categories: ['norse_artifact']
	},
	{
		id: 29924,
		name: "Sigyn's Venom Bowl",
		manaCost: 5,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'druid',
		heroId: 'hero-sigyn',
		attack: 0,
		description: 'When your hero takes damage, store it as Venom (max 10). Spend all Venom: deal that damage split among enemies. +1 Armor per 3 Venom.',
		flavorText: 'Faithful Sigyn catches the serpent\'s venom drop by drop. When she empties the bowl, the earth shakes.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'sigyn_venom_bowl',
			onHeroDamaged: { storeVenom: true, maxVenom: 10 },
			activated: { spendAllVenom: true, splitDamage: true },
			passiveArmor: { perVenom: 3, armorGain: 1 }
		},
		categories: ['norse_artifact']
	},
	{
		id: 29925,
		name: "Ve's Gift of Speech",
		manaCost: 4,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'berserker',
		heroId: 'hero-ve',
		attack: 1,
		description: 'First card drawn each turn costs (1) less. End of turn: if you played 3+ cards this turn, draw a card.',
		flavorText: 'Ve gave humanity sight, speech, and hearing. Through his gift, the silence of creation was broken forever.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 've_gift_of_speech',
			onFirstDraw: { costReduction: 1 },
			endOfTurn: { drawIfCardsPlayed: 3 }
		},
		categories: ['norse_artifact']
	},
	{
		id: 29926,
		name: "Blainn's Masterwork Anvil",
		manaCost: 6,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'druid',
		heroId: 'hero-blainn',
		attack: 0,
		description: 'After you play a minion: +1/+1 if it costs 3 or less, or +0/+3 if it costs 4+. Once per game: transform a minion into a random Mythic.',
		flavorText: 'The dwarves of the Dvergatal forged Mjolnir, Gungnir, and Gleipnir. Blainn\'s anvil still rings.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'blainn_anvil',
			onMinionPlay: { buffByCost: { lowThreshold: 3, lowBuff: { attack: 1, health: 1 }, highBuff: { attack: 0, health: 3 } } },
			oncePerGame: { transformToMythic: true }
		},
		categories: ['norse_artifact']
	},

	// ═══════════════════════════════════════════════════════════════
	// NORSE — BISHOPS (Shaman)
	// ═══════════════════════════════════════════════════════════════

	{
		id: 29927,
		name: "Gerd's Radiant Arms",
		manaCost: 5,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'shaman',
		heroId: 'hero-gerd',
		attack: 0,
		description: 'Start of turn: Freeze a random enemy minion. Frozen enemies take +1 damage from all sources. Draw a card when a Frozen enemy dies.',
		flavorText: 'Her arms illuminated all of Jotunheim, sky and sea alike. Even Freyr fell to his knees at the sight.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'gerd_radiant_arms',
			startOfTurn: { freezeRandomEnemy: true },
			frozenEnemyExtraDamage: 1,
			onFrozenEnemyDeath: { drawCard: true }
		},
		categories: ['norse_artifact']
	},
	{
		id: 29928,
		name: "Gefjon's Plow",
		manaCost: 5,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'shaman',
		heroId: 'hero-gefjon',
		attack: 1,
		description: 'After your hero attacks, summon a 1/1 Ox. Oxen have +1/+1 for each other Ox you control. At 4 Oxen: they all gain Rush.',
		flavorText: 'Gefjon ploughed Zealand from the Swedish mainland with her four ox-sons. The furrows became the great lake Malaren.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'gefjon_plow',
			onHeroAttack: { summonToken: { name: 'Ox', attack: 1, health: 1 } },
			oxSynergy: { buffPerOx: { attack: 1, health: 1 }, rushThreshold: 4 }
		},
		categories: ['norse_artifact']
	},
	{
		id: 29929,
		name: "Ran's Drowning Net",
		manaCost: 5,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'shaman',
		heroId: 'hero-ran',
		attack: 0,
		description: 'Whenever an enemy minion is played, give it -1 Attack. After an enemy minion dies, 50% chance to summon a 1/1 Drowned copy for you.',
		flavorText: 'She casts her net to catch the drowned and drags them to her hall beneath the waves.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'ran_net',
			onEnemyMinionPlayed: { debuffAttack: 1 },
			onEnemyMinionDeath: { summonCopyChance: 50, copyStats: { attack: 1, health: 1 } }
		},
		categories: ['norse_artifact']
	},
	{
		id: 29930,
		name: "Njord's Tide-Caller",
		manaCost: 6,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'shaman',
		heroId: 'hero-njord',
		attack: 1,
		description: 'End of turn: gain 1 Mana Crystal (up to 10). Gain +1 Armor when you gain a Mana Crystal. Minions cost (1) less at 8+ mana.',
		flavorText: 'Njord rules the wind and sea, granting wealth and fair passage to those who honor him at Noatun.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'njord_tide_caller',
			endOfTurn: { gainManaCrystal: 1 },
			onGainManaCrystal: { gainArmor: 1 },
			minionCostReduction: { manaThreshold: 8, reduction: 1 }
		},
		categories: ['norse_artifact']
	},

	// ═══════════════════════════════════════════════════════════════
	// NORSE — KNIGHTS (Rogue)
	// ═══════════════════════════════════════════════════════════════

	{
		id: 29931,
		name: 'Mistletoe Arrow',
		manaCost: 5,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'rogue',
		heroId: 'hero-hoder',
		attack: 1,
		description: 'Your attacks bypass Taunt and Divine Shield. After your hero attacks, if the target survives, deal 2 damage to it at end of turn.',
		flavorText: 'The only thing in creation that had not sworn to spare Baldur. Guided by treachery, it found its mark.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'mistletoe_arrow',
			bypassTaunt: true,
			bypassDivineShield: true,
			onHeroAttack: { lingeringDamage: 2 }
		},
		categories: ['norse_artifact']
	},
	{
		id: 29932,
		name: "Gnipahellir's Tooth",
		manaCost: 6,
		type: 'artifact',
		rarity: 'mythic',
		heroClass: 'rogue',
		heroId: 'hero-gormr',
		attack: 2,
		description: 'First attack each turn deals double damage. After attacking, your hero gains Stealth until your next turn.',
		flavorText: 'From the cave Gnipahellir where Garmr is chained. The blood-stained hound will break free at Ragnarok — but his shed fang bites still.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'gormr_shadow_fang',
			firstAttackDoubleDamage: true,
			onHeroAttack: { grantStealth: true }
		},
		categories: ['norse_artifact']
	},
	{
		id: 29933,
		name: "Máni's Thread",
		manaCost: 5,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'rogue',
		heroId: 'hero-lirien',
		attack: 2,
		description: 'Combo: After your hero attacks, return the target to its owner\'s hand. Cards cost (1) less after you play a Combo card.',
		flavorText: 'Máni, the Norse moon god, is chased across the sky by the wolf Hati. His silver thread binds what fate would unravel.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'lirien_garrote',
			combo: { onHeroAttack: { bounceTarget: true } },
			afterComboCard: { costReduction: 1 }
		},
		categories: ['norse_artifact']
	},

	// ═══════════════════════════════════════════════════════════════
	// NORSE — KNIGHTS (Hunter)
	// ═══════════════════════════════════════════════════════════════

	{
		id: 29934,
		name: "Skadi's Frost Bow",
		manaCost: 5,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'hunter',
		heroId: 'hero-skadi',
		attack: 2,
		description: 'After your hero attacks, deal 1 damage to two random other enemies. Enemies at 2 or less Health are Frozen.',
		flavorText: 'The huntress of the frozen peaks. She placed the serpent above Loki\'s face and smiled.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'skadi_frost_bow',
			onHeroAttack: { splashDamage: 1, splashTargets: 2 },
			freezeAtLowHealth: { threshold: 2 }
		},
		categories: ['norse_artifact']
	},
	{
		id: 29935,
		name: "Aegir's Brewing Cauldron",
		manaCost: 5,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'hunter',
		heroId: 'hero-aegir',
		attack: 0,
		description: 'End of turn: Foresee a minion that costs (2) less. If your hand is empty, draw 3 cards instead.',
		flavorText: 'Aegir brews ale for the gods in a cauldron retrieved by Thor from the giant Hymir. His feasts are the stuff of legend.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'aegir_cauldron',
			endOfTurn: { discoverMinion: true, discoverCostReduction: 2 },
			emptyHandBonus: { drawCards: 3 }
		},
		categories: ['norse_artifact']
	},
	{
		id: 29936,
		name: "Ullr's Yew Longbow",
		manaCost: 7,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'hunter',
		heroId: 'hero-ullr',
		attack: 3,
		description: 'Your hero can attack twice each turn. After your second attack, deal 1 damage to all enemies.',
		flavorText: 'The god of archery draws from a yew as old as time. His first arrow finds its mark. His second never misses.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'ullr_longbow',
			doubleAttack: true,
			onSecondAttack: { damageAllEnemies: 1 }
		},
		categories: ['norse_artifact']
	},
	{
		id: 29937,
		name: "Veðrfölnir's Talon",
		manaCost: 6,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'hunter',
		heroId: 'hero-fjora',
		attack: 2,
		description: 'After your hero attacks a minion, deal its Attack as damage to the enemy hero. +1 Attack for each enemy minion.',
		flavorText: 'The hawk Veðrfölnir perches atop Yggdrasil, seeing all. When it dives, nothing escapes its talons.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'fjora_talon',
			onHeroAttackMinion: { redirectAttackToHero: true },
			attackPerEnemyMinion: 1
		},
		categories: ['norse_artifact']
	},

	// ═══════════════════════════════════════════════════════════════
	// NORSE — KNIGHTS (Berserker)
	// ═══════════════════════════════════════════════════════════════

	{
		id: 29938,
		name: "Naglfar's Keel",
		manaCost: 6,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'berserker',
		heroId: 'hero-myrka',
		attack: 3,
		description: 'After your hero attacks, destroy all enemy minions with less Attack than damage dealt. Your hero takes 2 self-damage after attacking.',
		flavorText: 'Naglfar, the ship of dead men\'s nails, carries the armies of Muspelheim to Ragnarok. A splinter from its keel cuts through existence itself.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'myrka_void_scythe',
			onHeroAttack: { destroyIfAttackBelowDamage: true },
			selfDamageOnAttack: 2
		},
		categories: ['norse_artifact']
	},
	{
		id: 29939,
		name: "Gleipnir's Fang",
		manaCost: 5,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'berserker',
		heroId: 'hero-ylva',
		attack: 2,
		description: 'After your hero attacks and kills a minion, gain +1 Attack permanently. Your hero can attack the turn this is equipped.',
		flavorText: 'When Gleipnir was bound around Fenrir\'s jaw, the wolf snapped — and a fang broke free. It carries the hunger of the world-eater.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'ylva_fang',
			onHeroKill: { permanentAttackBonus: 1 },
			rushOnEquip: true
		},
		categories: ['norse_artifact']
	},

	// ═══════════════════════════════════════════════════════════════
	// GREEK — QUEENS (Mage)
	// ═══════════════════════════════════════════════════════════════

	{
		id: 29940,
		name: "Hyperion's Solar Crown",
		manaCost: 6,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'mage',
		heroId: 'hero-hyperion',
		attack: 1,
		description: 'Your spells deal +2 damage. End of turn: deal 1 damage to ALL characters. If your hero has the highest Health, draw a card.',
		flavorText: 'The Titan of heavenly light ordered the first sunrise. His crown still burns with primordial radiance.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'hyperion_solar_crown',
			spellDamageBonus: 2,
			endOfTurn: { damageAll: 1, drawIfHighestHealth: true }
		},
		categories: ['greek_artifact']
	},
	{
		id: 29941,
		name: 'Vault of Ouranos',
		manaCost: 6,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'mage',
		attack: 0,
		description: 'Your spells cost (1) less. When you take damage, gain Spell Damage +1 this turn. At 10+ total damage taken: spells cost (2) less.',
		flavorText: 'Ouranos IS the sky. Even severed from the earth, the vault of heaven endures.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'vault_of_ouranos',
			spellCostReduction: 1,
			onHeroDamaged: { tempSpellDamage: 1 },
			scalingReduction: { damageThreshold: 10, bonusReduction: 1 }
		},
		categories: ['greek_artifact']
	},
	{
		id: 29942,
		name: "Kronos's Adamantine Sickle",
		manaCost: 7,
		type: 'artifact',
		rarity: 'mythic',
		heroClass: 'mage',
		heroId: 'hero-chronos',
		attack: 3,
		description: 'After your hero attacks, reduce all cards in hand by (1). After 3 hero attacks total: take an extra turn (once per game).',
		flavorText: 'The harpe that severed heaven from earth. Time itself bends around its edge.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'kronos_sickle',
			onHeroAttack: { reduceHandCosts: 1 },
			extraTurn: { attacksRequired: 3, oncePerGame: true }
		},
		categories: ['greek_artifact']
	},

	// ═══════════════════════════════════════════════════════════════
	// GREEK + JAPANESE — QUEENS (Warlock)
	// ═══════════════════════════════════════════════════════════════

	{
		id: 29943,
		name: 'The Thyrsus',
		manaCost: 5,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'warlock',
		heroId: 'hero-dionysus',
		attack: 1,
		description: 'After you cast a spell, give a random friendly minion +2 Attack and "50% chance to attack wrong enemy." Draw per minion that attacked this turn.',
		flavorText: 'The fennel staff drips with honey and madness. The Maenads dance, and the world trembles.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'thyrsus',
			onSpellCast: { buffRandomMinion: { attack: 2 }, grantFrenzy: true },
			endOfTurn: { drawPerMinionThatAttacked: true }
		},
		categories: ['greek_artifact']
	},
	{
		id: 29944,
		name: "Persephone's Pomegranate",
		manaCost: 7,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'warlock',
		heroId: 'hero-persephone',
		attack: 0,
		description: 'When a friendly minion dies, gain a Seed (max 6). Spend 3: resurrect a random minion. At 6: resurrect ALL (once per game).',
		flavorText: 'Six seeds bound her to the Underworld. Her descent brings winter; her return, spring.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'persephone_pomegranate',
			onFriendlyMinionDeath: { gainSeeds: 1, maxSeeds: 6 },
			seedSpend: { cost: 3, resurrectRandom: true },
			seedSpendAll: { cost: 6, resurrectAll: true, oncePerGame: true }
		},
		categories: ['greek_artifact']
	},
	{
		id: 29945,
		name: "Izanami's Mirror of Yomi",
		manaCost: 5,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'warlock',
		heroId: 'hero-izanami',
		attack: 1,
		description: 'Whenever a minion dies, deal 1 damage to the enemy hero. Immune on opponent\'s turn while you control no minions. Deathrattles trigger twice.',
		flavorText: 'The Yata no Kagami reflects not beauty, but the rotting truth of Yomi-no-kuni.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'izanami_mirror',
			onAnyMinionDeath: { damageEnemyHero: 1 },
			immuneWhileNoMinions: true,
			doubleDeathrattle: true
		},
		categories: ['shinto_artifact']
	},

	// ═══════════════════════════════════════════════════════════════
	// GREEK — ROOK (Warrior)
	// ═══════════════════════════════════════════════════════════════

	{
		id: 29946,
		name: 'Hammer of the Divine Forge',
		manaCost: 6,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'warrior',
		heroId: 'hero-hephaestus',
		attack: 2,
		description: 'After you play a minion, give it +1/+1. After you play a weapon, give it +1 durability. End of turn: if 2+ cards played, next card costs (2) less.',
		flavorText: 'Hephaestus forged thunderbolts for Zeus, armor for Achilles, and golden servants that think. What cannot this hammer make?',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'divine_forge_hammer',
			onMinionPlay: { buffAttack: 1, buffHealth: 1 },
			onWeaponPlay: { buffDurability: 1 },
			endOfTurn: { discountIfCardsPlayed: { threshold: 2, reduction: 2 } }
		},
		categories: ['greek_artifact']
	},

	// ═══════════════════════════════════════════════════════════════
	// GREEK — BISHOPS (Priest)
	// ═══════════════════════════════════════════════════════════════

	{
		id: 29947,
		name: 'Cestus of Aphrodite',
		manaCost: 5,
		type: 'artifact',
		rarity: 'mythic',
		heroClass: 'priest',
		heroId: 'hero-aphrodite',
		attack: 0,
		description: 'When you play a minion, a random enemy minion can\'t attack next turn (charmed). At 3+ minions: your hero takes -1 from all sources.',
		flavorText: 'Even Hera borrowed the Kestos to seduce Zeus. Its power makes the impossible irresistible.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'cestus_aphrodite',
			onMinionPlay: { charmRandomEnemy: true },
			damageReduction: { minionThreshold: 3, reduction: 1 }
		},
		categories: ['greek_artifact']
	},
	{
		id: 29948,
		name: "Hera's Royal Diadem",
		manaCost: 5,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'priest',
		heroId: 'hero-hera',
		attack: 0,
		description: 'Your minions have +1 Health. When opponent plays a minion costing more than any of yours, destroy it (once/turn). End of turn: heal hero 2.',
		flavorText: 'Queen of Olympus. Her diadem is sovereign authority made manifest. None may rise above her.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'hera_diadem',
			minionHealthBuff: 1,
			onOpponentPlayMinion: { destroyIfCostAbove: true, oncePerTurn: true },
			endOfTurn: { healHero: 2 }
		},
		categories: ['greek_artifact']
	},
	{
		id: 29949,
		name: "Eros's Golden Arrows",
		manaCost: 5,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'priest',
		heroId: 'hero-eros',
		attack: 1,
		description: 'After your hero attacks: Gold Arrow — take control of target until end of turn. Or Lead Arrow — return target to hand.',
		flavorText: 'Gold-tipped arrows cause love, lead-tipped cause flight. He struck Apollo with gold and Daphne with lead.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'eros_arrows',
			onHeroAttack: { chooseEffect: { gold: 'mind_control_temp', lead: 'bounce_to_hand' } }
		},
		categories: ['greek_artifact']
	},
	{
		id: 29950,
		name: "Hestia's Eternal Flame",
		manaCost: 4,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'priest',
		heroId: 'hero-hestia',
		attack: 0,
		description: 'End of turn: restore 3 Health to your hero. Your minions can\'t be targeted by enemy spells. At full Health: +2 Armor.',
		flavorText: 'She tends the sacred fire at Olympus\'s heart. Every hearth in every home is her altar.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'hestia_flame',
			endOfTurn: { healHero: 3 },
			minionSpellImmunity: true,
			fullHealthArmor: 2
		},
		categories: ['greek_artifact']
	},

	// ═══════════════════════════════════════════════════════════════
	// GREEK — BISHOP (Druid)
	// ═══════════════════════════════════════════════════════════════

	{
		id: 29951,
		name: "Demeter's Cornucopia",
		manaCost: 5,
		type: 'artifact',
		rarity: 'mythic',
		heroClass: 'druid',
		heroId: 'hero-demeter',
		attack: 0,
		description: 'Start of turn: add a random minion to your hand (costs 2 less). If your hand has 5+ cards, your minions have +1/+1.',
		flavorText: 'The Horn of Plenty. From it flows the bounty of the harvest — inexhaustible, eternal.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'demeter_cornucopia',
			startOfTurn: { addRandomMinion: true, minionCostReduction: 2 },
			handSizeBonus: { threshold: 5, minionBuff: { attack: 1, health: 1 } }
		},
		categories: ['greek_artifact']
	},

	// ═══════════════════════════════════════════════════════════════
	// GREEK — KNIGHTS (Rogue)
	// ═══════════════════════════════════════════════════════════════

	{
		id: 29952,
		name: "Hermes's Talaria",
		manaCost: 5,
		type: 'artifact',
		rarity: 'mythic',
		heroClass: 'rogue',
		heroId: 'hero-hermes',
		attack: 1,
		description: 'Your minions have Rush. After your hero attacks, gain Stealth until your next turn. Cards cost (1) less if played in alternating hand positions.',
		flavorText: 'The winged sandals carry the messenger between Olympus, Earth, and the Underworld faster than thought.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'hermes_talaria',
			passiveMinionRush: true,
			onHeroAttack: { grantStealth: true },
			alternatingHandDiscount: 1
		},
		categories: ['greek_artifact']
	},
	{
		id: 29953,
		name: "Nyx's Veil of Night",
		manaCost: 5,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'rogue',
		heroId: 'hero-nyx',
		attack: 0,
		description: 'Your minions have Stealth when played. End of turn: deal 2 damage to enemies that didn\'t attack. Hero can\'t be targeted by spells on opponent\'s turn.',
		flavorText: 'Even Zeus feared her. Night wraps the world in silence, and from that silence come Death, Sleep, and Dreams.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'nyx_veil',
			grantStealthOnPlay: true,
			endOfTurn: { damageInactiveEnemies: 2 },
			heroSpellImmunityOnOpponentTurn: true
		},
		categories: ['greek_artifact']
	},

	// ═══════════════════════════════════════════════════════════════
	// GREEK — KNIGHTS (Hunter)
	// ═══════════════════════════════════════════════════════════════

	{
		id: 29954,
		name: "Apollo's Golden Lyre",
		manaCost: 5,
		type: 'artifact',
		rarity: 'mythic',
		heroClass: 'hunter',
		heroId: 'hero-apollo',
		attack: 1,
		description: 'After spell: give all minions +1 Health. After minion play: deal 1 to a random enemy. End of turn: if both played, draw a card.',
		flavorText: 'Crafted by Hermes from a tortoise shell. Apollo\'s music moves mountains and calms seas.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'apollo_lyre',
			onSpellPlay: { buffAllMinionHealth: 1 },
			onMinionPlay: { damageRandomEnemy: 1 },
			endOfTurn: { drawIfBothTypesPlayed: true }
		},
		categories: ['greek_artifact']
	},
	{
		id: 29955,
		name: "Artemis's Silver Bow",
		manaCost: 7,
		type: 'artifact',
		rarity: 'mythic',
		heroClass: 'hunter',
		heroId: 'hero-artemis',
		attack: 3,
		description: 'Your hero can attack twice each turn. After killing a minion, deal 1 to enemy hero. Start of turn: destroy enemies with 1 Health.',
		flavorText: 'Argyrotoxa — Of the Silver Bow. Twin of Apollo. Her arrows bring swift, merciful death.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'artemis_silver_bow',
			doubleAttack: true,
			onHeroKill: { damageEnemyHero: 1 },
			startOfTurn: { destroyAtOneHealth: true }
		},
		categories: ['greek_artifact']
	},

	// ═══════════════════════════════════════════════════════════════
	// GREEK — ALT-SKINS
	// ═══════════════════════════════════════════════════════════════

	{
		id: 29956,
		name: "Selene's Lunar Crown",
		manaCost: 5,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'rogue',
		heroId: 'hero-selene',
		attack: 1,
		description: 'Your minions have Stealth when played. At end of each turn (both players\'), give a random friendly minion +1/+1.',
		flavorText: 'Wreathed in silver light, Selene visits Endymion in his eternal sleep. Her crown waxes and wanes but never dims.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'selene_crown',
			grantStealthOnPlay: true,
			bothTurnsEndOfTurn: { buffRandomMinion: { attack: 1, health: 1 } }
		},
		categories: ['greek_artifact']
	},
	{
		id: 29957,
		name: "Hecate's Twin Torches",
		manaCost: 6,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'warlock',
		heroId: 'hero-hecate',
		attack: 1,
		description: 'Your spells cost (1) less. After a spell: deal 1 to a random enemy. End of turn: if 2+ spells cast, summon a 2/2 Shade with Lifesteal.',
		flavorText: 'She stands at the crossroads, twin torches ablaze. The only Titan Zeus honored after the war.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'hecate_torches',
			spellCostReduction: 1,
			onSpellCast: { damageRandomEnemy: 1 },
			endOfTurn: { summonIfSpellThreshold: { threshold: 2, summon: { name: 'Shade', attack: 2, health: 2, keywords: ['lifesteal'] } } }
		},
		categories: ['greek_artifact']
	},
	{
		id: 29958,
		name: "Helios's Sun Chariot",
		manaCost: 5,
		type: 'artifact',
		rarity: 'mythic',
		heroClass: 'priest',
		heroId: 'hero-helios',
		attack: 0,
		description: 'End of turn: restore 2 Health to all friendly characters. Deal 1 damage to all enemies. +1 Armor per friendly minion alive.',
		flavorText: 'The golden quadriga blazes across the sky from east to west. Helios sees all — nothing escapes his gaze.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'helios_chariot',
			endOfTurn: { healAllFriendly: 2, damageAllEnemies: 1 },
			armorPerFriendlyMinion: 1
		},
		categories: ['greek_artifact']
	},

	// ═══════════════════════════════════════════════════════════════
	// JAPANESE / SHINTO
	// ═══════════════════════════════════════════════════════════════

	{
		id: 29959,
		name: "Tsukuyomi's Moon Blade",
		manaCost: 5,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'rogue',
		heroId: 'hero-tsukuyomi',
		attack: 2,
		description: 'After attacking: target can\'t attack or be healed next turn (Severed). If the target dies this turn, add a copy to your hand (costs 0).',
		flavorText: 'He slew Uke Mochi at a divine feast, and for this Amaterasu vowed never to face him again. Sun and moon are forever apart.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'tsukuyomi_blade',
			onHeroAttack: { applySevered: true },
			onTargetDeath: { addCopyToHand: true, copyCost: 0 }
		},
		categories: ['shinto_artifact']
	},
	{
		id: 29960,
		name: "Fujin's Wind Bag",
		manaCost: 5,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'mage',
		heroId: 'hero-fujin',
		attack: 1,
		description: 'Your spells deal +1 damage. After casting a spell, push a random enemy minion to the bottom of its owner\'s deck (once per turn).',
		flavorText: 'The kazebukuro holds every wind. His first breath filled the space between heaven and earth.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'fujin_wind_bag',
			spellDamageBonus: 1,
			onSpellCast: { shuffleEnemyMinion: true, oncePerTurn: true }
		},
		categories: ['shinto_artifact']
	},
	{
		id: 29961,
		name: 'Ama-no-Nuhoko',
		manaCost: 5,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'paladin',
		heroId: 'hero-sarutahiko',
		attack: 2,
		description: 'Your minions have +1 Health. After hero attacks: give all minions +1 Attack this turn. Once per game: fill board with 2/2 Islands.',
		flavorText: 'The Heavenly Jeweled Spear stirred the primordial ocean. The brine that dripped formed the first island of Japan.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'ama_no_nuhoko',
			minionHealthBuff: 1,
			onHeroAttack: { buffAllMinionAttack: 1, thisTurnOnly: true },
			oncePerGame: { fillBoard: { name: 'Island', attack: 2, health: 2 } }
		},
		categories: ['shinto_artifact']
	},
	{
		id: 29962,
		name: "Kamimusubi's Seed of Creation",
		manaCost: 4,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'shaman',
		heroId: 'hero-kamimusubi',
		attack: 0,
		description: 'Start of turn: if fewer minions than opponent, summon a 2/3 Kami. Your minions gain +0/+1 at end of each turn (permanent).',
		flavorText: 'One of the first three solitary kami. Kamimusubi is the generative force of the universe itself.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'kamimusubi_seed',
			startOfTurn: { summonIfFewerMinions: { name: 'Kami', attack: 2, health: 3 } },
			endOfTurn: { permanentHealthBuffAll: 1 }
		},
		categories: ['shinto_artifact']
	},

	// ═══════════════════════════════════════════════════════════════
	// EGYPTIAN
	// ═══════════════════════════════════════════════════════════════

	{
		id: 29963,
		name: "Ammit's Devouring Maw",
		manaCost: 6,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'warlock',
		heroId: 'hero-ammit',
		attack: 2,
		description: 'After hero kills a minion, gain its Attack as permanent hero Attack. Enemy minions that die are removed from game (can\'t be resurrected).',
		flavorText: 'Head of a crocodile, torso of a lion, haunches of a hippopotamus. She devours the hearts of the unworthy.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'ammit_maw',
			onHeroKill: { gainTargetAttack: true },
			enemyDeathExile: true
		},
		categories: ['egyptian_artifact']
	},
	{
		id: 29964,
		name: 'Feather of Maat',
		manaCost: 5,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'priest',
		heroId: 'hero-maat',
		attack: 0,
		description: 'End of turn: if hero Health within 3 of opponent, draw 2 and gain +3 Armor. Healing affects both heroes. Draw on imbalanced minion death.',
		flavorText: 'The Shu feather weighed against the hearts of the dead. Ma\'at is the foundation upon which all law rests.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'feather_of_maat',
			endOfTurn: { balanceReward: { healthDifference: 3, drawCards: 2, gainArmor: 3 } },
			healingAffectsBoth: true,
			onImbalancedMinionDeath: { drawCard: true }
		},
		categories: ['egyptian_artifact']
	},
	{
		id: 29965,
		name: "Serqet's Venomous Tail",
		manaCost: 6,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'rogue',
		heroId: 'hero-serqet',
		attack: 2,
		description: 'After hero attacks: apply Poison to target (dies end of next turn unless healed to full). Your hero is Immune to Poison.',
		flavorText: 'The scorpion goddess protects against venom — and wields it. She bound the serpent Apophis in chains of pain.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'serqet_tail',
			onHeroAttack: { applyPoison: true },
			heroImmuneToPoison: true
		},
		categories: ['egyptian_artifact']
	},
	{
		id: 29966,
		name: "Khepri's Sacred Scarab",
		manaCost: 5,
		type: 'artifact',
		rarity: 'epic',
		heroClass: 'berserker',
		heroId: 'hero-khepri',
		attack: 1,
		description: 'When a friendly minion dies, gain +1 resurrection charge. At 3: summon a copy of the strongest dead minion (resets). +1 Armor at start of turn.',
		flavorText: 'Khepri pushes the newborn sun into the sky each dawn. From death, he creates life anew.',
		keywords: ['artifact'],
		collectible: true,
		artifactEffect: {
			type: 'khepri_scarab',
			onFriendlyMinionDeath: { gainResurrectionCharge: 1 },
			resurrectionThreshold: { charges: 3, summonStrongest: true },
			startOfTurn: { gainArmor: 1 }
		},
		categories: ['egyptian_artifact']
	},
];

export default norseArtifacts;
