export type Stage =
	| 'local'
	| 'closed-testnet-beta-1'
	| 'testnet-beta-2'
	| 'mainnet-candidate';

export type ProjectionKind =
	| 'json-file'
	| 'postgres-direct'
	| 'database-service';

export type SnapshotKind = 'none' | 'ipfs-checkpoints';

export type StoreProjection = {
	readonly lastBlock: number;
	readonly claimKeys: readonly string[];
	readonly stateHash: string;
};

export type HotProjection = {
	readonly kind: ProjectionKind;
	readonly online: boolean;
	readonly store: StoreProjection;
	readonly drifted: boolean;
};

export type PrototypeState = {
	readonly stage: Stage;
	readonly canonicalOps: readonly string[];
	readonly clientLocalStore: StoreProjection;
	readonly hotProjection: HotProjection;
	readonly snapshot: {
		readonly kind: SnapshotKind;
		readonly checkpointCount: number;
		readonly lastCheckpointHash: string | null;
	};
	readonly verdicts: readonly string[];
};

export type PrototypeAction =
	| { readonly type: 'set-stage'; readonly stage: Stage; readonly projectionKind: ProjectionKind }
	| { readonly type: 'append-op' }
	| { readonly type: 'toggle-projection-online' }
	| { readonly type: 'sync-projection' }
	| { readonly type: 'rebuild-projection' }
	| { readonly type: 'drift-projection' }
	| { readonly type: 'enable-ipfs-checkpoints' }
	| { readonly type: 'checkpoint-ipfs' };

const INITIAL_STORE: StoreProjection = {
	lastBlock: 0,
	claimKeys: [],
	stateHash: 'empty:0',
};

export const createInitialState = (): PrototypeState => ({
	stage: 'closed-testnet-beta-1',
	canonicalOps: [],
	clientLocalStore: INITIAL_STORE,
	hotProjection: {
		kind: 'json-file',
		online: true,
		store: INITIAL_STORE,
		drifted: false,
	},
	snapshot: {
		kind: 'none',
		checkpointCount: 0,
		lastCheckpointHash: null,
	},
	verdicts: [
		'client-local-store-required',
		'hot-projection-is-rebuildable-cache',
	],
});

export const reducePrototype = (
	state: PrototypeState,
	action: PrototypeAction,
): PrototypeState => {
	if (action.type === 'set-stage') {
		return {
			...state,
			stage: action.stage,
			hotProjection: {
				...state.hotProjection,
				kind: action.projectionKind,
				online: true,
			},
			verdicts: addVerdict(state.verdicts, `stage:${action.stage}->${action.projectionKind}`),
		};
	}

	if (action.type === 'append-op') {
		const nextOp = `reward:S01:alice:claim-${state.canonicalOps.length + 1}`;
		const canonicalOps = [...state.canonicalOps, nextOp];
		const clientLocalStore = projectOps(canonicalOps);
		const hotProjection = state.hotProjection.online
			? {
				...state.hotProjection,
				store: projectOps(canonicalOps),
				drifted: false,
			}
			: state.hotProjection;

		return {
			...state,
			canonicalOps,
			clientLocalStore,
			hotProjection,
			verdicts: addVerdict(state.verdicts, 'client-replayed-op-first'),
		};
	}

	if (action.type === 'toggle-projection-online') {
		return {
			...state,
			hotProjection: {
				...state.hotProjection,
				online: !state.hotProjection.online,
			},
		};
	}

	if (action.type === 'sync-projection') {
		if (!state.hotProjection.online) {
			return {
				...state,
				verdicts: addVerdict(state.verdicts, 'projection-sync-blocked-offline'),
			};
		}

		return {
			...state,
			hotProjection: {
				...state.hotProjection,
				store: state.clientLocalStore,
				drifted: false,
			},
			verdicts: addVerdict(state.verdicts, 'projection-caught-up-from-client-replay'),
		};
	}

	if (action.type === 'rebuild-projection') {
		return {
			...state,
			hotProjection: {
				...state.hotProjection,
				store: projectOps(state.canonicalOps),
				drifted: false,
				online: true,
			},
			verdicts: addVerdict(state.verdicts, 'projection-rebuilds-from-op-log'),
		};
	}

	if (action.type === 'drift-projection') {
		const poisonedStore = projectOps([...state.hotProjection.store.claimKeys, 'server-only-drift']);
		return {
			...state,
			hotProjection: {
				...state.hotProjection,
				store: poisonedStore,
				drifted: true,
			},
			verdicts: addVerdict(state.verdicts, 'drift-detected-by-hash-compare'),
		};
	}

	if (action.type === 'enable-ipfs-checkpoints') {
		return {
			...state,
			snapshot: {
				kind: 'ipfs-checkpoints',
				checkpointCount: state.snapshot.checkpointCount,
				lastCheckpointHash: state.snapshot.lastCheckpointHash,
			},
			verdicts: addVerdict(state.verdicts, 'ipfs-is-snapshot-layer-not-hot-write-path'),
		};
	}

	if (action.type === 'checkpoint-ipfs') {
		if (state.snapshot.kind !== 'ipfs-checkpoints') {
			return {
				...state,
				verdicts: addVerdict(state.verdicts, 'checkpoint-skipped-ipfs-disabled'),
			};
		}

		return {
			...state,
			snapshot: {
				kind: 'ipfs-checkpoints',
				checkpointCount: state.snapshot.checkpointCount + 1,
				lastCheckpointHash: state.clientLocalStore.stateHash,
			},
			verdicts: addVerdict(state.verdicts, 'checkpoint-created-from-replay-state'),
		};
	}

	return state;
};

export const evaluateInvariants = (state: PrototypeState): readonly string[] => {
	const results = [
		state.clientLocalStore.lastBlock === state.canonicalOps.length
			? 'PASS client local store has every canonical op'
			: 'FAIL client local store fragmented from canonical ops',
		state.hotProjection.store.stateHash === state.clientLocalStore.stateHash
			? 'PASS hot projection matches client replay'
			: 'WARN hot projection differs; rebuild or wait for sync',
		state.snapshot.kind === 'ipfs-checkpoints'
			? 'PASS IPFS is checkpoint/snapshot only'
			: 'PASS no IPFS hot path',
	];

	return results;
};

const projectOps = (ops: readonly string[]): StoreProjection => {
	const claimKeys = [...new Set(ops)].sort();
	return {
		lastBlock: ops.length,
		claimKeys,
		stateHash: createStateHash(claimKeys),
	};
};

const createStateHash = (claimKeys: readonly string[]): string => {
	let hash = 2_166_136_261;
	for (const claimKey of claimKeys) {
		for (const char of claimKey) {
			hash ^= char.charCodeAt(0);
			hash = Math.imul(hash, 16_777_619);
		}
	}
	return `${claimKeys.length}:${(hash >>> 0).toString(16).padStart(8, '0')}`;
};

const addVerdict = (verdicts: readonly string[], verdict: string): readonly string[] => {
	if (verdicts.includes(verdict)) return verdicts;
	return [...verdicts, verdict].slice(-8);
};
