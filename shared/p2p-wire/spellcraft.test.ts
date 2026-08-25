import { describe, expect, it } from 'vitest';
import {
	SpellcraftReadyMessageSchema,
	SpellcraftReadyAckMessageSchema,
	createSpellcraftReadyAckMessage,
	createSpellcraftReadyMessage,
	oppositeSpellcraftActorSide,
} from './spellcraft';

const valid = createSpellcraftReadyMessage({
	matchId: 'match-a',
	combatId: 'combat-a',
	handNumber: 3,
	actorSide: 'first-mover',
	actorPlayerId: 'player-a',
	seq: 0,
});

describe('Spellcraft ready wire contract', () => {
	it('builds a stable versioned identity bound to one actor and window', () => {
		expect(valid).toEqual({
			type: 'spellcraft_ready_v1',
			protocolVersion: 1,
			matchId: 'match-a',
			combatId: 'combat-a',
			handNumber: 3,
			windowKey: 'match-a:combat-a:3',
			actorSide: 'first-mover',
			actorPlayerId: 'player-a',
			seq: 0,
			decisionId: 'match-a:combat-a:3:first-mover:ready',
		});
		expect(createSpellcraftReadyMessage({
			matchId: 'match-a',
			combatId: 'combat-a',
			handNumber: 3,
			actorSide: 'first-mover',
			actorPlayerId: 'player-a',
			seq: 0,
		})).toEqual(valid);
	});

	it.each([
		['windowKey', 'other'],
		['decisionId', 'other'],
		['protocolVersion', 2],
		['seq', -1],
		['actorPlayerId', ''],
	] as const)('rejects a malformed or unbound %s', (field, value) => {
		expect(SpellcraftReadyMessageSchema.safeParse({ ...valid, [field]: value }).success).toBe(false);
	});

	it('rejects unknown fields and maps the canonical remote side', () => {
		expect(SpellcraftReadyMessageSchema.safeParse({ ...valid, smuggled: true }).success).toBe(false);
		expect(oppositeSpellcraftActorSide('first-mover')).toBe('second-mover');
		expect(oppositeSpellcraftActorSide('second-mover')).toBe('first-mover');
	});

	it('binds an ACK to the exact Ready decision and opposite actor side', () => {
		const ack = createSpellcraftReadyAckMessage({
			ready: valid,
			acknowledgerSide: 'second-mover',
		});
		expect(ack).toMatchObject({
			type: 'spellcraft_ready_ack_v1',
			windowKey: valid.windowKey,
			readyActorSide: 'first-mover',
			acknowledgerSide: 'second-mover',
			readyDecisionId: valid.decisionId,
		});
		expect(SpellcraftReadyAckMessageSchema.safeParse({
			...ack,
			acknowledgerSide: 'first-mover',
		}).success).toBe(false);
		expect(SpellcraftReadyAckMessageSchema.safeParse({
			...ack,
			readyDecisionId: 'forged',
		}).success).toBe(false);
	});
});
