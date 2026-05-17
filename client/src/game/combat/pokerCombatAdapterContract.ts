import type {
  PetData,
  PokerCombatDeterministicOptions,
} from '../types/PokerCombatTypes';

export type PokerCombatAdapterInit = {
  readonly playerId: string;
  readonly playerName: string;
  readonly playerPet: PetData;
  readonly opponentId: string;
  readonly opponentName: string;
  readonly opponentPet: PetData;
  readonly skipMulligan: boolean;
  readonly playerKingId: string | undefined;
  readonly opponentKingId: string | undefined;
  readonly firstStrikeTarget: 'player' | 'opponent' | undefined;
  readonly deterministic: PokerCombatDeterministicOptions | undefined;
};
