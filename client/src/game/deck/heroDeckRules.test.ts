import { describe, expect, it } from 'vitest';
import { RAGNAROK_RUNTIME_CONFIGS } from '@shared/runtimeConfig';
import { buildDeckClaimsFromCardIds, verifyDeckClaims } from '@shared/protocol-core/deckVerification';
import { buildPlayerCollection } from '@shared/protocol-core/playerCollection';
import type { CardData } from '../types';
import type { ArmySelection, ChessPieceHero } from '../types/ChessTypes';
import { cardRegistry } from '../data/cardRegistry';
import { getQaFullCatalogCardsForRuntime } from '../protocol/qaFullCatalogEntitlement';
import {
  buildWarbandLoadout,
  filterCardsByHero,
  generateAutoFillCards,
  getMaxCopies,
  getHeroDeckStatus,
  HERO_DECK_PIECE_TYPES,
  HERO_DECK_SIZE,
  validateHeroDeck,
  type HeroDeck,
  type PieceType,
} from './heroDeckRules';

function makeCard(id: number, heroClass = 'druid', rarity: CardData['rarity'] = 'common'): CardData {
  return {
    id,
    name: `Card ${id}`,
    type: 'minion',
    rarity,
    class: heroClass,
  } satisfies CardData;
}

function makeHero(id: string, heroClass = 'druid'): ChessPieceHero {
  return {
    id,
    name: id,
    heroClass,
    description: `${id} description`,
  };
}

function makeArmy(): ArmySelection {
  return {
    king: makeHero('king-hero', 'neutral'),
    queen: makeHero('queen-hero'),
    rook: makeHero('rook-hero'),
    bishop: makeHero('bishop-hero'),
    knight: makeHero('knight-hero'),
  };
}

function makeDeckCardIds(): number[] {
  return Array.from({ length: HERO_DECK_SIZE }, (_, index) => Math.floor(index / 2) + 1);
}

function makeDeck(pieceType: PieceType, heroId: string, cardIds = makeDeckCardIds()): HeroDeck {
  return {
    pieceType,
    heroId,
    heroClass: 'druid',
    cardIds,
  };
}

const registry = Array.from({ length: 20 }, (_, index) => makeCard(index + 1));
const getCardById = (cardId: number): CardData | undefined => registry.find(card => Number(card.id) === cardId);
const QA_SEASON_0_CONFIG = {
  ...RAGNAROK_RUNTIME_CONFIGS.testnet,
  resetEpoch: 'qa-s0-campaign-pass',
};

function buildCompleteDeckIds(cards: readonly CardData[]): number[] {
  const deckCardIds: number[] = [];
  const usedCardIds = new Set<number>();

  for (const card of cards) {
    const cardId = Number(card.id);
    if (!Number.isInteger(cardId) || usedCardIds.has(cardId)) continue;
    usedCardIds.add(cardId);

    for (let copy = 0; copy < getMaxCopies(card) && deckCardIds.length < HERO_DECK_SIZE; copy++) {
      deckCardIds.push(cardId);
    }

    if (deckCardIds.length === HERO_DECK_SIZE) break;
  }

  if (deckCardIds.length !== HERO_DECK_SIZE) {
    throw new Error(`not enough QA catalog cards to build campaign deck: ${deckCardIds.length}`);
  }

  return deckCardIds;
}

