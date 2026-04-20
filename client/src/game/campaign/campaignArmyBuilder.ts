import type { CampaignMission } from './campaignTypes';
import type { ArmySelection } from '../types/ChessTypes';
import { CHESS_PIECE_HEROES, getDefaultArmySelection } from '../data/ChessPieceConfig';

let heroIndex: Map<string, { hero: any; pieceType: string }> | null = null;

function getHeroIndex() {
	if (!heroIndex) {
		heroIndex = new Map(
			(['queen', 'rook', 'bishop', 'knight', 'king'] as const).flatMap(
				pieceType => CHESS_PIECE_HEROES[pieceType].map(h => [h.id, { hero: h, pieceType }])
			)
		);
	}
	return heroIndex;
}

export function buildCampaignArmy(mission: CampaignMission): ArmySelection {
	const cfg = mission.campaignArmy;
	if (!cfg) return getDefaultArmySelection();

	const base = getDefaultArmySelection();
	const slots = ['king', 'queen', 'rook', 'bishop', 'knight'] as const;
	const index = getHeroIndex();

	for (const slot of slots) {
		const heroId = cfg[slot];
		if (!heroId) continue;
		const entry = index.get(heroId);
		if (entry) {
			base[slot] = entry.hero;
		}
	}

	return base;
}
