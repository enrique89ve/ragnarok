import { CombatPhase, PokerPosition } from '../../types/PokerCombatTypes';
import { debug } from '../../config/debugConfig';

export interface ActivePlayerContext {
  playerPosition: PokerPosition;
  playerId: string;
  opponentId: string;
}

export function getSmallBlindPlayerId(ctx: ActivePlayerContext): string {
  return ctx.playerPosition === 'small_blind' ? ctx.playerId : ctx.opponentId;
}

export function getBigBlindPlayerId(ctx: ActivePlayerContext): string {
  return ctx.playerPosition === 'big_blind' ? ctx.playerId : ctx.opponentId;
}

export function getActivePlayerForPhase(
  phase: CombatPhase,
  ctx: ActivePlayerContext
): string | null {
  switch (phase) {
    // Pre-flop: SB (dealer) acts first in heads-up poker
    case CombatPhase.SPELL_PET:
    case CombatPhase.PRE_FLOP:
      return getSmallBlindPlayerId(ctx);

    // Post-flop: BB acts first in heads-up poker (SB/dealer is last to act)
    case CombatPhase.FAITH:
    case CombatPhase.FORESIGHT:
    case CombatPhase.DESTINY:
      return getBigBlindPlayerId(ctx);

    case CombatPhase.MULLIGAN:
    case CombatPhase.FIRST_STRIKE:
    case CombatPhase.RESOLUTION:
    default:
      return null;
  }
}

export function isBettingPhase(phase: CombatPhase): boolean {
  return phase === CombatPhase.PRE_FLOP ||
         phase === CombatPhase.FAITH ||
         phase === CombatPhase.FORESIGHT ||
         phase === CombatPhase.DESTINY;
}

export function validateActivePlayer(
  phase: CombatPhase,
  activePlayerId: string | null,
  source: string
): void {
  if (isBettingPhase(phase) && activePlayerId === null) {
    debug.error(
      `[POKER BUG] activePlayerId is null during betting phase ${phase} at ${source}. ` +
      `This will cause buttons to freeze. Check phase transition logic.`
    );
  }
}
