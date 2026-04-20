/**
 * clientSignatureVerifier.ts — Browser SignatureVerifier for protocol-core
 *
 * Wraps the existing hiveSignatureVerifier.ts (which uses hive-tx PublicKey/Signature
 * with Web Crypto SHA-256) into the protocol-core SignatureVerifier interface.
 */

import type { SignatureVerifier } from '../../../../shared/protocol-core/types';
import { verifyHiveSignature } from './hiveSignatureVerifier';
import { PublicKey, Signature } from 'hive-tx';

export const clientSignatureVerifier: SignatureVerifier = {
	async verifyAnchored(pubkey: string, message: string, signatureHex: string): Promise<boolean> {
		if (!signatureHex || signatureHex.length < 10) return false;
		try {
			const sig = Signature.from(signatureHex);
			const encoder = new TextEncoder();
			const msgBytes = encoder.encode(message);
			const hashBuffer = await crypto.subtle.digest('SHA-256', msgBytes);
			const hashHex = Array.from(new Uint8Array(hashBuffer))
				.map(b => b.toString(16).padStart(2, '0'))
				.join('');
			const recoveredKey = sig.getPublicKey(hashHex);
			return recoveredKey.toString() === pubkey;
		} catch {
			return false;
		}
	},

	async verifyCurrentKey(account: string, message: string, signatureHex: string): Promise<boolean> {
		return verifyHiveSignature(account, message, signatureHex);
	},
};
