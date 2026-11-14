import {
	CENTER_TITLE_CINEMA_HOLDERS,
} from '@/game/combat/cinemaLanePolicy';
import {
	FEEDBACK_CASCADE_GAP_MS,
} from '@/game/combat/feedback/combatFeedback';
import type { FeedbackChip } from '@/game/combat/feedback/combatFeedbackStore';
import {
	occupyCinema,
	useCombatFeedbackStore,
} from '@/game/combat/feedback/combatFeedbackStore';
import {
	publishGameMessage,
} from '@/game/effects/feedback/gameMessageAdapter';
import type { GameMessageRequest } from '@/game/effects/feedback/gameMessageCatalog';

export type PresentationLane =
	| 'center-title'
	| 'stack'
	| 'floater'
	| 'zone-vfx';

export { FEEDBACK_CASCADE_GAP_MS };

export interface FeedbackPresentationSnapshot {
	readonly cinemaHolders: readonly string[];
	readonly stack: readonly FeedbackChip[];
	readonly pending: readonly FeedbackChip[];
	readonly suspended: FeedbackChip | null;
}

function centerTitleOccupied(snapshot: FeedbackPresentationSnapshot): boolean {
	return snapshot.cinemaHolders.some((id) => CENTER_TITLE_CINEMA_HOLDERS.has(id));
}

function stackOccupied(snapshot: FeedbackPresentationSnapshot): boolean {
	return snapshot.stack.length > 0
		|| snapshot.pending.length > 0
		|| snapshot.suspended !== null;
}

export function presentationBusyFromSnapshot(
	lane: PresentationLane,
	snapshot: FeedbackPresentationSnapshot | undefined,
): boolean {
	if (!snapshot) return false;
	switch (lane) {
		case 'center-title':
			return centerTitleOccupied(snapshot);
		case 'stack':
			return stackOccupied(snapshot);
		case 'floater':
			return centerTitleOccupied(snapshot) || stackOccupied(snapshot);
		case 'zone-vfx':
			return false;
		default: {
			const exhaustive: never = lane;
			return exhaustive;
		}
	}
}

export function presentationBusy(lane: PresentationLane): boolean {
	return presentationBusyFromSnapshot(lane, useCombatFeedbackStore.getState());
}

/** Stack or center title must finish before the announcement queue advances. */
export function presentationBlocksAnnouncements(
	snapshot: FeedbackPresentationSnapshot | undefined = useCombatFeedbackStore.getState(),
): boolean {
	return presentationBusyFromSnapshot('center-title', snapshot)
		|| presentationBusyFromSnapshot('stack', snapshot);
}

export function canShowFloater(): boolean {
	return !presentationBusy('floater');
}

export function requestCenterTitle(holder: string, dwellMs: number): void {
	if (!CENTER_TITLE_CINEMA_HOLDERS.has(holder)) return;
	occupyCinema(holder, dwellMs);
}

/** Stack-lane gameplay copy — catalog owns tone and dwell. */
export function enqueueGameplayMessage(request: GameMessageRequest): void {
	publishGameMessage(request);
}