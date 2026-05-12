import type { MapRealmId } from '../types';

export interface RealmCardMatcher {
	terms: readonly string[];
	petFamilies: readonly string[];
	heroIds: readonly string[];
}

export const REALM_CARD_MATCHERS: Readonly<Record<MapRealmId, RealmCardMatcher>> = Object.freeze({
	asgard: {
		terms: ['asgard', 'aesir', 'odin', 'thor', 'frigg', 'tyr', 'heimdall', 'baldur', 'vidar', 'bifrost', 'einherjar', 'valkyrie', 'mjolnir', 'gungnir'],
		petFamilies: ['valkyries', 'aesirsBeasts', 'thorsGoats', 'einherjarWarriors', 'bifrost'],
		heroIds: ['hero-odin', 'hero-thor', 'hero-frigg', 'hero-tyr', 'hero-heimdall', 'hero-baldur', 'hero-vidar'],
	},
	midgard: {
		terms: ['midgard', 'mortal', 'human', 'ask', 'embla', 'traveler', 'iron', 'ragnar', 'sigurd', 'hervor'],
		petFamilies: ['warSteeds', 'fylgja', 'huldrefolk', 'ratatoskrMessengers'],
		heroIds: ['hero-ragnar-ironside', 'hero-hervor', 'hero-sigurd', 'hero-gudrun', 'hero-starkad'],
	},
	jotunheim: {
		terms: ['jotunheim', 'jotun', 'giant', 'ymir', 'bergelmir', 'thorgrim', 'thryma', 'thrym', 'skadi', 'hrungnir', 'frost-blood'],
		petFamilies: ['giants', 'trolls', 'primordialBeasts'],
		heroIds: ['hero-thorgrim', 'hero-valthrud', 'hero-bestla', 'hero-thryma', 'hero-skadi'],
	},
	niflheim: {
		terms: ['niflheim', 'elivagar', 'ice', 'mist', 'frost', 'freeze', 'frozen', 'north'],
		petFamilies: ['serpents', 'norseSeaSpirits', 'norns'],
		heroIds: ['hero-groa', 'hero-mani'],
	},
	muspelheim: {
		terms: ['muspelheim', 'muspell', 'surtr', 'sinmara', 'logi', 'fire giant', 'flame', 'ember', 'scorched', 'ragnarok'],
		petFamilies: ['muspelheim', 'muspelPhoenixes', 'doomHeralds', 'drakes'],
		heroIds: ['hero-sinmara', 'hero-logi', 'hero-erik-flameheart'],
	},
	helheim: {
		terms: ['helheim', 'hel', 'hel\'s', 'hel-walker', 'helbound', 'draugr', 'garm', 'garmr', 'naglfar', 'underworld', 'dead', 'death mare'],
		petFamilies: ['hellhounds', 'draugr', 'naglfar'],
		heroIds: ['hero-hel', 'hero-hermod', 'hero-hoder', 'hero-gormr'],
	},
	alfheim: {
		terms: ['alfheim', 'ljosalfar', 'light elf', 'light-elves', 'freyr', 'sun', 'radiant', 'light'],
		petFamilies: ['ljosalfar', 'freyjasCompanions', 'celestialHorses'],
		heroIds: ['hero-freyr', 'hero-sol', 'hero-baldur', 'hero-nanna'],
	},
	svartalfheim: {
		terms: ['svartalfheim', 'svartalfar', 'dwarf', 'dwarven', 'nidavellir', 'brokkr', 'sindri', 'forge', 'forged', 'shadow'],
		petFamilies: ['svartalfar', 'dwarvenForgemasters'],
		heroIds: ['hero-blainn', 'hero-brokkr'],
	},
	vanaheim: {
		terms: ['vanaheim', 'vanir', 'freya', 'freyja', 'freyr', 'njord', 'gullveig', 'idunn', 'gerd', 'gefjon', 'green earth', 'harvest'],
		petFamilies: ['freyjasCompanions', 'stags', 'bears', 'rootkin', 'ents', 'disir'],
		heroIds: ['hero-freya', 'hero-freyr', 'hero-njord', 'hero-gullveig', 'hero-idunn', 'hero-gerd', 'hero-gefjon'],
	},
});
