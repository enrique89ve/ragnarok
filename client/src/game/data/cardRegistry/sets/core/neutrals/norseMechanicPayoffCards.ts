import { CardData } from '../../../../../types';

/**
 * Norse Mechanic Payoff Cards
 *
 * Dedicated synergy payoffs for the four Norse-exclusive mechanics:
 * Blood Price, Prophecy, Realm Shift, and Einherjar.
 * Each card is class-connected and rewards committing to the mechanic.
 *
 * ID Range: 31906-31930
 */

// ============================================
// BLOOD PRICE PAYOFFS (31906-31909)
// Reward paying health for cards
// ============================================

export const bloodPricePayoffCards: CardData[] = [
	{
		id: 31906,
		name: 'Geirskögul, Spear-Shaker',
		manaCost: 2,
		attack: 2,
		health: 3,
		description: 'Whenever you pay Blood Price, gain +1 Attack permanently.',
		flavorText: 'Named in the Völuspá among the Valkyries who ride to claim the battle-slain. Each wound fed to her sharpens her spear.',
		type: 'minion',
		rarity: 'common',
		class: 'Warlock',
		set: 'core',
		collectible: true
	},
	{
		id: 31907,
		name: 'Grimnir, the Hooded One',
		manaCost: 5,
		attack: 4,
		health: 6,
		description: 'Battlecry: For each Blood Price card you played this game, deal 1 damage to all enemies.',
		flavorText: 'Odin took many names. This one he wore when demanding blood.',
		type: 'minion',
		rarity: 'epic',
		class: 'Neutral',
		keywords: ['battlecry'],
		battlecry: {
			type: 'blood_price_count_aoe',
			targetType: 'all_enemies',
			requiresTarget: false
		},
		set: 'core',
		collectible: true
	},
	{
		id: 31908,
		name: 'Blóðrún',
		manaCost: 1,
		description: 'Your next Blood Price card costs 0 mana. Draw a card.',
		flavorText: 'The blood-rune — blóðrún in the old tongue. Odin learned it hanging from Yggdrasil, and it has demanded blood ever since.',
		type: 'spell',
		rarity: 'common',
		class: 'Mage',
		spellEffect: {
			type: 'blood_price_discount',
			value: 99,
			targetType: 'none',
			bonusEffect: {
				type: 'draw',
				value: 1
			}
		},
		set: 'core',
		collectible: true
	},
	{
		id: 31909,
		name: 'Vithar, the Silent God',
		manaCost: 4,
		attack: 3,
		health: 5,
		description: 'Whenever you pay Blood Price, restore that much Health to your hero.',
		flavorText: 'He speaks no word, but his silence heals what sacrifice has torn.',
		type: 'minion',
		rarity: 'rare',
		class: 'Priest',
		set: 'core',
		collectible: true
	},
];

// ============================================
// PROPHECY PAYOFFS (31910-31913)
// Reward playing and resolving Prophecies
// ============================================

export const prophecyPayoffCards: CardData[] = [
	{
		id: 31910,
		name: 'Skuld, Norn of the Future',
		manaCost: 4,
		attack: 3,
		health: 5,
		description: 'Your Prophecies tick down 1 extra turn at end of turn.',
		flavorText: 'What Urd remembers and Verdandi witnesses, Skuld hastens into being.',
		type: 'minion',
		rarity: 'epic',
		class: 'Neutral',
		set: 'core',
		collectible: true
	},
	{
		id: 31911,
		name: "Gróa's Vision",
		manaCost: 3,
		attack: 2,
		health: 4,
		description: 'Whenever a Prophecy resolves, draw 2 cards.',
		flavorText: 'The seeress Gróa chanted galdrar over her son Svipdag, granting him foresight. Her visions echo still when prophecy comes to pass.',
		type: 'minion',
		rarity: 'rare',
		class: 'Warlock',
		set: 'core',
		collectible: true
	},
	{
		id: 31912,
		name: 'Verdandi\'s Anchor',
		manaCost: 2,
		attack: 1,
		health: 4,
		description: 'Taunt. Gains +1/+1 each time a Prophecy countdown ticks.',
		flavorText: 'The present moment solidifies around her, unyielding as stone.',
		type: 'minion',
		rarity: 'common',
		class: 'Warrior',
		keywords: ['taunt'],
		set: 'core',
		collectible: true
	},
	{
		id: 31913,
		name: 'Echoes of Urd',
		manaCost: 3,
		description: 'Copy a friendly Prophecy and create it with the same remaining countdown.',
		flavorText: 'What has been fated once can be fated again.',
		type: 'spell',
		rarity: 'rare',
		class: 'Shaman',
		spellEffect: {
			type: 'copy_prophecy',
			targetType: 'friendly_prophecy',
			requiresTarget: true
		},
		set: 'core',
		collectible: true
	},
];

