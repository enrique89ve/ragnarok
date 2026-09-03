export type RagnarokPeerRecord = {
	peerId: string;
	protocols: Set<string>;
	capabilities: {
		webrtc: boolean;
		relay: boolean;
	};
	metadata: {
		buildHash?: string;
		engineHash?: string;
		rulesetHash?: string;
	};
	lastConnection?: {
		transport: 'webrtc' | 'relay';
		succeededAt: number;
		failedAt?: number;
	};
};

export type PeerDirectory = {
	upsert(peerId: string, patch: Partial<Omit<RagnarokPeerRecord, 'peerId' | 'protocols'>> & {
		readonly protocols?: Iterable<string>;
	}): RagnarokPeerRecord;
	get(peerId: string): RagnarokPeerRecord | null;
	forget(peerId: string): void;
};

function emptyRecord(peerId: string): RagnarokPeerRecord {
	return {
		peerId,
		protocols: new Set<string>(),
		capabilities: { webrtc: false, relay: false },
		metadata: {},
	};
}

export function createPeerDirectory(): PeerDirectory {
	const peers = new Map<string, RagnarokPeerRecord>();

	return {
		upsert(peerId, patch) {
			const current = peers.get(peerId) ?? emptyRecord(peerId);
			const next: RagnarokPeerRecord = {
				...current,
				capabilities: { ...current.capabilities, ...patch.capabilities },
				metadata: { ...current.metadata, ...patch.metadata },
				lastConnection: patch.lastConnection ?? current.lastConnection,
				protocols: patch.protocols ? new Set(patch.protocols) : current.protocols,
			};
			peers.set(peerId, next);
			return next;
		},
		get(peerId) {
			return peers.get(peerId) ?? null;
		},
		forget(peerId) {
			peers.delete(peerId);
		},
	};
}
