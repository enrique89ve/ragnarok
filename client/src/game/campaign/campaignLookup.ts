import { celticChapter } from './chapters/celticChapter';
import { easternChapter } from './chapters/easternChapter';
import { egyptianChapter } from './chapters/egyptianChapter';
import { greekChapter } from './chapters/greekChapter';
import { norseChapter } from './chapters/norseChapter';
import { twilightChapter } from './chapters/twilightChapter';
import type { CampaignChapter } from './campaignTypes';

export const ALL_CHAPTERS: CampaignChapter[] = [
	norseChapter,
	twilightChapter,
	greekChapter,
	egyptianChapter,
	celticChapter,
	easternChapter,
];

export function getMission(missionId: string) {
	for (const chapter of ALL_CHAPTERS) {
		const mission = chapter.missions.find(candidate => candidate.id === missionId);
		if (mission) return { mission, chapter };
	}
	return null;
}
