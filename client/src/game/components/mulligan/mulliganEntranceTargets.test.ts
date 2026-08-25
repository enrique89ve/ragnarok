import { describe, expect, it, vi } from 'vitest';
import { collectMountedMulliganCardTargets } from './mulliganEntranceTargets';

describe('collectMountedMulliganCardTargets', () => {
	it('keeps temporarily missing refs out of the GSAP fromTo target list', () => {
		const mountedNode = { id: 'mounted-card-node' };
		const refs: Record<string, typeof mountedNode | null | undefined> = {
			mounted: mountedNode,
			pending: null,
		};
		const fromTo = vi.fn();

		const targets = collectMountedMulliganCardTargets(
			['mounted', 'pending', 'not-mounted-yet'],
			refs,
		);
		fromTo(targets, { autoAlpha: 0 }, { autoAlpha: 1 });

		expect(refs['not-mounted-yet']).toBeUndefined();
		expect(targets).toEqual([mountedNode]);
		expect(fromTo).toHaveBeenCalledWith(
			[mountedNode],
			{ autoAlpha: 0 },
			{ autoAlpha: 1 },
		);
	});
});
