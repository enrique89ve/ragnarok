import { GameState, CardInstance } from '../../types';
import { hasKeyword } from '../cards/keywordUtils';

interface AuraBuff {
	attack: number;
	health: number;
}

function getAuraFromCard(card: CardInstance): any | null {
	const cardData = card.card as any;
	return cardData.aura || cardData.auraEffect || null;
}

function matchesAuraCondition(
	minion: CardInstance,
	condition: string | { keyword?: string; element?: string; race?: string } | undefined
): boolean {
	if (!condition) return true;
	if (typeof condition === 'string') {
		const race = ((minion.card as any).race || '').toLowerCase();
		return race === condition.toLowerCase();
	}
	if (condition.keyword) {
		return hasKeyword(minion, condition.keyword);
	}
	if (condition.element) {
		return ((minion.card as any).element || '').toLowerCase() === condition.element.toLowerCase();
	}
	if (condition.race) {
		return ((minion.card as any).race || '').toLowerCase() === condition.race.toLowerCase();
	}
	return true;
}

function matchesTargetType(
	source: CardInstance,
	target: CardInstance,
	targetType: string | undefined,
	sourceSide: 'player' | 'opponent',
	targetSide: 'player' | 'opponent',
	battlefield: CardInstance[]
): boolean {
	if (!targetType) return sourceSide === targetSide && source.instanceId !== target.instanceId;

	const isFriendly = sourceSide === targetSide;
	const isOther = source.instanceId !== target.instanceId;
	const targetRace = ((target.card as any).race || '').toLowerCase();

	switch (targetType) {
		case 'other_friendly_minions':
			return isFriendly && isOther;
		case 'all_friendly_minions':
		case 'friendly':
			return isFriendly && isOther;
		case 'friendly_charge_minions':
			return isFriendly && isOther && hasKeyword(target, 'charge');
		case 'friendly_undead':
			return isFriendly && isOther && targetRace === 'undead';
		case 'enemy_minions':
			return !isFriendly;
		case 'adjacent_minions': {
			if (!isFriendly) return false;
			const srcIdx = battlefield.findIndex(m => m.instanceId === source.instanceId);
			const tgtIdx = battlefield.findIndex(m => m.instanceId === target.instanceId);
			return Math.abs(srcIdx - tgtIdx) === 1;
		}
		default:
			return isFriendly && isOther;
	}
}

function computeSingleAuraBuff(
	source: CardInstance,
	target: CardInstance,
	aura: any,
	sourceSide: 'player' | 'opponent',
	targetSide: 'player' | 'opponent',
	battlefield: CardInstance[]
): AuraBuff {
	const t = aura.type as string;
	const val = aura.value || 0;
	const tgt = aura.targetType || aura.target;
	const cond = aura.condition;

	if (t === 'compound' && Array.isArray(aura.effects)) {
		let total: AuraBuff = { attack: 0, health: 0 };
		for (const sub of aura.effects) {
			const subBuff = computeSingleAuraBuff(source, target, sub, sourceSide, targetSide, battlefield);
			total = { attack: total.attack + subBuff.attack, health: total.health + subBuff.health };
		}
		return total;
	}

	if (t === 'self_buff_per_ally') {
		if (source.instanceId !== target.instanceId) return { attack: 0, health: 0 };
		let count = 0;
		for (const m of battlefield) {
			if (m.instanceId === source.instanceId) continue;
			if (matchesAuraCondition(m, cond)) count++;
		}
		return {
			attack: (aura.buffAttack || 0) * count,
			health: (aura.buffHealth || 0) * count
		};
	}

	if (!matchesTargetType(source, target, tgt, sourceSide, targetSide, battlefield)) {
		return { attack: 0, health: 0 };
	}

	if (cond && !matchesAuraCondition(target, cond)) {
		return { attack: 0, health: 0 };
	}

	switch (t) {
		case 'attack_buff':
		case 'buff_attack':
			return { attack: val, health: 0 };
		case 'attack_debuff':
			return { attack: val, health: 0 };
		case 'buff_friendly':
			return { attack: aura.buffAttack || 0, health: aura.buffHealth || 0 };
		default:
			return { attack: 0, health: 0 };
	}
}

export function recalculateAuras(state: GameState): GameState {
	for (const side of ['player', 'opponent'] as const) {
		const bf = state.players[side].battlefield;
		for (const minion of bf) {
			const prevAtkBuff = minion.auraBuffAttack || 0;
			const prevHpBuff = minion.auraBuffHealth || 0;
			const baseAtk = (minion.currentAttack ?? (minion.card as any).attack ?? 0) - prevAtkBuff;
			const baseHp = (minion.currentHealth ?? (minion.card as any).health ?? 0) - prevHpBuff;
			minion.currentAttack = baseAtk;
			minion.currentHealth = baseHp;
			minion.auraBuffAttack = 0;
			minion.auraBuffHealth = 0;
		}
	}

	for (const sourceSide of ['player', 'opponent'] as const) {
		const sourceBf = state.players[sourceSide].battlefield;
		for (const source of sourceBf) {
			if (source.silenced || source.isSilenced) continue;
			const aura = getAuraFromCard(source);
			if (!aura) continue;

			for (const targetSide of ['player', 'opponent'] as const) {
				const targetBf = state.players[targetSide].battlefield;
				for (const target of targetBf) {
					const friendlyBf = state.players[sourceSide].battlefield;
					const buff = computeSingleAuraBuff(source, target, aura, sourceSide, targetSide, friendlyBf);
					if (buff.attack !== 0 || buff.health !== 0) {
						target.auraBuffAttack = (target.auraBuffAttack || 0) + buff.attack;
						target.auraBuffHealth = (target.auraBuffHealth || 0) + buff.health;
						target.currentAttack = (target.currentAttack ?? 0) + buff.attack;
						target.currentHealth = (target.currentHealth ?? 0) + buff.health;
					}
				}
			}
		}
	}

	return state;
}
