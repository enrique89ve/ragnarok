import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
	const mem = new Map<string, string>();
	(globalThis as { localStorage?: unknown }).localStorage = {
		getItem: (key: string) => mem.get(key) ?? null,
		setItem: (key: string, value: string) => {
			mem.set(key, value);
		},
		removeItem: (key: string) => {
			mem.delete(key);
		},
		clear: () => {
			mem.clear();
		},
		key: () => null,
		length: 0,
	};
});

import {
	appliedGameCommand,
	ignoredGameCommand,
	rejectedGameCommand,
} from '../../../../core/commands';
import { initializeGame } from '../../../../utils/gameUtils';
import {
	P2P_COMMAND_STATUS_REJECT_REASON,
	settleRemoteCommand,
} from './remoteCommandSettlement';

describe('useWireSync global dependency boundary', () => {
	it('does not reach the combat store through globalThis', () => {
		const sourcePath = join(dirname(fileURLToPath(import.meta.url)), 'useWireSync.ts');
		const source = readFileSync(sourcePath, 'utf8');

		expect(source).not.toContain('__ragnarokCombatStore');
		expect(source).not.toContain('globalThis.__ragnarokCombatStore');
	});
});

describe('settleRemoteCommand', () => {
	const baseState = initializeGame();

	it('runs only the applied settlement for an applied result', () => {
		const onApplied = vi.fn();
		const onUnapplied = vi.fn();

		settleRemoteCommand(appliedGameCommand(baseState, []), { onApplied, onUnapplied });

		expect(onApplied).toHaveBeenCalledTimes(1);
		expect(onUnapplied).not.toHaveBeenCalled();
	});

	it.each([
		['rejected', rejectedGameCommand(baseState, 'not player turn')],
		['ignored', ignoredGameCommand(baseState, 'card not found in hand')],
	] as const)('rejects an unapplied %s result without settling it', (_status, result) => {
		const onApplied = vi.fn();
		const onUnapplied = vi.fn();

		settleRemoteCommand(result, { onApplied, onUnapplied });

		expect(onApplied).not.toHaveBeenCalled();
		expect(onUnapplied).toHaveBeenCalledTimes(1);
		expect(onUnapplied).toHaveBeenCalledWith(P2P_COMMAND_STATUS_REJECT_REASON);
	});

	it('does not expose the engine rejection reason', () => {
		const onUnapplied = vi.fn();

		settleRemoteCommand(rejectedGameCommand(baseState, 'hero power already used'), {
			onApplied: vi.fn(),
			onUnapplied,
		});

		expect(onUnapplied).toHaveBeenCalledWith('p2p_command_status');
		expect(onUnapplied).not.toHaveBeenCalledWith('hero power already used');
	});
});
