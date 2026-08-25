import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebGLRenderer } from './atlasPixiRuntime';

describe('atlasPixiRuntime strict CSP boundary', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('constructs the Pixi renderer when dynamic Function evaluation is blocked', () => {
		vi.stubGlobal('Function', function blockedDynamicFunction(): never {
			throw new EvalError('strict CSP blocked dynamic code evaluation');
		});

		expect(() => new WebGLRenderer()).not.toThrow();
	});
});
