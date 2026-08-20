/**
 * Single (practice) match lifecycle handlers.
 *
 * Practice pays no RUNE or ranking. The local battle ledger is written
 * by the coordinator through `recordLocalBattleEnd`, not here.
 */

import type { MatchEndContext } from '../../onWinDispatch';
import type { MatchContext } from '../../types';

export function onSingleMatchEnd(_ctx: MatchContext, _end: MatchEndContext): void {
}
