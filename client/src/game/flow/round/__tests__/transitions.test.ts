/*
  Exhaustive transition tests for the round-level FSM.

  Coverage contract:
    1. Every (state.tag, event.type) pair has at least one assertion —
       valid transitions check the resulting shape; invalid pairs
       check that state IDENTITY is preserved (`===`).
    2. canTransition() agrees with nextState() across the whole grid.
    3. initialState() builds the documented start states.

  Test fixtures use the minimal shape needed by the FSM. The FSM does
  not introspect ChessPiece / ArmySelection internals — it just routes
  references — so these are typed casts of structural literals to keep
  the test self-contained.
*/

import { describe, expect, test } from 'vitest';
import { nextState } from '../transitions';
import { canTransition, isInActiveCombat, isGameOver, isPreMatch } from '../guards';
import { initialState } from '../types';
import type {
	RoundFlowState,
	FlowEvent,
	CinematicData,
	MissionIntroData,
	CombatPieces,
	CombatHandoff,
	PostCinematicPlan,
} from '../types';
import type { ChessPiece, ArmySelection } from '../../../types/ChessTypes';

/* ============================================================
   Fixtures — minimal valid payloads.
   ============================================================ */

const cinematicData: CinematicData = {
	chapterId: 'ch1',
	intro: {
		title: 'Prologue',
		scenes: [{ narration: 'In the beginning...' }],
	},
};

const missionIntroData: MissionIntroData = {
	missionId: 'm1-1',
	narrativeBefore: 'You arrive at Yggdrasil.',
	isChapterFinale: false,
};

function buildPiece(id: string, owner: 'player' | 'opponent'): ChessPiece {
	return {
		id,
		type: 'queen',
		owner,
		position: { row: 0, col: 0 },
		health: 100,
		maxHealth: 100,
		stamina: 5,
		heroClass: 'warrior',
		heroName: `Hero-${id}`,
		deckCardIds: [],
		hasSpells: false,
		hasMoved: false,
		element: 'fire',
	};
}

const attacker: ChessPiece = buildPiece('p1', 'player');
const defender: ChessPiece = buildPiece('o1', 'opponent');
const pieces: CombatPieces = { attacker, defender };

const minimalArmy: ArmySelection = {
	king: { id: 'k', name: 'K', heroClass: 'warrior', description: '' },
	queen: { id: 'q', name: 'Q', heroClass: 'warrior', description: '' },
	rook: { id: 'r', name: 'R', heroClass: 'warrior', description: '' },
	bishop: { id: 'b', name: 'B', heroClass: 'warrior', description: '' },
	knight: { id: 'n', name: 'N', heroClass: 'warrior', description: '' },
};

const handoff: CombatHandoff = {
	attacker,
	defender,
	playerArmy: minimalArmy,
	opponentArmy: minimalArmy,
	slotsSwapped: false,
	firstStrikeTarget: 'opponent',
};

/* ============================================================
   Initial-state constructors.
   ============================================================ */

const planToIntro: PostCinematicPlan = { kind: 'intro', mission: missionIntroData };
const planToChess: PostCinematicPlan = { kind: 'chess' };

describe('initialState', () => {
	test('builds cinematic start with then=intro', () => {
		const s = initialState({
			kind: 'cinematic',
			cinematic: cinematicData,
			then: planToIntro,
		});
		expect(s).toEqual({
			tag: 'cinematic',
			cinematic: cinematicData,
			then: planToIntro,
		});
	});

	test('builds cinematic start with then=chess', () => {
		const s = initialState({
			kind: 'cinematic',
			cinematic: cinematicData,
			then: planToChess,
		});
		expect(s).toEqual({
			tag: 'cinematic',
			cinematic: cinematicData,
			then: planToChess,
		});
	});

	test('builds mission_intro start', () => {
		const s = initialState({ kind: 'mission_intro', mission: missionIntroData });
		expect(s).toEqual({ tag: 'mission_intro', mission: missionIntroData });
	});

	test('builds chess start', () => {
		const s = initialState({ kind: 'chess' });
		expect(s).toEqual({ tag: 'chess' });
	});

	test('builds chess intro start', () => {
		const s = initialState({ kind: 'chess_intro' });
		expect(s).toEqual({ tag: 'chess_intro' });
	});
});

/* ============================================================
   Valid transitions — happy paths.
   ============================================================ */

