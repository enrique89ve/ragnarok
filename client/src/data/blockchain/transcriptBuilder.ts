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
 * Module-level singleton so both useWireSync (records moves) and
 * BlockchainSubscriber (reads the root) can access the same transcript.
 */

import type { GameMove, MoveRecord, MerkleProof } from './signedMove';
import { sha256Hash, canonicalStringify } from './hashUtils';
import type { RagnarokRuntimeEvidence } from '@shared/runtimeConfig';
export type { GameMove };

export interface TranscriptBundle {
	version: number;
	matchId: string;
	seed: string;
	merkleRoot: string;
	moveCount: number;
	createdAt: number;
	moves: string; // NDJSON
}

export interface SessionEvent {
	timestamp: number;
	kind: string;
	payload: Record<string, unknown>;
}

export interface SessionLogPayload {
	matchId: string | null;
	buildHash: string;
	runtime: RagnarokRuntimeEvidence;
	connectionState: string;
	isHost: boolean;
	exportedAt: number;
	moves: GameMove[];
	events: SessionEvent[];
}

const SESSION_EVENT_BUFFER_SIZE = 200;
const sessionEventBuffer: SessionEvent[] = [];

let activeTranscript: TranscriptBuilder | null = null;

// Module-local monotonic counter feeding `GameMove.moveNumber`. Lives on the
// singleton (not on TranscriptBuilder) so multiple call sites — useWireSync
// (cards/poker), chessWireSender (chess send path), and chess receive handlers
// — share one numbering sequence per match. Reset by startNewTranscript /
// clearTranscript so a reconnected session starts at 0.
let moveCounter = 0;

export function getActiveTranscript(): TranscriptBuilder | null {
	return activeTranscript;
}

export function startNewTranscript(): TranscriptBuilder {
	activeTranscript = new TranscriptBuilder();
	sessionEventBuffer.length = 0;
	moveCounter = 0;
	return activeTranscript;
}

export function clearTranscript(): void {
	activeTranscript = null;
	sessionEventBuffer.length = 0;
	moveCounter = 0;
}

/**
 * Append a move to the active transcript. No-op when no transcript is active
 * (SP / pre-handshake). `playerId` should come from `playerIdentity.ts` so the
 * fallback policy (Hive username → guest sentinel) is uniform across sites.
 */
export function recordMove(
	action: string,
	payload: Record<string, unknown>,
	playerId: string,
	canonicalOrder?: number,
	): boolean {
	const transcript = activeTranscript;
	if (!transcript) return false;
	if (canonicalOrder !== undefined && (!Number.isSafeInteger(canonicalOrder) || canonicalOrder <= 0)) {
		throw new Error(`[transcript] canonicalOrder must be a positive safe integer: ${canonicalOrder}`);
	}
	const move: GameMove = {
		moveNumber: moveCounter++,
		...(canonicalOrder === undefined ? {} : { canonicalOrder }),
		action,
		payload,
		playerId,
		timestamp: Date.now(),
	};
	transcript.addMove(move);
	return true;
}

function orderedMovesForMerkle(moves: readonly GameMove[]): GameMove[] {
	const hasCanonicalOrder = moves.some(move => move.canonicalOrder !== undefined);
	if (!hasCanonicalOrder) return [...moves];
	if (moves.some(move => move.canonicalOrder === undefined)) {
		throw new Error('[transcript] mixed canonical and legacy move ordering');
	}
	const ordered = [...moves].sort((left, right) => left.canonicalOrder! - right.canonicalOrder!);
	for (let index = 0; index < ordered.length; index += 1) {
		const order = ordered[index]?.canonicalOrder;
		if (order !== index + 1) {
			throw new Error(`[transcript] canonical action order is not contiguous at index ${index}: ${order}`);
		}
	}
	return ordered;
}

/**
 * Record a non-move P2P/session event into a bounded ring buffer.
 * Used for the exportable session log (Bloque C.0 — bitácora P2P local).
 */
export function recordSessionEvent(kind: string, payload: Record<string, unknown> = {}): void {
	sessionEventBuffer.push({ timestamp: Date.now(), kind, payload });
	if (sessionEventBuffer.length > SESSION_EVENT_BUFFER_SIZE) {
		sessionEventBuffer.splice(0, sessionEventBuffer.length - SESSION_EVENT_BUFFER_SIZE);
	}
}

export function getSessionEvents(): SessionEvent[] {
	return [...sessionEventBuffer];
}

/**
 * Build a downloadable JSON Blob with the active transcript moves and the
 * recent session event ring buffer, plus identifying metadata. Designed for
 * QA bug reports during closed beta — not consumed by the protocol.
 */
export function exportSessionLog(meta: {
	matchId: string | null;
	buildHash: string;
	runtime: RagnarokRuntimeEvidence;
	connectionState: string;
	isHost: boolean;
}): Blob {
	const transcript = getActiveTranscript();
	const moves = transcript ? transcript.getRawMoves() : [];
	const payload: SessionLogPayload = {
		matchId: meta.matchId,
		buildHash: meta.buildHash,
		runtime: meta.runtime,
		connectionState: meta.connectionState,
		isHost: meta.isHost,
		exportedAt: Date.now(),
		moves,
		events: getSessionEvents(),
	};
	return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
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

		const orderedMoves = orderedMovesForMerkle(this.moves);
		const hasCanonicalOrder = orderedMoves.some(move => move.canonicalOrder !== undefined);
		for (let index = 0; index < orderedMoves.length; index += 1) {
			const move = orderedMoves[index];
			if (!move) continue;
			// P2P records carry a shared order, so clock skew, VPN latency, and
			// arrival timing are diagnostic only and must not fork the root. Keep
			// the pre-existing insertion-order hash for non-P2P transcripts so a
			// local campaign/session does not silently change its legacy proof.
			const data = hasCanonicalOrder
				? canonicalStringify({
					canonicalOrder: move.canonicalOrder,
					action: move.action,
					payload: move.payload,
					playerId: move.playerId,
					previousHash,
				})
				: canonicalStringify({ ...move, previousHash });
			const hash = await sha256Hash(data);
			records.push({
				...move,
				...(hasCanonicalOrder ? { moveNumber: index } : {}),
				hash,
			});
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
