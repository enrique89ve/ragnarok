export interface KeywordDefinition {
	name: string;
	description: string;
	icon: string;
}

export const KEYWORD_DEFINITIONS: Record<string, KeywordDefinition> = {
	taunt: {
		name: 'Taunt',
		description: 'Enemies must attack this minion before others.',
		icon: 'shield',
	},
	charge: {
		name: 'Charge',
		description: 'Can attack immediately when played.',
		icon: 'zap',
	},
	rush: {
		name: 'Rush',
		description: 'Can attack minions immediately, but not the hero.',
		icon: 'move',
	},
	divine_shield: {
		name: 'Divine Shield',
		description: 'Absorbs the first hit of damage dealt to this minion.',
		icon: 'circle',
	},
	windfury: {
		name: 'Windfury',
		description: 'Can attack twice each turn.',
		icon: 'wind',
	},
	lifesteal: {
		name: 'Lifesteal',
		description: 'Damage dealt by this minion heals your hero.',
		icon: 'heart',
	},
	poisonous: {
		name: 'Poisonous',
		description: 'Destroys any minion damaged by this.',
		icon: 'skull',
	},
	stealth: {
		name: 'Stealth',
		description: 'Cannot be targeted until it attacks.',
		icon: 'eye-off',
	},
	freeze: {
		name: 'Freeze',
		description: 'Frozen characters cannot attack next turn.',
		icon: 'snowflake',
	},
	silence: {
		name: 'Silence',
		description: 'Removes all card text and enchantments.',
		icon: 'volume-x',
	},
	battlecry: {
		name: 'Battlecry',
		description: 'Triggers when played from your hand.',
		icon: 'sword',
	},
	deathrattle: {
		name: 'Deathrattle',
		description: 'Triggers when this minion dies.',
		icon: 'x-circle',
	},
	spell_damage: {
		name: 'Spell Damage',
		description: 'Your spell cards deal extra damage.',
		icon: 'flame',
	},
	overload: {
		name: 'Overload',
		description: 'Locks some mana crystals next turn.',
		icon: 'lock',
	},
	reborn: {
		name: 'Reborn',
		description: 'Returns to life with 1 Health the first time it dies.',
		icon: 'refresh-cw',
	},
	elusive: {
		name: 'Elusive',
		description: 'Cannot be targeted by spells or hero powers.',
		icon: 'shield-off',
	},
	inspire: {
		name: 'Inspire',
		description: 'Triggers when you use your Hero Power.',
		icon: 'star',
	},
	combo: {
		name: 'Combo',
		description: 'Bonus effect if you played another card first this turn.',
		icon: 'layers',
	},
	discover: {
		name: "V\u00f6lva's Vision",
		description: 'The V\u00f6lva reveals three fates \u2014 choose one card to add to your hand.',
		icon: 'search',
	},
	adapt: {
		name: 'Adapt',
		description: 'Choose one of three bonuses for this minion.',
		icon: 'plus-circle',
	},
	echo: {
		name: 'Echo',
		description: 'Can be played again this turn (cost remains the same).',
		icon: 'copy',
	},
	magnetic: {
		name: 'Runic Bond',
		description: 'Can attach to a friendly Automaton to combine stats and abilities.',
		icon: 'link',
	},
	overkill: {
		name: 'Overkill',
		description: 'Triggers when dealing excess lethal damage.',
		icon: 'target',
	},
	frenzy: {
		name: 'Frenzy',
		description: 'Triggers the first time this minion survives damage.',
		icon: 'alert-triangle',
	},
	corrupt: {
		name: 'Corrupt',
		description: 'Upgrades in hand when you play a higher-cost card.',
		icon: 'trending-up',
	},
	dormant: {
		name: 'Dormant',
		description: 'Spends turns asleep before awakening.',
		icon: 'moon',
	},
	immune: {
		name: 'Immune',
		description: 'Cannot be damaged or targeted.',
		icon: 'shield',
	},
	mega_windfury: {
		name: 'Mega-Windfury',
		description: 'Can attack four times each turn.',
		icon: 'wind',
	},
	colossal: {
		name: 'Colossal',
		description: 'Summons additional appendage minions when played.',
		icon: 'maximize',
	},
	yggdrasil_golem: {
		name: 'Yggdrasil Golem',
		description: 'Summons an Yggdrasil Golem that grows stronger with each one summoned this game.',
		icon: 'tree-pine',
	},
	einherjar: {
		name: 'Einherjar',
		description: 'When this dies, shuffle a copy into your deck with +1/+1. Max 3 returns.',
		icon: 'repeat',
	},
	blood_price: {
		name: 'Blood Price',
		description: 'Can be played by paying health instead of mana. Right-click to toggle.',
		icon: 'droplet',
	},
	prophecy: {
		name: 'Prophecy',
		description: 'Creates a visible countdown. When it reaches 0, the effect triggers.',
		icon: 'clock',
	},
	secret: {
		name: 'Rune',
		description: 'A hidden enchantment that triggers when a specific condition is met.',
		icon: 'help-circle',
	},
	pet_evolution: {
		name: 'Pet Evolution',
		description: 'When the evolution condition is met, play the next stage card to transform this pet on the battlefield.',
		icon: 'arrow-up-circle',
	},
	master_evolution: {
		name: 'Master Evolution',
		description: 'The final evolution stage. Play this card to transform any eligible Stage 2 pet from the same family.',
		icon: 'crown',
	},
	choose_one: {
		name: 'Choose One',
		description: 'Pick one of two effects when you play this card.',
		icon: 'git-branch',
	},
	outcast: {
		name: 'Outcast',
		description: 'Bonus effect if played as the left- or right-most card in your hand.',
		icon: 'arrow-right',
	},
	quest: {
		name: 'Quest',
		description: 'Starts in your hand. Complete the objective for a powerful reward.',
		icon: 'flag',
	},
	sidequest: {
		name: 'Sidequest',
		description: 'Complete the objective for a bonus reward.',
		icon: 'bookmark',
	},
	spellburst: {
		name: 'Spellburst',
		description: 'Triggers once after you cast a spell.',
		icon: 'sparkles',
	},
	enrage: {
		name: 'Enrage',
		description: 'Gains a bonus effect while damaged.',
		icon: 'angry',
	},
	tradeable: {
		name: 'Tradeable',
		description: 'Drag this into your deck to spend 1 mana and draw a new card.',
		icon: 'repeat',
	},
	recruit: {
		name: 'Recruit',
		description: 'Summon a minion from your deck.',
		icon: 'user-plus',
	},
	cleave: {
		name: 'Cleave',
		description: 'Also damages the minions next to whomever this attacks.',
		icon: 'scissors',
	},
	aura: {
		name: 'Aura',
		description: 'Provides a persistent effect while this minion is on the board.',
		icon: 'radio',
	},
	flying: {
		name: 'Flying',
		description: 'Can bypass Taunt minions and attack any target.',
		icon: 'feather',
	},
	wager: {
		name: 'Wager',
		description: 'While this minion is on the battlefield, its effect activates during poker combat.',
		icon: 'dice',
	},
	submerge: {
		name: 'Submerge',
		description: 'Enters play face-down and untargetable for a number of turns. Surfaces with a powerful effect.',
		icon: 'anchor',
	},
	coil: {
		name: 'Coil',
		description: 'Locks an enemy minion\'s attack to 0 while this minion lives. Deathrattle frees the target.',
		icon: 'lock',
	},
};

export function getKeywordDefinition(keyword: string): KeywordDefinition | null {
	const key = keyword.toLowerCase().replace(/[\s-]/g, '_');
	return KEYWORD_DEFINITIONS[key] || null;
}

export function getAllKeywords(): KeywordDefinition[] {
	return Object.values(KEYWORD_DEFINITIONS);
}
