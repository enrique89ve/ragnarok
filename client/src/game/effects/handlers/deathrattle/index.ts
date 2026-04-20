/**
 * Deathrattle Handlers Index
 *
 * This file exports all deathrattle handlers for registration with the EffectRegistry
 */
import executeSummonRandom from './summonRandomHandler';
import executeAddToHand from './addToHandHandler';
import executeSplitDamage from './splitDamageHandler';
import executeAddCard from './addCardHandler';
import executeSummonJadeGolem from './summonJadeGolemHandler';
import executeShuffle from './shuffleHandler';
import executeDestroy from './destroyHandler';
import executeShuffleCard from './shuffleCardHandler';
import executeResurrect from './resurrectHandler';
import executeSummon from './summonHandler';
import executeDamage from './damageHandler';
import executeDraw from './drawHandler';
import executeHeal from './healHandler';
import executeBuff from './buffHandler';
import executeSummonWithStats from './summon_with_statsHandler';
import executeSummonHighestCostFromGraveyard from './summonHighestCostFromGraveyardHandler';

const deathrattleHandlers: Record<string, Function> = {
	'summon_random': executeSummonRandom,
	'add_to_hand': executeAddToHand,
	'split_damage': executeSplitDamage,
	'add_card': executeAddCard,
	'summon_yggdrasil_golem': executeSummonJadeGolem,
	'shuffle': executeShuffle,
	'destroy': executeDestroy,
	'shuffle_card': executeShuffleCard,
	'resurrect': executeResurrect,
	'summon': executeSummon,
	'damage': executeDamage,
	'draw': executeDraw,
	'heal': executeHeal,
	'buff': executeBuff,
	'summon_with_stats': executeSummonWithStats,
	'summon_highest_cost_from_graveyard': executeSummonHighestCostFromGraveyard,
};

export default deathrattleHandlers;