describe('heroDeckRules', () => {
  it('marks a complete saved deck as a hero mismatch when the selected hero changed', () => {
    const status = getHeroDeckStatus(makeDeck('queen', 'old-queen'), {
      pieceType: 'queen',
      heroId: 'new-queen',
      heroClass: 'druid',
      getCardById,
    });

    expect(status.kind).toBe('hero_mismatch');
    expect(status.isReady).toBe(false);
    expect(status.cardCount).toBe(HERO_DECK_SIZE);
  });

  it('auto-fills without exceeding deck, rarity, or ownership limits', () => {
    const mythicCardId = 99;
    const validCards = [
      ...Array.from({ length: 15 }, (_, index) => makeCard(index + 1)),
      makeCard(mythicCardId, 'druid', 'mythic'),
    ];
    const currentDeckIds = [mythicCardId];
    const generated = generateAutoFillCards(
      currentDeckIds,
      validCards,
      HERO_DECK_SIZE,
      cardId => {
        if (cardId === 1) return 1;
        if (cardId === mythicCardId) return 1;
        return 2;
      },
      () => 0,
    );
    const finalDeckIds = [...currentDeckIds, ...generated];
    const counts = finalDeckIds.reduce<Record<number, number>>((accumulator, cardId) => {
      accumulator[cardId] = (accumulator[cardId] ?? 0) + 1;
      return accumulator;
    }, {});

    expect(finalDeckIds).toHaveLength(HERO_DECK_SIZE);
    expect(counts[1]).toBe(1);
    expect(counts[mythicCardId]).toBe(1);
    for (const cardId of Object.keys(counts).map(Number)) {
      const maxCopies = cardId === mythicCardId ? 1 : 2;
      expect(counts[cardId]).toBeLessThanOrEqual(maxCopies);
    }
  });

  it('builds a per-piece warband loadout only from decks matching the selected heroes', () => {
    const army = makeArmy();
    const readyDecks = Object.fromEntries(
      HERO_DECK_PIECE_TYPES.map(pieceType => [pieceType, makeDeck(pieceType, army[pieceType].id)]),
    ) as Record<PieceType, HeroDeck>;

    const ready = buildWarbandLoadout(army, readyDecks, { getCardById });

    expect(ready.kind).toBe('ready');
    if (ready.kind !== 'ready') return;
    expect(ready.deckCardIds).toHaveLength(HERO_DECK_SIZE * HERO_DECK_PIECE_TYPES.length);
    for (const pieceType of HERO_DECK_PIECE_TYPES) {
      expect(ready.deckCardIdsByPiece[pieceType]).toHaveLength(HERO_DECK_SIZE);
    }

    const invalid = buildWarbandLoadout(
      army,
      {
        ...readyDecks,
        rook: makeDeck('rook', 'different-rook'),
      },
      { getCardById },
    );

    expect(invalid.kind).toBe('invalid');
    if (invalid.kind !== 'invalid') return;
    expect(invalid.statuses.rook.kind).toBe('hero_mismatch');
  });

  it('builds a campaign-legal deck from QA full-catalog access without NFT ownership or CardXP', () => {
    const qaCards = getQaFullCatalogCardsForRuntime(QA_SEASON_0_CONFIG);
    const qaCopiesByCardId = new Map(qaCards.map(card => [card.cardId, card.ownedCopies]));
    const validMageGenesisCards = filterCardsByHero(cardRegistry, 'mage', 'hero-erik-flameheart')
      .filter(card => card.category === 'genesis');
    const deckCardIds = buildCompleteDeckIds(validMageGenesisCards);
    const deck: HeroDeck = {
      pieceType: 'queen',
      heroId: 'hero-erik-flameheart',
      heroClass: 'mage',
      cardIds: deckCardIds,
    };

    const localValidation = validateHeroDeck(deck, {
      pieceType: 'queen',
      heroId: deck.heroId,
      heroClass: deck.heroClass,
      getCardById: cardId => cardRegistry.find(card => Number(card.id) === cardId),
      getOwnedCopies: cardId => qaCopiesByCardId.get(cardId) ?? 0,
      enforceOwnership: true,
    });

    expect(localValidation.valid).toBe(true);

    const collection = buildPlayerCollection({ qaFullCatalogCards: qaCards });
    const parsed = buildDeckClaimsFromCardIds({ cardIds: deckCardIds, collection });
    expect(parsed.status).toBe('parsed');
    if (parsed.status !== 'parsed') throw new Error('expected QA deck claims to parse');
    expect(parsed.claims.every(claim => claim.authority === 'qa_full_catalog')).toBe(true);

    const decision = verifyDeckClaims({ claims: parsed.claims, collection });
    expect(decision.status).toBe('verified');
    if (decision.status !== 'verified') throw new Error('expected QA deck to verify');
    expect(decision.cards).toHaveLength(HERO_DECK_SIZE);
    for (const card of decision.cards) {
      expect(card.authority).toBe('qa_full_catalog');
      expect(card.transferable).toBe(false);
      expect(card.earnsCardXp).toBe(false);
      expect(card).toHaveProperty('resetEpoch', QA_SEASON_0_CONFIG.resetEpoch);
      expect('nftUid' in card).toBe(false);
      expect('xp' in card).toBe(false);
      expect('level' in card).toBe(false);
    }
  });
});
