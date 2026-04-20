import { GameState, GameLogEvent, CardInstance } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { dealDamage } from './effects/damageUtils';
import { MAX_HAND_SIZE, MAX_BATTLEFIELD_SIZE } from '../constants/gameConstants';

function getArtifactEffect(state: GameState, playerType: 'player' | 'opponent'): any {
	const player = state.players[playerType];
	if (!player.artifact) return null;
	return (player.artifact.card as any).artifactEffect || null;
}

function getArtifactName(state: GameState, playerType: 'player' | 'opponent'): string {
	return state.players[playerType].artifact?.card.name || 'Artifact';
}

function logArtifactTrigger(state: GameState, playerType: 'player' | 'opponent', text: string): void {
	state.gameLog.push({
		id: uuidv4(),
		type: 'artifact_trigger',
		turn: state.turnNumber,
		timestamp: Date.now(),
		player: playerType,
		text,
		cardId: state.players[playerType].artifact?.instanceId
	} as GameLogEvent);
}

function opponent(p: 'player' | 'opponent'): 'player' | 'opponent' {
	return p === 'player' ? 'opponent' : 'player';
}

function summonToken(
	state: GameState,
	playerType: 'player' | 'opponent',
	token: { name: string; attack: number; health: number; keywords?: string[] },
	tokenId = 9092
): CardInstance | null {
	const bf = state.players[playerType].battlefield;
	if (bf.length >= MAX_BATTLEFIELD_SIZE) return null;
	const kw = token.keywords || [];
	const inst = {
		instanceId: uuidv4(),
		card: {
			id: tokenId,
			name: token.name,
			type: 'minion' as const,
			manaCost: 0,
			attack: token.attack,
			health: token.health,
			description: `Summoned by artifact.`,
			rarity: 'token' as const,
			heroClass: 'neutral',
			race: 'none',
			keywords: kw
		},
		currentAttack: token.attack,
		currentHealth: token.health,
		canAttack: false,
		isPlayed: true,
		isSummoningSick: true,
		attacksPerformed: 0,
		isPlayerOwned: playerType === 'player',
		isTaunt: kw.includes('taunt'),
		hasLifesteal: kw.includes('lifesteal'),
		hasDivineShield: kw.includes('divine_shield'),
		hasRush: kw.includes('rush')
	};
	bf.push(inst as any);
	return inst as any;
}

function getRandomMinion(battlefield: CardInstance[]): CardInstance | null {
	const alive = battlefield.filter(m => (m.currentHealth ?? 0) > 0);
	if (alive.length === 0) return null;
	return alive[Math.floor(Math.random() * alive.length)];
}

// ═══════════════════════════════════════════════════════════════
// SPELL CAST TRIGGER
// ═══════════════════════════════════════════════════════════════

export function processArtifactOnSpellCast(
	state: GameState,
	casterType: 'player' | 'opponent'
): GameState {
	const effect = getArtifactEffect(state, casterType);
	if (!effect) return state;
	const name = getArtifactName(state, casterType);
	const artifactState = state.players[casterType].artifactState;
	const opponentType = opponent(casterType);

	// Track spells cast this turn
	if (artifactState) {
		artifactState.spellsCastThisTurn = (artifactState.spellsCastThisTurn || 0) + 1;
	}

	// AoE damage on spell cast (Gungnir, etc.)
	if (effect.onSpellCast?.damage && effect.onSpellCast?.targetType === 'all_enemy_minions') {
		const dmg = effect.onSpellCast.damage;
		const enemies = state.players[opponentType].battlefield;
		for (const minion of enemies) {
			if (minion.currentHealth && minion.currentHealth > 0) {
				minion.currentHealth -= dmg;
			}
		}
		logArtifactTrigger(state, casterType, `${name} deals ${dmg} damage to all enemy minions`);
	}

	// Damage random enemy on spell cast (Hecate)
	if (effect.onSpellCast?.damageRandomEnemy) {
		const dmg = effect.onSpellCast.damageRandomEnemy;
		const target = getRandomMinion(state.players[opponentType].battlefield);
		if (target) {
			target.currentHealth = (target.currentHealth ?? 0) - dmg;
			logArtifactTrigger(state, casterType, `${name} deals ${dmg} damage to ${target.card.name}`);
		}
	}

	// Bounce random enemy on spell cast
	if (effect.onSpellCast?.bounceRandomEnemy) {
		const opp = state.players[opponentType];
		const target = getRandomMinion(opp.battlefield);
		if (target && opp.hand.length < MAX_HAND_SIZE) {
			opp.battlefield = opp.battlefield.filter(m => m.instanceId !== target.instanceId);
			opp.hand.push(target);
			logArtifactTrigger(state, casterType, `${name} bounces ${target.card.name} to opponent's hand`);
		}
	}

	// Shuffle enemy minion into deck on spell cast (Fujin — once per turn)
	if (effect.onSpellCast?.shuffleEnemyMinion) {
		const oncePT = effect.onSpellCast.oncePerTurn;
		const canTrigger = !oncePT || !artifactState?.oncePerTurn?.['shuffleEnemy'];
		if (canTrigger) {
			const opp = state.players[opponentType];
			const target = getRandomMinion(opp.battlefield);
			if (target) {
				opp.battlefield = opp.battlefield.filter(m => m.instanceId !== target.instanceId);
				opp.deck.push(target.card);
				if (artifactState && oncePT) {
					if (!artifactState.oncePerTurn) artifactState.oncePerTurn = {};
					artifactState.oncePerTurn['shuffleEnemy'] = true;
				}
				logArtifactTrigger(state, casterType, `${name} shuffles ${target.card.name} into opponent's deck`);
			}
		}
	}

	// Buff random friendly minion on spell cast (Seidr Staff, Thyrsus)
	if (effect.onSpellCast?.buffRandomMinion) {
		const buff = effect.onSpellCast.buffRandomMinion;
		const target = getRandomMinion(state.players[casterType].battlefield);
		if (target) {
			if (buff.attack) target.currentAttack = (target.currentAttack ?? 0) + buff.attack;
			if (buff.health) target.currentHealth = (target.currentHealth ?? 0) + buff.health;
			logArtifactTrigger(state, casterType, `${name} buffs ${target.card.name} +${buff.attack || 0}/+${buff.health || 0}`);
		}
	}

	// Add random spell to hand (Harp of Bragi)
	if (effect.onSpellCast?.addRandomSpell) {
		logArtifactTrigger(state, casterType, `${name} adds a random spell to hand`);
	}

	// Discover spell (Odrerir)
	if (effect.onSpellCast?.discoverSpell) {
		logArtifactTrigger(state, casterType, `${name} discovers a spell`);
	}

	// First spell doubles (Master Bolt) — track first spell cast
	if (effect.firstSpellDouble) {
		if (artifactState && !artifactState.firstSpellCastThisTurn) {
			artifactState.firstSpellCastThisTurn = true;
		}
	}

	// Spell play: hero attack buff this turn (Eldrin)
	if (effect.onSpellPlay?.heroAttackThisTurn) {
		logArtifactTrigger(state, casterType, `${name} gives hero +${effect.onSpellPlay.heroAttackThisTurn} Attack this turn`);
	}

	// Spell play: buff all minion health (Apollo)
	if (effect.onSpellPlay?.buffAllMinionHealth) {
		const buff = effect.onSpellPlay.buffAllMinionHealth;
		for (const m of state.players[casterType].battlefield) {
			m.currentHealth = (m.currentHealth ?? 0) + buff;
		}
		logArtifactTrigger(state, casterType, `${name} gives all friendly minions +${buff} Health`);
	}

	return state;
}

