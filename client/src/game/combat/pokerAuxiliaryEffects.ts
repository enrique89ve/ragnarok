import { ALL_NORSE_HEROES } from '../data/norseHeroes';
import type { PokerAuxiliaryAction } from '../core/commands';
import { useUnifiedCombatStore } from '../stores/unifiedCombatStore';

type ActionActor = 'player' | 'opponent';

function otherActor(actor: ActionActor): ActionActor {
	return actor === 'player' ? 'opponent' : 'player';
}

/**
 * Apply the Poker-slot portion of an already committed auxiliary command.
 * Card/battlefield state is resolved by `applyGameCommand`; this adapter only
 * mirrors the hero HP/armor/buff effects that live in the Poker combat store.
 */
export function applyPokerAuxiliaryEffects(
	command: PokerAuxiliaryAction,
	actor: ActionActor,
): void {
	if (command.type === 'frontline_attack') return;

	const combat = useUnifiedCombatStore.getState();
	if (!combat.pokerCombatState) return;

	const hero = ALL_NORSE_HEROES[command.norseHeroId];
	if (!hero) return;

	if (command.type === 'weapon_upgrade') {
		applyWeaponImmediateEffect(hero.weaponUpgrade.immediateEffect, actor);
		return;
	}

	const power = hero.heroPower;
	const effectType = power.effectType as string;
	const effectValue = power.value ?? 2;
	const secondaryValue = power.secondaryValue ?? 0;
	const target = command.targetType === 'hero' && command.targetId
		? resolveTargetOwner(command.targetId, actor)
		: null;

	if (target) {
		switch (effectType) {
			case 'damage_single':
			case 'damage':
				combat.applyDirectDamage(target, effectValue, `${hero.name}'s ${power.name}`);
				return;
			case 'heal_single':
			case 'heal':
				if (target === actor) combat.healPlayerHero(effectValue);
				else combat.healOpponentHero(effectValue);
				return;
			case 'damage_and_heal':
				if (target === otherActor(actor)) {
					combat.applyDirectDamage(target, effectValue, `${hero.name}'s ${power.name}`);
					if (actor === 'player') combat.healPlayerHero(secondaryValue || effectValue);
					else combat.healOpponentHero(secondaryValue || effectValue);
				}
				return;
			default:
				return;
		}
	}

	switch (effectType) {
		case 'gain_armor':
			if (actor === 'player') combat.addPlayerArmor(power.armorValue ?? effectValue);
			else combat.addOpponentArmor(power.armorValue ?? effectValue);
			return;
		case 'heal_aoe':
			if (actor === 'player') combat.healPlayerHero(effectValue);
			else combat.healOpponentHero(effectValue);
			return;
		case 'damage_and_heal':
			combat.applyDirectDamage(otherActor(actor), effectValue, `${hero.name}'s ${power.name}`);
			if (actor === 'player') combat.healPlayerHero(secondaryValue || effectValue);
			else combat.healOpponentHero(secondaryValue || effectValue);
			return;
		case 'self_damage_and_summon':
			combat.applyDirectDamage(actor, power.value ?? 0, `${hero.name}'s ${power.name}`);
			return;
		case 'draw_and_damage':
			combat.applyDirectDamage(actor, power.selfDamage ?? power.value ?? 0, `${hero.name}'s ${power.name}`);
			return;
		case 'buff_hero':
			if (actor === 'player') combat.setPlayerHeroBuffs({ attack: effectValue, armor: power.armorValue ?? 0 });
			else combat.setOpponentHeroBuffs({ attack: effectValue, armor: power.armorValue ?? 0 });
			return;
		case 'buff_single':
			if (secondaryValue > 0) {
				if (actor === 'player') combat.healPlayerHero(secondaryValue);
				else combat.healOpponentHero(secondaryValue);
			}
			return;
		default:
			return;
	}
}

function resolveTargetOwner(targetId: string, actor: ActionActor): ActionActor | null {
	if (targetId === 'player-hero') return actor;
	if (targetId === 'opponent-hero') return otherActor(actor);
	return null;
}

function applyWeaponImmediateEffect(
	effect: { readonly type: string; readonly value?: number; readonly armorValue?: number },
	actor: ActionActor,
): void {
	const combat = useUnifiedCombatStore.getState();
	const value = effect.value ?? 0;
	if (effect.type === 'damage' && value > 0) {
		combat.applyDirectDamage(otherActor(actor), value, 'Weapon upgrade');
	}
	if (effect.type === 'heal' && value > 0) {
		if (actor === 'player') combat.healPlayerHero(value);
		else combat.healOpponentHero(value);
	}
	if ((effect.type === 'armor' || effect.type === 'gain_armor') && value > 0) {
		if (actor === 'player') combat.addPlayerArmor(value);
		else combat.addOpponentArmor(value);
	}
}
