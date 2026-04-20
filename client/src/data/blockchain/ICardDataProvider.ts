/**
 * ICardDataProvider — Interface for card data access from the blockchain layer.
 *
 * Breaks the reverse coupling where blockchain code (replayRules, packDerivation,
 * nftMetadataGenerator) imports from game/data/allCards and game/utils/art/.
 *
 * Wire at app startup via setCardDataProvider() before chain replay starts.
 */

export interface CardDataMinimal {
	id: number;
	name: string;
	rarity: string;
	type: string;
	race?: string;
	collectible?: boolean;
}

export interface ICardDataProvider {
	getCardById(id: number): CardDataMinimal | undefined;
	getAllCards(): CardDataMinimal[];
	getCardArtPath(name: string, cardId?: number): string | null;
}

let provider: ICardDataProvider | null = null;

export function setCardDataProvider(p: ICardDataProvider): void {
	provider = p;
}

export function hasCardDataProvider(): boolean {
	return provider !== null;
}

export function getCardDataProvider(): ICardDataProvider {
	if (!provider) {
		throw new Error(
			'Card data provider not initialized. Call setCardDataProvider() at app startup.',
		);
	}
	return provider;
}
