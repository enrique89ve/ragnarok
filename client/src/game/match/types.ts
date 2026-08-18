/**
 * MatchContext — single source of truth for "what game is this".
 *
 * Why this file exists:
 *   The coordinator (RagnarokGameCoordinator) historically branched on
 *   `isCampaign` / `isP2PConnected` / truthy-`matchSeed` scattered across
 *   the file. Each new mode forced a new condition; cross-mode bugs
 *   (e.g. campaign reward dispatched from a P2P match) were caught only
 *   by code review.
 *
 *   This module replaces those scattered flags with a single
 *   discriminated value built BEFORE the coordinator mounts. The
 *   coordinator becomes mode-agnostic — it reads ctx + helpers, never
 *   conditionals on store state.
 *
 * Design rules (locked in grilling session 2026-05-04):
 *   1. Two PRIMITIVE axes: opponent (who plays the other side) and
 *      reward (what victory gives). Authority, army provider, intro,
 *      phase composition all DERIVE from these two — see derived.ts.
 *   2. Each public mode (single / campaign / p2p) is a function-pure
 *      resolver in match/modes/<mode>/resolver.ts. The resolver body
 *      IS the "intentionality" of the mode — read it to know what the
 *      mode means in this game.
 *   3. Mode modules are physically separated and ESLint-enforced.
 *      modes/X cannot import from modes/Y. Only neutral surface
 *      (types.ts, store.ts, derived.ts) is shared.
 *   4. MatchContext is complete-or-nothing: built before coordinator
 *      mount. No nullable fields, no progressive population. Async
 *      flows (P2P handshake) live in a separate <MatchSetup/> wrapper.
 */

import type { CampaignChapter, CampaignMission, Difficulty } from '../campaign/campaignTypes';

// ── Identity ──────────────────────────────────────────────────────────────

/**
 * Match identity — present on every match regardless of mode. Created
 * by the resolver, consumed by the rest of the system (game logic,
 * shared deck, wire envelopes, transcript). Replaces the three places
 * that today invent their own matchId:
 *   - sharedDeckStore: `match_${Date.now()}`
 *   - useWireSync: derived from sorted peer IDs
 *   - peerStore: matchmaking-room id
 */
export interface MatchIdentity {
	matchId: string;
	matchSeed: string;
}

// ── Opponent ──────────────────────────────────────────────────────────────

export type AiStyle = 'balanced' | 'aggressive' | 'defensive' | 'human';

export interface AiOpponent {
	kind: 'ai';
	/** Optional behavior profile used only by local/AI chess games. */
	style?: AiStyle;
	difficulty: Difficulty;
	deckSource: 'warband' | 'default';
}

export interface ScriptedOpponent {
	kind: 'scripted';
	script: ScriptPayload;
}

/**
 * What the scripted opponent runs. Today only campaign-mission; future
 * tutorial and puzzle slot in here without changing OpponentSpec or
 * any caller that already handles `kind: 'scripted'`.
 *
 * `chapter` is bundled into the campaign-mission variant because intro
 * derivation (`deriveIntro`) needs both the mission AND the chapter
 * (cinematic intros are chapter-level, not mission-level). Capturing
 * it at resolver time avoids a double lookup at every consumer.
 */
export type ScriptPayload =
	| {
			kind: 'campaign-mission';
			mission: CampaignMission;
			chapter: CampaignChapter;
			difficulty: Difficulty;
			localRunId: string | null;
	  };
	// future: | { kind: 'tutorial'; lessonId: string }
	// future: | { kind: 'puzzle'; puzzleId: string }

export interface PeerOpponent {
	kind: 'peer';
	peerId: string;
	/**
	 * MY canonical side in the symmetric P2P frame. Renamed from a bare
	 * `role` to `myRole` because "role" alone was ambiguous (mine? the
	 * opponent's?). Maps onto the existing `useGameStore.myCanonicalSide`
	 * convention (`'player'` ⇔ first-mover, `'opponent'` ⇔ second-mover);
	 * the translation lives at the wire boundary in Fase 4.
	 */
	myRole: 'first-mover' | 'second-mover';
	opponentUsername: string | null;
}

export type OpponentSpec = AiOpponent | ScriptedOpponent | PeerOpponent;

// ── Reward ────────────────────────────────────────────────────────────────

export type MatchXpChannel =
	| { kind: 'none' }
	| { kind: 'percentage'; multiplier: number };

export type RuneRewardSource = 'p2p_ranked' | 'campaign_first_clear';

export type RuneChannel =
	| { kind: 'none' }
	| { kind: 'projected'; source: RuneRewardSource };

/**
 * Independent reward channels. Match XP and RUNE use different tables
 * (`xpEconomy` vs `runeEconomy`) but both fire from the same battle-end
 * projector in campaign and P2P. Ranking is ELO only.
 */
export interface RewardChannel {
	matchXp: MatchXpChannel;
	rune: RuneChannel;
	ranking:
		| { kind: 'none' }
		| { kind: 'elo' };
}

// ── MatchContext ──────────────────────────────────────────────────────────

export interface MatchContext extends MatchIdentity {
	opponent: OpponentSpec;
	reward: RewardChannel;
}
