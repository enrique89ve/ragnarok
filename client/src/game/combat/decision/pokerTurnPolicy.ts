import {
	UNIVERSAL_POKER_TURN_CLOCK_POLICY,
	type TurnClockPolicy,
} from '../../../../../shared/p2p-wire/pokerTurnClock';

export type PokerTurnProcessMode = 'p2p' | 'local_ai';
export type PokerTurnProfileMode = 'p2p' | 'campaign' | 'vs_ai';
export type PokerTurnActor = 'local_human' | 'remote_peer' | 'remote_ai' | 'none';
export type PokerOpponentKind = 'ai' | 'scripted' | 'peer';

export type PokerTurnPolicy = {
	readonly processMode: PokerTurnProcessMode;
	readonly profileMode: PokerTurnProfileMode;
	readonly actor: PokerTurnActor;
	readonly shouldTickTimer: boolean;
	readonly shouldAutoActOnTimeout: boolean;
	readonly shouldBroadcastTurnStart: boolean;
	readonly shouldScheduleAiDecision: boolean;
	readonly turnClockPolicy: TurnClockPolicy;
};

export function getPokerTurnProcessMode(isP2PCombat: boolean): PokerTurnProcessMode {
	return isP2PCombat ? 'p2p' : 'local_ai';
}

export function getPokerTurnProfileMode(opponentKind: PokerOpponentKind | null | undefined): PokerTurnProfileMode {
	switch (opponentKind) {
		case 'peer':
			return 'p2p';
		case 'scripted':
			return 'campaign';
		case 'ai':
		default:
			return 'vs_ai';
	}
}

function resolvePokerOpponentKind(input: {
	readonly opponentKind?: PokerOpponentKind | null;
	readonly isP2PCombat?: boolean;
	readonly isCampaign?: boolean;
}): PokerOpponentKind {
	if (input.opponentKind) return input.opponentKind;
	if (input.isP2PCombat) return 'peer';
	if (input.isCampaign) return 'scripted';
	return 'ai';
}

export function derivePokerTurnPolicy(input: {
	readonly activePlayerId: string | null | undefined;
	readonly localPlayerId: string;
	readonly remotePlayerId: string;
	readonly opponentKind?: PokerOpponentKind | null;
	readonly isP2PCombat?: boolean;
	readonly isCampaign?: boolean;
}): PokerTurnPolicy {
	const opponentKind = resolvePokerOpponentKind(input);
	const processMode = getPokerTurnProcessMode(opponentKind === 'peer');
	const profileMode = getPokerTurnProfileMode(opponentKind);
	const actor = getPokerTurnActor({
		activePlayerId: input.activePlayerId,
		localPlayerId: input.localPlayerId,
		remotePlayerId: input.remotePlayerId,
		processMode,
	});
	const shouldTickTimer = actor === 'local_human' || actor === 'remote_peer';

	return {
		processMode,
		profileMode,
		actor,
		shouldTickTimer,
		shouldAutoActOnTimeout: actor === 'local_human',
		shouldBroadcastTurnStart: processMode === 'p2p' && actor === 'local_human',
		shouldScheduleAiDecision: actor === 'remote_ai',
		turnClockPolicy: UNIVERSAL_POKER_TURN_CLOCK_POLICY,
	};
}

function getPokerTurnActor(input: {
	readonly activePlayerId: string | null | undefined;
	readonly localPlayerId: string;
	readonly remotePlayerId: string;
	readonly processMode: PokerTurnProcessMode;
}): PokerTurnActor {
	if (!input.activePlayerId) return 'none';
	if (input.activePlayerId === input.localPlayerId) return 'local_human';
	if (input.activePlayerId !== input.remotePlayerId) return 'none';
	return input.processMode === 'p2p' ? 'remote_peer' : 'remote_ai';
}
