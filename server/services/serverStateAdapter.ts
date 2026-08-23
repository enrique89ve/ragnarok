/**
 * serverStateAdapter.ts — StateAdapter backed by durable chainState.ts
 *
 * PR 2B: ALL protocol state delegates to chainState Maps (persisted to JSON).
 * No module-local Maps — crash-safe resume requires every state mutation
 * to flow through the persistence layer.
 */

import type {
	StateAdapter, CardAsset, GenesisRecord,
	MatchAnchorRecord, PackCommitRecord, SupplyRecord,
} from '../../shared/protocol-core/types';
import {
	getCard as csGetCard, putCard as csPutCard, deleteCard as csDeleteCard,
	getCardsByOwner as csGetCardsByOwner,
	getOrCreatePlayer, advanceNonce as csAdvanceNonce,
	registerAccount,
	getGenesisState, setGenesisState,
	getSupplyCounter, setSupplyCounter,
	getRuneBalance as csGetRuneBalance,
	getRuneLedgerEntry as csGetRuneLedgerEntry, setRuneLedgerEntry as csSetRuneLedgerEntry,
	getRuneLedgerEntries as csGetRuneLedgerEntries,
	getRuneLedgerTotal as csGetRuneLedgerTotal,
	getEitrLedgerEntry as csGetEitrLedgerEntry, setEitrLedgerEntry as csSetEitrLedgerEntry,
	getEitrLedgerEntries as csGetEitrLedgerEntries,
	getEitrLedgerTotal as csGetEitrLedgerTotal,
	getForgeCommit as csGetForgeCommit, setForgeCommit as csSetForgeCommit,
	getUnrevealedForgeCommitsBefore as csGetUnrevealedForgeCommitsBefore,
	getMatchAnchor as csGetMatchAnchor, setMatchAnchor as csSetMatchAnchor,
	getPackCommit as csGetPackCommit, setPackCommit as csSetPackCommit,
	hasRewardClaim as csHasRewardClaim, addRewardClaim as csAddRewardClaim,
	getDuatClaim as csGetDuatClaim, setDuatClaim as csSetDuatClaim,
	advanceCampaignNonce as csAdvanceCampaignNonce,
	getCampaignSubmission as csGetCampaignSubmission, setCampaignSubmission as csSetCampaignSubmission,
	getCampaignProgress as csGetCampaignProgress, setCampaignProgress as csSetCampaignProgress,
	isSlashed as csIsSlashed, addSlashed as csAddSlashed,
	getPackAsset as csGetPackAsset, setPackAsset as csSetPackAsset, deletePackAsset as csDeletePackAsset,
	getPackAssetsByOwner as csGetPackAssetsByOwner,
	getPackSupplyRecord as csGetPackSupplyRecord, setPackSupplyRecord as csSetPackSupplyRecord,
	getQueueEntry as csGetQueueEntry, setQueueEntry as csSetQueueEntry,
	deleteQueueEntryFn as csDeleteQueueEntry,
	getMarketListing as csGetMarketListing, putMarketListing as csPutMarketListing,
	deleteMarketListing as csDeleteMarketListing, getListingsByNft as csGetListingsByNft,
	getMarketOffer as csGetMarketOffer, putMarketOffer as csPutMarketOffer,
	getOffersByNft as csGetOffersByNft,
	type CardRecord,
	type GenesisStateRecord,
	type SupplyCounterRecord,
	type MatchAnchorStateRecord,
	type PackCommitStateRecord,
} from './chainState';

// ============================================================
// Converters
// ============================================================

function cardRecordToAsset(r: CardRecord): CardAsset {
	return {
		uid: r.uid, cardId: r.cardId, owner: r.owner, rarity: r.rarity,
		level: r.level, xp: r.xp, edition: r.edition ?? 'alpha',
		foil: r.foil,
		mintSource: r.mintSource ?? 'genesis',
		mintTrxId: r.mintTrxId ?? '',
		mintBlockNum: r.mintBlockNum ?? 0,
		lastTransferBlock: r.lastTransferBlock ?? 0,
		originDna: r.originDna,
		instanceDna: r.instanceDna,
		parentInstanceDna: r.parentInstanceDna,
		generation: r.generation,
		replicaCount: r.replicaCount,
		mergedFrom: r.mergedFrom,
		acquisition: r.acquisition,
	};
}

function assetToCardRecord(a: CardAsset): CardRecord {
	return {
		uid: a.uid,
		cardId: a.cardId,
		owner: a.owner,
		rarity: a.rarity,
		level: a.level,
		xp: a.xp,
		edition: a.edition,
		foil: a.foil,
		mintSource: a.mintSource,
		mintTrxId: a.mintTrxId,
		mintBlockNum: a.mintBlockNum,
		lastTransferBlock: a.lastTransferBlock,
		originDna: a.originDna,
		instanceDna: a.instanceDna,
		parentInstanceDna: a.parentInstanceDna,
		generation: a.generation,
		replicaCount: a.replicaCount,
		mergedFrom: a.mergedFrom,
		acquisition: a.acquisition,
	};
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
		engineHash: a.engineHash, cardRegistryHash: a.cardRegistryHash,
		dualAnchored: a.dualAnchored, timestamp: a.timestamp,
	};
}

