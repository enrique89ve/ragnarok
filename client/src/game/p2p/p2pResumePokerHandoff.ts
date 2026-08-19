/**
 * Re-derive chess→poker CombatHandoff from matchSeed + piece ids + moveCount.
 * Local snapshot blobs are a cache, not duel authority (ADR 0005 / 0007).
 */
import type { ArmySelection, ChessBoardPosition, ChessCollision, ChessPiece } from '../types/ChessTypes';
import type { RoundFlowState } from '../flow/round/types';
import {
	derivePokerCombatHandoff,
	type PokerCombatHandoffPlan,
} from '../coordinator/gameCoordinatorRules';
import {
	createP2PViewerPerspective,
	type P2PViewerPerspective,
} from './p2pPerspective';
import type { P2PCombatResumeSnapshot } from './p2pMatchResume';
import { resolveHeroPortrait } from '../utils/art/artMapping';

export type ResumeDuelPieceIds = {
	readonly attackerId: string;
	readonly defenderId: string;
};

export type BindResumePokerHandoffInput = {
	readonly flow: RoundFlowState | null;
	readonly pendingCombat: unknown;
	readonly pieces: ReadonlyArray<ChessPiece>;
	readonly localArmy: ArmySelection | null;
	readonly remoteArmy: ArmySelection;
	readonly perspective: P2PViewerPerspective;
	readonly matchSeed: string | null | undefined;
	readonly chessMoveCount: number;
	readonly resolvePortrait: (norseHeroId: string) => string | undefined;
};

export type ResumePokerBinding =
	| { readonly kind: 'none'; readonly flow: RoundFlowState | null }
	| { readonly kind: 'bound'; readonly flow: RoundFlowState; readonly plan: PokerCombatHandoffPlan }
	| { readonly kind: 'reject' };

function readId(value: unknown): string | null {
	if (typeof value !== 'object' || value === null) return null;
	const id = Reflect.get(value, 'id');
	return typeof id === 'string' && id.length > 0 ? id : null;
}

function readCollisionIds(pendingCombat: unknown): ResumeDuelPieceIds | null {
	if (typeof pendingCombat !== 'object' || pendingCombat === null) return null;
	const attackerId = readId(Reflect.get(pendingCombat, 'attacker'));
	const defenderId = readId(Reflect.get(pendingCombat, 'defender'));
	if (!attackerId || !defenderId) return null;
	return { attackerId, defenderId };
}

function flowNeedsPokerBinding(
	flow: RoundFlowState | null,
): flow is Extract<RoundFlowState, { tag: 'vs_screen' | 'poker_combat' }> {
	return flow !== null && (flow.tag === 'vs_screen' || flow.tag === 'poker_combat');
}

function pieceById(pieces: ReadonlyArray<ChessPiece>, id: string): ChessPiece | null {
	return pieces.find((piece) => piece.id === id) ?? null;
}

export function resumeDuelPieceIdsFrom(input: {
	readonly pendingCombat: unknown;
	readonly flow: RoundFlowState | null;
}): ResumeDuelPieceIds | null {
	const fromCollision = readCollisionIds(input.pendingCombat);
	if (fromCollision) return fromCollision;
	if (input.flow?.tag === 'vs_screen') {
		return {
			attackerId: input.flow.pieces.attacker.id,
			defenderId: input.flow.pieces.defender.id,
		};
	}
	if (input.flow?.tag === 'poker_combat') {
		return {
			attackerId: input.flow.handoff.attacker.id,
			defenderId: input.flow.handoff.defender.id,
		};
	}
	return null;
}

export function flowWithDerivedPokerHandoff(
	flow: Extract<RoundFlowState, { tag: 'vs_screen' | 'poker_combat' }>,
	plan: PokerCombatHandoffPlan,
): RoundFlowState {
	if (flow.tag === 'poker_combat') {
		return { tag: 'poker_combat', handoff: plan.handoff };
	}
	return {
		tag: 'vs_screen',
		pieces: {
			attacker: plan.handoff.attacker,
			defender: plan.handoff.defender,
		},
	};
}

