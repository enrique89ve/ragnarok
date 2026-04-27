// `import.meta.env` is Vite-specific; defensively fall back when running
// under bare Node (tsx scripts, tests outside the Vite pipeline).
const BASE = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';

export function assetPath(path: string): string {
	const clean = path.startsWith('/') ? path.slice(1) : path;
	return `${BASE}${clean}`;
}
