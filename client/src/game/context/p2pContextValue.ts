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
import type { FrontlineAttackMode } from '../core/commands';
import type { CombatAction } from '../types/PokerCombatTypes';
import type { PokerActionOrigin } from '@shared/p2p-wire/combat';
import type { GameState } from '../types';
import type { Hash256 } from '@shared/p2p-wire/integrity';
import type { PhaseCheckpointPhase } from '@shared/p2p-wire/phaseCheckpoint';
import type { PhaseCheckpointRequestResult } from '../p2p/phaseCheckpointClient';

export interface P2PActions {
	playCard: (cardId: string, targetId?: string, targetType?: 'minion' | 'hero', insertionIndex?: number) => void;
	attackWithCard: (attackerId: string, defenderId?: string) => void;
	endTurn: () => void;
	performHeroPower: (targetId?: string) => void;
	frontlineAttack: (mode: FrontlineAttackMode) => void;
	performNorseHeroPower: (norseHeroId: string, targetId?: string, targetType?: 'minion' | 'hero') => void;
	weaponUpgrade: (norseHeroId: string) => void;
	dispatchGameCommand: (command: GameCommand) => void;
	sendPokerAction: (input: {
		playerId: string;
		action: CombatAction;
		origin: PokerActionOrigin;
		hpCommitment?: number;
		turnId?: string | null;
	}) => void;
	sendPokerTurnStarted: (input: {
		combatId: string;
		turnId: string;
		phase: string;
		activePlayerId: string;
		actionsThisRound: number;
		durationMs: number;
		remainingMs?: number;
	}) => boolean;
	requestPhaseCheckpoint: (input: {
		readonly fromPhase: PhaseCheckpointPhase;
		readonly toPhase: PhaseCheckpointPhase;
		readonly stateRoot: Hash256;
	}) => Promise<PhaseCheckpointRequestResult>;
	downloadSessionLog: () => void;
	gameState: GameState | null;
	isConnected: boolean;
	isHost: boolean;
}

export const P2PContext = createContext<P2PActions | null>(null);
