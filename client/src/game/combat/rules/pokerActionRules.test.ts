import { beforeEach, describe, expect, it } from 'vitest';
import {
  CombatAction,
  CombatPhase,
  DEFAULT_BLIND_CONFIG,
  type PetData,
  type PokerCombatState,
} from '../../types/PokerCombatTypes';
import { useUnifiedCombatStore } from '../../stores/unifiedCombatStore';
import { getShowdownCoinFlipRoll } from '../../stores/combat/pokerCombatSlice';
import { getPokerActionPermissions, validatePokerActionIntent } from './pokerActionRules';

function createPet(id: string, currentHealth = 100, currentStamina = 10): PetData {
  return {
    id,
    name: id,
    rarity: 'common',
    petClass: 'standard',
    stats: {
      maxHealth: 100,
      currentHealth,
      maxStamina: 10,
      currentStamina,
      speed: 1,
      attack: 1,
      rage: 0,
      maxRage: 0,
      level: 1,
      element: 'neutral',
    },
    abilities: [],
    spellSlots: 0,
    equippedSpells: [],
  };
}

function createCombatState(overrides: Partial<PokerCombatState> = {}): PokerCombatState {
  const state: PokerCombatState = {
    combatId: 'combat-test',
    phase: CombatPhase.FAITH,
    player: {
      playerId: 'player-piece',
      playerName: 'Player',
      pet: createPet('player-pet'),
      holeCards: [],
      hpCommitted: 0,
      preBlindHealth: 100,
      heroArmor: 0,
      statusEffects: [],
      mana: 1,
      maxMana: 9,
      isReady: false,
    },
    opponent: {
      playerId: 'opponent-piece',
      playerName: 'Opponent',
      pet: createPet('opponent-pet'),
      holeCards: [],
      hpCommitted: 0,
      preBlindHealth: 100,
      heroArmor: 0,
      statusEffects: [],
      mana: 1,
      maxMana: 9,
      isReady: false,
    },
    communityCards: { faith: [] },
    currentBet: 0,
    pot: 0,
    turnTimer: 60,
    maxTurnTime: 60,
    turnId: 'combat-test:faith:player-piece:0',
    turnStartedAtMs: 0,
    turnDeadlineAtMs: 60_000,
    actionHistory: [],
    minBet: 10,
    openerIsPlayer: true,
    preflopBetMade: false,
    blindConfig: DEFAULT_BLIND_CONFIG,
    playerPosition: 'small_blind',
    opponentPosition: 'big_blind',
    blindsPosted: true,
    isAllInShowdown: false,
    activePlayerId: 'player-piece',
    actionsThisRound: 0,
  };

  return {
    ...state,
    ...overrides,
  };
}

describe('poker action intent rules', () => {
  it('rejects stale setup-phase betting actions before they reach the P2P store', () => {
    const state = createCombatState({ phase: CombatPhase.SPELL_PET });

    const result = validatePokerActionIntent({
      combatState: state,
      playerId: 'player-piece',
      action: CombatAction.ATTACK,
      hpCommitment: 10,
    });

    expect(result).toMatchObject({ ok: false, reason: 'phase_not_actionable' });
  });

  it('rejects checks when a peer must answer an existing wager', () => {
    const state = createCombatState({
      currentBet: 20,
      player: {
        ...createCombatState().player,
        hpCommitted: 5,
      },
    });

    const result = validatePokerActionIntent({
      combatState: state,
      playerId: 'player-piece',
      action: CombatAction.DEFEND,
    });

    expect(result).toMatchObject({ ok: false, reason: 'check_not_allowed' });
  });

  it('rejects opening bets above the stamina-derived capacity', () => {
    const state = createCombatState({
      player: {
        ...createCombatState().player,
        pet: createPet('player-pet', 100, 1),
      },
    });

    const result = validatePokerActionIntent({
      combatState: state,
      playerId: 'player-piece',
      action: CombatAction.ATTACK,
      hpCommitment: 20,
    });

    expect(result).toMatchObject({ ok: false, reason: 'bet_exceeds_capacity' });
  });

  it('rejects actions while an all-in showdown is auto-advancing', () => {
    const state = createCombatState({ isAllInShowdown: true });

    const result = validatePokerActionIntent({
      combatState: state,
      playerId: 'player-piece',
      action: CombatAction.DEFEND,
    });

    expect(result).toMatchObject({ ok: false, reason: 'all_in_showdown' });
  });

  it('keeps waiting-for-opponent true after the local actor has locked their action', () => {
    const state = createCombatState({
      activePlayerId: 'opponent-piece',
      player: {
        ...createCombatState().player,
        isReady: true,
      },
      opponent: {
        ...createCombatState().opponent,
        isReady: false,
      },
    });

    const permissions = getPokerActionPermissions(state, true);

    expect(permissions?.isMyTurnToAct).toBe(false);
    expect(permissions?.waitingForOpponent).toBe(true);
  });

  it('keeps fold open when stamina cannot cover an open call', () => {
    const base = createCombatState();
    const permissions = getPokerActionPermissions(createCombatState({
      currentBet: 20,
      player: {
        ...base.player,
        hpCommitted: 5,
        pet: createPet('player-pet', 25, 0),
      },
    }), true);

    expect(permissions?.canCall).toBe(false);
    expect(permissions?.canCheck).toBe(false);
    expect(permissions?.canRaise).toBe(false);
    expect(permissions?.canFold).toBe(true);
    expect(permissions?.availableHP).toBe(0);
  });
});

