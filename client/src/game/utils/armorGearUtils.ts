import { GameState, ArmorPiece, ArmorSlot, ArmorPassive, GameLogEvent } from '../types';
import { v4 as uuidv4 } from 'uuid';

export function equipArmorPiece(
	state: GameState,
	playerType: 'player' | 'opponent',
	piece: ArmorPiece,
	slot: ArmorSlot
): GameState {
	const newState = JSON.parse(JSON.stringify(state)) as GameState;
	const player = newState.players[playerType];

	if (!player.armorGear) {
		player.armorGear = {};
	}

	const oldPiece = player.armorGear[slot];
	if (oldPiece) {
		player.heroArmor = Math.max(0, (player.heroArmor || 0) - oldPiece.armorValue);
	}

	player.armorGear[slot] = piece;
	player.heroArmor = Math.min(30, (player.heroArmor || 0) + piece.armorValue);

	const logEvent: GameLogEvent = {
		id: uuidv4(),
		type: 'equip_armor',
		turn: newState.turnNumber,
		timestamp: Date.now(),
		player: playerType,
		text: `${playerType} equipped ${piece.name} (+${piece.armorValue} Armor)`,
	};
	newState.gameLog.push(logEvent);

	return newState;
}

export function unequipArmorPiece(
	state: GameState,
	playerType: 'player' | 'opponent',
	slot: ArmorSlot
): GameState {
	const newState = JSON.parse(JSON.stringify(state)) as GameState;
	const player = newState.players[playerType];

	if (!player.armorGear || !player.armorGear[slot]) return state;

	const piece = player.armorGear[slot]!;
	player.heroArmor = Math.max(0, (player.heroArmor || 0) - piece.armorValue);
	player.armorGear[slot] = undefined;

	const logEvent: GameLogEvent = {
		id: uuidv4(),
		type: 'armor_removed',
		turn: newState.turnNumber,
		timestamp: Date.now(),
		player: playerType,
		text: `${playerType} removed ${piece.name}`,
	};
	newState.gameLog.push(logEvent);

	return newState;
}

export function getTotalGearArmor(armorGear?: { helm?: ArmorPiece; chest?: ArmorPiece; greaves?: ArmorPiece }): number {
	if (!armorGear) return 0;
	return (armorGear.helm?.armorValue || 0) + (armorGear.chest?.armorValue || 0) + (armorGear.greaves?.armorValue || 0);
}

export interface SetBonus {
	setId: string;
	piecesEquipped: number;
	twoPieceBonus?: string;
	threePieceBonus?: string;
	isTwoPieceActive: boolean;
	isThreePieceActive: boolean;
}

const SET_BONUS_DEFINITIONS: Record<string, { twoPiece: string; threePiece: string }> = {
	stormcaller: { twoPiece: 'Lightning spells deal +1 damage', threePiece: 'First Lightning spell each turn costs (0)' },
	valhalla: { twoPiece: 'Spell Damage +1', threePiece: 'Spells cast twice (Echo)' },
	berserker: { twoPiece: 'Hero gains +1 Attack', threePiece: 'Hero attacks ignore armor' },
	thunderguard: { twoPiece: 'After hero attacks: +1 Armor', threePiece: 'Hero attacks deal damage to adjacent minions' },
	spectral: { twoPiece: 'On minion death: draw a card', threePiece: 'Deathrattles trigger twice' },
	abyssal: { twoPiece: 'Freeze lasts +1 turn', threePiece: 'Frozen minions take double damage' },
	aegis: { twoPiece: 'Minions gain +1 Health', threePiece: 'Divine Shield refreshes once per turn' },
	vanir: { twoPiece: 'Healing +1', threePiece: 'After healing: give target +1/+1' },
	shadow: { twoPiece: 'First card each turn costs (1) less', threePiece: 'Combo cards trigger twice' },
	oathkeeper: { twoPiece: '+2 Armor on hero damage', threePiece: 'Once per game: prevent lethal' },
};

export function getActiveSetBonuses(armorGear?: { helm?: ArmorPiece; chest?: ArmorPiece; greaves?: ArmorPiece }): SetBonus[] {
	if (!armorGear) return [];

	const setCounts: Record<string, number> = {};
	const slots = [armorGear.helm, armorGear.chest, armorGear.greaves];
	for (const piece of slots) {
		if (piece?.setId) {
			setCounts[piece.setId] = (setCounts[piece.setId] || 0) + 1;
		}
	}

	const bonuses: SetBonus[] = [];
	for (const [setId, count] of Object.entries(setCounts)) {
		if (count >= 2) {
			const def = SET_BONUS_DEFINITIONS[setId];
			bonuses.push({
				setId,
				piecesEquipped: count,
				twoPieceBonus: def?.twoPiece,
				threePieceBonus: def?.threePiece,
				isTwoPieceActive: count >= 2,
				isThreePieceActive: count >= 3,
			});
		}
	}

	return bonuses;
}

export function armorPieceFromCard(card: any): ArmorPiece | null {
	if (card.type !== 'armor') return null;
	return {
		id: card.id,
		name: card.name,
		slot: card.armorSlot,
		armorValue: card.armorValue || 0,
		passive: card.armorPassive ? {
			type: card.armorPassive.type,
			value: card.armorPassive.value,
			condition: card.armorPassive.condition,
		} : undefined,
		setId: card.setId,
		heroClass: card.heroClass,
		rarity: card.rarity || 'common',
		manaCost: card.manaCost || 0,
	};
}
