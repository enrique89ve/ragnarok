import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildRagnarokRuntimeEvidence, resolveRagnarokRuntimeConfig } from '@shared/runtimeConfig';
import { deriveRuneSeasonId } from '@shared/protocol-core/runeSeasonHash';
import type { GameState } from '../../../types';
import type { MatchContext } from '../../types';
import { MATCH_ECONOMY, modeEconomyToReward } from '../../economy';
import { settleLocalCampaignMatch } from '../../../campaign/localCampaignSettlement';
import {
	closeReplayDatabaseForTests,
	forgeLocalCampaignCommon,
	getLocalCampaignEitr,
	getLocalCampaignSettlementsByAccount,
	getMatchAnchor,
	getMatchesByAccount,
	getRuneLedgerEntries,
	resetReplayDatabaseForTests,
} from '@/data/blockchain/replayDB';
import { processCampaignMatchEnd, type CampaignLifecycleDependencies } from './lifecycle';

const ACCOUNT = 'f1-user';
const MISSION_ID = 'lifecycle-1';
const runtimeConfig = resolveRagnarokRuntimeConfig({
	VITE_NETWORK_STAGE: 'testnet',
	VITE_RAGNAROK_PROTOCOL_ID: 'rk_game_testnet',
	VITE_RAGNAROK_RESET_EPOCH: 'alfa-testnet-campaign-lifecycle-integration',
	VITE_SEASON_START: '2026-08-23T00:00:00Z',
	VITE_RAGNAROK_INDEX_START_BLOCK: '1',
});
const runtimeEvidence = buildRagnarokRuntimeEvidence(runtimeConfig);
const seasonId = deriveRuneSeasonId(runtimeConfig);

