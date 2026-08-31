/**
 * Chess wire schemas.
 *
 * Why this file exists: chess phase actions cross the P2P wire as their
 * own envelope shape (separate from `GameCommandEnvelope` for cards),
 * because the chess pipeline is symmetric (Plan B) and independent of
 * the cards pipeline (`applyGameCommand`, also symmetric apply). See
 * session-2 grilling Q1/Q4 for the original split.
 *
 * Surface today (post C-Chess.8):
 *   - `chess_move`: quiet move (no capture). Both peers apply via
 *     `executeMove` independently.
 *   - `chess_attack`: instant-kill capture only (see
 *     `isChessAttackInstantKill`). Receiver runs `beginChessAttack` with
 *     isInstantKill=true; animation completion is presentation cleanup.
 *   - `chess_combat_initiated`: non-instant capture that enters the
 *     poker/combat phase. Receiver runs `beginChessAttack` with
 *     isInstantKill=false; mechanics stage `pendingCombat` immediately,
 *     and the coordinator boots poker after the visual marker clears.
 *
 * Future surface (deferred): `chess_concede`, `chess_draw_offer`,
 * `chess_draw_accept`, `chess_mine_placement`. Each adds a member to
 * the discriminated union — receiver's exhaustive switch will break
 * the typecheck if a case is forgotten, which is the entire point of
 * keeping `ChessCommandSchema` discriminated rather than flag-bagged.
 *
 * State hash policy (TD-27c-chess, dual hash):
 *
 *   - `prevChessStateHash` — SHA-256 over the canonical
 *     `ChessBoardSnapshot` (see `shared/protocol-core/chess/canonicalize.ts`).
 *   - `prevCardsStateHash` — SHA-256 over the WASM-canonical cards
 *     `GameState`. Always present, even when the chess action does not
 *     touch cards-side state, so coverage is enforced at the wire instead
 *     of audited per-handler.
 *
 * Both hashes are required and validated by the receiver before applying
 * the action. A mismatch on either domain rejects the envelope with the
 * domain-specific code (`prev_chess_state_hash_mismatch` /
 * `prev_cards_state_hash_mismatch`) so triage post-incident does not
 * require re-hashing both sides by hand.
 *
 * Either hash may be `''` during well-known races (state pre-init,
 * eager-WASM load); the receiver treats empty as "retry later" rather
 * than rejecting hard. See `client/src/game/engine/{wireHash,chessHash}.ts`
 * for the policy.
 *
 * Board dimensions are re-declared here at the trust boundary
 * (BOARD_ROWS=7, BOARD_COLS=5 in client/types/ChessTypes.ts). If the
 * runtime board ever grows, both constants must be updated together —
 * a `tests/protocolConformance.test.ts` style guard would catch drift,
 * but until that exists the duplication is intentional and small.
 */

import { z } from 'zod';
import { MAX_MATCH_ID_LENGTH } from '../p2pAvailability';
import { CompactChessCombatInitiatedSchema } from './combat';

// ── Position ───────────────────────────────────────────────────────────────

const ROW_MIN = 0;
const ROW_MAX = 6; // 7 rows
const COL_MIN = 0;
const COL_MAX = 4; // 5 cols

export const ChessBoardPositionSchema = z
	.object({
		row: z.number().int().min(ROW_MIN).max(ROW_MAX),
		col: z.number().int().min(COL_MIN).max(COL_MAX),
	})
	.strict();

export type WireChessBoardPosition = z.infer<typeof ChessBoardPositionSchema>;

// ── Commands ───────────────────────────────────────────────────────────────

/**
 * `pieceId` is a runtime id minted by `initializeBoard(armies, idGen)`
 * (via the seeded `SeededIdGen`). The 128-char cap is a guardrail against
 * a malformed peer flooding the buffer; real ids are UUID-shaped (~36
 * chars) but staying lenient lets debug tooling pass through.
 *
 * NOTE: cross-field refinements (`from !== to`, `pieceId !== defenderId`)
 * live on `ChessCommandSchema` below, NOT on the per-variant object
 * schemas. Reason: zod v3's `z.discriminatedUnion` requires raw
 * `ZodObject` members and rejects `ZodEffects` (the type returned by
 * `.refine`). Centralizing the refinements on the union (via
 * `superRefine`) is functionally equivalent because every variant of
 * the union flows through the envelope's `tryParseChessCommandEnvelope`
 * — the only entry point on the wire boundary.
 */
