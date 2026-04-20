/**
 * clientStateAdapter.ts — Browser StateAdapter over IndexedDB (replayDB.ts)
 *
 * PR 3: Bridges protocol-core's abstract StateAdapter interface to the
 * client's existing IndexedDB persistence layer. No new storage — just an
 * adapter over replayDB.ts functions.
 */

import type {
	StateAdapter, CardAsset, GenesisRecord, EloRecord,
	TokenBalance, MatchAnchorRecord, PackCommitRecord, SupplyRecord,
	PackAsset, PackSupplyRecord, CompanionTransfer,
	MarketListing, MarketOffer, DuatClaimRecord,
} from '../../../../shared/protocol-core/types';
import {
	getCard, putCard, deleteCard, getCardsByOwner,
	getGenesisState, putGenesisState,
	getSupplyCounter, putSupplyCounter,
	getTokenBalance, putTokenBalance,
	getMatchAnchor, putMatchAnchor,
	getQueueEntry, putQueueEntry, deleteQueueEntry,
	isAccountSlashed, putSlashedAccount,
	advancePlayerNonce,
	getEloRating, putEloRating,
	getRewardClaim, putRewardClaim,
	getPack as idbGetPack, putPack as idbPutPack, deletePack as idbDeletePack,
	getPacksByOwner as idbGetPacksByOwner,
	getPackSupply as idbGetPackSupply, putPackSupply as idbPutPackSupply,
	getDuatClaim as idbGetDuatClaim, putDuatClaim as idbPutDuatClaim,
	getListing as idbGetListing, putListing as idbPutListing,
	deleteListing as idbDeleteListing, getListingByNftUid as idbGetListingByNft,
	getOffer as idbGetOffer, putOffer as idbPutOffer,
	getOffersByNftUid as idbGetOffersByNft,
} from './replayDB';
import type { HiveCardAsset } from '../schemas/HiveTypes';

// ============================================================
// Converters: replayDB types ↔ protocol-core types
// ============================================================

function hiveCardToAsset(c: HiveCardAsset): CardAsset {
	return {
		uid: c.uid, cardId: c.cardId, owner: c.ownerId, rarity: c.rarity || 'common',
		level: c.level || 1, xp: c.xp || 0, edition: c.edition || 'alpha',
		mintSource: 'genesis', mintTrxId: c.mintTrxId || '', mintBlockNum: c.mintBlockNum || 0,
		lastTransferBlock: c.lastTransferBlock || 0,
	};
}

function assetToHiveCard(a: CardAsset): HiveCardAsset {
	return {
		uid: a.uid, cardId: a.cardId, ownerId: a.owner, rarity: a.rarity,
		level: a.level, xp: a.xp, edition: a.edition as HiveCardAsset['edition'],
		foil: 'standard', lastTransferBlock: a.lastTransferBlock,
		lastTransferTrxId: '', mintBlockNum: a.mintBlockNum, mintTrxId: a.mintTrxId,
		name: '', type: 'minion',
	};
}

// ============================================================
// v1.1: Companion transfer sibling cache (per-replay, in-memory)
// ============================================================

const _trxSiblings = new Map<string, unknown[]>();

// ============================================================
// StateAdapter implementation over IndexedDB
// ============================================================

