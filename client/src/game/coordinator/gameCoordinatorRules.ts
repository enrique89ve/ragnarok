import type { CampaignChapter, CampaignMission } from '../campaign';
import type {
  ArmySelection,
  ChessGameStatus,
  ChessPiece,
  ChessPieceType,
} from '../types/ChessTypes';
import type { RealmId } from '../types/NorseTypes';
import {
  calculateStaminaFromHP,
  DEFAULT_PET_STATS,
  type PetData,
  type PokerCombatDeterministicOptions,
} from '../types/PokerCombatTypes';
import type { PokerCombatAdapterInit } from '../combat/pokerCombatAdapterContract';
import {
  canonicalOwnerToViewerActor,
  type P2PViewerPerspective,
} from '../p2p/p2pPerspective';
import { createSeededIdGen } from '../utils/seededRng';
import { DEFAULT_PORTRAIT } from '../utils/art/artMapping';
import type { CombatHandoff, GameOverSubPhase } from '../flow/round/types';

export type CampaignData = {
  readonly mission: CampaignMission;
  readonly chapter: CampaignChapter;
} | null;

export type CombatSlotMapping = {
  readonly slotsSwapped: boolean;
  readonly firstStrikeTarget: 'player' | 'opponent';
};

export type BuildPetDataInput = {
  readonly piece: ChessPiece;
  readonly army: ArmySelection;
  readonly resolvePortrait: (norseHeroId: string) => string | undefined;
};

export type PokerCombatHandoffPlan = {
  readonly handoff: CombatHandoff;
  readonly adapterInit: PokerCombatAdapterInit;
};

export type DerivePokerCombatHandoffInput = {
  readonly attacker: ChessPiece;
  readonly defender: ChessPiece;
  readonly localArmy: ArmySelection | null;
  readonly remoteArmy: ArmySelection;
  readonly perspective: P2PViewerPerspective;
  readonly matchSeed: string | null | undefined;
  readonly chessMoveCount: number;
  readonly resolvePortrait: (norseHeroId: string) => string | undefined;
};

export type DeriveDeterministicPokerCombatInput = {
  readonly matchSeed: string;
  readonly attacker: Pick<ChessPiece, 'id' | 'position'>;
  readonly defender: Pick<ChessPiece, 'id' | 'position'>;
  readonly chessMoveCount: number;
  readonly slotsSwapped: boolean;
};

/*
  Visual realm mapping is a coordinator rule, not React state. Campaign
  missions may come from any pantheon, but board/combat skins currently use
  canonical Norse visual IDs.
*/
const REALM_VISUAL_MAP: Record<string, RealmId> = {
  ginnungagap: 'ginnungagap',
  midgard: 'midgard',
  asgard: 'asgard',
  niflheim: 'niflheim',
  muspelheim: 'muspelheim',
  helheim: 'helheim',
  jotunheim: 'jotunheim',
  alfheim: 'alfheim',
  vanaheim: 'vanaheim',
  svartalfheim: 'svartalfheim',
  chaos: 'ginnungagap',
  gaia_earth: 'vanaheim',
  mount_othrys: 'jotunheim',
  tartarus: 'helheim',
  olympus: 'asgard',
  cilicia: 'muspelheim',
  phlegra: 'muspelheim',
  athens: 'midgard',
  heliopolis: 'asgard',
  thebes: 'midgard',
  duat: 'helheim',
  memphis: 'svartalfheim',
  abydos: 'midgard',
  tara: 'vanaheim',
  emain_macha: 'midgard',
  cruachan: 'jotunheim',
  tir_na_nog: 'alfheim',
  mag_mell: 'alfheim',
  celestial_court: 'asgard',
  takamagahara: 'asgard',
  yomi: 'helheim',
  mount_meru: 'jotunheim',
  diyu: 'muspelheim',
};

const REALM_DISPLAY_NAMES: Record<RealmId, string> = {
  ginnungagap: 'Ginnungagap',
  midgard: 'Midgard',
  asgard: 'Asgard',
  niflheim: 'Niflheim',
  muspelheim: 'Muspelheim',
  helheim: 'Helheim',
  jotunheim: 'Jotunheim',
  alfheim: 'Alfheim',
  vanaheim: 'Vanaheim',
  svartalfheim: 'Svartalfheim',
};

