import type { Position } from '../types/Position';

export interface DropRect {
	readonly left: number;
	readonly right: number;
	readonly top: number;
	readonly bottom: number;
}

export type CardMagicCursor = 'neutral' | 'arcane' | 'ember' | 'frost' | 'verdant';

const CURSOR_KEYWORDS: Readonly<Record<Exclude<CardMagicCursor, 'neutral'>, readonly string[]>> = {
	arcane: ['choose_one', 'discover', 'fateweave', 'poker_spell', 'prophecy', 'quest', 'secret', 'spellburst'],
	ember: ['blood_echo', 'blood_price', 'charge', 'cleave', 'frenzy', 'overkill', 'rush', 'spell_damage'],
	frost: ['divine_shield', 'freeze', 'freeze_on_damage', 'frozen', 'taunt'],
	verdant: ['aura', 'lifesteal', 'magnetic', 'poisonous', 'reborn', 'recruit', 'windfury'],
};

export function resolveCardMagicCursor(keywords: readonly string[] | undefined): CardMagicCursor {
	const normalizedKeywords = new Set((keywords ?? []).map(keyword => keyword.trim().toLowerCase()));
	const priority: readonly Exclude<CardMagicCursor, 'neutral'>[] = ['arcane', 'ember', 'frost', 'verdant'];

	return priority.find(cursor => CURSOR_KEYWORDS[cursor].some(keyword => normalizedKeywords.has(keyword))) ?? 'neutral';
}

export interface CardDragDynamicsInput {
	readonly offsetX: number;
	readonly offsetY: number;
	readonly velocityX: number;
	readonly velocityY: number;
	readonly isOverDropZone: boolean;
	readonly reducedMotion: boolean;
}

export interface CardDragDynamics {
	readonly liftProgress: number;
	readonly tiltX: number;
	readonly tiltY: number;
	readonly tiltZ: number;
	readonly targetScale: number;
	readonly shadowX: number;
	readonly shadowY: number;
	readonly shadowScale: number;
	readonly shadowOpacity: number;
}

const COMMIT_UPWARD_THRESHOLD_PX = 64;
const COMMIT_MARGIN_BELOW_PX = 36;
const COMMIT_MARGIN_SIDE_PX = 64;
const LIFT_FULL_DISTANCE_PX = 150;

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

export function isPointInsideDropRect(position: Position, rect: DropRect): boolean {
	return position.x >= rect.left && position.x <= rect.right && position.y >= rect.top && position.y <= rect.bottom;
}

/**
 * Intentional battle-zone commit check (Legends of Runeterra style):
 * accepts either a pointer directly inside the battlefield drop rect OR a
 * deliberate upward pull from hand into the battle lane (forgiving the small
 * vertical gap between the hand fan and the minion row).
 */
export function isPointInBattleCommitZone(
	position: Position,
	startPosition: Position,
	rect: DropRect,
): boolean {
	if (isPointInsideDropRect(position, rect)) return true;

	const upwardDelta = startPosition.y - position.y;
	if (upwardDelta < COMMIT_UPWARD_THRESHOLD_PX) return false;

	const withinHorizontalLane =
		position.x >= rect.left - COMMIT_MARGIN_SIDE_PX &&
		position.x <= rect.right + COMMIT_MARGIN_SIDE_PX;
	const reachedBattleHeight = position.y <= rect.bottom + COMMIT_MARGIN_BELOW_PX;

	return withinHorizontalLane && reachedBattleHeight;
}

export function toCanvasDragOffset(screenOffset: Position, scale: Position): Position {
	return {
		x: screenOffset.x / (scale.x > 0 ? scale.x : 1),
		y: screenOffset.y / (scale.y > 0 ? scale.y : 1),
	};
}

export function computeCardDragDynamics(input: CardDragDynamicsInput): CardDragDynamics {
	const liftProgress = clamp(-input.offsetY / LIFT_FULL_DISTANCE_PX, 0, 1);

	const tiltZ = input.reducedMotion ? 0 : clamp(input.velocityX * 0.42, -11, 11);
	const tiltY = input.reducedMotion ? 0 : clamp(input.velocityX * 0.52, -14, 14);
	const tiltX = input.reducedMotion
		? 0
		: clamp(-input.velocityY * 0.34 - liftProgress * 4.5, -11, 9);

	const targetScale = input.isOverDropZone
		? 1.02
		: 1.08 - liftProgress * 0.03;

	return {
		liftProgress,
		tiltX,
		tiltY,
		tiltZ,
		targetScale,
		shadowX: -tiltZ * 1.15,
		shadowY: 10 + liftProgress * 28,
		shadowScale: 0.95 - liftProgress * 0.08,
		shadowOpacity: 0.42 + liftProgress * 0.24,
	};
}
