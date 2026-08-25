import { CombatPhase } from '../../types/PokerCombatTypes';
import type { PokerTurnProcessMode } from './pokerTurnPolicy';

export type SpellcraftDecisionView =
	| { readonly status: 'inactive'; readonly canPlayCards: false; readonly canSubmitReady: false }
	| { readonly status: 'mulligan'; readonly canPlayCards: false; readonly canSubmitReady: false }
	| { readonly status: 'disconnected'; readonly canPlayCards: false; readonly canSubmitReady: false }
	| { readonly status: 'deciding'; readonly canPlayCards: true; readonly canSubmitReady: boolean }
	| { readonly status: 'waiting_for_opponent'; readonly canPlayCards: false; readonly canSubmitReady: false }
	| { readonly status: 'resolving'; readonly canPlayCards: false; readonly canSubmitReady: false };

export interface SpellcraftDecisionInput {
	readonly phase: CombatPhase | null | undefined;
	readonly isActive: boolean;
	readonly isMulliganActive: boolean;
	readonly processMode: PokerTurnProcessMode;
	readonly isTransportConnected: boolean;
	readonly isPlayerReady: boolean;
	readonly isOpponentReady: boolean;
	readonly peerReadyIntentAvailable?: boolean;
}

export function deriveSpellcraftDecision(input: SpellcraftDecisionInput): SpellcraftDecisionView {
	if (!input.isActive || input.phase !== CombatPhase.SPELL_PET) {
		return { status: 'inactive', canPlayCards: false, canSubmitReady: false };
	}
	if (input.isMulliganActive) {
		return { status: 'mulligan', canPlayCards: false, canSubmitReady: false };
	}
	if (input.processMode === 'p2p' && !input.isTransportConnected) {
		return { status: 'disconnected', canPlayCards: false, canSubmitReady: false };
	}
	if (input.isPlayerReady && input.isOpponentReady) {
		return { status: 'resolving', canPlayCards: false, canSubmitReady: false };
	}
	if (input.isPlayerReady) {
		return { status: 'waiting_for_opponent', canPlayCards: false, canSubmitReady: false };
	}

	return {
		status: 'deciding',
		canPlayCards: true,
		canSubmitReady: input.processMode === 'local_ai' || input.peerReadyIntentAvailable === true,
	};
}

export function shouldPrepareLocalAiSpellcraftOpponent(input: {
	readonly phase: CombatPhase | null | undefined;
	readonly isActive: boolean;
	readonly isMulliganActive: boolean;
	readonly processMode: PokerTurnProcessMode;
	readonly setupAlreadyApplied: boolean;
}): boolean {
	return input.isActive
		&& !input.isMulliganActive
		&& input.phase === CombatPhase.SPELL_PET
		&& input.processMode === 'local_ai'
		&& !input.setupAlreadyApplied;
}

export function submitSpellcraftReadyIntent(input: {
	readonly processMode: PokerTurnProcessMode;
	readonly combatId: string;
	readonly handNumber: number;
	readonly playerId: string;
	readonly sendPeerReady: ((intent: {
		readonly combatId: string;
		readonly handNumber: number;
		readonly actorPlayerId: string;
	}) => { readonly status: 'sent' } | { readonly status: 'rejected'; readonly reason: string }) | null;
	readonly applyLocalReady: (playerId: string) => void;
	readonly maybeClose: () => void;
}): 'peer_sent' | 'peer_rejected' | 'local_applied' | 'unavailable' {
	if (input.processMode === 'p2p') {
		if (!input.sendPeerReady) return 'unavailable';
		const result = input.sendPeerReady({
			combatId: input.combatId,
			handNumber: input.handNumber,
			actorPlayerId: input.playerId,
		});
		return result.status === 'sent' ? 'peer_sent' : 'peer_rejected';
	}
	input.applyLocalReady(input.playerId);
	input.maybeClose();
	return 'local_applied';
}

export function shouldTickSpellcraftClock(input: {
	readonly phase: CombatPhase | null | undefined;
	readonly isPlayerReady: boolean;
}): boolean {
	return input.phase === CombatPhase.SPELL_PET && !input.isPlayerReady;
}

export function getSpellcraftReadyCopy(view: SpellcraftDecisionView): {
	readonly label: string;
	readonly detail: string;
} {
	switch (view.status) {
		case 'deciding':
			return view.canSubmitReady
				? {
					label: 'Ready',
					detail: 'Play any affordable cards before the clock ends, then Ready.',
				}
				: {
					label: 'Ready sync pending',
					detail: 'Peer readiness is not available until synchronization is active.',
				};
		case 'waiting_for_opponent':
			return { label: 'Ready', detail: 'Waiting for the opponent to finish Spellcraft.' };
		case 'disconnected':
			return { label: 'Reconnect', detail: 'Spellcraft is paused while the peer reconnects.' };
		case 'resolving':
			return { label: 'Ready', detail: 'Both sides are ready. Advancing the battle.' };
		case 'mulligan':
			return { label: 'Ready', detail: 'Complete the mulligan before Spellcraft.' };
		case 'inactive':
			return { label: 'Ready', detail: 'Spellcraft is not active.' };
	}
}
