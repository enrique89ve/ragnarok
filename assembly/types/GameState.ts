/**
 * Core game state types for AssemblyScript WASM engine.
 * Mirrors the TypeScript types in client/src/game/types/types.ts
 *
 * All types are flat classes (no discriminated unions in AS).
 * JSON serialization happens at the boundary (index.ts).
 */

// Card types as integer constants
export const CARD_TYPE_MINION: i32 = 0;
export const CARD_TYPE_SPELL: i32 = 1;
export const CARD_TYPE_WEAPON: i32 = 2;
export const CARD_TYPE_HERO: i32 = 3;
export const CARD_TYPE_SECRET: i32 = 4;
export const CARD_TYPE_LOCATION: i32 = 5;
export const CARD_TYPE_POKER_SPELL: i32 = 6;
export const CARD_TYPE_ARTIFACT: i32 = 7;
export const CARD_TYPE_ARMOR: i32 = 8;

// Hero classes
export const CLASS_WARRIOR: i32 = 0;
export const CLASS_MAGE: i32 = 1;
export const CLASS_HUNTER: i32 = 2;
export const CLASS_PALADIN: i32 = 3;
export const CLASS_PRIEST: i32 = 4;
export const CLASS_ROGUE: i32 = 5;
export const CLASS_SHAMAN: i32 = 6;
export const CLASS_WARLOCK: i32 = 7;
export const CLASS_DRUID: i32 = 8;
export const CLASS_DEATH_KNIGHT: i32 = 9;
export const CLASS_BERSERKER: i32 = 10;
export const CLASS_NEUTRAL: i32 = 11;
export const CLASS_MONK: i32 = 12;

// Game phases
export const PHASE_MULLIGAN: i32 = 0;
export const PHASE_PLAYING: i32 = 1;
export const PHASE_ENDED: i32 = 2;
export const PHASE_GAME_OVER: i32 = 3;

// Player IDs
export const PLAYER_SELF: i32 = 0;
export const PLAYER_OPPONENT: i32 = 1;

/**
 * Mana pool — tracks current, max, overloaded, and pending overload
 */
export class ManaPool {
	current: i32;
	max: i32;
	overloaded: i32;
	pendingOverload: i32;

	constructor(current: i32 = 1, max: i32 = 1) {
		this.current = current;
		this.max = max;
		this.overloaded = 0;
		this.pendingOverload = 0;
	}
}

/**
 * Effect definition — parameterized (covers all 182 handlers).
 * Each card's battlecry/deathrattle/spell uses this structure.
 */
export class EffectDef {
	pattern: string;       // e.g. "damage", "buff", "draw", "summon", etc.
	value: i32;            // Primary value (damage amount, buff amount, draw count)
	value2: i32;           // Secondary value (health buff, secondary param)
	targetType: string;    // "enemy_minion", "friendly_minion", "hero", "all_minions", "random", "self", "adjacent", "aoe"
	condition: string;     // "none", "combo", "if_holding_spell", "highlander", etc.
	keywords: string[];    // Keywords to grant: ["taunt", "divine_shield", etc.]
	cardId: i32;           // For summon/transform: which card to create
	count: i32;            // For multi-effects: how many times

	constructor() {
		this.pattern = '';
		this.value = 0;
		this.value2 = 0;
		this.targetType = '';
		this.condition = 'none';
		this.keywords = [];
		this.cardId = 0;
		this.count = 1;
	}
}

/**
 * Card definition — game-mechanical fields only (no art, flavor, description).
 * Loaded from JSON at startup via loadCardData().
 */
export class CardDef {
	id: i32;
	name: string;
	cardType: i32;         // CARD_TYPE_* constant
	manaCost: i32;
	attack: i32;           // For minions/weapons
	health: i32;           // For minions (durability for weapons)
	heroClass: i32;        // CLASS_* constant
	rarity: string;        // "free", "common", "rare", "epic", "mythic"
	race: string;          // "beast", "dragon", "elemental", etc. or ""
	keywords: string[];    // ["taunt", "charge", "divine_shield", etc.]
	battlecry: EffectDef | null;
	deathrattle: EffectDef | null;
	spellEffect: EffectDef | null;
	combo: EffectDef | null;
	overload: i32;         // Mana to lock next turn
	spellDamage: i32;      // Spell damage bonus
	heroId: string;        // For artifacts: which hero can equip
	armorSlot: string;     // For armor: "helm", "chest", "greaves"

	constructor() {
		this.id = 0;
		this.name = '';
		this.cardType = CARD_TYPE_MINION;
		this.manaCost = 0;
		this.attack = 0;
		this.health = 0;
		this.heroClass = CLASS_NEUTRAL;
		this.rarity = 'common';
		this.race = '';
		this.keywords = [];
		this.battlecry = null;
		this.deathrattle = null;
		this.spellEffect = null;
		this.combo = null;
		this.overload = 0;
		this.spellDamage = 0;
		this.heroId = '';
		this.armorSlot = '';
	}
}

/**
 * Card instance — a specific card in play with mutable state.
 */
export class CardInstance {
	instanceId: string;
	cardId: i32;           // References CardDef.id
	currentAttack: i32;
	currentHealth: i32;
	maxHealth: i32;
	currentDurability: i32;

	// Status flags
	canAttack: bool;
	isSummoningSick: bool;
	hasAttacked: bool;
	hasDivineShield: bool;
	isFrozen: bool;
	isStealth: bool;
	isTaunt: bool;
	isRush: bool;
	hasCharge: bool;
	hasWindfury: bool;
	hasMegaWindfury: bool;
	hasLifesteal: bool;
	hasPoisonous: bool;
	silenced: bool;
	attacksPerformed: i32;
	isPlayerOwned: bool;
	evolutionLevel: i32;   // 1=Mortal, 2=Ascended, 3=Divine