export const ChessMoveCommandSchema = z
	.object({
		type: z.literal('chess_move'),
		pieceId: z.string().min(1).max(128),
		from: ChessBoardPositionSchema,
		to: ChessBoardPositionSchema,
	})
	.strict();

export type ChessMoveCommand = z.infer<typeof ChessMoveCommandSchema>;

/**
 * Capture envelope. `defenderId` is REDUNDANT with what `getPieceAt(to)`
 * would return on a synced board, but carrying it explicitly is
 * defense-in-depth: the receiver verifies the wire's claim against its
 * local roster, so a peer that tries to attack a defender id that
 * doesn't match the piece at `to` is rejected before any state mutation.
 *
 * Scope: instant-kill captures only. Non-instant captures use the sibling
 * `chess_combat_initiated` command so the receiver can route them into
 * the poker phase instead of direct capture resolution.
 */
export const ChessAttackCommandSchema = z
	.object({
		type: z.literal('chess_attack'),
		pieceId: z.string().min(1).max(128),
		from: ChessBoardPositionSchema,
		to: ChessBoardPositionSchema,
		defenderId: z.string().min(1).max(128),
	})
	.strict();

export type ChessAttackCommand = z.infer<typeof ChessAttackCommandSchema>;

/**
 * Non-instant capture envelope. Carries the same defensive ids as
 * `chess_attack`, but the discriminator tells receivers to stage poker
 * combat after the attack animation instead of executing an instant kill.
 */
export const ChessCombatInitiatedCommandSchema = z
	.object({
		type: z.literal('chess_combat_initiated'),
		pieceId: z.string().min(1).max(128),
		from: ChessBoardPositionSchema,
		to: ChessBoardPositionSchema,
		defenderId: z.string().min(1).max(128),
		compact: CompactChessCombatInitiatedSchema.optional(),
	})
	.strict();

export type ChessCombatInitiatedCommand = z.infer<typeof ChessCombatInitiatedCommandSchema>;

/**
 * Sum type for chess commands. Discriminated on `type` so consumers'
 * switch over `command.type` gets exhaustive checking from TypeScript —
 * forgetting a new variant breaks the typecheck instead of silently
 * dropping a category of moves.
 *
 * Kept as a RAW discriminated union (no `.superRefine` wrapper) so the
 * inferred type stays a true discriminated union. Wrapping in
 * `ZodEffects` would lose the discriminator narrowing at every consumer
 * (`if (cmd.type === 'chess_attack') cmd.defenderId` would fail to type
 * check). Cross-field refinements that span the variants live on
 * `ChessCommandEnvelopeSchema` instead — every legitimate variant flows
 * through the envelope at the wire boundary, so the validation point is
 * unchanged.
 */
export const ChessCommandSchema = z.discriminatedUnion('type', [
	ChessMoveCommandSchema,
	ChessAttackCommandSchema,
	ChessCombatInitiatedCommandSchema,
]);

export type ChessCommand = z.infer<typeof ChessCommandSchema>;

// ── Envelope ───────────────────────────────────────────────────────────────

export const ChessCommandEnvelopeSchema = z
	.object({
		type: z.literal('chess_command'),
		matchId: z.string().min(1).max(MAX_MATCH_ID_LENGTH),
		seq: z.number().int().nonnegative(),
		commandId: z.string().uuid(),
		// Both hashes are non-empty by default. Empty-string on the wire is a
		// well-known race signal (state pre-init, eager-WASM load) — the
		// receiver branches on length, treating empty as "retry later". The
		// schema accepts `''` so those well-formed retry envelopes pass parse;
		// the receiver enforces non-empty before comparing against local state.
		prevChessStateHash: z.string(),
		prevCardsStateHash: z.string(),
		command: ChessCommandSchema,
		signerPubkey: z.string().regex(/^[A-Za-z0-9_-]{43}$/).optional(),
		signature: z.string().regex(/^[A-Za-z0-9_-]{86}$/).optional(),
	})
	.strict()
	.superRefine((env, ctx) => {
		// Cross-field refinements live here (NOT on the inner command
		// schemas) so the discriminated union of `command` keeps narrowing
		// for downstream consumers. The envelope is the wire boundary;
		// every legitimate variant flows through here.
		const cmd = env.command;
		if (cmd.from.row === cmd.to.row && cmd.from.col === cmd.to.col) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `${cmd.type}: from and to must differ`,
				path: ['command', 'to'],
			});
		}
		if ((cmd.type === 'chess_attack' || cmd.type === 'chess_combat_initiated')
			&& cmd.pieceId === cmd.defenderId) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `${cmd.type}: pieceId and defenderId must differ`,
				path: ['command', 'defenderId'],
			});
		}
	});

