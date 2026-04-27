/**
 * Chess piece role — board positioning identity.
 *
 * Source: docs/RULEBOOK.md §"Ragnarok Chess".
 * Used by ChessPieceConfig.ts and chess combat resolver.
 */
import { z } from 'zod';

export const PIECES = ['king', 'queen', 'bishop', 'knight', 'rook', 'pawn'] as const;
export type Piece = (typeof PIECES)[number];
export const PieceSchema = z.enum(PIECES);