// ═══════════════════════════════════════════════════════════════
// HERO ATTACK TRIGGER
// ═══════════════════════════════════════════════════════════════

export function processArtifactOnHeroAttack(
	state: GameState,
	attackerType: 'player' | 'opponent'
): GameState {
	const effect = getArtifactEffect(state, attackerType);
	if (!effect) return state;
	const name = getArtifactName(state, attackerType);
	const artifactState = state.players[attackerType].artifactState;
	const opponentType = opponent(attackerType);

	// Track attacks this turn
	if (artifactState) {
		artifactState.attacksThisTurn = (artifactState.attacksThisTurn || 0) + 1;
	}

	// Track total hero attacks for extra-turn artifacts (Kronos)
	if (effect.extraTurn && artifactState) {
		artifactState.totalHeroAttacks = (artifactState.totalHeroAttacks || 0) + 1;
		if (artifactState.totalHeroAttacks >= effect.extraTurn.attacksRequired && !artifactState.extraTurnUsed) {
			artifactState.extraTurnUsed = true;
			logArtifactTrigger(state, attackerType, `${name}: Extra turn earned after ${effect.extraTurn.attacksRequired} hero attacks!`);
		}
	}

	// AoE damage on hero attack (Mjolnir — all enemy minions)
	if (effect.onHeroAttack?.damage && effect.onHeroAttack?.targetType === 'all_enemy_minions') {
		const dmg = effect.onHeroAttack.damage;
		for (const minion of state.players[opponentType].battlefield) {
			if (minion.currentHealth && minion.currentHealth > 0) {
				minion.currentHealth -= dmg;
			}
		}
		logArtifactTrigger(state, attackerType, `${name} deals ${dmg} damage to all enemy minions`);
	}

	// Adjacent damage (Logi)
	if (effect.onHeroAttack?.adjacentDamage) {
		logArtifactTrigger(state, attackerType, `${name} deals ${effect.onHeroAttack.adjacentDamage} to adjacent minions`);
	}

	// Gain armor on hero attack (Thorgrim)
	if (effect.onHeroAttack?.gainArmor) {
		const armorGain = effect.onHeroAttack.gainArmor;
		state.players[attackerType].heroArmor = Math.min(30, (state.players[attackerType].heroArmor || 0) + armorGain);
		logArtifactTrigger(state, attackerType, `${name} grants +${armorGain} Armor`);
	}

	// Splash damage to random enemies (Skadi)
	if (effect.onHeroAttack?.splashDamage) {
		const dmg = effect.onHeroAttack.splashDamage;
		const count = effect.onHeroAttack.splashTargets || 2;
		const enemies = state.players[opponentType].battlefield.filter(m => (m.currentHealth ?? 0) > 0);
		for (let i = 0; i < Math.min(count, enemies.length); i++) {
			const idx = Math.floor(Math.random() * enemies.length);
			const target = enemies[idx];
			target.currentHealth = (target.currentHealth ?? 0) - dmg;
			logArtifactTrigger(state, attackerType, `${name} splashes ${dmg} to ${target.card.name}`);
			if (effect.freezeAtLowHealth && (target.currentHealth ?? 0) <= effect.freezeAtLowHealth.threshold) {
				target.isFrozen = true;
			}
		}
	}

	// Grant stealth after attacking (Gormr, Hermes)
	if (effect.onHeroAttack?.grantStealth) {
		logArtifactTrigger(state, attackerType, `${name} grants hero Stealth until next turn`);
	}

	// Lingering damage — delayed damage to target (Mistletoe Arrow)
	if (effect.onHeroAttack?.lingeringDamage) {
		logArtifactTrigger(state, attackerType, `${name} applies ${effect.onHeroAttack.lingeringDamage} lingering damage`);
	}

	// Reduce all hand costs (Kronos)
	if (effect.onHeroAttack?.reduceHandCosts) {
		const reduction = effect.onHeroAttack.reduceHandCosts;
		for (const card of state.players[attackerType].hand) {
			const cost = card.card.manaCost ?? 0;
			(card.card as any).manaCost = Math.max(0, cost - reduction);
		}
		logArtifactTrigger(state, attackerType, `${name} reduces all hand costs by (${reduction})`);
	}

	// Summon token on hero attack (Gefjon)
	if (effect.onHeroAttack?.summonToken) {
		const tokenDef = effect.onHeroAttack.summonToken;
		const inst = summonToken(state, attackerType, tokenDef);
		if (inst) {
			logArtifactTrigger(state, attackerType, `${name} summons a ${tokenDef.attack}/${tokenDef.health} ${tokenDef.name}`);
			// Ox synergy
			if (effect.oxSynergy) {
				const oxen = state.players[attackerType].battlefield.filter(
					m => m.card.name === tokenDef.name && (m.currentHealth ?? 0) > 0
				);
				const oxCount = oxen.length;
				for (const ox of oxen) {
					ox.currentAttack = (tokenDef.attack || 1) + (effect.oxSynergy.buffPerOx.attack * (oxCount - 1));
					ox.currentHealth = (tokenDef.health || 1) + (effect.oxSynergy.buffPerOx.health * (oxCount - 1));
				}
				if (oxCount >= (effect.oxSynergy.rushThreshold || 4)) {
					for (const ox of oxen) {
						ox.hasRush = true;
						ox.canAttack = true;
						ox.isSummoningSick = false;
					}
					logArtifactTrigger(state, attackerType, `${name}: ${oxCount} Oxen — all gain Rush!`);
				}
			}
		}
	}

	// Buff all friendly minion attack this turn (Ama-no-Nuhoko)
	if (effect.onHeroAttack?.buffAllMinionAttack) {
		const buff = effect.onHeroAttack.buffAllMinionAttack;
		for (const m of state.players[attackerType].battlefield) {
			m.currentAttack = (m.currentAttack ?? 0) + buff;
		}
		logArtifactTrigger(state, attackerType, `${name} gives all friendly minions +${buff} Attack`);
	}

	// Apply poison (Serqet)
	if (effect.onHeroAttack?.applyPoison) {
		logArtifactTrigger(state, attackerType, `${name} applies Poison to target`);
	}

	// Apply severed (Tsukuyomi)
	if (effect.onHeroAttack?.applySevered) {
		logArtifactTrigger(state, attackerType, `${name} applies Severed to target`);
	}

	// Self-damage after attacking (Blade of Carnage, Myrka)
	if (effect.selfDamageOnAttack) {
		state = dealDamage(state, attackerType, 'hero', effect.selfDamageOnAttack, undefined, undefined, attackerType);
		logArtifactTrigger(state, attackerType, `${name} deals ${effect.selfDamageOnAttack} self-damage`);
	}

	// Second attack AoE (Ullr — after second attack, damage all enemies)
	if (effect.onSecondAttack?.damageAllEnemies && artifactState) {
		if ((artifactState.attacksThisTurn || 0) === 2) {
			const dmg = effect.onSecondAttack.damageAllEnemies;
			for (const m of state.players[opponentType].battlefield) {
				if ((m.currentHealth ?? 0) > 0) m.currentHealth = (m.currentHealth ?? 0) - dmg;
			}
			logArtifactTrigger(state, attackerType, `${name}: second attack deals ${dmg} to all enemies`);
		}
	}

	return state;
}