export type ChessCommandEnvelope = z.infer<typeof ChessCommandEnvelopeSchema>;

/**
 * Narrow at the wire boundary. Returns the parsed envelope on success,
 * `null` on any validation failure — caller emits a single warn line and
 * drops the message. Throwing here would crash the message handler under
 * an attacker-controlled payload, so we return null and stay running.
 */
export function tryParseChessCommandEnvelope(input: unknown): ChessCommandEnvelope | null {
	const result = ChessCommandEnvelopeSchema.safeParse(input);
	return result.success ? result.data : null;
}

// ── Canonical side derivation ──────────────────────────────────────────────

/**
 * Canonical side type — same string union as `ChessPlayerSide`, intentionally
 * decoupled from the client types so the wire module remains free of client
 * imports. `'player'` is the GLOBAL first-mover side (decided at handshake);
 * `'opponent'` is the second-mover side. NOT viewer-relative — both peers
 * agree on which side is which.
 */
export type CanonicalChessSide = 'player' | 'opponent';

/**
 * Derive each peer's canonical side from the resolved match seed and their
 * role in the WS session. Trust-minimized: `matchSeed` comes from
 * commit-reveal, so first-char parity is unbiased. Convention is "first-mover
 * is `'player'` globally, plays first" — equivalent to white-moves-first in
 * traditional chess.
 *
 * Symmetry: for any seed, calling with `isHost=true` and `isHost=false` MUST
 * return opposite values. Property-tested in `chess.test.ts`.
 */
export function deriveCanonicalSide(matchSeed: string, isHost: boolean): CanonicalChessSide {
	if (matchSeed.length === 0) {
		throw new Error('deriveCanonicalSide: matchSeed must be non-empty');
	}
	const firstChar = matchSeed.charCodeAt(0);
	const seedBit = firstChar & 1;
	const hostBit = isHost ? 1 : 0;
	return (seedBit ^ hostBit) === 0 ? 'player' : 'opponent';
}

// ── Instant-kill predicate ────────────────────────────────────────────────

/**
 * String-literal union of chess piece types accepted by the predicate.
 * Decoupled from the client's `ChessPieceType` so this module stays in
 * `shared/` without dragging client types. Callers adapt at the boundary
 * (`{ attackerType: piece.type, defenderType: defender.type }`); if the
 * client union ever drifts, TypeScript reports the mismatch at the call
 * site instead of letting bad strings through.
 */
export type ChessAttackPieceKind = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king';

/**
 * Single source of truth for routing capture commands. Instant captures use
 * `chess_attack`; non-instant captures use `chess_combat_initiated` and enter
 * the poker/combat phase. Keeping the rule in one place guarantees sender and
 * receiver never disagree about which wire discriminator applies.
 *
 * Pieces with no deck (pawn, king) never enter poker.
 *   - Pawn attacker: Valkyrie execute, stays on chess (including vs king).
 *   - Pawn defender: no deck, dies on chess.
 *   - King defender: touching the commander wins; stays on chess.
 *   - King attacker: not a capture routing case — kings have no attacks.
 * Hero vs hero (N/B/R/Q) returns false and uses `chess_combat_initiated`.
 */
export function isChessAttackInstantKill(input: {
	readonly attackerType: ChessAttackPieceKind;
	readonly defenderType: ChessAttackPieceKind;
}): boolean {
	if (input.attackerType === 'king') return false;
	if (input.attackerType === 'pawn') return true;
	if (input.defenderType === 'pawn') return true;
	if (input.defenderType === 'king') return true;
	return false;
}
