import { afterEach, describe, expect, it, vi } from 'vitest';
import { ARENA_VFX_TARGETS, type QueryRoot } from '@/game/combat/arenaVfxTargets';
import { resolveArenaEffectPoint } from './arenaEffectAnchors';

type FakeElement = {
	readonly rect: { left: number; top: number; width: number; height: number };
	readonly querySelector: (selector: string) => FakeElement | null;
	readonly getBoundingClientRect: () => DOMRect;
};

function fakeElement(
	rect: FakeElement['rect'],
	children: Record<string, FakeElement | null> = {},
): FakeElement {
	return {
		rect,
	querySelector: selector => children[selector] ?? null,
	getBoundingClientRect: () => rect as DOMRect,
	};
}

describe('arena effect anchors', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('routes an empty battlefield receiver to the defending hero surface', () => {
		const heroSurface = fakeElement({ left: 800, top: 80, width: 220, height: 320 });
		const hero = fakeElement(
			{ left: 780, top: 50, width: 260, height: 380 },
			{ '.hero-card-wrapper': heroSurface },
		);
		const emptyField = fakeElement({ left: 720, top: 440, width: 480, height: 160 });
		const root = {
			querySelector: (selector: string) => {
				if (selector === `[data-vfx-target="${ARENA_VFX_TARGETS.opponentMinion}"]`) return emptyField;
				if (selector === `[data-vfx-target="${ARENA_VFX_TARGETS.opponentHero}"]`) return hero;
				return null;
			},
			querySelectorAll: () => [],
		} as unknown as QueryRoot;

		vi.stubGlobal('window', {});
		const point = resolveArenaEffectPoint(
			{ entityId: 'opponent-field', anchor: 'board-slot' },
			root,
		);

		expect(point).toEqual({ x: 910, y: 240 });
	});
});
