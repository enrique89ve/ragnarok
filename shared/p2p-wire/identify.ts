import { z } from 'zod';

export const RAGNAROK_IDENTIFY_PROTOCOL = 'ragnarok-pvp' as const;
export const RAGNAROK_IDENTIFY_PROTOCOL_VERSION = 3 as const;

export type RagnarokIdentifyCapabilities = Readonly<{
	readonly transportEpochV2: true;
	readonly appliedReceiptsV1: true;
	readonly phaseCheckpointsV1: true;
	readonly pokerNotaryV1: true;
}>;

export type RagnarokIdentify = Readonly<{
	readonly protocol: typeof RAGNAROK_IDENTIFY_PROTOCOL;
	readonly protocolVersion: typeof RAGNAROK_IDENTIFY_PROTOCOL_VERSION;
	readonly clientVersion: string;
	readonly buildHash: string;
	readonly engineHash: string;
	readonly rulesetHash: string;
	readonly capabilities: RagnarokIdentifyCapabilities;
}>;

export const RagnarokIdentifySchema = z.object({
	protocol: z.literal(RAGNAROK_IDENTIFY_PROTOCOL),
	protocolVersion: z.literal(RAGNAROK_IDENTIFY_PROTOCOL_VERSION),
	clientVersion: z.string().min(1).max(128),
	buildHash: z.string().min(1).max(256),
	engineHash: z.string().min(1).max(256),
	rulesetHash: z.string().min(1).max(256),
	capabilities: z.object({
		transportEpochV2: z.literal(true),
		appliedReceiptsV1: z.literal(true),
		phaseCheckpointsV1: z.literal(true),
		pokerNotaryV1: z.literal(true),
	}).strict(),
}).strict();

export type IdentifyComparison =
	| { readonly ok: true }
	| { readonly ok: false; readonly reason: string };

export function compareIdentify(
	local: RagnarokIdentify,
	remote: RagnarokIdentify,
): IdentifyComparison {
	if (local.protocol !== remote.protocol) {
		return { ok: false, reason: 'Identify protocol mismatch' };
	}
	if (local.protocolVersion !== remote.protocolVersion) {
		return { ok: false, reason: 'Identify protocol version mismatch' };
	}
	if (local.engineHash !== remote.engineHash) {
		return { ok: false, reason: 'Engine hash mismatch' };
	}
	if (local.rulesetHash !== remote.rulesetHash) {
		return { ok: false, reason: 'Ruleset hash mismatch' };
	}
	return { ok: true };
}
