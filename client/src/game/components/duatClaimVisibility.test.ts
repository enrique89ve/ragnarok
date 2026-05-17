import { describe, expect, it } from 'vitest';
import { getDuatPopupVisibility } from './duatClaimVisibility';

const base = {
	username: 'alice',
	eligibilityLoaded: true,
	currentUserEntry: { claimed: false },
	dismissed: false,
	claimPromptOpen: false,
	pendingClaimTrxId: null,
	starterClaimed: true,
};

describe('getDuatPopupVisibility', () => {
	it('does not auto-open DUAT just because the starter claim completed', () => {
		expect(getDuatPopupVisibility(base)).toEqual({
			visible: false,
			statusVisible: false,
		});
	});

	it('opens the claim prompt only after an explicit request', () => {
		expect(getDuatPopupVisibility({
			...base,
			claimPromptOpen: true,
		})).toEqual({
			visible: true,
			statusVisible: false,
		});
	});

	it('keeps pending and confirmed status scoped to the explicit prompt', () => {
		expect(getDuatPopupVisibility({
			...base,
			pendingClaimTrxId: 'tx-1',
		}).statusVisible).toBe(false);

		expect(getDuatPopupVisibility({
			...base,
			claimPromptOpen: true,
			pendingClaimTrxId: 'tx-1',
		}).statusVisible).toBe(true);

		expect(getDuatPopupVisibility({
			...base,
			claimPromptOpen: true,
			currentUserEntry: { claimed: true },
			pendingClaimTrxId: 'tx-1',
		}).statusVisible).toBe(true);
	});

	it('does not show during the starter gate even when explicitly requested', () => {
		expect(getDuatPopupVisibility({
			...base,
			claimPromptOpen: true,
			starterClaimed: false,
		})).toEqual({
			visible: false,
			statusVisible: false,
		});
	});
});
