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
import { ActionAppliedSchema } from '@shared/p2p-wire/delivery';
import { TransitionReceiptMessageSchema } from '@shared/p2p-wire/integrity';
import {
	PhaseCheckpointCommitSchema,
	PhaseCheckpointDisputeSchema,
	PhaseCheckpointProposalSchema,
} from '@shared/p2p-wire/phaseCheckpoint';
import {
	PokerTurnClockProposalSchema,
	PokerTurnNotaryCommitSchema,
	PokerTurnNotaryDisputeSchema,
} from '@shared/p2p-wire/pokerTimeNotary';
import {
	DeckCardClaimsSchema,
	MAX_WARBAND_DECK_CARDS,
} from '@shared/protocol-core/deckVerification';
import {
	CHALLENGE_SIGNATURE_ALGORITHM,
	MAX_MATCH_ID_LENGTH,
} from '@shared/p2pAvailability';

import type { P2PMessage } from './messages';
import type { P2PLogicalClock } from '@shared/p2p-wire/p2pCompetitionLifecycle';
import {
	GAME_STATE_WIRE_CODEC,
	MAX_COMPRESSED_GAME_STATE_BASE64URL_CHARS,
} from './stateFrameCodec';

// ── Primitives ─────────────────────────────────────────────────────────────

const NonEmptyString = (max: number) => z.string().min(1).max(max);
// Keep every game-wire envelope aligned with the server-issued match identity
// contract. Quick Match currently joins two UUID peer ids, but direct matches
// may legitimately use any identity within the shared canonical bound.
const MatchIdString = NonEmptyString(MAX_MATCH_ID_LENGTH);
const HashString = z.string().min(1).max(256);
const NonNegativeInt = z.number().int().nonnegative();
const PokerHpCommitment = z.number().int().min(0).max(500);

// `OpaqueObject` covers payloads we deliberately do not model (full game
// state, packaged match results, army selections). Requiring an object
// keeps handlers from crashing on `payload.x.y` access; the deeper shape
// is the handler's responsibility.
const OpaqueObject = z.record(z.unknown());
const Base64UrlPayload = z.string()
	.min(1)
	.max(MAX_COMPRESSED_GAME_STATE_BASE64URL_CHARS)
	.regex(/^[A-Za-z0-9_-]+$/);

// ── Cards game command (symmetric apply; see PVP_WIRE_PROTOCOL §5) ─────────

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

const GrantPokerHandRewardsSchema = z.object({
	type: z.literal('grant_poker_hand_rewards'),
	combatId: NonEmptyString(128),
	handIndex: NonNegativeInt,
	rewardId: NonEmptyString(128),
	wagerDrawPlayer: NonNegativeInt,
	wagerDrawOpponent: NonNegativeInt,
	wagerAoeDamagePlayer: NonNegativeInt,
	wagerAoeDamageOpponent: NonNegativeInt,
	allInShowdown: z.boolean(),
}).strict();

const UseHeroPowerSchema = z.object({
	type: z.literal('use_hero_power'),
	targetId: z.string().max(64).optional(),
	targetType: z.enum(['card', 'hero']).optional(),
}).strict();

const FrontlineAttackSchema = z.object({
	type: z.literal('frontline_attack'),
	mode: z.enum(['minion', 'hero']),
	actionId: NonEmptyString(128),
}).strict();

const NorseHeroPowerSchema = z.object({
	type: z.literal('norse_hero_power'),
	norseHeroId: NonEmptyString(128),
	targetId: z.string().max(128).optional(),
	targetType: z.enum(['minion', 'hero']).optional(),
	actionId: NonEmptyString(128),
}).strict();

const WeaponUpgradeSchema = z.object({
	type: z.literal('weapon_upgrade'),
	norseHeroId: NonEmptyString(128),
	actionId: NonEmptyString(128),
}).strict();

const ToggleMulliganCardSchema = z.object({
	type: z.literal('toggle_mulligan_card'),
	cardId: NonEmptyString(64),
}).strict();

