/**
 * Wire-message schemas — runtime validation at the P2P trust boundary.
 *
 * Until TD-24a, the bridge cast incoming `data` to `P2PMessage` after only
 * checking that `data.type` was a string. A peer (malicious or buggy) could
 * deliver an envelope with the right discriminator but missing or malformed
 * scalars (commandId absent, prevStateHash a number, etc.). Handlers then
 * either crashed inside the queue try/catch (silent drop) or — worse for
 * `init`/`gameState` — installed corrupt state and propagated divergence.
 *
 * Policy: validate scalar/control fields strictly; opaque payloads
 * (`gameState`, `result`, `army`) are required to be objects but their
 * inner shape stays unmodelled. Downstream handlers already perform per-
 * field checks where they matter (game_command payload checks live in
 * `useWireSync.ts`).
 *
 * Why a per-type dispatcher instead of `z.discriminatedUnion`: the chess
 * envelope is `ZodEffects` (carries `.superRefine`), which `discriminated
 * Union` rejects. A `Record<string, ZodTypeAny>` keyed on `type` keeps
 * dispatch O(1) and accepts any zod schema variant.
 */

import { z } from 'zod';

import { ChessCommandEnvelopeSchema } from '@shared/p2p-wire/chess';
import { CompactPokerActionSchema, isPokerActionCompactConsistent } from '@shared/p2p-wire/combat';
import { DeckCardClaimsSchema } from '@shared/protocol-core/deckVerification';
import { CHALLENGE_SIGNATURE_ALGORITHM } from '@shared/p2pAvailability';

import type { P2PMessage } from './messages';

// ── Primitives ─────────────────────────────────────────────────────────────

const NonEmptyString = (max: number) => z.string().min(1).max(max);
const HashString = z.string().min(1).max(256);
const NonNegativeInt = z.number().int().nonnegative();
const PokerHpCommitment = z.number().int().min(0).max(500);
const PokerTurnDurationMs = z.number().int().min(1).max(300_000);

// `OpaqueObject` covers payloads we deliberately do not model (full game
// state, packaged match results, army selections). Requiring an object
// keeps handlers from crashing on `payload.x.y` access; the deeper shape
// is the handler's responsibility.
const OpaqueObject = z.record(z.unknown());

// ── Cards game command (host-auth, see PVP_WIRE_PROTOCOL §5) ───────────────

const PlayCardSchema = z.object({
	type: z.literal('play_card'),
	cardId: NonEmptyString(64),
	targetId: z.string().max(64).optional(),
	targetType: z.enum(['minion', 'hero']).optional(),
	insertionIndex: NonNegativeInt.optional(),
	payWithBlood: z.boolean().optional(),
}).strict();

const AttackSchema = z.object({
	type: z.literal('attack'),
	attackerId: NonEmptyString(64),
	defenderId: z.string().max(64).optional(),
}).strict();

const EndTurnSchema = z.object({
	type: z.literal('end_turn'),
}).strict();

const UseHeroPowerSchema = z.object({
	type: z.literal('use_hero_power'),
	targetId: z.string().max(64).optional(),
	targetType: z.enum(['card', 'hero']).optional(),
}).strict();

const WireGameCommandSchema = z.discriminatedUnion('type', [
	PlayCardSchema,
	AttackSchema,
	EndTurnSchema,
	UseHeroPowerSchema,
]);

const GameCommandEnvelopeSchema = z.object({
	type: z.literal('game_command'),
	matchId: NonEmptyString(64),
	seq: NonNegativeInt,
	commandId: NonEmptyString(128),
	prevStateHash: HashString,
	command: WireGameCommandSchema,
}).strict();

// ── Lifecycle / handshake ──────────────────────────────────────────────────

const InitSchema = z.object({
	type: z.literal('init'),
	gameState: OpaqueObject,
	isHost: z.boolean(),
	matchId: z.string().max(64).optional(),
}).strict();

const GameStateSchema = z.object({
	type: z.literal('gameState'),
	gameState: OpaqueObject,
}).strict();

const OpponentDisconnectedSchema = z.object({
	type: z.literal('opponentDisconnected'),
}).strict();

const PingSchema = z.object({ type: z.literal('ping') }).strict();
const PongSchema = z.object({ type: z.literal('pong') }).strict();

const DeckVerifySchema = z.object({
	type: z.literal('deck_verify'),
	hiveAccount: NonEmptyString(32),
	protocolVersion: z.literal(2),
	claims: DeckCardClaimsSchema,
}).strict();

// ── Commit-reveal seed (post-handshake symmetric chess derivation) ─────────

const SeedCommitSchema = z.object({
	type: z.literal('seed_commit'),
	commitment: HashString,
}).strict();