function getPetClass(pieceType: ChessPieceType): PetData['petClass'] {
  if (pieceType === 'queen') return 'queen';
  if (pieceType === 'king') return 'king';
  if (pieceType === 'pawn') return 'pawn';
  return 'standard';
}

function getPetRarity(pieceType: ChessPieceType): PetData['rarity'] {
  if (pieceType === 'king') return 'mythic';
  if (pieceType === 'queen') return 'epic';
  if (pieceType === 'pawn') return 'common';
  return 'rare';
}

function getArmyHero(piece: ChessPiece, army: ArmySelection) {
  if (piece.type === 'pawn') return null;
  return army[piece.type];
}

export function resolveVisualRealm(missionRealm: string | undefined | null): RealmId {
  if (!missionRealm) return 'midgard';
  return REALM_VISUAL_MAP[missionRealm] ?? 'midgard';
}

export function getRealmDisplayName(visualRealm: RealmId): string {
  return REALM_DISPLAY_NAMES[visualRealm];
}

export function getChessRealmClass(input: {
  readonly isCampaign: boolean;
  readonly missionRealm: string | undefined;
  readonly visualRealm: RealmId;
}): string {
  if (!input.isCampaign || !input.missionRealm) return '';
  return `realm-${input.visualRealm}`;
}

export function getFinaleClass(input: {
  readonly isCampaign: boolean;
  readonly campaignData: CampaignData;
}): string {
  if (!input.isCampaign || !input.campaignData?.mission.isChapterFinale) return '';
  return 'mission-finale';
}

export function getArmyForOwner(
  owner: ChessPiece['owner'],
  playerArmy: ArmySelection | null,
  opponentArmy: ArmySelection,
): ArmySelection | null {
  return owner === 'player' ? playerArmy : opponentArmy;
}

/**
 * Decide whether to swap poker combat slots so the local viewer's piece
 * always renders in the "player" slot of the poker UI. `localViewerIsAttacker`
 * = true when the chess attacker is owned by the local viewer's canonical side.
 * Caller is responsible for computing this (e.g.,
 * `attacker.owner === myCanonicalSide`).
 *
 * `firstStrikeTarget` is in poker-UI vocabulary ('player' = local viewer's
 * pet slot regardless of canonical chess side).
 */
export function getCombatSlotMapping(localViewerIsAttacker: boolean): CombatSlotMapping {
  return {
    slotsSwapped: !localViewerIsAttacker,
    firstStrikeTarget: localViewerIsAttacker ? 'opponent' : 'player',
  };
}

export function deriveDeterministicPokerCombat(
  input: DeriveDeterministicPokerCombatInput,
): PokerCombatDeterministicOptions {
  const combatScope = [
    'poker-combat',
    input.attacker.id,
    input.defender.id,
    input.attacker.position.row,
    input.attacker.position.col,
    input.defender.position.row,
    input.defender.position.col,
    input.chessMoveCount,
  ].join(':');

  return {
    combatId: createSeededIdGen(input.matchSeed, combatScope)(),
    deckSeed: `${input.matchSeed}:poker-deck:${input.attacker.id}:${input.defender.id}:${input.chessMoveCount}`,
    playerRole: input.slotsSwapped ? 'defender' : 'attacker',
  };
}

