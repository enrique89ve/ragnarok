import { ed25519 } from '@noble/curves/ed25519.js';

const ED25519_PUBLIC_KEY_BYTES = 32;
const ED25519_SIGNATURE_BYTES = 64;

function decodeBase64Url(value: string): Uint8Array | null {
	if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
	try {
		const binary = Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4), 'base64');
		return new Uint8Array(binary);
	} catch {
		return null;
	}
}

export function verifyP2PSessionSignature(input: {
	readonly bytes: Uint8Array;
	readonly signature: string;
	readonly publicKey: string;
}): boolean {
	if (input.signature.length !== 86 || input.publicKey.length !== 43) return false;
	const signature = decodeBase64Url(input.signature);
	const publicKey = decodeBase64Url(input.publicKey);
	if (!signature || !publicKey || signature.length !== ED25519_SIGNATURE_BYTES || publicKey.length !== ED25519_PUBLIC_KEY_BYTES) return false;
	try {
		return ed25519.verify(signature, input.bytes, publicKey);
	} catch {
		return false;
	}
}