// ============================================
// REALM SHIFT PAYOFFS (31914-31917)
// Reward changing the active realm
// ============================================

export const realmShiftPayoffCards: CardData[] = [
	{
		id: 31914,
		name: "Veðrfölnir's Flight",
		manaCost: 3,
		attack: 2,
		health: 4,
		description: 'Gains +2/+1 whenever the active realm changes. Cannot be frozen.',
		flavorText: 'The hawk Veðrfölnir perches atop the eagle atop Yggdrasil, surveying all Nine Realms. No realm-shift escapes his gaze.',
		type: 'minion',
		rarity: 'common',
		class: 'Shaman',
		set: 'core',
		collectible: true
	},
	{
		id: 31915,
		name: 'Ratatoskr, Realm-Runner',
		manaCost: 4,
		attack: 3,
		health: 3,
		description: 'Battlecry: Foresee a Realm Shift spell from any class. It costs (0).',
		flavorText: 'Up and down the World Tree he scurries, carrying insults between realms.',
		type: 'minion',
		rarity: 'epic',
		class: 'Neutral',
		keywords: ['battlecry'],
		battlecry: {
			type: 'discover',
			filter: 'realm_shift',
			costReduction: 99,
			requiresTarget: false,
			targetType: 'none'
		},
		set: 'core',
		collectible: true
	},
	{
		id: 31916,
		name: 'Realm-Torn Veil',
		manaCost: 2,
		description: 'Deal 3 damage. If a realm is active, deal 5 instead.',
		flavorText: 'Where the realms overlap, reality frays — and frayed reality cuts.',
		type: 'spell',
		rarity: 'common',
		class: 'Mage',
		spellEffect: {
			type: 'conditional_damage',
			value: 3,
			condition: 'realm_active',
			bonusValue: 5,
			targetType: 'any',
			requiresTarget: true
		},
		set: 'core',
		collectible: true
	},
	{
		id: 31917,
		name: 'Gullintanni, Bifrost Sentinel',
		manaCost: 6,
		attack: 4,
		health: 7,
		description: 'Taunt. Battlecry: If you shifted realms twice this game, gain +3/+3 and Divine Shield.',
		flavorText: 'The golden-toothed guardian watches every crossing between worlds.',
		type: 'minion',
		rarity: 'epic',
		class: 'Paladin',
		keywords: ['taunt', 'battlecry'],
		battlecry: {
			type: 'conditional_buff',
			condition: 'realm_shifts_2',
			buffAttack: 3,
			buffHealth: 3,
			grantKeywords: ['divine_shield']
		},
		set: 'core',
		collectible: true
	},
];

// ============================================
// EINHERJAR PAYOFFS (31918-31921)
// Reward Einherjar dying and returning
// ============================================

