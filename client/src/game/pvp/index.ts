/*
  pvp/index.ts \u2014 barrel for the PvP narrative wrapper.

  This subsystem layers cosmetic + narrative meaning on top of the
  existing matchmaking + combat code without touching how matches
  actually work. Game logic stays in stores/peerStore + matchmaking;
  this module only adds:
    - factionStore: which house the player has pledged to
    - rivalryStore: last 10 opponents and their head-to-head record
    - pvpData: Yggdrasil rank labels, hero feud quips, faction defs
    - FactionPledgePopup: the one-time post-Norse pledge ceremony

  Future: a Yggdrasil rank-up cinematic, hero feud quip popups in the
  matchmaking lobby, and a faction war meta-game (server-aggregated).
*/

export { useFactionStore } from './factionStore';
export { useRivalryStore } from './rivalryStore';
export type { RivalRecord } from './rivalryStore';
export {
	FACTIONS,
	YGGDRASIL_RANKS,
	getFaction,
	getYggdrasilRank,
	getHeroFeud,
	getHeroFeudQuip,
} from './pvpData';
export type { FactionId, FactionDef, YggdrasilRank, HeroFeud } from './pvpData';
export { FactionPledgePopup } from './FactionPledgePopup';
