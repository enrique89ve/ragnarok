/**
 * Vite build-mode flags. Presentation code must call these helpers
 * instead of reading `import.meta.env.DEV` / `PROD` in TSX.
 *
 * The only allowed reader of those flags is this module.
 */

export function isDevBuild(): boolean {
	return import.meta.env.DEV === true;
}

export function isProdBuild(): boolean {
	return import.meta.env.PROD === true;
}
