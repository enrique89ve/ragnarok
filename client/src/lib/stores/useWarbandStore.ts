import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { ArmySelection } from '../../game/types/ChessTypes';

const PIECE_KEYS = ['king', 'queen', 'rook', 'bishop', 'knight'] as const;
type PieceKey = (typeof PIECE_KEYS)[number];

export type WarbandValue =
	| { readonly status: 'empty' }
	| {
			readonly status: 'ready';
			readonly army: ArmySelection;
			readonly deckCardIds: ReadonlyArray<number>;
	  };

export type WarbandStore = {
	readonly warband: WarbandValue;
	readonly setWarband: (
		army: ArmySelection,
		deckCardIds: ReadonlyArray<number>
	) => void;
	readonly clearWarband: () => void;
};

const EMPTY_WARBAND: WarbandValue = Object.freeze({ status: 'empty' });

function isFiniteInteger(value: unknown): value is number {
	return typeof value === 'number' && Number.isInteger(value);
}

function assertCompleteArmy(army: ArmySelection): void {
	if (army === null || typeof army !== 'object') {
		throw new Error('useWarbandStore: army must be an object');
	}
	for (const key of PIECE_KEYS) {
		const piece = (army as Record<PieceKey, unknown>)[key];
		if (piece === null || typeof piece !== 'object') {
			throw new Error(`useWarbandStore: army.${key} is missing`);
		}
		const id = (piece as { id?: unknown }).id;
		if (typeof id !== 'string' || id.length === 0) {
			throw new Error(`useWarbandStore: army.${key}.id must be a non-empty string`);
		}
	}
}

function assertValidDeck(deckCardIds: ReadonlyArray<number>): void {
	if (!Array.isArray(deckCardIds)) {
		throw new Error('useWarbandStore: deckCardIds must be an array');
	}
	for (let i = 0; i < deckCardIds.length; i++) {
		if (!isFiniteInteger(deckCardIds[i])) {
			throw new Error(
				`useWarbandStore: deckCardIds[${i}] must be a finite integer`
			);
		}
	}
}

export const useWarbandStore = create<WarbandStore>()(
	subscribeWithSelector((set) => ({
		warband: EMPTY_WARBAND,

		setWarband: (army, deckCardIds) => {
			try {
				assertCompleteArmy(army);
				assertValidDeck(deckCardIds);
			} catch (cause) {
				const detail = cause instanceof Error ? cause.message : String(cause);
				throw new Error(
					`useWarbandStore.setWarband: invalid warband — ${detail}`,
					{ cause }
				);
			}
			set({
				warband: Object.freeze({
					status: 'ready',
					army,
					deckCardIds: Object.freeze([...deckCardIds]),
				}),
			});
		},

		clearWarband: () => {
			set({ warband: EMPTY_WARBAND });
		},
	}))
);

export function selectIsReady(state: WarbandStore): boolean {
	return state.warband.status === 'ready';
}

export function selectArmy(state: WarbandStore): ArmySelection | null {
	return state.warband.status === 'ready' ? state.warband.army : null;
}

export function selectDeckCardIds(state: WarbandStore): ReadonlyArray<number> {
	return state.warband.status === 'ready' ? state.warband.deckCardIds : [];
}
