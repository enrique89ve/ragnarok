import { useCallback } from 'react';
import type { GameCommand } from '../core/commands';
import { useP2PActions } from '../context/useP2PActions';

export type GameCommandDispatch = (command: GameCommand) => void;

export function useGameCommandDispatcher(): GameCommandDispatch {
	const { dispatchGameCommand } = useP2PActions();

	return useCallback((command: GameCommand) => {
		dispatchGameCommand(command);
	}, [dispatchGameCommand]);
}
