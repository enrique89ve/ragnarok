import { fork, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { performance } from 'node:perf_hooks';
import { randomBytes, randomInt } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';
import {
	P2P_CONTROL_PROTOCOL_VERSION,
	P2P_CONTROL_WS_PROTOCOL,
	P2P_CONTROL_WS_PROTOCOL_PREFIX,
} from '../shared/p2p-wire/control';
import { P2P_MATCH_TICKET_WS_PROTOCOL, P2P_MATCH_TICKET_WS_PROTOCOL_PREFIX } from '../shared/p2pAvailability';
import { PHASE_CHECKPOINT_SCOPE, ZERO_PHASE_CHECKPOINT_ID } from '../shared/p2p-wire/phaseCheckpoint';
import { buildPokerTurnId, DEFAULT_POKER_TURN_DURATION_MS } from '../shared/p2p-wire/pokerTurnClock';
import { buildP2PMatchTicket } from '../server/services/p2pMatchTicketSigner';
import type { P2PControlTelemetrySnapshot } from '../server/services/p2pControlTelemetry';
import type { P2PRelayTelemetrySnapshot } from '../server/services/p2pTelemetry';

type Mode = 'control' | 'relay';
type Frame = Record<string, unknown>;
type Peer = { readonly id: string; readonly token: string; readonly localAddress: string };
type Pair = { readonly id: string; readonly peers: readonly [Peer, Peer]; sockets: [WebSocket, WebSocket] };
type Snapshot = {
	readonly cpu: NodeJS.CpuUsage;
	readonly rss: number;
	readonly stats: P2PControlTelemetrySnapshot | P2PRelayTelemetrySnapshot;
};

const CONNECT_BATCH = 64;
const TIMEOUT_MS = 30_000;

function modeFromArg(value: string | undefined): Mode {
	if (value === 'control' || value === 'relay') return value;
	throw new Error('Usage: pnpm exec tsx scripts/benchP2PWebSockets.ts <control|relay> <rooms>');
}

async function serve(mode: Mode): Promise<void> {
	if (!process.send) throw new Error('Expected a benchmark parent process');
	const server = createServer();
	const stats = await (async () => {
		if (mode === 'control') {
			const { attachP2PControl, getP2PControlStats } = await import('../server/routes/p2pControl');
			attachP2PControl(server);
			return getP2PControlStats;
		}
		const { attachP2PRelay, getP2PRelayStats } = await import('../server/routes/p2pRelay');
		attachP2PRelay(server);
		return getP2PRelayStats;
	})();
	// Keep the listener out of the client's ephemeral port range on the
	// benchmark host, even when preceding trials left sockets in TIME_WAIT.
	server.listen(randomInt(20_000, 32_000), '127.0.0.1');
	await once(server, 'listening');
	const address = server.address();
	if (!address || typeof address === 'string') throw new Error('Expected a loopback TCP address');
	process.on('message', message => {
		if (message === 'snapshot') {
			process.send?.({ cpu: process.cpuUsage(), rss: process.memoryUsage().rss, stats: stats() });
		}
	});
	process.on('disconnect', () => server.close());
	process.send({ port: address.port });
}

function waitFor(socket: WebSocket, accept: (frame: Frame) => boolean): Promise<Frame> {
	let cleanup: () => void;
	return new Promise<Frame>((resolve, reject) => {
		const timeout = setTimeout(() => reject(new Error('Timed out waiting for a benchmark frame')), TIMEOUT_MS);
		const onMessage = (raw: WebSocket.RawData) => {
			try {
				const frame: Frame = JSON.parse(raw.toString());
				if (frame.type === 'control_error_v1' || frame.event === 'error') {
					reject(new Error(`Benchmark route rejected a frame: ${JSON.stringify(frame)}`));
				} else if (accept(frame)) {
					resolve(frame);
				}
			} catch (error) {
				reject(error);
			}
		};
		const onClose = () => reject(new Error('WebSocket closed before expected benchmark frame'));
		const onError = (error: Error) => reject(error);
		cleanup = () => {
			clearTimeout(timeout);
			socket.off('message', onMessage);
			socket.off('close', onClose);
			socket.off('error', onError);
		};
		socket.on('message', onMessage);
		socket.once('close', onClose);
		socket.once('error', onError);
	}).finally(() => cleanup());
}

function close(socket: WebSocket): Promise<void> {
	if (socket.readyState === WebSocket.CLOSED) return Promise.resolve();
	const closed = new Promise<void>(resolve => socket.once('close', () => resolve()));
	socket.terminate();
	return closed;
}

function readWorkerMessage(worker: ChildProcess): Promise<unknown> {
	const abort = new AbortController();
	const timeout = setTimeout(() => abort.abort(new Error('Benchmark worker response timed out')), TIMEOUT_MS);
	const onExit = () => abort.abort(new Error('Benchmark worker exited before responding'));
	worker.once('exit', onExit);
	return once(worker, 'message', { signal: abort.signal }).then(([message]) => message).finally(() => {
		clearTimeout(timeout);
		worker.off('exit', onExit);
	});
}

function summarize(samples: number[], elapsedMs: number) {
	samples.sort((a, b) => a - b);
	const percentile = (fraction: number) => Number(samples[Math.ceil(fraction * samples.length) - 1].toFixed(2));
	return { completed: samples.length, elapsedMs: Number(elapsedMs.toFixed(2)), p50Ms: percentile(0.5), p95Ms: percentile(0.95), p99Ms: percentile(0.99) };
}

async function measure<T>(items: T[], work: (item: T) => Promise<void>) {
	const start = performance.now();
	const samples = await Promise.all(items.map(async item => {
		const itemStart = performance.now();
		await work(item);
		return performance.now() - itemStart;
	}));
	return summarize(samples, performance.now() - start);
}

async function run(mode: Mode, roomCount: number): Promise<void> {
	const secret = randomBytes(32).toString('hex');
	process.env.P2P_CHALLENGE_SIGNING_SECRET = secret;
	const worker = fork(fileURLToPath(import.meta.url), ['--worker', mode], {
		env: { PATH: process.env.PATH, NODE_ENV: 'test', VITE_NETWORK_STAGE: 'local', P2P_CHALLENGE_SIGNING_SECRET: secret },
		stdio: ['ignore', 'ignore', 'inherit', 'ipc'],
	});
	const sockets = new Set<WebSocket>();
	const snapshot = async (): Promise<Snapshot> => {
		const pending = readWorkerMessage(worker);
		worker.send('snapshot');
		return await pending as Snapshot;
	};

	try {
		const { port } = await readWorkerMessage(worker) as { port: number };
		const baseline = await snapshot();
		const isControl = mode === 'control';
		const makePeer = (id: string, roomIndex: number, seat: number): Peer => {
			const peerId = `${id}-${seat}`;
			const role = seat === 0 ? 'offerer' : 'answerer';
			// Spread the load generator across Linux loopback IPs so its source
			// port range does not cap the server measurement.
			const localAddress = process.platform === 'linux' ? `127.0.0.${2 + roomIndex % 8}` : '127.0.0.1';
			return { id: peerId, localAddress, token: buildP2PMatchTicket({ roomId: id, peerId, role }).token };
		};
		const openPair = async (id: string, peers: Pair['peers']): Promise<Pair['sockets']> => {
			const openPeer = async (peer: Peer) => {
				const path = isControl ? `control?match=${id}` : `p2p?room=${id}`;
				const protocol = isControl ? P2P_CONTROL_WS_PROTOCOL : P2P_MATCH_TICKET_WS_PROTOCOL;
				const prefix = isControl ? P2P_CONTROL_WS_PROTOCOL_PREFIX : P2P_MATCH_TICKET_WS_PROTOCOL_PREFIX;
				const socket = new WebSocket(`ws://127.0.0.1:${port}/ws/${path}&peer=${peer.id}`, [protocol, prefix + peer.token], {
					localAddress: peer.localAddress,
				});
				sockets.add(socket);
				socket.on('error', () => {});
				socket.once('close', () => sockets.delete(socket));
				const ready = waitFor(socket, frame => isControl ? frame.type === 'control_open_v1' : frame.event === 'open');
				if (isControl) {
					socket.once('open', () => socket.send(JSON.stringify({
						type: 'control_hello_v1', protocolVersion: P2P_CONTROL_PROTOCOL_VERSION, matchId: id, peerId: peer.id,
					})));
				}
				await ready;
				return socket;
			};
			return Promise.all([openPeer(peers[0]), openPeer(peers[1])]);
		};
		const pairs: Pair[] = [];
		const connectStart = performance.now();
		for (let offset = 0; offset < roomCount; offset += CONNECT_BATCH) {
			const batch = Array.from({ length: Math.min(CONNECT_BATCH, roomCount - offset) }, async (_, index): Promise<Pair> => {
				const roomIndex = offset + index;
				const id = `bench-room-${roomIndex}`;
				const peers = [makePeer(id, roomIndex, 0), makePeer(id, roomIndex, 1)] as const;
				return { id, peers, sockets: await openPair(id, peers) };
			});
			pairs.push(...await Promise.all(batch));
		}
		const connectMs = Number((performance.now() - connectStart).toFixed(2));
		const connected = await snapshot();
		if (connected.stats.activeConnections !== roomCount * 2) throw new Error('Wrong number of connected sockets');

		const confirm = async (pair: Pair, proposal: Frame, type: string, relayEvent: string) => {
			const pending = pair.sockets.map(socket => waitFor(socket, frame => isControl ? frame.type === type : frame.event === relayEvent));
			const json = JSON.stringify(proposal);
			for (const socket of pair.sockets) socket.send(json);
			return (await Promise.all(pending)).map(frame => isControl ? frame : frame.message as Frame);
		};

		const checkpoint = await measure(pairs, async pair => {
			const commits = await confirm(pair, {
				type: 'phase_checkpoint_propose_v1', protocolVersion: 1, scope: PHASE_CHECKPOINT_SCOPE,
				matchId: pair.id, epoch: 1, fromPhase: 'chess', toPhase: 'poker_combat',
				previousCheckpointId: ZERO_PHASE_CHECKPOINT_ID, stateRoot: '1'.repeat(64),
			}, 'phase_checkpoint_commit_v1', 'phase_checkpoint');
			if (commits.some(commit => commit.type !== 'phase_checkpoint_commit_v1' || commit.matchId !== pair.id)
				|| commits[0].checkpointId !== commits[1].checkpointId) throw new Error('Checkpoint did not agree');
		});
		const deadlines = new Map<string, number>();
		const confirmTurn = (pair: Pair) => {
			const identity = { combatId: `combat-${pair.id}`, phase: 'pre_flop', activePlayerId: pair.peers[0].id, actionsThisRound: 0 } as const;
			return confirm(pair, {
				...identity, turnId: buildPokerTurnId(identity), type: 'poker_turn_started',
				durationMs: DEFAULT_POKER_TURN_DURATION_MS, sentAtMs: Date.now(),
			}, 'poker_turn_notary_commit_v1', 'poker_turn_notary');
		};
		const deadlineFor = async (pair: Pair) => {
			const commits = await confirmTurn(pair);
			const deadline = commits[0].serverDeadlineAtMs;
			if (typeof deadline !== 'number' || commits.some(commit => commit.type !== 'poker_turn_notary_commit_v1'
				|| commit.matchId !== pair.id || commit.serverDeadlineAtMs !== deadline)) throw new Error('Poker deadlines did not agree');
			return deadline;
		};
		const poker = await measure(pairs, async pair => {
			deadlines.set(pair.id, await deadlineFor(pair));
		});
		const pokerAction = mode === 'relay' ? await measure(pairs, async ({ id, peers, sockets }) => {
			const turnId = buildPokerTurnId({ combatId: `combat-${id}`, phase: 'pre_flop', activePlayerId: peers[0].id, actionsThisRound: 0 });
			const decisionId = `decision-${id}`;
			const ack = waitFor(sockets[0], frame => frame.event === 'poker_action_time_gate');
			const forwarded = waitFor(sockets[1], frame => frame.type === 'poker_action' && frame.decisionId === decisionId);
			sockets[0].send(JSON.stringify({
				type: 'poker_action', playerId: peers[0].id, action: 'defend', origin: 'player', turnId, decisionId, seq: 0,
			}));
			const [receipt] = await Promise.all([ack, forwarded]);
			const message = receipt.message as Frame;
			if (message?.allowed !== true || message.decisionId !== decisionId) throw new Error('Poker action was not confirmed');
		}) : undefined;
		const reconnectPairs = pairs.slice(0, Math.min(roomCount, 100));
		const reconnect = await measure(reconnectPairs, async pair => {
			await Promise.all(pair.sockets.map(close));
			pair.sockets = await openPair(pair.id, pair.peers);
			if (await deadlineFor(pair) !== deadlines.get(pair.id)) throw new Error('Reconnect changed the poker deadline');
		});
		const final = await snapshot();
		if (final.stats.activeConnections !== roomCount * 2 || final.stats.totalFramesDropped !== 0) {
			throw new Error(`Unexpected final socket or drop count: ${JSON.stringify(final.stats)}`);
		}
		console.log(JSON.stringify({ mode, roomCount, connectMs, checkpoint, poker, pokerAction, reconnect, baseline, connected, final }, null, 2));
	} finally {
		await Promise.all([...sockets].map(close));
		if (worker.connected) worker.disconnect();
		worker.kill();
	}
}

if (process.argv[2] === '--worker') {
	await serve(modeFromArg(process.argv[3]));
} else {
	const mode = modeFromArg(process.argv[2]);
	const count = Number(process.argv[3]);
	if (!Number.isSafeInteger(count) || count < 1) throw new Error('Expected a positive room count');
	await run(mode, count);
}
