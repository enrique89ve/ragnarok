/**
 * Compact combat/poker actions for the P2P transcript.
 *
 * The active relay still transports JSON strings, so this codec deliberately
 * emits JSON-safe tuples. WebRTC/DataChannel can carry the same tuple bytes
 * later without changing the game rules or the signed transcript contract.
 */

import { z } from 'zod';

const BOARD_ROWS = 7;
const BOARD_COLS = 5;
const BOARD_CELL_MAX = BOARD_ROWS * BOARD_COLS - 1;

export const COMPACT_COMBAT_OPCODE = {
	CHESS_COMBAT_INITIATED: 1,
	POKER_ACTION: 2,
	COMBAT_RESOLVED: 3,
} as const;

export const COMPACT_POKER_ACTION_CODE = {
	attack: 1,
	counter: 2,
	engage: 3,
	brace: 4,
	defend: 5,
} as const;

export type CompactPokerActionName = keyof typeof COMPACT_POKER_ACTION_CODE;
export type CompactPokerActionCode = typeof COMPACT_POKER_ACTION_CODE[CompactPokerActionName];

const POKER_ACTION_BY_CODE: Record<CompactPokerActionCode, CompactPokerActionName> = {
	1: 'attack',
	2: 'counter',
	3: 'engage',
	4: 'brace',
	5: 'defend',
};

const BoardCellSchema = z.number().int().min(0).max(BOARD_CELL_MAX);
const HpCommitmentSchema = z.number().int().min(0).max(500).nullable();

export const CompactChessCombatInitiatedSchema = z.tuple([
	z.literal(COMPACT_COMBAT_OPCODE.CHESS_COMBAT_INITIATED),
	BoardCellSchema,
	BoardCellSchema,
]);

export const CompactPokerActionSchema = z.tuple([
	z.literal(COMPACT_COMBAT_OPCODE.POKER_ACTION),
	z.union([
		z.literal(COMPACT_POKER_ACTION_CODE.attack),
		z.literal(COMPACT_POKER_ACTION_CODE.counter),
		z.literal(COMPACT_POKER_ACTION_CODE.engage),
		z.literal(COMPACT_POKER_ACTION_CODE.brace),
		z.literal(COMPACT_POKER_ACTION_CODE.defend),
	]),
	HpCommitmentSchema,
]);

export const CompactCombatResolvedSchema = z.tuple([
	z.literal(COMPACT_COMBAT_OPCODE.COMBAT_RESOLVED),
	z.union([z.literal(0), z.literal(1), z.literal(2)]),
]);

export const CompactP2PCombatActionSchema = z.union([
	CompactChessCombatInitiatedSchema,
	CompactPokerActionSchema,
	CompactCombatResolvedSchema,
]);

export type CompactChessCombatInitiated = z.infer<typeof CompactChessCombatInitiatedSchema>;
export type CompactPokerAction = z.infer<typeof CompactPokerActionSchema>;
export type CompactCombatResolved = z.infer<typeof CompactCombatResolvedSchema>;
export type CompactP2PCombatAction = z.infer<typeof CompactP2PCombatActionSchema>;

export interface WireBoardPosition {
	readonly row: number;
	readonly col: number;
}

export function encodeBoardCell(pos: WireBoardPosition): number {
	if (!Number.isInteger(pos.row) || pos.row < 0 || pos.row >= BOARD_ROWS) {
		throw new Error(`encodeBoardCell: row out of range (${pos.row})`);
	}
	if (!Number.isInteger(pos.col) || pos.col < 0 || pos.col >= BOARD_COLS) {
		throw new Error(`encodeBoardCell: col out of range (${pos.col})`);
	}
	return pos.row * BOARD_COLS + pos.col;
}

export function decodeBoardCell(cell: number): WireBoardPosition {
	const parsed = BoardCellSchema.safeParse(cell);
	if (!parsed.success) {
		throw new Error(`decodeBoardCell: cell out of range (${cell})`);
	}
	return {
		row: Math.floor(parsed.data / BOARD_COLS),
		col: parsed.data % BOARD_COLS,
	};
}

export function encodeChessCombatInitiated(input: {
	readonly from: WireBoardPosition;
	readonly to: WireBoardPosition;
}): CompactChessCombatInitiated {
	return [
		COMPACT_COMBAT_OPCODE.CHESS_COMBAT_INITIATED,
		encodeBoardCell(input.from),
		encodeBoardCell(input.to),
	];
}

export function decodeChessCombatInitiated(action: unknown): {
	readonly from: WireBoardPosition;
	readonly to: WireBoardPosition;
} | null {
	const result = CompactChessCombatInitiatedSchema.safeParse(action);
	if (!result.success) return null;
	return {
		from: decodeBoardCell(result.data[1]),
		to: decodeBoardCell(result.data[2]),
	};
}

export function encodePokerAction(input: {
	readonly action: CompactPokerActionName;
	readonly hpCommitment?: number;
}): CompactPokerAction {
	const encoded = [
		COMPACT_COMBAT_OPCODE.POKER_ACTION,
		COMPACT_POKER_ACTION_CODE[input.action],
		input.hpCommitment ?? null,
	];
	const result = CompactPokerActionSchema.safeParse(encoded);
	if (!result.success) {
		throw new Error('encodePokerAction: invalid poker action payload');
	}
	return result.data;
}

export function decodePokerAction(action: unknown): {
	readonly action: CompactPokerActionName;
	readonly hpCommitment?: number;
} | null {
	const result = CompactPokerActionSchema.safeParse(action);
	if (!result.success) return null;
	const hpCommitment = result.data[2] ?? undefined;
	return {
		action: POKER_ACTION_BY_CODE[result.data[1]],
		...(hpCommitment === undefined ? {} : { hpCommitment }),
	};
}

export function isPokerActionCompactConsistent(input: {
	readonly action: string;
	readonly hpCommitment?: number;
	readonly compact?: CompactPokerAction;
}): boolean {
	if (!input.compact) return true;
	const decoded = decodePokerAction(input.compact);
	if (!decoded) return false;
	if (decoded.action !== input.action) return false;
	return (decoded.hpCommitment ?? undefined) === (input.hpCommitment ?? undefined);
}

export function parseCompactP2PCombatAction(input: unknown): CompactP2PCombatAction | null {
	const result = CompactP2PCombatActionSchema.safeParse(input);
	return result.success ? result.data : null;
}
