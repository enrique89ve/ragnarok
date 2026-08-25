import { createLogger } from 'vite';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNonFatalViteLogger } from './viteLogger';

afterEach(() => vi.restoreAllMocks());

describe('non-fatal Vite logger', () => {
	it('forwards Vite and HMR errors without terminating the server process', () => {
		const baseLogger = createLogger('silent');
		const logError = vi.spyOn(baseLogger, 'error').mockImplementation(() => undefined);
		const exit = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit must not be called by the Vite logger');
		});
		const logger = createNonFatalViteLogger(baseLogger);
		const error = new Error('client transform failed');

		logger.error('client transform failed', { error, environment: 'client' });

		expect(logError).toHaveBeenCalledOnce();
		expect(logError).toHaveBeenCalledWith('client transform failed', { error, environment: 'client' });
		expect(exit).not.toHaveBeenCalled();
	});
});
