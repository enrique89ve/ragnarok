import { debug } from '../../config/debugConfig';
import {
	gameEffectCoordinator,
	type GameEffectCoordinator,
	type GameEffectHandle,
	type GameEffectPriority,
} from './gameEffectCoordinator';

export type GameEffectExecutionResult =
	| void
	| GameEffectHandle
	| Promise<void>
	| Promise<GameEffectHandle | void>;

export interface GameEffectNode {
	readonly id: string;
	readonly after?: readonly string[];
	readonly delayMs?: number;
	readonly run: () => GameEffectExecutionResult;
}

export interface GameEffectPlan {
	readonly id: string;
	readonly owner: string;
	readonly lane: string;
	readonly priority: GameEffectPriority;
	readonly nodes: readonly GameEffectNode[];
}

export interface GameEffectMediatorOptions {
	readonly coordinator?: GameEffectCoordinator;
	readonly maxNodesPerPlan?: number;
}

export interface GameEffectMediator {
	dispatch(plan: GameEffectPlan): GameEffectHandle;
	cancelPlan(planId: string): void;
	cancelOwner(owner: string): void;
	cancelAll(): void;
	getActivePlanCount(): number;
}

type NodeStatus = 'pending' | 'scheduled' | 'running' | 'completed' | 'failed' | 'skipped' | 'cancelled';

interface RuntimeNode {
	readonly definition: GameEffectNode;
	status: NodeStatus;
	coordinatorHandle?: GameEffectHandle;
	childHandle?: GameEffectHandle;
}

interface RuntimePlan {
	readonly definition: GameEffectPlan;
	readonly nodes: Map<string, RuntimeNode>;
	readonly resolveComplete: () => void;
	onComplete: Promise<void>;
	cancelled: boolean;
	settled: boolean;
}

const DEFAULT_MAX_NODES_PER_PLAN = 32;

function completedHandle(): GameEffectHandle {
	return { cancel() {}, onComplete: Promise.resolve() };
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
	return value !== null && typeof value === 'object' && 'then' in value && typeof value.then === 'function';
}

function isEffectHandle(value: unknown): value is GameEffectHandle {
	return value !== null && typeof value === 'object' && 'cancel' in value && typeof value.cancel === 'function';
}

function warnInvalidPlan(plan: GameEffectPlan, reason: string): void {
	debug.warn(`[GameEffectMediator] Plan "${plan.id}" rejected: ${reason}`);
}

function hasCycle(nodes: Map<string, GameEffectNode>): boolean {
	const visiting = new Set<string>();
	const visited = new Set<string>();

	const visit = (id: string): boolean => {
		if (visiting.has(id)) return true;
		if (visited.has(id)) return false;
		visiting.add(id);
		const node = nodes.get(id);
		if (node && (node.after ?? []).some(visit)) return true;
		visiting.delete(id);
		visited.add(id);
		return false;
	};

	return [...nodes.keys()].some(visit);
}

function validatePlan(plan: GameEffectPlan, maxNodes: number): string | null {
	if (!plan.id.trim()) return 'missing plan id';
	if (!plan.owner.trim() || !plan.lane.trim()) return 'owner and lane are required';
	if (plan.nodes.length === 0) return 'at least one node is required';
	if (plan.nodes.length > maxNodes) return `node limit exceeded (${maxNodes})`;

	const nodes = new Map<string, GameEffectNode>();
	for (const node of plan.nodes) {
		if (!node.id.trim()) return 'node id cannot be empty';
		if (nodes.has(node.id)) return `duplicate node id "${node.id}"`;
		nodes.set(node.id, node);
	}

	for (const node of plan.nodes) {
		for (const dependency of node.after ?? []) {
			if (!nodes.has(dependency)) return `node "${node.id}" depends on unknown node "${dependency}"`;
			if (dependency === node.id) return `node "${node.id}" depends on itself`;
		}
	}
	return hasCycle(nodes) ? 'dependency cycle detected' : null;
}

/**
 * Mediates multi-step presentation plans without owning game state or art.
 * The coordinator remains the only timing authority; this layer only decides
 * when a node is eligible and fails closed when its prerequisites are unsafe.
 */