function context(matchId: string, matchSeed: string, missionId = MISSION_ID): MatchContext {
	return {
		matchId,
		matchSeed,
		reward: modeEconomyToReward(MATCH_ECONOMY.campaign),
		opponent: {
			kind: 'scripted',
			script: {
				kind: 'campaign-mission',
				mission: { id: missionId },
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

beforeEach(async () => resetReplayDatabaseForTests());
afterEach(async () => resetReplayDatabaseForTests());

describe('campaign lifecycle and IndexedDB', () => {
	it('only records verification feedback after a win in a shared profile', async () => {
		const completeMission = vi.fn();
		const settleLocal = vi.fn();
		const recordFeedback = vi.fn();
		await processCampaignMatchEnd(context('shared-win', 'seed'), {
			iWon: true, turnCount: 9, finalGameState: finalGameState(),
		}, {
			getRuntimeConfig: () => ({ ...runtimeConfig, resetEpoch: 'closed-beta-integrity' }),
			getSessionUsername: () => ACCOUNT,
			getFallbackUsername: () => null,
			settleLocal,
			completeMission,
			recordFeedback,
			now: () => 100,
		});
		expect(settleLocal).not.toHaveBeenCalled();
		expect(completeMission).not.toHaveBeenCalled();
		expect(recordFeedback).toHaveBeenCalledWith(expect.objectContaining({
			status: 'verification_required', previewRune: 0,
		}));
	});

	it('credits Norse finale Eitr once, spends it atomically, and expires it on season rollover', async () => {
		const dependencies: CampaignLifecycleDependencies = {
			getRuntimeConfig: () => runtimeConfig,
			getSessionUsername: () => ACCOUNT,
			getFallbackUsername: () => null,
			settleLocal: settleLocalCampaignMatch,
			completeMission: vi.fn(),
			recordFeedback: vi.fn(),
			now: () => 100,
		};
		const end = { iWon: true, turnCount: 9, finalGameState: finalGameState() };
		const first = context('finale-win', 'finale-seed', 'norse-9');
		await processCampaignMatchEnd(first, { ...end, iWon: false }, dependencies);
		expect(await forgeLocalCampaignCommon(ACCOUNT, seasonId, 20001)).toBeUndefined();

		await Promise.all([
			processCampaignMatchEnd(first, end, dependencies),
			processCampaignMatchEnd(context('finale-second-win', 'seed-2', 'norse-9'), end, dependencies),
		]);
		expect(await getLocalCampaignEitr(ACCOUNT, seasonId)).toEqual({ balance: 40, forgedCardId: null });
		expect(await getLocalCampaignEitr('other-user', seasonId)).toBeUndefined();
		const [forge, retry] = await Promise.all([
			forgeLocalCampaignCommon(ACCOUNT, seasonId, 20001),
			forgeLocalCampaignCommon(ACCOUNT, seasonId, 20002),
		]);
		expect(forge).toEqual({ balance: 0, forgedCardId: 20001 });
		expect(retry).toEqual(forge);

		await processCampaignMatchEnd(first, end, dependencies);
		closeReplayDatabaseForTests();
		expect(await getLocalCampaignEitr(ACCOUNT, seasonId)).toEqual(forge);

		const nextRuntime = { ...runtimeConfig, seasonStart: '2027-01-01T00:00:00Z' };
		const nextSeason = deriveRuneSeasonId(nextRuntime);
		expect(await getLocalCampaignEitr(ACCOUNT, nextSeason)).toBeUndefined();
		await processCampaignMatchEnd(context('finale-next-season', 'seed-3', 'norse-9'), end, {
			...dependencies,
			getRuntimeConfig: () => nextRuntime,
		});
		expect(await getLocalCampaignEitr(ACCOUNT, nextSeason)).toEqual({ balance: 40, forgedCardId: null });
	});

	it('settles defeat, first clear, replay, and reload without external authority', async () => {
		const fallbackWalletIdentity = vi.fn(() => 'wallet-user');
		const completed: Array<{ missionId: string; turns: number; settlementCount: number; runeCount: number }> = [];
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
				completed.push({ missionId, turns, settlementCount: settlements.length, runeCount: rune.length });
			},
			recordFeedback: input => { feedback.push(input.status); },
			now: () => now++,
		};

		await processCampaignMatchEnd(context('defeat-match', 'defeat-seed'), { iWon: false, turnCount: 9, finalGameState: finalGameState() }, dependencies);
		expect(await getLocalCampaignSettlementsByAccount(ACCOUNT)).toEqual([]);
		expect(completed).toEqual([]);
		expect(feedback).toEqual(['defeat_no_reward']);
		expect(fallbackWalletIdentity).not.toHaveBeenCalled();

		await processCampaignMatchEnd(context('first-win-match', 'first-win-seed'), { iWon: true, turnCount: 8, finalGameState: finalGameState() }, dependencies);
		const firstRecord = (await getLocalCampaignSettlementsByAccount(ACCOUNT)).find(record => record.matchId === 'first-win-match');
		expect(firstRecord).toMatchObject({ kind: 'local_campaign_settlement_v1', scope: 'local-replay', firstClear: true, runeAmount: 2, matchXpShown: 0, cardXp: [] });
		expect(firstRecord?.anchor).toMatchObject({ matchId: 'first-win-match' });
		expect(firstRecord?.result).toMatchObject({ matchId: 'first-win-match', matchSeed: 'first-win-seed', winner: ACCOUNT });
		expect(completed[0]).toEqual({ missionId: MISSION_ID, turns: 8, settlementCount: 1, runeCount: 1 });
		expect(await getMatchAnchor('first-win-match')).toBeUndefined();
		expect(await getMatchesByAccount(ACCOUNT)).toEqual([]);

		await processCampaignMatchEnd(context('second-win-match', 'second-win-seed'), { iWon: true, turnCount: 5, finalGameState: finalGameState() }, dependencies);
		const missionSettlements = (await getLocalCampaignSettlementsByAccount(ACCOUNT)).filter(record => record.missionId === MISSION_ID);
		const secondRecord = missionSettlements.find(record => record.matchId === 'second-win-match');
		expect(missionSettlements).toHaveLength(2);
		expect(secondRecord).toMatchObject({ firstClear: false, runeAmount: 0, matchXpShown: 0, cardXp: [] });
		expect(secondRecord?.runeEntry).toBeUndefined();
		expect(await getRuneLedgerEntries({ seasonId, account: ACCOUNT, direction: 'credit', sourceType: 'campaign_first_clear' })).toHaveLength(1);
		expect(completed[1]).toEqual({ missionId: MISSION_ID, turns: 5, settlementCount: 2, runeCount: 1 });

		closeReplayDatabaseForTests();
		expect((await getLocalCampaignSettlementsByAccount(ACCOUNT)).filter(record => record.missionId === MISSION_ID)).toHaveLength(2);
		expect(await getRuneLedgerEntries({ seasonId, account: ACCOUNT, direction: 'credit', sourceType: 'campaign_first_clear' })).toHaveLength(1);
		expect(feedback).toEqual(['defeat_no_reward', 'first_clear_local', 'replay_no_reward']);
		expect(fallbackWalletIdentity).not.toHaveBeenCalled();
	});
});
