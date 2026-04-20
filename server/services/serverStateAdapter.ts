/**
 * serverStateAdapter.ts — StateAdapter backed by durable chainState.ts
 *
 * PR 2B: ALL protocol state delegates to chainState Maps (persisted to JSON).
 * No module-local Maps — crash-safe resume requires every state mutation
 * to flow through the persistence layer.
 */

import type {
	StateAdapter, CardAsset, GenesisRecord, EloRecord,
	TokenBalance, MatchAnchorRecord, PackCommitRecord, SupplyRecord,
} from '../../shared/protocol-core/types';
import {
	getCard as csGetCard, putCard as csPutCard, deleteCard as csDeleteCard,
	getCardsByOwner as csGetCardsByOwner,
	getOrCreatePlayer, advanceNonce as csAdvanceNonce,
	registerAccount,
	getGenesisState, setGenesisState,
	getSupplyCounter, setSupplyCounter,
	getTokenBalance as csGetTokenBalance, setTokenBalance as csSetTokenBalance,
	getMatchAnchor as csGetMatchAnchor, setMatchAnchor as csSetMatchAnchor,
	getPackCommit as csGetPackCommit, setPackCommit as csSetPackCommit,
	hasRewardClaim as csHasRewardClaim, addRewardClaim as csAddRewardClaim,
	isSlashed as csIsSlashed, addSlashed as csAddSlashed,
	getQueueEntry as csGetQueueEntry, setQueueEntry as csSetQueueEntry,
	deleteQueueEntryFn as csDeleteQueueEntry,
	type CardRecord,
	type GenesisStateRecord,
	type SupplyCounterRecord,
	type MatchAnchorStateRecord,
	type PackCommitStateRecord,
	type TokenBalanceRecord,
} from './chainState';

// ============================================================
// Converters
// ============================================================

function cardRecordToAsset(r: CardRecord): CardAsset {
	return {
		uid: r.uid, cardId: r.cardId, owner: r.owner, rarity: r.rarity,
		level: r.level, xp: r.xp, edition: 'alpha', mintSource: 'genesis',
		mintTrxId: '', mintBlockNum: 0, lastTransferBlock: 0,
	};
}

function assetToCardRecord(a: CardAsset): CardRecord {
	return { uid: a.uid, cardId: a.cardId, owner: a.owner, rarity: a.rarity, level: a.level, xp: a.xp };
}

function genesisToRecord(g: GenesisRecord): GenesisStateRecord {
	return { version: g.version, sealed: g.sealed, sealBlock: g.sealBlock, packSupply: g.packSupply, rewardSupply: g.rewardSupply };
}

function recordToGenesis(r: GenesisStateRecord): GenesisRecord {
	return { version: r.version, sealed: r.sealed, sealBlock: r.sealBlock, packSupply: r.packSupply, rewardSupply: r.rewardSupply };
}

function supplyToRecord(s: SupplyRecord): SupplyCounterRecord {
	return { key: s.key, pool: s.pool, cap: s.cap, minted: s.minted };
}

function recordToSupply(r: SupplyCounterRecord): SupplyRecord {
	return { key: r.key, pool: r.pool, cap: r.cap, minted: r.minted };
}

function anchorToRecord(a: MatchAnchorRecord): MatchAnchorStateRecord {
	return {
		matchId: a.matchId, playerA: a.playerA, playerB: a.playerB,
		pubkeyA: a.pubkeyA, pubkeyB: a.pubkeyB,
		deckHashA: a.deckHashA, deckHashB: a.deckHashB,
		engineHash: a.engineHash, dualAnchored: a.dualAnchored, timestamp: a.timestamp,
	};
}

function recordToAnchor(r: MatchAnchorStateRecord): MatchAnchorRecord {
	return {
		matchId: r.matchId, playerA: r.playerA, playerB: r.playerB,
		pubkeyA: r.pubkeyA, pubkeyB: r.pubkeyB,
		deckHashA: r.deckHashA, deckHashB: r.deckHashB,
		engineHash: r.engineHash, dualAnchored: r.dualAnchored, timestamp: r.timestamp,
	};
}

function commitToRecord(c: PackCommitRecord): PackCommitStateRecord {
	return { trxId: c.trxId, account: c.account, packType: c.packType, quantity: c.quantity, saltCommit: c.saltCommit, commitBlock: c.commitBlock, revealed: c.revealed };
}

function recordToCommit(r: PackCommitStateRecord): PackCommitRecord {
	return { trxId: r.trxId, account: r.account, packType: r.packType, quantity: r.quantity, saltCommit: r.saltCommit, commitBlock: r.commitBlock, revealed: r.revealed };
}

// ============================================================
// v1.1: In-memory stores for pack NFTs + companion transfers
// ============================================================

const _packStore = new Map<string, import('../../shared/protocol-core/types').PackAsset>();
const _packSupplyStore = new Map<string, import('../../shared/protocol-core/types').PackSupplyRecord>();
const _trxSiblings = new Map<string, unknown[]>();
const _duatClaimStore = new Map<string, import('../../shared/protocol-core/types').DuatClaimRecord>();
const _listingStore = new Map<string, import('../../shared/protocol-core/types').MarketListing>();
const _offerStore = new Map<string, import('../../shared/protocol-core/types').MarketOffer>();

