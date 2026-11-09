import type { P2PMatchPauseView } from '../../p2p/p2pMatchPauseView';
import type { PokerDecisionView } from './pokerDecisionView';

export type PokerTurnBadgeTurn = 'player' | 'opponent';
export type PokerTurnBadgeTone = 'active' | 'waiting';
export type PokerHudStatusTone = PokerTurnBadgeTone | 'paused' | 'opponent';

export interface PokerTurnBadgePresentation {
	readonly turn: PokerTurnBadgeTurn;
	readonly tone: PokerTurnBadgeTone;
	readonly className: string;
	readonly kicker: string;
	readonly main: string;
	readonly ariaLabel: string;
}

export interface PokerHudStatusPresentation {
	readonly tone: PokerHudStatusTone;
	readonly label: string;
	readonly detail: string;
	readonly ariaLabel: string;
}

/**
 * Presents the canonical poker decision state in the HUD's existing status chip.
 * A local turn is highlighted only when its actions are actually enabled.
 */
export function getPokerHudStatusPresentation(
	decisionView: Pick<PokerDecisionView, 'status' | 'localCanAct' | 'statusLabel' | 'statusDetail'> | null | undefined,
	pauseView?: Pick<P2PMatchPauseView, 'kind' | 'title' | 'detail'> | null,
): PokerHudStatusPresentation {
	if (pauseView) {
		const label = pauseView.kind === 'reconnecting'
			? 'Reconnecting'
			: pauseView.kind === 'integrity'
				? 'Integrity Paused'
				: 'Match Interrupted';
		return {
			tone: 'paused',
			label,
			detail: pauseView.detail,
			ariaLabel: `${pauseView.title}. ${pauseView.detail}`,
		};
	}

	if (!decisionView) {
		return {
			tone: 'waiting',
			label: 'Syncing',
			detail: 'Poker decision state unavailable',
			ariaLabel: 'Syncing. Poker decision state unavailable.',
		};
	}

	const actionable = decisionView.status === 'local_decision' && decisionView.localCanAct;
	const label = decisionView.status === 'local_decision' && !decisionView.localCanAct
		? 'Decision Locked'
		: decisionView.statusLabel;
	return {
		tone: actionable ? 'active' : decisionView.status === 'remote_decision' ? 'opponent' : 'waiting',
		label,
		detail: decisionView.statusDetail,
		ariaLabel: `${label}. ${decisionView.statusDetail}.`,
	};
}

export function getPokerTurnBadgePresentation(
	currentTurn: PokerTurnBadgeTurn | undefined
): PokerTurnBadgePresentation | null {
	if (!currentTurn) return null;

	if (currentTurn === 'player') {
		return {
			turn: 'player',
			tone: 'active',
			className: 'persistent-turn-badge player-turn',
			kicker: 'Your',
			main: 'Turn',
			ariaLabel: 'Your turn. Actions are available.',
		};
	}

	return {
		turn: 'opponent',
		tone: 'waiting',
		className: 'persistent-turn-badge opponent-turn',
		kicker: 'Enemy',
		main: 'Turn',
		ariaLabel: 'Enemy turn. Waiting for the opponent.',
	};
}
