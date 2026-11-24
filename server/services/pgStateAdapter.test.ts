import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { createProtocolRuntimeFingerprint, type ProtocolRuntimeFingerprintInput } from '../../shared/protocolPhase';
import type {
	CardAsset,
	CampaignProgressRecord,
	CampaignSubmissionRecord,
	EitrLedgerEntry,
	ForgeCommitRecord,
	MarketListing,
	MarketOffer,
	PackAsset,
	PackCommitRecord,
	RuneLedgerEntry,
} from '../../shared/protocol-core/types';
import {
	createPgStateAdapter,
	verifyPgRuntimeFingerprint,
	type PgQueryExecutor,
} from './pgStateAdapter';

type Row = Record<string, unknown>;

class InMemoryPg {
	private tables = new Map<string, Map<string, Row>>();

	private tableForSql(sql: string): string | null {
		const match = sql.match(/(?:FROM|INTO|UPDATE|DELETE FROM)\s+([a-z_]+)/i);
		return match?.[1] ?? null;
	}

	private getStore(table: string): Map<string, Row> {
		if (!this.tables.has(table)) this.tables.set(table, new Map());
		return this.tables.get(table)!;
	}

	seedRuntimeMeta(key: string, value: unknown): void {
		this.getStore('runtime_meta').set(key, { key, value_json: value, updated_at: 1 });
	}

	seedQueueTimestamp(account: string, timestamp: string): void {
		this.getStore('queue_entries').set(account, {
			account,
			mode: 'ranked',
			elo: 1200,
			peer_id: 'peer',
			deck_hash: 'deck',
			timestamp,
			block_num: 1,
		});
	}

