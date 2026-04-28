/*
  Round-level flow — pure discriminated union types.

  This module is the single source of truth for the *intra-match*
  state machine: cinematic → mission_intro → chess → vs_screen →
  poker_combat → chess (loop) → game_over. Match-level concerns
  (menu, route navigation, post-match rewards) live in HashRouter,
  not here.

  Strict purity contract:
    - No React imports.
    - No class declarations.
    - No `any`, no `as` casts, no non-null assertions.
    - Every state and event field is `readonly`.
    - The discriminator is `tag` (not `phase`/`type`) to avoid name
      clashes with CombatPhase / PokerPhase that already live in
      useUnifiedCombatStore.
*/

import type { ArmySelection, ChessPiece } from '../../types/ChessTypes';
import type { CinematicIntro, CinematicScene } from '../../campaign/campaignTypes';
import type { GameOverSubPhase } from '../../campaign/campaignStore';

/*
  Payloads carried by individual flow states.
  Cinematic data is the chapter's authored intro; mission_intro carries
  the mission identifier so MissionIntroPhase can resolve it from the
  campaign registry without re-passing the whole mission object.
*/
export type CinematicData = {
	readonly chapterId: string;
	readonly intro: CinematicIntro;
};

export type MissionIntroData = {
	readonly missionId: string;
	readonly narrativeBefore: string;
	readonly isChapterFinale: boolean;
};

/*
  Pieces that initiate combat — captured at chess→vs_screen transition.
  The poker phase later consumes a richer CombatHandoff built from these
  plus army/king context.
*/
export type CombatPieces = {
	readonly attacker: ChessPiece;
	readonly defender: ChessPiece;
};

/*
  Everything PokerCombatPhase needs to resolve a duel without calling
  back into chess state. Built during the VS_COMPLETE event so the chess
  phase remains the only authority on chess→poker mapping.
*/
export type CombatHandoff = {
	readonly attacker: ChessPiece;
	readonly defender: ChessPiece;
	readonly playerArmy: ArmySelection;
	readonly opponentArmy: ArmySelection;
	readonly slotsSwapped: boolean;
	readonly firstStrikeTarget: 'player' | 'opponent';
};

/*
  Game-over outcome. `winner: 'draw'` is intentionally NOT modelled at
  the FSM level — the existing handleCombatEnd path treats draw as a
  resume-chess case, never as a game ending.
*/
export type GameResult = {
	readonly winner: 'player' | 'opponent';
	readonly playerTurnCount: number;
	readonly victoryCinematic: ReadonlyArray<CinematicScene> | null;
	readonly defeatCinematic: ReadonlyArray<CinematicScene> | null;
	readonly storyBridge: ReadonlyArray<CinematicScene> | null;
};

/*
  The FSM. Each state carries ONLY the payload that belongs to that
  phase. Cross-phase data (army, board, mission) lives in its rightful
  store (useWarbandStore / useUnifiedCombatStore / useCampaignStore).

  Notably absent: `army_selection`. That phase was a transient hack in
  the legacy useState; the warband flow (Sprint A–F) now collects army
  before /game so it has no place in the FSM.
*/
export type RoundFlowState =
	| { readonly tag: 'cinematic'; readonly cinematic: CinematicData }
	| { readonly tag: 'mission_intro'; readonly mission: MissionIntroData }
	| { readonly tag: 'chess' }
	| { readonly tag: 'vs_screen'; readonly pieces: CombatPieces }
	| { readonly tag: 'poker_combat'; readonly handoff: CombatHandoff }
	| {
			readonly tag: 'game_over';
			readonly result: GameResult;
			readonly sub: GameOverSubPhase;
	  };

/*
  Events. Each carries exactly the data needed for its target state.

  CINEMATIC_DONE is special: post-cinematic the next phase is either
  mission_intro (campaign with narrativeBefore) or chess. The decision
  belongs to the coordinator that knows about campaign data — the FSM
  just executes the chosen branch.
*/
export type FlowEvent =
	| {
			readonly type: 'CINEMATIC_DONE';
			readonly next:
				| { readonly kind: 'intro'; readonly mission: MissionIntroData }
				| { readonly kind: 'chess' };
	  }
	| { readonly type: 'INTRO_DONE' }
	| {
			readonly type: 'COMBAT_TRIGGERED';
			readonly pieces: CombatPieces;
	  }
	| {
			readonly type: 'VS_COMPLETE';
			readonly handoff: CombatHandoff;
	  }
	| { readonly type: 'COMBAT_RESOLVED' }
	| {
			readonly type: 'GAME_ENDED';
			readonly result: GameResult;
			readonly initialSub: GameOverSubPhase;
	  }
	| {
			readonly type: 'GAME_OVER_ADVANCE';
			readonly nextSub: GameOverSubPhase;
	  };

/*
  Initial-state constructors. Coordinator picks the right one based on
  entry context (route + campaign data + warband). Centralising these
  here keeps the "where do we start?" decision testable.
*/
export type InitialFlowInput =
	| { readonly kind: 'cinematic'; readonly cinematic: CinematicData }
	| { readonly kind: 'mission_intro'; readonly mission: MissionIntroData }
	| { readonly kind: 'chess' };

export function initialState(input: InitialFlowInput): RoundFlowState {
	switch (input.kind) {
		case 'cinematic':
			return { tag: 'cinematic', cinematic: input.cinematic };
		case 'mission_intro':
			return { tag: 'mission_intro', mission: input.mission };
		case 'chess':
			return { tag: 'chess' };
	}
}
