import { describe, expect, it } from 'vitest';
import { ALL_CHAPTERS } from '../../../campaign';
import { resolveCampaign } from './resolver';

const KNOWN_MISSION_ID = ALL_CHAPTERS[0].missions[0].id;
const TEST_IDENTITY = {
	matchId: 'test-match-campaign',
	matchSeed: 'test-seed-campaign',
} as const;

describe('resolveCampaign', () => {
	it('returns ok with a scripted opponent for a known mission', () => {
		const result = resolveCampaign({ identity: TEST_IDENTITY, missionId: KNOWN_MISSION_ID, difficulty: 'normal' });
		if (!result.ok) throw new Error('expected ok for known mission');
		expect(result.ctx.opponent.kind).toBe('scripted');
	});

	it('puts the mission and difficulty inside the scripted payload', () => {
		const result = resolveCampaign({ identity: TEST_IDENTITY, missionId: KNOWN_MISSION_ID, difficulty: 'heroic' });
		if (!result.ok) throw new Error('expected ok');
		const op = result.ctx.opponent;
		if (op.kind !== 'scripted' || op.script.kind !== 'campaign-mission') {
			throw new Error('expected campaign-mission script');
		}
		expect(op.script.mission.id).toBe(KNOWN_MISSION_ID);
		expect(op.script.difficulty).toBe('heroic');
	});

	it('produces Match XP share, first-clear RUNE, and no ranking', () => {
		const result = resolveCampaign({ identity: TEST_IDENTITY, missionId: KNOWN_MISSION_ID, difficulty: 'normal' });
		if (!result.ok) throw new Error('expected ok');
		expect(result.ctx.reward).toEqual({
			matchXp: { kind: 'percentage', multiplier: 0.1 },
			rune: { kind: 'projected', source: 'campaign_first_clear' },
			ranking: { kind: 'none' },
		});
	});

	it('passes through the supplied identity', () => {
		const result = resolveCampaign({ identity: TEST_IDENTITY, missionId: KNOWN_MISSION_ID, difficulty: 'normal' });
		if (!result.ok) throw new Error('expected ok');
		expect(result.ctx.matchId).toBe(TEST_IDENTITY.matchId);
		expect(result.ctx.matchSeed).toBe(TEST_IDENTITY.matchSeed);
	});

	it('returns ok:false with mission_not_found for an unknown id', () => {
		const result = resolveCampaign({ identity: TEST_IDENTITY, missionId: 'nonexistent-mission-zzz', difficulty: 'normal' });
		expect(result).toEqual({ ok: false, reason: 'mission_not_found' });
	});
});