	executor: PgQueryExecutor = async (text, params = []) => {
		const sql = text.replace(/\s+/g, ' ').trim().toLowerCase();

		if (sql.startsWith('select value_json from runtime_meta')) {
			const row = this.getStore('runtime_meta').get(String(params[0]));
			return row ? [row] : [];
		}
		if (sql.startsWith('insert into runtime_meta')) {
			const key = String(params[0]);
			const store = this.getStore('runtime_meta');
			if (sql.includes('on conflict') && store.has(key)) {
				return [];
			}
			store.set(key, {
				key: params[0],
				value_json: typeof params[1] === 'string' ? JSON.parse(params[1] as string) : params[1],
				updated_at: params[2],
			});
			return [];
		}

		if (sql.includes('sum(case when direction')) {
			const account = String(params[0]);
			const seasonId = String(params[1]);
			const rows = [...this.getStore('rune_ledger').values()].filter(
				row => row.account === account && row.season_id === seasonId,
			);
			const balance = rows.reduce((acc, row) => {
				const amount = Number(row.amount);
				return acc + (row.direction === 'credit' ? amount : -amount);
			}, 0);
			return [{ balance }];
		}

		if (sql.includes('coalesce(sum(amount), 0) as total from rune_ledger')) {
			return [{ total: this.sumLedger('rune_ledger', sql, params) }];
		}
		if (sql.includes('coalesce(sum(amount), 0) as total from eitr_ledger')) {
			return [{ total: this.sumLedger('eitr_ledger', sql, params) }];
		}

		if (sql.startsWith('select * from rune_ledger where entry_id =')) {
			const row = this.getStore('rune_ledger').get(String(params[0]));
			return row ? [row] : [];
		}
		if (sql.startsWith('select * from eitr_ledger where entry_id =')) {
			const row = this.getStore('eitr_ledger').get(String(params[0]));
			return row ? [row] : [];
		}
		if (sql.startsWith('select * from rune_ledger where')) {
			return this.filterLedger('rune_ledger', sql, params);
		}
		if (sql.startsWith('select * from eitr_ledger where')) {
			return this.filterLedger('eitr_ledger', sql, params);
		}

		const table = this.tableForSql(sql);
		if (!table) return [];

		if (sql.startsWith('select * from') && sql.includes('where uid =')) {
			const row = this.getStore(table).get(String(params[0]));
			return row ? [row] : [];
		}
		if (sql.startsWith('select * from') && sql.includes('where owner =')) {
			return [...this.getStore(table).values()].filter(row => row.owner === params[0]);
		}
		if (sql.startsWith('select * from') && sql.includes('where trx_id =')) {
			const row = this.getStore(table).get(String(params[0]));
			return row ? [row] : [];
		}
		if (sql.startsWith('select * from') && sql.includes('where match_id =')) {
			const row = this.getStore(table).get(String(params[0]));
			return row ? [row] : [];
		}
		if (sql.startsWith('select * from') && sql.includes('where submission_key =')) {
			const row = this.getStore(table).get(String(params[0]));
			return row ? [row] : [];
		}
		if (sql.startsWith('select * from') && sql.includes('where progress_key =')) {
			const row = this.getStore(table).get(String(params[0]));
			return row ? [row] : [];
		}
		if (sql.startsWith('select * from') && sql.includes('where listing_id =')) {
			const row = this.getStore(table).get(String(params[0]));
			return row ? [row] : [];
		}
		if (sql.startsWith('select * from') && sql.includes('where offer_id =')) {
			const row = this.getStore(table).get(String(params[0]));
			return row ? [row] : [];
		}
		if (sql.startsWith('select * from') && sql.includes('where nft_uid =')) {
			const rows = [...this.getStore(table).values()].filter(row => row.nft_uid === params[0]);
			if (sql.includes("status = 'pending'")) {
				return rows.filter(row => row.status === 'pending');
			}
			if (sql.includes('active = true')) {
				const active = rows.filter(row => row.active === true);
				return active.length > 0 ? [active[0]] : [];
			}
			return rows;
		}
		if (sql.startsWith('select * from') && sql.includes('where pack_type =')) {
			const row = this.getStore(table).get(String(params[0]));
			return row ? [row] : [];
		}
		if (sql.startsWith('select * from') && sql.includes('where account =')) {
			const row = this.getStore(table).get(String(params[0]));
			return row ? [row] : [];
		}
		if (sql.startsWith('select * from') && sql.includes('where claim_key =')) {
			const row = this.getStore(table).get(String(params[0]));
			return row ? [row] : [];
		}
		if (sql.startsWith('select timestamp from queue_entries')) {
			const row = this.getStore('queue_entries').get(String(params[0]));
			return row ? [{ timestamp: row.timestamp }] : [];
		}
		if (sql.startsWith('select claim_key from reward_claims')) {
			const row = this.getStore('reward_claims').get(String(params[0]));
			return row ? [row] : [];
		}
		if (sql.startsWith('select account from slashed_accounts')) {
			const row = this.getStore('slashed_accounts').get(String(params[0]));
			return row ? [row] : [];
		}
		if (sql.startsWith('select elo, wins, losses from players')) {
			const row = this.getStore('players').get(String(params[0]));
			return row ? [{ elo: row.elo ?? 1000, wins: row.wins ?? 0, losses: row.losses ?? 0 }] : [];
		}
		if (sql.startsWith('select value_text from global_sync')) {
			const row = this.getStore('global_sync').get(String(params[0]));
			return row ? [{ value_text: row.value_text }] : [];
		}
		if (sql.startsWith('select * from supply_counters')) {
			const row = [...this.getStore('supply_counters').values()].find(
				r => r.key === params[0] && r.pool === params[1],
			);
			return row ? [row] : [];
		}
		if (sql.startsWith('select * from forge_commits where revealed = false')) {
			return [...this.getStore('forge_commits').values()].filter(row =>
				row.revealed === false && Number(row.commit_block) <= Number(params[0]),
			);
		}
		if (sql.startsWith('select * from pack_commits where revealed = false')) {
			return [...this.getStore('pack_commits').values()].filter(row =>
				row.revealed === false && Number(row.commit_block) + 200 <= Number(params[0]),
			);
		}

		if (sql.startsWith('insert into players')) {
			if (sql.includes('returning username')) {
				const account = String(params[0]);
				const store = this.getStore('players');
				const existing = store.get(account) ?? { username: account, nonce: 0, campaign_nonce: 0 };
				if (sql.includes('campaign_nonce')) {
					const nonce = Number(params[1]);
					if (nonce <= Number(existing.campaign_nonce ?? 0)) return [];
					existing.campaign_nonce = nonce;
				} else {
					const nonce = Number(params[1]);
					if (nonce <= Number(existing.nonce ?? 0)) return [];
					existing.nonce = nonce;
				}
				store.set(account, existing);
				return [{ username: account }];
			}
			const account = String(params[0]);
			const store = this.getStore('players');
			if (!store.has(account)) {
				store.set(account, { username: account, elo: 1000, wins: 0, losses: 0, nonce: 0, campaign_nonce: 0 });
			}
			if (params.length > 1 && sql.includes('elo')) {
				store.set(account, {
					username: account,
					elo: params[1],
					wins: params[2],
					losses: params[3],
				});
			}
			return [];
		}

		if (sql.startsWith('insert into cards')) {
			const uid = String(params[0]);
			this.getStore('cards').set(uid, {
				uid,
				card_id: params[1],
				owner: params[2],
				rarity: params[3],
				level: params[4],
				xp: params[5],
				edition: params[6],
				foil: params[7],
				mint_source: params[8],
				mint_trx_id: params[9],
				mint_block_num: params[10],
				last_transfer_block: params[11],
				origin_dna: params[12],
				instance_dna: params[13],
				parent_instance_dna: params[14],
				generation: params[15],
				replica_count: params[16],
				merged_from: params[17],
				acquisition: params[18] ? JSON.parse(String(params[18])) : null,
			});
			return [];
		}

		if (sql.startsWith('insert into packs')) {
			const uid = String(params[0]);
			this.getStore('packs').set(uid, {
				uid,
				pack_type: params[1],
				dna: params[2],
				owner: params[3],
				sealed: params[4],
				mint_trx_id: params[5],
				mint_block_num: params[6],
				last_transfer_block: params[7],
				card_count: params[8],
				edition: params[9],
				acquisition: params[10] ? JSON.parse(String(params[10])) : null,
			});
			return [];
		}

		if (sql.startsWith('insert into supply_counters')) {
			this.getStore('supply_counters').set(String(params[0]), {
				key: params[0],
				pool: params[1],
				cap: params[2],
				minted: params[3],
			});
			return [];
		}

		if (sql.startsWith('insert into rune_ledger') || sql.startsWith('insert into eitr_ledger')) {
			const entryId = String(params[0]);
			const row = {
				entry_id: entryId,
				season_id: params[1],
				account: params[2],
				direction: params[3],
				source_type: params[4],
				source_key: params[5],
				amount: params[6],
				balance_before: params[7],
				balance_after: params[8],
				trx_id: params[9],
				block_num: params[10],
				timestamp: params[11],
			};
			this.getStore(table!).set(entryId, row);
			return [];
		}

		if (sql.startsWith('insert into forge_commits')) {
			this.getStore('forge_commits').set(String(params[0]), {
				trx_id: params[0],
				account: params[1],
				rarity: params[2],
				salt_commit: params[3],
				commit_block: params[4],
				debit_amount: params[5],
				revealed: params[6],
				season_id: params[7],
			});
			return [];
		}

		if (sql.startsWith('insert into pack_commits')) {
			this.getStore('pack_commits').set(String(params[0]), {
				trx_id: params[0],
				account: params[1],
				pack_type: params[2],
				quantity: params[3],
				salt_commit: params[4],
				commit_block: params[5],
				revealed: params[6],
			});
			return [];
		}

		if (sql.startsWith('insert into match_anchors')) {
			this.getStore('match_anchors').set(String(params[0]), {
				match_id: params[0],
				player_a: params[1],
				player_b: params[2],
				pubkey_a: params[3],
				pubkey_b: params[4],
				deck_hash_a: params[5],
				deck_hash_b: params[6],
				engine_hash: params[7],
				card_registry_hash: params[8],
				dual_anchored: params[9],
				timestamp: params[10],
			});
			return [];
		}

		if (sql.startsWith('insert into market_listings')) {
			this.getStore('market_listings').set(String(params[0]), {
				listing_id: params[0],
				nft_uid: params[1],
				nft_type: params[2],
				seller: params[3],
				price: params[4],
				currency: params[5],
				listed_block: params[6],
				listed_trx_id: params[7],
				active: params[8],
			});
			return [];
		}

		if (sql.startsWith('insert into market_offers')) {
			this.getStore('market_offers').set(String(params[0]), {
				offer_id: params[0],
				nft_uid: params[1],
				buyer: params[2],
				price: params[3],
				currency: params[4],
				offered_block: params[5],
				offered_trx_id: params[6],
				status: params[7],
				payment_trx_id: params[8],
			});
			return [];
		}

		if (sql.startsWith('insert into campaign_submissions')) {
			this.getStore('campaign_submissions').set(String(params[0]), {
				submission_key: params[0],
				account: params[1],
				campaign_id: params[2],
				mission_id: params[3],
				difficulty: params[4],
				nonce: params[5],
				local_run_id: params[6],
				local_started_at: params[7],
				ruleset_hash: params[8],
				seed: params[9],
				turn_count: params[10],
				stars: params[11],
				transcript_root: params[12],
				transcript_cid: params[13],
				final_state_hash: params[14],
				status: params[15],
				rejection_reason: params[16],
				trx_id: params[17],
				block_num: params[18],
				timestamp: params[19],
			});
			return [];
		}

		if (sql.startsWith('insert into campaign_progress')) {
			this.getStore('campaign_progress').set(String(params[0]), {
				progress_key: params[0],
				account: params[1],
				campaign_id: params[2],
				mission_id: params[3],
				best_difficulty: params[4],
				best_turns: params[5],
				best_stars: params[6],
				completed_at_block: params[7],
				completed_trx_id: params[8],
				status: params[9],
			});
			return [];
		}

		if (sql.startsWith('insert into duat_claims')) {
			this.getStore('duat_claims').set(String(params[0]), {
				account: params[0],
				duat_raw: params[1],
				packs_earned: params[2],
				trx_id: params[3],
				block_num: params[4],
			});
			return [];
		}

		if (sql.startsWith('insert into reward_claims')) {
			this.getStore('reward_claims').set(String(params[0]), {
				claim_key: params[0],
				account: params[1],
				reward_id: params[2],
				claimed_at: params[3],
				block_num: params[4],
			});
			return [];
		}

		if (sql.startsWith('insert into slashed_accounts')) {
			this.getStore('slashed_accounts').set(String(params[0]), {
				account: params[0],
				slashed_at: params[1],
				reason: params[2],
				block_num: params[3],
			});
			return [];
		}

		if (sql.startsWith('insert into queue_entries')) {
			this.getStore('queue_entries').set(String(params[0]), {
				account: params[0],
				mode: params[1],
				elo: params[2],
				peer_id: params[3],
				deck_hash: params[4],
				timestamp: params[5],
				block_num: params[6],
			});
			return [];
		}

		if (sql.startsWith('insert into pack_supply')) {
			this.getStore('pack_supply').set(String(params[0]), {
				pack_type: params[0],
				cap: params[1],
				minted: params[2],
				burned: params[3],
			});
			return [];
		}

		if (sql.startsWith('insert into global_sync')) {
			this.getStore('global_sync').set(String(params[0]), {
				key: params[0],
				value_text: params[1],
			});
			return [];
		}

		if (sql.startsWith('delete from')) {
			this.getStore(table!).delete(String(params[0]));
			return [];
		}

		if (sql.startsWith('update players set slashed')) {
			const account = String(params[0]);
			const row = this.getStore('players').get(account);
			if (row) row.slashed = true;
			return [];
		}

		return [];
	};

