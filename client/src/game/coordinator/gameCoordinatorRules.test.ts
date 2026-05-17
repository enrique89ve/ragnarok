import { describe, expect, it } from 'vitest';
import type { CampaignChapter, CampaignMission } from '../campaign';
import type { ArmySelection, ChessPiece, ChessPieceHero } from '../types/ChessTypes';
import { createP2PViewerPerspective } from '../p2p/p2pPerspective';
import {
  buildPetDataFromChessPiece,
  deriveDeterministicPokerCombat,
  derivePokerCombatHandoff,
  getArmyForOwner,
  getChessRealmClass,
  getCombatSlotMapping,
  getInitialGameOverSubPhase,
  getRealmDisplayName,
  getWinnerFromGameStatus,
  resolveVisualRealm,
} from './gameCoordinatorRules';

function makeHero(id: string, name: string, norseHeroId?: string): ChessPieceHero {
  return {
    id,
    name,
    norseHeroId,
    heroClass: 'neutral',
    description: `${name} description`,
  };
}

const army: ArmySelection = {
  king: makeHero('king-hero', 'Odin', 'odin'),
  queen: makeHero('queen-hero', 'Frigg', 'frigg'),
  rook: makeHero('rook-hero', 'Thor', 'thor'),
  bishop: makeHero('bishop-hero', 'Baldur', 'baldur'),
  knight: makeHero('knight-hero', 'Freya', 'freya'),
};

const opponentArmy: ArmySelection = {
  king: makeHero('opponent-king-hero', 'Ymir', 'ymir'),
  queen: makeHero('opponent-queen-hero', 'Hel', 'hel'),
  rook: makeHero('opponent-rook-hero', 'Surtr', 'surtr'),
  bishop: makeHero('opponent-bishop-hero', 'Mimir', 'mimir'),
  knight: makeHero('opponent-knight-hero', 'Loki', 'loki'),
};

const chessPiece: ChessPiece = {
  id: 'piece-1',
  type: 'rook',
  owner: 'player',
  position: { row: 0, col: 0 },
  health: 72,
  maxHealth: 120,
  stamina: 20,
  heroClass: 'neutral',
  heroName: 'Fallback Rook',
  deckCardIds: [],
  hasSpells: true,
  hasMoved: false,
  element: 'neutral',
};

function makePiece(overrides: Partial<ChessPiece>): ChessPiece {
  return {
    ...chessPiece,
    ...overrides,
    position: overrides.position ?? chessPiece.position,
    deckCardIds: overrides.deckCardIds ?? chessPiece.deckCardIds,
  };
}

const missionWithCinematics: CampaignMission = {
  id: 'mission-1',
  chapterId: 'chapter-1',
  missionNumber: 1,
  name: 'Test Mission',
  description: 'Test mission',
  narrativeBefore: '',
  narrativeAfter: '',
  aiHeroId: 'ai-hero',
  aiHeroClass: 'neutral',
  aiDeckCardIds: [],
  aiProfile: {
    aggression: 0.5,
    efficiency: 0.5,
    bluffFrequency: 0.5,
    tightness: 0.5,
    usesHeroPower: false,
    prioritizeFace: false,
  },
  bossRules: [],
  prerequisiteIds: [],
  rewards: [],
  victoryCinematic: [{ narration: 'Victory' }],
  defeatCinematic: [{ narration: 'Defeat' }],
  storyBridge: [{ narration: 'Bridge' }],
};

const campaignData: { readonly mission: CampaignMission; readonly chapter: CampaignChapter } = {
  mission: missionWithCinematics,
  chapter: {
    id: 'chapter-1',
    name: 'Test Chapter',
    faction: 'norse',
    description: 'Test chapter',
    missions: [missionWithCinematics],
    chapterReward: [],
  },
};