// ═══════════════════════════════════════════════════════════════
// HERO ATTACK TARGET (post-attack target processing)
// ═══════════════════════════════════════════════════════════════

export function processArtifactOnHeroAttackTarget(
	state: GameState,
	attackerType: 'player' | 'opponent',
	targetInstanceId: string,
	targetPlayerType: 'player' | 'opponent'
): GameState {
	const effect = getArtifactEffect(state, attackerType);
	if (!effect) return state;
	const name = getArtifactName(state, attackerType);

	const target = state.players[targetPlayerType].battlefield.find(
		m => m.instanceId === targetInstanceId
	);
	if (!target) return state;

	// Freeze target (Trident, Brakki)
	if (effect.onHeroAttack?.freeze) {
		if (target.isFrozen && effect.onHeroAttack.destroyIfFrozen) {
			target.currentHealth = 0;
			logArtifactTrigger(state, attackerType, `${name} destroys frozen ${target.card.name}`);
		} else {
			target.isFrozen = true;
			logArtifactTrigger(state, attackerType, `${name} freezes ${target.card.name}`);
		}
	}

	// Destroy target if health below threshold (Laevateinn)
	if (effect.onHeroAttack?.destroyIfHealthBelow) {
		const threshold = effect.onHeroAttack.destroyIfHealthBelow;
		if ((target.currentHealth ?? 0) > 0 && (target.currentHealth ?? 0) <= threshold) {
			target.currentHealth = 0;
			logArtifactTrigger(state, attackerType, `${name} destroys ${target.card.name} (${threshold} or less Health)`);
		}
	}

	// Destroy target if attack above threshold (Vidarr)
	if (effect.onHeroAttack?.destroyIfAttackAbove) {
		const threshold = effect.onHeroAttack.destroyIfAttackAbove;
		if ((target.currentAttack ?? (target.card as any).attack ?? 0) >= threshold) {
			target.currentHealth = 0;
			logArtifactTrigger(state, attackerType, `${name} destroys ${target.card.name} (${threshold}+ Attack)`);
		}
	}

	// Destroy all enemies with attack below damage dealt (Myrka)
	if (effect.onHeroAttack?.destroyIfAttackBelowDamage) {
		const heroAtk = (state.players[attackerType].artifact?.card as any)?.attack || 0;
		const enemies = state.players[targetPlayerType].battlefield;
		for (const m of enemies) {
			const mAtk = m.currentAttack ?? (m.card as any).attack ?? 0;
			if (mAtk < heroAtk && (m.currentHealth ?? 0) > 0) {
				m.currentHealth = 0;
				logArtifactTrigger(state, attackerType, `${name} destroys ${m.card.name} (Attack below ${heroAtk})`);
			}
		}
	}

	// Redirect target's attack as damage to enemy hero (Fjora)
	if (effect.onHeroAttackMinion?.redirectAttackToHero) {
		const targetAtk = target.currentAttack ?? (target.card as any).attack ?? 0;
		if (targetAtk > 0) {
			state = dealDamage(state, targetPlayerType, 'hero', targetAtk, undefined, undefined, attackerType);
			logArtifactTrigger(state, attackerType, `${name} deals ${targetAtk} to enemy hero (swooping strike)`);
		}
	}

	return state;
}

// ═══════════════════════════════════════════════════════════════
// MINION PLAY TRIGGER
// ═══════════════════════════════════════════════════════════════