describe('poker combat store exploit shields', () => {
  beforeEach(() => {
    useUnifiedCombatStore.getState().reset();
  });

  it('does not mutate combat state for over-cap peer bets', () => {
    useUnifiedCombatStore.setState({
      pokerCombatState: createCombatState({
        player: {
          ...createCombatState().player,
          pet: createPet('player-pet', 100, 1),
        },
      }),
      pokerIsActive: true,
    });

    useUnifiedCombatStore.getState().performPokerAction('player-piece', CombatAction.ATTACK, 20);

    const state = useUnifiedCombatStore.getState().pokerCombatState;
    expect(state?.player.hpCommitted).toBe(0);
    expect(state?.player.pet.stats.currentHealth).toBe(100);
    expect(state?.pot).toBe(0);
  });

  it('caps valid peer bets by stamina and records the normalized commitment', () => {
    useUnifiedCombatStore.setState({
      pokerCombatState: createCombatState({
        player: {
          ...createCombatState().player,
          pet: createPet('player-pet', 100, 1),
        },
      }),
      pokerIsActive: true,
    });

    useUnifiedCombatStore.getState().performPokerAction('player-piece', CombatAction.ATTACK, 10);

    const state = useUnifiedCombatStore.getState().pokerCombatState;
    expect(state?.player.hpCommitted).toBe(10);
    expect(state?.player.pet.stats.currentHealth).toBe(90);
    expect(state?.player.pet.stats.currentStamina).toBe(0);
    expect(state?.actionHistory.at(-1)?.hpCommitment).toBe(10);
  });

  it('treats an under-cap call as an all-in showdown and refunds unmatched overage', () => {
    useUnifiedCombatStore.setState({
      pokerCombatState: createCombatState({
        currentBet: 20,
        pot: 25,
        player: {
          ...createCombatState().player,
          pet: createPet('player-pet', 100, 1),
          hpCommitted: 5,
        },
        opponent: {
          ...createCombatState().opponent,
          pet: createPet('opponent-pet', 80, 10),
          hpCommitted: 20,
        },
      }),
      pokerIsActive: true,
    });

    useUnifiedCombatStore.getState().performPokerAction('player-piece', CombatAction.ENGAGE);

    const state = useUnifiedCombatStore.getState().pokerCombatState;
    expect(state?.player.hpCommitted).toBe(15);
    expect(state?.player.pet.stats.currentHealth).toBe(90);
    expect(state?.opponent.hpCommitted).toBe(15);
    expect(state?.opponent.pet.stats.currentHealth).toBe(85);
    expect(state?.currentBet).toBe(15);
    expect(state?.pot).toBe(30);
    expect(state?.isAllInShowdown).toBe(true);
  });

  it('ignores peer turn-clock announcements with inflated duration', () => {
    useUnifiedCombatStore.setState({
      pokerCombatState: createCombatState({
        maxTurnTime: 60,
        turnId: 'combat-test:faith:player-piece:0',
        turnStartedAtMs: 0,
        turnDeadlineAtMs: 60_000,
      }),
      pokerIsActive: true,
    });

    useUnifiedCombatStore.getState().syncPokerTurnClock({
      combatId: 'combat-test',
      turnId: 'combat-test:faith:player-piece:0',
      phase: CombatPhase.FAITH,
      activePlayerId: 'player-piece',
      actionsThisRound: 0,
      durationMs: 600_000,
      receivedAtMs: 1_000,
    });

    const state = useUnifiedCombatStore.getState().pokerCombatState;
    expect(state?.turnStartedAtMs).toBe(0);
    expect(state?.turnDeadlineAtMs).toBe(60_000);
  });

  it('derives the same pre-flop turn identity from mirrored P2P combat slots', () => {
    const store = useUnifiedCombatStore.getState();
    store.initializePokerCombat(
      'attacker-piece',
      'Attacker',
      createPet('attacker-pet'),
      'defender-piece',
      'Defender',
      createPet('defender-pet'),
      true,
      undefined,
      undefined,
      undefined,
      {
        combatId: 'combat-canon',
        deckSeed: 'deck-canon',
        playerRole: 'attacker',
      },
    );
    store.markBothPlayersReady();
    store.advancePokerPhase();

    const attackerView = useUnifiedCombatStore.getState().pokerCombatState;
    expect(attackerView).toMatchObject({
      phase: CombatPhase.PRE_FLOP,
      activePlayerId: 'attacker-piece',
      playerPosition: 'small_blind',
      opponentPosition: 'big_blind',
      turnId: 'combat-canon:pre_flop:attacker-piece:0',
    });

    useUnifiedCombatStore.getState().reset();
    const defenderStore = useUnifiedCombatStore.getState();
    defenderStore.initializePokerCombat(
      'defender-piece',
      'Defender',
      createPet('defender-pet'),
      'attacker-piece',
      'Attacker',
      createPet('attacker-pet'),
      true,
      undefined,
      undefined,
      undefined,
      {
        combatId: 'combat-canon',
        deckSeed: 'deck-canon',
        playerRole: 'defender',
      },
    );
    defenderStore.markBothPlayersReady();
    defenderStore.advancePokerPhase();

    const defenderView = useUnifiedCombatStore.getState().pokerCombatState;
    expect(defenderView).toMatchObject({
      phase: CombatPhase.PRE_FLOP,
      activePlayerId: 'attacker-piece',
      playerPosition: 'big_blind',
      opponentPosition: 'small_blind',
      turnId: attackerView?.turnId,
    });
  });
});

describe('deterministic poker showdown helpers', () => {
  it('derives stable showdown coin-flip rolls from combat metadata', () => {
    const input = {
      combatId: 'combat-test',
      deterministicDeckSeed: 'deck-seed',
      side: 'player' as const,
      index: 0,
    };

    expect(getShowdownCoinFlipRoll(input)).toBe(getShowdownCoinFlipRoll(input));
    expect(getShowdownCoinFlipRoll(input)).not.toBe(getShowdownCoinFlipRoll({
      ...input,
      index: 1,
    }));
  });
});
