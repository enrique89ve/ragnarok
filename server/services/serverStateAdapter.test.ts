import { beforeEach, describe, expect, it } from 'vitest';

import type { MarketListing, MarketOffer } from '../../shared/protocol-core/types';
import {
	exportState,
	getActiveListings,
	getMarketListing,
	getOffersByNft,
	importState,
} from './chainState';
import { serverStateAdapter } from './serverStateAdapter';

function resetChainState(): void {
	importState({
		players: [],
		cards: [],
		matches: [],
		knownAccounts: [],
		syncCursors: [],
		lastSyncedAt: 0,
		playerNonces: [],
	});
}

describe('serverStateAdapter marketplace persistence', () => {
	beforeEach(() => {
		resetChainState();
	});

	it('writes listings to the chainState explorer read surface', async () => {
		const listing: MarketListing = {
			listingId: 'list_tx-1',
			nftUid: 'card-101',
			nftType: 'card',
			seller: 'seller',
			price: 12.5,
			currency: 'HIVE',
			listedBlock: 42,
			listedTrxId: 'tx-1',
			active: true,
		};

		await serverStateAdapter.putListing(listing);

		expect(await serverStateAdapter.getListing(listing.listingId)).toEqual(listing);
		expect(getMarketListing(listing.listingId)).toEqual(listing);
		expect(getActiveListings('recent').listings).toEqual([listing]);
		expect(exportState().marketListings).toEqual([[listing.listingId, listing]]);
	});

	it('writes offers to the chainState explorer read surface', async () => {
		const offer: MarketOffer = {
			offerId: 'offer_tx-2',
			nftUid: 'card-101',
			buyer: 'buyer',
			price: 7,
			currency: 'HBD',
			offeredBlock: 43,
			offeredTrxId: 'tx-2',
			status: 'pending',
		};

		await serverStateAdapter.putOffer(offer);

		expect(await serverStateAdapter.getOffer(offer.offerId)).toEqual(offer);
		expect(await serverStateAdapter.getOffersByNft(offer.nftUid)).toEqual([offer]);
		expect(getOffersByNft(offer.nftUid)).toEqual([offer]);
		expect(exportState().marketOffers).toEqual([[offer.offerId, offer]]);
	});
});