const ConfirmMulliganSchema = z.object({
	type: z.literal('confirm_mulligan'),
}).strict();

const SkipMulliganSchema = z.object({
	type: z.literal('skip_mulligan'),
}).strict();

// Discovery options are resolved against the receiver's already-synchronised
// option list. The card payload is carried for backwards-compatible local
// dispatch, but it is never trusted as gameplay authority; the canonical
// engine matches only its `id` against `state.discovery.options`.
const DiscoveryCardSchema = z.object({
	id: z.union([z.string().min(1).max(128), z.number().finite()]),
	name: z.string().min(1).max(256),
	type: z.string().min(1).max(32),
}).passthrough();

const SelectDiscoveryOptionSchema = z.object({
	type: z.literal('select_discovery_option'),
	card: z.union([DiscoveryCardSchema, z.null()]),
}).strict();

const WireGameCommandSchema = z.discriminatedUnion('type', [
	PlayCardSchema,
	AttackSchema,
	EndTurnSchema,
	GrantPokerHandRewardsSchema,
	UseHeroPowerSchema,
	FrontlineAttackSchema,
	NorseHeroPowerSchema,
	WeaponUpgradeSchema,
	ToggleMulliganCardSchema,
	ConfirmMulliganSchema,
	SkipMulliganSchema,
	SelectDiscoveryOptionSchema,
]);

const GameCommandEnvelopeSchema = z.object({
	type: z.literal('game_command'),
	matchId: MatchIdString,
	seq: NonNegativeInt,
	commandId: NonEmptyString(128),
	prevStateHash: HashString,
	command: WireGameCommandSchema,
	// Optional at the parser boundary so legacy/manual envelopes are dropped by
	// the session-authority gate rather than crashing the decoder. Active
	// matches must provide both fields before the engine is allowed to mutate.
	signerPubkey: z.string().regex(/^[A-Za-z0-9_-]{43}$/).optional(),
	signature: z.string().regex(/^[A-Za-z0-9_-]{86}$/).optional(),
}).strict();

// ── Lifecycle / handshake ──────────────────────────────────────────────────

const InitSchema = z.union([
	z.object({
		type: z.literal('init'),
		gameState: OpaqueObject,
		isHost: z.boolean(),
		matchId: z.string().max(128).optional(),
	}).strict(),
	z.object({
		type: z.literal('init'),
		stateCodec: z.literal(GAME_STATE_WIRE_CODEC),
		compressedGameState: Base64UrlPayload,
		isHost: z.boolean(),
		matchId: z.string().max(128).optional(),
	}).strict(),
]);

const GameStateSchema = z.union([
	z.object({
		type: z.literal('gameState'),
		gameState: OpaqueObject,
	}).strict(),
	z.object({
		type: z.literal('gameState'),
		stateCodec: z.literal(GAME_STATE_WIRE_CODEC),
		compressedGameState: Base64UrlPayload,
	}).strict(),
]);

const OpponentDisconnectedSchema = z.object({
	type: z.literal('opponentDisconnected'),
}).strict();