export function createGameEffectMediator(options: GameEffectMediatorOptions = {}): GameEffectMediator {
	const coordinator = options.coordinator ?? gameEffectCoordinator;
	const maxNodes = options.maxNodesPerPlan ?? DEFAULT_MAX_NODES_PER_PLAN;
	const activePlans = new Map<string, RuntimePlan>();

	const settlePlan = (runtime: RuntimePlan): void => {
		if (runtime.settled) return;
		const mutableRuntime = runtime;
		const terminal = [...runtime.nodes.values()].every(node =>
			['completed', 'failed', 'skipped', 'cancelled'].includes(node.status),
		);
		if (!runtime.cancelled && !terminal) return;
		mutableRuntime.settled = true;
		if (activePlans.get(runtime.definition.id) === runtime) activePlans.delete(runtime.definition.id);
		runtime.resolveComplete();
	};

	const cancelRuntime = (runtime: RuntimePlan): void => {
		if (runtime.cancelled || runtime.settled) return;
		const mutableRuntime = runtime;
		mutableRuntime.cancelled = true;
		for (const node of runtime.nodes.values()) {
			node.status = 'cancelled';
			node.coordinatorHandle?.cancel();
			node.childHandle?.cancel();
		}
		settlePlan(runtime);
	};

	const progress = (runtime: RuntimePlan): void => {
		if (runtime.cancelled || runtime.settled) return;

		let changed = true;
		while (changed && !runtime.cancelled) {
			changed = false;
			for (const node of runtime.nodes.values()) {
				if (node.status !== 'pending') continue;
				const dependencies = (node.definition.after ?? []).map(id => runtime.nodes.get(id)!);
				if (dependencies.some(dependency => ['failed', 'skipped', 'cancelled'].includes(dependency.status))) {
					node.status = 'skipped';
					changed = true;
					continue;
				}
				if (!dependencies.every(dependency => dependency.status === 'completed')) continue;

				node.status = 'scheduled';
				changed = true;
				node.coordinatorHandle = coordinator.schedule({
					owner: runtime.definition.owner,
					lane: runtime.definition.lane,
					key: `${runtime.definition.id}:${node.definition.id}`,
					priority: runtime.definition.priority,
					delayMs: node.definition.delayMs ?? 0,
					run: () => {
						if (runtime.cancelled) return;
						node.status = 'running';
						let result: GameEffectExecutionResult;
						try {
							result = node.definition.run();
						} catch (error) {
							node.status = 'failed';
							debug.error(`[GameEffectMediator] Node "${node.definition.id}" failed:`, error);
							progress(runtime);
							return;
						}

						const completeNode = (): void => {
							if (runtime.cancelled || node.status === 'cancelled') return;
							node.status = 'completed';
							progress(runtime);
							settlePlan(runtime);
						};
						const failNode = (error: unknown): void => {
							node.status = 'failed';
							debug.error(`[GameEffectMediator] Node "${node.definition.id}" failed:`, error);
							progress(runtime);
							settlePlan(runtime);
						};

						if (isEffectHandle(result)) {
							node.childHandle = result;
							if (result.onComplete) {
								result.onComplete.then(completeNode, failNode);
							} else {
								completeNode();
							}
						} else if (isPromiseLike(result)) {
							Promise.resolve(result).then(value => {
								if (isEffectHandle(value)) {
									node.childHandle = value;
									if (value.onComplete) value.onComplete.then(completeNode, failNode);
									else completeNode();
								} else {
									completeNode();
								}
							}, failNode);
						} else {
							completeNode();
						}
					},
				});

				if (node.coordinatorHandle.onComplete) {
					node.coordinatorHandle.onComplete.then(() => {
						if (node.status === 'scheduled') {
							// A coordinator-level cancellation happened before this node ran.
							cancelRuntime(runtime);
						}
					});
				}
			}
		}
		settlePlan(runtime);
	};

	const dispatch = (plan: GameEffectPlan): GameEffectHandle => {
		const validationError = validatePlan(plan, maxNodes);
		if (validationError) {
			warnInvalidPlan(plan, validationError);
			return completedHandle();
		}

		activePlans.get(plan.id) && cancelRuntime(activePlans.get(plan.id)!);
		let resolveComplete!: () => void;
		const onComplete = new Promise<void>(resolve => {
			resolveComplete = resolve;
		});
		const runtime: RuntimePlan = {
			definition: plan,
			nodes: new Map(plan.nodes.map(node => [node.id, { definition: node, status: 'pending' }])),
			resolveComplete,
			onComplete,
			cancelled: false,
			settled: false,
		};
		activePlans.set(plan.id, runtime);
		progress(runtime);
		return {
			cancel: () => cancelRuntime(runtime),
			onComplete,
		};
	};

	return {
		dispatch,
		cancelPlan(planId) {
			const runtime = activePlans.get(planId);
			if (runtime) cancelRuntime(runtime);
		},
		cancelOwner(owner) {
			for (const runtime of activePlans.values()) {
				if (runtime.definition.owner === owner) cancelRuntime(runtime);
			}
		},
		cancelAll() {
			for (const runtime of activePlans.values()) cancelRuntime(runtime);
		},
		getActivePlanCount() {
			return activePlans.size;
		},
	};
}

export const gameEffectMediator = createGameEffectMediator();
