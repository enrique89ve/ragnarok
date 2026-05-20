import { describe, expect, it, vi } from 'vitest';

import {
	createCampaignRewardFeedback,
	getCampaignBriefingRewardCopy,
	getCampaignResultRewardCopy,
} from './campaignRewardFeedback';

describe('campaignRewardFeedback', () => {
	it('creates transient feedback with a timestamp', () => {
		vi.spyOn(Date, 'now').mockReturnValue(1_765_000_000_000);

		const feedback = createCampaignRewardFeedback({
			status: 'first_clear_published',
			missionId: 'norse-1',
			difficulty: 'normal',
			isFirstClear: true,
			previewRune: 2,
			turnCount: 12,
			trxId: 'trx-1',
			error: null,
		});

		expect(feedback.updatedAt).toBe(1_765_000_000_000);
		expect(feedback.trxId).toBe('trx-1');

		vi.restoreAllMocks();
	});

	it('labels first-clear briefing as one-time RUNE', () => {
		const copy = getCampaignBriefingRewardCopy({
			completed: false,
			firstClearRune: 2,
		});

		expect(copy.label).toBe('First clear: +2 RUNE');
		expect(copy.detail).toContain('first verified clear');
	});

	it('labels completed mission briefing as replay with no new RUNE', () => {
		const copy = getCampaignBriefingRewardCopy({
			completed: true,
			firstClearRune: 2,
		});

		expect(copy.label).toBe('Replay: no new RUNE');
		expect(copy.detail).toContain('do not mint more RUNE');
	});

	it('labels game-over replay feedback without implying another reward', () => {
		const copy = getCampaignResultRewardCopy({
			status: 'replay_no_reward',
			missionId: 'norse-1',
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
});