export function processArtifactOnMinionPlay(
	state: GameState,
	playerType: 'player' | 'opponent',
	minionInstanceId: string
): GameState {
	const effect = getArtifactEffect(state, playerType);
	if (!effect) return state;
	const name = getArtifactName(state, playerType);
	const artifactState = state.players[playerType].artifactState;

	// Track cards played
	if (artifactState) {
		artifactState.cardsPlayedThisTurn = (artifactState.cardsPlayedThisTurn || 0) + 1;
	}

	const minion = state.players[playerType].battlefield.find(
		m => m.instanceId === minionInstanceId
	);

	// Buff on summon (Brisingamen, Divine Forge)
	if (effect.onSummon && minion) {
		if (effect.onSummon.buffAttack) minion.currentAttack = (minion.currentAttack ?? 0) + effect.onSummon.buffAttack;
		if (effect.onSummon.buffHealth) minion.currentHealth = (minion.currentHealth ?? 0) + effect.onSummon.buffHealth;
		logArtifactTrigger(state, playerType, `${name} buffs ${minion.card.name} +${effect.onSummon.buffAttack || 0}/+${effect.onSummon.buffHealth || 0}`);
	}

	// Generic onMinionPlay buff (Vili, Divine Forge, etc.)
	if (effect.onMinionPlay && minion) {
		if (effect.onMinionPlay.buffAttack) {
			minion.currentAttack = (minion.currentAttack ?? 0) + effect.onMinionPlay.buffAttack;
		}
		if (effect.onMinionPlay.buffHealth) {
			minion.currentHealth = (minion.currentHealth ?? 0) + effect.onMinionPlay.buffHealth;
		}
		if (effect.onMinionPlay.buffAttack || effect.onMinionPlay.buffHealth) {
			logArtifactTrigger(state, playerType, `${name} buffs ${minion.card.name} +${effect.onMinionPlay.buffAttack || 0}/+${effect.onMinionPlay.buffHealth || 0}`);
		}

		// Freeze immunity (Vili)
		if (effect.onMinionPlay.grantFreezeImmunity && minion) {
			(minion as any).freezeImmune = true;
			logArtifactTrigger(state, playerType, `${name} grants ${minion.card.name} freeze immunity`);
		}

		// Summon illusion (Dagger of Deceit)
		if (effect.onMinionPlay.summon === 'illusion_1_1') {
			const illusionBuff = effect.illusionBuff || { attack: 0, health: 0 };
			const inst = summonToken(state, playerType, {
				name: 'Illusion',
				attack: 1 + (illusionBuff.attack || 0),
				health: 1 + (illusionBuff.health || 0)
			}, 9090);
			if (inst) {
				logArtifactTrigger(state, playerType, `${name} summons a ${inst.currentAttack}/${inst.currentHealth} Illusion`);
			}
		}

		// Summon token (Fjorgyn)
		if (effect.onMinionPlay.summonToken) {
			const tokenDef = effect.onMinionPlay.summonToken;
			const inst = summonToken(state, playerType, tokenDef);
			if (inst) {
				logArtifactTrigger(state, playerType, `${name} summons a ${tokenDef.attack}/${tokenDef.health} ${tokenDef.name}`);
			}
		}

		// Grant random keyword (Hoenir)
		if (effect.onMinionPlay.grantRandomKeyword && minion) {
			const keywords = effect.onMinionPlay.grantRandomKeyword;
			const kw = keywords[Math.floor(Math.random() * keywords.length)];
			switch (kw) {
				case 'taunt': minion.isTaunt = true; break;
				case 'divine_shield': minion.hasDivineShield = true; break;
				case 'lifesteal': minion.hasLifesteal = true; break;
				case 'rush':
					minion.hasRush = true;
					minion.canAttack = true;
					minion.isSummoningSick = false;
					break;
			}
			logArtifactTrigger(state, playerType, `${name} grants ${minion.card.name} ${kw}`);
			if (effect.onKeywordGained?.drawCard) {
				logArtifactTrigger(state, playerType, `${name}: draw a card (keyword gained)`);
			}
		}

		// Grant deathrattle (Solvi)
		if (effect.onMinionPlay.grantDeathrattle && minion) {
			(minion as any).grantedDeathrattle = effect.onMinionPlay.grantDeathrattle;
			logArtifactTrigger(state, playerType, `${name} grants ${minion.card.name} a Deathrattle`);
		}

		// Charm random enemy (Cestus of Aphrodite)
		if (effect.onMinionPlay.charmRandomEnemy) {
			const enemyBf = state.players[opponent(playerType)].battlefield;
			const target = getRandomMinion(enemyBf);
			if (target) {
				target.canAttack = false;
				logArtifactTrigger(state, playerType, `${name} charms ${target.card.name} — can't attack next turn`);
			}
		}

		// Damage random enemy (Apollo)
		if (effect.onMinionPlay.damageRandomEnemy) {
			const dmg = effect.onMinionPlay.damageRandomEnemy;
			const target = getRandomMinion(state.players[opponent(playerType)].battlefield);
			if (target) {
				target.currentHealth = (target.currentHealth ?? 0) - dmg;
				logArtifactTrigger(state, playerType, `${name} deals ${dmg} to ${target.card.name}`);
			}
		}

		// Buff by cost (Blainn)
		if (effect.onMinionPlay.buffByCost && minion) {
			const costConf = effect.onMinionPlay.buffByCost;
			const minionCost = minion.card.manaCost ?? 0;
			const buff = minionCost <= costConf.lowThreshold ? costConf.lowBuff : costConf.highBuff;
			if (buff.attack) minion.currentAttack = (minion.currentAttack ?? 0) + buff.attack;
			if (buff.health) minion.currentHealth = (minion.currentHealth ?? 0) + buff.health;
			logArtifactTrigger(state, playerType, `${name} buffs ${minion.card.name} +${buff.attack || 0}/+${buff.health || 0}`);
		}
	}

	// Passive minion health buff (Aegis, Hera, Ama-no-Nuhoko)
	if (effect.minionHealthBuff && minion) {
		minion.currentHealth = (minion.currentHealth ?? 0) + effect.minionHealthBuff;
		logArtifactTrigger(state, playerType, `${name} gives ${minion.card.name} +${effect.minionHealthBuff} Health`);
	}

	// Lifesteal threshold (Brisingamen)
	if (effect.lifestealThreshold) {
		const bf = state.players[playerType].battlefield;
		if (bf.length >= effect.lifestealThreshold) {
			for (const m of bf) m.hasLifesteal = true;
			logArtifactTrigger(state, playerType, `${name} grants Lifesteal to all minions`);
		}
	}

	// Grant stealth on play (Nyx, Selene)
	if (effect.grantStealthOnPlay && minion) {
		minion.isStealth = true;
		logArtifactTrigger(state, playerType, `${name} grants ${minion.card.name} Stealth`);
	}

	return state;
}

// ═══════════════════════════════════════════════════════════════
// MINION DEATH TRIGGER
// ═══════════════════════════════════════════════════════════════

export function processArtifactOnMinionDeath(
	state: GameState,
	ownerType: 'player' | 'opponent'
): GameState {
	for (const pType of ['player', 'opponent'] as const) {
		const effect = getArtifactEffect(state, pType);
		if (!effect) continue;
		const name = getArtifactName(state, pType);
		const artifactState = state.players[pType].artifactState;
		if (!artifactState) continue;

		// On ANY minion death — gain souls (Helm of Underworld)
		if (effect.onAnyMinionDeath?.gainSouls) {
			const gain = effect.onAnyMinionDeath.gainSouls;
			artifactState.souls = (artifactState.souls || 0) + gain;
			logArtifactTrigger(state, pType, `${name} gains ${gain} soul (${artifactState.souls} total)`);

			if (effect.soulSpend && (artifactState.souls ?? 0) >= (effect.soulSpend.cost || 3)) {
				const inst = summonToken(state, pType, { name: 'Spirit', attack: 3, health: 3 }, 9091);
				if (inst) {
					artifactState.souls = (artifactState.souls ?? 0) - (effect.soulSpend.cost || 3);
					logArtifactTrigger(state, pType, `${name} spends ${effect.soulSpend.cost} souls to summon a 3/3 Spirit`);
				}
			}
		}

		// On ANY minion death — damage enemy hero (Izanami)
		if (effect.onAnyMinionDeath?.damageEnemyHero) {
			const dmg = effect.onAnyMinionDeath.damageEnemyHero;
			state = dealDamage(state, opponent(pType), 'hero', dmg, undefined, undefined, pType);
			logArtifactTrigger(state, pType, `${name} deals ${dmg} to enemy hero (minion death)`);
		}

		// On FRIENDLY minion death
		if (ownerType === pType) {
			// Damage enemy hero (Gavel of Glitnir)
			if (effect.onFriendlyMinionDeath?.damageEnemyHero) {
				const dmg = effect.onFriendlyMinionDeath.damageEnemyHero;
				state = dealDamage(state, opponent(pType), 'hero', dmg, undefined, undefined, pType);
				logArtifactTrigger(state, pType, `${name} deals ${dmg} to enemy hero`);
			}

			// Gain seeds (Persephone)
			if (effect.onFriendlyMinionDeath?.gainSeeds && artifactState) {
				const maxSeeds = effect.onFriendlyMinionDeath.maxSeeds || 6;
				artifactState.seeds = Math.min((artifactState.seeds || 0) + 1, maxSeeds);
				logArtifactTrigger(state, pType, `${name} gains a Seed (${artifactState.seeds}/${maxSeeds})`);

				if (effect.seedSpend && (artifactState.seeds ?? 0) >= effect.seedSpend.cost) {
					artifactState.seeds = (artifactState.seeds ?? 0) - effect.seedSpend.cost;
					logArtifactTrigger(state, pType, `${name} spends ${effect.seedSpend.cost} Seeds to resurrect a minion`);
				}
			}

			// Gain resurrection charges (Khepri)
			if (effect.onFriendlyMinionDeath?.gainResurrectionCharge && artifactState) {
				artifactState.resurrectionCharges = (artifactState.resurrectionCharges || 0) + 1;
				logArtifactTrigger(state, pType, `${name} gains a resurrection charge (${artifactState.resurrectionCharges})`);

				if (effect.resurrectionThreshold) {
					const threshold = effect.resurrectionThreshold.charges || 3;
					if ((artifactState.resurrectionCharges ?? 0) >= threshold) {
						artifactState.resurrectionCharges = 0;
						logArtifactTrigger(state, pType, `${name}: ${threshold} charges — summon strongest dead minion!`);
					}
				}
			}

			// Track for Persephone full resurrect
			if (artifactState.minionsDiedThisGame !== undefined) {
				artifactState.minionsDiedThisGame.push(ownerType);
			}

			// Prevent first death per turn (Eir)
			if (effect.preventFirstDeathPerTurn && artifactState) {
				if (!artifactState.oncePerTurn?.['deathPrevented']) {
					if (!artifactState.oncePerTurn) artifactState.oncePerTurn = {};
					artifactState.oncePerTurn['deathPrevented'] = true;
					logArtifactTrigger(state, pType, `${name} prevents first minion death this turn`);
				}
			}
		}

		// On ENEMY minion death
		if (ownerType !== pType) {
			// Raise 1/1 copy chance (Hungr & Sultr)
			if (effect.onMinionDeath?.raiseChance) {
				const chance = effect.onMinionDeath.raiseChance;
				if (Math.random() * 100 < chance) {
					const stats = effect.onMinionDeath.raiseStats || { attack: 1, health: 1 };
					const inst = summonToken(state, pType, { name: 'Shade', attack: stats.attack, health: stats.health });
					if (inst) {
						logArtifactTrigger(state, pType, `${name} raises a ${stats.attack}/${stats.health} copy`);
					}
				}
			}

			// Summon 1/1 drowned copy chance (Ran)
			if (effect.onEnemyMinionDeath?.summonCopyChance) {
				const chance = effect.onEnemyMinionDeath.summonCopyChance;
				if (Math.random() * 100 < chance) {
					const stats = effect.onEnemyMinionDeath.copyStats || { attack: 1, health: 1 };
					const inst = summonToken(state, pType, { name: 'Drowned', attack: stats.attack, health: stats.health });
					if (inst) {
						logArtifactTrigger(state, pType, `${name} summons a ${stats.attack}/${stats.health} Drowned copy`);
					}
				}
			}
		}
	}

	return state;
}

