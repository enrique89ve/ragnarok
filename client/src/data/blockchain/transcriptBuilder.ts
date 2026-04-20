/**
 * transcriptBuilder.ts - Merkle transcript for provable match replay
 *
 * Accumulates game moves during a match and builds a SHA-256 Merkle tree
 * at game end. The root hash is embedded in the match_result custom_json
 * and signed by both players.
 *
 * For disputes, a player can provide a MerkleProof showing a specific move
 * was (or wasn't) part of the agreed transcript.
 *
 * Module-level singleton so both useP2PSync (records moves) and
 * BlockchainSubscriber (reads the root) can access the same transcript.
 */

import type { GameMove, MoveRecord, MerkleProof } from './signedMove';
import { sha256Hash, canonicalStringify } from './hashUtils';

export interface TranscriptBundle {
	version: number;
	matchId: string;
	seed: string;
	merkleRoot: string;
	moveCount: number;
	createdAt: number;
	moves: string; // NDJSON
}

let activeTranscript: TranscriptBuilder | null = null;

export function getActiveTranscript(): TranscriptBuilder | null {
	return activeTranscript;
}

export function startNewTranscript(): TranscriptBuilder {
	activeTranscript = new TranscriptBuilder();
	return activeTranscript;
}

export function clearTranscript(): void {
	activeTranscript = null;
}

export class TranscriptBuilder {
	private moves: GameMove[] = [];
	private builtRecords: MoveRecord[] | null = null;
	private merkleRoot: string | null = null;
	private leafHashes: string[] = [];
	private treeLayers: string[][] = [];

	addMove(move: GameMove): void {
		this.moves.push(move);
		this.builtRecords = null;
		this.merkleRoot = null;
	}

	getMoveCount(): number {
		return this.moves.length;
	}

	getRawMoves(): GameMove[] {
		return [...this.moves];
	}

	async buildMerkleTree(): Promise<string> {
		if (this.merkleRoot) return this.merkleRoot;
		if (this.moves.length === 0) {
			this.merkleRoot = await sha256Hash('empty_transcript');
			return this.merkleRoot;
		}

		const records: MoveRecord[] = [];
		let previousHash = '';

		for (const move of this.moves) {
			const data = canonicalStringify({ ...move, previousHash });
			const hash = await sha256Hash(data);
			records.push({ ...move, hash });
			previousHash = hash;
		}

		this.builtRecords = records;
		this.leafHashes = records.map(r => r.hash);

		this.treeLayers = [this.leafHashes.slice()];
		let currentLayer = this.leafHashes.slice();

		while (currentLayer.length > 1) {
			const nextLayer: string[] = [];
			for (let i = 0; i < currentLayer.length; i += 2) {
				const left = currentLayer[i];
				const right = i + 1 < currentLayer.length ? currentLayer[i + 1] : left;
				nextLayer.push(await sha256Hash(left + right));
			}
			this.treeLayers.push(nextLayer);
			currentLayer = nextLayer;
		}

		this.merkleRoot = currentLayer[0];
		return this.merkleRoot;
	}

	async getMerkleProof(moveIndex: number): Promise<MerkleProof | null> {
		if (!this.merkleRoot) await this.buildMerkleTree();
		if (!this.builtRecords || moveIndex < 0 || moveIndex >= this.builtRecords.length) return null;

		const siblings: MerkleProof['siblings'] = [];
		let idx = moveIndex;

		for (let layer = 0; layer < this.treeLayers.length - 1; layer++) {
			const currentLayer = this.treeLayers[layer];
			const isLeft = idx % 2 === 0;
			const siblingIdx = isLeft ? idx + 1 : idx - 1;

			if (siblingIdx < currentLayer.length) {
				siblings.push({
					hash: currentLayer[siblingIdx],
					position: isLeft ? 'right' : 'left',
				});
			} else {
				siblings.push({
					hash: currentLayer[idx],
					position: 'right',
				});
			}

			idx = Math.floor(idx / 2);
		}

		return {
			leafHash: this.leafHashes[moveIndex],
			siblings,
			root: this.merkleRoot!,
		};
	}

	getBuiltRecords(): MoveRecord[] | null {
		return this.builtRecords;
	}

	/**
	 * Serialize transcript as NDJSON (newline-delimited JSON).
	 * Each line is a MoveRecord with its hash chain.
	 * Compact, streamable, deterministic — ideal for IPFS storage.
	 */
	async toNDJSON(): Promise<string> {
		if (!this.builtRecords) await this.buildMerkleTree();
		if (!this.builtRecords || this.builtRecords.length === 0) return '';
		return this.builtRecords.map(r => JSON.stringify(r)).join('\n') + '\n';
	}

	/**
	 * Serialize transcript with metadata envelope for IPFS pinning.
	 * Includes merkle root, move count, version, and the full NDJSON log.
	 */
	async toTranscriptBundle(matchId: string, seed: string): Promise<TranscriptBundle> {
		const root = await this.buildMerkleTree();
		const ndjson = await this.toNDJSON();
		return {
			version: 1,
			matchId,
			seed,
			merkleRoot: root,
			moveCount: this.moves.length,
			createdAt: Date.now(),
			moves: ndjson,
		};
	}

	static async verifyProof(proof: MerkleProof): Promise<boolean> {
		let currentHash = proof.leafHash;

		for (const sibling of proof.siblings) {
			if (sibling.position === 'left') {
				currentHash = await sha256Hash(sibling.hash + currentHash);
			} else {
				currentHash = await sha256Hash(currentHash + sibling.hash);
			}
		}

		return currentHash === proof.root;
	}
}
