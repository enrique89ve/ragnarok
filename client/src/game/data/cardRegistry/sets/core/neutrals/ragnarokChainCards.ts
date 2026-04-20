/**
 * Ragnarok Chain Cards
 *
 * Paired cards with linked destiny. When one dies or triggers,
 * the other transforms or activates. Both players can see the chain links.
 *
 * ID Range: 30401-30410
 */
import { CardData } from '../../../../../types';

export const ragnarokChainCards: CardData[] = [
	// === Pair 1: Fenrir & Gleipnir ===
	{
		id: 30401,
		name: 'Gleipnir-Bound Beast',
		manaCost: 5,
		description: 'Chain: When Gleipnir dies, gain +5/+5 and Rush.',
		flavorText: 'The great wolf strains against his bonds, waiting for the moment of release.',
		type: 'minion',
		rarity: 'rare',
		class: 'Neutral',
		attack: 4,
		health: 5,
		keywords: [],
		chainPartner: 30402,
		chainEffect: {
			onPartnerDeath: { type: 'buff_self', value: 5, keywords: ['rush'] }
		},
		set: 'core',
		collectible: true
	},
	{
		id: 30402,
		name: 'Gleipnir, the Silk Chain',
		manaCost: 2,
		description: 'Chain: While alive, Fenrir cannot gain Rush. Taunt.',
		flavorText: 'Forged from impossible things: the sound of a cat, the roots of a mountain.',
		type: 'minion',
		rarity: 'rare',
		class: 'Neutral',
		attack: 0,
		health: 6,
		keywords: ['taunt'],
		chainPartner: 30401,
		chainEffect: {},
		set: 'core',
		collectible: true
	},

	// === Pair 2: Skoll & Hati ===
	{
		id: 30403,
		name: 'Sun-Chaser Wolf',
		manaCost: 4,
		description: 'Battlecry: If Hati is in your hand, give it +1/+1. Chain: When Hati dies, gain +3/+3 and Windfury.',
		flavorText: 'One wolf chases the moon, the other the sun. Together, they end the world.',
		type: 'minion',
		rarity: 'common',
		class: 'Neutral',
		attack: 3,
		health: 4,
		keywords: ['battlecry'],
		chainPartner: 30404,
		chainEffect: {
			onPartnerDeath: { type: 'buff_self', value: 3, keywords: ['windfury'] }
		},
		set: 'core',
		collectible: true
	},
	{
		id: 30404,
		name: 'Moon-Chaser Wolf',
		manaCost: 4,
		description: 'Battlecry: If Skoll is in your hand, give it +1/+1. Chain: When Skoll dies, gain +3/+3 and Windfury.',
		flavorText: 'The sun flees. The wolf gains. At Ragnarok, the chase ends.',
		type: 'minion',
		rarity: 'common',
		class: 'Neutral',
		attack: 4,
		health: 3,
		keywords: ['battlecry'],
		chainPartner: 30403,
		chainEffect: {
			onPartnerDeath: { type: 'buff_self', value: 3, keywords: ['windfury'] }
		},
		set: 'core',
		collectible: true
	},

	// === Pair 3: Huginn & Muninn ===
	{
		id: 30405,
		name: 'Thought-Raven',
		manaCost: 2,
		description: 'Chain: When both are in play, both gain +2/+2. When Muninn dies, draw 2.',
		flavorText: 'Thought flies faster than memory, but neither flies alone.',
		type: 'minion',
		rarity: 'common',
		class: 'Neutral',
		attack: 2,
		health: 1,
		race: 'Beast',
		keywords: [],
		chainPartner: 30406,
		chainEffect: {
			onBothInPlay: { type: 'buff_self', value: 2 },
			onPartnerDeath: { type: 'draw', value: 2 }
		},
		set: 'core',
		collectible: true
	},
	{
		id: 30406,
		name: 'Memory-Raven',
		manaCost: 2,
		description: 'Chain: When both are in play, both gain +2/+2. When Huginn dies, draw 2.',
		flavorText: 'Memory lingers where thought has gone, piecing together what was lost.',
		type: 'minion',
		rarity: 'common',
		class: 'Neutral',
		attack: 1,
		health: 2,
		race: 'Beast',
		keywords: [],
		chainPartner: 30405,
		chainEffect: {
			onBothInPlay: { type: 'buff_self', value: 2 },
			onPartnerDeath: { type: 'draw', value: 2 }
		},
		set: 'core',
		collectible: true
	},

	// === Pair 4: Nidhogg & Ratatoskr ===
	{
		id: 30407,
		name: 'Root-Gnawer Drake',
		manaCost: 6,
		description: 'Chain: While Ratatoskr is in play, gain +3 Attack. Deathrattle: Transform Ratatoskr into a 6/6.',
		flavorText: 'The serpent gnaws the roots of Yggdrasil, hastening the end of all things.',
		type: 'minion',
		rarity: 'rare',
		class: 'Neutral',
		attack: 5,
		health: 5,
		race: 'Dragon',
		keywords: [],
		chainPartner: 30408,
		chainEffect: {
			onPartnerPlay: { type: 'buff_self', value: 3 }
		},
		set: 'core',
		collectible: true
	},
	{
		id: 30408,
		name: 'Ratatoskr, the Messenger',
		manaCost: 1,
		description: 'Chain: When Nidhogg dies, transform into a 6/6.',
		flavorText: 'The squirrel runs up and down Yggdrasil, carrying insults between eagle and serpent.',
		type: 'minion',
		rarity: 'common',
		class: 'Neutral',
		attack: 1,
		health: 2,
		race: 'Beast',
		keywords: [],
		chainPartner: 30407,
		chainEffect: {
			onPartnerDeath: { type: 'transform_self', value: 6 }
		},
		set: 'core',
		collectible: true
	},

	// === Pair 5: Ask & Embla ===
	{
		id: 30409,
		name: 'Ask',
		manaCost: 3,
		description: 'Battlecry: If Embla is in your hand, draw a card. Chain: When both are in play, both gain Divine Shield. When Embla dies, gain Taunt and +2 Health.',
		flavorText: 'The first man, carved from an ash tree by the gods themselves.',
		type: 'minion',
		rarity: 'common',
		class: 'Neutral',
		attack: 3,
		health: 3,
		keywords: ['battlecry'],
		chainPartner: 30410,
		chainEffect: {
			onBothInPlay: { type: 'grant_divine_shield', value: 0 },
			onPartnerDeath: { type: 'gain_taunt_and_health', value: 2 }
		},
		set: 'core',
		collectible: true
	},
	{
		id: 30410,
		name: 'Embla',
		manaCost: 3,
		description: 'Battlecry: If Ask is in your hand, draw a card. Chain: When both are in play, both gain Divine Shield. When Ask dies, gain Taunt and +2 Health.',
		flavorText: 'The first woman, shaped from an elm tree. Life breathed into wood.',
		type: 'minion',
		rarity: 'common',
		class: 'Neutral',
		attack: 3,
		health: 3,
		keywords: ['battlecry'],
		chainPartner: 30409,
		chainEffect: {
			onBothInPlay: { type: 'grant_divine_shield', value: 0 },
			onPartnerDeath: { type: 'gain_taunt_and_health', value: 2 }
		},
		set: 'core',
		collectible: true
	}
];