	private filterLedger(table: 'rune_ledger' | 'eitr_ledger', sql: string, params: unknown[]): Row[] {
		let rows = [...this.getStore(table).values()];
		let paramIndex = 0;
		const nextParam = () => params[paramIndex++];

		if (sql.includes('season_id = $')) {
			const seasonId = nextParam();
			rows = rows.filter(row => row.season_id === seasonId);
		}
		if (sql.includes('direction = $')) {
			const direction = nextParam();
			rows = rows.filter(row => row.direction === direction);
		}
		if (sql.includes('source_type = $')) {
			const sourceType = nextParam();
			rows = rows.filter(row => row.source_type === sourceType);
		}
		if (sql.includes('account = $')) {
			const account = nextParam();
			rows = rows.filter(row => row.account === account);
		}
		if (sql.includes('source_key like $')) {
			const likePattern = String(nextParam());
			const rawPrefix = likePattern.endsWith('%') ? likePattern.slice(0, -1) : likePattern;
			const literalPrefix = rawPrefix.replace(/\\(.)/g, '$1');
			rows = rows.filter(row => String(row.source_key).startsWith(literalPrefix));
		}
		return rows;
	}

	private sumLedger(table: 'rune_ledger' | 'eitr_ledger', sql: string, params: unknown[]): number {
		const filtered = this.filterLedger(table, sql, params);
		return filtered.reduce((sum, row) => sum + Number(row.amount), 0);
	}
}

