/**
 * Pure derivation helpers. Computed from MatchContext, never branched
 * on by reading stores directly. Every conditional that previously
 * looked like `if (isCampaign)` lives here as a function with one body.
 *
 * These helpers are NEUTRAL with respect to DATA FLOW — they take a
 * MatchContext as input and return a generic shape (Authority, an
 * ArmySelection, an IntroSpec, …). They do not read Zustand stores
 * directly nor branch on global state.
 *
 * They DO import from match/modes/<X>/ — derived.ts is the dispatcher
 * layer that knows about each mode and routes the request. The mode
 * isolation rule (Fase 6 ESLint) prohibits modes/X/ from importing
 * modes/Y/, but match/ root files (types/store/derived) are explicitly
 * allowed to know about each mode for dispatching.
 *
 * Phase ownership:
 *   - deriveAuthority, deriveOpponentArmyForMode, deriveIntro, deriveIWonForPhase.
 *   - deriveMatchFlowPolicy compresses single / campaign / p2p flow facts.
 */

import { buildCampaignArmy } from '../campaign/campaignArmyBuilder';
import type { CampaignChapter, CampaignMission, Difficulty } from '../campaign/campaignTypes';
import { getDefaultArmySelection } from '../data/ChessPieceConfig';
import type { ArmySelection } from '../types/ChessTypes';
import type { AiStyle, MatchContext, ScriptPayload } from './types';

// ── Authority ─────────────────────────────────────────────────────────────

export type Authority =
	| { kind: 'local' }
	| { kind: 'p2p-symmetric'; myRole: 'first-mover' | 'second-mover' };

/**
 * Authority is who decides truth for this match. Derived from the
 * opponent kind: peer opponent ⇒ symmetric P2P; ai/scripted ⇒ local.
 * There is intentionally no representation for the impossible state
 * `{opponent: peer, authority: local}` — a peer match cannot be
 * locally authoritative.
 */
export function deriveAuthority(ctx: MatchContext): Authority {
	if (ctx.opponent.kind === 'peer') {
		return { kind: 'p2p-symmetric', myRole: ctx.opponent.myRole };
	}
	return { kind: 'local' };
}

// ── Opponent army ─────────────────────────────────────────────────────────

/**
 * Selects the opponent's army from the appropriate mode module.
 * Returns null for peer opponents — those receive their army via the
 * P2P wire (caller passes opponentArmyProp explicitly), so deriving
 * locally would be wrong.
 *
 * Coordinator pattern:
 *   const army = opponentArmyProp ?? deriveOpponentArmyForMode(ctx) ?? defaultArmy
 *
 * The opponentArmyProp wins for the P2P case; the derive path
 * handles ai/scripted; the default fallback covers the first-render
 * window where ctx is still null.
 */
export function deriveOpponentArmyForMode(ctx: MatchContext): ArmySelection | null {
	switch (ctx.opponent.kind) {
		case 'ai':
			// Single today: AI uses the default piece roster regardless of
			// difficulty/style. Difficulty/style can alter decision profile,
			// while deckSource affects deck composition, not piece composition.
			return getDefaultArmySelection();
		case 'scripted':
			if (ctx.opponent.script.kind !== 'campaign-mission') return null;
			return buildCampaignArmy(ctx.opponent.script.mission);
		case 'peer':
			return null;
	}
}

// ── Did-I-win? frame-aware derivation ─────────────────────────────────────

/**
 * Discriminated input to `deriveIWonForPhase`. The `kind` tag forces the
 * caller to declare which engine emitted the `winner` field, because
 * cards and chess use DIFFERENT coordinate systems for their winner:
 *
 *   - Cards: VIEWER-RELATIVE. `gameState.winner` is post-flip on the
 *     joiner side (see `engine/wireHash.ts:flipGameState`); on every
 *     peer `'player'` means "I won". The frame is local — comparing
 *     across peers requires re-flipping.
 *
 *   - Chess: CANONICAL. The chess winner is the global first-mover or
 *     second-mover, identical on both peers. Translating to "I won"
 *     requires matching against `myCanonicalSide`.
 *
 * Mixing these frames silently mis-attributes victory ~50% of the time
 * in P2P (the host/joiner pair flips on cards but not on chess). This
 * helper is the single source of truth for the comparison rule.
 */
export type WinnerSignal =
	| { kind: 'cards'; viewerWinner: 'player' | 'opponent' }
	| { kind: 'chess'; canonicalWinner: 'player' | 'opponent'; myCanonicalSide: 'player' | 'opponent' };

/**
 * Derive whether the local player won, given a winner emitted by either
 * the cards engine (viewer-relative) or the chess engine (canonical).
 * Pure: same input → same output, no store reads.
 */
export function deriveIWonForPhase(signal: WinnerSignal): boolean {
	switch (signal.kind) {
		case 'cards':
			return signal.viewerWinner === 'player';
		case 'chess':
			return signal.canonicalWinner === signal.myCanonicalSide;
	}
}

// ── Intro spec ────────────────────────────────────────────────────────────