export function derivePokerCombatHandoff(
  input: DerivePokerCombatHandoffInput,
): PokerCombatHandoffPlan | null {
  const canonicalArmies = input.perspective.localCanonicalSide === 'player'
    ? {
        player: input.localArmy,
        opponent: input.remoteArmy,
      }
    : {
        player: input.remoteArmy,
        opponent: input.localArmy ?? input.remoteArmy,
      };
  const attackerArmy = getArmyForOwner(input.attacker.owner, canonicalArmies.player, canonicalArmies.opponent);
  const defenderArmy = getArmyForOwner(input.defender.owner, canonicalArmies.player, canonicalArmies.opponent);

  if (!attackerArmy || !defenderArmy) return null;

  const attackerPet = buildPetDataFromChessPiece({
    piece: input.attacker,
    army: attackerArmy,
    resolvePortrait: input.resolvePortrait,
  });
  const defenderPet = buildPetDataFromChessPiece({
    piece: input.defender,
    army: defenderArmy,
    resolvePortrait: input.resolvePortrait,
  });
  const attackerActor = canonicalOwnerToViewerActor(input.attacker.owner, input.perspective);
  const defenderActor = canonicalOwnerToViewerActor(input.defender.owner, input.perspective);
  const attackerName = attackerPet.name || `${attackerActor === 'local' ? 'Player' : 'Opponent'} ${input.attacker.type}`;
  const defenderName = defenderPet.name || `${defenderActor === 'local' ? 'Player' : 'Opponent'} ${input.defender.type}`;
  const { slotsSwapped, firstStrikeTarget } = getCombatSlotMapping(attackerActor === 'local');
  const deterministic = input.matchSeed
    ? deriveDeterministicPokerCombat({
        matchSeed: input.matchSeed,
        attacker: input.attacker,
        defender: input.defender,
        chessMoveCount: input.chessMoveCount,
        slotsSwapped,
      })
    : undefined;

  const adapterInit: PokerCombatAdapterInit = !slotsSwapped
    ? {
        playerId: input.attacker.id,
        playerName: attackerName,
        playerPet: attackerPet,
        opponentId: input.defender.id,
        opponentName: defenderName,
        opponentPet: defenderPet,
        skipMulligan: true,
        playerKingId: attackerArmy.king?.id,
        opponentKingId: defenderArmy.king?.id,
        firstStrikeTarget,
        deterministic,
      }
    : {
        playerId: input.defender.id,
        playerName: defenderName,
        playerPet: defenderPet,
        opponentId: input.attacker.id,
        opponentName: attackerName,
        opponentPet: attackerPet,
        skipMulligan: true,
        playerKingId: defenderArmy.king?.id,
        opponentKingId: attackerArmy.king?.id,
        firstStrikeTarget,
        deterministic,
      };

  return {
    handoff: {
      attacker: input.attacker,
      defender: input.defender,
      playerArmy: attackerArmy,
      opponentArmy: defenderArmy,
      slotsSwapped,
      firstStrikeTarget,
    },
    adapterInit,
  };
}

export function buildPetDataFromChessPiece(input: BuildPetDataInput): PetData {
  const { piece, army, resolvePortrait } = input;
  const petClass = getPetClass(piece.type);
  const baseStats = DEFAULT_PET_STATS[petClass];
  const hero = getArmyHero(piece, army);
  const heroName = hero?.name ?? piece.heroName ?? 'Unknown Warrior';
  const norseHeroId = hero?.norseHeroId;
  const heroPortrait = norseHeroId ? resolvePortrait(norseHeroId) : undefined;
  const maxStamina = calculateStaminaFromHP(piece.maxHealth);

  return {
    id: piece.id,
    name: heroName,
    imageUrl: heroPortrait ?? DEFAULT_PORTRAIT,
    rarity: getPetRarity(piece.type),
    petClass,
    stats: {
      ...baseStats,
      element: 'neutral',
      currentHealth: piece.health,
      maxHealth: piece.maxHealth,
      maxStamina,
      currentStamina: Math.min(piece.stamina, maxStamina),
    },
    abilities: [],
    spellSlots: piece.hasSpells ? 10 : 0,
    equippedSpells: [],
    norseHeroId,
  };
}

export function getWinnerFromGameStatus(status: ChessGameStatus): 'player' | 'opponent' | null {
  if (status === 'player_wins') return 'player';
  if (status === 'opponent_wins') return 'opponent';
  return null;
}

/**
 * Frame-agnostic: takes `iWon` (boolean), not a canonical winner.
 * Conflating frames here mis-attributes cinematics for P2P
 * second-movers; callers reduce via `deriveIWonForPhase` first.
 */
export function getInitialGameOverSubPhase(input: {
  readonly iWon: boolean;
  readonly isCampaign: boolean;
  readonly campaignData: CampaignData;
}): GameOverSubPhase {
  const { iWon, isCampaign, campaignData } = input;
  if (!isCampaign || !campaignData) return 'result';

  const hasVictoryCinematic =
    iWon && (campaignData.mission.victoryCinematic?.length ?? 0) > 0;
  const hasDefeatCinematic =
    !iWon && (campaignData.mission.defeatCinematic?.length ?? 0) > 0;

  return hasVictoryCinematic || hasDefeatCinematic ? 'cinematic' : 'result';
}