function fingerprintInput(): ProtocolRuntimeFingerprintInput {
	return {
		stage: 'local',
		phaseId: 'local-gameplay-v1',
		protocolId: 'ragnarok-protocol-v1',
		resetEpoch: 'local-dev',
		seasonStart: '2026-01-01T00:00:00.000Z',
		indexStartBlock: 1,
	};
}

describe('pgStateAdapter', () => {
	let memory: InMemoryPg;
	let adapter: ReturnType<typeof createPgStateAdapter>;

	beforeEach(() => {
		memory = new InMemoryPg();
		adapter = createPgStateAdapter(memory.executor);
	});

	it('maps cards between snake_case storage and camelCase CardAsset', async () => {
		const card: CardAsset = {
			uid: 'card-1',
			cardId: 17,
			owner: 'alice',
			rarity: 'epic',
			level: 2,
			xp: 40,
			edition: 'alpha',
			mintSource: 'genesis',
			mintTrxId: 'trx-1',
			mintBlockNum: 10,
			lastTransferBlock: 11,
			originDna: 'origin',
			instanceDna: 'instance',
			generation: 0,
			replicaCount: 1,
		};
		await adapter.putCard(card);
		expect(await adapter.getCard(card.uid)).toEqual(card);
		expect((await adapter.getCardsByOwner('alice'))[0]).toEqual(card);
	});

	it('handles packs, supply, pack commits, and unrevealed commit deadline query', async () => {
		const pack: PackAsset = {
			uid: 'pack-1',
			packType: 'standard',
			dna: 'dna',
			owner: 'alice',
			sealed: true,
			mintTrxId: 'mint',
			mintBlockNum: 1,
			lastTransferBlock: 1,
			cardCount: 5,
			edition: 'alpha',
		};
		await adapter.putPack(pack);
		await adapter.putPackSupply({ packType: 'standard', cap: 100, minted: 1, burned: 0 });

		const commit: PackCommitRecord = {
			trxId: 'packcommit-1',
			account: 'alice',
			packType: 'standard',
			quantity: 1,
			saltCommit: 'salt',
			commitBlock: 50,
			revealed: false,
		};
		await adapter.putPackCommit(commit);
		expect(await adapter.getPackCommit(commit.trxId)).toEqual(commit);
		expect(await adapter.getUnrevealedCommitsBefore(300)).toEqual([commit]);
		expect(await adapter.getPackSupply('standard')).toEqual({ packType: 'standard', cap: 100, minted: 1, burned: 0 });
	});

	it('stores rune and eitr ledger entries with filtered totals', async () => {
		const rune: RuneLedgerEntry = {
			entryId: 'rune-1',
			seasonId: 's1',
			account: 'alice',
			direction: 'credit',
			sourceType: 'p2p_ranked',
			sourceKey: 'match:1',
			amount: 12,
			balanceBefore: 0,
			balanceAfter: 12,
			trxId: 'trx-rune',
			blockNum: 10,
			timestamp: 1,
		};
		await adapter.putRuneLedgerEntry(rune);
		expect(await adapter.getRuneLedgerEntry('rune-1')).toEqual(rune);
		expect(await adapter.getRuneLedgerEntries({ seasonId: 's1', account: 'alice' })).toEqual([rune]);
		expect(await adapter.getRuneLedgerTotal({ seasonId: 's1', account: 'alice' })).toBe(12);
		expect(await adapter.getTokenBalance('alice', 's1')).toEqual({ account: 'alice', RUNE: 12 });

		const eitr: EitrLedgerEntry = {
			entryId: 'eitr-1',
			seasonId: 's1',
			account: 'alice',
			direction: 'debit',
			sourceType: 'forge_commit',
			sourceKey: 'forge:1',
			amount: 5,
			balanceBefore: 10,
			balanceAfter: 5,
			trxId: 'trx-eitr',
			blockNum: 11,
			timestamp: 2,
		};
		await adapter.putEitrLedgerEntry(eitr);
		expect(await adapter.getEitrLedgerTotal({ seasonId: 's1', direction: 'debit' })).toBe(5);
	});

	it('stores forge commits and match anchors', async () => {
		const forge: ForgeCommitRecord = {
			trxId: 'forge-1',
			account: 'alice',
			rarity: 'rare',
			saltCommit: 'salt',
			commitBlock: 90,
			debitAmount: 100,
			revealed: false,
			seasonId: 's1',
		};
		await adapter.putForgeCommit(forge);
		expect(await adapter.getForgeCommit('forge-1')).toEqual(forge);
		expect(await adapter.getUnrevealedForgeCommitsBefore(100)).toEqual([forge]);

		await adapter.putMatchAnchor({
			matchId: 'match-1',
			playerA: 'alice',
			playerB: 'bob',
			dualAnchored: true,
			timestamp: 123,
		});
		expect(await adapter.getMatchAnchor('match-1')).toEqual(expect.objectContaining({ matchId: 'match-1' }));
	});

	it('stores marketplace, campaign, duat, reward, slash, queue, and nonces', async () => {
		const listing: MarketListing = {
			listingId: 'listing-1',
			nftUid: 'card-1',
			nftType: 'card',
			seller: 'alice',
			price: 5,
			currency: 'HIVE',
			listedBlock: 1,
			listedTrxId: 'trx-list',
			active: true,
		};
		await adapter.putListing(listing);
		expect(await adapter.getListingByNft('card-1')).toEqual(listing);

		const offer: MarketOffer = {
			offerId: 'offer-1',
			nftUid: 'card-1',
			buyer: 'bob',
			price: 4,
			currency: 'HBD',
			offeredBlock: 2,
			offeredTrxId: 'trx-offer',
			status: 'pending',
		};
		await adapter.putOffer(offer);
		expect(await adapter.getOffersByNft('card-1')).toEqual([offer]);

		const submission: CampaignSubmissionRecord = {
			submissionKey: 'sub-1',
			account: 'alice',
			campaignId: 'c1',
			missionId: 'm1',
			difficulty: 'normal',
			nonce: 1,
			localRunId: 'run',
			localStartedAt: 1,
			rulesetHash: 'hash',
			seed: 'seed',
			turnCount: 3,
			stars: 2,
			transcriptRoot: 'root',
			finalStateHash: 'final',
			status: 'queued',
			trxId: 'trx',
			blockNum: 1,
			timestamp: 1,
		};
		await adapter.putCampaignSubmission(submission);
		expect(await adapter.getCampaignSubmission('sub-1')).toEqual(submission);

		const progress: CampaignProgressRecord = {
			account: 'alice',
			campaignId: 'c1',
			missionId: 'm1',
			bestDifficulty: 'heroic',
			bestTurns: 8,
			bestStars: 3,
			completedAtBlock: 9,
			completedTrxId: 'trx-progress',
			status: 'verified',
		};
		await adapter.putCampaignProgress(progress);
		expect(await adapter.getCampaignProgress('alice', 'c1', 'm1')).toEqual(progress);

		await adapter.putDuatClaim({ account: 'alice', duatRaw: 1000, packsEarned: 2, blockNum: 3, trxId: 'duat' });
		expect(await adapter.getDuatClaim('alice')).toEqual(expect.objectContaining({ packsEarned: 2 }));

		expect(await adapter.hasRewardClaim('alice', 'reward-1')).toBe(false);
		await adapter.putRewardClaim('alice', 'reward-1', 4);
		expect(await adapter.hasRewardClaim('alice', 'reward-1')).toBe(true);

		expect(await adapter.advanceNonce('alice', 5)).toBe(true);
		expect(await adapter.advanceNonce('alice', 4)).toBe(false);
		expect(await adapter.advanceCampaignNonce('alice', 2)).toBe(true);

		await adapter.putQueueEntry('alice', {
			mode: 'ranked',
			elo: 1200,
			peerId: 'peer',
			deckHash: 'deck',
			timestamp: Date.now(),
			blockNum: 12,
		});
		expect(await adapter.getQueueEntry('alice')).toEqual(expect.objectContaining({ timestamp: expect.any(Number) }));

		await adapter.slash('alice', 'cheat', 99);
		expect(await adapter.isSlashed('alice')).toBe(true);

		adapter.setTrxSiblings('trx-companion', [['transfer', { from: 'a', to: 'b', amount: '1 HIVE', memo: '' }]]);
		expect(await adapter.getCompanionTransfer('trx-companion')).toEqual({
			from: 'a',
			to: 'b',
			amount: '1 HIVE',
			memo: '',
		});
	});

	it('verifyPgRuntimeFingerprint rejects mismatched runtime fingerprint', async () => {
		const expected = createProtocolRuntimeFingerprint(fingerprintInput());
		const mismatched = createProtocolRuntimeFingerprint({ ...fingerprintInput(), resetEpoch: 'other' });
		await memory.executor(
			'INSERT INTO runtime_meta (key, value_json, updated_at) VALUES ($1, $2, $3)',
			['runtime_fingerprint', JSON.stringify(mismatched), Date.now()],
		);
		await expect(verifyPgRuntimeFingerprint(memory.executor, expected)).rejects.toThrow();
	});

	it('verifyPgRuntimeFingerprint asserts stored value after insert race (ON CONFLICT DO NOTHING)', async () => {
		const expected = createProtocolRuntimeFingerprint(fingerprintInput());
		const mismatched = createProtocolRuntimeFingerprint({ ...fingerprintInput(), resetEpoch: 'stale-winner' });
		memory.seedRuntimeMeta('runtime_fingerprint', mismatched);
		await expect(verifyPgRuntimeFingerprint(memory.executor, expected)).rejects.toThrow();
	});

	it('escapes sourceKeyPrefix underscores in rune ledger filters', async () => {
		const ranked: RuneLedgerEntry = {
			entryId: 'rune-ranked',
			seasonId: 's1',
			account: 'alice',
			direction: 'credit',
			sourceType: 'p2p_ranked',
			sourceKey: 'p2p_ranked:match-1',
			amount: 3,
			balanceBefore: 0,
			balanceAfter: 3,
			trxId: 'trx-1',
			blockNum: 1,
			timestamp: 1,
		};
		const decoy: RuneLedgerEntry = {
			...ranked,
			entryId: 'rune-decoy',
			sourceKey: 'p2pXranked:match-2',
		};
		await adapter.putRuneLedgerEntry(ranked);
		await adapter.putRuneLedgerEntry(decoy);

		const filtered = await adapter.getRuneLedgerEntries({
			seasonId: 's1',
			sourceKeyPrefix: 'p2p_ranked:',
		});
		expect(filtered.map(entry => entry.entryId)).toEqual(['rune-ranked']);
	});

	it('coerces BIGINT queue timestamps to numbers', async () => {
		memory.seedQueueTimestamp('alice', '1700000000123');
		const entry = await adapter.getQueueEntry('alice');
		expect(entry).toEqual({ timestamp: 1700000000123 });
		expect(typeof entry?.timestamp).toBe('number');
	});

	it('ragnarok_schema.sql defines every table used by pgStateAdapter', () => {
		const schemaPath = path.join(process.cwd(), 'server/db/ragnarok_schema.sql');
		const sql = fs.readFileSync(schemaPath, 'utf8');
		const expectedTables = [
			'players',
			'cards',
			'packs',
			'rune_ledger',
			'match_anchors',
			'market_listings',
			'market_offers',
			'global_sync',
			'supply_counters',
			'schema_migrations',
			'runtime_meta',
			'matches',
			'eitr_ledger',
			'forge_commits',
			'pack_commits',
			'pack_supply',
			'campaign_submissions',
			'campaign_progress',
			'duat_claims',
			'reward_claims',
			'slashed_accounts',
			'queue_entries',
		];
		for (const table of expectedTables) {
			expect(sql).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
		}
	});
});