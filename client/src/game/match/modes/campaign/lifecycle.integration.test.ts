import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildRagnarokRuntimeEvidence, resolveRagnarokRuntimeConfig } from '@shared/runtimeConfig';
import { deriveRuneSeasonId } from '@shared/protocol-core/runeSeasonHash';
import { createLocalCampaignSettlement } from '@shared/protocol-core/localCampaignSettlement';
import type { GameState } from '../../../types';
import type { MatchContext } from '../../types';
import { settleLocalCampaignMatch } from '../../../campaign/localCampaignSettlement';
import {
	closeReplayDatabaseForTests,
	commitLocalCampaignSettlement,
	getLatestLocalCardProgressionByOwner,
	getLocalCampaignSettlementsByAccount,
	getLocalLevelUpsByEvent,
	getMatchAnchor,
	getMatchesByAccount,
	getRuneLedgerEntries,
	resetReplayDatabaseForTests,
} from '@/data/blockchain/replayDB';
import { processCampaignMatchEnd, type CampaignLifecycleDependencies } from './lifecycle';

const ACCOUNT = 'f1-user';
const MISSION_ID = 'lifecycle-1';
const STARTER_UID = 'starter-100';
const runtimeConfig = resolveRagnarokRuntimeConfig({
	VITE_NETWORK_STAGE: 'testnet',
	VITE_RAGNAROK_PROTOCOL_ID: 'rk_game_testnet',
	VITE_RAGNAROK_RESET_EPOCH: 'alfa-testnet-campaign-lifecycle-integration',
	VITE_SEASON_START: '2026-08-23T00:00:00Z',
	VITE_RAGNAROK_INDEX_START_BLOCK: '1',
});
const runtimeEvidence = buildRagnarokRuntimeEvidence(runtimeConfig);
const seasonId = deriveRuneSeasonId(runtimeConfig);

function context(matchId: string, matchSeed: string): MatchContext {
	return {
		matchId,
		matchSeed,
		reward: {
			matchXp: { kind: 'percentage', multiplier: 1 },
			rune: { kind: 'projected', source: 'campaign_first_clear' },
			ranking: { kind: 'none' },
		},
		opponent: {
			kind: 'scripted',
			script: {
				kind: 'campaign-mission',
				mission: { id: MISSION_ID },
				chapter: {},
				difficulty: 'normal',
				localRunId: 'local-run-lifecycle',
			},
		},
	} as unknown as MatchContext;
}

function finalGameState(): GameState {
	return {
		players: {
			player: {
				battlefield: [{ instanceId: 'starter-instance', card: { id: 100, name: 'Starter', manaCost: 1, type: 'minion', rarity: 'common' }, isPlayerOwned: true }],
				graveyard: [],
				hand: [],
			},
		},
	} as unknown as GameState;
}

async function seedStarterXpToForty(): Promise<void> {
	for (let win = 0; win < 4; win += 1) {
		const record = createLocalCampaignSettlement({
			runtimeFingerprint: runtimeEvidence.runtimeFingerprint,
			account: ACCOUNT,
			campaignId: 'war-of-pantheons',
			missionId: `xp-prelude-${win + 10}`,
			difficulty: 'normal',
			matchId: `xp-prelude-match-${win}`,
			matchSeed: `xp-prelude-seed-${win}`,
			turnCount: 1,
			firstClear: false,
			runeAmount: 0,
			seasonId,
			cards: [{ uid: STARTER_UID, ownerAccount: ACCOUNT, cardId: 100, rarity: 'common', xpBefore: win * 10 }],
			timestamp: 10 + win,
		});
		expect((await commitLocalCampaignSettlement(record)).status).toBe('applied');
	}
}

beforeEach(async () => resetReplayDatabaseForTests());
afterEach(async () => resetReplayDatabaseForTests());