// ═══════════════════════════════════════════════════════════════
// HERO DAMAGED TRIGGER
// ═══════════════════════════════════════════════════════════════

export function processArtifactOnHeroDamaged(
	state: GameState,
	damagedPlayerType: 'player' | 'opponent',
	damageAmount: number
): GameState {
	const effect = getArtifactEffect(state, damagedPlayerType);
	if (!effect) return state;
	const name = getArtifactName(state, damagedPlayerType);
	const artifactState = state.players[damagedPlayerType].artifactState;

	// Prevent first hero damage this turn (Aegis)
	if (effect.preventFirstHeroDamage && artifactState && !artifactState.damagePrevented) {
		artifactState.damagePrevented = true;
		const player = state.players[damagedPlayerType];
		player.heroHealth = (player.heroHealth ?? 0) + damageAmount;
		logArtifactTrigger(state, damagedPlayerType, `${name} prevents ${damageAmount} damage`);
	}

	// Store venom on damage (Sigyn)
	if (effect.onHeroDamaged?.storeVenom && artifactState) {
		const maxVenom = effect.onHeroDamaged.maxVenom || 10;
		artifactState.venom = Math.min((artifactState.venom || 0) + damageAmount, maxVenom);
		logArtifactTrigger(state, damagedPlayerType, `${name} stores ${damageAmount} Venom (${artifactState.venom}/${maxVenom})`);
	}

	// Track total damage for scaling (Vault of Ouranos)
	if (effect.onHeroDamaged?.tempSpellDamage && artifactState) {
		artifactState.totalDamageTaken = (artifactState.totalDamageTaken || 0) + damageAmount;
		logArtifactTrigger(state, damagedPlayerType, `${name}: Spell Damage +${effect.onHeroDamaged.tempSpellDamage} this turn (${artifactState.totalDamageTaken} total damage)`);
	}

	// Track hero was damaged (Oathblade and others)
	if (effect.onDamagedEndOfTurn && artifactState) {
		artifactState.heroWasDamagedThisTurn = true;
	}

	return state;
}

// ═══════════════════════════════════════════════════════════════
// LETHAL PREVENTION
// ═══════════════════════════════════════════════════════════════

export function processArtifactOnLethal(
	state: GameState,
	dyingPlayerType: 'player' | 'opponent'
): GameState {
	const effect = getArtifactEffect(state, dyingPlayerType);
	if (!effect) return state;
	const name = getArtifactName(state, dyingPlayerType);
	const artifactState = state.players[dyingPlayerType].artifactState;

	// Prevent lethal once per game (Oathblade)
	if (effect.preventLethal && artifactState && !artifactState.lethalPrevented) {
		artifactState.lethalPrevented = true;
		const player = state.players[dyingPlayerType];
		player.heroHealth = effect.preventLethal.setHealth || 5;
		player.health = player.heroHealth ?? 5;
		state.gamePhase = state.gamePhase === 'game_over' ? 'playing' : state.gamePhase;
		state.winner = state.winner === (dyingPlayerType === 'player' ? 'opponent' : 'player') ? undefined : state.winner;
		logArtifactTrigger(state, dyingPlayerType, `${name} prevents lethal damage! HP set to ${player.heroHealth}`);
	}

	// Immune at 1 HP once per game
	if (effect.oncePerGame?.immuneAtOneHealth && artifactState) {
		if (!artifactState.oncePerGame?.['immuneAtOneHealth']) {
			if (!artifactState.oncePerGame) artifactState.oncePerGame = {};
			artifactState.oncePerGame['immuneAtOneHealth'] = true;
			const player = state.players[dyingPlayerType];
			player.heroHealth = 1;
			player.health = 1;
			state.gamePhase = state.gamePhase === 'game_over' ? 'playing' : state.gamePhase;
			state.winner = state.winner === (dyingPlayerType === 'player' ? 'opponent' : 'player') ? undefined : state.winner;
			logArtifactTrigger(state, dyingPlayerType, `${name}: Immune at 1 HP! (once per game)`);
		}
	}

	return state;
}

// ═══════════════════════════════════════════════════════════════
// HERO KILL TRIGGER
// ═══════════════════════════════════════════════════════════════

