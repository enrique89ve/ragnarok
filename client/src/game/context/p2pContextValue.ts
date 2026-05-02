/**
 * Context value + interface for P2P actions.
 *
 * Lives in a separate `.ts` (no JSX) file from the Provider component so Vite's
 * Fast Refresh can hot-reload `P2PContext.tsx` (component-only) without falling
 * back to a full page reload. See:
 * https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react#consistent-components-exports
 */

import { createContext } from 'react';
import type { GameCommand } from '../core/commands';
import type { GameState } from '../types';

export interface P2PActions {
	playCard: (cardId: string, targetId?: string, targetType?: 'minion' | 'hero', insertionIndex?: number) => void;
	attackWithCard: (attackerId: string, defenderId?: string) => void;
	endTurn: () => void;
	performHeroPower: (targetId?: string) => void;
	dispatchGameCommand: (command: GameCommand) => void;
	gameState: GameState | null;
	isConnected: boolean;
	isHost: boolean;
}

export const P2PContext = createContext<P2PActions | null>(null);