export const einherjarPayoffCards: CardData[] = [
	{
		id: 31918,
		name: 'Valkyrja, Chooser of the Slain',
		manaCost: 3,
		attack: 3,
		health: 3,
		description: 'Whenever an Einherjar returns to your deck, summon a 1/1 Valkyrie with Rush.',
		flavorText: 'Each fallen warrior she claims feeds the endless cycle of war.',
		type: 'minion',
		rarity: 'common',
		class: 'Warrior',
		set: 'core',
		collectible: true
	},
	{
		id: 31919,
		name: 'Gjallarhorn',
		manaCost: 2,
		description: 'Give an Einherjar +2/+2 and "Deathrattle: Draw a card."',
		flavorText: 'Its blast carries across all Nine Realms, heralding glory.',
		type: 'spell',
		rarity: 'common',
		class: 'Paladin',
		spellEffect: {
			type: 'buff',
			buffAttack: 2,
			buffHealth: 2,
			targetType: 'friendly_einherjar',
			requiresTarget: true,
			grantDeathrattle: {
				type: 'draw',
				value: 1
			}
		},
		set: 'core',
		collectible: true
	},
	{
		id: 31920,
		name: 'Herjan, Lord of Hosts',
		manaCost: 7,
		attack: 5,
		health: 7,
		description: 'Battlecry: All Einherjar in your deck gain +2/+2. Your Einherjar have Rush.',
		flavorText: 'Another of Odin\'s war-names. Under Herjan, the Einherjar march as one.',
		type: 'minion',
		rarity: 'epic',
		class: 'Neutral',
		keywords: ['battlecry'],
		battlecry: {
			type: 'buff_einherjar_in_deck',
			buffAttack: 2,
			buffHealth: 2,
			grantKeywords: ['rush'],
			requiresTarget: false
		},
		set: 'core',
		collectible: true
	},
	{
		id: 31921,
		name: 'Feast of the Fallen',
		manaCost: 4,
		description: 'Restore 3 Health for each Einherjar that died this game. Draw a card.',
		flavorText: 'In Valhalla, the slain feast each night and rise again at dawn.',
		type: 'spell',
		rarity: 'rare',
		class: 'Priest',
		spellEffect: {
			type: 'einherjar_count_heal',
			healPerEinherjar: 3,
			targetType: 'friendly_hero',
			bonusEffect: {
				type: 'draw',
				value: 1
			}
		},
		set: 'core',
		collectible: true
	},
];

// ============================================
// SACRIFICE CARDS (31923)
// Mythic minions requiring minion sacrifice to play
// ============================================

export const sacrificeCards: CardData[] = [
	{
		id: 31923,
		name: 'Behemoth',
		manaCost: 0,
		attack: 9,
		health: 14,
		description: 'Sacrifice 2 active friendly minions to play. Battlecry: Destroy all other minions. For each destroyed, gain +2/+2. Your opponent discards their highest cost card.',
		flavorText: 'In the Ginnungagap before creation, formless things stirred in the void between fire and ice. Some say Ymir was the first to wake. Some say there was something before even Ymir — something that never stopped growing.',
		type: 'minion',
		rarity: 'mythic',
		class: 'Neutral',
		race: 'Beast',
		keywords: ['taunt', 'battlecry'],
		sacrificeCost: 2,
		battlecry: {
			type: 'sacrifice_and_devastate',
			targetType: 'all',
			requiresTarget: false
		},
		set: 'core',
		collectible: true
	},
];

// ============================================
// TECH CARDS (31922)
// Neutral utility / removal tech
// ============================================

export const norseTechCards: CardData[] = [
	{
		id: 31922,
		name: 'Eitri, Forge-Breaker',
		manaCost: 3,
		attack: 3,
		health: 3,
		description: "Battlecry: Destroy your opponent's weapon or artifact. He who forged them knows every flaw.",
		flavorText: 'From Mjolnir to Gungnir to Draupnir — Eitri shaped them all in his forge. He knows where every seam will crack.',
		type: 'minion',
		rarity: 'rare',
		class: 'Neutral',
		keywords: ['battlecry'],
		battlecry: {
			type: 'destroy_weapon_or_artifact',
			targetType: 'enemy',
			requiresTarget: false
		},
		set: 'core',
		collectible: true
	},
];

