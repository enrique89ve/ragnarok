interface KeywordCarrier {
	card: { keywords?: string[]; [key: string]: any };
	instanceKeywords?: string[];
}

export function getKeywords(instance: KeywordCarrier): string[] {
	return instance.instanceKeywords ?? instance.card.keywords ?? [];
}

export function hasKeyword(instance: KeywordCarrier, keyword: string): boolean {
	const kw = keyword.toLowerCase();
	return getKeywords(instance).some(k => k.toLowerCase() === kw);
}

export function addKeyword(instance: KeywordCarrier, keyword: string): void {
	if (!instance.instanceKeywords) {
		instance.instanceKeywords = [...(instance.card.keywords || [])];
	}
	if (!instance.instanceKeywords.some(k => k.toLowerCase() === keyword.toLowerCase())) {
		instance.instanceKeywords.push(keyword);
	}
}

export function removeKeyword(instance: KeywordCarrier, keyword: string): void {
	if (!instance.instanceKeywords) {
		instance.instanceKeywords = [...(instance.card.keywords || [])];
	}
	const kw = keyword.toLowerCase();
	instance.instanceKeywords = instance.instanceKeywords.filter(k => k.toLowerCase() !== kw);
}

export function clearKeywords(instance: KeywordCarrier): void {
	instance.instanceKeywords = [];
}

export function setKeywords(instance: KeywordCarrier, keywords: string[]): void {
	instance.instanceKeywords = [...keywords];
}
