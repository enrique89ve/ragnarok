export { norseChapter } from './chapters/norseChapter';
export { twilightChapter } from './chapters/twilightChapter';
export { greekChapter } from './chapters/greekChapter';
export { egyptianChapter } from './chapters/egyptianChapter';
export { celticChapter } from './chapters/celticChapter';
export { easternChapter } from './chapters/easternChapter';
export type { CampaignChapter, CampaignMission, CampaignArmy, AIBehaviorProfile, BossRule, CampaignReward, Difficulty, CinematicIntro, CinematicScene, BossQuips, BossPhase, BossPhaseEffect, BossPhaseFlash, MusicCueId } from './campaignTypes';
export { AI_PROFILES, getMissionStars, DEFAULT_STAR_THRESHOLDS } from './campaignTypes';
export { useCampaignStore } from './campaignStore';
export { buildCampaignArmy } from './campaignArmyBuilder';
export { NINE_REALMS, REALM_MAP, MISSION_REALM_MAP, getMissionsForRealm, getRealmProgress } from './nineRealms';
export type { Realm } from './nineRealms';
export { GREEK_REALMS, GREEK_REALM_MAP, GREEK_MISSION_REALM_MAP, getGreekMissionsForRealm, getGreekRealmProgress } from './greekRealms';
export type { GreekRealm } from './greekRealms';

import { norseChapter } from './chapters/norseChapter';
import { twilightChapter } from './chapters/twilightChapter';
import { greekChapter } from './chapters/greekChapter';
import { egyptianChapter } from './chapters/egyptianChapter';
import { celticChapter } from './chapters/celticChapter';
import { easternChapter } from './chapters/easternChapter';
import type { CampaignChapter } from './campaignTypes';

export const ALL_CHAPTERS: CampaignChapter[] = [
	norseChapter,
	twilightChapter,
	greekChapter,
	egyptianChapter,
	celticChapter,
	easternChapter,
];

export const EASTERN_CHAPTER: CampaignChapter = easternChapter;

export const BASE_CHAPTER_MISSION_IDS: Record<string, string[]> = {
	norse: norseChapter.missions.map(m => m.id),
	twilight: twilightChapter.missions.map(m => m.id),
	greek: greekChapter.missions.map(m => m.id),
	egyptian: egyptianChapter.missions.map(m => m.id),
	celtic: celticChapter.missions.map(m => m.id),
	eastern: easternChapter.missions.map(m => m.id),
};

export function getMission(missionId: string) {
	const allChapters = ALL_CHAPTERS;
	for (const chapter of allChapters) {
		const mission = chapter.missions.find(m => m.id === missionId);
		if (mission) return { mission, chapter };
	}
	return null;
}