// ============================================
// BLOOD ECHO CARDS (31940-31942)
// When a Blood Price card dies, add a 0-cost copy
// to your hand that also costs blood.
// ============================================

export const bloodEchoCards: CardData[] = [
	{
		id: 31940,
		name: 'Bloodhowl Berserker',
		manaCost: 3,
		attack: 4,
		health: 3,
		description: 'Blood Echo: When this dies, add a 0-cost copy to your hand that also costs 3 Health to play.',
		flavorText: 'His death scream echoes through the mead hall. Then he screams again.',
		type: 'minion',
		rarity: 'rare',
		class: 'Neutral',
		keywords: ['blood_echo'],
		bloodPrice: 3,
		set: 'core',
		collectible: true
	},
	{
		id: 31941,
		name: 'Crimson Valkyrie',
		manaCost: 5,
		attack: 5,
		health: 4,
		description: 'Blood Echo. Divine Shield. When this dies, add a 0-cost copy to your hand that costs 5 Health to play.',
		flavorText: 'She chooses the slain — and sometimes, she chooses herself.',
		type: 'minion',
		rarity: 'epic',
		class: 'Neutral',
		keywords: ['blood_echo', 'divine_shield'],
		bloodPrice: 5,
		set: 'core',
		collectible: true
	},
	{
		id: 31942,
		name: 'Sanguine Pact',
		manaCost: 2,
		description: 'Give a friendly minion Blood Echo. It gains +2/+1.',
		flavorText: 'The pact is sealed in blood. Yours.',
		type: 'spell',
		rarity: 'rare',
		class: 'Neutral',
		spellEffect: { type: 'grant_blood_echo', buffAttack: 2, buffHealth: 1, targetType: 'friendly_minion' },
		set: 'core',
		collectible: true
	},
];

// ============================================
// RAGNAROK THRESHOLD CARDS (31943-31945)
// If your hero has 30 HP or below, gain X.
// ============================================

export const ragnarokThresholdCards: CardData[] = [
	{
		id: 31943,
		name: 'Twilight Sentinel',
		manaCost: 2,
		attack: 2,
		health: 3,
		description: 'Ragnarok Threshold: If your hero has 30 HP or below, gain +2/+2.',
		flavorText: 'When the world dims, the sentinels grow stronger.',
		type: 'minion',
		rarity: 'common',
		class: 'Neutral',
		keywords: ['battlecry'],
		battlecry: { type: 'conditional_buff_self', condition: 'hero_hp_30_or_below', buffAttack: 2, buffHealth: 2 },
		set: 'core',
		collectible: true
	},
	{
		id: 31944,
		name: 'Ragnarok Herald',
		manaCost: 4,
		attack: 3,
		health: 5,
		description: 'Ragnarok Threshold: If your hero has 30 HP or below, deal 3 damage to all enemy minions.',
		flavorText: 'He sounds the horn only when the end has already begun.',
		type: 'minion',
		rarity: 'rare',
		class: 'Neutral',
		keywords: ['battlecry'],
		battlecry: { type: 'conditional_aoe', condition: 'hero_hp_30_or_below', damage: 3, targetType: 'all_enemy_minions' },
		set: 'core',
		collectible: true
	},
	{
		id: 31945,
		name: 'Surtr\'s Ember',
		manaCost: 6,
		attack: 4,
		health: 7,
		description: 'Taunt. Ragnarok Threshold: If your hero has 30 HP or below, gain +4 Attack and Rush.',
		flavorText: 'The flame giant stirs when the world tree begins to smolder.',
		type: 'minion',
		rarity: 'epic',
		class: 'Neutral',
		keywords: ['taunt', 'battlecry'],
		battlecry: { type: 'conditional_buff_self', condition: 'hero_hp_30_or_below', buffAttack: 4, grantKeywords: ['rush'] },
		set: 'core',
		collectible: true
	},
];

