import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, it, vi } from 'vitest';
import type { ForgeMutation } from '../../shared/protocol-core/forgeMutation';
import * as chainState from './chainState';
import { serverStateAdapter } from './serverStateAdapter';

it('restarts with exactly one Forge debit and one terminal outcome', async () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ragnarok-forge-'));
	vi.stubEnv('RAGNAROK_CHAIN_STATE_FILE', path.join(dir, 'chain-state.json'));
	vi.stubEnv('RAGNAROK_INDEX_START_BLOCK', '1');
	const apply = serverStateAdapter.applyForgeMutation!;
	const commit = {
		trxId: 'forge-open', account: 'alice', rarity: 'common', commitBlock: 10,
		saltCommit: 'test-salt', debitAmount: 40, revealed: false, seasonId: 'test-season',
	};
	const movement = {
		account: commit.account, seasonId: commit.seasonId, amount: 40,
		blockNum: commit.commitBlock, timestamp: 1, sourceKey: commit.trxId,
		entryId: commit.trxId, trxId: commit.trxId,
	};
	const open: ForgeMutation = {
		kind: 'open', commit,
		movement: { ...movement, direction: 'debit', sourceType: 'forge_commit' },
	};
	const refund: ForgeMutation = {
		kind: 'refund', commit: { ...commit, revealed: true },
		movement: { ...movement, entryId: 'refund', direction: 'credit', sourceType: 'forge_refund' },
	};
	try {
		chainState.loadState();
		chainState.setEitrLedgerEntry({
			...movement, entryId: 'burn', direction: 'credit', sourceType: 'burn',
			balanceBefore: 0, balanceAfter: 40,
		});
		expect(await apply(open)).toEqual({ status: 'applied' });
		chainState.saveState();
		chainState.loadState();
		expect(await apply(open)).toEqual({ status: 'ignored' });
		expect(await apply(refund)).toEqual({ status: 'applied' });
		chainState.saveState();
		chainState.loadState();
		expect(await apply(refund)).toEqual({ status: 'ignored' });
		expect(chainState.getForgeCommit(commit.trxId)).toMatchObject({ revealed: true, seasonId: commit.seasonId });
		expect(chainState.getEitrLedgerEntries({ account: commit.account, seasonId: commit.seasonId })).toHaveLength(3);
	} finally {
		vi.unstubAllEnvs();
		fs.rmSync(dir, { recursive: true, force: true });
	}
});