export function isResumeHandoffCurrent(
	flow: RoundFlowState,
	plan: PokerCombatHandoffPlan,
): boolean {
	if (flow.tag === 'poker_combat') {
		const handoff = flow.handoff;
		return handoff.attacker.id === plan.handoff.attacker.id
			&& handoff.defender.id === plan.handoff.defender.id
			&& handoff.slotsSwapped === plan.handoff.slotsSwapped
			&& handoff.firstStrikeTarget === plan.handoff.firstStrikeTarget;
	}
	if (flow.tag === 'vs_screen') {
		return flow.pieces.attacker.id === plan.handoff.attacker.id
			&& flow.pieces.defender.id === plan.handoff.defender.id;
	}
	return true;
}

export function bindResumePokerHandoff(input: BindResumePokerHandoffInput): ResumePokerBinding {
	if (!flowNeedsPokerBinding(input.flow)) {
		return { kind: 'none', flow: input.flow };
	}
	const ids = resumeDuelPieceIdsFrom({
		pendingCombat: input.pendingCombat,
		flow: input.flow,
	});
	if (!ids) return { kind: 'reject' };
	const attacker = pieceById(input.pieces, ids.attackerId);
	const defender = pieceById(input.pieces, ids.defenderId);
	if (!attacker || !defender) return { kind: 'reject' };
	const plan = derivePokerCombatHandoff({
		attacker,
		defender,
		localArmy: input.localArmy,
		remoteArmy: input.remoteArmy,
		perspective: input.perspective,
		matchSeed: input.matchSeed,
		chessMoveCount: input.chessMoveCount,
		resolvePortrait: input.resolvePortrait,
	});
	if (!plan) return { kind: 'reject' };
	return {
		kind: 'bound',
		flow: flowWithDerivedPokerHandoff(input.flow, plan),
		plan,
	};
}

function isChessOwner(value: unknown): value is ChessPiece['owner'] {
	return value === 'player' || value === 'opponent';
}

function isChessPiece(value: unknown): value is ChessPiece {
	if (typeof value !== 'object' || value === null) return false;
	return typeof Reflect.get(value, 'id') === 'string'
		&& typeof Reflect.get(value, 'type') === 'string'
		&& isChessOwner(Reflect.get(value, 'owner'));
}

function boardPiecesOf(boardState: unknown): ReadonlyArray<ChessPiece> {
	if (typeof boardState !== 'object' || boardState === null) return [];
	const pieces = Reflect.get(boardState, 'pieces');
	if (!Array.isArray(pieces)) return [];
	return pieces.filter(isChessPiece);
}

function isBoardPosition(value: unknown): value is ChessBoardPosition {
	if (typeof value !== 'object' || value === null) return false;
	return typeof Reflect.get(value, 'row') === 'number'
		&& typeof Reflect.get(value, 'col') === 'number';
}

export function reboundResumePendingCombat(
	pendingCombat: unknown,
	attacker: ChessPiece,
	defender: ChessPiece,
): ChessCollision | null {
	if (typeof pendingCombat !== 'object' || pendingCombat === null) return null;
	const attackerPosition = Reflect.get(pendingCombat, 'attackerPosition');
	const defenderPosition = Reflect.get(pendingCombat, 'defenderPosition');
	if (!isBoardPosition(attackerPosition) || !isBoardPosition(defenderPosition)) return null;
	const instantKill = Reflect.get(pendingCombat, 'instantKill');
	return {
		attacker,
		defender,
		attackerPosition,
		defenderPosition,
		...(instantKill === true ? { instantKill: true } : {}),
	};
}

export type ResumePokerBindingSource = {
	readonly flow: RoundFlowState | null;
	readonly combat: Pick<P2PCombatResumeSnapshot, 'pendingCombat' | 'boardState'>;
	readonly playerArmy: ArmySelection;
	readonly opponentArmy: ArmySelection;
	readonly myCanonicalSide: 'player' | 'opponent';
	readonly matchSeed: string;
	readonly chessMoveCount: number;
};

export function planResumePokerBinding(record: ResumePokerBindingSource): ResumePokerBinding {
	return bindResumePokerHandoff({
		flow: record.flow,
		pendingCombat: record.combat.pendingCombat,
		pieces: boardPiecesOf(record.combat.boardState),
		localArmy: record.playerArmy,
		remoteArmy: record.opponentArmy,
		perspective: createP2PViewerPerspective(record.myCanonicalSide),
		matchSeed: record.matchSeed,
		chessMoveCount: record.chessMoveCount,
		resolvePortrait: resolveHeroPortrait,
	});
}