// ============================================
// FATEWEAVE CARDS (31946-31948)
// While a Prophecy is ticking down, your spells
// cost (1) less.
// ============================================

export const fateweaveCards: CardData[] = [
	{
		id: 31946,
		name: 'Norn\'s Loom',
		manaCost: 3,
		attack: 2,
		health: 4,
		description: 'Fateweave: While you have an active Prophecy, your spells cost (1) less.',
		flavorText: 'The Norns weave fate at the foot of Yggdrasil. Every thread matters.',
		type: 'minion',
		rarity: 'rare',
		class: 'Neutral',
		keywords: ['fateweave'],
		set: 'core',
		collectible: true
	},
	{
		id: 31947,
		name: 'Thread of Skuld',
		manaCost: 4,
		attack: 3,
		health: 5,
		description: 'Fateweave: While you have an active Prophecy, this has +3 Attack.',
		flavorText: 'Skuld holds the thread of what will be. She does not let go easily.',
		type: 'minion',
		rarity: 'rare',
		class: 'Neutral',
		keywords: ['fateweave'],
		set: 'core',
		collectible: true
	},
	{
		id: 31948,
		name: 'Wyrd Unraveling',
		manaCost: 3,
		description: 'Deal 2 damage to all enemies. Fateweave: If you have an active Prophecy, deal 4 instead.',
		flavorText: 'When fate unravels, nothing is spared.',
		type: 'spell',
		rarity: 'epic',
		class: 'Neutral',
		spellEffect: { type: 'conditional_aoe', baseValue: 2, fateweaveValue: 4, targetType: 'all_enemies' },
		set: 'core',
		collectible: true
	},
];

// ============================================
// YGGDRASIL'S GIFT CARDS (31949-31951)
// For each unique realm visited this game,
// gain +1/+1.
// ============================================

export const yggdrasilGiftCards: CardData[] = [
	{
		id: 31949,
		name: 'Realm-Walker Scout',
		manaCost: 2,
		attack: 1,
		health: 2,
		description: 'Battlecry: Gain +1/+1 for each unique realm visited this game.',
		flavorText: 'He has walked every branch of the World Tree.',
		type: 'minion',
		rarity: 'common',
		class: 'Neutral',
		keywords: ['battlecry'],
		battlecry: { type: 'buff_per_realm', buffAttack: 1, buffHealth: 1 },
		set: 'core',
		collectible: true
	},
	{
		id: 31950,
		name: 'Bifrost Wanderer',
		manaCost: 5,
		attack: 3,
		health: 4,
		description: 'Battlecry: Gain +1/+1 for each unique realm visited this game. If 3+, also gain Divine Shield.',
		flavorText: 'The rainbow bridge remembers every traveler.',
		type: 'minion',
		rarity: 'epic',
		class: 'Neutral',
		keywords: ['battlecry'],
		battlecry: { type: 'buff_per_realm', buffAttack: 1, buffHealth: 1, bonusThreshold: 3, bonusKeyword: 'divine_shield' },
		set: 'core',
		collectible: true
	},
	{
		id: 31951,
		name: 'Yggdrasil\'s Blessing',
		manaCost: 4,
		description: 'Give all friendly minions +1/+1 for each unique realm visited this game.',
		flavorText: 'The World Tree blesses those who walk between its branches.',
		type: 'spell',
		rarity: 'epic',
		class: 'Neutral',
		spellEffect: { type: 'buff_per_realm_aoe', buffAttack: 1, buffHealth: 1, targetType: 'all_friendly_minions' },
		set: 'core',
		collectible: true
	},
];

// ============================================
// VALHALLA'S CALL CARDS (31952-31954)
// Einherjar that have died 3 times trigger a
// one-time event.
// ============================================

