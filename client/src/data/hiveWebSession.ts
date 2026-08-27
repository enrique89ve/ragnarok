import type { HiveLoginProof } from './HiveAuth';

function getApiBase(): string {
	return import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
}

export async function establishHiveWebSession(proof: HiveLoginProof): Promise<boolean> {
	try {
		const response = await fetch(`${getApiBase()}/api/session/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify(proof),
		});
		return response.ok;
	} catch {
		return false;
	}
}

export async function closeHiveWebSession(): Promise<void> {
	await fetch(`${getApiBase()}/api/session/logout`, {
		method: 'POST',
		credentials: 'include',
	}).catch(() => { /* best effort */ });
}