describe('gameCoordinatorRules', () => {
  it('maps open campaign realms into canonical visual realm ids', () => {
    expect(resolveVisualRealm('olympus')).toBe('asgard');
    expect(resolveVisualRealm('unknown-realm')).toBe('midgard');
    expect(getRealmDisplayName('asgard')).toBe('Asgard');
    expect(getChessRealmClass({ isCampaign: true, missionRealm: 'olympus', visualRealm: 'asgard' })).toBe('realm-asgard');
    expect(getChessRealmClass({ isCampaign: false, missionRealm: 'olympus', visualRealm: 'asgard' })).toBe('');
  });

  it('keeps the local viewer in the poker player slot', () => {
    // Signature is now boolean: true = local viewer is the chess attacker.
    expect(getCombatSlotMapping(true)).toEqual({
      slotsSwapped: false,
      firstStrikeTarget: 'opponent',
    });
    expect(getCombatSlotMapping(false)).toEqual({
      slotsSwapped: true,
      firstStrikeTarget: 'player',
    });
  });

  it('selects the army by chess owner', () => {
    expect(getArmyForOwner('player', army, opponentArmy)).toBe(army);
    expect(getArmyForOwner('opponent', army, opponentArmy)).toBe(opponentArmy);
    expect(getArmyForOwner('player', null, opponentArmy)).toBeNull();
  });

  it('derives a first-mover poker handoff without leaking adapter choices into TSX', () => {
    const attacker = makePiece({
      id: 'attacker-piece',
      owner: 'player',
      type: 'rook',
      position: { row: 1, col: 2 },
    });
    const defender = makePiece({
      id: 'defender-piece',
      owner: 'opponent',
      type: 'bishop',
      position: { row: 2, col: 2 },
    });
    const plan = derivePokerCombatHandoff({
      attacker,
      defender,
      localArmy: army,
      remoteArmy: opponentArmy,
      perspective: createP2PViewerPerspective('player'),
      matchSeed: 'seed-a',
      chessMoveCount: 7,
      resolvePortrait: heroId => `/portraits/${heroId}.png`,
    });

    if (!plan) throw new Error('expected handoff plan');
    expect(plan.handoff).toMatchObject({
      attacker,
      defender,
      playerArmy: army,
      opponentArmy,
      slotsSwapped: false,
      firstStrikeTarget: 'opponent',
    });
    expect(plan.adapterInit).toMatchObject({
      playerId: 'attacker-piece',
      playerName: 'Thor',
      opponentId: 'defender-piece',
      opponentName: 'Mimir',
      skipMulligan: true,
      playerKingId: 'king-hero',
      opponentKingId: 'opponent-king-hero',
      firstStrikeTarget: 'opponent',
      deterministic: {
        deckSeed: 'seed-a:poker-deck:attacker-piece:defender-piece:7',
        playerRole: 'attacker',
      },
    });
    expect(plan.adapterInit.playerPet.norseHeroId).toBe('thor');
    expect(plan.adapterInit.opponentPet.norseHeroId).toBe('mimir');
  });

  it('derives a second-mover poker handoff with the local defender in the player slot', () => {
    const attacker = makePiece({
      id: 'remote-attacker',
      owner: 'player',
      type: 'rook',
      position: { row: 4, col: 2 },
    });
    const defender = makePiece({
      id: 'local-defender',
      owner: 'opponent',
      type: 'bishop',
      position: { row: 5, col: 2 },
    });
    const plan = derivePokerCombatHandoff({
      attacker,
      defender,
      localArmy: army,
      remoteArmy: opponentArmy,
      perspective: createP2PViewerPerspective('opponent'),
      matchSeed: 'seed-b',
      chessMoveCount: 8,
      resolvePortrait: heroId => `/portraits/${heroId}.png`,
    });

    if (!plan) throw new Error('expected handoff plan');
    expect(plan.handoff.playerArmy).toBe(opponentArmy);
    expect(plan.handoff.opponentArmy).toBe(army);
    expect(plan.handoff.slotsSwapped).toBe(true);
    expect(plan.handoff.firstStrikeTarget).toBe('player');
    expect(plan.adapterInit).toMatchObject({
      playerId: 'local-defender',
      playerName: 'Baldur',
      opponentId: 'remote-attacker',
      opponentName: 'Surtr',
      playerKingId: 'king-hero',
      opponentKingId: 'opponent-king-hero',
      firstStrikeTarget: 'player',
      deterministic: {
        deckSeed: 'seed-b:poker-deck:remote-attacker:local-defender:8',
        playerRole: 'defender',
      },
    });
  });

  it('does not derive a handoff when the local first-mover army is missing', () => {
    const plan = derivePokerCombatHandoff({
      attacker: makePiece({ id: 'attacker-piece', owner: 'player' }),
      defender: makePiece({ id: 'defender-piece', owner: 'opponent' }),
      localArmy: null,
      remoteArmy: opponentArmy,
      perspective: createP2PViewerPerspective('player'),
      matchSeed: 'seed-a',
      chessMoveCount: 7,
      resolvePortrait: heroId => `/portraits/${heroId}.png`,
    });

    expect(plan).toBeNull();
  });

  it('keeps deterministic poker combat ids stable for the same chess handoff', () => {
    const attacker = makePiece({ id: 'attacker-piece', position: { row: 1, col: 1 } });
    const defender = makePiece({ id: 'defender-piece', position: { row: 2, col: 1 } });
    const first = deriveDeterministicPokerCombat({
      matchSeed: 'seed-c',
      attacker,
      defender,
      chessMoveCount: 9,
      slotsSwapped: false,
    });
    const second = deriveDeterministicPokerCombat({
      matchSeed: 'seed-c',
      attacker,
      defender,
      chessMoveCount: 9,
      slotsSwapped: false,
    });
    const nextMove = deriveDeterministicPokerCombat({
      matchSeed: 'seed-c',
      attacker,
      defender,
      chessMoveCount: 10,
      slotsSwapped: false,
    });

    expect(first).toEqual(second);
    expect(first.combatId).not.toBe(nextMove.combatId);
    expect(first.deckSeed).toBe('seed-c:poker-deck:attacker-piece:defender-piece:9');
  });

  it('builds poker pet data from chess piece state and selected army metadata', () => {
    const pet = buildPetDataFromChessPiece({
      piece: chessPiece,
      army,
      resolvePortrait: heroId => `/portraits/${heroId}.png`,
    });

    expect(pet.name).toBe('Thor');
    expect(pet.norseHeroId).toBe('thor');
    expect(pet.imageUrl).toBe('/portraits/thor.png');
    expect(pet.petClass).toBe('standard');
    expect(pet.rarity).toBe('rare');
    expect(pet.stats.currentHealth).toBe(72);
    expect(pet.stats.maxHealth).toBe(120);
    expect(pet.stats.maxStamina).toBe(12);
    expect(pet.stats.currentStamina).toBe(12);
  });

  it('maps chess game status to canonical winner literal', () => {
    expect(getWinnerFromGameStatus('player_wins')).toBe('player');
    expect(getWinnerFromGameStatus('opponent_wins')).toBe('opponent');
    expect(getWinnerFromGameStatus('combat')).toBeNull();
    expect(getWinnerFromGameStatus('playing')).toBeNull();
  });

  describe('getInitialGameOverSubPhase', () => {
    // The function is frame-agnostic: it asks "did I win?" (boolean), so the
    // call-site is responsible for translating canonical/viewer winners into
    // an iWon boolean (see deriveIWonForPhase). The four cases below cover
    // the cinematic-gate truth table.
    it('returns cinematic when I won and victoryCinematic has scenes', () => {
      expect(getInitialGameOverSubPhase({
        iWon: true,
        isCampaign: true,
        campaignData,
      })).toBe('cinematic');
    });

    it('returns cinematic when I lost and defeatCinematic has scenes', () => {
      expect(getInitialGameOverSubPhase({
        iWon: false,
        isCampaign: true,
        campaignData,
      })).toBe('cinematic');
    });

    it('returns result when not in campaign mode regardless of outcome', () => {
      expect(getInitialGameOverSubPhase({
        iWon: true,
        isCampaign: false,
        campaignData,
      })).toBe('result');
      expect(getInitialGameOverSubPhase({
        iWon: false,
        isCampaign: false,
        campaignData,
      })).toBe('result');
    });

    it('returns result when campaign data is missing', () => {
      expect(getInitialGameOverSubPhase({
        iWon: true,
        isCampaign: true,
        campaignData: null,
      })).toBe('result');
    });

    it('returns result when the matching cinematic side has no scenes', () => {
      const missionNoVictory: CampaignMission = {
        ...missionWithCinematics,
        victoryCinematic: undefined,
      };
      const dataNoVictory = { ...campaignData, mission: missionNoVictory };
      expect(getInitialGameOverSubPhase({
        iWon: true,
        isCampaign: true,
        campaignData: dataNoVictory,
      })).toBe('result');

      const missionNoDefeat: CampaignMission = {
        ...missionWithCinematics,
        defeatCinematic: undefined,
      };
      const dataNoDefeat = { ...campaignData, mission: missionNoDefeat };
      expect(getInitialGameOverSubPhase({
        iWon: false,
        isCampaign: true,
        campaignData: dataNoDefeat,
      })).toBe('result');
    });
  });
});
