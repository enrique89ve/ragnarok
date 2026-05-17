export type PokerTurnProcessMode = 'p2p' | 'local_ai';
export type PokerTurnProfileMode = 'p2p' | 'campaign' | 'vs_ai';
export type PokerTurnActor = 'local_human' | 'remote_peer' | 'remote_ai' | 'none';

export type PokerTurnPolicy = {
	readonly processMode: PokerTurnProcessMode;
	readonly profileMode: PokerTurnProfileMode;
	readonly actor: PokerTurnActor;
	readonly shouldTickTimer: boolean;
	readonly shouldAutoActOnTimeout: boolean;
	readonly shouldBroadcastTurnStart: boolean;
	readonly shouldScheduleAiDecision: boolean;
	readonly shouldSkipTimerAfterLocalReady: boolean;
};

export function getPokerTurnProcessMode(isP2PCombat: boolean): PokerTurnProcessMode {
	return isP2PCombat ? 'p2p' : 'local_ai';
}

export function getPokerTurnProfileMode(input: {
	readonly isP2PCombat: boolean;
	readonly isCampaign: boolean;
}): PokerTurnProfileMode {
	if (input.isP2PCombat) return 'p2p';
	return input.isCampaign ? 'campaign' : 'vs_ai';
}

export function derivePokerTurnPolicy(input: {
	readonly activePlayerId: string | null | undefined;
	readonly localPlayerId: string;
	readonly remotePlayerId: string;
	readonly localPlayerIsReady: boolean | undefined;
	readonly isP2PCombat: boolean;
	readonly isCampaign?: boolean;
}): PokerTurnPolicy {
	const processMode = getPokerTurnProcessMode(input.isP2PCombat);
	const profileMode = getPokerTurnProfileMode({
		isP2PCombat: input.isP2PCombat,
		isCampaign: input.isCampaign ?? false,
	});
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
		shouldSkipTimerAfterLocalReady: Boolean(input.localPlayerIsReady) && actor !== 'remote_peer',
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