export const valhallasCallCards: CardData[] = [
	{
		id: 31952,
		name: 'Oathsworn of Valhalla',
		manaCost: 3,
		attack: 2,
		health: 4,
		description: 'Einherjar. Valhalla\'s Call: After this has died and returned 3 times, summon a 5/5 Valkyrie with Taunt.',
		flavorText: 'Three deaths. Three rebirths. On the fourth return, Valhalla opens its gates.',
		type: 'minion',
		rarity: 'rare',
		class: 'Neutral',
		keywords: ['einherjar'],
		set: 'core',
		collectible: true
	},
	{
		id: 31953,
		name: 'Eternal Shieldbearer',
		manaCost: 4,
		attack: 3,
		health: 5,
		description: 'Taunt. Einherjar. Valhalla\'s Call: After this has died and returned 3 times, give all friendly minions +2/+2.',
		flavorText: 'Each return forges his shield stronger. The last return forges his brothers.',
		type: 'minion',
		rarity: 'epic',
		class: 'Neutral',
		keywords: ['einherjar', 'taunt'],
		set: 'core',
		collectible: true
	},
	{
		id: 31954,
		name: 'Horn of Valhalla',
		manaCost: 3,
		description: 'Give a friendly Einherjar "Valhalla\'s Call: After dying 3 times, summon a 5/5 Valkyrie with Taunt."',
		flavorText: 'The horn sounds. The fallen rise. Again, and again, and one last time.',
		type: 'spell',
		rarity: 'rare',
		class: 'Neutral',
		spellEffect: { type: 'grant_valhalla_call', targetType: 'friendly_einherjar' },
		set: 'core',
		collectible: true
	},
];

// ============================================
// ACTIVE WAGER CARDS (31955-31957)
// Active wager effects instead of passive
// poker buffs.
// ============================================

export const activeWagerCards: CardData[] = [
	{
		id: 31955,
		name: 'Burning Stakes',
		manaCost: 3,
		attack: 3,
		health: 3,
		description: 'Wager: At the start of each betting round, deal 1 damage to the enemy hero.',
		flavorText: 'Every round the table gets hotter. Some players catch fire.',
		type: 'minion',
		rarity: 'common',
		class: 'Neutral',
		keywords: ['wager'],
		wagerEffect: { type: 'betting_round_damage', value: 1 },
		set: 'core',
		collectible: true
	},
	{
		id: 31956,
		name: 'Mimir\'s Gambit',
		manaCost: 5,
		attack: 3,
		health: 6,
		description: 'Wager: Your fold penalty is converted to healing instead of damage.',
		flavorText: 'Mimir lost his head and gained all wisdom. Some losses are wins.',
		type: 'minion',
		rarity: 'rare',
		class: 'Neutral',
		keywords: ['wager'],
		wagerEffect: { type: 'fold_penalty_to_healing' },
		set: 'core',
		collectible: true
	},
	{
		id: 31957,
		name: 'Nidhogg\'s Ante',
		manaCost: 7,
		attack: 5,
		health: 7,
		description: 'Taunt. Wager: Whenever you win a showdown, draw a card and deal 2 damage to the enemy hero.',
		flavorText: 'The serpent bets with the roots of worlds. It always collects.',
		type: 'minion',
		rarity: 'epic',
		class: 'Neutral',
		keywords: ['taunt', 'wager'],
		wagerEffect: { type: 'showdown_win_draw_and_damage', drawCount: 1, damage: 2 },
		set: 'core',
		collectible: true
	},
];

// Combined export
export const norseMechanicPayoffCards: CardData[] = [
	...bloodPricePayoffCards,
	...prophecyPayoffCards,
	...realmShiftPayoffCards,
	...einherjarPayoffCards,
	...norseTechCards,
	...sacrificeCards,
	...bloodEchoCards,
	...ragnarokThresholdCards,
	...fateweaveCards,
	...yggdrasilGiftCards,
	...valhallasCallCards,
	...activeWagerCards
];
