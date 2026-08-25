import type { Logger } from 'vite';

/** Keep Vite/HMR diagnostics visible without terminating the owning dev server. */
export function createNonFatalViteLogger(baseLogger: Logger): Logger {
	return {
		...baseLogger,
		error: (message, options) => {
			baseLogger.error(message, options);
		},
	};
}