// ============================================================
// StateAdapter — all delegates to chainState (durable)
// ============================================================

export const serverStateAdapter: StateAdapter = {
	async getGenesis() {
		const r = getGenesisState();
		return r ? recordToGenesis(r) : null;
	},
	async putGenesis(g) { setGenesisState(genesisToRecord(g)); },

	async getCard(uid) {
		const r = csGetCard(uid);
		return r ? cardRecordToAsset(r) : null;
	},
	async putCard(card) {
		csPutCard(assetToCardRecord(card));
		registerAccount(card.owner);
	},
	async deleteCard(uid) { csDeleteCard(uid); },
	async getCardsByOwner(owner) { return csGetCardsByOwner(owner).map(cardRecordToAsset); },

	async getSupply(key, pool) {
		const mapKey = `${pool}:${key}`;
		const r = getSupplyCounter(mapKey);
		return r ? recordToSupply(r) : null;
	},
	async putSupply(s) { setSupplyCounter(`${s.pool}:${s.key}`, supplyToRecord(s)); },

	async advanceNonce(account, nonce) { return csAdvanceNonce(account, nonce); },

	async getElo(account) {
		const p = getOrCreatePlayer(account);
		return { account, elo: p.elo, wins: p.wins, losses: p.losses };
	},
	async putElo(r) {
		const p = getOrCreatePlayer(r.account);
		p.elo = r.elo;
		p.wins = r.wins;
		p.losses = r.losses;
	},

	async getTokenBalance(account) {
		const r = csGetTokenBalance(account);
		return r ? { account: r.account, RUNE: r.RUNE } : { account, RUNE: 0 };
	},
	async putTokenBalance(b) { csSetTokenBalance(b.account, { account: b.account, RUNE: b.RUNE }); },

	async getMatchAnchor(matchId) {
		const r = csGetMatchAnchor(matchId);
		return r ? recordToAnchor(r) : null;
	},
	async putMatchAnchor(a) { csSetMatchAnchor(a.matchId, anchorToRecord(a)); },

	async getPackCommit(trxId) {
		const r = csGetPackCommit(trxId);
		return r ? recordToCommit(r) : null;
	},
	async putPackCommit(c) { csSetPackCommit(c.trxId, commitToRecord(c)); },
	async getUnrevealedCommitsBefore(deadlineBlock: number) {
		const { getUnrevealedCommitsBefore: csGetUnrevealed } = await import('./chainState');
		return csGetUnrevealed(deadlineBlock).map(recordToCommit);
	},

	async hasRewardClaim(account, rewardId) { return csHasRewardClaim(`${account}:${rewardId}`); },
	async putRewardClaim(account, rewardId) { csAddRewardClaim(`${account}:${rewardId}`); },

	async isSlashed(account) { return csIsSlashed(account); },
	async slash(account) { csAddSlashed(account); },

	async getQueueEntry(account) { return csGetQueueEntry(account) ?? null; },
	async putQueueEntry(account, data) { csSetQueueEntry(account, { timestamp: data.timestamp }); },
	async deleteQueueEntry(account) { csDeleteQueueEntry(account); },

	// v1.1: Pack NFTs + companion transfers
	async getPack(uid) { return _packStore.get(uid) ?? null; },
	async putPack(pack) { _packStore.set(pack.uid, pack); },
	async deletePack(uid) { _packStore.delete(uid); },
	async getPacksByOwner(owner) {
		const result: import('../../shared/protocol-core/types').PackAsset[] = [];
		for (const p of _packStore.values()) {
			if (p.owner === owner) result.push(p);
		}
		return result;
	},
	async getPackSupply(packType) { return _packSupplyStore.get(packType) ?? null; },
	async putPackSupply(record) { _packSupplyStore.set(record.packType, record); },

	async getCompanionTransfer(trxId) {
		const siblings = _trxSiblings.get(trxId);
		if (!siblings) return null;
		for (const op of siblings) {
			const arr = op as [string, Record<string, string>];
			if (arr[0] === 'transfer') {
				return { from: arr[1].from, to: arr[1].to, amount: arr[1].amount, memo: arr[1].memo || '' };
			}
		}
		return null;
	},
	setTrxSiblings(trxId, ops) { _trxSiblings.set(trxId, ops); },

	// v1.2: DUAT Airdrop
	async getDuatClaim(account) { return _duatClaimStore.get(account) ?? null; },
	async putDuatClaim(claim) { _duatClaimStore.set(claim.account, claim); },

	// v1.2: Marketplace (in-memory, same pattern as packs)
	async getListing(listingId) { return _listingStore.get(listingId) ?? null; },
	async getListingByNft(nftUid) {
		for (const l of _listingStore.values()) {
			if (l.nftUid === nftUid && l.active) return l;
		}
		return null;
	},
	async putListing(listing) { _listingStore.set(listing.listingId, listing); },
	async deleteListing(listingId) { _listingStore.delete(listingId); },
	async getOffer(offerId) { return _offerStore.get(offerId) ?? null; },
	async getOffersByNft(nftUid) {
		const result: import('../../shared/protocol-core/types').MarketOffer[] = [];
		for (const o of _offerStore.values()) {
			if (o.nftUid === nftUid) result.push(o);
		}
		return result;
	},
	async putOffer(offer) { _offerStore.set(offer.offerId, offer); },
};