	// Ragnarok status effects
	isPoisonedDoT: bool;
	isBleeding: bool;
	isParalyzed: bool;
	isWeakened: bool;
	isVulnerable: bool;
	isMarked: bool;

	constructor(instanceId: string, cardId: i32) {
		this.instanceId = instanceId;
		this.cardId = cardId;
		this.currentAttack = 0;
		this.currentHealth = 0;
		this.maxHealth = 0;
		this.currentDurability = 0;
		this.canAttack = false;
		this.isSummoningSick = true;
		this.hasAttacked = false;
		this.hasDivineShield = false;
		this.isFrozen = false;
		this.isStealth = false;
		this.isTaunt = false;
		this.isRush = false;
		this.hasCharge = false;
		this.hasWindfury = false;
		this.hasMegaWindfury = false;
		this.hasLifesteal = false;
		this.hasPoisonous = false;
		this.silenced = false;
		this.attacksPerformed = 0;
		this.isPlayerOwned = true;
		this.evolutionLevel = 3;
		this.isPoisonedDoT = false;
		this.isBleeding = false;
		this.isParalyzed = false;
		this.isWeakened = false;
		this.isVulnerable = false;
		this.isMarked = false;
	}
}

/**
 * Hero power definition
 */
export class HeroPower {
	name: string;
	cost: i32;
	used: bool;

	constructor(name: string = '', cost: i32 = 2) {
		this.name = name;
		this.cost = cost;
		this.used = false;
	}
}

/**
 * Player state
 */
export class Player {
	id: i32;               // PLAYER_SELF or PLAYER_OPPONENT
	name: string;
	hand: CardInstance[];
	battlefield: CardInstance[];
	deck: i32[];           // Array of CardDef IDs (deck order matters)
	graveyard: CardInstance[];
	secrets: CardInstance[];
	weapon: CardInstance | null;
	artifact: CardInstance | null;
	mana: ManaPool;
	health: i32;
	heroHealth: i32;
	maxHealth: i32;
	heroArmor: i32;
	heroClass: i32;
	heroPower: HeroPower;
	cardsPlayedThisTurn: i32;
	attacksPerformedThisTurn: i32;
	fatigueCounter: i32;
	heroId: string;

	constructor(id: i32) {
		this.id = id;
		this.name = '';
		this.hand = [];
		this.battlefield = [];
		this.deck = [];
		this.graveyard = [];
		this.secrets = [];
		this.weapon = null;
		this.artifact = null;
		this.mana = new ManaPool();
		this.health = 30;
		this.heroHealth = 30;
		this.maxHealth = 30;
		this.heroArmor = 0;
		this.heroClass = CLASS_NEUTRAL;
		this.heroPower = new HeroPower();
		this.cardsPlayedThisTurn = 0;
		this.attacksPerformedThisTurn = 0;
		this.fatigueCounter = 0;
		this.heroId = '';
	}
}

/**
 * Complete game state — the root structure passed to/from WASM
 */
export class GameState {
	player: Player;
	opponent: Player;
	currentTurn: i32;      // PLAYER_SELF or PLAYER_OPPONENT
	turnNumber: i32;
	gamePhase: i32;        // PHASE_* constant
	winner: i32;           // -1=none, PLAYER_SELF, PLAYER_OPPONENT
	rngState: u32;         // Seeded RNG internal state
	instanceCounter: i32;  // For generating unique instanceIds

	constructor() {
		this.player = new Player(PLAYER_SELF);
		this.opponent = new Player(PLAYER_OPPONENT);
		this.currentTurn = PLAYER_SELF;
		this.turnNumber = 1;
		this.gamePhase = PHASE_MULLIGAN;
		this.winner = -1;
		this.rngState = 0;
		this.instanceCounter = 0;
	}

	/** Generate a unique instance ID */
	nextInstanceId(): string {
		this.instanceCounter++;
		return 'w-' + this.instanceCounter.toString();
	}

	/** Get the active player */
	activePlayer(): Player {
		return this.currentTurn == PLAYER_SELF ? this.player : this.opponent;
	}

	/** Get the inactive player */
	inactivePlayer(): Player {
		return this.currentTurn == PLAYER_SELF ? this.opponent : this.player;
	}
}

/**
 * Action types for the engine
 */
export const ACTION_PLAY_CARD: i32 = 0;
export const ACTION_ATTACK: i32 = 1;
export const ACTION_END_TURN: i32 = 2;
export const ACTION_HERO_POWER: i32 = 3;
export const ACTION_DRAW_CARD: i32 = 4;

/**
 * Engine action — what the player wants to do
 */
export class EngineAction {
	actionType: i32;         // ACTION_* constant
	cardInstanceId: string;  // For PLAY_CARD: which card from hand
	targetId: string;        // For PLAY_CARD/ATTACK/HERO_POWER: target instance ID
	attackerId: string;      // For ATTACK: attacking minion
	defenderId: string;      // For ATTACK: defending minion or "hero"

	constructor(actionType: i32) {
		this.actionType = actionType;
		this.cardInstanceId = '';
		this.targetId = '';
		this.attackerId = '';
		this.defenderId = '';
	}
}

/**
 * Engine result — returned after applying an action
 */
export class EngineResult {
	state: GameState;
	stateHash: string;
	success: bool;
	error: string;

	constructor(state: GameState) {
		this.state = state;
		this.stateHash = '';
		this.success = true;
		this.error = '';
	}
}
