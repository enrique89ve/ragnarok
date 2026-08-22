import type { RuneSourceType } from '@shared/protocol-core/types';

export const SOURCE_LABELS: Record<RuneSourceType, string> = {
	p2p_ranked: 'Ranked reward',
	campaign_first_clear: 'Campaign clear',
	reward_claim: 'Reward claim',
	daily_quest_claim: 'Daily quest',
	rune_exchange: 'Pack exchange',
};

export function formatNumber(value: number): string {
	return value.toLocaleString('en-US');
}

export function formatBlock(blockNum: number): string {
	if (blockNum <= 0) return 'No activity';
	return `#${formatNumber(blockNum)}`;
}

export function formatTimestamp(timestamp: number): string {
	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	}).format(new Date(timestamp));
}

export function compactId(value: string): string {
	if (value.length <= 22) return value;
	return `${value.slice(0, 12)}...${value.slice(-7)}`;
}
