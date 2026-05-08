import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { ArmySelection } from '../../game/types/ChessTypes';
import {
	HERO_DECK_PIECE_TYPES,
	type HeroDeckLoadout,
} from '../../game/deck/heroDeckRules';

const PIECE_KEYS = ['king', 'queen', 'rook', 'bishop', 'knight'] as const;
type PieceKey = (typeof PIECE_KEYS)[number];

export type WarbandValue =
	| { readonly status: 'empty' }
	| {
			readonly status: 'ready';
			readonly army: ArmySelection;
			readonly deckCardIds: ReadonlyArray<number>;
			readonly deckCardIdsByPiece: HeroDeckLoadout;
	  };

export type WarbandStore = {
	readonly warband: WarbandValue;
	readonly setWarband: (
		army: ArmySelection,
		deckCardIds: ReadonlyArray<number>,
		deckCardIdsByPiece?: HeroDeckLoadout,
	) => void;
	readonly clearWarband: () => void;
};

const EMPTY_WARBAND: WarbandValue = Object.freeze({ status: 'empty' });

const EMPTY_DECK_CARD_IDS: ReadonlyArray<number> = Object.freeze([]);

const EMPTY_DECK_LOADOUT: HeroDeckLoadout = Object.freeze({
	queen: Object.freeze([]),
	rook: Object.freeze([]),
	bishop: Object.freeze([]),
	knight: Object.freeze([]),
});

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

function assertValidDeckLoadout(deckCardIdsByPiece: HeroDeckLoadout): void {
	for (const pieceType of HERO_DECK_PIECE_TYPES) {
		assertValidDeck(deckCardIdsByPiece[pieceType]);
	}
}

function freezeDeckLoadout(deckCardIdsByPiece?: HeroDeckLoadout): HeroDeckLoadout {
	if (!deckCardIdsByPiece) return EMPTY_DECK_LOADOUT;

	return Object.freeze({
		queen: Object.freeze([...deckCardIdsByPiece.queen]),
		rook: Object.freeze([...deckCardIdsByPiece.rook]),
		bishop: Object.freeze([...deckCardIdsByPiece.bishop]),
		knight: Object.freeze([...deckCardIdsByPiece.knight]),
	});
}

export const useWarbandStore = create<WarbandStore>()(
	subscribeWithSelector((set) => ({
		warband: EMPTY_WARBAND,

		setWarband: (army, deckCardIds, deckCardIdsByPiece) => {
			try {
				assertCompleteArmy(army);
				assertValidDeck(deckCardIds);
				if (deckCardIdsByPiece) {
					assertValidDeckLoadout(deckCardIdsByPiece);
				}
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
					deckCardIdsByPiece: freezeDeckLoadout(deckCardIdsByPiece),
				}),
			});
		},

		clearWarband: () => {
			set({ warband: EMPTY_WARBAND });
		},
	}))
);

// Expose the warband store on globalThis so smoke harnesses (chrome-devtools
// MCP, Playwright) and debug consoles can seed a ready warband without
// driving the deck-builder UI. Same pattern as `unifiedCombatStore` line 102.
// Reads stay routed through the React hooks; this is a side-channel for
// test affordance only.
(globalThis as Record<string, unknown>).__ragnarokWarbandStore = useWarbandStore;

export function selectIsReady(state: WarbandStore): boolean {
	return state.warband.status === 'ready';
}

export function selectArmy(state: WarbandStore): ArmySelection | null {
	return state.warband.status === 'ready' ? state.warband.army : null;
}

export function selectDeckCardIds(state: WarbandStore): ReadonlyArray<number> {
	return state.warband.status === 'ready' ? state.warband.deckCardIds : EMPTY_DECK_CARD_IDS;
}

export function selectDeckCardIdsByPiece(state: WarbandStore): HeroDeckLoadout {
	return state.warband.status === 'ready' ? state.warband.deckCardIdsByPiece : EMPTY_DECK_LOADOUT;
}
