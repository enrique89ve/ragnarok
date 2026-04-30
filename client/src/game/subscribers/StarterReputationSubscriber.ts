import { GameEventBus } from '@/core/events/GameEventBus';
import type { GameEndedEvent } from '@/core/events/GameEvents';
import { useHiveDataStore } from '@/data/HiveDataLayer';
import { isStarterEntitlementCardId } from '@shared/schemas/starterEntitlement';
import { debug } from '../config/debugConfig';
import { useGameStore } from '../stores/gameStore';
import { useStarterStore } from '../stores/starterStore';

type UnsubscribeFn = () => void;

let lastProcessedMatchKey = '';

function getStarterCardIdsUsedByPlayer(): number[] {
	const gameState = useGameStore.getState().gameState;
	if (!gameState) return [];

	const player = gameState.players.player;
	if (!player) return [];

	const usedInstances = [
		...(player.battlefield ?? []),
		...(player.graveyard ?? []),
	];

	const starterIds = usedInstances
		.map(instance => instance.card?.id)
		.filter((cardId): cardId is number =>
			typeof cardId === 'number' && isStarterEntitlementCardId(cardId),
		);

	return [...new Set(starterIds)];
}

function getStarterReputationAccountId(): string {
	return useHiveDataStore.getState().user?.hiveUsername ?? 'local-dev';
}

function getMatchKey(event: GameEndedEvent): string {
	const matchSeed = useGameStore.getState().matchSeed ?? 'local-dev-match';
	return `${matchSeed}:${event.finalTurn}:${event.winner ?? 'draw'}`;
}

function handleGameEnded(event: GameEndedEvent): void {
	const matchKey = getMatchKey(event);
	const cardIds = getStarterCardIdsUsedByPlayer();
	if (cardIds.length === 0) return;

	if (matchKey === lastProcessedMatchKey) return;
	lastProcessedMatchKey = matchKey;

	useStarterStore.getState().recordStarterReputation({
		accountId: getStarterReputationAccountId(),
		matchId: matchKey,
		cardIds,
		won: event.winner === 'player',
		timestamp: event.timestamp,
	});

	debug.combat('[StarterReputationSubscriber] Starter reputation recorded', {
		cardCount: cardIds.length,
		won: event.winner === 'player',
	});
}

export function initializeStarterReputationSubscriber(): UnsubscribeFn {
	lastProcessedMatchKey = '';
	return GameEventBus.subscribe<GameEndedEvent>('GAME_ENDED', handleGameEnded, -5);
}

export default initializeStarterReputationSubscriber;