export const clientStateAdapter: StateAdapter = {
	async getGenesis() {
		const g = await getGenesisState();
		if (!g.version) return null;
		return {
			version: g.version, sealed: g.sealed,
			sealBlock: g.sealedAtBlock ?? 0,
			packSupply: g.cardDistribution ?? {},
			rewardSupply: {},
		};
	},
	async putGenesis(genesis) {
		await putGenesisState({
			key: 'singleton', version: genesis.version,
			totalSupply: 0, cardDistribution: genesis.packSupply,
			sealed: genesis.sealed, sealedAtBlock: genesis.sealBlock || null,
			readerHash: '', genesisBlock: 0,
		});
	},

	async getCard(uid) {
		const c = await getCard(uid);
		return c ? hiveCardToAsset(c) : null;
	},
	async putCard(card) { await putCard(assetToHiveCard(card)); },
	async deleteCard(uid) { await deleteCard(uid); },
	async getCardsByOwner(owner) {
		const cards = await getCardsByOwner(owner);
		return cards.map(hiveCardToAsset);
	},

	async getSupply(key, pool) {
		const mapKey = `${pool}:${key}`;
		const r = await getSupplyCounter(mapKey);
		if (!r) return null;
		return { key, pool, cap: r.cap, minted: r.minted };
	},
	async putSupply(s) {
		await putSupplyCounter({ rarity: `${s.pool}:${s.key}`, cap: s.cap, minted: s.minted });
	},

	async advanceNonce(account, nonce) {
		return advancePlayerNonce(account, nonce);
	},

	async getElo(account) {
		const r = await getEloRating(account);
		return { account, elo: r.elo, wins: r.wins, losses: r.losses };
	},
	async putElo(r) {
		const existing = await getEloRating(r.account);
		await putEloRating({ ...existing, elo: r.elo, wins: r.wins, losses: r.losses });
	},

	async getTokenBalance(account) {
		const r = await getTokenBalance(account);
		return { account, RUNE: r.RUNE };
	},
	async putTokenBalance(b) {
		const existing = await getTokenBalance(b.account);
		await putTokenBalance({ ...existing, RUNE: b.RUNE });
	},

	async getMatchAnchor(matchId) {
		const a = await getMatchAnchor(matchId);
		if (!a) return null;
		return {
			matchId: a.matchId, playerA: a.playerA, playerB: a.playerB,
			dualAnchored: a.dualAnchored, timestamp: a.timestamp,
		};
	},
	async putMatchAnchor(a) {
		await putMatchAnchor({
			matchId: a.matchId, playerA: a.playerA, playerB: a.playerB,
			matchHash: '', anchorBlockA: null, anchorBlockB: null,
			anchorTxA: null, anchorTxB: null, dualAnchored: a.dualAnchored,
			deckHashA: a.deckHashA ?? null, deckHashB: a.deckHashB ?? null,
			timestamp: a.timestamp,
		});
	},

	// Pack commits (v1 new flow)
	async getPackCommit() { return null; },
	async putPackCommit() { /* client fast-mode delegates pack state to server */ },
	async getUnrevealedCommitsBefore() { return []; /* auto-finalize runs on server only */ },

	async hasRewardClaim(account, rewardId) {
		const r = await getRewardClaim(account, rewardId);
		return !!r;
	},
	async putRewardClaim(account, rewardId, blockNum) {
		await putRewardClaim({
			claimKey: `${account}:${rewardId}`, account, rewardId,
			claimedAt: Date.now(), blockNum, trxId: '',
		});
	},

	async isSlashed(account) { return isAccountSlashed(account); },
	async slash(account, reason, blockNum) {
		await putSlashedAccount({
			account, reason, evidenceTxA: '', evidenceTxB: '',
			slashedAtBlock: blockNum, submittedBy: '',
		});
	},

	async getQueueEntry(account) {
		const q = await getQueueEntry(account);
		return q ? { timestamp: q.timestamp } : null;
	},
	async putQueueEntry(account, data) {
		await putQueueEntry({
			account, mode: data.mode, elo: data.elo,
			peerId: '', deckHash: '', timestamp: data.timestamp, blockNum: data.blockNum,
		});
	},
	async deleteQueueEntry(account) { await deleteQueueEntry(account); },

	// v1.1: Pack NFTs (IndexedDB-backed)
	async getPack(uid) {
		const p = await idbGetPack(uid);
		return p ? { ...p } as PackAsset : null;
	},
	async putPack(pack) { await idbPutPack(pack); },
	async deletePack(uid) { await idbDeletePack(uid); },
	async getPacksByOwner(owner) {
		const packs = await idbGetPacksByOwner(owner);
		return packs as PackAsset[];
	},
	async getPackSupply(packType) {
		const s = await idbGetPackSupply(packType);
		return s ? { ...s } as PackSupplyRecord : null;
	},
	async putPackSupply(record) { await idbPutPackSupply(record); },

	async getCompanionTransfer(trxId) {
		const siblings = _trxSiblings.get(trxId);
		if (!siblings) return null;
		for (const op of siblings) {
			const arr = op as [string, Record<string, string>];
			if (arr[0] === 'transfer') {
				return {
					from: arr[1].from, to: arr[1].to,
					amount: arr[1].amount, memo: arr[1].memo || '',
				};
			}
		}
		return null;
	},
	setTrxSiblings(trxId, ops) { _trxSiblings.set(trxId, ops); },

	// v1.2: DUAT Airdrop
	async getDuatClaim(account) {
		const c = await idbGetDuatClaim(account);
		return c ? { ...c } as DuatClaimRecord : null;
	},
	async putDuatClaim(claim) { await idbPutDuatClaim(claim as Parameters<typeof idbPutDuatClaim>[0]); },

	// v1.2: Marketplace
	async getListing(listingId) {
		const l = await idbGetListing(listingId);
		return l ? { ...l } as MarketListing : null;
	},
	async getListingByNft(nftUid) {
		const l = await idbGetListingByNft(nftUid);
		return l ? { ...l } as MarketListing : null;
	},
	async putListing(listing) { await idbPutListing(listing as Parameters<typeof idbPutListing>[0]); },
	async deleteListing(listingId) { await idbDeleteListing(listingId); },
	async getOffer(offerId) {
		const o = await idbGetOffer(offerId);
		return o ? { ...o } as MarketOffer : null;
	},
	async getOffersByNft(nftUid) {
		const offers = await idbGetOffersByNft(nftUid);
		return offers as MarketOffer[];
	},
	async putOffer(offer) { await idbPutOffer(offer as Parameters<typeof idbPutOffer>[0]); },
};