function recordToAnchor(r: MatchAnchorStateRecord): MatchAnchorRecord {
	return {
		matchId: r.matchId, playerA: r.playerA, playerB: r.playerB,
		pubkeyA: r.pubkeyA, pubkeyB: r.pubkeyB,
		deckHashA: r.deckHashA, deckHashB: r.deckHashB,
		engineHash: r.engineHash, cardRegistryHash: r.cardRegistryHash,
		dualAnchored: r.dualAnchored, timestamp: r.timestamp,
	};
}

function commitToRecord(c: PackCommitRecord): PackCommitStateRecord {
	return { trxId: c.trxId, account: c.account, packType: c.packType, quantity: c.quantity, saltCommit: c.saltCommit, commitBlock: c.commitBlock, revealed: c.revealed };
}

function recordToCommit(r: PackCommitStateRecord): PackCommitRecord {
	return { trxId: r.trxId, account: r.account, packType: r.packType, quantity: r.quantity, saltCommit: r.saltCommit, commitBlock: r.commitBlock, revealed: r.revealed };
}

// ============================================================
// v1.1: In-memory store for ephemeral companion transfers
// ============================================================

const _trxSiblings = new Map<string, unknown[]>();

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

	async getTokenBalance(account, seasonId) {
		const r = csGetRuneBalance(account, seasonId);
		return r ? { account: r.account, RUNE: r.RUNE } : { account, RUNE: 0 };
	},
	async getRuneLedgerEntry(entryId) { return csGetRuneLedgerEntry(entryId) ?? null; },
	async putRuneLedgerEntry(entry) { csSetRuneLedgerEntry(entry); },
	async getRuneLedgerEntries(query) { return csGetRuneLedgerEntries(query); },
	async getRuneLedgerTotal(query) { return csGetRuneLedgerTotal(query); },
	async getEitrLedgerEntry(entryId) { return csGetEitrLedgerEntry(entryId) ?? null; },
	async putEitrLedgerEntry(entry) { csSetEitrLedgerEntry(entry); },
	async getEitrLedgerEntries(query) { return csGetEitrLedgerEntries(query); },
	async getEitrLedgerTotal(query) { return csGetEitrLedgerTotal(query); },
	async getForgeCommit(trxId) { return csGetForgeCommit(trxId) ?? null; },
	async putForgeCommit(commit) { csSetForgeCommit(commit); },
	async getUnrevealedForgeCommitsBefore(deadlineBlock) { return csGetUnrevealedForgeCommitsBefore(deadlineBlock); },

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

	async advanceCampaignNonce(account, nonce) { return csAdvanceCampaignNonce(account, nonce); },
	async getCampaignSubmission(submissionKey) {
		return csGetCampaignSubmission(submissionKey) ?? null;
	},
	async putCampaignSubmission(submission) { csSetCampaignSubmission(submission); },
	async getCampaignProgress(account, campaignId, missionId) {
		return csGetCampaignProgress(account, campaignId, missionId) ?? null;
	},
	async putCampaignProgress(progress) { csSetCampaignProgress(progress); },

	async isSlashed(account) { return csIsSlashed(account); },
	async slash(account) { csAddSlashed(account); },

	async getQueueEntry(account) { return csGetQueueEntry(account) ?? null; },
	async putQueueEntry(account, data) { csSetQueueEntry(account, data); },
	async deleteQueueEntry(account) { csDeleteQueueEntry(account); },

	// v1.1: Pack NFTs + companion transfers
	async getPack(uid) { return csGetPackAsset(uid) ?? null; },
	async putPack(pack) {
		csSetPackAsset(pack);
		registerAccount(pack.owner);
	},
	async deletePack(uid) { csDeletePackAsset(uid); },
	async getPacksByOwner(owner) {
		return csGetPackAssetsByOwner(owner);
	},
	async getPackSupply(packType) { return csGetPackSupplyRecord(packType) ?? null; },
	async putPackSupply(record) { csSetPackSupplyRecord(record); },

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
	async getDuatClaim(account) { return csGetDuatClaim(account) ?? null; },
	async putDuatClaim(claim) { csSetDuatClaim(claim); },

	// v1.2: Marketplace
	async getListing(listingId) { return csGetMarketListing(listingId) ?? null; },
	async getListingByNft(nftUid) {
		return csGetListingsByNft(nftUid)[0] ?? null;
	},
	async putListing(listing) { csPutMarketListing(listing); },
	async deleteListing(listingId) { csDeleteMarketListing(listingId); },
	async getOffer(offerId) { return csGetMarketOffer(offerId) ?? null; },
	async getOffersByNft(nftUid) {
		return csGetOffersByNft(nftUid);
	},
	async putOffer(offer) { csPutMarketOffer(offer); },
};
