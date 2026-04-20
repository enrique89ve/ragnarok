import { GameState, CardInstance, GameLogEvent, ArtifactRuntimeState } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { debug } from '../config/debugConfig';

export function canPlayArtifact(
	state: GameState,
	playerType: 'player' | 'opponent',
	card: CardInstance
): boolean {
	if (card.card.type !== 'artifact') return false;
	const player = state.players[playerType];
	const manaCost = card.card.manaCost ?? 5;
	if (player.mana.current < manaCost) return false;
	const heroId = (card.card as any).heroId;
	if (heroId && player.heroId && player.heroId !== heroId) return false;
	return true;
}

export function equipArtifact(
	state: GameState,
	playerType: 'player' | 'opponent',
	artifactCard: CardInstance
): GameState {
	const newState = JSON.parse(JSON.stringify(state)) as GameState;
	const player = newState.players[playerType];

	if (player.artifact) {
		if (!player.graveyard) player.graveyard = [];
		player.graveyard.push(player.artifact);
		player.artifact = undefined;
		player.artifactState = undefined;
	}

	const artifact: CardInstance = {
		...artifactCard,
		isPlayed: true,
		attacksPerformed: 0,
		canAttack: false
	};

	player.artifact = artifact;
	player.artifactState = initArtifactState((artifactCard.card as any).artifactEffect?.type);

	const logEvent: GameLogEvent = {
		id: uuidv4(),
		type: 'equip_artifact',
		turn: newState.turnNumber,
		timestamp: Date.now(),
		player: playerType,
		text: `${playerType} equipped ${artifact.card.name}`,
		cardId: artifact.instanceId
	};
	newState.gameLog.push(logEvent);

	return newState;
}

export function destroyArtifact(
	state: GameState,
	playerType: 'player' | 'opponent'
): GameState {
	const newState = JSON.parse(JSON.stringify(state)) as GameState;
	const player = newState.players[playerType];

	if (!player.artifact) return state;

	if (!player.graveyard) player.graveyard = [];
	player.graveyard.push(player.artifact);

	const logEvent: GameLogEvent = {
		id: uuidv4(),
		type: 'artifact_destroyed',
		turn: newState.turnNumber,
		timestamp: Date.now(),
		player: playerType,
		text: `${playerType}'s ${player.artifact.card.name} was destroyed`,
		cardId: player.artifact.instanceId
	};
	newState.gameLog.push(logEvent);

	player.artifact = undefined;
	player.artifactState = undefined;

	return newState;
}

export function getArtifactAttackBonus(
	state: GameState,
	playerType: 'player' | 'opponent'
): number {
	const player = state.players[playerType];
	if (!player.artifact) return 0;
	const effect = (player.artifact.card as any).artifactEffect;
	const baseAttack = (player.artifact.card as any).attack || 0;
	const permanentBonus = player.artifactState?.permanentAttackBonus || 0;
	const passiveBonus = effect?.passiveAttackBonus || 0;
	const perEnemyMinion = effect?.attackPerEnemyMinion || 0;
	const opponentType = playerType === 'player' ? 'opponent' : 'player';
	const enemyCount = perEnemyMinion ? state.players[opponentType].battlefield.length : 0;
	const armorBonus = effect?.armorAttackBonus
		? ((player.heroArmor || 0) >= effect.armorAttackBonus.threshold ? effect.armorAttackBonus.bonus : 0)
		: 0;
	const minionBonus = effect?.heroAttackWhileMinions
		? (player.battlefield.length >= effect.heroAttackWhileMinions.threshold ? effect.heroAttackWhileMinions.bonus : 0)
		: 0;
	return baseAttack + permanentBonus + passiveBonus + (perEnemyMinion * enemyCount) + armorBonus + minionBonus;
}

export function resetArtifactTurnState(
	state: GameState,
	playerType: 'player' | 'opponent'
): GameState {
	const player = state.players[playerType];
	if (!player.artifact || !player.artifactState) return state;

	player.artifactState.firstSpellCastThisTurn = false;
	player.artifactState.damagePrevented = false;
	player.artifactState.heroWasDamagedThisTurn = false;
	player.artifactState.attacksThisTurn = 0;
	player.artifactState.spellsCastThisTurn = 0;
	player.artifactState.cardsPlayedThisTurn = 0;
	player.artifactState.oncePerTurn = {};

	return state;
}

function initArtifactState(artifactType?: string): ArtifactRuntimeState {
	const base: ArtifactRuntimeState = {
		oncePerTurn: {},
		oncePerGame: {},
	};
	switch (artifactType) {
		case 'helm_of_underworld':
			base.souls = 0;
			break;
		case 'blade_of_carnage':
		case 'ylva_fang':
		case 'ammit_maw':
			base.permanentAttackBonus = 0;
			break;
		case 'oathblade':
			base.lethalPrevented = false;
			break;
		case 'sigyn_venom_bowl':
			base.venom = 0;
			break;
		case 'persephone_pomegranate':
			base.seeds = 0;
			base.minionsDiedThisGame = [];
			break;
		case 'sol_sunfire_chariot':
			base.escalatingDamage = 1;
			break;
		case 'kronos_sickle':
			base.totalHeroAttacks = 0;
			base.extraTurnUsed = false;
			break;
		case 'khepri_scarab':
			base.resurrectionCharges = 0;
			break;
		case 'vault_of_ouranos':
			base.totalDamageTaken = 0;
			break;
	}
	return base;
}

export function getArtifactSpellCostReduction(
	state: GameState,
	playerType: 'player' | 'opponent'
): number {
	const player = state.players[playerType];
	if (!player.artifact) return 0;
	const effect = (player.artifact.card as any).artifactEffect;
	if (!effect) return 0;
	let reduction = effect.spellCostReduction || 0;
	if (effect.scalingReduction && player.artifactState) {
		const totalDmg = player.artifactState.totalDamageTaken || 0;
		if (totalDmg >= effect.scalingReduction.damageThreshold) {
			reduction += effect.scalingReduction.bonusReduction || 0;
		}
	}
	return reduction;
}

export function getArtifactSpellDamageBonus(
	state: GameState,
	playerType: 'player' | 'opponent'
): number {
	const player = state.players[playerType];
	if (!player.artifact) return 0;
	const effect = (player.artifact.card as any).artifactEffect;
	return effect?.spellDamageBonus || 0;
}

export function canArtifactDoubleAttack(
	state: GameState,
	playerType: 'player' | 'opponent'
): boolean {
	const player = state.players[playerType];
	if (!player.artifact) return false;
	const effect = (player.artifact.card as any).artifactEffect;
	return !!effect?.doubleAttack;
}

export function hasArtifact(
	state: GameState,
	playerType: 'player' | 'opponent',
	artifactType?: string
): boolean {
	const player = state.players[playerType];
	if (!player.artifact) return false;
	if (!artifactType) return true;
	return (player.artifact.card as any).artifactEffect?.type === artifactType;
}
