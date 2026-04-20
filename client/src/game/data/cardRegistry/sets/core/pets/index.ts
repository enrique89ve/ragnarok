/**
 * Pet Cards — 3-3-1 Family-based evolution system
 *
 * 37 families × 7 cards = 259 cards + tokens
 * Each family: 3 Stage 1 (Basic) → 3 Stage 2 (Adept) → 1 Stage 3 (Master) with 3 variants
 *
 * Families (Original 10):
 * - Wolves (50000-50006): Fire / Dark / Neutral
 * - Serpents (50010-50016): Fire / Water / Electric
 * - Ravens (50020-50026): Dark / Electric / Light
 * - Stags (50030-50036): Water / Grass / Light
 * - Bears (50040-50046): Fire / Grass / Neutral
 * - Drakes (50050-50056): Fire / Electric / Neutral
 * - Ents (50060-50066): Water / Grass / Neutral
 * - Valkyries (50070-50076): Electric / Light / Neutral
 * - Draugr (50080-50086): Dark / Grass / Light
 * - Giants (50090-50096): Water / Dark / Neutral
 *
 * Families (Batch 1):
 * - Muspelheim (50100-50106): Fire / Dark / Electric
 * - Tideborn (50110-50116): Water / Electric / Neutral
 * - Rootkin (50120-50126): Grass / Light / Water
 * - Stormkin (50130-50136): Electric / Fire / Dark
 * - Hellhounds (50140-50146): Dark / Fire / Grass
 * - Bifrost (50150-50156): Light / Electric / Neutral
 *
 * Families (Batch 2):
 * - Freyja's Companions (50160-50166): Electric / Fire / Light
 * - Celestial Horses (50170-50176): Light / Dark / Neutral
 * - Yggdrasil Watchers (50180-50186): Light / Grass / Neutral
 * - Norse Sea Spirits (50190-50196): Water / Dark / Electric
 * - Aesir's Beasts (50200-50206): Fire / Electric / Grass
 * - Primordial Beasts (50210-50216): Grass / Dark / Neutral
 * - Doom Heralds (50220-50226): Dark / Electric / Fire
 * - War Steeds (50230-50236): Neutral / Fire / Light
 *
 * Families (Batch 3):
 * - Thor's Goats (50240-50246): Fire / Neutral / Light
 * - Dwarven Forgemasters (50250-50256): Fire / Neutral / Electric
 * - Norns (50260-50266): Water / Light / Dark
 * - Trolls (50270-50276): Grass / Water / Neutral
 * - Ljosalfar (50280-50286): Light / Electric / Neutral
 * - Svartalfar (50290-50296): Dark / Fire / Grass
 * - Disir (50300-50306): Light / Dark / Neutral
 * - Fylgja (50310-50316): Fire / Water / Dark
 * - Huldrefolk (50320-50326): Dark / Grass / Neutral
 * - Einherjar Warriors (50330-50336): Fire / Light / Neutral
 * - Ratatoskr's Messengers (50340-50346): Electric / Neutral / Grass
 * - Naglfar's Crew (50350-50356): Dark / Water / Neutral
 * - Muspel Phoenixes (50360-50366): Fire / Electric / Light
 *
 * Tokens (9200-9249)
 */
import { CardData } from '../../../../../types';
import { allFamilyPets } from './families';
import { petTokens } from './petTokens';

export const allPetCards: CardData[] = [
	...allFamilyPets,
	...petTokens
];

export { allFamilyPets, petTokens };
export {
	wolvesPets,
	serpentsPets,
	ravensPets,
	stagsPets,
	bearsPets,
	drakesPets,
	entsPets,
	valkyriesPets,
	draugrPets,
	giantsPets,
	muspelheimPets,
	tidebornPets,
	rootkinPets,
	stormkinPets,
	hellhoundsPets,
	bifrostPets,
	freyjasCompanionsPets,
	celestialHorsesPets,
	yggdrasilWatchersPets,
	norseSeaSpiritsPets,
	aesirsBeastsPets,
	primordialBeastsPets,
	doomHeraldsPets,
	warSteedsPets,
	thorsGoatsPets,
	dwarvenForgemastersPets,
	nornsPets,
	trollsPets,
	ljosalfarPets,
	svartalfarPets,
	disirPets,
	fylgjaPets,
	huldrefolkPets,
	einherjarWarriorsPets,
	ratatoskrMessengersPets,
	naglfarPets,
	muspelPhoenixesPets,
} from './families';