const SeedRevealSchema = z.object({
	type: z.literal('seed_reveal'),
	salt: NonEmptyString(256),
	hiveUsername: z.string().max(32).optional(),
}).strict();

const ArmyAnnouncementSchema = z.object({
	type: z.literal('army_announcement'),
	army: OpaqueObject,
}).strict();

// ── Result settlement (post-game broadcast) ────────────────────────────────

const ResultProposeSchema = z.object({
	type: z.literal('result_propose'),
	result: OpaqueObject,
	hash: HashString,
	broadcasterSig: NonEmptyString(512),
	proposalId: NonEmptyString(128),
}).strict();

const ResultCountersignSchema = z.object({
	type: z.literal('result_countersign'),
	counterpartySig: NonEmptyString(512),
	proposalId: NonEmptyString(128),
}).strict();

const ResultRejectSchema = z.object({
	type: z.literal('result_reject'),
	reason: NonEmptyString(256),
}).strict();

// ── Integrity probes ───────────────────────────────────────────────────────

const VersionCheckSchema = z.object({
	type: z.literal('version_check'),
	buildHash: NonEmptyString(128),
}).strict();

const WasmHashCheckSchema = z.object({
	type: z.literal('wasm_hash_check'),
	wasmHash: NonEmptyString(128),
}).strict();

const HashCheckSchema = z.object({
	type: z.literal('hash_check'),
	stateHash: HashString,
	// `chessStateHash` covers the chess board domain (TD-27c-chess F3). May be
	// the empty string under the documented well-known races (no chess phase
	// yet, eager-WASM load) — receiver tolerates empty by treating it as
	// "skip chess check this beacon", same policy as the per-envelope path.
	chessStateHash: z.string(),
	// Chess `moveCount` of the snapshot that produced `chessStateHash`. The
	// beacon fires every 2s; in active play the snapshot is ~always stale by
	// the time it lands on the peer (in-flight envelopes change moveCount
	// faster than 2s). Receiver skips the chess hash compare when its local
	// moveCount differs — beacon's anti-cheat purpose is idle-drift detection,
	// where both peers are stable on the same moveCount and the compare is
	// meaningful. -1 sentinel = "no chess snapshot available" (early game,
	// pre-WASM); receiver treats same as empty hash.
	chessMoveCount: z.number().int().min(-1),
	turnNumber: NonNegativeInt,
}).strict();

const HashMismatchSchema = z.object({
	type: z.literal('hash_mismatch'),
	turnNumber: NonNegativeInt,
	myHash: HashString,
}).strict();

// ── Poker (host-auth — see OPEN-4) ─────────────────────────────────────────

const PokerActionSchema = z.object({
	type: z.literal('poker_action'),
	playerId: NonEmptyString(128),
	action: z.enum(['attack', 'counter', 'engage', 'brace', 'defend']),
	hpCommitment: PokerHpCommitment.optional(),
	compact: CompactPokerActionSchema.optional(),
	turnId: NonEmptyString(256).optional(),
	decisionId: NonEmptyString(256),
	sentAtMs: NonNegativeInt.optional(),
}).strict().superRefine((message, ctx) => {
	if (!message.compact) return;
	if (isPokerActionCompactConsistent({
		action: message.action,
		hpCommitment: message.hpCommitment,
		compact: message.compact,
	})) return;
	ctx.addIssue({
		code: z.ZodIssueCode.custom,
		path: ['compact'],
		message: 'compact poker tuple must match legacy action fields',
	});
});

const PokerTurnStartedSchema = z.object({
	type: z.literal('poker_turn_started'),
	combatId: NonEmptyString(128),
	turnId: NonEmptyString(256),
	phase: z.enum(['pre_flop', 'faith', 'foresight', 'destiny']),
	activePlayerId: NonEmptyString(128),
	actionsThisRound: NonNegativeInt,
	durationMs: PokerTurnDurationMs,
	remainingMs: PokerTurnDurationMs.optional(),
	sentAtMs: NonNegativeInt,
}).strict();

// ── Heartbeat (peerStore-level keepalive) ──────────────────────────────────

const HeartbeatSchema = z.object({
	type: z.literal('heartbeat'),
	t: NonNegativeInt,
}).strict();

// ── Phase 0 protocol-v2 envelopes (ADR 0004 §Decision.6) ───────────────────
//
// Schema-only entries; handlers ship in issues 02 / 03 / 06. The outer
// scalars are validated strictly. The `action` payload on `action_envelope`
// stays `unknown` here: per-action validation is owned by the signed-
// transcript builder (issue 03) so this layer cannot pre-narrow it without
// pinning the wire to a single action shape.

