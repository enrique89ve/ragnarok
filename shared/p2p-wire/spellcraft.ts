import { z } from 'zod';

export const SPELLCRAFT_READY_PROTOCOL_VERSION = 1 as const;
export const SPELLCRAFT_READY_TYPE = 'spellcraft_ready_v1' as const;
export const SPELLCRAFT_READY_ACK_TYPE = 'spellcraft_ready_ack_v1' as const;
export const SPELLCRAFT_READY_MAX_SEQ = 1_000_000;

export const SpellcraftActorSideSchema = z.enum(['first-mover', 'second-mover']);
export type SpellcraftActorSide = z.infer<typeof SpellcraftActorSideSchema>;

export function oppositeSpellcraftActorSide(side: SpellcraftActorSide): SpellcraftActorSide {
	return side === 'first-mover' ? 'second-mover' : 'first-mover';
}

export function buildSpellcraftWindowKey(input: {
	readonly matchId: string;
	readonly combatId: string;
	readonly handNumber: number;
}): string {
	return `${input.matchId}:${input.combatId}:${input.handNumber}`;
}

export function buildSpellcraftReadyDecisionId(input: {
	readonly windowKey: string;
	readonly actorSide: SpellcraftActorSide;
}): string {
	return `${input.windowKey}:${input.actorSide}:ready`;
}

export const SpellcraftReadyMessageSchema = z.object({
	type: z.literal(SPELLCRAFT_READY_TYPE),
	protocolVersion: z.literal(SPELLCRAFT_READY_PROTOCOL_VERSION),
	matchId: z.string().min(1).max(64),
	combatId: z.string().min(1).max(128),
	handNumber: z.number().int().nonnegative().max(SPELLCRAFT_READY_MAX_SEQ),
	windowKey: z.string().min(1).max(256),
	actorSide: SpellcraftActorSideSchema,
	actorPlayerId: z.string().min(1).max(128),
	seq: z.number().int().nonnegative().max(SPELLCRAFT_READY_MAX_SEQ),
	decisionId: z.string().min(1).max(384),
}).strict().superRefine((message, ctx) => {
	const expectedWindowKey = buildSpellcraftWindowKey(message);
	if (message.windowKey !== expectedWindowKey) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ['windowKey'],
			message: 'windowKey must bind matchId, combatId and handNumber',
		});
	}
	const expectedDecisionId = buildSpellcraftReadyDecisionId({
		windowKey: expectedWindowKey,
		actorSide: message.actorSide,
	});
	if (message.decisionId !== expectedDecisionId) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ['decisionId'],
			message: 'decisionId must bind the canonical Spellcraft window and actor side',
		});
	}
});

export type SpellcraftReadyMessage = z.infer<typeof SpellcraftReadyMessageSchema>;

export const SpellcraftReadyAckMessageSchema = z.object({
	type: z.literal(SPELLCRAFT_READY_ACK_TYPE),
	protocolVersion: z.literal(SPELLCRAFT_READY_PROTOCOL_VERSION),
	matchId: z.string().min(1).max(64),
	combatId: z.string().min(1).max(128),
	handNumber: z.number().int().nonnegative().max(SPELLCRAFT_READY_MAX_SEQ),
	windowKey: z.string().min(1).max(256),
	readyActorSide: SpellcraftActorSideSchema,
	acknowledgerSide: SpellcraftActorSideSchema,
	readyDecisionId: z.string().min(1).max(384),
}).strict().superRefine((message, ctx) => {
	const expectedWindowKey = buildSpellcraftWindowKey(message);
	if (message.windowKey !== expectedWindowKey) {
		ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['windowKey'], message: 'ACK windowKey mismatch' });
	}
	if (message.acknowledgerSide !== oppositeSpellcraftActorSide(message.readyActorSide)) {
		ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['acknowledgerSide'], message: 'ACK must come from the opposite actor side' });
	}
	const expectedDecisionId = buildSpellcraftReadyDecisionId({
		windowKey: expectedWindowKey,
		actorSide: message.readyActorSide,
	});
	if (message.readyDecisionId !== expectedDecisionId) {
		ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['readyDecisionId'], message: 'ACK decision mismatch' });
	}
});

export type SpellcraftReadyAckMessage = z.infer<typeof SpellcraftReadyAckMessageSchema>;

export function createSpellcraftReadyMessage(input: {
	readonly matchId: string;
	readonly combatId: string;
	readonly handNumber: number;
	readonly actorSide: SpellcraftActorSide;
	readonly actorPlayerId: string;
	readonly seq: number;
}): SpellcraftReadyMessage {
	const windowKey = buildSpellcraftWindowKey(input);
	return SpellcraftReadyMessageSchema.parse({
		type: SPELLCRAFT_READY_TYPE,
		protocolVersion: SPELLCRAFT_READY_PROTOCOL_VERSION,
		...input,
		windowKey,
		decisionId: buildSpellcraftReadyDecisionId({ windowKey, actorSide: input.actorSide }),
	});
}

export function createSpellcraftReadyAckMessage(input: {
	readonly ready: SpellcraftReadyMessage;
	readonly acknowledgerSide: SpellcraftActorSide;
}): SpellcraftReadyAckMessage {
	return SpellcraftReadyAckMessageSchema.parse({
		type: SPELLCRAFT_READY_ACK_TYPE,
		protocolVersion: SPELLCRAFT_READY_PROTOCOL_VERSION,
		matchId: input.ready.matchId,
		combatId: input.ready.combatId,
		handNumber: input.ready.handNumber,
		windowKey: input.ready.windowKey,
		readyActorSide: input.ready.actorSide,
		acknowledgerSide: input.acknowledgerSide,
		readyDecisionId: input.ready.decisionId,
	});
}
