import { describe, expect, it, vi } from 'vitest';
import { settleRemotePokerAction } from './pokerP2PActionCommit';

describe('settleRemotePokerAction', () => {
	it('commits all post-engine effects only after applied', () => {
		const onApplied = vi.fn();
		const onRejected = vi.fn();

		settleRemotePokerAction({ status: 'applied' }, { onApplied, onRejected });

		expect(onApplied).toHaveBeenCalledTimes(1);
		expect(onRejected).not.toHaveBeenCalled();
	});

	it('does not invoke commit effects for a rejected engine action', () => {
		const onApplied = vi.fn();
		const onRejected = vi.fn();

		settleRemotePokerAction({ status: 'rejected', reason: 'engine_rejected' }, { onApplied, onRejected });

		expect(onApplied).not.toHaveBeenCalled();
		expect(onRejected).toHaveBeenCalledWith('engine_rejected');
	});
});
