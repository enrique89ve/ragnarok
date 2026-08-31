import { canonicalize } from './canonicalJson';
import { verifyEnvelope, type SessionKey } from './sessionKey';

const ENCODER = new TextEncoder();
const DOMAIN = 'ragnarok:p2p:game-command:v1';

export type GameplaySignatureInput = Readonly<{
	matchId: string;
	seq: number;
	commandId: string;
	prevStateHash: string;
	command: unknown;
}>;

/**
 * Canonical bytes signed by a peer before a gameplay mutation is sent.
 * Every routing/integrity field is included so a valid signature cannot be
 * replayed against another match, sequence, state, or command.
 */
export function buildGameplaySignatureBytes(input: GameplaySignatureInput): Uint8Array {
	return ENCODER.encode(canonicalize({
		domain: DOMAIN,
		matchId: input.matchId,
		seq: input.seq,
		commandId: input.commandId,
		prevStateHash: input.prevStateHash,
		command: input.command,
	}));
}

export async function signGameplayEnvelope(
	input: GameplaySignatureInput,
	key: SessionKey,
): Promise<string> {
	if (key.matchId !== input.matchId) {
		throw new Error('[signedGameplayEnvelope] session key does not match gameplay envelope');
	}
	return key.sign(buildGameplaySignatureBytes(input));
}

export function verifyGameplayEnvelope(
	input: GameplaySignatureInput,
	signature: string,
	publicKey: string,
): Promise<boolean> {
	return verifyEnvelope(buildGameplaySignatureBytes(input), signature, publicKey);
}