describe('valid transitions', () => {
	test('cinematic(then=intro) + CINEMATIC_DONE → mission_intro', () => {
		const from: RoundFlowState = {
			tag: 'cinematic',
			cinematic: cinematicData,
			then: planToIntro,
		};
		expect(nextState(from, { type: 'CINEMATIC_DONE' })).toEqual({
			tag: 'mission_intro',
			mission: missionIntroData,
		});
	});

	test('cinematic(then=chess) + CINEMATIC_DONE → chess_intro', () => {
		const from: RoundFlowState = {
			tag: 'cinematic',
			cinematic: cinematicData,
			then: planToChess,
		};
		expect(nextState(from, { type: 'CINEMATIC_DONE' })).toEqual({ tag: 'chess_intro' });
	});

	test('mission_intro + INTRO_DONE → chess_intro', () => {
		const from: RoundFlowState = { tag: 'mission_intro', mission: missionIntroData };
		expect(nextState(from, { type: 'INTRO_DONE' })).toEqual({ tag: 'chess_intro' });
	});

	test('chess_intro + CHESS_INTRO_DONE → chess', () => {
		const from: RoundFlowState = { tag: 'chess_intro' };
		expect(nextState(from, { type: 'CHESS_INTRO_DONE' })).toEqual({ tag: 'chess' });
	});

	test('chess + COMBAT_TRIGGERED → vs_screen', () => {
		const from: RoundFlowState = { tag: 'chess' };
		const ev: FlowEvent = { type: 'COMBAT_TRIGGERED', pieces };
		expect(nextState(from, ev)).toEqual({ tag: 'vs_screen', pieces });
	});

	test('chess + GAME_ENDED → game_over', () => {
		const from: RoundFlowState = { tag: 'chess' };
		const ev: FlowEvent = { type: 'GAME_ENDED', initialSub: 'cinematic' };
		expect(nextState(from, ev)).toEqual({
			tag: 'game_over',
			sub: 'cinematic',
		});
	});

	test('vs_screen + VS_COMPLETE → poker_combat', () => {
		const from: RoundFlowState = { tag: 'vs_screen', pieces };
		const ev: FlowEvent = { type: 'VS_COMPLETE', handoff };
		expect(nextState(from, ev)).toEqual({ tag: 'poker_combat', handoff });
	});

	test('poker_combat + COMBAT_RESOLVED → chess', () => {
		const from: RoundFlowState = { tag: 'poker_combat', handoff };
		expect(nextState(from, { type: 'COMBAT_RESOLVED' })).toEqual({ tag: 'chess' });
	});

	test('poker_combat + GAME_ENDED → game_over (cards-victory match end)', () => {
		const from: RoundFlowState = { tag: 'poker_combat', handoff };
		const ev: FlowEvent = { type: 'GAME_ENDED', initialSub: 'cinematic' };
		expect(nextState(from, ev)).toEqual({ tag: 'game_over', sub: 'cinematic' });
	});

	test('game_over + GAME_OVER_ADVANCE updates sub only', () => {
		const from: RoundFlowState = { tag: 'game_over', sub: 'cinematic' };
		const ev: FlowEvent = { type: 'GAME_OVER_ADVANCE', nextSub: 'result' };
		expect(nextState(from, ev)).toEqual({
			tag: 'game_over',
			sub: 'result',
		});
	});
});

/* ============================================================
   Invalid transitions — must preserve state identity.
   The grid covers every (state, event) pair NOT exercised above.
   ============================================================ */

const allEvents: ReadonlyArray<{ name: string; ev: FlowEvent }> = [
	{ name: 'CINEMATIC_DONE', ev: { type: 'CINEMATIC_DONE' } },
	{ name: 'INTRO_DONE', ev: { type: 'INTRO_DONE' } },
	{ name: 'CHESS_INTRO_DONE', ev: { type: 'CHESS_INTRO_DONE' } },
	{ name: 'COMBAT_TRIGGERED', ev: { type: 'COMBAT_TRIGGERED', pieces } },
	{ name: 'VS_COMPLETE', ev: { type: 'VS_COMPLETE', handoff } },
	{ name: 'COMBAT_RESOLVED', ev: { type: 'COMBAT_RESOLVED' } },
	{ name: 'GAME_ENDED', ev: { type: 'GAME_ENDED', initialSub: 'result' } },
	{ name: 'GAME_OVER_ADVANCE', ev: { type: 'GAME_OVER_ADVANCE', nextSub: 'bridge' } },
];

