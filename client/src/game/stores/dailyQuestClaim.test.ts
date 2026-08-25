import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { invokeClientWalletAction } from '../../data/wallet/clientWalletInvocation';
import {
	useDailyQuestStore,
	type DailyQuest,
	settleLocalDailyQuestClaimsToLedger,
	awaitingReplayHistory,
	resolveDailyQuestAccount,
} from './dailyQuestStore';
import { getNFTBridge } from '../nft';
import { GUEST_ACCOUNT_ID } from '../../lib/storage/accountScopedStorage';
import { getCurrentHiveUsername } from '../../data/HiveSessionIdentity';

vi.mock('../../data/HiveSessionIdentity', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../data/HiveSessionIdentity')>();
	return {
		...actual,
		getCurrentHiveUsername: vi.fn(actual.getCurrentHiveUsername),
	};
});

function todayUtc(): string {
	return new Date().toISOString().slice(0, 10);
}

function makeQuest(overrides: Partial<DailyQuest> = {}): DailyQuest {
	return {
		id: 'dq-win',
		slot: 0,
		ymdUtc: todayUtc(),
		type: 'win_games',
		title: 'Path to Valhalla',
		description: 'Win 2 games',
		progress: 2,
		goal: 2,
		completed: true,
		claimed: false,
		reward: { rune: 2, xp: 50 },
		verificationHash: 'hash',
		...overrides,
	};
}

describe('daily quest local claim', () => {
	afterEach(() => {
		vi.mocked(getCurrentHiveUsername).mockReset();
		useDailyQuestStore.setState({
			quests: [],
			lastClaimFeedback: null,
			claimHistory: {},
			flushing: false,
		});
	});

	it('commits the canonical ledger entry and is idempotent', async () => {
		const settled = await settleLocalDailyQuestClaimsToLedger([makeQuest()], 'daily-test-user', () => 1);
		expect(settled.runeEarned).toBeGreaterThan(0);
		const retry = await settleLocalDailyQuestClaimsToLedger([makeQuest()], 'daily-test-user', () => 1);
		expect(retry.runeEarned).toBe(0);
		expect(retry.alreadyClaimedCount).toBe(1);
	});

	it('marks pending quests claimed and treats a second claim as already_claimed', async () => {
		useDailyQuestStore.setState({
			quests: [makeQuest()],
			lastClaimFeedback: null,
			claimHistory: {},
			flushing: false,
		});

		await invokeClientWalletAction(
			{ kind: 'daily_quest_claim', authority: 'Posting', label: 'Claim daily quest rewards' },
			useDailyQuestStore.getState().flushPendingClaims,
		);

		const afterFirst = useDailyQuestStore.getState();
		expect(afterFirst.quests[0]?.claimed).toBe(true);
		expect(afterFirst.lastClaimFeedback?.status).toBe('claimed');
		expect(afterFirst.lastClaimFeedback?.runeEarned).toBeGreaterThan(0);

		await invokeClientWalletAction(
			{ kind: 'daily_quest_claim', authority: 'Posting', label: 'Claim daily quest rewards' },
			useDailyQuestStore.getState().flushPendingClaims,
		);

		expect(useDailyQuestStore.getState().lastClaimFeedback?.status).toBe('already_claimed');
	});

	it('uses one guest sentinel for unauthenticated local seed, claim and ledger sync', () => {
		vi.mocked(getCurrentHiveUsername).mockReturnValue(null);
		vi.spyOn(getNFTBridge(), 'getUsername').mockReturnValue(null);
		expect(resolveDailyQuestAccount({ username: null, sharedNetwork: false })).toBe(GUEST_ACCOUNT_ID);
	});

	it('does not record unauthenticated daily progress on shared testnet', () => {
		expect(resolveDailyQuestAccount({ username: null, sharedNetwork: true })).toBeNull();
		expect(resolveDailyQuestAccount({ username: 'local', sharedNetwork: true })).toBeNull();
		expect(resolveDailyQuestAccount({ username: GUEST_ACCOUNT_ID, sharedNetwork: true })).toBeNull();
	});

	it('local capability precedes invalid wallet invocation and bridge broadcast', async () => {
		const claimSpy = vi.spyOn(getNFTBridge(), 'claimDailyQuest').mockResolvedValue({ success: false, error: 'must not broadcast' });
		useDailyQuestStore.setState({ quests: [makeQuest({ id: 'dq-local-invalid' })], lastClaimFeedback: null, claimHistory: {}, flushing: false });
		await useDailyQuestStore.getState().flushPendingClaims(null as never);
		expect(claimSpy).not.toHaveBeenCalled();
		expect(useDailyQuestStore.getState().quests[0]?.claimed).toBe(true);
		claimSpy.mockRestore();
	});

	it('keeps future Hive acceptance awaiting replay without reward', () => {
		expect(awaitingReplayHistory('trx-real-1')).toBe('awaiting-replay:trx-real-1');
		expect(makeQuest().claimed).toBe(false);
		expect({ claimedCount: 0, runeEarned: 0 }).toEqual({ claimedCount: 0, runeEarned: 0 });
	});
});
