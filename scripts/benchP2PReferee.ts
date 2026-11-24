#!/usr/bin/env tsx
/**
 * Local, in-process P2P referee throughput benchmark.
 *
 * Measures batch throughput for phase checkpoints and poker turn clocks.
 * Includes fixture creation and both proposals for each room. No WebSockets, network I/O,
 * and no production singletons — fresh coordinator instances per scenario.
 */

import { performance } from 'node:perf_hooks';

import {
	PHASE_CHECKPOINT_PROTOCOL_VERSION,
	PHASE_CHECKPOINT_SCOPE,
	PhaseCheckpointProposalSchema,
	ZERO_PHASE_CHECKPOINT_ID,
	type PhaseCheckpointProposal,
} from '../shared/p2p-wire/phaseCheckpoint.ts';
import {
	PokerTurnClockProposalSchema,
	type PokerTurnClockProposal,
} from '../shared/p2p-wire/pokerTimeNotary.ts';
import { createP2PPhaseCheckpointCoordinator } from '../server/services/p2pPhaseCheckpointCoordinator.ts';
import { createP2PPokerTimeNotary } from '../server/services/p2pPokerTimeNotary.ts';

const DEFAULT_ROOM_COUNTS = [1_000, 5_000] as const;

type BenchMode = 'checkpoint' | 'poker' | 'both';

interface ScenarioResult {
	readonly label: string;
	readonly roomCount: number;
	readonly submitCount: number;
	readonly commitCount: number;
	readonly elapsedMs: number;
	readonly submitsPerSec: number;
	readonly commitsPerSec: number;
	readonly activeRooms: number;
}

function checkpointProposal(roomIndex: number): PhaseCheckpointProposal {
	const root = (roomIndex % 16).toString(16).repeat(64);
	return PhaseCheckpointProposalSchema.parse({
		type: 'phase_checkpoint_propose_v1',
		protocolVersion: PHASE_CHECKPOINT_PROTOCOL_VERSION,
		scope: PHASE_CHECKPOINT_SCOPE,
		matchId: `bench-match-${roomIndex}`,
		epoch: 1,
		fromPhase: 'chess',
		toPhase: 'poker_combat',
		previousCheckpointId: ZERO_PHASE_CHECKPOINT_ID,
		stateRoot: root,
	});
}

function pokerTurnProposal(roomIndex: number): PokerTurnClockProposal {
	return PokerTurnClockProposalSchema.parse({
		type: 'poker_turn_started',
		combatId: `bench-combat-${roomIndex}`,
		turnId: `bench-combat-${roomIndex}:pre_flop:player:0`,
		phase: 'pre_flop',
		activePlayerId: 'player',
		actionsThisRound: 0,
		durationMs: 60_000,
		sentAtMs: 1,
	});
}

function benchPhaseCheckpoints(roomCount: number): ScenarioResult {
	const coordinator = createP2PPhaseCheckpointCoordinator();
	let commitCount = 0;

	const start = performance.now();
	for (let index = 0; index < roomCount; index += 1) {
		const roomId = `bench-cp-${index}`;
		const proposal = checkpointProposal(index);
		coordinator.submit({ roomId, peerId: 'peer-a', proposal });
		const second = coordinator.submit({ roomId, peerId: 'peer-b', proposal });
		if (second.status === 'message' && second.message.type === 'phase_checkpoint_commit_v1') {
			commitCount += 1;
		}
	}
	const elapsedMs = performance.now() - start;
	const submitCount = roomCount * 2;
	const stats = coordinator.getStats();

	return {
		label: 'phase_checkpoint (2-peer commit path)',
		roomCount,
		submitCount,
		commitCount,
		elapsedMs,
		submitsPerSec: (submitCount / elapsedMs) * 1_000,
		commitsPerSec: (commitCount / elapsedMs) * 1_000,
		activeRooms: stats.activeRooms,
	};
}

function benchPokerNotary(roomCount: number): ScenarioResult {
	const notary = createP2PPokerTimeNotary();
	let commitCount = 0;

	const start = performance.now();
	for (let index = 0; index < roomCount; index += 1) {
		const roomId = `bench-poker-${index}`;
		const proposal = pokerTurnProposal(index);
		const nowMs = index * 2;
		notary.submit({ roomId, peerId: 'peer-a', proposal, nowMs });
		const second = notary.submit({ roomId, peerId: 'peer-b', proposal, nowMs: nowMs + 1 });
		if (second.status === 'message' && second.message.type === 'poker_turn_notary_commit_v1') {
			commitCount += 1;
		}
	}
	const elapsedMs = performance.now() - start;
	const submitCount = roomCount * 2;

	return {
		label: 'poker_time_notary (2-peer commit path)',
		roomCount,
		submitCount,
		commitCount,
		elapsedMs,
		submitsPerSec: (submitCount / elapsedMs) * 1_000,
		commitsPerSec: (commitCount / elapsedMs) * 1_000,
		activeRooms: notary.getStats().activeRooms,
	};
}

