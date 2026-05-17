import { describe, expect, it } from 'vitest';

import { saveToHive, restoreFromHive } from './saveStateManager';

describe('saveStateManager Hive save boundary', () => {
	it('does not broadcast portable save snapshots to Hive', async () => {
		await expect(saveToHive()).resolves.toMatchObject({
			success: false,
			error: expect.stringContaining('canonical protocol ops'),
		});
	});

	it('does not restore legacy save_state snapshots from the protocol namespace', async () => {
		await expect(restoreFromHive()).resolves.toMatchObject({
			success: false,
			error: expect.stringContaining('canonical protocol ops'),
		});
	});
});