export function processArtifactOnHeroKill(
	state: GameState,
	killerType: 'player' | 'opponent'
): GameState {
	const effect = getArtifactEffect(state, killerType);
	if (!effect) return state;
	const name = getArtifactName(state, killerType);
	const artifactState = state.players[killerType].artifactState;

	// Permanent attack bonus on kill (Blade of Carnage, Ylva)
	if (effect.onHeroKill?.permanentAttackBonus && artifactState) {
		const bonus = effect.onHeroKill.permanentAttackBonus;
		artifactState.permanentAttackBonus = (artifactState.permanentAttackBonus || 0) + bonus;
		logArtifactTrigger(state, killerType, `${name}: +${bonus} permanent Attack`);
	}

	// Gain target's attack (Ammit)
	if (effect.onHeroKill?.gainTargetAttack && artifactState) {
		logArtifactTrigger(state, killerType, `${name}: gains target's Attack permanently`);
	}

	// Refresh attack on kill (Megingjord)
	if (effect.onHeroKill?.refreshAttack) {
		logArtifactTrigger(state, killerType, `${name}: hero can attack again!`);
	}

	// Damage enemy hero on kill (Artemis)
	if (effect.onHeroKill?.damageEnemyHero) {
		const dmg = effect.onHeroKill.damageEnemyHero;
		state = dealDamage(state, opponent(killerType), 'hero', dmg, undefined, undefined, killerType);
		logArtifactTrigger(state, killerType, `${name} deals ${dmg} to enemy hero on kill`);
	}

	return state;
}

// ═══════════════════════════════════════════════════════════════
// START OF TURN TRIGGER
// ═══════════════════════════════════════════════════════════════

export function processArtifactStartOfTurn(
	state: GameState,
	playerType: 'player' | 'opponent'
): GameState {
	const effect = getArtifactEffect(state, playerType);
	if (!effect) return state;
	const name = getArtifactName(state, playerType);
	const opponentType = opponent(playerType);

	// Gain armor at start of turn (Khepri)
	if (effect.startOfTurn?.gainArmor) {
		state.players[playerType].heroArmor = Math.min(30, (state.players[playerType].heroArmor || 0) + effect.startOfTurn.gainArmor);
		logArtifactTrigger(state, playerType, `${name} grants +${effect.startOfTurn.gainArmor} Armor`);
	}

	// Freeze random enemy (Gerd)
	if (effect.startOfTurn?.freezeRandomEnemy) {
		const target = getRandomMinion(state.players[opponentType].battlefield);
		if (target) {
			target.isFrozen = true;
			logArtifactTrigger(state, playerType, `${name} freezes ${target.card.name}`);
		}
	}

	// Destroy enemies at 1 health (Artemis)
	if (effect.startOfTurn?.destroyAtOneHealth) {
		const enemies = state.players[opponentType].battlefield;
		for (const m of enemies) {
			if ((m.currentHealth ?? 0) === 1) {
				m.currentHealth = 0;
				logArtifactTrigger(state, playerType, `${name} destroys ${m.card.name} (1 Health)`);
			}
		}
	}

	// Reveal top card (Gjallarhorn)
	if (effect.startOfTurn?.revealOpponentTopCard) {
		logArtifactTrigger(state, playerType, `${name} reveals opponent's top card`);
	}

	// Refresh hero power if armored (Eldrin)
	if (effect.startOfTurn?.refreshHeroPowerIfArmored) {
		if ((state.players[playerType].heroArmor || 0) > 0) {
			logArtifactTrigger(state, playerType, `${name} refreshes Hero Power (armored)`);
		}
	}

	// Summon if fewer minions (Kamimusubi)
	if (effect.startOfTurn?.summonIfFewerMinions) {
		const myCount = state.players[playerType].battlefield.length;
		const theirCount = state.players[opponentType].battlefield.length;
		if (myCount < theirCount) {
			const tokenDef = effect.startOfTurn.summonIfFewerMinions;
			const inst = summonToken(state, playerType, tokenDef);
			if (inst) {
				logArtifactTrigger(state, playerType, `${name} summons a ${tokenDef.attack}/${tokenDef.health} ${tokenDef.name}`);
			}
		}
	}

	// Add random minion to hand (Demeter)
	if (effect.startOfTurn?.addRandomMinion) {
		logArtifactTrigger(state, playerType, `${name} adds a random minion to hand`);
	}

	// Buff random minion (Idunn)
	if (effect.startOfTurn?.buffRandomMinion) {
		const target = getRandomMinion(state.players[playerType].battlefield);
		if (target) {
			const buff = effect.startOfTurn.buffRandomMinion;
			if (buff.health) target.currentHealth = (target.currentHealth ?? 0) + buff.health;
			if (buff.spellImmunity) (target as any).spellImmune = true;
			// Bonus at full health
			if (effect.startOfTurn.bonusAtFullHealth) {
				const player = state.players[playerType];
				const maxHp = player.maxHealth;
				if ((player.heroHealth ?? 0) >= maxHp) {
					if (effect.startOfTurn.bonusAtFullHealth.attack) {
						target.currentAttack = (target.currentAttack ?? 0) + effect.startOfTurn.bonusAtFullHealth.attack;
					}
				}
			}
			logArtifactTrigger(state, playerType, `${name} buffs ${target.card.name}`);
		}
	}

	return state;
}

// ═══════════════════════════════════════════════════════════════
// END OF TURN TRIGGER
// ═══════════════════════════════════════════════════════════════

