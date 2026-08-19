/**
 * Shared cards-deck announce for OPEN-8 both-peer init.
 *
 * Each peer sends a concrete list (or empty = class deck from the side RNG).
 * Both call `buildHandshakeGameState` with the same seed and opposite
 * canonical sides so ego-centric state hashes match after `flipGameState`.
 */
import type { CanonicalChessSide } from '@shared/p2p-wire/chess';
import type { HiveCardAsset } from '../../data/schemas/HiveTypes';
import type { CardData, GameState, HeroClass } from '../types';
import { getCardById } from '../data/allCards';
import { createRuntimeStorageKey } from '../config/networkConfig';
import { createClassDeck } from '../utils/cards/cardUtils';
import { enrichDeckWithAnnouncedLevels } from '../utils/cards/cardLevelScaling';
import { initializeGameSeeded } from '../utils/gameUtils';
import { createSeededIdGen, seededRngFromString, seededShuffle } from '../utils/seededRng';

export type CardsDeckAnnounce = {
	readonly heroClass: string;
	readonly heroId?: string;
	readonly cardIds: readonly number[];
	readonly nftLevels: readonly { readonly cardId: number; readonly level: number }[];
};

export type CardsDeckHandshakeInput = {
	readonly matchSeed: string;
	readonly myCanonicalSide: CanonicalChessSide;
	readonly localDeck: CardsDeckAnnounce;
	readonly remoteDeck: CardsDeckAnnounce;
};

const FALLBACK_HERO: HeroClass = 'mage';

export function snapshotLocalCardsDeck(input: {
	readonly selectedDeckId?: string | null;
	readonly selectedHeroClass?: HeroClass | null;
	readonly selectedHeroId?: string | null;
	readonly savedDecksJson?: string;
	readonly warbandCardIds?: readonly number[];
	readonly hiveCollection?: readonly HiveCardAsset[];
}): CardsDeckAnnounce {
	const heroClass = input.selectedHeroClass ?? FALLBACK_HERO;
	const heroId = input.selectedHeroId ?? undefined;
	const fromSaved = snapshotSavedDeckCardIds(input.selectedDeckId, input.savedDecksJson);
	const cardIds = fromSaved.length > 0
		? fromSaved
		: (input.warbandCardIds ?? []).filter((id) => Number.isInteger(id) && id >= 0);
	return {
		heroClass,
		...(heroId ? { heroId } : {}),
		cardIds,
		nftLevels: snapshotNftLevels(cardIds, input.hiveCollection),
	};
}

export function buildHandshakeGameState(input: CardsDeckHandshakeInput): GameState {
	const firstMover = input.myCanonicalSide === 'player' ? input.localDeck : input.remoteDeck;
	const secondMover = input.myCanonicalSide === 'player' ? input.remoteDeck : input.localDeck;
	const playerAnnounce = input.localDeck;
	const opponentAnnounce = input.remoteDeck;

	const firstRng = seededRngFromString(`${input.matchSeed}:deck:player`);
	const secondRng = seededRngFromString(`${input.matchSeed}:deck:opponent`);
	const firstDeck = resolveAnnouncedDeck(firstMover, firstRng);
	const secondDeck = resolveAnnouncedDeck(secondMover, secondRng);

	const playerDeckCards = input.myCanonicalSide === 'player' ? firstDeck : secondDeck;
	const opponentDeckCards = input.myCanonicalSide === 'player' ? secondDeck : firstDeck;
	const playerIdGen = createSeededIdGen(
		input.matchSeed,
		input.myCanonicalSide === 'player' ? 'p1' : 'p2',
	);
	const opponentIdGen = createSeededIdGen(
		input.matchSeed,
		input.myCanonicalSide === 'player' ? 'p2' : 'p1',
	);

	const state = initializeGameSeeded({
		rng: firstRng,
		playerIdGen,
		opponentIdGen,
		playerDeckCards,
		opponentDeckCards,
		playerHeroClass: asHeroClass(playerAnnounce.heroClass, FALLBACK_HERO),
		opponentHeroClass: asHeroClass(opponentAnnounce.heroClass, 'hunter'),
		playerHeroId: playerAnnounce.heroId,
		opponentHeroId: opponentAnnounce.heroId,
	});
	if (input.myCanonicalSide === 'player') return state;
	return {
		...state,
		currentTurn: 'opponent',
	};
}

export function resolveAnnouncedDeck(
	announce: CardsDeckAnnounce,
	rng: () => number,
): CardData[] {
	const heroClass = asHeroClass(announce.heroClass, FALLBACK_HERO);
	let deck: CardData[];
	if (announce.cardIds.length === 0) {
		deck = createClassDeck(heroClass, 30, rng);
	} else {
		const resolved: CardData[] = [];
		for (const id of announce.cardIds) {
			const card = getCardById(id);
			if (card) resolved.push(card);
		}
		deck = resolved.length > 0 ? seededShuffle(resolved, rng) : createClassDeck(heroClass, 30, rng);
	}
	return enrichDeckWithAnnouncedLevels(deck, announce.nftLevels);
}

function snapshotSavedDeckCardIds(
	selectedDeckId: string | null | undefined,
	savedDecksJson: string | undefined,
): number[] {
	if (!selectedDeckId || !savedDecksJson) return [];
	try {
		const savedDecks = JSON.parse(savedDecksJson) as unknown;
		if (!Array.isArray(savedDecks)) return [];
		const selected = savedDecks.find((deck) => (
			deck !== null
			&& typeof deck === 'object'
			&& 'id' in deck
			&& String((deck as { id: unknown }).id) === selectedDeckId
		)) as { cards?: Record<string, unknown> } | undefined;
		if (!selected?.cards || typeof selected.cards !== 'object') return [];
		const ids = Object.keys(selected.cards)
			.map((key) => Number.parseInt(key, 10))
			.filter((id) => Number.isInteger(id))
			.sort((a, b) => a - b);
		const out: number[] = [];
		for (const id of ids) {
			const raw = selected.cards[String(id)];
			const count = typeof raw === 'number' ? raw : Number.parseInt(String(raw), 10) || 0;
			for (let i = 0; i < count; i += 1) out.push(id);
		}
		return out;
	} catch {
		return [];
	}
}

function snapshotNftLevels(
	cardIds: readonly number[],
	collection: readonly HiveCardAsset[] | undefined,
): { cardId: number; level: number }[] {
	if (!collection?.length || cardIds.length === 0) return [];
	const wanted = new Set(cardIds);
	const best = new Map<number, number>();
	for (const asset of collection) {
		if (asset.ownershipSource !== 'nft') continue;
		if (!wanted.has(asset.cardId)) continue;
		const existing = best.get(asset.cardId);
		if (existing === undefined || asset.level > existing) {
			best.set(asset.cardId, asset.level);
		}
	}
	return [...best.entries()].map(([cardId, level]) => ({ cardId, level }));
}

function asHeroClass(value: string, fallback: HeroClass): HeroClass {
	const lowered = value.trim().toLowerCase();
	if (lowered.length === 0) return fallback;
	return lowered as HeroClass;
}

export function savedDecksStorageKey(): string {
	return createRuntimeStorageKey('ragnarok-decks');
}
