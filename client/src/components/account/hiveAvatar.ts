export function normalizeHiveUsername(username: string): string {
	return username.trim().toLowerCase().replace(/^@/, '');
}

export function getHiveAvatarUrl(username: string): string {
	return `https://images.hive.blog/u/${encodeURIComponent(normalizeHiveUsername(username))}/avatar`;
}