export function processArtifactEndOfTurn(
	state: GameState,
	playerType: 'player' | 'opponent'
): GameState {
	const effect = getArtifactEffect(state, playerType);
	if (!effect) return state;
	const name = getArtifactName(state, playerType);
	const artifactState = state.players[playerType].artifactState;
	const opponentType = opponent(playerType);
	const player = state.players[playerType];
	const eot = effect.endOfTurn;

	// Armor if damaged this turn (Oathblade)
	if (effect.onDamagedEndOfTurn && artifactState?.heroWasDamagedThisTurn) {
		const armorGain = effect.onDamagedEndOfTurn.gainArmor || 2;
		player.heroArmor = Math.min(30, (player.heroArmor || 0) + armorGain);
		logArtifactTrigger(state, playerType, `${name} grants +${armorGain} Armor (hero was damaged)`);
	}

	if (!eot) return state;

	// Heal all friendly characters (Baldur, Helios)
	if (eot.healAllFriendly) {
		const healAmt = eot.healAllFriendly;
		for (const m of player.battlefield) {
			m.currentHealth = Math.min(
				(m.currentHealth ?? 0) + healAmt,
				(m.card as any).health ?? m.currentHealth ?? 0
			);
		}
		const maxHp = player.maxHealth;
		player.heroHealth = Math.min((player.heroHealth ?? 0) + healAmt, maxHp);
		logArtifactTrigger(state, playerType, `${name} restores ${healAmt} Health to all friendly characters`);
	}

	// Heal hero (Hera, Hestia)
	if (eot.healHero) {
		const healAmt = eot.healHero;
		const maxHp = player.maxHealth;
		player.heroHealth = Math.min((player.heroHealth ?? 0) + healAmt, maxHp);
		logArtifactTrigger(state, playerType, `${name} restores ${healAmt} Health to hero`);
	}

	// Heal most damaged character (Eir)
	if (eot.healMostDamaged) {
		const healAmt = eot.healMostDamaged;
		let mostDamaged: CardInstance | null = null;
		let maxDmg = 0;
		for (const m of player.battlefield) {
			const dmgTaken = ((m.card as any).health ?? 0) - (m.currentHealth ?? 0);
			if (dmgTaken > maxDmg) { maxDmg = dmgTaken; mostDamaged = m; }
		}
		if (mostDamaged) {
			mostDamaged.currentHealth = Math.min(
				(mostDamaged.currentHealth ?? 0) + healAmt,
				(mostDamaged.card as any).health ?? 0
			);
			logArtifactTrigger(state, playerType, `${name} restores ${healAmt} Health to ${mostDamaged.card.name}`);
		}
	}

	// Damage all enemies (Helios)
	if (eot.damageAllEnemies) {
		const dmg = eot.damageAllEnemies;
		for (const m of state.players[opponentType].battlefield) {
			if ((m.currentHealth ?? 0) > 0) m.currentHealth = (m.currentHealth ?? 0) - dmg;
		}
		logArtifactTrigger(state, playerType, `${name} deals ${dmg} to all enemies`);
	}

	// Damage ALL characters (Hyperion)
	if (eot.damageAll) {
		const dmg = eot.damageAll;
		for (const pKey of ['player', 'opponent'] as const) {
			for (const m of state.players[pKey].battlefield) {
				if ((m.currentHealth ?? 0) > 0) m.currentHealth = (m.currentHealth ?? 0) - dmg;
			}
		}
		logArtifactTrigger(state, playerType, `${name} deals ${dmg} to ALL characters`);
	}

	// Escalating AoE (Sol's Sunfire Chariot)
	if (eot.escalatingAoE && artifactState) {
		const dmg = artifactState.escalatingDamage || eot.baseDamage || 1;
		for (const m of state.players[opponentType].battlefield) {
			if ((m.currentHealth ?? 0) > 0) m.currentHealth = (m.currentHealth ?? 0) - dmg;
		}
		logArtifactTrigger(state, playerType, `${name} deals ${dmg} escalating damage to all enemy minions`);
		artifactState.escalatingDamage = dmg + (eot.increment || 1);
	}

	// Gain mana crystal (Njord)
	if (eot.gainManaCrystal) {
		const mana = player.mana;
		if (mana.max < 10) {
			mana.max += eot.gainManaCrystal;
			if (mana.max > 10) mana.max = 10;
			logArtifactTrigger(state, playerType, `${name} grants +${eot.gainManaCrystal} Mana Crystal`);
			if (effect.onGainManaCrystal?.gainArmor) {
				player.heroArmor = Math.min(30, (player.heroArmor || 0) + effect.onGainManaCrystal.gainArmor);
			}
		}
	}

	// Buff zero-attack minions (Fjorgyn)
	if (eot.buffZeroAttackMinions) {
		const buff = eot.buffZeroAttackMinions;
		for (const m of player.battlefield) {
			if ((m.currentAttack ?? 0) === 0) {
				m.currentAttack = (m.currentAttack ?? 0) + (buff.attack || 1);
				logArtifactTrigger(state, playerType, `${name} gives ${m.card.name} +${buff.attack} Attack`);
			}
		}
	}

	// Permanent health buff all (Kamimusubi)
	if (eot.permanentHealthBuffAll) {
		const buff = eot.permanentHealthBuffAll;
		for (const m of player.battlefield) {
			m.currentHealth = (m.currentHealth ?? 0) + buff;
		}
		logArtifactTrigger(state, playerType, `${name} gives all friendly minions +${buff} Health (permanent)`);
	}

	// Health buff if minion threshold (Seidr Staff)
	if (eot.healthBuffIfMinions) {
		const conf = eot.healthBuffIfMinions;
		if (player.battlefield.length >= conf.threshold) {
			for (const m of player.battlefield) {
				m.currentHealth = (m.currentHealth ?? 0) + conf.buff;
			}
			logArtifactTrigger(state, playerType, `${name} gives all minions +${conf.buff} Health (${conf.threshold}+ minions)`);
		}
	}

	// Discount if cards played (Hephaestus)
	if (eot.discountIfCardsPlayed && artifactState) {
		const conf = eot.discountIfCardsPlayed;
		if ((artifactState.cardsPlayedThisTurn || 0) >= conf.threshold && player.hand.length > 0) {
			const nextCard = player.hand[0];
			const cost = nextCard.card.manaCost ?? 0;
			(nextCard.card as any).manaCost = Math.max(0, cost - conf.reduction);
			logArtifactTrigger(state, playerType, `${name} reduces next card cost by (${conf.reduction})`);
		}
	}

	// Draw if spell threshold (Odrerir)
	if (eot.drawIfSpellThreshold && artifactState) {
		if ((artifactState.spellsCastThisTurn || 0) >= eot.drawIfSpellThreshold) {
			const drawCount = eot.drawCount || 2;
			logArtifactTrigger(state, playerType, `${name}: ${eot.drawIfSpellThreshold}+ spells cast — draw ${drawCount}`);
		}
	}

	// Draw if hand size below (Mani)
	if (eot.drawIfHandSizeBelow !== undefined) {
		if (player.hand.length <= eot.drawIfHandSizeBelow) {
			const drawCount = eot.drawCount || 2;
			logArtifactTrigger(state, playerType, `${name}: hand size ≤${eot.drawIfHandSizeBelow} — draw ${drawCount}`);
		}
	}

	// Draw if cards played threshold (Ve)
	if (eot.drawIfCardsPlayed && artifactState) {
		if ((artifactState.cardsPlayedThisTurn || 0) >= eot.drawIfCardsPlayed) {
			logArtifactTrigger(state, playerType, `${name}: ${eot.drawIfCardsPlayed}+ cards played — draw a card`);
		}
	}

	// Draw if both types played (Apollo)
	if (eot.drawIfBothTypesPlayed) {
		logArtifactTrigger(state, playerType, `${name} checks for spell+minion combo draw`);
	}

	// Draw if both players lost a minion (Gavel of Glitnir)
	if (eot.drawIfBothLostMinion) {
		logArtifactTrigger(state, playerType, `${name} checks if both sides lost minions`);
	}

	// Draw if highest health (Hyperion)
	if (eot.drawIfHighestHealth) {
		const myHp = player.heroHealth ?? 0;
		const theirHp = state.players[opponentType].heroHealth ?? 0;
		if (myHp > theirHp) {
			logArtifactTrigger(state, playerType, `${name}: highest Health — draw a card`);
		}
	}

	// Damage inactive enemies (Nyx)
	if (eot.damageInactiveEnemies) {
		const dmg = eot.damageInactiveEnemies;
		for (const m of state.players[opponentType].battlefield) {
			if ((m.attacksPerformed ?? 0) === 0 && (m.currentHealth ?? 0) > 0) {
				m.currentHealth = (m.currentHealth ?? 0) - dmg;
				logArtifactTrigger(state, playerType, `${name} deals ${dmg} to inactive ${m.card.name}`);
			}
		}
	}

	// Draw per minion that attacked (Thyrsus)
	if (eot.drawPerMinionThatAttacked) {
		const count = player.battlefield.filter(m => (m.attacksPerformed ?? 0) > 0).length;
		if (count > 0) {
			logArtifactTrigger(state, playerType, `${name}: ${count} minions attacked — draw ${count}`);
		}
	}

	// Summon shade if spell threshold (Hecate)
	if (eot.summonIfSpellThreshold && artifactState) {
		const conf = eot.summonIfSpellThreshold;
		if ((artifactState.spellsCastThisTurn || 0) >= conf.threshold) {
			const inst = summonToken(state, playerType, conf.summon);
			if (inst) {
				logArtifactTrigger(state, playerType, `${name} summons a ${conf.summon.attack}/${conf.summon.health} ${conf.summon.name}`);
			}
		}
	}

	// Balance reward (Feather of Ma'at)
	if (eot.balanceReward) {
		const conf = eot.balanceReward;
		const myHp = player.heroHealth ?? 0;
		const theirHp = state.players[opponentType].heroHealth ?? 0;
		if (Math.abs(myHp - theirHp) <= conf.healthDifference) {
			player.heroArmor = Math.min(30, (player.heroArmor || 0) + conf.gainArmor);
			logArtifactTrigger(state, playerType, `${name}: balanced — draw ${conf.drawCards} and gain +${conf.gainArmor} Armor`);
		}
	}

	// Discover minion (Aegir)
	if (eot.discoverMinion) {
		if (effect.emptyHandBonus && player.hand.length === 0) {
			logArtifactTrigger(state, playerType, `${name}: empty hand — draw ${effect.emptyHandBonus.drawCards}`);
		} else {
			logArtifactTrigger(state, playerType, `${name} discovers a minion`);
		}
	}

	// Armor per friendly minion (Helios)
	if (effect.armorPerFriendlyMinion) {
		const count = player.battlefield.filter(m => (m.currentHealth ?? 0) > 0).length;
		if (count > 0) {
			const armorGain = effect.armorPerFriendlyMinion * count;
			player.heroArmor = Math.min(30, (player.heroArmor || 0) + armorGain);
			logArtifactTrigger(state, playerType, `${name} grants +${armorGain} Armor (${count} minions)`);
		}
	}

	// Full health armor (Hestia)
	if (effect.fullHealthArmor) {
		const maxHp = player.maxHealth;
		if ((player.heroHealth ?? 0) >= maxHp) {
			player.heroArmor = Math.min(30, (player.heroArmor || 0) + effect.fullHealthArmor);
			logArtifactTrigger(state, playerType, `${name}: full Health — +${effect.fullHealthArmor} Armor`);
		}
	}

	// Buff random minion on both turns (Selene)
	if (effect.bothTurnsEndOfTurn?.buffRandomMinion) {
		const buff = effect.bothTurnsEndOfTurn.buffRandomMinion;
		const target = getRandomMinion(player.battlefield);
		if (target) {
			if (buff.attack) target.currentAttack = (target.currentAttack ?? 0) + buff.attack;
			if (buff.health) target.currentHealth = (target.currentHealth ?? 0) + buff.health;
			logArtifactTrigger(state, playerType, `${name} buffs ${target.card.name} +${buff.attack || 0}/+${buff.health || 0}`);
		}
	}

	// Minion buff at full health (Gjallarhorn)
	if (effect.minionBuffAtFullHealth) {
		const maxHp = player.maxHealth;
		if ((player.heroHealth ?? 0) >= maxHp) {
			const buff = effect.minionBuffAtFullHealth;
			for (const m of player.battlefield) {
				if (buff.attack) m.currentAttack = (m.currentAttack ?? 0) + buff.attack;
				if (buff.health) m.currentHealth = (m.currentHealth ?? 0) + buff.health;
			}
			logArtifactTrigger(state, playerType, `${name}: full Health — minions get +${buff.attack}/${buff.health}`);
		}
	}

	return state;
}

