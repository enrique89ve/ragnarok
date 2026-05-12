import type { MapRealmId } from '../types';

export const CAMPAIGN_ARCS: Readonly<Record<MapRealmId, string>> = Object.freeze({
	asgard: 'The Aesir raise their fortress on Ymir\'s skull-sky, then hold the unfinished walls against giant probes.',
	midgard: 'The mortal center is shaped from Ymir\'s body; Ask and Embla receive breath, mind, and sense on its first shore.',
	jotunheim: 'Bergelmir survives the blood-flood and rebuilds the jotnar around an oath of vengeance against the gods.',
	niflheim: 'The northern ice and venomous Elivagar feed the first collision with Muspelheim inside Ginnungagap.',
	muspelheim: 'The southern fire provides the sparks of creation and the final flame Surtr carries toward Ragnarok.',
	helheim: 'Hel receives the dishonored dead, while Baldur\'s fate and the road from death mark the late saga.',
	alfheim: 'Freyr\'s light realm is threatened by dark-elf corruption in Yggdrasil\'s roots.',
	svartalfheim: 'The under-realms hold dwarven craft and dark-elf pressure beneath the World Tree.',
	vanaheim: 'The Vanir answer Gullveig\'s burning with the first divine war, ending in hostage exchange and uneasy peace.',
});
