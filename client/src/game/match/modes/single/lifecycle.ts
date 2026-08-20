/**
 * Single (practice) match lifecycle handlers.
 *
 * Practice pays no RUNE or ranking. It only stores a local win/loss
 * so the home briefing and History page can show a consecutive streak.
 */

import { resultFromMatchEnd, usePracticeRecordStore } from '../../../data/practiceRecord';
import type { MatchEndContext } from '../../onWinDispatch';
import type { MatchContext } from '../../types';

export function onSingleMatchEnd(ctx: MatchContext, end: MatchEndContext): void {
	if (ctx.opponent.kind !== 'ai') return;
	usePracticeRecordStore.getState().recordPracticeResult({
		matchId: ctx.matchId,
		result: resultFromMatchEnd(end.iWon),
	});
}
