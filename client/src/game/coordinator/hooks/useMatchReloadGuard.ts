/**
 * React wrapper around attachMatchReloadGuard.
 * Mounts the native beforeunload prompt for the lifetime of an in-progress match.
 */

import { useEffect } from 'react';

import type { PlayableMatchMode } from '../../match/derived';
import { attachMatchReloadGuard } from '../matchReloadGuard';

export type UseMatchReloadGuardInput = {
	readonly enabled: boolean;
	readonly mode: PlayableMatchMode | null;
	readonly connectionState?: string;
};

export function useMatchReloadGuard(input: UseMatchReloadGuardInput): void {
	const { enabled, mode, connectionState } = input;
	useEffect(() => {
		if (!enabled) return undefined;
		return attachMatchReloadGuard({ mode, connectionState });
	}, [enabled, mode, connectionState]);
}