describe('F1 campaign lifecycle with real local settlement and IndexedDB', () => {
	it('settles defeat, first clear, replay, and reload without external authority', async () => {
		const publish = vi.fn(async () => ({ success: true, trxId: 'must-not-exist' }));
		const fallbackWalletIdentity = vi.fn(() => 'wallet-user');
		const emitTransactionConfirmed = vi.fn();
		const completed: Array<{ missionId: string; turns: number; settlementCount: number; runeCount: number; xp: number }> = [];
		const feedback: string[] = [];
		let now = 100;
		const dependencies: CampaignLifecycleDependencies = {
			getRuntimeConfig: () => runtimeConfig,
			getSessionUsername: () => ACCOUNT,
			getFallbackUsername: fallbackWalletIdentity,
			settleLocal: settleLocalCampaignMatch,
			completeMission: async (missionId, _difficulty, turns) => {
				const settlements = (await getLocalCampaignSettlementsByAccount(ACCOUNT)).filter(record => record.missionId === MISSION_ID);
				const rune = await getRuneLedgerEntries({ seasonId, account: ACCOUNT, direction: 'credit', sourceType: 'campaign_first_clear' });
				const card = (await getLatestLocalCardProgressionByOwner(ACCOUNT)).find(record => record.uid === STARTER_UID);
				completed.push({ missionId, turns, settlementCount: settlements.length, runeCount: rune.length, xp: card?.xp ?? -1 });
			},
			recordFeedback: input => { feedback.push(input.status); },
			publish,
			emitTransactionConfirmed,
			now: () => now++,
		};

		await processCampaignMatchEnd(context('defeat-match', 'defeat-seed'), { iWon: false, turnCount: 9, finalGameState: finalGameState() }, dependencies);
		expect(await getLocalCampaignSettlementsByAccount(ACCOUNT)).toEqual([]);
		expect(completed).toEqual([]);
		expect(feedback).toEqual(['defeat_no_reward']);
		expect(publish).not.toHaveBeenCalled();
		expect(fallbackWalletIdentity).not.toHaveBeenCalled();

		await seedStarterXpToForty();
		await processCampaignMatchEnd(context('first-win-match', 'first-win-seed'), { iWon: true, turnCount: 8, finalGameState: finalGameState() }, dependencies);
		const firstRecord = (await getLocalCampaignSettlementsByAccount(ACCOUNT)).find(record => record.matchId === 'first-win-match');
		expect(firstRecord).toMatchObject({ kind: 'local_campaign_settlement_v1', scope: 'local-replay', firstClear: true, runeAmount: 2 });
		expect(firstRecord?.anchor).toMatchObject({ matchId: 'first-win-match' });
		expect(firstRecord?.result).toMatchObject({ matchId: 'first-win-match', matchSeed: 'first-win-seed', winner: ACCOUNT });
		expect(completed[0]).toEqual({ missionId: MISSION_ID, turns: 8, settlementCount: 1, runeCount: 1, xp: 50 });
		expect(await getLocalLevelUpsByEvent(firstRecord!.eventId)).toEqual([expect.objectContaining({ uid: STARTER_UID, newLevel: 2 })]);
		expect(await getMatchAnchor('first-win-match')).toBeUndefined();
		expect(await getMatchesByAccount(ACCOUNT)).toEqual([]);

		await processCampaignMatchEnd(context('second-win-match', 'second-win-seed'), { iWon: true, turnCount: 5, finalGameState: finalGameState() }, dependencies);
		const missionSettlements = (await getLocalCampaignSettlementsByAccount(ACCOUNT)).filter(record => record.missionId === MISSION_ID);
		const secondRecord = missionSettlements.find(record => record.matchId === 'second-win-match');
		expect(missionSettlements).toHaveLength(2);
		expect(secondRecord).toMatchObject({ firstClear: false, runeAmount: 0 });
		expect(secondRecord?.runeEntry).toBeUndefined();
		expect(await getRuneLedgerEntries({ seasonId, account: ACCOUNT, direction: 'credit', sourceType: 'campaign_first_clear' })).toHaveLength(1);
		expect(completed[1]).toEqual({ missionId: MISSION_ID, turns: 5, settlementCount: 2, runeCount: 1, xp: 60 });

		closeReplayDatabaseForTests();
		expect((await getLocalCampaignSettlementsByAccount(ACCOUNT)).filter(record => record.missionId === MISSION_ID)).toHaveLength(2);
		expect(await getRuneLedgerEntries({ seasonId, account: ACCOUNT, direction: 'credit', sourceType: 'campaign_first_clear' })).toHaveLength(1);
		expect((await getLatestLocalCardProgressionByOwner(ACCOUNT)).find(record => record.uid === STARTER_UID)).toMatchObject({ xp: 60, level: 2 });
		expect(feedback).toEqual(['defeat_no_reward', 'first_clear_local', 'replay_no_reward']);
		expect(publish).not.toHaveBeenCalled();
		expect(emitTransactionConfirmed).not.toHaveBeenCalled();
		expect(fallbackWalletIdentity).not.toHaveBeenCalled();
	});
});