/**
 * What pre-match presentation the coordinator should mount.
 *
 * Today the only non-trivial intro is the campaign chapter cinematic
 * that plays the FIRST time the player visits a chapter. Other modes
 * (single, P2P) skip straight into match setup. Future: VS screen for
 * P2P, mission-brief for tutorials, etc. — slot into this union.
 */
export type IntroSpec =
	| { kind: 'cinematic'; chapter: CampaignChapter; mission: CampaignMission }
	| { kind: 'none' };

/**
 * Decide what intro to play given the match context and the player's
 * already-seen chapters.
 *
 * Cinematic gate (replaces the coordinator's `hasCinematic` derivation):
 *   - Opponent must be a campaign-mission script.
 *   - The mission's chapter must declare a `cinematicIntro`.
 *   - The chapter must NOT yet be in `seenChapterIds` for this player.
 *
 * Anything else collapses to `{ kind: 'none' }`. The coordinator
 * mounts the CinematicPhase iff `intro.kind === 'cinematic'`.
 */
export function deriveIntro(
	ctx: MatchContext,
	seenChapterIds: readonly string[],
): IntroSpec {
	if (ctx.opponent.kind !== 'scripted') return { kind: 'none' };
	if (ctx.opponent.script.kind !== 'campaign-mission') return { kind: 'none' };
	const { chapter, mission } = ctx.opponent.script;
	if (!chapter.cinematicIntro) return { kind: 'none' };
	if (seenChapterIds.includes(chapter.id)) return { kind: 'none' };
	return { kind: 'cinematic', chapter, mission };
}

// ── Playable match mode + flow policy ─────────────────────────────────────

/**
 * Alfa playable modes. `single` is the local AI match (route `/game/single`).
 * Chess and poker rules are shared; only flow differs.
 */
export type PlayableMatchMode = 'single' | 'campaign' | 'p2p';

export type CampaignMatchScript = Extract<ScriptPayload, { kind: 'campaign-mission' }>;

export type RestartDestination =
	| { kind: 'campaign-map' }
	| { kind: 'warband'; intent: 'single' | 'multiplayer' };

export type LocalAiProfile = {
	readonly difficulty: Difficulty;
	readonly style: AiStyle;
	readonly behaviorProfile: 'single' | 'campaign';
};

/**
 * Compressed flow facts for one MatchContext. Callers read this instead of
 * reconstructing `isCampaign` / `isP2PConnected` from opponent.kind.
 */
export type MatchFlowPolicy = {
	readonly mode: PlayableMatchMode;
	readonly authority: Authority;
	readonly usesPeerPhaseCheckpoint: boolean;
	readonly usesLocalAi: boolean;
	readonly bootstrapsWarband: boolean;
	readonly requiresWarbandArmy: boolean;
	readonly campaign: CampaignMatchScript | null;
	readonly restartDestination: RestartDestination;
	readonly localAi: LocalAiProfile | null;
};

export function derivePlayableMatchMode(ctx: MatchContext): PlayableMatchMode {
	switch (ctx.opponent.kind) {
		case 'ai':
			return 'single';
		case 'scripted':
			return 'campaign';
		case 'peer':
			return 'p2p';
	}
}

export function deriveCampaignMatch(ctx: MatchContext): CampaignMatchScript | null {
	if (ctx.opponent.kind !== 'scripted') return null;
	if (ctx.opponent.script.kind !== 'campaign-mission') return null;
	return ctx.opponent.script;
}

export function deriveLocalAiProfile(ctx: MatchContext): LocalAiProfile | null {
	switch (ctx.opponent.kind) {
		case 'peer':
			return null;
		case 'ai':
			return {
				difficulty: ctx.opponent.difficulty,
				style: ctx.opponent.style ?? 'balanced',
				behaviorProfile: 'single',
			};
		case 'scripted':
			return {
				difficulty: campaignScriptDifficulty(ctx.opponent.script),
				style: 'balanced',
				behaviorProfile: 'campaign',
			};
	}
}

function campaignScriptDifficulty(script: ScriptPayload): Difficulty {
	return script.kind === 'campaign-mission' ? script.difficulty : 'normal';
}

export function deriveMatchFlowPolicy(ctx: MatchContext): MatchFlowPolicy {
	const mode = derivePlayableMatchMode(ctx);
	const authority = deriveAuthority(ctx);
	return {
		mode,
		authority,
		usesPeerPhaseCheckpoint: authority.kind === 'p2p-symmetric',
		usesLocalAi: authority.kind === 'local',
		bootstrapsWarband: mode === 'single',
		requiresWarbandArmy: mode !== 'campaign',
		campaign: deriveCampaignMatch(ctx),
		restartDestination: restartDestinationFor(mode),
		localAi: deriveLocalAiProfile(ctx),
	};
}

function restartDestinationFor(mode: PlayableMatchMode): RestartDestination {
	if (mode === 'campaign') return { kind: 'campaign-map' };
	return {
		kind: 'warband',
		intent: mode === 'p2p' ? 'multiplayer' : 'single',
	};
}