// ═══════════════════════════════════════════════════════════════
// ENEMY MINION PLAYED
// ═══════════════════════════════════════════════════════════════

export function processArtifactOnEnemyMinionPlayed(
	state: GameState,
	ownerType: 'player' | 'opponent',
	minionInstanceId: string
): GameState {
	const defenderType = opponent(ownerType);
	const effect = getArtifactEffect(state, defenderType);
	if (!effect) return state;
	const name = getArtifactName(state, defenderType);

	const minion = state.players[ownerType].battlefield.find(m => m.instanceId === minionInstanceId);

	// Debuff attack on enemy minion play (Ran)
	if (effect.onEnemyMinionPlayed?.debuffAttack && minion) {
		const debuff = effect.onEnemyMinionPlayed.debuffAttack;
		minion.currentAttack = Math.max(0, (minion.currentAttack ?? 0) - debuff);
		logArtifactTrigger(state, defenderType, `${name} reduces ${minion.card.name}'s Attack by ${debuff}`);
	}

	// Destroy if cost above your highest (Hera — once per turn)
	if (effect.onOpponentPlayMinion?.destroyIfCostAbove && minion) {
		const artifactState = state.players[defenderType].artifactState;
		if (!effect.onOpponentPlayMinion.oncePerTurn || !artifactState?.oncePerTurn?.['destroyCostAbove']) {
			const myMaxCost = Math.max(0, ...state.players[defenderType].battlefield.map(m => m.card.manaCost ?? 0));
			if ((minion.card.manaCost ?? 0) > myMaxCost) {
				minion.currentHealth = 0;
				if (artifactState && effect.onOpponentPlayMinion.oncePerTurn) {
					if (!artifactState.oncePerTurn) artifactState.oncePerTurn = {};
					artifactState.oncePerTurn['destroyCostAbove'] = true;
				}
				logArtifactTrigger(state, defenderType, `${name} destroys ${minion.card.name} (costs more than your minions)`);
			}
		}
	}

	// Copy expensive opponent cards (Thrymr)
	if (effect.onOpponentPlayCard?.costThreshold) {
		const threshold = effect.onOpponentPlayCard.costThreshold;
		if (minion && (minion.card.manaCost ?? 0) >= threshold) {
			const hand = state.players[defenderType].hand;
			if (hand.length < MAX_HAND_SIZE) {
				const copy = JSON.parse(JSON.stringify(minion)) as CardInstance;
				copy.instanceId = uuidv4();
				const reduction = effect.onOpponentPlayCard.copyReduction || 0;
				(copy.card as any).manaCost = Math.max(0, (copy.card.manaCost ?? 0) - reduction);
				hand.push(copy);
				logArtifactTrigger(state, defenderType, `${name} copies ${minion.card.name} (costs ${reduction} less)`);
			}
		}
	}

	return state;
}

// ═══════════════════════════════════════════════════════════════
// UTILITY: FIRST SPELL DOUBLED
// ═══════════════════════════════════════════════════════════════

export function isFirstSpellDoubledByArtifact(
	state: GameState,
	playerType: 'player' | 'opponent'
): boolean {
	const effect = getArtifactEffect(state, playerType);
	if (!effect?.firstSpellDouble) return false;
	const artifactState = state.players[playerType].artifactState;
	return artifactState ? !artifactState.firstSpellCastThisTurn : false;
}

// Re-export for backwards compatibility (now in artifactUtils.ts)
export { getArtifactSpellCostReduction } from './artifactUtils';