const allStates: ReadonlyArray<{ name: string; state: RoundFlowState; validEvents: ReadonlyArray<string> }> = [
	{
		name: 'cinematic(then=intro)',
		state: { tag: 'cinematic', cinematic: cinematicData, then: planToIntro },
		validEvents: ['CINEMATIC_DONE'],
	},
	{
		name: 'cinematic(then=chess)',
		state: { tag: 'cinematic', cinematic: cinematicData, then: planToChess },
		validEvents: ['CINEMATIC_DONE'],
	},
	{
		name: 'mission_intro',
		state: { tag: 'mission_intro', mission: missionIntroData },
		validEvents: ['INTRO_DONE'],
	},
	{
		name: 'chess_intro',
		state: { tag: 'chess_intro' },
		validEvents: ['CHESS_INTRO_DONE'],
	},
	{
		name: 'chess',
		state: { tag: 'chess' },
		validEvents: ['COMBAT_TRIGGERED', 'GAME_ENDED'],
	},
	{
		name: 'vs_screen',
		state: { tag: 'vs_screen', pieces },
		validEvents: ['VS_COMPLETE', 'GAME_ENDED'],
	},
	{
		name: 'poker_combat',
		state: { tag: 'poker_combat', handoff },
		validEvents: ['COMBAT_RESOLVED', 'GAME_ENDED'],
	},
	{
		name: 'game_over',
		state: { tag: 'game_over', sub: 'result' },
		validEvents: ['GAME_OVER_ADVANCE'],
	},
];

describe('invalid transitions preserve state identity', () => {
	for (const { name: stateName, state, validEvents } of allStates) {
		for (const { name: evName, ev } of allEvents) {
			if (validEvents.includes(evName)) continue;
			test(`${stateName} ignores ${evName}`, () => {
				expect(nextState(state, ev)).toBe(state);
				expect(canTransition(state, ev)).toBe(false);
			});
		}
	}
});

/* ============================================================
   canTransition agrees with nextState across all valid pairs.
   ============================================================ */

describe('canTransition agrees with nextState on valid events', () => {
	for (const { name: stateName, state, validEvents } of allStates) {
		for (const { name: evName, ev } of allEvents) {
			if (!validEvents.includes(evName)) continue;
			test(`${stateName} accepts ${evName}`, () => {
				expect(canTransition(state, ev)).toBe(true);
			});
		}
	}
});

/* ============================================================
   Predicate guards.
   ============================================================ */

describe('predicate guards', () => {
	const cinematicState: RoundFlowState = {
		tag: 'cinematic',
		cinematic: cinematicData,
		then: planToChess,
	};

	test('isInActiveCombat covers vs_screen + poker_combat', () => {
		expect(isInActiveCombat({ tag: 'vs_screen', pieces })).toBe(true);
		expect(isInActiveCombat({ tag: 'poker_combat', handoff })).toBe(true);
		expect(isInActiveCombat({ tag: 'chess' })).toBe(false);
		expect(isInActiveCombat(cinematicState)).toBe(false);
		expect(isInActiveCombat({ tag: 'mission_intro', mission: missionIntroData })).toBe(false);
		expect(isInActiveCombat({ tag: 'game_over', sub: 'result' })).toBe(false);
	});

	test('isGameOver only on game_over', () => {
		expect(isGameOver({ tag: 'game_over', sub: 'result' })).toBe(true);
		expect(isGameOver({ tag: 'game_over', sub: 'cinematic' })).toBe(true);
		expect(isGameOver({ tag: 'game_over', sub: 'bridge' })).toBe(true);
		expect(isGameOver({ tag: 'chess' })).toBe(false);
		expect(isGameOver(cinematicState)).toBe(false);
	});

	test('isPreMatch covers cinematic + mission_intro', () => {
		expect(isPreMatch(cinematicState)).toBe(true);
		expect(isPreMatch({ tag: 'mission_intro', mission: missionIntroData })).toBe(true);
		expect(isPreMatch({ tag: 'chess' })).toBe(false);
		expect(isPreMatch({ tag: 'vs_screen', pieces })).toBe(false);
		expect(isPreMatch({ tag: 'poker_combat', handoff })).toBe(false);
		expect(isPreMatch({ tag: 'game_over', sub: 'result' })).toBe(false);
	});
});
