import { describe, expect, it, vi } from 'vitest';
import { PROTOCOL_PHASE_POLICIES } from '@shared/protocolPhase';

import {
	buildCampaignRewardEvidenceContext,
	createCampaignRewardFeedback,
	getCampaignBriefingRewardCopy,
	getCampaignResultRewardCopy,
} from './campaignRewardFeedback';

describe('campaignRewardFeedback', () => {
	it('creates transient feedback with a timestamp', () => {
		vi.spyOn(Date, 'now').mockReturnValue(1_765_000_000_000);

		const feedback = createCampaignRewardFeedback({
			status: 'first_clear_published',
			campaignId: 'war-of-pantheons',
			missionId: 'norse-1',
			localRunId: 'local-run-1',
			difficulty: 'normal',
			isFirstClear: true,
			previewRune: 2,
			turnCount: 12,
			trxId: 'trx-1',
			error: null,
		});

		expect(feedback.updatedAt).toBe(1_765_000_000_000);
		expect(feedback.trxId).toBe('trx-1');
		expect(feedback.localRunId).toBe('local-run-1');

		vi.restoreAllMocks();
	});

	it('labels first-clear briefing as one-time RUNE', () => {
		const copy = getCampaignBriefingRewardCopy({
			completed: false,
			firstClearRune: 2,
			campaignRuneCap: 20,
			policy: PROTOCOL_PHASE_POLICIES['local-gameplay-v1'],
		});

		expect(copy.label).toBe('First clear: +2 local RUNE');
		expect(copy.detail).toContain('local IndexedDB/replay');
		expect(copy.detail).toContain('resettable');
		expect(copy.capDetail).toContain('Local resettable cap: 20 RUNE');
	});

	it('keeps Hive wording for F2 campaign briefing', () => {
		const copy = getCampaignBriefingRewardCopy({
			completed: false,
			firstClearRune: 2,
			campaignRuneCap: 20,
			policy: PROTOCOL_PHASE_POLICIES['hive-testnet-v1'],
		});

		expect(copy.label).toBe('First clear: +2 RUNE');
		expect(copy.detail).toContain('first verified clear');
		expect(copy.detail).not.toContain('local IndexedDB');
		expect(copy.capDetail).toBe('Season cap: 20 RUNE per account from campaign first-clears.');
	});

	it('labels completed mission briefing as replay with no new RUNE', () => {
		const copy = getCampaignBriefingRewardCopy({
			completed: true,
			firstClearRune: 2,
			campaignRuneCap: 20,
			policy: PROTOCOL_PHASE_POLICIES['hive-testnet-v1'],
		});

		expect(copy.label).toBe('Replay: no new RUNE');
		expect(copy.detail).toContain('do not mint more RUNE');
	});

	it('labels game-over replay feedback without implying another reward', () => {
		const copy = getCampaignResultRewardCopy({
			status: 'replay_no_reward',
			campaignId: 'war-of-pantheons',
			missionId: 'norse-1',
			localRunId: 'local-run-2',
			difficulty: 'heroic',
			isFirstClear: false,
			previewRune: 0,
			turnCount: 9,
			trxId: 'trx-2',
			error: null,
			updatedAt: 1_765_000_000_000,
		});

		expect(copy?.label).toBe('Replay: no new RUNE');
		expect(copy?.tone).toBe('no_reward');
	});

	it('builds campaign reward evidence with campaign, run, and reward fields', () => {
		const rewardEvidence = createCampaignRewardFeedback({
			status: 'first_clear_published',
			campaignId: 'war-of-pantheons',
			missionId: 'norse-1',
			localRunId: 'local-run-3',
			difficulty: 'normal',
			isFirstClear: true,
			previewRune: 2,
			turnCount: 11,
			trxId: 'trx-3',
			error: null,
			updatedAt: 1_765_000_000_000,
		});

		expect(buildCampaignRewardEvidenceContext({
			campaignId: 'war-of-pantheons',
			missionId: 'norse-1',
			localRunId: 'local-run-3',
			difficulty: 'normal',
			result: 'victory',
			playerTurnCount: 11,
			location: 'campaign_game_over',
			rewardEvidence,
		})).toEqual({
			campaignId: 'war-of-pantheons',
			missionId: 'norse-1',
			localRunId: 'local-run-3',
			difficulty: 'normal',
			result: 'victory',
			playerTurnCount: 11,
			location: 'campaign_game_over',
			rewardEvidence,
		});
	});
});