const P2PLeaveSchema = z.object({
	type: z.literal('p2p_leave'),
	matchId: MatchIdString,
	participantId: NonEmptyString(128),
	eventId: NonEmptyString(128),
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

const CardsDeckSchema = z.object({
	type: z.literal('cards_deck'),
	heroClass: NonEmptyString(32),
	heroId: z.string().max(64).optional(),
	cardIds: z.array(z.number().int().nonnegative()).max(MAX_WARBAND_DECK_CARDS),
	nftLevels: z.array(z.object({
		cardId: z.number().int().nonnegative(),
		level: z.number().int().min(1).max(100),
	}).strict()).max(MAX_WARBAND_DECK_CARDS),
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

const P2PLogicalClockSchema = z.object({
	canonicalOrder: NonNegativeInt,
	chessRevision: NonNegativeInt,
	cardsRevision: NonNegativeInt,
	pokerRevision: NonNegativeInt,
}).strict() satisfies z.ZodType<P2PLogicalClock>;

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
	// Optional for backwards-compatible direct rooms. When present these
	// counters let the receiver ignore a beacon that crossed a game_command
	// application window even when both peers are still on the same turn.
	sentCommandSeq: z.number().int().min(-1).optional(),
	receivedCommandSeq: z.number().int().min(-1).optional(),
	logicalClock: P2PLogicalClockSchema.optional(),
}).strict();

const HashMismatchSchema = z.object({
	type: z.literal('hash_mismatch'),
	turnNumber: NonNegativeInt,
	myHash: HashString,
}).strict();

const PokerHashCheckSchema = z.object({
	type: z.literal('poker_hash_check'),
	pokerStateHash: HashString,
	phase: z.enum(['pre_flop', 'faith', 'foresight', 'destiny']),
	turnId: NonEmptyString(256),
	actionsThisRound: NonNegativeInt,
	logicalClock: P2PLogicalClockSchema.optional(),
}).strict();

// ── Poker (symmetric apply — see OPEN-4 / PVP_WIRE_PROTOCOL §5) ────────────

const PokerActionSchema = z.object({
	type: z.literal('poker_action'),
	playerId: NonEmptyString(128),
	action: z.enum(['attack', 'counter', 'engage', 'brace', 'defend']),
	origin: z.enum(['player', 'timeout']),
	hpCommitment: PokerHpCommitment.optional(),
	compact: CompactPokerActionSchema.optional(),
	turnId: NonEmptyString(256),
	decisionId: NonEmptyString(256),
	seq: NonNegativeInt.optional(),
	prevStateHash: HashString.optional(),
	signerPubkey: z.string().regex(/^[A-Za-z0-9_-]{43}$/).optional(),
	signature: z.string().regex(/^[A-Za-z0-9_-]{86}$/).optional(),
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

const PokerTurnStartedSchema = PokerTurnClockProposalSchema;

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

const MatchAcceptanceV1Schema = z.object({
	protocol: z.literal('ragnarok-match-accept-v1'),
	offerId: NonEmptyString(128),
	matchId: MatchIdString,
	account: NonEmptyString(32).optional(),
	peerId: NonEmptyString(64),
	opponentAccount: NonEmptyString(32).optional(),
	opponentPeerId: NonEmptyString(64),
	ephemeralPubkey: PubkeyString,
	rulesetHash: NonEmptyString(256),
	engineHash: NonEmptyString(256),
	serverNonce: NonEmptyString(128),
	expiresAt: z.number().int().positive(),
	hiveSig: HiveSigString.optional(),
}).strict();

const MatchAcceptanceV2Schema = z.object({
	protocol: z.literal('ragnarok-match-accept-v2'),
	offerId: NonEmptyString(128),
	matchId: MatchIdString,
	account: NonEmptyString(32).optional(),
	peerId: NonEmptyString(64),
	opponentAccount: NonEmptyString(32).optional(),
	opponentPeerId: NonEmptyString(64),
	ephemeralPubkey: PubkeyString,
	rulesetHash: NonEmptyString(256),
	engineHash: NonEmptyString(256),
	serverNonce: NonEmptyString(128),
	expiresAt: z.number().int().positive(),
	delegationId: NonEmptyString(128),
	sessionSig: z.string().regex(/^[A-Za-z0-9_-]{86}$/),
}).strict();

const MatchAcceptanceProofSchema = z.union([MatchAcceptanceV1Schema, MatchAcceptanceV2Schema]);

const MatchmakingDelegationProofSchema = z.object({
	protocol: z.literal('ragnarok-matchmaking-delegation-v1'),
	delegationId: NonEmptyString(128),
	account: NonEmptyString(32),
	peerId: NonEmptyString(64),
	ephemeralPubkey: PubkeyString,
	rulesetHash: NonEmptyString(256),
	engineHash: NonEmptyString(256),
	serverNonce: NonEmptyString(128),
	issuedAt: z.number().int().positive(),
	expiresAt: z.number().int().positive(),
	hiveSig: HiveSigString,
}).strict();

const SessionAuthorizeSchema = z.object({
	type: z.literal('session_authorize'),
	// Quick Match room ids are composed from both 36-character peer ids.
	// Keep this aligned with the acceptance and battle-ready envelopes so a
	// valid authorization is not silently dropped at the receiving boundary.
	matchId: MatchIdString,
	ephemeralPubkey: PubkeyString,
	hiveSig: HiveSigString.optional(),
	acceptance: MatchAcceptanceProofSchema.optional(),
	delegation: MatchmakingDelegationProofSchema.optional(),
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
}).strict().superRefine((value, ctx) => {
	if (value.acceptance?.protocol === 'ragnarok-match-accept-v2' && !value.delegation) {
		ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['delegation'], message: 'V2 acceptance requires its Hive delegation' });
	}
});

const BattleReadyDebugSchema = z.object({
	chessHash: NonEmptyString(256),
	cardsHash: NonEmptyString(256),
	matchSeedHash: NonEmptyString(256),
	localLoadoutHash: NonEmptyString(256),
	remoteLoadoutHash: NonEmptyString(256),
}).strict();

const BattleReadySchema = z.object({
	type: z.literal('battle_ready_v1'),
	matchId: MatchIdString,
	engineHash: NonEmptyString(256),
	rulesetHash: NonEmptyString(256),
	loadoutHash: NonEmptyString(256),
	initialStateRoot: NonEmptyString(256),
	debug: BattleReadyDebugSchema.optional(),
}).strict();

const SessionRenewalSchema = z.object({
	type: z.literal('session_renewal'),
	matchId: MatchIdString,
	newPubkey: PubkeyString,
	hiveSig: HiveSigString,
}).strict();

const SessionResumedSchema = z.object({
	type: z.literal('session_resumed'),
	matchId: MatchIdString,
	lastSeenStateHash: HashString,
}).strict();

const StateSyncRequestSchema = z.object({
	type: z.literal('state_sync_request'),
	matchId: MatchIdString,
	fromTurn: NonNegativeInt,
	fromCommandSeq: NonNegativeInt.optional(),
}).strict();

// `action` is intentionally `unknown` — issue 03 owns the per-action schema
// and we must not narrow it on the wire boundary. The required-ness check
// rejects `undefined` so the field cannot be silently dropped over the wire.
const ActionEnvelopeSchema = z.object({
	type: z.literal('action_envelope'),
	matchId: MatchIdString,
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
	transition_receipt_v1: TransitionReceiptMessageSchema,
	phase_checkpoint_propose_v1: PhaseCheckpointProposalSchema,
	phase_checkpoint_commit_v1: PhaseCheckpointCommitSchema,
	phase_checkpoint_dispute_v1: PhaseCheckpointDisputeSchema,
	init: InitSchema,
	gameState: GameStateSchema,
	opponentDisconnected: OpponentDisconnectedSchema,
	p2p_leave: P2PLeaveSchema,
	ping: PingSchema,
	pong: PongSchema,
	deck_verify: DeckVerifySchema,
	seed_commit: SeedCommitSchema,
	seed_reveal: SeedRevealSchema,
	army_announcement: ArmyAnnouncementSchema,
	cards_deck: CardsDeckSchema,
	result_propose: ResultProposeSchema,
	result_countersign: ResultCountersignSchema,
	result_reject: ResultRejectSchema,
	version_check: VersionCheckSchema,
	wasm_hash_check: WasmHashCheckSchema,
	battle_ready_v1: BattleReadySchema,
	hash_check: HashCheckSchema,
	poker_hash_check: PokerHashCheckSchema,
	hash_mismatch: HashMismatchSchema,
	poker_action: PokerActionSchema,
	action_applied_v1: ActionAppliedSchema,
	poker_turn_started: PokerTurnStartedSchema,
	poker_turn_notary_commit_v1: PokerTurnNotaryCommitSchema,
	poker_turn_notary_dispute_v1: PokerTurnNotaryDisputeSchema,
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
