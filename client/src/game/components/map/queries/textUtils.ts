export function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

export function normalizeText(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase();
}

export function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function matchesTerm(searchText: string, term: string): boolean {
	const normalizedTerm = normalizeText(term);
	if (/^[a-z0-9]+$/.test(normalizedTerm)) {
		return new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedTerm)}([^a-z0-9]|$)`).test(searchText);
	}

	return searchText.includes(normalizedTerm);
}

export function titleCase(value: string | undefined): string {
	if (!value) return 'Neutral';
	return value
		.split(/[_\s-]+/)
		.filter(Boolean)
		.map(part => `${part[0]?.toUpperCase() ?? ''}${part.slice(1).toLowerCase()}`)
		.join(' ');
}
