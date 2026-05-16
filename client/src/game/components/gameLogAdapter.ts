import type { GameLogEntry } from '../stores/gameLogStore';

export type BattleLogTone = 'player' | 'opponent' | 'danger' | 'heal' | 'neutral';
export type BattleLogIconName =
	| 'card'
	| 'swords'
	| 'zap'
	| 'sparkles'
	| 'scroll'
	| 'skull'
	| 'heart'
	| 'shield'
	| 'repeat'
	| 'flame'
	| 'clock'
	| 'radio'
	| 'dot';

export interface BattleLogItem {
	readonly id: string;
	readonly turnLabel: string;
	readonly actorLabel: string;
	readonly title: string;
	readonly message: string;
	readonly meta: readonly string[];
	readonly amountLabel: string | null;
	readonly tone: BattleLogTone;
	readonly icon: BattleLogIconName;
}

export interface BattleLogViewModel {
	readonly total: number;
	readonly latest: BattleLogItem | null;
	readonly dockItems: readonly BattleLogItem[];
	readonly panelItems: readonly BattleLogItem[];
}

const EVENT_TITLES: Record<GameLogEntry['type'], string> = {
	play_card: 'Card played',
	attack: 'Attack',
	hero_power: 'Hero power',
	spell: 'Spell cast',
	draw: 'Card drawn',
	death: 'Casualty',
	damage: 'Damage',
	heal: 'Healing',
	secret: 'Secret',
	end_turn: 'Turn shift',
	fatigue: 'Fatigue',
	battlecry: 'Battlecry',
	deathrattle: 'Deathrattle',
	poker_turn: 'Poker decision',
	poker_phase: 'Poker phase',
	p2p_status: 'P2P status',
};

const EVENT_ICONS: Record<GameLogEntry['type'], BattleLogIconName> = {
	play_card: 'card',
	attack: 'swords',
	hero_power: 'zap',
	spell: 'sparkles',
	draw: 'scroll',
	death: 'skull',
	damage: 'flame',
	heal: 'heart',
	secret: 'shield',
	end_turn: 'repeat',
	fatigue: 'flame',
	battlecry: 'zap',
	deathrattle: 'skull',
	poker_turn: 'clock',
	poker_phase: 'radio',
	p2p_status: 'repeat',
};

function getActorLabel(actor: GameLogEntry['actor']): string {
	if (actor === 'system') return 'System';
	return actor === 'player' ? 'You' : 'Enemy';
}

function getTone(entry: GameLogEntry): BattleLogTone {
	if (entry.actor === 'system' || entry.type === 'poker_phase' || entry.type === 'p2p_status') return 'neutral';
	if (entry.type === 'damage' || entry.type === 'fatigue' || entry.type === 'death') return 'danger';
	if (entry.type === 'heal') return 'heal';
	return entry.actor === 'player' ? 'player' : 'opponent';
}

function getAmountLabel(entry: GameLogEntry): string | null {
	const amount = entry.details?.amount;
	if (amount === undefined) return null;
	if (entry.type === 'heal') return `+${amount}`;
	if (entry.type === 'damage' || entry.type === 'fatigue') return `-${amount}`;
	return String(amount);
}

function getMeta(entry: GameLogEntry): string[] {
	const meta = [getActorLabel(entry.actor)];
	if (entry.details?.cardName) meta.push(entry.details.cardName);
	if (entry.details?.targetName) meta.push(`Target: ${entry.details.targetName}`);
	if (entry.details?.phaseLabel) meta.push(entry.details.phaseLabel);
	if (entry.details?.statusLabel) meta.push(entry.details.statusLabel);
	if (entry.details?.turnId) meta.push(`#${entry.details.turnId.slice(-6)}`);
	return meta;
}

export function adaptGameLogEntry(entry: GameLogEntry): BattleLogItem {
	return {
		id: entry.id,
		turnLabel: `T${entry.turn}`,
		actorLabel: getActorLabel(entry.actor),
		title: EVENT_TITLES[entry.type],
		message: entry.message,
		meta: getMeta(entry),
		amountLabel: getAmountLabel(entry),
		tone: getTone(entry),
		icon: EVENT_ICONS[entry.type] ?? 'dot',
	};
}

export function buildBattleLogViewModel(
	entries: readonly GameLogEntry[],
	options: { readonly dockLimit?: number; readonly panelLimit?: number } = {},
): BattleLogViewModel {
	const dockLimit = options.dockLimit ?? 3;
	const panelLimit = options.panelLimit ?? 40;
	const adapted = entries.map(adaptGameLogEntry);
	const panelItems = adapted.slice(-panelLimit);

	return {
		total: entries.length,
		latest: adapted.at(-1) ?? null,
		dockItems: adapted.slice(-dockLimit).reverse(),
		panelItems,
	};
}
