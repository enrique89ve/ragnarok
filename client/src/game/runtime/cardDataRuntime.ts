import {
  setCardDataProvider,
  hasCardDataProvider,
  type CardDataMinimal,
} from '@/data/blockchain/ICardDataProvider';

let cardDataReady = false;
let cardDataInitPromise: Promise<void> | null = null;

function toCardDataMinimal(card: {
  id: string | number;
  name: string;
  rarity?: string;
  type: string;
  race?: string;
  collectible?: boolean;
}): CardDataMinimal | null {
  const normalizedId = typeof card.id === 'number' ? card.id : Number(card.id);

  if (!Number.isFinite(normalizedId)) {
    return null;
  }

  return {
    id: normalizedId,
    name: card.name,
    rarity: card.rarity ?? 'common',
    type: card.type,
    race: card.race,
    collectible: card.collectible,
  };
}

export function isCardDataRuntimeReady(): boolean {
  return cardDataReady || hasCardDataProvider();
}

export async function ensureCardDataRuntime(): Promise<void> {
  if (isCardDataRuntimeReady()) {
    cardDataReady = true;
    return;
  }

  if (!cardDataInitPromise) {
    cardDataInitPromise = Promise.all([
      import('@/game/data/allCards'),
      import('@/game/utils/art/artMapping'),
    ])
      .then(([allCardsModule, artMappingModule]) => {
        if (!hasCardDataProvider()) {
          setCardDataProvider({
            getCardById: (id) => {
              const card = allCardsModule.getCardById(id);
              return card ? toCardDataMinimal(card) ?? undefined : undefined;
            },
            getAllCards: () =>
              allCardsModule.default
                .map(toCardDataMinimal)
                .filter((card): card is CardDataMinimal => card !== null),
            getCardArtPath: (name, cardId) => artMappingModule.getRawCardArtPath(name, cardId),
          });
        }

        cardDataReady = true;
      })
      .finally(() => {
        cardDataInitPromise = null;
      });
  }

  await cardDataInitPromise;
}