// Hex-encoded Ed25519 pubkey (32 bytes → 64 hex chars). Accept a slightly
// wider range to leave room for base64url variants if a future issue
// changes encoding; the exact format is locked when issue 02 lands.
const PubkeyString = z.string().min(32).max(256);

// Hive Keychain requestSignBuffer returns a hex signature. We don't decode
// here, only require non-empty + reasonable cap.
const HiveSigString = NonEmptyString(512);

const SessionAuthorizeSchema = z.object({
	type: z.literal('session_authorize'),
	matchId: NonEmptyString(64),
	ephemeralPubkey: PubkeyString,
	hiveSig: HiveSigString,
	matchChallenge: z.object({
		from: NonEmptyString(32),
		to: NonEmptyString(32),
		peerId: NonEmptyString(64),
		timestamp: z.number().int().nonnegative(),
		expiresAt: z.number().int().nonnegative(),
		nonce: z.string().min(16).max(80),
		sigAlg: z.literal(CHALLENGE_SIGNATURE_ALGORITHM),
		serverSig: z.string().regex(/^[a-f0-9]{64}$/),
	}).strict().optional(),
}).strict();

const SessionRenewalSchema = z.object({
	type: z.literal('session_renewal'),
	matchId: NonEmptyString(64),
	newPubkey: PubkeyString,
	hiveSig: HiveSigString,
}).strict();

const SessionResumedSchema = z.object({
	type: z.literal('session_resumed'),
	matchId: NonEmptyString(64),
	lastSeenStateHash: HashString,
}).strict();

const StateSyncRequestSchema = z.object({
	type: z.literal('state_sync_request'),
	matchId: NonEmptyString(64),
	fromTurn: NonNegativeInt,
}).strict();

// `action` is intentionally `unknown` — issue 03 owns the per-action schema
// and we must not narrow it on the wire boundary. The required-ness check
// rejects `undefined` so the field cannot be silently dropped over the wire.
const ActionEnvelopeSchema = z.object({
	type: z.literal('action_envelope'),
	matchId: NonEmptyString(64),
	seq: NonNegativeInt,
	prevHash: HashString,
	action: z.unknown().refine((v) => v !== undefined, {
		message: 'action_envelope.action required (validated by issue 03)',
	}),
	sig: NonEmptyString(512),
}).strict();

// ── Dispatch table ─────────────────────────────────────────────────────────

const SCHEMA_BY_TYPE = {
	game_command: GameCommandEnvelopeSchema,
	chess_command: ChessCommandEnvelopeSchema,
	init: InitSchema,
	gameState: GameStateSchema,
	opponentDisconnected: OpponentDisconnectedSchema,
	ping: PingSchema,
	pong: PongSchema,
	deck_verify: DeckVerifySchema,
	seed_commit: SeedCommitSchema,
	seed_reveal: SeedRevealSchema,
	army_announcement: ArmyAnnouncementSchema,
	result_propose: ResultProposeSchema,
	result_countersign: ResultCountersignSchema,
	result_reject: ResultRejectSchema,
	version_check: VersionCheckSchema,
	wasm_hash_check: WasmHashCheckSchema,
	hash_check: HashCheckSchema,
	hash_mismatch: HashMismatchSchema,
	poker_action: PokerActionSchema,
	poker_turn_started: PokerTurnStartedSchema,
	heartbeat: HeartbeatSchema,
	session_authorize: SessionAuthorizeSchema,
	session_renewal: SessionRenewalSchema,
	session_resumed: SessionResumedSchema,
	state_sync_request: StateSyncRequestSchema,
	action_envelope: ActionEnvelopeSchema,
} as const satisfies Record<P2PMessage['type'], z.ZodTypeAny>;

export type WireMessageType = keyof typeof SCHEMA_BY_TYPE;

// Compile-time parity guard: every `P2PMessage` discriminant must appear in
// the dispatch table, and the table must not introduce extras. The
// `satisfies` above enforces the second direction; this checks the first.
type _Coverage = P2PMessage['type'] extends WireMessageType ? true : never;
const _coverage: _Coverage = true;
void _coverage;

/**
 * Validate a payload received over the P2P transport. Returns the typed
 * message on success, `null` on any validation failure (caller logs and
 * drops). Never throws — a buggy or hostile peer must not crash the loop.
 */
export function parseWireMessage(input: unknown): P2PMessage | null {
	if (!input || typeof input !== 'object') return null;
	const candidate = (input as { type?: unknown }).type;
	if (typeof candidate !== 'string') return null;
	const schema = SCHEMA_BY_TYPE[candidate as WireMessageType];
	if (!schema) return null;
	const result = schema.safeParse(input);
	return result.success ? (result.data as P2PMessage) : null;
}
