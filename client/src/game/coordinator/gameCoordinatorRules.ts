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
} from '../types/PokerCombatTypes';
import { DEFAULT_PORTRAIT } from '../utils/art/artMapping';
import type { GameOverSubPhase, GameResult } from '../flow/round/types';

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

export function getCombatSlotMapping(attackerOwner: ChessPiece['owner']): CombatSlotMapping {
  const humanIsAttacker = attackerOwner === 'player';
  return {
    slotsSwapped: !humanIsAttacker,
    firstStrikeTarget: humanIsAttacker ? 'opponent' : 'player',
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

export function getInitialGameOverSubPhase(input: {
  readonly winner: 'player' | 'opponent';
  readonly isCampaign: boolean;
  readonly campaignData: CampaignData;
}): GameOverSubPhase {
  const { winner, isCampaign, campaignData } = input;
  if (!isCampaign || !campaignData) return 'result';

  const hasVictoryCinematic =
    winner === 'player' && (campaignData.mission.victoryCinematic?.length ?? 0) > 0;
  const hasDefeatCinematic =
    winner === 'opponent' && (campaignData.mission.defeatCinematic?.length ?? 0) > 0;

  return hasVictoryCinematic || hasDefeatCinematic ? 'cinematic' : 'result';
}

export function buildGameResult(input: {
  readonly winner: 'player' | 'opponent';
  readonly turnCount: number;
  readonly campaignData: CampaignData;
}): GameResult {
  return {
    winner: input.winner,
    playerTurnCount: input.turnCount,
    victoryCinematic: input.campaignData?.mission.victoryCinematic ?? null,
    defeatCinematic: input.campaignData?.mission.defeatCinematic ?? null,
    storyBridge: input.campaignData?.mission.storyBridge ?? null,
  };
}