function parseRoomCounts(argv: string[]): number[] {
	const counts: number[] = [];
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === '--rooms' && argv[index + 1]) {
			const raw = argv[index + 1].split(',').map((part) => part.trim()).filter(Boolean);
			for (const part of raw) {
				const value = Number(part);
				if (!Number.isSafeInteger(value) || value < 1) {
					throw new Error(`Invalid --rooms value: ${part}`);
				}
				counts.push(value);
			}
			index += 1;
			continue;
		}
		if (arg === '--help' || arg === '-h') {
			printHelp();
			process.exit(0);
		}
		if (arg === '--mode' && argv[index + 1]) {
			continue;
		}
		if (arg.startsWith('-')) {
			throw new Error(`Unknown flag: ${arg}`);
		}
	}

	return counts.length > 0 ? counts : [...DEFAULT_ROOM_COUNTS];
}

function parseMode(argv: string[]): BenchMode {
	for (let index = 0; index < argv.length; index += 1) {
		if (argv[index] !== '--mode' || !argv[index + 1]) continue;
		const value = argv[index + 1];
		if (value === 'checkpoint' || value === 'poker' || value === 'both') return value;
		throw new Error(`Invalid --mode (expected checkpoint|poker|both): ${value}`);
	}
	return 'both';
}

function printHelp(): void {
	console.log(`Usage: pnpm exec tsx scripts/benchP2PReferee.ts [options]

Options:
  --rooms <n,n,...>   Room counts to benchmark (default: 1000,5000)
  --mode <name>       checkpoint | poker | both (default: both)
  -h, --help          Show this help

This benchmark runs entirely in-process against fresh coordinator instances.
It does not open sockets, load the HTTP server, or touch production referee singletons.`);
}

function printScenario(result: ScenarioResult): void {
	if (result.commitCount !== result.roomCount || result.activeRooms !== result.roomCount) {
		throw new Error(`${result.label}: expected a commit and retained state for every room`);
	}
	console.log(`  ${result.label}`);
	console.log(`    rooms:              ${result.roomCount.toLocaleString()}`);
	console.log(`    submits:            ${result.submitCount.toLocaleString()}`);
	console.log(`    commits:            ${result.commitCount.toLocaleString()}`);
	console.log(`    elapsed:            ${result.elapsedMs.toFixed(2)} ms`);
	console.log(`    submit throughput:  ${Math.round(result.submitsPerSec).toLocaleString()} ops/s`);
	console.log(`    commit throughput:  ${Math.round(result.commitsPerSec).toLocaleString()} commits/s`);
	console.log(`    active rooms (end): ${result.activeRooms.toLocaleString()}`);
}

function main(): void {
	const argv = process.argv.slice(2);
	const roomCounts = parseRoomCounts(argv);
	const mode = parseMode(argv);

	console.log('Norse Mythos P2P referee — local in-process benchmark');
	console.log('Scope: fixture creation and coordinator submits (no WebSockets or network).');
	console.log(`Mode: ${mode}`);
	console.log('');

	const results: ScenarioResult[] = [];
	for (const roomCount of roomCounts) {
		console.log(`--- ${roomCount.toLocaleString()} rooms ---`);
		if (mode === 'checkpoint' || mode === 'both') {
			const checkpoint = benchPhaseCheckpoints(roomCount);
			results.push(checkpoint);
			printScenario(checkpoint);
		}
		if (mode === 'poker' || mode === 'both') {
			const poker = benchPokerNotary(roomCount);
			results.push(poker);
			printScenario(poker);
		}
		console.log('');
	}

	const totalElapsedMs = results.reduce((sum, row) => sum + row.elapsedMs, 0);
	const totalSubmits = results.reduce((sum, row) => sum + row.submitCount, 0);
	console.log('Summary');
	console.log(`  scenarios:          ${results.length}`);
	console.log(`  total submits:      ${totalSubmits.toLocaleString()}`);
	console.log(`  combined elapsed:   ${totalElapsedMs.toFixed(2)} ms`);
	console.log(`  file:               scripts/benchP2PReferee.ts`);
}

main();
