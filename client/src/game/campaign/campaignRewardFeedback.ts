import type { Difficulty } from './campaignTypes';

export type CampaignRewardFeedbackStatus =
	| 'first_clear_pending'
	| 'first_clear_published'
	| 'first_clear_no_rune'
	| 'replay_no_reward'
	| 'defeat_no_reward'
	| 'publish_failed';

export interface CampaignRewardFeedback {
	readonly status: CampaignRewardFeedbackStatus;
	readonly campaignId: string;
	readonly missionId: string;
	readonly localRunId: string | null;
	readonly difficulty: Difficulty;
	readonly isFirstClear: boolean;
	readonly previewRune: number;
	readonly turnCount: number;
	readonly trxId: string | null;
	readonly error: string | null;
	readonly updatedAt: number;
}

export type CampaignRewardFeedbackInput =
	Omit<CampaignRewardFeedback, 'updatedAt' | 'localRunId'> & {
		readonly localRunId?: string | null;
		readonly updatedAt?: number;
	};

export interface CampaignRewardCopy {
	readonly label: string;
	readonly detail: string;
	readonly tone: 'reward' | 'pending' | 'no_reward' | 'failed';
}

export type CampaignRewardEvidenceContextInput = {
	readonly campaignId: string;
	readonly missionId: string;
	readonly localRunId?: string | null;
	readonly difficulty: Difficulty;
	readonly location: string;
	readonly rewardEvidence?: CampaignRewardFeedback | null;
	readonly result?: 'victory' | 'defeat' | 'draw';
	readonly playerTurnCount?: number;
	readonly completed?: boolean;
	readonly firstClearRune?: number;
};

export function createCampaignRewardFeedback(
	input: CampaignRewardFeedbackInput,
): CampaignRewardFeedback {
	return {
		...input,
		localRunId: input.localRunId ?? null,
		updatedAt: input.updatedAt ?? Date.now(),
	};
}

export function buildCampaignRewardEvidenceContext(
	input: CampaignRewardEvidenceContextInput,
): Record<string, unknown> {
	const context: Record<string, unknown> = {
		campaignId: input.campaignId,
		missionId: input.missionId,
		localRunId: input.localRunId ?? null,
		difficulty: input.difficulty,
		location: input.location,
		rewardEvidence: input.rewardEvidence ?? null,
	};

	if (input.result !== undefined) context.result = input.result;
	if (input.playerTurnCount !== undefined) context.playerTurnCount = input.playerTurnCount;
	if (input.completed !== undefined) context.completed = input.completed;
	if (input.firstClearRune !== undefined) context.firstClearRune = input.firstClearRune;

	return context;
}

export function getCampaignBriefingRewardCopy(input: {
	readonly completed: boolean;
	readonly firstClearRune: number;
}): CampaignRewardCopy {
	if (input.completed) {
		return {
			label: 'Replay: no new RUNE',
			detail: 'First-clear rewards are one-time. Replays can improve best turns or difficulty, but they do not mint more RUNE.',
			tone: 'no_reward',
		};
	}

	if (input.firstClearRune > 0) {
		return {
			label: `First clear: +${input.firstClearRune} RUNE`,
			detail: 'Paid only when the campaign result lands as this account\'s first verified clear for the mission.',
			tone: 'reward',
		};
	}

	return {
		label: 'First clear: no RUNE',
		detail: 'This mission can be recorded for progression, but no RUNE reward is configured for its first clear.',
		tone: 'no_reward',
	};
}

export function getCampaignResultRewardCopy(
	feedback: CampaignRewardFeedback | null,
): CampaignRewardCopy | null {
	if (!feedback) return null;

	switch (feedback.status) {
		case 'first_clear_pending':
			return {
				label: feedback.previewRune > 0
					? `First clear: +${feedback.previewRune} RUNE pending`
					: 'First clear pending',
				detail: 'Campaign result is being submitted. RUNE is not confirmed until replay accepts the result.',
				tone: 'pending',
			};
		case 'first_clear_published':
			return {
				label: `First clear: +${feedback.previewRune} RUNE`,
				detail: 'Campaign result submitted. Replay applies the first-clear credit within the season cap.',
				tone: 'reward',
			};
		case 'first_clear_no_rune':
			return {
				label: 'First clear logged',
				detail: 'This mission has no configured RUNE payout, so only campaign progress was submitted.',
				tone: 'no_reward',
			};
		case 'replay_no_reward':
			return {
				label: 'Replay: no new RUNE',
				detail: 'Result submitted as a replay. First-clear rewards are one-time per account and mission.',
				tone: 'no_reward',
			};
		case 'defeat_no_reward':
			return {
				label: 'No campaign reward',
				detail: 'Campaign rewards only submit after a win. Retry the mission to earn or improve progress.',
				tone: 'no_reward',
			};
		case 'publish_failed':
			return {
				label: 'Result not submitted',
				detail: feedback.error ?? 'Campaign result publication failed. No RUNE is confirmed from this run.',
				tone: 'failed',
			};
	}
}
